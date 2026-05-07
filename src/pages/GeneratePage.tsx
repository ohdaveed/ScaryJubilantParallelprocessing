import React, { Suspense, lazy, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { USER_TYPES } from "../constants";
import { clean } from "../utils";
import { Badge, Btn, Card, KarlEvalPanel, ComponentChips, RelPanel, ProgressBar, DeleteConfirmationModal } from "../components/ui";
import { StreamRenderer } from "../components/StreamRenderer";
import { EvaluatingState } from "../components/EvaluatingState";
import { SuccessState } from "../components/SuccessState";
import { useNavigate } from "react-router-dom";
import { preferencesApi, pagesApi } from "../utils/api";
import packageJson from "../../package.json";

const LazySfGovPagePreview = lazy(() => import("../components/SfGovPreview").then((m) => ({ default: m.SfGovPagePreview })));

export default function GeneratePage() {
  const ctx = useWorkspace();
  const navigate = useNavigate();
  const screenshotRef = useRef<HTMLDivElement>(null);

  const {
    selected, setSelected, topic, userType, setUserType, notes, setNotes,
    setTopic, setTopicTouched, topicTouched, refineInput, setRefineInput,
    preferences, setPreferences, loading, streaming, evaluating, showSuccess,
    setShowSuccess, streamText, progress, progressLabel, karlStatus, error,
    parseWarn, justGenerated, generate, regenerate, refine,
    setPendingPageType, setPendingPlannedId, pendingPageType, pendingPlannedId,
    pages, pagesLoading, karlStatus: karlStatus_, openPageById,
    wsState, wsActions, historyPageId, setHistoryPageId, historyVersions,
    historyLoading, openHistory, restoreVersion, hydratePage, deletePage
  } = ctx;

  const pendingPageTypeValue = pendingPageType;
  const pageTypeOptions = useMemo(() => {
    const STUDIO_PAGE_TYPE_CHIPS = [
      "Transaction", "Information", "Topic", "Step by step",
      "Location", "Resource Collection", "Campaign"
    ] as const;
    return STUDIO_PAGE_TYPE_CHIPS.filter((t) => ["Transaction", "Information", "Topic", "Step by step", "Location", "Resource Collection", "Campaign"].includes(t));
  }, []);

  const [showRegenerateConfirmModal, setShowRegenerateConfirmModal] = useState(false);
  const [showDeleteCurrentPageModal, setShowDeleteCurrentPageModal] = useState(false);
  const [singlePageDeleteLoading, setSinglePageDeleteLoading] = useState(false);
  const [newPref, setNewPref] = useState("");

  const copied = wsState.copied;
  const setCopied = wsActions.setCopied;
  const mockupEditOpen = wsState.mockupEditOpen;
  const draftEditBuffer = wsState.draftEditBuffer;
  const setDraftEditBuffer = wsActions.setDraftEditBuffer;
  const draftEditSaving = wsState.draftEditSaving;
  const draftEditError = wsState.draftEditError;

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [setCopied]);

  const handleDownload = useCallback((text: string, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = name;
    a.click();
  }, []);

  const handleExportScreenshot = useCallback(async (pageName: string) => {
    if (!screenshotRef.current) return;
    await document.fonts.ready;
    const filename = (clean(pageName) || "page").toLowerCase().replace(/\s+/g, "-") + ".png";
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(screenshotRef.current, { backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error("Screenshot export failed:", err);
      handleDownload(selected?.draft ?? "", filename.replace(".png", "-draft.txt"));
    }
  }, [selected, screenshotRef, handleDownload]);

  const handleConfirmRegenerate = useCallback(() => {
    if (!selected) return;
    void regenerate(selected);
    setShowRegenerateConfirmModal(false);
  }, [selected, regenerate]);

  const handleConfirmDeleteCurrentPage = useCallback(async () => {
    if (!selected) return;
    setSinglePageDeleteLoading(true);
    try {
      await deletePage(selected.id);
    } finally {
      setSinglePageDeleteLoading(false);
      setShowDeleteCurrentPageModal(false);
    }
  }, [selected, deletePage]);

  const previewUrlSlug = useMemo(() => {
    const base = (clean(selected?.name) || topic || "preview").toLowerCase().replace(/\s+/g, "-").slice(0, 48);
    return `sf.gov / hhvc / ${base || "preview"}`;
  }, [selected?.name, topic]);

  const contentChecksFooter = useMemo(() => {
    const labels: Record<string, string> = {
      idle: "Content checks ready",
      connecting: "Connecting to standards…",
      active: "Content checks on",
      fallback: "Baseline rules (live standards unavailable)"
    };
    return labels[karlStatus] ?? `Standards: ${karlStatus}`;
  }, [karlStatus]);

  const streamFooterMeta = useMemo(
    () => `${contentChecksFooter} · v${packageJson.version}`,
    [contentChecksFooter]
  );

  const streamBarMessage = useMemo(() => {
    if (streaming) return progressLabel || "Generating…";
    if (evaluating) return "Evaluating against Karl standards…";
    if (error) return error;
    if (selected) {
      const n = clean(selected.name) || "Untitled";
      const g = selected.karlEvaluation?.grade;
      const s = selected.karlEvaluation?.score;
      if (g !== undefined && s !== undefined) return `Last opened: ${n} · Karl grade ${g} · ${s}/100`;
      return `Last opened: ${n}`;
    }
    if (justGenerated) {
      const n = clean(justGenerated.name) || "Untitled";
      const g = justGenerated.karlEvaluation?.grade;
      const s = justGenerated.karlEvaluation?.score;
      if (g !== undefined && s !== undefined) return `Last generated: ${n} · Karl grade ${g} · ${s}/100`;
      return `Last generated: ${n}`;
    }
    return "Ready — use the left panel to generate a new draft or open Library to continue";
  }, [streaming, evaluating, error, selected, justGenerated, progressLabel]);

  const handlePageTypeChange = useCallback((pt: string) => {
    setPendingPageType(pt);
    setPendingPlannedId(null);
  }, []);

  const handlePageGoalChange = useCallback((v: string) => {
    setTopic(v);
    setTopicTouched(true);
  }, []);

  const handleGenerateClick = useCallback(() => {
    void generate({ pageType: pendingPageTypeValue || pageTypeOptions[0] });
  }, [generate, pendingPageTypeValue, pageTypeOptions]);

  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!streaming && !evaluating && selected) {
      const timer = setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [streaming, evaluating, selected]);

  const showGenerateContextRail = topicTouched && !topic.trim() || !!pendingPageType || !!selected;

  return (
    <div>
      <Suspense fallback={<Card className="app-card-pad--20-24"><p className="app-loading-p">Loading preview…</p></Card>}>
        <div className={["app-studio-generate", !showGenerateContextRail ? "app-studio-generate--no-rail" : ""].filter(Boolean).join(" ")}>
          {showGenerateContextRail ? (
            <div className="app-studio-generate__rail">
              {(topicTouched && !topic.trim() || pendingPageType) ? (
                <Card className="app-card-pad--18-20">
                  {topicTouched && !topic.trim() && <p className="app-topic-err">Enter a page goal in the left panel to generate.</p>}
                  {pendingPageType && (
                    <div className="app-pending-type-banner">
                      <Badge type={pendingPageType} small />
                      <span>from plan</span>
                      <button type="button" className="app-icon-btn" aria-label="Clear planned page type from plan"
                        onClick={() => { setPendingPageType(""); setPendingPlannedId(null); }}>
                        &#10005;
                      </button>
                    </div>
                  )}
                </Card>
              ) : null}

              {selected && (
                <details className="app-pref-details">
                  <summary className="app-pref-details__summary">Advanced preferences</summary>
                  <Card className="app-card-pad--14-16-mb app-card-pref-inner">
                    <p className="app-pref-lead">Remembered for this page. Refine to teach the agent.</p>
                    {preferences.map(p => (
                      <div key={p.id} className="app-pref-row">
                        <span className="app-pref-text">{p.preference}</span>
                        <span className="app-pref-src">{p.source}</span>
                        <button type="button" className="app-pref-remove" onClick={async () => {
                          await preferencesApi.delete(p.id).catch(() => {});
                          setPreferences(prev => prev.filter(x => x.id !== p.id));
                        }} title="Remove preference">&#10005;</button>
                      </div>
                    ))}
                    {preferences.length === 0 && (
                      <p className="app-pref-empty">No preferences yet. Add one below or refine this page to teach the agent.</p>
                    )}
                    <div className="app-pref-add-row">
                      <input className="app-input app-input--pref" placeholder='e.g. "Always lead with tenant rights"' value={newPref}
                        onChange={e => setNewPref(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === "Enter" && newPref.trim()) {
                            const pref = await preferencesApi.create(newPref.trim(), "manual", selected?.id);
                            setPreferences(prev => [pref, ...prev]);
                            setNewPref("");
                          }
                        }}
                      />
                      <Btn variant="ghost" size="sm" disabled={!newPref.trim()} onClick={async () => {
                        if (!newPref.trim()) return;
                        const pref = await preferencesApi.create(newPref.trim(), "manual", selected?.id);
                        setPreferences(prev => [pref, ...prev]);
                        setNewPref("");
                      }}>Add</Btn>
                    </div>
                  </Card>
                </details>
              )}
            </div>
          ) : null}

          <div className="app-studio-generate__main">
            <Card className="app-card-pad--20-24">
              {streaming && (
                <div>
                  <ProgressBar progress={progress} label={progressLabel} />
                  <StreamRenderer text={streamText} />
                </div>
              )}

              {!streaming && evaluating && <EvaluatingState />}

              {!streaming && !evaluating && showSuccess && justGenerated && (
                <SuccessState page={justGenerated} onView={() => { setSelected(justGenerated); setShowSuccess(false); setShowSuccess(false); }} />
              )}

              {!streaming && !evaluating && !showSuccess && selected && (
                <div>
                  {/* Page header */}
                  <div className="app-page-head">
                    <div className="app-page-head__left">
                      <div className="app-page-badges">
                        <Badge type={clean(selected.pageType)} />
                        {selected.skeleton && <span className="app-pill-skeleton">Skeleton</span>}
                        {selected.karlConnected && <span className="app-pill-karl">Karl verified</span>}
                        {selected.karlEvaluation && (
                          <span className="app-pill-grade-inline" data-grade={selected.karlEvaluation.grade}>
                            Grade {selected.karlEvaluation.grade} · {selected.karlEvaluation.score}/100
                          </span>
                        )}
                      </div>
                      <h2 className="app-page-h2">{clean(selected.name) || "Untitled"}</h2>
                      <p className="app-page-sub">SF.gov · Healthy Housing & Vector Control</p>
                    </div>
                    <div className="app-page-actions">
                      <div className="app-page-actions__group app-page-actions__group--primary">
                        {selected.skeleton ? (
                          <Btn onClick={() => {
                            if (selected.inputs) generate({ topic: selected.inputs.topic, userType: selected.inputs.userType, notes: selected.inputs.notes, replaceSkeletonId: selected.id });
                          }} variant="primary" size="sm">Generate with AI</Btn>
                        ) : (
                          <Btn onClick={() => setShowRegenerateConfirmModal(true)} variant="primary" size="sm">Regenerate</Btn>
                        )}
                      </div>
                      <div className="app-page-actions__group app-page-actions__group--secondary">
                        <Btn onClick={() => handleCopy(selected.raw)} variant="ghost" size="sm">{copied ? "Copied!" : "Copy"}</Btn>
                        <Btn onClick={() => handleDownload(selected.raw, (clean(selected.name) || "page").toLowerCase().replace(/\s+/g, "-") + ".txt")} variant="ghost" size="sm">Download</Btn>
                        {!selected.skeleton && <Btn onClick={() => openHistory(selected.id)} variant="ghost" size="sm">History</Btn>}
                      </div>
                      <div className="app-page-actions__group app-page-actions__group--danger">
                        <Btn onClick={() => setShowDeleteCurrentPageModal(true)} variant="danger" size="sm">Delete</Btn>
                      </div>
                    </div>
                  </div>

                  <div className="app-meta-row">
                    {[["User", selected.userType], ["Goal", selected.userGoal], ["Purpose", selected.purpose]].map(([k, v]) => v && (
                      <div key={k} className="app-meta-chip">
                        <span className="app-meta-chip__k">{k}</span>
                        <span className="app-meta-chip__v">{clean(v as string)}</span>
                      </div>
                    ))}
                  </div>

                  {selected.karlEvaluation && <KarlEvalPanel evaluation={selected.karlEvaluation} />}
                  {selected.qualityGate?.status === "review_required" && (
                    <div className="app-qg-banner">
                      <p className="app-qg-banner__title">Manual review required before publish</p>
                      {selected.qualityGate.reasons.map((reason, idx) => (
                        <p key={idx} className="app-qg-banner__item">{reason}</p>
                      ))}
                    </div>
                  )}

                  <div className="app-preview-wrap" ref={previewRef}>
                    <div className="app-preview-toolbar">
                      <span className="app-preview-toolbar__label">SF.gov preview</span>
                      <div className="app-preview-toolbar__actions">
                        {!mockupEditOpen ? (
                          <Btn onClick={() => wsActions.openMockupEditor(selected, setDraftEditBuffer)} variant="ghost" size="sm" disabled={loading}>Edit content</Btn>
                        ) : (
                          <>
                            <Btn onClick={() => wsActions.saveMockupDraft(selected, ctx.setPages, setSelected)} variant="primary" size="sm" disabled={draftEditSaving || !(mockupEditOpen && selected && draftEditBuffer !== selected.draft)}>Save changes</Btn>
                            <Btn onClick={wsActions.cancelMockupEditor} variant="ghost" size="sm" disabled={draftEditSaving}>Cancel</Btn>
                          </>
                        )}
                        <Btn onClick={() => handleExportScreenshot(selected.name)} variant="ghost" size="sm">Download preview</Btn>
                      </div>
                    </div>
                    {mockupEditOpen && (
                      <div className="app-draft-editor">
                        <p className="app-draft-editor__hint">Edit the page draft below. The preview updates as you type. Use headings (# title, ## section), Summary:, Section heading:, Section body:, lists, and callouts as in generated pages.</p>
                        {draftEditError && <p className="app-draft-editor__err" role="alert">{draftEditError}</p>}
                        <textarea className="app-draft-editor__ta" aria-label="Page draft content" value={draftEditBuffer}
                          onChange={e => setDraftEditBuffer(e.target.value)} spellCheck={true} />
                      </div>
                    )}
                    <Suspense fallback={<div className="app-preview-loading">Loading preview…</div>}>
                      <LazySfGovPagePreview ref={screenshotRef} draft={mockupEditOpen ? draftEditBuffer : selected.draft} pageType={selected.pageType} pageTitle={clean(selected.name)} />
                    </Suspense>
                  </div>

                  {selected.enforcement && (
                    <div className="app-note-panel app-note-panel--enf">
                      <div className="app-note-panel__head"><span>Enforcement check</span></div>
                      <div className="app-note-panel__body">{clean(selected.enforcement).split("\n").filter(l => l.trim()).map((line, i) => (<p key={i}>{line}</p>))}</div>
                    </div>
                  )}
                  {selected.integration && (
                    <div className="app-note-panel app-note-panel--int">
                      <div className="app-note-panel__head"><span>Integration notes</span></div>
                      <div className="app-note-panel__body">{clean(selected.integration).split("\n").filter(l => l.trim()).map((line, i) => (<p key={i}>{line}</p>))}</div>
                    </div>
                  )}

                  <ComponentChips components={selected.components} />
                  <RelPanel rel={selected.relationships} />

                  <div className="app-refine">
                    <p className="app-up-label app-up-label--mb8">Refine this page</p>
                    <p className="app-refine__hint">Describe a specific change and the agent will revise the page content.</p>
                    <div className="app-refine__row">
                      <textarea className="app-input app-textarea-refine" value={refineInput}
                        onChange={e => setRefineInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) refine(); }}
                        placeholder='e.g. "Shorten the responsibilities section" or "Add a step about taking photos of the problem"' rows={2} />
                      <Btn onClick={refine} variant="primary" size="md" disabled={loading || !refineInput.trim()} className="app-refine__send">Send</Btn>
                    </div>
                  </div>
                </div>
              )}

              {!streaming && !evaluating && !showSuccess && !selected && (
                <div className="app-builder-empty">
                  {pagesLoading ? (
                    <>
                      <div className="app-spinner-32" />
                      <p className="app-builder-empty__p">Loading pages…</p>
                    </>
                  ) : (
                    <>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M12 9v6" /></svg>
                      <div className="app-builder-empty__center">
                        <h2 className="app-builder-empty__title">{pages.length === 0 ? "Start your first draft" : "Start a new draft or open a saved page"}</h2>
                        <p className="app-builder-empty__sub">{pages.length === 0 ? "Add a page goal in the left panel, then generate." : "Generate from the left panel or go to Library."}</p>
                        <div className="app-builder-empty__actions">
                          <Btn variant="primary" size="md" disabled={loading || (topicTouched && !topic.trim())}
                            onClick={() => void generate({ pageType: pendingPageTypeValue || pageTypeOptions[0] })}>
                            {loading ? "Working…" : "Generate draft"}
                          </Btn>
                          <Btn variant="ghost" size="md" onClick={() => navigate("/library")}>Browse Library</Btn>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {error && (
                <div className="app-error-banner">
                  <p className="app-error-banner__title">Generation failed</p>
                  <p className="app-error-banner__body">{error}</p>
                  <Btn variant="primary" size="sm" onClick={() => void generate({ pageType: pendingPageTypeValue || pageTypeOptions[0] })} disabled={loading} className="app-error-banner__retry">Retry generation</Btn>
                </div>
              )}
              {parseWarn && !error && (
                <div className="app-parse-warn"><p>Page was generated but some fields could not be parsed fully. Review the draft carefully.</p></div>
              )}
            </Card>
          </div>
        </div>

        {/* History overlay */}
        {historyPageId && (
          <div className="app-history-overlay" onClick={() => setHistoryPageId(null)}>
            <div className="app-history-backdrop" />
            <div className="app-history-drawer" onClick={e => e.stopPropagation()}>
              <div className="app-history-head">
                <span className="app-history-head__title">Version History</span>
                <button type="button" className="app-history-close" onClick={() => setHistoryPageId(null)}>×</button>
              </div>
              <div className="app-history-scroll">
                {historyLoading ? (<p className="app-history-p">Loading…</p>) : historyVersions.length === 0 ? (<p className="app-history-p">No versions saved yet.</p>) : historyVersions.map(v => (
                  <div key={v.id} className="app-history-card">
                    <div className="app-history-card__row">
                      <span className="app-history-card__v">v{v.versionNumber}</span>
                      <span className={`app-history-trigger${v.trigger === "generate" ? " app-history-trigger--generate" : v.trigger === "restore" ? " app-history-trigger--restore" : " app-history-trigger--other"}`}>{v.trigger}</span>
                      <span className="app-history-date">{new Date(v.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {v.notes && (<p className="app-history-notes">{v.notes}</p>)}
                    <Btn onClick={() => restoreVersion(historyPageId, v.id, v.versionNumber)} variant="ghost" size="sm">Restore this version</Btn>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Suspense>

      <DeleteConfirmationModal isOpen={showDeleteCurrentPageModal && !!selected}
        title="Delete this page?" message={selected ? `Remove "${clean(selected.name) || "Untitled"}" from your library?` : ""}
        onConfirm={handleConfirmDeleteCurrentPage}
        onCancel={() => !singlePageDeleteLoading && setShowDeleteCurrentPageModal(false)}
        isLoading={singlePageDeleteLoading} />
      <DeleteConfirmationModal isOpen={showRegenerateConfirmModal && !!selected}
        title="Regenerate page?" message="This replaces the current draft with a newly generated page."
        confirmLabel="Regenerate" confirmVariant="primary"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenerateConfirmModal(false)} />
    </div>
  );
}