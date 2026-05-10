-- Core page and user-facing tables (all final column sets; safe to run on existing DBs)

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  user_type TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  built_page_id TEXT,
  karl_grade TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planned_pages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  page_type TEXT NOT NULL,
  user_type TEXT NOT NULL,
  parent_id INTEGER REFERENCES planned_pages(id) ON DELETE SET NULL,
  built_page_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE todos ADD COLUMN IF NOT EXISTS planned_id INTEGER REFERENCES planned_pages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  preference TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  page_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_versions (
  id SERIAL PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  notes TEXT,
  trigger TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
