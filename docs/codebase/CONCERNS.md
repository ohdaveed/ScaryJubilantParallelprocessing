# CONCERNS.md — Technical Debt, Risks & Performance

## Technical Debt

### 1. Monolithic Backend (server.js)

**Issue:** All Express routes defined in a single 34KB file  
**Risk:** Hard to navigate, test, and maintain; scaling concerns  
**Severity:** Medium  
**Recommendation:**
- Split routes into modules: `server/routes/chat.js`, `server/routes/pages.js`, etc.
- Extract middleware into `server/middleware/`
- Extract utilities into `server/utils/`

**Impact if not fixed:**
- Code review becomes harder
- Route interdependencies become hidden
- Performance monitoring becomes difficult

---

### 2. No Environment Variables Template

**Issue:** `.env.example` or `.env.template` missing from repo  
**Risk:** New developers may miss required variables (ANTHROPIC_API_KEY, DATABASE_URL)  
**Severity:** Low  
**Recommendation:** Create `.env.example`:
```bash
ANTHROPIC_API_KEY=sk-ant-...  # Required for AI features
DATABASE_URL=postgresql://...  # Optional; falls back to file mode
DB_FALLBACK_MODE=              # Set to 'file' to force file-based persistence
```

---

### 3. No ESLint Configuration

**Issue:** Only TypeScript type checking; no linting rules (code style, unused variables, etc.)  
**Risk:** Inconsistent code patterns; potential bugs missed (e.g., accidental globals)  
**Severity:** Low  
**Recommendation:** 
- Add ESLint with TypeScript parser
- Configure common rules (naming, import order, unused vars)
- Enforce in CI/CD pipeline

---

### 4. File-Based Persistence Not Thread-Safe

**Issue:** `.local/hhvc-local-db.json` uses read-modify-write; no locking  
**Risk:** Race conditions if multiple Express workers/instances access simultaneously  
**Severity:** Medium (only affects file mode; PostgreSQL is thread-safe)  
**Recommendation:**
- For production, always use PostgreSQL
- If file mode required, add file locking (flock) or use a library like `proper-lockfile`
- Document: "File mode is development-only; not recommended for multi-process deployments"

---

### 5. No Input Validation on API Payloads

**Issue:** Limited validation beyond type checks; no schema validation (e.g., length limits, regex)  
**Risk:** Malformed data may cause unexpected AI responses or DB errors  
**Severity:** Low  
**Recommendation:**
- Add Zod or Joi schema validation
- Validate on all POST/PATCH endpoints
- Return detailed error messages on validation failure

---

### 6. Logging Outputs Raw JSON

**Issue:** All logs are `JSON.stringify()` without structured fields (e.g., timestamp, severity level)  
**Risk:** Hard to filter logs; difficult to integrate with external logging services  
**Severity:** Low  
**Recommendation:**
- Add winston or pino logger
- Include timestamps, log levels (INFO, WARN, ERROR), request ID, stage
- Example: `{ timestamp, level, requestId, stage, message, context }`

---

### 7. No Test Coverage Reporting

**Issue:** No code coverage configured in Vitest  
**Risk:** Blind spots in test suite; uncovered edge cases released to production  
**Severity:** Low  
**Recommendation:**
- Enable Vitest coverage with HTML report
- Set minimum thresholds (70% statements, 60% branches)
- Fail CI/CD if coverage drops

---

## Security Concerns

### 1. API Key in Environment Variable (Expected)

**Risk:** `ANTHROPIC_API_KEY` stored in `.env` (git-ignored)  
**Mitigation:** ✅ Already mitigated
- `.env` is in `.gitignore`
- Server reads via `node --env-file=.env` at startup
- No hardcoded keys in source

**Recommendation:** In production, use secret management (e.g., AWS Secrets Manager, HashiCorp Vault).

---

### 2. Google Drive Credentials (Legacy, Unused)

