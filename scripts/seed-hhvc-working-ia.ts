import { createPersistence } from "../lib/persistence.js";
import { syncCanonicalWorkingIa } from "../src/data/syncCanonicalWorkingIa";

const args = process.argv.slice(2);

const readFlag = (name: string) => args.includes(name);
const readOption = (name: string) => {
  const exactPrefix = `${name}=`;
  const exact = args.find((arg) => arg.startsWith(exactPrefix));
  if (exact) {
    return exact.slice(exactPrefix.length);
  }

  const index = args.findIndex((arg) => arg === name);
  if (index === -1 || index === args.length - 1) {
    return undefined;
  }

  return args[index + 1];
};

const write = readFlag("--write");
const databaseUrl = readOption("--database-url");
const fallbackMode = readOption("--fallback-mode");
const localPath = readOption("--local-path");

const store = await createPersistence({
  databaseUrl,
  fallbackMode,
  localPath
});

const report = await syncCanonicalWorkingIa(store, { dryRun: !write });

const modeLine = `Mode: ${store.mode}${store.location ? ` (${store.location})` : ""}`;
const runLine = write ? "Run: write" : "Run: dry-run";
const summaryLines = [
  `Concepts: ${report.conceptSummary.created} create, ${report.conceptSummary.updated} update, ${report.conceptSummary.unchanged} unchanged`,
  `IA nodes: ${report.nodeSummary.created} create, ${report.nodeSummary.updated} update, ${report.nodeSummary.unchanged} unchanged`,
  `Karl metadata storage: ${report.karlMetadataStorage}`,
  `Matching strategy: ${report.matchingStrategy}`
];

const sampleActions = report.actions
  .filter((action) => action.status !== "unchanged")
  .slice(0, 12)
  .map((action) => {
    const details = action.details && action.details.length > 0 ? ` [${action.details.join(", ")}]` : "";
    const matchedBy = action.matchedBy ? ` via ${action.matchedBy}` : "";
    return `- ${action.kind} ${action.slug}: ${action.status}${matchedBy}${details}`;
  });

console.log(modeLine);
console.log(runLine);
for (const line of summaryLines) {
  console.log(line);
}

if (sampleActions.length > 0) {
  console.log("Planned changes:");
  for (const line of sampleActions) {
    console.log(line);
  }
}

const remainingChanges = report.actions.filter((action) => action.status !== "unchanged").length - sampleActions.length;
if (remainingChanges > 0) {
  console.log(`...and ${remainingChanges} more changes`);
}

if (!write) {
  console.log('Dry-run only. Re-run with "--write" to apply the canonical HHVC IA seed.');
}
