# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

HHVC SF.gov Content Design Tool — a React 18 + Express.js application for creating and managing SF.gov web content. See `package.json` scripts for standard commands.

### Node.js

Node.js v22 is required (uses --env-file flag). Make sure it is available on the system PATH.

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

### Gotchas

- No lockfile is committed; `npm install` resolves versions from `package.json` ranges each time.
- The file `src/App (# Edit conflict 2026-04-19 4xnybrC #).tsx` is a merge conflict artifact that causes `tsc` errors; ignore these.
