import { hasRequiredDraftShape } from "../lib/modelResponseGuards.js";

const VALID_GRADES = new Set(["A", "B", "C", "D", "F"]);

const getNumbers = (text = "") => {
  const matches = text.match(/\d+(\.\d+)?/g);
  return new Set(matches || []);
};

const containsAll = (targetSet, sourceSet) => {
  for (const value of sourceSet) {
    if (!targetSet.has(value)) return false;
  }
  return true;
};

export const summarizeLatencies = (samples) => {
  if (!samples.length) return { count: 0, p50Ms: null, p95Ms: null, meanMs: null };
  const sorted = [...samples].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    count: samples.length,
    p50Ms: Math.round(p50),
    p95Ms: Math.round(p95),
    meanMs: Math.round(mean),
  };
};

export const evaluateChatCase = ({ httpOk, parsed, outputText, latencyMs }) => ({
  httpOk,
  responseParsed: parsed,
  hasOutputText: typeof outputText === "string" && outputText.trim().length > 0,
  requiredHeadingsPresent: hasRequiredDraftShape(outputText || ""),
  latencyMs: Math.round(latencyMs),
});

export const evaluateEvaluateCase = ({ httpOk, payload, latencyMs }) => ({
  httpOk,
  scoreInRange: Number.isFinite(payload?.score) && payload.score >= 0 && payload.score <= 100,
  validGrade: VALID_GRADES.has(payload?.grade),
  parseErrorFalse: payload?.parseError === false,
  hasFeedbackArrays: Array.isArray(payload?.passed) && Array.isArray(payload?.warnings) && Array.isArray(payload?.failed),
  latencyMs: Math.round(latencyMs),
});

export const evaluateImproveCase = ({ httpOk, rawInput, improvedText, latencyMs }) => {
  const rawNumbers = getNumbers(rawInput);
  const improvedNumbers = getNumbers(improvedText || "");
  const rawMentions311 = rawInput.includes("311");
  return {
    httpOk,
    requiredHeadingsPresent: hasRequiredDraftShape(improvedText || ""),
    noNumericFactDrift: containsAll(improvedNumbers, rawNumbers),
    keeps311Reference: !rawMentions311 || (improvedText || "").includes("311"),
    latencyMs: Math.round(latencyMs),
  };
};

export const aggregateRouteMetrics = (caseResults, predicateKeys) => {
  const total = caseResults.length;
  const rates = {};
  for (const key of predicateKeys) {
    const passed = caseResults.filter((entry) => entry[key]).length;
    rates[`${key}Rate`] = total ? Number((passed / total).toFixed(3)) : null;
  }
  const latencies = summarizeLatencies(caseResults.map((entry) => entry.latencyMs).filter(Number.isFinite));
  return { totalCases: total, ...rates, latency: latencies };
};
