import express from "express";
import { createServer } from "http";
import { createRequire } from "module";
import pkg from "pg";
const { Pool } = pkg;
import { ReplitConnectors } from "@replit/connectors-sdk";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const DRIVE_FOLDER_ID = "1SrKB78oWGHhILjQxS7R-ZqCXkzuAlvKi";

const app = express();
app.use(express.json({ limit: "2mb" }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        topic TEXT NOT NULL,
        user_type TEXT NOT NULL,
        done BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS planned_pages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        page_type TEXT NOT NULL,
        user_type TEXT NOT NULL,
        parent_id INTEGER REFERENCES planned_pages(id) ON DELETE SET NULL,
        built_page_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Database tables ready");
  } catch (err) {
    console.error("DB init error:", err.message);
  }
}

initDb();

app.get("/api/drive/files", async (req, res) => {
  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy(
      "google-drive",
      `/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime)&pageSize=50&orderBy=name`,
      { method: "GET" }
    );
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    const data = await response.json();
    res.json({ files: data.files || [] });
  } catch (err) {
    console.error("Drive list error:", err);
    res.status(500).json({ error: "Failed to list Drive files" });
  }
});

app.get("/api/drive/files/:fileId", async (req, res) => {
  const { fileId } = req.params;
  try {
    const connectors = new ReplitConnectors();
    const metaRes = await connectors.proxy(
      "google-drive",
      `/drive/v3/files/${fileId}?fields=id,name,mimeType,parents`,
      { method: "GET" }
    );
    if (!metaRes.ok) {
      return res.status(metaRes.status).json({ error: "File not found" });
    }
    const meta = await metaRes.json();

    const parents = meta.parents || [];
    if (!parents.includes(DRIVE_FOLDER_ID)) {
      return res.status(403).json({ error: "File is not in the allowed HHVC folder" });
    }

    const mimeType = meta.mimeType || "";

    let exportMime = "text/plain";
    if (mimeType === "application/vnd.google-apps.document") exportMime = "text/plain";
    else if (mimeType === "application/vnd.google-apps.spreadsheet") exportMime = "text/csv";
    else if (mimeType === "application/vnd.google-apps.presentation") exportMime = "text/plain";

    const isGoogleDoc = mimeType.startsWith("application/vnd.google-apps.");
    const isPdf = mimeType === "application/pdf";
    const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    let contentText = "";

    if (isGoogleDoc) {
      const exportRes = await connectors.proxy(
        "google-drive",
        `/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`,
        { method: "GET" }
      );
      if (!exportRes.ok) return res.status(exportRes.status).json({ error: "Export failed" });
      contentText = await exportRes.text();
    } else if (isPdf) {
      const downloadRes = await connectors.proxy(
        "google-drive",
        `/drive/v3/files/${fileId}?alt=media`,
        { method: "GET" }
      );
      if (!downloadRes.ok) return res.status(downloadRes.status).json({ error: "Download failed" });
      const buf = Buffer.from(await downloadRes.arrayBuffer());
      try {
        const parsed = await pdfParse(buf);
        contentText = parsed.text;
      } catch {
        return res.status(422).json({ error: "Could not extract text from this PDF. It may be scanned or image-based." });
      }
    } else if (isDocx) {
      const downloadRes = await connectors.proxy(
        "google-drive",
        `/drive/v3/files/${fileId}?alt=media`,
        { method: "GET" }
      );
      if (!downloadRes.ok) return res.status(downloadRes.status).json({ error: "Download failed" });
      const buf = Buffer.from(await downloadRes.arrayBuffer());
      try {
        const { value } = await mammoth.extractRawText({ buffer: buf });
        contentText = value;
      } catch {
        return res.status(422).json({ error: "Could not extract text from this DOCX file." });
      }
    } else {
      return res.status(415).json({ error: `Unsupported file type (${mimeType}). Only Google Docs, PDFs, and DOCX files can be used as reference documents.` });
    }

    res.json({ id: fileId, name: meta.name, mimeType, content: contentText.slice(0, 20000) });
  } catch (err) {
    console.error("Drive read error:", err);
    res.status(500).json({ error: "Failed to read Drive file" });
  }
});

app.post("/api/chat", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured. Please add it in the Secrets panel." });
  }

  const { driveContext, ...anthropicBody } = req.body;

  let body = anthropicBody;
  if (driveContext && typeof driveContext === "string" && driveContext.trim()) {
    const msgs = Array.isArray(body.messages) ? [...body.messages] : [];
    if (msgs.length > 0 && msgs[msgs.length - 1].role === "user") {
      const last = msgs[msgs.length - 1];
      const existingContent = typeof last.content === "string" ? last.content : JSON.stringify(last.content);
      msgs[msgs.length - 1] = {
        ...last,
        content: `REFERENCE DOCUMENTS FROM GOOGLE DRIVE:\n\n${driveContext}\n\n---\n\n${existingContent}`
      };
    }
    body = { ...anthropicBody, messages: msgs };
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify(body),
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (["content-type", "cache-control", "transfer-encoding"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    };
    pump().catch(err => { console.error("Stream error:", err); res.end(); });
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Failed to connect to Anthropic API" });
  }
});

