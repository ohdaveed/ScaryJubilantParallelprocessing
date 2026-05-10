import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Run all pending SQL migrations against the given pg Pool.
 * Migrations are tracked in the schema_migrations table and each file runs exactly once.
 * Existing databases are bootstrapped automatically: if the pages table exists but
 * schema_migrations is empty, migrations 001-003 are marked applied without re-executing
 * (they used idempotent DDL that initPostgres already ran on every startup).
 */
export async function runMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM schema_migrations`);
  if (parseInt(countRows[0].count) === 0) {
    const { rows: tablesExist } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'pages'
      ) AS exists
    `);
    if (tablesExist[0].exists) {
      // DB was initialized by the old initPostgres — bootstrap schema migrations as applied
      await pool.query(`
        INSERT INTO schema_migrations (version) VALUES
          ('001_initial_schema'),
          ('002_concept_tables'),
          ('003_reference_and_queue')
        ON CONFLICT DO NOTHING
      `);
    }
  }

  const files = (await readdir(__dirname))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = file.replace(".sql", "");
    const { rows } = await pool.query(
      `SELECT 1 FROM schema_migrations WHERE version = $1`,
      [version]
    );
    if (rows.length > 0) continue;

    const sql = await readFile(join(__dirname, file), "utf8");
    // Execute each statement individually so pg and fake pools handle them cleanly.
    // Strip comment lines before splitting to avoid empty entries from comment blocks.
    const statements = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    await pool.query(`INSERT INTO schema_migrations (version) VALUES ($1)`, [version]);
  }
}
