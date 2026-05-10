-- Reference examples and build queue

CREATE TABLE IF NOT EXISTS reference_examples (
  id SERIAL PRIMARY KEY,
  title TEXT,
  source_system TEXT,
  reference_type TEXT,
  notes TEXT,
  mapped_pattern TEXT,
  reference_map_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS build_queue_items (
  id SERIAL PRIMARY KEY,
  concept_id INTEGER REFERENCES page_concepts(id) ON DELETE SET NULL,
  artifact_id TEXT,
  queue_status TEXT,
  priority INTEGER,
  requested_by TEXT,
  topic TEXT,
  audience TEXT,
  error_message TEXT,
  karl_grade TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default reference examples (only on first run)
INSERT INTO reference_examples (title, source_system, reference_type, notes, mapped_pattern, reference_map_id)
SELECT * FROM (VALUES
  ('Healthy housing and pests',           'HHVC reference benchmark', 'topic_hub',   'Reference-only benchmark for the root HHVC topic structure.',                          'Root topic hub',  'hhvc-reference'),
  ('Report a housing or pest problem',    'HHVC reference benchmark', 'task_hub',    'Reference-only benchmark for report routing and transaction entry points.',             'Action hub',      'hhvc-reference'),
  ('Fix a problem in your building',      'HHVC reference benchmark', 'task_hub',    'Reference-only benchmark for post-report lifecycle guidance.',                          'Follow-up hub',   'hhvc-reference'),
  ('Prevent pests and health problems',   'HHVC reference benchmark', 'task_hub',    'Reference-only benchmark for prevention and educational guidance.',                     'Prevention hub',  'hhvc-reference'),
  ('Programs and services',               'HHVC reference benchmark', 'service_hub', 'Reference-only benchmark for programs, workshops, and service entries.',                'Services hub',    'hhvc-reference'),
  ('Tools, fees, and help',               'HHVC reference benchmark', 'support_hub', 'Reference-only benchmark for tools, payments, and support resources.',                  'Support hub',     'hhvc-reference')
) AS seed(title, source_system, reference_type, notes, mapped_pattern, reference_map_id)
WHERE NOT EXISTS (SELECT 1 FROM reference_examples WHERE reference_map_id = 'hhvc-reference');
