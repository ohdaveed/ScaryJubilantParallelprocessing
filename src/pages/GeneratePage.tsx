import React, { Suspense, lazy, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { USER_TYPES, GENERATABLE_PAGE_TYPES } from "../constants";
import { clean } from "../utils/core";
import { getExportReadiness } from "../utils/viewState";
import { Badge, Btn, Card, IssueResolutionPanel, ComponentChips, RelPanel, ProgressBar, DeleteConfirmationModal } from "../components/ui";
import { StreamRenderer } from "../components/StreamRenderer";
import { EvaluatingState } from "../components/EvaluatingState";
import { SuccessState } from "../components/SuccessState";
import { useGeneratePageActions } from "../hooks/useGeneratePageActions";
import { useNavigate } from "react-router-dom";
import { preferencesApi, pagesApi } from "../api";
import packageJson from "../../package.json";

const LazySfGovPagePreview = lazy(() => import("../components/SfGovPreview").then((m) => ({ default: m.SfGovPagePreview })));

export default function GeneratePage() {
  // REFACTORED: Moved clipboard/download/screenshot action logic into a dedicated hook for readability.
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
  const pageTypeOptions = useMemo(() => GENERATABLE_PAGE_TYPES, []);

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

  const { handleCopy, handleDownload } = useGeneratePageActions({
    selectedDraftText: selected?.draft,
    screenshotRef,
    setCopied
  });

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

  const refineInputRef = useRef<HTMLTextAreaElement>(null);
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

  const { managerApproved, standardsPass, karlBlockersCount, headerStatusText, readinessText, showKarlBlockers } = getExportReadiness(selected);
  const standardsExportBlocked = managerApproved && !standardsPass;

  const suggestedRefinePrompts = useMemo(() => {
    if (!selected) return [] as string[];
    const prompts: string[] = [];
    const firstFailed = selected.karlEvaluation?.failed?.[0];
    const firstWarning = selected.karlEvaluation?.warnings?.[0];
    const firstQualityReason = selected.qualityGate?.status === "review_required" ? selected.qualityGate.reasons[0] : undefined;

    if (firstFailed) {
      prompts.push(`Fix this Karl blocker: ${firstFailed}`);
    }
    if (firstWarning) {
      prompts.push(`Address this Karl warning: ${firstWarning}`);
    }
    if (firstQualityReason) {
      prompts.push(`Revise the page to pass this quality gate: ${firstQualityReason}`);
    }
    if (selected.enforcement) {
      prompts.push("Clarify enforcement boundaries so only verifiable conditions remain.");
    }
    if (selected.integration) {
      prompts.push("Align wording and section order with integration/CMS notes.");
    }

    if (prompts.length === 0) {
      prompts.push("Tighten this page for plain language and shorter action-first sections.");
    }

    return prompts.slice(0, 4);
  }, [selected]);

  const applySuggestedRefinePrompt = useCallback((prompt: string) => {
    setRefineInput(prompt);
    requestAnimationFrame(() => {
      refineInputRef.current?.focus();
      refineInputRef.current?.setSelectionRange(prompt.length, prompt.length);
    });
  }, [setRefineInput]);

  return (
    <div>
      <Suspense fallback={<Card className="app-card-pad--20-24"><p className="app-loading-p">Loading preview…</p></Card>}>
        <div className={["app-studio-generate", !showGenerateContextRail ? "app-studio-generate--no-rail" : ""].filter(Boolean).join(" ")}>
          {showGenerateContextRail ? (
            <div className="app-studio-generate__rail">
              {pendingPageType ? (
                <Card className="app-card-pad--18-20">
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
                <SuccessState
                  page={justGenerated}
                  onView={() => {
                    void openPageById(justGenerated.id);
                    setShowSuccess(false);
                  }}
                />
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
                      <p className="app-page-sub" style={{ marginTop: 8 }}>
                        <span style={{ fontWeight: 600 }}>Editing</span>{" "}
                        <span title={selected.id} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>
                          {selected.id}
                        </span>
                      </p>
                      <div
                        className={[
                          "app-page-status",
                          !managerApproved ? "app-page-status--needs-approval" : standardsPass ? "app-page-status--ready" : "app-page-status--blocked"
                        ].filter(Boolean).join(" ")}
                      >
                        <p className="app-page-status__kicker">{headerStatusText}</p>
                        <p className="app-page-status__line">{readinessText}</p>
                        {standardsExportBlocked && showKarlBlockers && (
                          <p className="app-page-status__meta">Karl blockers: {karlBlockersCount}</p>
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

                  <IssueResolutionPanel
                    evaluation={selected.karlEvaluation}
                    qualityGateReasons={selected.qualityGate?.status === "review_required" ? selected.qualityGate.reasons : []}
                    enforcementText={selected.enforcement}
                    integrationText={selected.integration}
                  />

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
                        <Btn variant="ghost" size="sm" disabled={true} title="Export preview is disabled for now">Download preview</Btn>
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

                  <ComponentChips components={selected.components} />
                  <RelPanel rel={selected.relationships} />

                  <div className="app-refine">
                    <p className="app-up-label app-up-label--mb8">Refine this page</p>
                    <p className="app-refine__hint">Describe a specific change and the agent will revise the page content.</p>
                    {suggestedRefinePrompts.length > 0 && (
                      <div className="app-refine__suggestions">
                        {suggestedRefinePrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            className="app-refine__chip"
                            onClick={() => applySuggestedRefinePrompt(prompt)}
                            disabled={loading}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="app-refine__row">
                      <textarea ref={refineInputRef} className="app-input app-textarea-refine" value={refineInput}
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
                        <h2 className="app-builder-empty__title">{pages.length === 0 ? "Start your first page" : "Choose a page from the Library"}</h2>
                        <p className="app-builder-empty__sub">
                          {pages.length === 0
                            ? "Create a page by entering a goal in the left panel, then generate."
                            : "Library is the home screen. Select a page there to edit and regenerate drafts here."}
                        </p>
                        <p className="app-builder-empty__hint">
                          {pages.length === 0
                            ? "Use the left panel to set user type, choose a page type, and enter a page goal."
                            : "This editor always operates on the currently selected Library page."}
                        </p>
                        {pages.length > 0 ? (
                          <div style={{ marginTop: 12 }}>
                            <Btn variant="primary" size="md" onClick={() => navigate("/library")}>
                              Open Library
                            </Btn>
                          </div>
                        ) : null}
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
        title="Regenerate page?" message="This creates a new version from the current inputs."
        confirmLabel="Regenerate" confirmVariant="primary"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenerateConfirmModal(false)} />
    </div>
  );
}