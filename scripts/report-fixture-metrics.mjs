import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const MIN_SCORE_BY_TYPE = {
  "Transaction": 85,
  "Step by step": 82,
  "Information": 80,
  "Topic": 78,
  "Resource Collection": 78,
  "Campaign Page": 78
};

const fixturePath = resolve(process.cwd(), "src/fixtures/golden-pages.json");

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

const hasStructuredShape = (structured) => {
  if (!isObject(structured) || !isObject(structured.page)) return false;
  const page = structured.page;
  return (
    typeof page.name === "string" &&
    typeof page.primaryUser === "string" &&
    typeof page.userGoal === "string" &&
    typeof page.primaryPurpose === "string" &&
    typeof page.pageType === "string" &&
    Array.isArray(page.recommendedComponents) &&
    isObject(page.systemRelationships) &&
    typeof page.systemRelationships.parent === "string" &&
    typeof page.systemRelationships.siblings === "string" &&
    typeof page.systemRelationships.children === "string" &&
    typeof page.systemRelationships.entryPoints === "string" &&
    typeof page.systemRelationships.nextSteps === "string" &&
    Array.isArray(page.duplicationRisks) &&
    isObject(page.enforcementCheck) &&
    Array.isArray(page.enforcementCheck.verifiable) &&
    Array.isArray(page.enforcementCheck.unclearOrNotEnforceable) &&
    typeof page.pageDraft === "string" &&
    Array.isArray(page.integrationNotes)
  );
};

const containsRequiredTemplateBlocks = (draftText) =>
  typeof draftText === "string" &&
  draftText.includes("Description:") &&
  draftText.includes("## What to know") &&
  draftText.includes("## Related");

const estimateQualityScore = (fixture) => {
  const page = fixture?.structured?.page;
  if (!page) return 0;
  let score = 100;

  if (!page.systemRelationships?.parent?.includes("Healthy Housing and Vector Control")) score -= 20;
  if (!containsRequiredTemplateBlocks(page.pageDraft)) score -= 15;
  if (!Array.isArray(page.recommendedComponents) || page.recommendedComponents.length === 0) score -= 10;
  if (!Array.isArray(page.integrationNotes) || page.integrationNotes.length === 0) score -= 10;
  if (!Array.isArray(page.enforcementCheck?.verifiable) || page.enforcementCheck.verifiable.length === 0) score -= 10;

  if (page.pageType === "Transaction" && !page.pageDraft.includes("311")) score -= 15;
  return Math.max(0, Math.min(100, score));
};

const run = async () => {
  const raw = await readFile(fixturePath, "utf8");
  const fixtures = JSON.parse(raw);
  if (!Array.isArray(fixtures)) throw new Error("Fixture file must contain an array");

  const parseResults = fixtures.map((fixture) => ({
    name: fixture.name,
    ok: hasStructuredShape(fixture.structured)
  }));

  const parsePassed = parseResults.filter((x) => x.ok).length;
  const parseRate = fixtures.length === 0 ? 0 : (parsePassed / fixtures.length) * 100;

  const qualityResults = fixtures.map((fixture) => {
    const estimatedScore = estimateQualityScore(fixture);
    const minScore = MIN_SCORE_BY_TYPE[fixture.pageType] ?? 80;
    return {
      name: fixture.name,
      pageType: fixture.pageType,
      estimatedScore,
      minScore,
      passed: estimatedScore >= minScore
    };
  });

  const qualityPassed = qualityResults.filter((x) => x.passed).length;
  const qualityRate = fixtures.length === 0 ? 0 : (qualityPassed / fixtures.length) * 100;

  console.log("Fixture Metrics");
  console.log("===============");
  console.log(`fixtures_total: ${fixtures.length}`);
  console.log(`parse_success_rate_pct: ${parseRate.toFixed(2)}`);
  console.log(`quality_gate_pass_rate_pct: ${qualityRate.toFixed(2)}`);
  console.log("");
  console.log("Per-fixture quality estimates:");
  for (const result of qualityResults) {
    console.log(`- ${result.name} [${result.pageType}] score=${result.estimatedScore} min=${result.minScore} passed=${result.passed}`);
  }
};

run().catch((error) => {
  console.error("Failed to compute fixture metrics:", error.message);
  process.exitCode = 1;
});
