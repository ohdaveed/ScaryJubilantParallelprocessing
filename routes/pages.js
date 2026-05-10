/**
 * Page management routes for CRUD operations, versioning, and status reviews.
 * Manages pages, versions, and restoration.
 */
export const registerPagesRoutes = (app, db, {
  getErrorMessage,
  applyShortReadCache,
  parsePageListFields,
  parseBooleanQuery,
  parseNonNegativeIntQuery,
  DEFAULT_PAGE_LIST_LIMIT,
  MAX_PAGE_LIST_LIMIT,
  MAX_PAGE_LIST_OFFSET,
  DEFAULT_DRAFT_PREVIEW_CHARS,
  MAX_DRAFT_PREVIEW_CHARS
} = {}) => {
  // GET /api/pages — List all pages with filtering and field selection
  app.get("/api/pages", async (req, res) => {
    const fieldsResult = parsePageListFields(typeof req.query.fields === "string" ? req.query.fields : "");
    if (fieldsResult.error) {
      return res.status(400).json({ error: `Invalid fields query: ${fieldsResult.error}` });
    }
    const includeDraftResult = parseBooleanQuery(req.query.includeDraft, true);
    if (includeDraftResult.error) {
      return res.status(400).json({ error: `Invalid includeDraft query: ${includeDraftResult.error}` });
    }
    const includeRawResult = parseBooleanQuery(req.query.includeRaw, true);
    if (includeRawResult.error) {
      return res.status(400).json({ error: `Invalid includeRaw query: ${includeRawResult.error}` });
    }
    const includeDraftPreviewResult = parseBooleanQuery(req.query.includeDraftPreview, true);
    if (includeDraftPreviewResult.error) {
      return res.status(400).json({ error: `Invalid includeDraftPreview query: ${includeDraftPreviewResult.error}` });
    }
    const draftPreviewCharsResult = parseNonNegativeIntQuery(
      req.query.draftPreviewChars,
      DEFAULT_DRAFT_PREVIEW_CHARS,
      MAX_DRAFT_PREVIEW_CHARS
    );
    if (draftPreviewCharsResult.error) {
      return res.status(400).json({ error: `Invalid draftPreviewChars query: ${draftPreviewCharsResult.error}` });
    }
    const limitResult = parseNonNegativeIntQuery(req.query.limit, DEFAULT_PAGE_LIST_LIMIT, MAX_PAGE_LIST_LIMIT);
    if (limitResult.error) {
      return res.status(400).json({ error: `Invalid limit query: ${limitResult.error}` });
    }
    const offsetResult = parseNonNegativeIntQuery(req.query.offset, 0, MAX_PAGE_LIST_OFFSET);
    if (offsetResult.error) {
      return res.status(400).json({ error: `Invalid offset query: ${offsetResult.error}` });
    }

    try {
      applyShortReadCache(res);
      const pages = await db.listPages({
        fields: fieldsResult.value,
        includeDraft: includeDraftResult.value,
        includeRaw: includeRawResult.value,
        includeDraftPreview: includeDraftPreviewResult.value,
        draftPreviewChars: draftPreviewCharsResult.value,
        limit: limitResult.value,
        offset: offsetResult.value
      });
      res.json({ pages });
    } catch (err) {
      console.error("GET /api/pages error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // GET /api/pages/:id — Fetch a single page by ID
  app.get("/api/pages/:id", async (req, res) => {
    try {
      applyShortReadCache(res);
      const page = await db.getPage(req.params.id);
      if (!page) return res.status(404).json({ error: "Page not found" });
      res.json(page);
    } catch (err) {
      console.error("GET /api/pages/:id error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // POST /api/pages — Create or update a page
  app.post("/api/pages", async (req, res) => {
    const { id, data, versionNotes, versionTrigger } = req.body;
    if (!id || !data) return res.status(400).json({ error: "Missing id or data" });
    try {
      await db.savePage(id, data);
      if (versionTrigger) {
        await db.saveVersion(id, data, versionNotes || null, versionTrigger);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("POST /api/pages error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // DELETE /api/pages/:id — Delete a page
  app.delete("/api/pages/:id", async (req, res) => {
    try {
      await db.deletePage(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/pages error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // PATCH /api/pages/:id/review — Update page review status
  app.patch("/api/pages/:id/review", async (req, res) => {
    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be pending, approved, or rejected." });
    }
    try {
      const page = await db.updatePageReview(req.params.id, status);
      if (!page) return res.status(404).json({ error: "Page not found" });
      res.json(page);
    } catch (err) {
      console.error("PATCH /api/pages/:id/review error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // GET /api/pages/:id/versions — List versions for a page
  app.get("/api/pages/:id/versions", async (req, res) => {
    const { includeData, limit } = req.query;
    try {
      const versions = await db.getVersions(req.params.id, {
        includeData: includeData === "true",
        limit: limit ? parseInt(limit) : undefined
      });
      res.json({ versions });
    } catch (err) {
      console.error("GET /api/pages/:id/versions error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // GET /api/pages/:id/versions/:versionId — Fetch a specific version
  app.get("/api/pages/:id/versions/:versionId", async (req, res) => {
    try {
      const { id } = req.params;
      const version = await db.getVersion(req.params.versionId);
      if (!version) return res.status(404).json({ error: "Version not found" });
      if (String(version.pageId) !== String(id)) {
        return res.status(404).json({ error: "Version not found for page" });
      }
      res.json(version);
    } catch (err) {
      console.error("GET /api/pages/:id/versions/:versionId error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // POST /api/pages/:id/restore/:versionId — Restore page to a previous version
  app.post("/api/pages/:id/restore/:versionId", async (req, res) => {
    const { id, versionId } = req.params;
    try {
      const version = await db.getVersion(versionId);
      if (!version) return res.status(404).json({ error: "Version not found" });
      if (String(version.pageId) !== String(id)) {
        return res.status(404).json({ error: "Version not found for page" });
      }
      await db.savePage(id, version.data);
      await db.saveVersion(id, version.data, `Restored from v${version.versionNumber}`, "restore");
      res.json({ ok: true, data: version.data });
    } catch (err) {
      console.error("POST /api/pages/:id/restore/:versionId error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
};
