/**
 * Build queue management routes for tracking and managing page generation tasks.
 */
export const registerBuildQueueRoutes = (app, db, { getErrorMessage } = {}) => {
  // GET /api/build-queue — List all build queue items
  app.get("/api/build-queue", async (req, res) => {
    try {
      const items = await db.listBuildQueueItems();
      res.json({ items });
    } catch (err) {
      console.error("GET /api/build-queue error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // POST /api/build-queue — Create a new build queue item
  app.post("/api/build-queue", async (req, res) => {
    const {
      conceptId = null,
      artifactId = null,
      queueStatus = "queued",
      priority = 50,
      requestedBy = "manual",
      topic,
      audience = "General public"
    } = req.body;
    if (!topic) return res.status(400).json({ error: "Missing topic" });
    try {
      const item = await db.createBuildQueueItem({ conceptId, artifactId, queueStatus, priority, requestedBy, topic, audience });
      res.json(item);
    } catch (err) {
      console.error("POST /api/build-queue error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // PATCH /api/build-queue/:id — Update a build queue item
  app.patch("/api/build-queue/:id", async (req, res) => {
    try {
      const item = await db.updateBuildQueueItem(req.params.id, req.body || {});
      if (!item) return res.status(404).json({ error: "Queue item not found" });
      res.json(item);
    } catch (err) {
      console.error("PATCH /api/build-queue error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // DELETE /api/build-queue/:id — Delete a build queue item
  app.delete("/api/build-queue/:id", async (req, res) => {
    try {
      await db.deleteBuildQueueItem(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/build-queue error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
};
