# INTEGRATIONS.md — External Systems and Boundaries

## Active Integrations

| Integration | Direction | Purpose |
|---|---|---|
| Anthropic Messages API | Server outbound | Generation, evaluation, and refinement |
| Karl MCP server | Server outbound | Fetch targeted Karl guidance after failing quality gate |
| Postgres / Neon-style connection string | Server outbound | Primary persistence path |
| Local JSON file store | Local filesystem | Persistence fallback |
| DOCX/PDF parsing libraries | In-process | Import text extraction |

## Anthropic Integration

### Endpoints that call Anthropic

| Route | Purpose |
|---|---|
| `POST /api/chat` | Main generation and repair chat path |
| `POST /api/evaluate` | Karl evaluation of generated content |
| `POST /api/improve-structure` | Revision/refinement pass |

### Behavior

- Requests use `fetch()` against `https://api.anthropic.com/v1/messages`.
- `ANTHROPIC_API_KEY` is required for the AI routes to work.
- The server wraps outbound calls with timeouts and limited retry behavior.
- Generation streams back to the browser; evaluation/improvement are request/response calls.

## Karl Guidance Integration

The repo uses two Karl-related layers:

1. Local Karl prompt rules and citation helpers.
2. Remote Karl MCP lookup through `lib/karlMcp.js`.

### Karl MCP configuration sources

- `KARL_MCP_URL`
- `KARL_MCP_CONFIG_PATH`
- `.vscode/mcp.json`
- VS Code user `mcp.json`

### Karl remediation path

- The frontend first validates and evaluates locally/through standard API routes.
- Only when the quality gate returns `review_required` does it call `POST /api/karl-remediate`.
- Karl remediation returns guidance lines; the frontend then feeds those warnings into the improve-structure pass.

## Persistence Integration

### Postgres path

- `createPersistence()` tries Postgres when `DATABASE_URL` is available and file mode is not forced.
- Migrations run before the Postgres store is returned.
- SSL-related query parameters may be normalized before the `pg.Pool` is created.

### File fallback path

- If file mode is forced or Postgres is missing/unavailable, the app uses a local JSON store.
- Default location: `.local/hhvc-local-db.json`
- File fallback preserves the same high-level API contract exposed by the app.

## CORS and Write Protection

### CORS

- Default allowed browser origins include `http://localhost:5000` and `http://127.0.0.1:5000`.
- Extra origins can be supplied through `CORS_ORIGINS`, `CORS_ORIGIN`, `URL`, `DEPLOY_PRIME_URL`, and `DEPLOY_URL`.

### Optional admin-token protection

- When `ADMIN_TOKEN` or `HHVC_ADMIN_TOKEN` is configured, non-GET `/api/*` routes require `x-admin-token`.
- The frontend can inject this header automatically through `VITE_ADMIN_TOKEN` or the value persisted in local storage.

## Imported Content Boundaries

| Library | Purpose |
|---|---|
| `mammoth` | DOCX-to-text extraction |
| `pdf-parse` | PDF-to-text extraction |

These are in-process libraries, not remote services.

## Route Surface To Preserve

The current externally consumed HTTP surface includes:

- `GET /api/health`
- `POST /api/chat`
- `POST /api/evaluate`
- `POST /api/improve-structure`
- `POST /api/karl-remediate`
- `GET/POST/DELETE /api/preferences`
- `GET/POST/DELETE /api/pages`
- `PATCH /api/pages/:id/review`
- `GET /api/pages/:id/versions`
- `GET /api/pages/:id/versions/:versionId`
- `POST /api/pages/:id/restore/:versionId`
- `GET/POST/PATCH/DELETE /api/todos`
- `GET/POST/PATCH/DELETE /api/planned-pages`
- `GET/POST/PATCH /api/page-concepts`
- `GET /api/ia-nodes`
- `GET /api/page-artifacts`
- `POST /api/page-artifacts/:id/promote`
- `GET/POST /api/artifact-variants`
- `GET /api/reference-examples`
- `GET/POST/PATCH/DELETE /api/build-queue`

## Unknowns

- [TODO] The repo does not show production secrets management or hosted service provisioning details; this file documents application-facing integration code only.

## Evidence

- `server.js`
- `lib/karlMcp.js`
- `lib/karlCitations.js`
- `lib/persistence.js`
- `lib/migrations/runner.js`
- `src/hooks/usePageGeneration.ts`
- `src/utils/api.ts`
- `src/utils/apiFetch.ts`
