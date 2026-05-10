# CONVENTIONS.md — Code and Project Conventions

## Language and Module Conventions

- Frontend code is primarily TypeScript under `src/`.
- Backend runtime code is JavaScript ESM under the repo root and `lib/`.
- Imports use ESM syntax consistently; CommonJS is only bridged where required (`pdf-parse` in `server.js`).

## Type and Domain Conventions

- Shared domain contracts live in `src/types.ts`.
- Content-model normalization helpers live in both `src/utils/contentModel.ts` and `lib/contentModel.js`.
- Page/content labels shown to users are often Title Case strings, while normalized content types use lower-case keys such as `transaction` or `resource_collection`.
- The codebase separates canonical concepts, IA nodes, artifacts, reference examples, and queue items instead of storing them as one merged entity.

## Frontend Composition Conventions

- App-wide behavior is composed through `WorkspaceContext` rather than a third-party state library.
- Domain hooks own business logic; the context layer wires them together.
- Routing is URL-driven with `react-router-dom`, but the user experience is still a single workspace shell rather than unrelated pages.
- Page components under `src/pages/` are lazy-loaded from `App.tsx`.

## API Client Conventions

- Frontend HTTP calls are centralized in `src/utils/api.ts` and `src/utils/apiFetch.ts`.
- `apiFetch()` attaches the optional admin token header automatically.
- API client helpers usually return parsed JSON or throw a status-based `Error`.
- List/detail behavior is explicit for pages: list endpoints can return summaries while detail endpoints hydrate full content.

## Validation and Parsing Conventions

- Request validation on the server uses Zod schemas in `lib/requestSchemas.js`.
- Generated content is treated as untrusted until it passes parse/repair and validation stages.
- `repairAndParseStructured()` first tries local parsing, then asks `/api/chat` for a repair-only response if needed.
- `validateGeneratedPage()` enforces Karl page-type/component placeholders locally before downstream use.

## Naming Conventions Observed In Code

| Pattern | Example |
|---|---|
| React components use PascalCase | `SfGovContentDesignTool.tsx`, `PlanPage.tsx` |
| Hooks use `use*` camelCase | `usePageGeneration.ts`, `useProjectModel.ts` |
| Utility modules use lower camelCase file names | `apiFetch.ts`, `contentModel.ts` |
| Test files are co-located with `.test.ts` / `.test.tsx` suffixes | `usePageGeneration.test.ts`, `SfGovPreview.test.tsx` |
| Constants are upper snake case | `SYSTEM_PROMPT`, `MAX_GENERATION_RETRIES`, `QUALITY_GATE_MIN_SCORE` |

## Error-Handling Conventions

- Server request validators return `400` with route-specific error text on invalid bodies.
- Non-critical frontend refresh/mutation flows often swallow errors intentionally to keep the authoring flow moving.
- Persistence initialization logs and falls back to file mode instead of crashing the process when Postgres startup fails.
- Streaming and parsing helpers ignore malformed partial events and continue when possible.

## Testing Conventions

- Tests live next to the code they cover under `src/`.
- Vitest is the default runner for unit and integration-style tests.
- API route tests use `supertest`.
- Coverage config includes `src/**/*.ts` and `src/**/*.tsx` but excludes test files.

## Documentation and Design Conventions

- `DESIGN.md` is the checked-in UI/design source of truth.
- `docs/codebase/` is meant to reflect current code, not aspirational design.
- Unknowns should be documented explicitly rather than inferred.

## Intent Gaps

- [TODO] There is no checked-in formatter or linter config establishing whitespace, quote-style, or import-order enforcement. Current conventions are best-effort observations from existing files.

## Evidence

- `package.json`
- `src/types.ts`
- `src/utils/contentModel.ts`
- `src/context/WorkspaceContext.tsx`
- `src/utils/api.ts`
- `src/utils/apiFetch.ts`
- `src/services/pageParser.ts`
- `src/generationValidation.ts`
- `lib/requestSchemas.js`
- `server.js`
- `DESIGN.md`
