import { createPersistence } from "../lib/persistence.js";
import { buildCanonicalIaInspectorModel, countTreeNodes } from "../src/utils/canonicalIa";

async function main() {
  const store = await createPersistence();
  const concepts = await store.listPageConcepts();
  const nodes = await store.listIANodes("hhvc-working");

  const model = buildCanonicalIaInspectorModel(concepts, nodes);

  console.log(`Concepts: ${concepts.length}`);
  console.log(`IA nodes: ${nodes.length}`);
  console.log(`Mapped concepts: ${model.mappedConceptIds.length}`);
  console.log(`Orphan concepts: ${model.orphanConceptIds.length}`);
  console.log(`Tree nodes: ${countTreeNodes(model.root)}`);
  console.log(`Root title: ${model.root?.concept.canonicalTitle ?? "(no root)"}`);
  console.log(`Top-level hubs: ${model.root?.children.length ?? 0}`);

  await (store.close?.() ?? Promise.resolve());
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
