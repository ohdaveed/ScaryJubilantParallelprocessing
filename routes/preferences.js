/**
 * Preferences management routes for storing and retrieving user preferences per page.
 */
export const registerPreferencesRoutes = (app, db, { getErrorMessage } = {}) => {
  // GET /api/preferences — List preferences (optionally filtered by page_id)
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

  // POST /api/preferences — Create a new preference
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

  // DELETE /api/preferences/:id — Delete a preference
  app.delete("/api/preferences/:id", async (req, res) => {
    try {
      await db.deletePreference(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/preferences error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
};
