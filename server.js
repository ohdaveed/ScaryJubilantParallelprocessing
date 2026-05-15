import express from "express";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { createServer } from "http";
import { createRequire } from "module";
import { randomUUID } from "crypto";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import pino from "pino";
import pinoHttp from "pino-http";
import mammoth from "mammoth";
import { createPersistence, formatPersistenceError, getPersistenceMode } from "./lib/persistence.js";
import {
  chatRequestSchema,
  evaluateRequestSchema,
  improveStructureRequestSchema,
  promoteArtifactRequestSchema,
  parseRequestBody
} from "./lib/requestSchemas.js";
import { withKarlCitations, enforceKarlCitationsOnEvaluation } from "./lib/karlCitations.js";
import { fetchKarlGuidance } from "./lib/karlMcp.js";
import {
  extractJsonObjectFromText,
  extractModelText,
  hasRequiredDraftShape,
  normalizeEvaluationPayload
} from "./lib/modelResponseGuards.js";
import { buildEvalPrompt, buildEvalSystem, buildEvalRepairPrompt } from "./lib/prompts/evaluate.js";
import { buildImprovePrompt, buildImproveRepairPrompt } from "./lib/prompts/improve.js";
import { registerAiRoutes } from "./routes/ai.js";
import { registerPagesRoutes } from "./routes/pages.js";
import { registerTodosRoutes } from "./routes/todos.js";
import { registerPlannedPagesRoutes } from "./routes/plannedPages.js";
import { registerConceptsRoutes } from "./routes/concepts.js";
import { registerBuildQueueRoutes } from "./routes/buildQueue.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
const API_READ_CACHE_CONTROL = "private, no-cache, must-revalidate";

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: undefined
});

const shouldCompressApiJson = (req, res) => {
  if (!compression.filter(req, res)) return false;
  const acceptHeader = req.headers.accept;
  return typeof acceptHeader === "string" && acceptHeader.includes("application/json");
};

const applyShortReadCache = (res) => {
  res.setHeader("Cache-Control", API_READ_CACHE_CONTROL);
};

const CHAT_LIMIT_PER_MINUTE = parseInt(process.env.CHAT_RATE_LIMIT ?? "12", 10);
const EVALUATE_LIMIT_PER_MINUTE = parseInt(process.env.EVALUATE_RATE_LIMIT ?? "24", 10);
const IMPROVE_LIMIT_PER_MINUTE = parseInt(process.env.IMPROVE_RATE_LIMIT ?? "24", 10);

const createAiLimiter = (limit) => rateLimit({
  windowMs: 60 * 1000,
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: "Too many requests. Please wait and try again." });
  }
});

const chatLimiter = createAiLimiter(CHAT_LIMIT_PER_MINUTE);
const evaluateLimiter = createAiLimiter(EVALUATE_LIMIT_PER_MINUTE);
const improveStructureLimiter = createAiLimiter(IMPROVE_LIMIT_PER_MINUTE);

app.use(compression({ threshold: 1024, filter: shouldCompressApiJson }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(hpp());

const parseCommaSeparated = (value) => value
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const defaultCorsOrigins = new Set([
  "http://localhost:5000",
  "http://127.0.0.1:5000"
]);

const corsOrigins = new Set(defaultCorsOrigins);
const configuredOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "";
for (const origin of parseCommaSeparated(configuredOrigins)) {
  corsOrigins.add(origin);
}
if (process.env.URL) {
  corsOrigins.add(process.env.URL);
}
if (process.env.DEPLOY_PRIME_URL) {
  corsOrigins.add(process.env.DEPLOY_PRIME_URL);
}
if (process.env.DEPLOY_URL) {
  corsOrigins.add(process.env.DEPLOY_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"]
}));

app.use(express.json({ limit: "20mb" }));
app.use(pinoHttp({
  logger,
  genReqId: (req, res) => {
    const requestId = randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    return requestId;
  },
  customProps: (req, res) => ({ requestId: res.locals.requestId })
}));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.HHVC_ADMIN_TOKEN || "";
const db = await createPersistence();
const getErrorMessage = (error) => formatPersistenceError(error);

const logWithRequest = (reqOrRes, stage, message, extra = {}) => {
  const requestId = reqOrRes?.locals?.requestId || reqOrRes?.res?.locals?.requestId || "no-request-id";
  const payload = { requestId, stage, message, ...extra };
  logger.info(payload);
};

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const ALLOWED_PAGE_FIELDS = new Set([
  "id",
  "name",
  "pageType",
  "userType",
  "createdAt",
  "reviewStatus",
  "currentVersionNumber",
  "draftPreview",
  "karlConnected",
  "karlEvaluation",
  "qualityGate",
  "draft",
  "raw"
]);
const DEFAULT_PAGE_LIST_LIMIT = 100;
const MAX_PAGE_LIST_LIMIT = 500;
const MAX_PAGE_LIST_OFFSET = 100000;
const DEFAULT_DRAFT_PREVIEW_CHARS = 280;
const MAX_DRAFT_PREVIEW_CHARS = 4000;

const parseBooleanQuery = (value, defaultValue) => {
  if (value == null || value === "") return { value: defaultValue };
  if (value === "true") return { value: true };
  if (value === "false") return { value: false };
  return { error: "must be true or false" };
};

const parseNonNegativeIntQuery = (value, defaultValue, maxValue) => {
  if (value == null || value === "") return { value: defaultValue };
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return { error: "must be a non-negative integer" };
  return { value: Math.min(parsed, maxValue) };
};

const parsePageListFields = (value) => {
  if (value == null || value === "") return { value: undefined };
  const fields = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (fields.length === 0) return { value: undefined };
  const invalid = fields.filter((entry) => !ALLOWED_PAGE_FIELDS.has(entry));
  if (invalid.length > 0) {
    return { error: `invalid fields: ${invalid.join(", ")}` };
  }
  return { value: [...new Set(fields)] };
};

const withTimeout = async (promiseFactory, timeoutMs = 45000) => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promiseFactory(), timeout]);
};

