# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

HHVC SF.gov Content Design Tool — a React 18 + Express.js application for creating and managing SF.gov web content. See `package.json` scripts for standard commands.

### Node.js

Node.js v22 is required (uses `--env-file` flag). The binary lives at `/home/ubuntu/.nvm/versions/node/v22.22.2/bin/node`; make sure it is on `PATH`.

### Environment variables

The server reads `.env` at startup via `--env-file=.env`. Key variables:

- `ANTHROPIC_API_KEY` — required for AI generation/evaluation features; the app starts without it but AI endpoints return 500.
- `DB_FALLBACK_MODE=file` — skips PostgreSQL and uses a local JSON file at `.local/hhvc-local-db.json`. Set this when no Postgres is available.
- `DATABASE_URL` — PostgreSQL connection string (optional; auto-falls back to file mode on connection failure).

### Running the dev servers

`npm run dev` starts both the Express API (port 3001) and Vite dev server (port 5000) in parallel via `scripts/dev.mjs`. The Vite server proxies `/api` requests to the API server.

### Tests

`npm test` runs all Vitest tests. Test files live at `src/**/*.test.ts` and `src/**/*.test.tsx`.

### Build

`npm run build` produces a production bundle in `dist/`.

### TypeScript

`npx tsc --noEmit` type-checks the `src/` directory. There is an existing conflict file `src/App (# Edit conflict ...).tsx` with known TS errors — this is a pre-existing artifact, not a regression.

### No ESLint

The project does not configure ESLint; TypeScript is the primary static analysis tool.

### Starting the .env file

Before running `npm run dev`, create a `.env` in the workspace root with at least:

```
ANTHROPIC_API_KEY=<your key>
DB_FALLBACK_MODE=file
```

The `ANTHROPIC_API_KEY` env var is injected automatically in Cloud Agent VMs via secrets. Write it into `.env` so the server picks it up via `--env-file=.env`:

```sh
printf 'ANTHROPIC_API_KEY=%s\nDB_FALLBACK_MODE=file\n' "$ANTHROPIC_API_KEY" > .env
```

### Gotchas

- The file `src/App (# Edit conflict 2026-04-19 4xnybrC #).tsx` is a merge conflict artifact that causes `tsc` errors; ignore these.
- The server must be restarted after `.env` changes; Vite HMR does not reload the Express backend.
- AI page generation (the core feature) takes ~10-30 seconds per page. The evaluation endpoint uses Claude Haiku and is faster (~5 s).
- When the "Karl citations" service is unreachable (external dependency), the app logs a warning and falls back to base standards. This does not block page generation.
