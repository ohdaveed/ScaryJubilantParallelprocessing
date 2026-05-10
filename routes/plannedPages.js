/**
 * Planned pages management routes for CRUD operations on page plans with hierarchical relationships.
 */
export const registerPlannedPagesRoutes = (app, db, { getErrorMessage, applyShortReadCache } = {}) => {
  // GET /api/planned-pages — List all planned pages
  app.get("/api/planned-pages", async (req, res) => {
    try {
      applyShortReadCache(res);
      const plannedPages = await db.listPlannedPages();
      res.json({ plannedPages });
    } catch (err) {
      console.error("GET /api/planned-pages error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // POST /api/planned-pages — Create a new planned page
  app.post("/api/planned-pages", async (req, res) => {
    const { name, pageType, userType, parentId } = req.body;
    if (!name || !pageType || !userType) return res.status(400).json({ error: "Missing required fields" });
    if (parentId) {
      const parent = await db.getPlannedPage(parentId);
      if (!parent) return res.status(400).json({ error: "Parent not found" });
    }
    try {
      const plannedPage = await db.createPlannedPage(name, pageType, userType, parentId || null);
      res.json(plannedPage);
    } catch (err) {
      console.error("POST /api/planned-pages error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // PATCH /api/planned-pages/:id — Update a planned page
  app.patch("/api/planned-pages/:id", async (req, res) => {
    const { name, pageType, userType, parentId, builtPageId } = req.body;
    if (parentId !== undefined && parentId !== null && String(parentId) === String(req.params.id)) {
      return res.status(400).json({ error: "A page cannot be its own parent" });
    }
    try {
      if (parentId !== undefined && parentId !== null) {
        const currentId = Number(req.params.id);
        let cursor = await db.getPlannedPage(parentId);
        if (!cursor) return res.status(400).json({ error: "Parent not found" });

        // Walk ancestor chain to prevent assigning a descendant as parent.
        for (let depth = 0; depth < 100 && cursor?.parentId != null; depth += 1) {
          if (Number(cursor.id) === currentId) {
            return res.status(400).json({ error: "Parent assignment would create a cycle" });
          }
          cursor = await db.getPlannedPage(cursor.parentId);
          if (!cursor) break;
        }
        if (Number(cursor?.id) === currentId) {
          return res.status(400).json({ error: "Parent assignment would create a cycle" });
        }
      }

      const patch = {};
      if (name !== undefined) patch.name = name;
      if (pageType !== undefined) patch.pageType = pageType;
      if (userType !== undefined) patch.userType = userType;
      if (parentId !== undefined) patch.parentId = parentId;
      if (builtPageId !== undefined) patch.builtPageId = builtPageId;
      if (Object.keys(patch).length === 0) return res.status(400).json({ error: "No fields to update" });

      const plannedPage = await db.updatePlannedPage(req.params.id, patch);
      if (!plannedPage) return res.status(404).json({ error: "Not found" });
      res.json(plannedPage);
    } catch (err) {
      console.error("PATCH /api/planned-pages error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // DELETE /api/planned-pages/:id — Delete a planned page
  app.delete("/api/planned-pages/:id", async (req, res) => {
    try {
      await db.deletePlannedPage(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/planned-pages error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
};