const shouldRequireAdminToken = (req) => {
  if (!ADMIN_TOKEN) return false;
  if (!req.path.startsWith("/api/")) return false;
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return false;
  return true;
};

app.use((req, res, next) => {
  if (!shouldRequireAdminToken(req)) return next();
  const provided = req.headers["x-admin-token"];
  if (typeof provided === "string" && provided === ADMIN_TOKEN) return next();
  res.status(401).json({ error: "Unauthorized" });
});

const postAnthropic = async (body, timeoutMs = 45000, retries = 1) => {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await withTimeout(
        () => fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "mcp-client-2025-04-04",
          },
          body: JSON.stringify(body),
        }),
        timeoutMs
      );
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      attempt += 1;
    }
  }
  throw new Error("Unreachable retry state");
};

app.get("/api/health", (req, res) => {
  res.json({ ok: true, db: db.mode, uptime: Math.floor(process.uptime()) });
});

app.get("/api/system/db-mode", (req, res) => {
  applyShortReadCache(res);
  res.json(getPersistenceMode());
});

registerAiRoutes(app, db, { anthropicApiKey: ANTHROPIC_API_KEY, chatLimiter, evaluateLimiter, improveStructureLimiter, logWithRequest, postAnthropic, isObject });

app.get("/api/preferences", async (req, res) => {
  const { page_id } = req.query;
  try {
    const preferences = await db.listPreferences(page_id);
    res.json({ preferences });
  } catch (err) {
    console.error("GET /api/preferences error:", getErrorMessage(err));
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

app.post("/api/preferences", async (req, res) => {
  const { preference, source, page_id } = req.body;
  if (!preference) return res.status(400).json({ error: "Missing preference" });
  try {
    const created = await db.createPreference(preference.slice(0, 500), source || "manual", page_id || null);
    res.json(created);
  } catch (err) {
    console.error("POST /api/preferences error:", getErrorMessage(err));
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

app.delete("/api/preferences/:id", async (req, res) => {
  try {
    await db.deletePreference(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/preferences error:", getErrorMessage(err));
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

registerPagesRoutes(app, db, { getErrorMessage, applyShortReadCache, parsePageListFields, parseBooleanQuery, parseNonNegativeIntQuery, DEFAULT_PAGE_LIST_LIMIT, MAX_PAGE_LIST_LIMIT, MAX_PAGE_LIST_OFFSET, DEFAULT_DRAFT_PREVIEW_CHARS, MAX_DRAFT_PREVIEW_CHARS });

registerTodosRoutes(app, db, { getErrorMessage });
registerPlannedPagesRoutes(app, db, { getErrorMessage, applyShortReadCache });
registerConceptsRoutes(app, db, { getErrorMessage, applyShortReadCache, parseRequestBody, promoteArtifactRequestSchema });
registerBuildQueueRoutes(app, db, { getErrorMessage });

const PORT = 3001;
const MAX_PORT_RECOVERY_ATTEMPTS = 2;

async function killProcessOnPort(port) {
  try {
    const { execSync } = await import("child_process");
    if (process.platform === "win32") {
      execSync(
        `powershell -NoProfile -Command "$connections = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue; if ($connections) { $connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"`,
        { stdio: "ignore" }
      );
    } else {
      execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, {
        stdio: "ignore",
        shell: true
      });
    }
  } catch {
    // Best-effort cleanup; retry logic will handle remaining failures.
  }
}

function startServer(port, attempt = 0) {
  const server = createServer(app);
  server.on("error", async (err) => {
    if (err.code === "EADDRINUSE") {
      if (attempt >= MAX_PORT_RECOVERY_ATTEMPTS) {
        console.error(`Port ${port} is still in use after ${attempt} recovery attempts.`);
        process.exit(1);
      }

      console.log(`Port ${port} in use - killing stale process and retrying...`);
      await killProcessOnPort(port);

      setTimeout(() => {
        startServer(port, attempt + 1);
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

if (process.env.NODE_ENV !== "test") {
  startServer(PORT);
}

export { app };
