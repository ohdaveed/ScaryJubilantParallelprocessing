import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { extractModelText } from "../lib/modelResponseGuards.js";
import {
  aggregateRouteMetrics,
  evaluateChatCase,
  evaluateEvaluateCase,
  evaluateImproveCase,
} from "./metrics.mjs";
import { canRunJudge, judgeResponse } from "./judge.mjs";

const ROOT = process.cwd();
const FIXTURE_DIR = resolve(ROOT, "eval", "fixtures");
const RESULT_DIR = resolve(ROOT, "eval", "results");

const args = new Set(process.argv.slice(2));
const deterministicOnly = args.has("--deterministic-only");
const judgeOnly = args.has("--judge-only");
const writeBaseline = args.has("--baseline");
const checkBaseline = args.has("--check-baseline");

const baseUrl = process.env.EVAL_BASE_URL || "http://localhost:3001";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const nowIso = () => new Date().toISOString();
const BASELINE_PATH = resolve(RESULT_DIR, "baseline.json");

const RATE_GATES = {
  chat: {
    httpOkRate: 1,
    responseParsedRate: 1,
    hasOutputTextRate: 1,
    requiredHeadingsPresentRate: 0.95,
  },
  evaluate: {
    httpOkRate: 1,
    scoreInRangeRate: 1,
    validGradeRate: 1,
    parseErrorFalseRate: 0.99,
    hasFeedbackArraysRate: 1,
  },
  improveStructure: {
    httpOkRate: 1,
    requiredHeadingsPresentRate: 0.99,
    noNumericFactDriftRate: 0.95,
    keeps311ReferenceRate: 1,
  },
};

const BASELINE_RATE_ALLOWED_DROP = 0.05;
const BASELINE_P95_ALLOWED_MULTIPLIER = 1.5;

const runRoute = async (path, body) => {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const ended = performance.now();
  return {
    ok: response.ok,
    status: response.status,
    latencyMs: ended - started,
    text,
  };
};

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

async function runChatFixtures(fixtures) {
  const caseResults = [];
  const judgeSamples = [];

  for (const fixture of fixtures) {
    const routeResult = await runRoute("/api/chat", fixture.request);
    const parsed = parseJson(routeResult.text);
    const outputText = parsed ? extractModelText(parsed) : "";
    const metrics = evaluateChatCase({
      httpOk: routeResult.ok,
      parsed: Boolean(parsed),
      outputText,
      latencyMs: routeResult.latencyMs,
    });
    caseResults.push({ id: fixture.id, ...metrics, status: routeResult.status });
    if (routeResult.ok && outputText) {
      judgeSamples.push({ id: fixture.id, route: "/api/chat", input: fixture.request, output: outputText });
    }
  }

  return {
    cases: caseResults,
    aggregate: aggregateRouteMetrics(caseResults, [
      "httpOk",
      "responseParsed",
      "hasOutputText",
      "requiredHeadingsPresent",
    ]),
    judgeSamples,
  };
}

async function runEvaluateFixtures(fixtures) {
  const caseResults = [];
  const judgeSamples = [];

  for (const fixture of fixtures) {
    const routeResult = await runRoute("/api/evaluate", fixture.request);
    const payload = parseJson(routeResult.text);
    const metrics = evaluateEvaluateCase({
      httpOk: routeResult.ok,
      payload,
      latencyMs: routeResult.latencyMs,
    });
    caseResults.push({ id: fixture.id, ...metrics, status: routeResult.status });
    if (routeResult.ok && payload) {
      judgeSamples.push({ id: fixture.id, route: "/api/evaluate", input: fixture.request, output: payload });
    }
  }

  return {
    cases: caseResults,
    aggregate: aggregateRouteMetrics(caseResults, [
      "httpOk",
      "scoreInRange",
      "validGrade",
      "parseErrorFalse",
      "hasFeedbackArrays",
    ]),
    judgeSamples,
  };
}

async function runImproveFixtures(fixtures) {
  const caseResults = [];
  const judgeSamples = [];

  for (const fixture of fixtures) {
    const routeResult = await runRoute("/api/improve-structure", fixture.request);
    const payload = parseJson(routeResult.text);
    const improvedText = payload?.improved || "";
    const metrics = evaluateImproveCase({
      httpOk: routeResult.ok,
      rawInput: fixture.request.raw,
      improvedText,
      latencyMs: routeResult.latencyMs,
    });
    caseResults.push({ id: fixture.id, ...metrics, status: routeResult.status });
    if (routeResult.ok && improvedText) {
      judgeSamples.push({ id: fixture.id, route: "/api/improve-structure", input: fixture.request, output: improvedText });
    }
  }

  return {
    cases: caseResults,
    aggregate: aggregateRouteMetrics(caseResults, [
      "httpOk",
      "requiredHeadingsPresent",
      "noNumericFactDrift",
      "keeps311Reference",
    ]),
    judgeSamples,
  };
}

async function runJudgeSuite(samples) {
  if (!canRunJudge()) {
    return {
      skipped: true,
      reason: "ANTHROPIC_API_KEY missing; set it to run judge scoring.",
      results: [],
    };
  }

  const capped = samples.slice(0, 6);
  const results = [];
  for (const sample of capped) {
    try {
      const score = await judgeResponse(sample);
      results.push({ id: sample.id, route: sample.route, ...score });
    } catch (error) {
      results.push({
        id: sample.id,
        route: sample.route,
        error: String(error?.message || error),
      });
    }
  }

  const valid = results.filter((r) => Number.isFinite(r.overall));
  const overallAvg = valid.length
    ? Number((valid.reduce((sum, r) => sum + r.overall, 0) / valid.length).toFixed(2))
    : null;

  return { skipped: false, sampled: capped.length, overallAvg, results };
}

