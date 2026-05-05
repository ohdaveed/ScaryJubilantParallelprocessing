# AI Route Validation and Rate Limiting Design

Date: 2026-05-04
Project: HHVC SF.gov Content Design Tool
Scope: Add route-boundary request validation with Zod and targeted rate limiting for expensive AI-backed Express endpoints.

## Goal

Harden the server's most expensive AI routes without changing normal app behavior. The change should:

- Validate request bodies at the route boundary with explicit schemas.
- Protect costly AI routes from accidental bursts or abusive repetition.
- Preserve existing success payloads and most existing error semantics.
- Avoid broad refactors in `server.js` or the frontend.

## Non-goals

- No global `/api` rate limiter in this pass.
- No frontend UI changes for rate limiting in this pass.
- No migration of all routes to Zod in this pass.
- No refactor of downstream AI business logic beyond what boundary validation requires.

## Current State

The server currently performs manual shape checks inline in `server.js` for:

- `POST /api/chat`
- `POST /api/evaluate`
- `POST /api/improve-structure`

These checks are inconsistent in depth and live beside route logic. The same file also hosts the app's most expensive Anthropic-backed endpoints. Those endpoints currently have no route-specific throttling.

## Recommended Approach

Implement two focused protections:

1. Add server-only Zod schemas for the three expensive AI endpoints.
2. Add route-specific `express-rate-limit` middleware only to those endpoints.

This keeps the change local to the backend boundary, reduces regression risk on CRUD routes, and leaves room to expand later if broader protection is needed.

## Alternatives Considered

### 1. Global `/api` limiter plus stricter AI limiters

Pros:

- Better blanket protection.
- Consistent limits across the API surface.

Cons:

- Risks throttling ordinary UI traffic such as pages, todos, preferences, and planned pages.
- Harder to tune without understanding normal usage patterns.

Decision: rejected for this pass because it changes behavior too broadly.

### 2. AI-route limiters only, keep manual validation

Pros:

- Minimal code change.
- Immediate protection for costly routes.

Cons:

- Leaves inconsistent ad hoc body validation in place.
- Keeps `server.js` harder to reason about.

Decision: rejected because validation quality is part of the problem being solved.

### 3. Full shared schema refactor for all routes and payloads

Pros:

- Strongest long-term consistency.
- Good foundation for broader typing later.

Cons:

- Much larger change surface.
- Higher regression risk and slower delivery.

Decision: rejected for now as oversized for the immediate goal.

## Route Scope

Rate limiting applies only to:

- `POST /api/chat`
- `POST /api/evaluate`
- `POST /api/improve-structure`

No limiter is added to read/write CRUD endpoints in this pass.

## Validation Design

Add a small server-only module, likely `lib/requestSchemas.js`, containing:

- `chatRequestSchema`
- `evaluateRequestSchema`
- `improveStructureRequestSchema`

Add a small helper, likely in the same module or a tiny `lib/validateRequest.js`, that:

- runs `safeParse(req.body)`
- returns parsed data on success
- returns `400` with a stable JSON error payload on failure

The helper should keep the response shape simple:

```json
{ "error": "Invalid request body for /api/..." }
```

If useful for debugging, the implementation may include a compact details array, but the top-level `error` field must remain present and stable.

## Schema Boundaries

The schemas should validate only what the route boundary needs in order to trust the payload shape.

### `POST /api/chat`

Validate:

- `model` as a required string
- `messages` as a required array
- optional `driveContext` as string
- optional `images` as array when present

Do not over-model every nested upstream Anthropic content variant in this pass. The goal is to reject obviously invalid request bodies while preserving current route behavior.

### `POST /api/evaluate`

Validate:

- `draft` as a required non-empty string
- optional `pageName`
- optional `pageType`
- optional `userType`

### `POST /api/improve-structure`

Validate:

- `raw` as a required non-empty string
- optional `preferences` as an array
- optional `evaluationFeedback` as an object

As with chat, keep this boundary pragmatic. Validate enough to replace the current manual checks, not every possible nested shape in one pass.

## Rate Limiting Design

Add route-specific limiters using `express-rate-limit`.

### Intent

- `POST /api/chat` gets the strictest limiter because it is the most expensive and longest-lived route.
- `POST /api/evaluate` and `POST /api/improve-structure` get moderate limiters because they are still expensive but shorter-lived.

### Behavioral Requirements

- Return `429` JSON with a clear retry message.
- Do not change successful route payloads.
- Do not add a global limiter for unrelated routes.
- Keep limiter setup reusable so a future global or per-route expansion is easy.

Exact thresholds should be conservative but not disruptive for local use. Initial values can be tuned during implementation, but they should clearly distinguish `chat` from the other two AI routes.

## Error Handling

Preserve the existing separation of concerns:

- invalid body shape: `400`
- missing server credentials: existing `500` behavior remains
- upstream/provider failures: existing `500` behavior remains
- throttled requests: `429`

Do not change response shapes for successful calls.

## File Changes

Expected files:

- `package.json`
  - add `zod`
  - add `express-rate-limit`
- `server.js`
  - import limiter and schema helpers
  - attach route-specific limiter middleware
  - replace manual body checks on the three AI routes with schema-backed validation
- `lib/requestSchemas.js`
  - define Zod schemas and a small validation helper
- `src/server.api.test.ts`
  - add coverage for invalid body rejection
  - add coverage for limiter behavior

No frontend files are expected to change in this pass.

## Testing Strategy

Add or update server integration tests for:

- valid request body acceptance on all three AI routes
- invalid request body rejection on all three AI routes
- rate limiting on at least one expensive route, ideally `POST /api/chat`

Avoid broad frontend test churn in this pass. The change is server-boundary focused.

## Risks

- Overly strict schemas could reject payloads the current app sends.
- Overly aggressive limits could affect local testing or repeated AI iteration.
- Test environments may need care so limiter state does not leak between tests.

## Mitigations

- Keep schemas intentionally shallow at the boundary.
- Apply rate limiting only to the three expensive AI routes.
- Reset or isolate limiter state in tests.
- Preserve existing success payloads and downstream route logic.

## Rollout Plan

1. Install `zod` and `express-rate-limit`.
2. Add schema and validation helper module.
3. Replace inline manual validation on the three AI routes.
4. Add route-specific limiters for those routes only.
5. Add or update server tests for invalid bodies and throttling.
6. Verify tests and confirm no non-AI API routes changed behavior.

## Success Criteria

The work is complete when:

- the three AI routes validate request bodies through Zod-backed helpers
- those routes are rate-limited independently of the rest of `/api`
- invalid request bodies fail fast with `400`
- repeated requests can trigger `429` on protected routes
- existing non-AI API behavior remains unchanged
