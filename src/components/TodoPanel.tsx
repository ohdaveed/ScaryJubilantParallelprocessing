import React, { memo, useState, useEffect, useCallback } from "react";
import { PageDraft, PlannedPage, TodoItem, UserType } from "../types";
import { USER_TYPES } from "../constants";
import { APP_INPUT_SM_MB6_CLASS, APP_INPUT_SM_MB8_CLASS, Btn, Card } from "./ui";
import { useQueueRunner } from "../hooks/useQueueRunner";
import { todosApi } from "../api";

export const TodoPanel = memo(function TodoPanel({
  generateForQueue,
  onOpenPage,
  plannedPages = []
}: {
  generateForQueue: (todo: TodoItem) => Promise<PageDraft | null>;
  onOpenPage: (pageId: string) => void;
  plannedPages?: PlannedPage[];
}) {
  // REFACTORED: Reused shared compact input/select class constants to remove duplicated className literals.
  const plannedNameById = new Map<number, string>(plannedPages.map((p) => [p.id, p.name]));
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

  const toggle = async (id: number, currentDone: boolean) => {
    let previous: TodoItem[] = [];
    setTodos(prev => {
      previous = prev;
      return prev.map(t => t.id === id ? { ...t, done: !currentDone } : t);
    });
    try {
      await todosApi.toggle(id, !currentDone);
    } catch {
      setTodos(previous);
    }
  };

  const remove = async (id: number) => {
    let previous: TodoItem[] = [];
    setTodos(prev => {
      previous = prev;
      return prev.filter(t => t.id !== id);
    });
    try {
      await todosApi.delete(id);
    } catch {
      setTodos(previous);
    }
  };

  const retryFailed = async (id: number) => {
    let previous: TodoItem[] = [];
    setTodos(prev => {
      previous = prev;
      return prev.map(t => (t.id === id ? { ...t, status: "pending", errorMessage: null } : t));
    });
    try {
      await todosApi.updateQueue(id, { status: "pending", errorMessage: null });
    } catch {
      setTodos(previous);
    }
  };

  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);
  const runnablePending = todos.filter(t => t.status === "pending").length;

  const statusLabel = (t: TodoItem) => {
    if (t.status === "generating") return "Generating";
    if (t.status === "failed") return "Failed";
    if (t.status === "done") return "Built";
    return "Pending";
  };

  return (
    <Card className="app-card-pad--16-18">
      <div className="app-todo-header">
        <p className="app-up-label app-up-label--flush">Pages to build</p>
        {pending.length > 0 && <span className="app-pending-badge">{pending.length}</span>}
      </div>
      <p className="app-ps-muted" style={{ marginTop: 0 }}>Operational build queue only. Items here do not define canonical IA.</p>

      {!loadingTodos && runnablePending > 0 && (
        <div className="app-row-gap-6" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <Btn onClick={() => void start()} variant="primary" size="sm" disabled={running}>
            {running ? "Running queue…" : "Run queue"}
          </Btn>
          {running && (
            <Btn onClick={stop} variant="ghost" size="sm">
              Stop
            </Btn>
          )}
        </div>
      )}

      {loadingTodos && <p className="app-loading-p">Loading…</p>}

      {!loadingTodos && pending.length === 0 && done.length === 0 && (
        <div className="app-todo-empty">
          <p className="app-todo-empty__t">No pages queued</p>
          <p className="app-todo-empty__s">Add topics below to build your queue</p>
        </div>
      )}

      {pending.map(t => (
        <div key={t.id} className="app-todo-row">
          <button type="button" className="app-todo-check" onClick={() => toggle(t.id, t.done)} aria-label="Mark done" />
          <div className="app-todo-body">
            <p className="app-todo-topic">{t.topic}</p>
            <p className="app-todo-ut">{t.userType}</p>
            <p className="app-todo-ut" style={{ fontSize: 11, marginTop: 4 }}>
              <span style={{ opacity: 0.85 }}>{statusLabel(t)}</span>
              {t.plannedId != null && (
                <span style={{ marginLeft: 8, opacity: 0.7 }} title={`Planned page id ${t.plannedId}`}>
                  · Planned: {plannedNameById.get(t.plannedId) || `#${t.plannedId}`}
                </span>
              )}
              {t.karlGrade && t.status === "done" && (
                <span style={{ marginLeft: 8 }}>· Karl {t.karlGrade}</span>
              )}
              {currentItemId === t.id && <span style={{ marginLeft: 8 }}>· In progress</span>}
            </p>
            {t.status === "failed" && t.errorMessage && (
              <p className="app-todo-ut" style={{ color: "var(--color-text-danger, #b42318)", marginTop: 4, fontSize: 12 }}>
                {t.errorMessage}
              </p>
            )}
            {t.status === "done" && t.builtPageId && (
              <div style={{ marginTop: 8 }}>
                <Btn onClick={() => onOpenPage(t.builtPageId!)} variant="ghost" size="sm">
                  Open page
                </Btn>
              </div>
            )}
            {t.status === "failed" && (
              <div style={{ marginTop: 8 }}>
                <Btn onClick={() => void retryFailed(t.id)} variant="ghost" size="sm">
                  Retry
                </Btn>
              </div>
            )}
          </div>
          <div className="app-todo-actions">
            <button type="button" className="app-ghost-x" onClick={() => remove(t.id)}>✕</button>
          </div>
        </div>
      ))}

      {done.map(t => (
        <div key={t.id} className="app-todo-done-row">
          <button type="button" className="app-todo-done-check" onClick={() => toggle(t.id, t.done)} aria-label="Unmark">
            <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1.5 5l3 3 4-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="app-todo-done-topic">{t.topic}</p>
            {(t.builtPageId || t.karlGrade) && (
              <p className="app-todo-ut" style={{ fontSize: 11, marginTop: 2 }}>
                {t.karlGrade && <span>Karl {t.karlGrade}</span>}
                {t.builtPageId && (
                  <span style={{ marginLeft: 4 }}>
                    <Btn onClick={() => onOpenPage(t.builtPageId!)} variant="ghost" size="sm">
                      Open
                    </Btn>
                  </span>
                )}
              </p>
            )}
          </div>
          <button type="button" className="app-ghost-x app-ghost-x--tight" onClick={() => remove(t.id)}>✕</button>
        </div>
      ))}

      {adding ? (
        <div className="app-todo-add-box">
          <input className={APP_INPUT_SM_MB6_CLASS} placeholder="Page topic…" value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} autoFocus />
          <select className={APP_INPUT_SM_MB8_CLASS} aria-label="Primary user" title="Primary user" value={newUT} onChange={e => setNewUT(e.target.value as UserType)}>
            {USER_TYPES.map(u => <option key={u}>{u}</option>)}
          </select>
          <div className="app-row-gap-6">
            <Btn onClick={addTodo} variant="primary" size="sm">Add</Btn>
            <Btn onClick={() => { setAdding(false); setNewTopic(""); }} variant="ghost" size="sm">Cancel</Btn>
          </div>
        </div>
      ) : (
        <button type="button" className="app-todo-dash" onClick={() => setAdding(true)}>
          + Add page
        </button>
      )}
    </Card>
  );
});
