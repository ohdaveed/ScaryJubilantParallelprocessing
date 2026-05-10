/**
 * Todo management routes for CRUD operations on todo items.
 */
export const registerTodosRoutes = (app, db, { getErrorMessage } = {}) => {
  // GET /api/todos — List all todos
  app.get("/api/todos", async (req, res) => {
    try {
      const todos = await db.listTodos();
      res.json({ todos });
    } catch (err) {
      console.error("GET /api/todos error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // POST /api/todos — Create a new todo
  app.post("/api/todos", async (req, res) => {
    const { topic, userType, plannedId } = req.body;
    if (!topic) return res.status(400).json({ error: "Missing topic" });
    try {
      const todo = await db.createTodo(topic, userType || "General public", {
        plannedId: plannedId != null && plannedId !== "" ? Number(plannedId) : undefined
      });
      res.json(todo);
    } catch (err) {
      console.error("POST /api/todos error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // PATCH /api/todos/:id — Update a todo (mark done or update queue status)
  app.patch("/api/todos/:id", async (req, res) => {
    const { done, status, errorMessage, builtPageId, karlGrade } = req.body;
    try {
      let todo;
      if (done !== undefined) {
        todo = await db.updateTodo(req.params.id, done);
      } else {
        todo = await db.updateTodoQueue(req.params.id, { status, errorMessage, builtPageId, karlGrade });
      }
      if (!todo) return res.status(404).json({ error: "Todo not found" });
      res.json(todo);
    } catch (err) {
      console.error("PATCH /api/todos error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  // DELETE /api/todos/:id — Delete a todo
  app.delete("/api/todos/:id", async (req, res) => {
    try {
      await db.deleteTodo(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/todos error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
};
