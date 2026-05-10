/**
 * Page concepts, artifacts, and variants management routes for structured content modeling.
 */
export const registerConceptsRoutes = (app, db, {
  getErrorMessage,
  applyShortReadCache,
  parseRequestBody,
  promoteArtifactRequestSchema
} = {}) => {
  // GET /api/page-concepts — List all page concepts
  app.get("/api/page-concepts", async (req, res) => {
    try {
      applyShortReadCache(res);
      const concepts = await db.listPageConcepts();
      res.json({ concepts });
    } catch (err) {
      console.error("GET /api/page-concepts error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // POST /api/page-concepts — Create a new page concept
  app.post("/api/page-concepts", async (req, res) => {
    const {
      taskStatement,
      canonicalTitle,
      contentType,
      audience,
      serviceArea = "hhvc",
      status = "proposed",
      summary = "",
      parentConceptId = null
    } = req.body;
    if (!taskStatement || !canonicalTitle || !contentType || !audience) {
      return res.status(400).json({ error: "Missing required concept fields" });
    }
    try {
      const concept = await db.createPageConcept({
        taskStatement,
        canonicalTitle,
        contentType,
        audience,
        serviceArea,
        status,
        summary,
        parentConceptId
      });
      res.json(concept);
    } catch (err) {
      console.error("POST /api/page-concepts error:", getErrorMessage(err));
      res.status(400).json({ error: getErrorMessage(err) });
    }
  });

  // PATCH /api/page-concepts/:id — Update a page concept
  app.patch("/api/page-concepts/:id", async (req, res) => {
    try {
      const concept = await db.updatePageConcept(req.params.id, req.body || {});
      if (!concept) return res.status(404).json({ error: "Concept not found" });
      res.json(concept);
    } catch (err) {
      console.error("PATCH /api/page-concepts error:", getErrorMessage(err));
      res.status(400).json({ error: getErrorMessage(err) });
    }
  });

  // GET /api/ia-nodes — List information architecture nodes
  app.get("/api/ia-nodes", async (req, res) => {
    const mapId = typeof req.query.mapId === "string" ? req.query.mapId : undefined;
    try {
      applyShortReadCache(res);
      const nodes = await db.listIANodes(mapId);
      res.json({ nodes });
    } catch (err) {
      console.error("GET /api/ia-nodes error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // GET /api/page-artifacts — List all page artifacts
  app.get("/api/page-artifacts", async (req, res) => {
    try {
      applyShortReadCache(res);
      const artifacts = await db.listPageArtifacts();
      res.json({ artifacts });
    } catch (err) {
      console.error("GET /api/page-artifacts error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // POST /api/page-artifacts/:id/promote — Promote artifact as canonical
  app.post("/api/page-artifacts/:id/promote", async (req, res) => {
    const parsedBody = parseRequestBody(promoteArtifactRequestSchema, req, res, "/api/page-artifacts/:id/promote");
    if (!parsedBody) return;
    const { conceptId } = parsedBody;
    try {
      const artifact = await db.promoteArtifactAsCanonical(conceptId, req.params.id);
      if (!artifact) return res.status(404).json({ error: "Artifact not found" });
      res.json(artifact);
    } catch (err) {
      console.error("POST /api/page-artifacts/:id/promote error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // GET /api/artifact-variants — List all artifact variants
  app.get("/api/artifact-variants", async (req, res) => {
    try {
      applyShortReadCache(res);
      const variants = await db.listArtifactVariants();
      res.json({ variants });
    } catch (err) {
      console.error("GET /api/artifact-variants error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // POST /api/artifact-variants — Create a new artifact variant
  app.post("/api/artifact-variants", async (req, res) => {
    const { conceptId, baseArtifactId, artifactId, variantLabel, reason = "", status = "exploring" } = req.body;
    if (!conceptId || !baseArtifactId || !artifactId || !variantLabel) {
      return res.status(400).json({ error: "Missing required variant fields" });
    }
    try {
      const variant = await db.createArtifactVariant({ conceptId, baseArtifactId, artifactId, variantLabel, reason, status });
      res.json(variant);
    } catch (err) {
      console.error("POST /api/artifact-variants error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // GET /api/reference-examples — List all reference examples
  app.get("/api/reference-examples", async (req, res) => {
    try {
      applyShortReadCache(res);
      const references = await db.listReferenceExamples();
      res.json({ references });
    } catch (err) {
      console.error("GET /api/reference-examples error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
};