function evaluateDeterministicGates(output) {
  const failures = [];
  for (const [route, gateSet] of Object.entries(RATE_GATES)) {
    const aggregate = output[route]?.aggregate;
    if (!aggregate) continue;
    for (const [metric, minimum] of Object.entries(gateSet)) {
      const actual = aggregate[metric];
      if (!Number.isFinite(actual) || actual < minimum) {
        failures.push({
          type: "threshold",
          route,
          metric,
          expectedAtLeast: minimum,
          actual: Number.isFinite(actual) ? actual : null,
        });
      }
    }
  }
  return {
    passed: failures.length === 0,
    failures,
  };
}

async function evaluateBaselineRegression(output) {
  try {
    const baseline = await readJson(BASELINE_PATH);
    const regressions = [];

    for (const route of ["chat", "evaluate", "improveStructure"]) {
      const currentAgg = output[route]?.aggregate;
      const baselineAgg = baseline[route]?.aggregate;
      if (!currentAgg || !baselineAgg) continue;

      for (const [metric, currentValue] of Object.entries(currentAgg)) {
        if (!metric.endsWith("Rate") || !Number.isFinite(currentValue)) continue;
        const baselineValue = baselineAgg[metric];
        if (!Number.isFinite(baselineValue)) continue;
        if (currentValue < baselineValue - BASELINE_RATE_ALLOWED_DROP) {
          regressions.push({
            type: "baseline-rate-drop",
            route,
            metric,
            baseline: baselineValue,
            current: currentValue,
            allowedDrop: BASELINE_RATE_ALLOWED_DROP,
          });
        }
      }

      const currentP95 = currentAgg?.latency?.p95Ms;
      const baselineP95 = baselineAgg?.latency?.p95Ms;
      if (Number.isFinite(currentP95) && Number.isFinite(baselineP95)) {
        if (currentP95 > baselineP95 * BASELINE_P95_ALLOWED_MULTIPLIER) {
          regressions.push({
            type: "baseline-latency-regression",
            route,
            metric: "latency.p95Ms",
            baseline: baselineP95,
            current: currentP95,
            allowedMultiplier: BASELINE_P95_ALLOWED_MULTIPLIER,
          });
        }
      }
    }

    return {
      checked: true,
      baselinePath: BASELINE_PATH,
      passed: regressions.length === 0,
      regressions,
    };
  } catch {
    return {
      checked: false,
      baselinePath: BASELINE_PATH,
      passed: true,
      regressions: [],
      note: "No baseline file found; run npm run eval:baseline first.",
    };
  }
}

async function main() {
  const startedAt = nowIso();
  const chatFixtures = await readJson(resolve(FIXTURE_DIR, "chat.json"));
  const evaluateFixtures = await readJson(resolve(FIXTURE_DIR, "evaluate.json"));
  const improveFixtures = await readJson(resolve(FIXTURE_DIR, "improve-structure.json"));

  const output = {
    startedAt,
    baseUrl,
    mode: judgeOnly ? "judge-only" : deterministicOnly ? "deterministic-only" : "full",
    chat: null,
    evaluate: null,
    improveStructure: null,
    judge: null,
    gates: null,
    baselineComparison: null,
  };

  const judgeSamples = [];

  if (!judgeOnly) {
    output.chat = await runChatFixtures(chatFixtures);
    output.evaluate = await runEvaluateFixtures(evaluateFixtures);
    output.improveStructure = await runImproveFixtures(improveFixtures);
    judgeSamples.push(...output.chat.judgeSamples, ...output.evaluate.judgeSamples, ...output.improveStructure.judgeSamples);
  } else {
    judgeSamples.push(
      ...chatFixtures.map((f) => ({ id: f.id, route: "/api/chat", input: f.request, output: "[judge-only placeholder]" })),
      ...evaluateFixtures.map((f) => ({ id: f.id, route: "/api/evaluate", input: f.request, output: "[judge-only placeholder]" })),
      ...improveFixtures.map((f) => ({ id: f.id, route: "/api/improve-structure", input: f.request, output: "[judge-only placeholder]" })),
    );
  }

  if (!deterministicOnly) {
    output.judge = await runJudgeSuite(judgeSamples);
  }

  if (!judgeOnly) {
    output.gates = evaluateDeterministicGates(output);
    if (checkBaseline) {
      output.baselineComparison = await evaluateBaselineRegression(output);
    }
  }

  output.completedAt = nowIso();
  await mkdir(RESULT_DIR, { recursive: true });

  const timestamp = output.completedAt.replace(/[:.]/g, "-");
  const outFile = writeBaseline ? "baseline.json" : `eval-${timestamp}.json`;
  const outPath = resolve(RESULT_DIR, outFile);
  await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Saved evaluation report: ${outPath}`);
  if (output.chat?.aggregate) console.log("chat aggregate:", JSON.stringify(output.chat.aggregate));
  if (output.evaluate?.aggregate) console.log("evaluate aggregate:", JSON.stringify(output.evaluate.aggregate));
  if (output.improveStructure?.aggregate) console.log("improve aggregate:", JSON.stringify(output.improveStructure.aggregate));
  if (output.judge) console.log("judge summary:", JSON.stringify({ skipped: output.judge.skipped, overallAvg: output.judge.overallAvg ?? null }));
  if (output.gates) console.log("deterministic gates:", JSON.stringify(output.gates));
  if (output.baselineComparison) console.log("baseline comparison:", JSON.stringify(output.baselineComparison));

  if (output.gates && !output.gates.passed) {
    process.exitCode = 1;
  }
  if (output.baselineComparison && !output.baselineComparison.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Evaluation runner failed:", error);
  process.exit(1);
});
