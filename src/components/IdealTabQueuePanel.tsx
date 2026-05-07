import React, { memo, useState, useEffect } from "react";
import { PageDraft, TodoItem, UserType } from "../types";
import { USER_TYPES } from "../constants";
import { APP_INPUT_SM_MB6_CLASS, APP_INPUT_SM_MB8_CLASS, Btn, Card } from "./ui";
import { todosApi } from "../utils/api";
import { useQueueRunner } from "../hooks/useQueueRunner";

export const IdealTabQueuePanel = memo(function IdealTabQueuePanel({
  generateForQueue,
  onOpenPage
}: {
  generateForQueue: (todo: TodoItem) => Promise<PageDraft | null>;
  onOpenPage: (pageId: string) => void;
}) {
  // REFACTORED: Reused shared compact input/select class constants to remove duplicated className literals.
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [newUT, setNewUT] = useState<UserType>(USER_TYPES[0]);
  const [adding, setAdding] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(true);

  const { running, start, stop, currentItemId } = useQueueRunner({ todos, setTodos, generate: generateForQueue });

  useEffect(() => {
    todosApi.list()
      .then(setTodos)
      .catch(() => setTodos([]))
      .finally(() => setLoadingTodos(false));
  }, []);

  const addTodo = async () => {
    if (!newTopic.trim()) return;
    try {
      const created = await todosApi.create(newTopic.trim(), newUT);
      setTodos(prev => [...prev, created]);
      setNewTopic(""); setAdding(false);
    } catch {}
  };

  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);
  const runnablePending = todos.filter(t => t.status === "pending").length;

  return (
    <Card className="app-card-pad--16-18">
      <div className="app-todo-header">
        <p className="app-up-label app-up-label--flush">Build wishlist</p>
        {pending.length > 0 && <span className="app-pending-badge">{pending.length}</span>}
      </div>
      <p className="app-ps-muted" style={{ marginTop: 0 }}>
        Add pages you want to create. They will be placed in the build queue.
      </p>

      {adding ? (
        <div style={{ marginBottom: 16 }}>
          <input
            className={APP_INPUT_SM_MB6_CLASS}
            placeholder="Page name / topic…"
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTodo()}
            autoFocus
          />
          <select
            className={APP_INPUT_SM_MB8_CLASS}
            aria-label="Primary user"
            title="Primary user"
            value={newUT}
            onChange={e => setNewUT(e.target.value as UserType)}
          >
            {USER_TYPES.map(u => <option key={u}>{u}</option>)}
          </select>
          <div className="app-row-gap-6">
            <Btn onClick={addTodo} variant="primary" size="sm">Add to queue</Btn>
            <Btn onClick={() => { setAdding(false); setNewTopic(""); }} variant="ghost" size="sm">Cancel</Btn>
          </div>
        </div>
      ) : (
        <button type="button" className="app-todo-dash" onClick={() => setAdding(true)} style={{ marginBottom: 16 }}>
          + Add page to build wishlist
        </button>
      )}

      {!loadingTodos && runnablePending > 0 && (
        <div className="app-row-gap-6" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <Btn onClick={() => void start()} variant="primary" size="sm" disabled={running}>
            {running ? "Running queue…" : "Run queue"}
          </Btn>
          {running && (
            <Btn onClick={stop} variant="ghost" size="sm">Stop</Btn>
          )}
        </div>
      )}

      {loadingTodos && <p className="app-loading-p">Loading…</p>}

      {!loadingTodos && pending.length === 0 && done.length === 0 && (
        <div className="app-todo-empty">
          <p className="app-todo-empty__t">No pages queued</p>
          <p className="app-todo-empty__s">Add topics above to build your queue</p>
        </div>
      )}

      {pending.map(t => (
        <div key={t.id} className="app-todo-row">
          <div className="app-todo-body">
            <p className="app-todo-topic">{t.topic}</p>
            <p className="app-todo-ut">{t.userType}</p>
            <p className="app-todo-ut" style={{ fontSize: 11, marginTop: 4 }}>
              <span style={{ opacity: 0.85 }}>{t.status === "generating" ? "Generating" : t.status === "failed" ? "Failed" : "Pending"}</span>
              {currentItemId === t.id && <span style={{ marginLeft: 8 }}>· In progress</span>}
            </p>
            {t.status === "done" && t.builtPageId && (
              <div style={{ marginTop: 8 }}>
                <Btn onClick={() => onOpenPage(t.builtPageId!)} variant="ghost" size="sm">Open page</Btn>
              </div>
            )}
            {t.status === "failed" && (
              <p className="app-todo-ut" style={{ color: "var(--color-text-danger, #b42318)", marginTop: 4, fontSize: 12 }}>
                {t.errorMessage || "Generation failed"}
              </p>
            )}
          </div>
        </div>
      ))}

      {done.map(t => (
        <div key={t.id} className="app-todo-done-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="app-todo-done-topic">{t.topic}</p>
            {t.builtPageId && (
              <Btn onClick={() => onOpenPage(t.builtPageId!)} variant="ghost" size="sm">Open</Btn>
            )}
          </div>
        </div>
      ))}
    </Card>
  );
});