**Risk:** `GOOGLE_APPLICATION_CREDENTIALS` may contain unencrypted JSON  
**Status:** Drive integration removed from frontend; backend code unused  
**Recommendation:**
- Remove Drive routes from server.js
- Remove env var documentation
- Delete hhvc-drive-sa..json (looks like a stale service account key)

---

### 3. No Rate Limiting

**Issue:** No rate limiting on API endpoints  
**Risk:** Brute-force attacks, token exhaustion (Anthropic API quota abuse)  
**Severity:** Medium  
**Recommendation:**
- Add rate limiting middleware (e.g., express-rate-limit)
- Limit `/api/chat` to 5 req/min per IP
- Limit other endpoints to 20 req/min per IP
- Log rate limit violations

---

### 4. No CORS Configuration Visible

**Issue:** Express has no explicit CORS setup; unclear if third-party domains allowed  
**Risk:** Unintended cross-origin access if CORS misconfigured  
**Severity:** Low  
**Recommendation:**
- Add explicit CORS config
- Allow only trusted origins (e.g., localhost:5000 in dev, sf.gov in prod)
- Deny by default

---

### 5. Image Upload Size Limits (Good)

**Status:** ✅ Mitigated
- 4MB max per image
- 3 images max per request
- Validated in server.js

**Recommendation:** Document these limits in API docs.

---

### 6. No XSS Protection on Page Draft HTML

**Issue:** `page.draft` field contains raw HTML; could be vulnerable if displayed without sanitization  
**Risk:** Stored XSS if user-controlled HTML injected  
**Severity:** Medium  
**Recommendation:**
- Use DOMPurify or similar before rendering HTML
- Never use `dangerouslySetInnerHTML` without sanitization
- Verify SfGovPreview component sanitizes output

---

## Performance Concerns

### 1. Large File Processing (Word/PDF)

**Issue:** `pdf-parse` and `mammoth` load entire files into memory  
**Risk:** Files >10MB may cause memory spikes or crashes  
**Severity:** Low (current limit 20MB; should be fine for typical docs)  
**Recommendation:**
- Monitor memory usage during file parsing
- Consider streaming parsers if larger files needed
- Test with 50MB+ files to find breaking point

---

### 2. File-Based DB Inefficiency

**Issue:** Entire JSON file loaded on every request  
**Risk:** Slow queries as data grows; O(n) list operations  
**Severity:** Medium (only in file mode; PostgreSQL is efficient)  
**Recommendation:**
- Use PostgreSQL for production (mandatory for >1000 pages)
- If file mode required, consider splitting into per-page files

---

### 3. Vite Dev Server Proxy Latency

**Issue:** Vite (port 5000) proxies API requests to Express (port 3001)  
**Risk:** Extra network hop in development; adds ~10-50ms latency  
**Severity:** Low (development-only)  
**Recommendation:**
- Monitor dev server latency
- Consider running both servers in same process for faster iteration (optional)

---

### 4. React Component Re-renders

**Issue:** No memoization visible; components may re-render unnecessarily  
**Risk:** Slow UI response on large page lists or complex drafts  
**Severity:** Low (likely acceptable for current data size)  
**Recommendation:**
- Profile with React DevTools Profiler
- Add `useMemo` and `useCallback` where needed (high-frequency renders)
- Consider Zustand for state management if more complex

---

### 5. Anthropic API Latency

**Issue:** Page generation takes 10-30 seconds (sonnet model)  
**Risk:** Poor UX for users expecting instant feedback  
**Severity:** Accepted (inherent to AI task)  
**Recommendation:**
- Show loading indicator (already done: StreamRenderer)
- Consider offering faster model (haiku) as option
- Add request queue to prevent overwhelming API

---

## Availability & Reliability

### 1. Single Anthropic API Key

**Issue:** All requests use one API key; if rate-limited, all operations blocked  
**Risk:** Denial of service if quota exhausted  
**Severity:** Low (unlikely in normal use)  
**Recommendation:**
- Monitor API quota usage
- Add fallback/retry logic with exponential backoff
- Alert on rate limit (429) responses

---

### 2. PostgreSQL Connection Pool Limits

