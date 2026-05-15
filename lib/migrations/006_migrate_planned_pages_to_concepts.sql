-- Migrate planned_pages into page_concepts then drop planned_pages.
-- Uses a temporary _legacy_pp_id column to preserve parent hierarchy during migration.
-- Safe to re-run: INSERT is guarded by a NOT EXISTS check on canonical_title + _legacy_pp_id.

ALTER TABLE page_concepts ADD COLUMN IF NOT EXISTS _legacy_pp_id INTEGER;

INSERT INTO page_concepts (
  canonical_title, task_statement, content_type, audience,
  canonical_artifact_id, status, service_area, summary, created_at,
  _legacy_pp_id
)
SELECT
  pp.name,
  pp.name,
  pp.page_type,
  pp.user_type,
  pp.built_page_id,
  'proposed',
  'hhvc',
  '',
  pp.created_at,
  pp.id
FROM planned_pages pp
WHERE NOT EXISTS (
  SELECT 1 FROM page_concepts pc WHERE pc._legacy_pp_id = pp.id
);

-- Resolve parent hierarchy: point parent_concept_id at the newly inserted concept.
UPDATE page_concepts child
SET parent_concept_id = parent.id
FROM page_concepts parent,
     planned_pages pp
WHERE pp.id            = child._legacy_pp_id
  AND parent._legacy_pp_id = pp.parent_id
  AND pp.parent_id IS NOT NULL
  AND child.parent_concept_id IS NULL;

ALTER TABLE page_concepts DROP COLUMN IF EXISTS _legacy_pp_id;

DROP TABLE IF EXISTS planned_pages;
