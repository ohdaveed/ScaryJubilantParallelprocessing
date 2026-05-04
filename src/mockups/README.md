# HHVC workspace mockups — React mapping

This folder documents how [hhvc-karl-mockups-spec.md](../../hhvc-karl-mockups-spec.md) maps onto the production app. Static HTML references live in [.superdesign/design_iterations/](../../.superdesign/design_iterations/).

## Current shell

[`SfGovContentDesignTool`](../components/SfGovContentDesignTool.tsx) provides:

- Workspace tabs (`tabs`, `activeTabId`, `onTabChange`)
- Left authoring column: audience, page type, goal, context, generate
- Center: `previewSlot`
- Right: `karlEvaluation` (Karl-style QA checklist)

[`App.tsx`](../App.tsx) wires `WORKSPACE_TABS`, `studioPageTypes()` (page type chips, now includes **Campaign** for leadership-directed pages such as mosquito workshops), and `buildKarlPanelView` for the QA panel.

## Target workspace variants (future implementation)

| Mockup screen | Suggested component | Primary props / notes |
|---------------|--------------------|------------------------|
| Topic | `TopicWorkspaceFields` | `hubTitle`, `summary`, `featuredPages`, `navGroups`, `relatedTopics` |
| Transaction | `TransactionWorkspaceFields` | `servicePromise`, `whatToKnow`, `whatToDo`, `routing`, `relatedPages`; preview task-first |
| Information | `InformationWorkspaceFields` | `sections[]`, `faqs?`, `relatedTransactions`, `sensitiveFlags[]` |
| Step by step | `StepByStepWorkspaceFields` | `stages[]` with `notes` vs `actions` styling |
| Campaign | `CampaignWorkspaceFields` | `hero`, `storySections`, `relatedServiceUrls` (required) |
| Resource Collection | `ResourceCollectionWorkspaceFields` | `groups[]` of `{ label, resources[] }` |
| Library | extend `LibraryTab` | filters: type, topic area, audience, verification; overlap column |
| Karl handoff | `KarlHandoffReview` | serialized blocks + copy buttons; PNG export secondary |

## Integration approach

1. Add `workspaceVariant: PageType` (or derive from `pendingPageType`) in `App.tsx`.
2. Replace fixed left-column fields in `SfGovContentDesignTool` with a render prop or `leftPanelSlot` so each variant supplies its own form.
3. Keep `karlEvaluation` shape; extend checks to include verification chips from the mockup spec (factual review states).

Until those components exist, use static HTML mockups for stakeholder review and the markdown spec for field semantics.
