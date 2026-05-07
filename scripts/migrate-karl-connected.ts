import { createPersistence } from "../lib/persistence.js";

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

const pages = await store.listPages();
const candidates = pages.filter((page) => page.karlConnected !== true && (page.karlEvaluation || page.qualityGate));
const currentConnected = pages.filter((page) => page.karlConnected === true).length;

console.log(`Mode: ${store.mode}${store.location ? ` (${store.location})` : ""}`);
console.log(write ? "Run: write" : "Run: dry-run");
console.log(`Pages scanned: ${pages.length}`);
console.log(`Pages already connected: ${currentConnected}`);
console.log(`Pages to backfill: ${candidates.length}`);

for (const page of candidates.slice(0, 15)) {
  const reason = page.karlEvaluation ? "karlEvaluation" : "qualityGate";
  console.log(`- ${page.id}: ${page.name} (${reason})`);
}

if (candidates.length > 15) {
  console.log(`...and ${candidates.length - 15} more`);
}

if (!write) {
  console.log('Dry-run only. Re-run with "--write" to apply the migration.');
} else {
  let updated = 0;
  for (const page of candidates) {
    await store.savePage(page.id, {
      ...page,
      karlConnected: true
    });
    updated += 1;
  }
  console.log(`Updated pages: ${updated}`);
}
