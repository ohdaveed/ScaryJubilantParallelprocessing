# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

HHVC SF.gov Content Design Tool — a React 18 + Express.js application for creating and managing SF.gov web content. See `package.json` scripts for standard commands.

### Node.js

Do not document Node.js v22 as a hard requirement. The dependency tree supports Node `>=20.16.0`, and some packages may also express compatibility as `>=22.3.0` on the Node 22 line. Cursor Cloud may provide Node 22 by default, but that is an environment detail rather than the minimum supported version. The app uses the `--env-file` flag, so ensure a compatible `node` binary is available on the system PATH.

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

npx tsc --noEmit type-checks the src/ directory.

### No ESLint

The project does not configure ESLint; TypeScript is the primary static analysis tool.

### Gotchas

- A lockfile (package-lock.json) should be committed to ensure consistent dependency resolution.