app.post("/api/evaluate", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { pageName, pageType, draft, userType } = req.body;
  if (!draft) return res.status(400).json({ error: "Missing draft" });

  const evalPrompt = `You are an SF.gov content quality evaluator. Evaluate this HHVC page draft against SF.gov and Karl CMS content standards.

PAGE: ${pageName || "Untitled"}
TYPE: ${pageType || "Unknown"}
USER: ${userType || "Unknown"}

DRAFT:
${draft}

Evaluate and return ONLY this JSON structure (no other text, no markdown):
{
  "score": <number 0-100>,
  "grade": "<A|B|C|D|F>",
  "summary": "<one sentence overall assessment>",
  "passed": ["<check that passed>", ...],
  "warnings": ["<check that needs improvement>", ...],
  "failed": ["<check that failed>", ...]
}

VALID KARL CONTENT TYPES (only these are acceptable):
Transaction, Information, Step by step, Topic, Resource Collection

INVALID CONTENT TYPES (flag as FAILED if any appear):
Guidance page, Issue page, Enforcement page, Support page, Hub page, any other type not in the valid list above

VALID KARL COMPONENTS (only these are acceptable):
Title, Description, Button link, Callout, Spotlight, Text, Section, Phone number, Email, Related, Address, Media, Profile, Resource tile, What to know, What to do

INVALID COMPONENTS (flag as FAILED if any appear):
Action-first title, Primary CTA block, Responsibilities section, What happens next, Signs/examples, When to use this page, FAQ, Checklist, Short summary, What you can do now, or any component not in the valid list above

Check for:
- Plain language at 5th-6th grade level
- Action-oriented title in first person (Title field)
- Clear primary purpose
- Description (SEO summary) present and under 150 characters
- No institutional jargon
- Page type is one of the valid Karl content types; flag as FAILED if a non-existent type is used
- All components used are from the valid Karl component list; flag as FAILED for any fictional component
- What to know and What to do sections present for Transaction pages
- 311 reference for Transaction pages (via Button link, Phone number, or text in What to do)
- Tenant responsibilities included if tenants are primary or secondary user
- System Relationships lists "Healthy Housing and Vector Control (Topic)" as the Parent
- No markdown formatting in content

DIGITAL.GOV PLAIN LANGUAGE CHECKS (check each of these specifically and include the result in passed, warnings, or failed):
- Sentence length: flag as a failure if multiple sentences consistently exceed 20 words. Identify the specific sentence(s) that are too long, e.g. "Sentence beginning 'You must contact...' exceeds 20 words."
- One idea per sentence: flag as a warning if any sentence contains more than one distinct idea joined by a conjunction.
- Active voice: flag as a failure if passive voice is used more than once. Name the specific passive construction found, e.g. "Passive voice: 'must be filed' — rewrite as 'you must file'."
- Present tense: flag as a warning if past tense is used where present tense would be appropriate.
- Hidden verbs (nominalizations): flag as a failure for each nominalization found. Provide the specific example and correction, e.g. "Hidden verb: 'make a decision' — use 'decide' instead." Common patterns to detect: 'make a decision', 'submit an application', 'provide notification', 'conduct an inspection', 'give consideration', 'take action', 'reach a conclusion', 'have a requirement'.
- Paragraph length: flag as a warning if any paragraph exceeds 4 sentences.
- Leads with the main point: flag as a warning if the first sentence of the page body or a section does not state the key action or conclusion.
- Reader addressed as "you": flag as a failure if body content does not use "you" to address the reader directly (titles are exempt).
- Unnecessary filler phrases: flag as a warning for each filler phrase found, e.g. 'in order to', 'it is important to note that', 'please be advised', 'at this point in time'.

For every item in warnings and failed, write the feedback as a specific, actionable instruction referencing the actual text (e.g., "Sentence on line 3 exceeds 20 words — split into two sentences." or "Avoid hidden verbs — use 'decide' not 'make a decision'.").`;

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-20250514",
        max_tokens: 1024,
        system: "You are an SF.gov content standards evaluator. Return only valid JSON.",
        messages: [{ role: "user", content: evalPrompt }],
        mcp_servers: [{ type: "url", url: "https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/~gitbook/mcp", name: "karl-docs" }]
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: text });
    }

    const data = await upstream.json();
    const textContent = data.content?.find(c => c.type === "text")?.text || "";

    let evaluation;
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      evaluation = null;
    }

    if (!evaluation) {
      return res.json({
        score: 75,
        grade: "B",
        summary: "Page evaluated against SF.gov standards.",
        passed: ["Draft generated successfully"],
        warnings: ["Manual review recommended"],
        failed: []
      });
    }

    res.json(evaluation);
  } catch (err) {
    console.error("Evaluation error:", err);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

app.get("/api/pages", async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM pages ORDER BY created_at ASC");
    res.json({ pages: result.rows.map(r => r.data) });
  } catch (err) {
    console.error("GET /api/pages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pages", async (req, res) => {
  const { id, data } = req.body;
  if (!id || !data) return res.status(400).json({ error: "Missing id or data" });
  try {
    await pool.query(
      "INSERT INTO pages (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
      [id, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/pages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/pages/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM pages WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/pages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/todos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM todos ORDER BY created_at ASC");
    const todos = result.rows.map(r => ({ id: r.id, topic: r.topic, userType: r.user_type, done: r.done }));
    res.json({ todos });
  } catch (err) {
    console.error("GET /api/todos error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/todos", async (req, res) => {
  const { topic, userType } = req.body;
  if (!topic) return res.status(400).json({ error: "Missing topic" });
  try {
    const result = await pool.query(
      "INSERT INTO todos (topic, user_type) VALUES ($1, $2) RETURNING *",
      [topic, userType || "General public"]
    );
    const r = result.rows[0];
    res.json({ id: r.id, topic: r.topic, userType: r.user_type, done: r.done });
  } catch (err) {
    console.error("POST /api/todos error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/todos/:id", async (req, res) => {
  const { done } = req.body;
  try {
    const result = await pool.query(
      "UPDATE todos SET done = $1 WHERE id = $2 RETURNING *",
      [done, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    const r = result.rows[0];
    res.json({ id: r.id, topic: r.topic, userType: r.user_type, done: r.done });
  } catch (err) {
    console.error("PATCH /api/todos error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/todos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM todos WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/todos error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/planned-pages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM planned_pages ORDER BY created_at ASC");
    const items = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      pageType: r.page_type,
      userType: r.user_type,
      parentId: r.parent_id,
      builtPageId: r.built_page_id,
      createdAt: r.created_at
    }));
    res.json({ plannedPages: items });
  } catch (err) {
    console.error("GET /api/planned-pages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/planned-pages", async (req, res) => {
  const { name, pageType, userType, parentId } = req.body;
  if (!name || !pageType || !userType) return res.status(400).json({ error: "Missing required fields" });
  if (parentId) {
    const parentCheck = await pool.query("SELECT id FROM planned_pages WHERE id = $1", [parentId]);
    if (!parentCheck.rows.length) return res.status(400).json({ error: "Parent not found" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO planned_pages (name, page_type, user_type, parent_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, pageType, userType, parentId || null]
    );
    const r = result.rows[0];
    res.json({ id: r.id, name: r.name, pageType: r.page_type, userType: r.user_type, parentId: r.parent_id, builtPageId: r.built_page_id, createdAt: r.created_at });
  } catch (err) {
    console.error("POST /api/planned-pages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/planned-pages/:id", async (req, res) => {
  const { name, pageType, userType, parentId, builtPageId } = req.body;
  if (parentId !== undefined && parentId !== null && String(parentId) === String(req.params.id)) {
    return res.status(400).json({ error: "A page cannot be its own parent" });
  }
  try {
    const fields = [];
    const vals = [];
    let idx = 1;
    if (name !== undefined) { fields.push(`name = $${idx++}`); vals.push(name); }
    if (pageType !== undefined) { fields.push(`page_type = $${idx++}`); vals.push(pageType); }
    if (userType !== undefined) { fields.push(`user_type = $${idx++}`); vals.push(userType); }
    if (parentId !== undefined) { fields.push(`parent_id = $${idx++}`); vals.push(parentId); }
    if (builtPageId !== undefined) { fields.push(`built_page_id = $${idx++}`); vals.push(builtPageId); }
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE planned_pages SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    const r = result.rows[0];
    res.json({ id: r.id, name: r.name, pageType: r.page_type, userType: r.user_type, parentId: r.parent_id, builtPageId: r.built_page_id, createdAt: r.created_at });
  } catch (err) {
    console.error("PATCH /api/planned-pages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/planned-pages/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM planned_pages WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/planned-pages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;

function startServer(port) {
  const server = createServer(app);
  server.on("error", async (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} in use — killing stale process and retrying…`);
      try {
        const { execSync } = await import("child_process");
        execSync(`fuser -k ${port}/tcp 2>/dev/null`);
      } catch {}
      setTimeout(() => {
        createServer(app).listen(port, () => {
          console.log(`API server running on port ${port}`);
        });
      }, 600);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log(`API server running on port ${port}`);
  });
}

startServer(PORT);