**Issue:** Pool size not explicitly configured  
**Risk:** Connection exhaustion under load  
**Severity:** Low (default pool size ~10; adequate for small team)  
**Recommendation:**
- Monitor connection count with `SELECT count(*) FROM pg_stat_activity;`
- Configure max connections if serving >10 concurrent users
- Example: `new Pool({ max: 20 })`

---

### 3. Fallback DB Automatic But Silent

**Issue:** If PostgreSQL fails, app switches to file mode without warning  
**Risk:** Data loss if file DB gets corrupted; no alert to operator  
**Severity:** Medium  
**Recommendation:**
- Log warning when fallback triggered
- Alert ops team (e.g., email, Slack)
- Display banner to users: "Database offline; using local storage"

---

## Known Issues

### 1. Merge Conflict Artifact

**Issue:** File `src/App (# Edit conflict 2026-04-19 4xnybrC #).tsx` exists  
**Impact:** Causes TypeScript compilation errors  
**Status:** Documented in AGENTS.md as "should be ignored"  
**Recommendation:** Delete the file; resolve conflict in actual `src/App.tsx`

---

### 2. Drive Integration Partially Removed

**Issue:** Frontend code removed but backend routes remain  
**Risk:** Confusing for developers; dead code  
**Status:** Low priority (no active use)  
**Recommendation:** Remove backend Drive routes; clean up env var docs

---

### 3. Version History Not Tested

**Issue:** `useVersionHistory` hook + `page_versions` table lack test coverage  
**Risk:** Rollback feature may break silently  
**Severity:** Low  
**Recommendation:** Add integration tests for version restore

---

## High-Churn Areas (Risk Zones)

Based on git history (90 days), these files change frequently and may harbor bugs:

| File | Commits | Risk Level | Reason |
|------|---------|-----------|--------|
| `src/App.tsx` | 34 | High | Root component; UI refactoring ongoing |
| `server.js` | 29 | High | Monolithic backend; frequent route changes |
| `src/utils.ts` | 20 | Medium | Utility refactoring; API surface instability |
| `src/types.ts` | 16 | Medium | Type additions for new features |
| `src/constants.ts` | 15 | Low | Content updates; rarely structural changes |

**Recommendation:** Prioritize testing in these areas; require careful code review for changes.

---

## Missing Documentation

| Item | Type | Impact |
|------|------|--------|
| `.env.example` | Configuration | Medium |
| API documentation (OpenAPI/Swagger) | Reference | Low |
| Database schema DDL (SQL) | Reference | Low |
| Contributing guide | Process | Low |
| Deployment checklist | Ops | Low |
| Performance tuning guide | Ops | Low |

---

## [ASK USER] Questions for Clarification

1. **Production Deployment:** Will this app run behind a proxy/load balancer? How many concurrent users expected?
   - Affects: Connection pool sizing, rate limiting strategy

2. **Data Retention:** What's the retention policy for page drafts and version history?
   - Affects: Database size, archival strategy, cleanup jobs

3. **Offline Mode:** Should the app support offline-first (service worker + local storage)?
   - Affects: Frontend architecture, sync strategy

4. **Multi-User Access:** Will multiple users access the tool simultaneously? If yes, need collaborative features?
   - Affects: Locking strategy, conflict resolution, notifications

5. **Compliance:** Are there data governance requirements (GDPR, HIPAA, etc.)?
   - Affects: Logging, audit trails, data deletion procedures

6. **AI Model Costs:** Any monthly budget for Anthropic API? Should we optimize for cost vs. quality?
   - Affects: Model selection (sonnet vs. haiku), request volume limits

---

## Evidence

- `server.js`: routes, error handling, API key usage
- `lib/persistence.js`: connection pool config, file I/O patterns
- `src/App.tsx`: component structure, re-render patterns
- `AGENTS.md`: known issues (merge conflict), gotchas
- Git log: high-churn files (App.tsx, server.js, utils.ts)
- `.gitignore`: `.env` is ignored
- `package.json`: dependency versions, no ESLint config
