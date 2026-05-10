-- IA and artifact concept model

CREATE TABLE IF NOT EXISTS page_concepts (
  id SERIAL PRIMARY KEY,
  intent_key TEXT,
  task_statement TEXT,
  canonical_title TEXT,
  content_type TEXT,
  audience TEXT,
  service_area TEXT,
  status TEXT,
  summary TEXT,
  parent_concept_id INTEGER REFERENCES page_concepts(id) ON DELETE SET NULL,
  canonical_artifact_id TEXT,
  governance_flags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ia_nodes (
  id SERIAL PRIMARY KEY,
  concept_id INTEGER REFERENCES page_concepts(id) ON DELETE CASCADE,
  ia_map_id TEXT,
  parent_node_id INTEGER,
  position INTEGER,
  placement_status TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_artifacts (
  id TEXT PRIMARY KEY,
  concept_id INTEGER REFERENCES page_concepts(id) ON DELETE SET NULL,
  artifact_kind TEXT,
  source TEXT,
  title TEXT,
  content_type TEXT,
  body_raw TEXT,
  body_structured JSONB,
  workflow_status TEXT,
  is_current BOOLEAN DEFAULT true,
  review_status TEXT,
  inputs JSONB,
  karl_connected BOOLEAN DEFAULT false,
  karl_evaluation JSONB,
  skeleton BOOLEAN DEFAULT false,
  imported BOOLEAN DEFAULT false,
  quality_gate JSONB,
  status TEXT,
  check_status TEXT,
  import_status TEXT,
  active_version_id INTEGER,
  verified_version_id INTEGER,
  is_canonical BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Idempotent column adds for databases created before this migration
ALTER TABLE page_artifacts ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE page_artifacts ADD COLUMN IF NOT EXISTS check_status TEXT;
ALTER TABLE page_artifacts ADD COLUMN IF NOT EXISTS import_status TEXT;
ALTER TABLE page_artifacts ADD COLUMN IF NOT EXISTS active_version_id INTEGER;
ALTER TABLE page_artifacts ADD COLUMN IF NOT EXISTS verified_version_id INTEGER;
ALTER TABLE page_artifacts ADD COLUMN IF NOT EXISTS is_canonical BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS one_canonical_artifact_per_concept
  ON page_artifacts(concept_id) WHERE is_canonical = true;

CREATE TABLE IF NOT EXISTS artifact_variants (
  id SERIAL PRIMARY KEY,
  concept_id INTEGER REFERENCES page_concepts(id) ON DELETE CASCADE,
  base_artifact_id TEXT,
  artifact_id TEXT,
  variant_label TEXT,
  reason TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
