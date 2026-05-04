# Generate Workspace Editorial Redesign Design

**Date:** 2026-05-03

**Status:** Drafted for review

## Goal

Redesign the `Generate` workspace shell so it feels like a serious SF.gov editorial publishing desk rather than a generic split-pane app, while preserving the current React structure, behaviors, and generation workflow.

The new shell should make the left side feel like a focused authoring rail and the right side feel like a live civic publishing surface, with visual cues drawn from SF’s design system color guidance and a stronger editorial workbench treatment in the preview area.

## Problem

The current `Generate` workspace is functional but visually reads as an application scaffold rather than an intentional publishing tool:

- the dark shell and light preview split is present, but the contrast is mostly cosmetic
- the top bar behaves like generic product navigation instead of a newsroom control strip
- the left rail works, but its hierarchy is flat and its sections do not feel sequenced
- the preview pane feels like a browser mock or content container instead of a document review surface
- status elements such as Karl connection and evaluation feedback appear as ordinary UI cards rather than publishing notes or proofing cues

This weakens the product’s identity. The app is supposed to help people produce SF.gov content. The interface should feel closer to editing and reviewing public-facing material than filling out a neutral workflow form.

## User Requirements

- Redesign the full `Generate` workspace shell
- Make the preview pane feel like a real SF.gov editing surface
- Use the SF design palette recommendation as the color basis
- Keep the left authoring rail dark and make the preview/editorial surface light
- Push the preview toward a stronger editorial workbench feel rather than a mild polish pass
- Preserve the existing product structure and interaction model unless a change directly improves the shell
- Maintain responsive usability on mobile and tablet

## Non-Goals

- Rebuilding the generation flow or changing the AI orchestration
- Changing page content formats or parser behavior
- Redesigning unrelated tabs beyond what is needed for shell consistency
- Introducing a brand-new component library or CSS framework
- Turning the preview into a fake newspaper theme disconnected from SF.gov

## Recommended Approach

Use an **editorial civic workbench** direction:

- a Slate-led production rail on the left for input, control, and evaluation
- a warm, paper-toned proofing surface on the right for reviewing generated content
- a newsroom-style top bar with restrained production utility cues
- visible document-review signals in the preview such as folios, margin rules, pinned notes, and proofing marks
- SF Design System palette discipline for structural colors, with limited secondary-palette accents for editorial markers and status cues

This approach gives the workspace a stronger identity without requiring a major structural rewrite. It preserves the current shell composition but changes how each area is framed and understood.

## Design Direction

### 1. Overall Experience

The shell should read as two modes of attention:

- **left:** authoring and control
- **right:** review and publication

The user should feel that they are preparing content on the left and reviewing a proof on the right.

The dominant emotional reference is:

- civic
- editorial
- credible
- calm
- precise

The design should not feel playful, startup-like, or ornamental for its own sake.

### 2. Color System

The redesign should use the current SF Design System color guidance as its base.

Core palette roles:

- **Slate L4 `#002B48`** for primary text and dark structural surfaces
- **Slate L2 `#5A7A92`** for secondary text and hierarchy
- **Action blue `#495ED4`** for primary actions and interactive emphasis
- **White `#FFFFFF`** for text on dark fields and key light surfaces where needed

Use the broader SF secondary palette only sparingly:

- review-note accents
- proofing cues
- Karl/evaluation states
- section emphasis

The shell should not drift into a custom unrelated palette. It should feel recognizably grounded in SF visual language.

### 3. Top Bar

The top bar should feel like a production strip rather than generic navigation.

Changes:

- make the active `Generate` tab more deliberate and anchored
- reduce the feeling of evenly weighted nav items
- keep the version badge and production utilities visible but clearly secondary
- maintain a compact institutional brand block
- use typography and spacing that feel more editorial than app-default

The top bar should support the workspace, not compete with it.

### 4. Left Authoring Rail

The left rail should become a stacked authoring desk with clearer sequencing.

Section order remains:

1. Context
2. Prompt
3. Karl Evaluation
4. Library

But each section should feel more intentional through:

- stronger section framing
- clearer labels
- more disciplined spacing
- slightly richer surface contrast
- more tactile form fields
- a stronger single primary action state for the generate button

The rail should feel denser and more focused, but not cramped.

### 5. Preview Surface

The preview is the centerpiece of the redesign.

It should move from “browser mock with content inside” to “document workbench.”

Key cues:

- warm, paper-toned main surface
- clearer page framing
- stronger editorial headline hierarchy
- document chrome that feels like a proofing board instead of a browser tab
- restrained folio or slug text
- subtle margin rails or guide lines
- pinned or annotated note behavior for status and guidance
- proofing-style review elements for active editorial feedback

The preview must still look like an SF.gov content review environment, not a novelty newspaper. The editorial language should serve credibility and review clarity.

### 6. Status, Review, And Evaluation Cues

Karl connection, evaluation, and related review states should feel attached to the editorial process.

Use cases:

- Karl connection banner
- loading states
- evaluation summaries
- draft review hints

These should be treated like review notes or production markers rather than neutral app widgets. They can be pinned, framed, or positioned as attached commentary, as long as they remain readable and accessible.

### 7. Motion

Motion should be restrained and structural.

Appropriate motion:

- subtle hover lift on primary controls
- slight state transitions for selected tabs and inputs
- gentle sheet entrance or fade on preview area
- quiet stagger for note-like elements

Avoid:

- decorative looping animations
- exaggerated parallax
- flashy transitions that conflict with the civic tone

### 8. Responsive Behavior

The desktop concept must survive on smaller screens without forcing the split layout.

Rules:

- on small screens, stack authoring first and preview second
- keep the top bar compact and readable
- allow the tab row to scroll if necessary
- preserve the editorial framing of the preview even when stacked
- remove or simplify non-essential preview chrome on mobile before sacrificing readability

The mobile shell should still feel like the same product, not a fallback layout.

## Implementation Scope

Primary edit target:

- `src/components/SfGovContentDesignTool.css`

Possible secondary edit target:

- `src/components/SfGovContentDesignTool.tsx`

Secondary edits should happen only if the current markup prevents the intended shell language. Prefer preserving structure and changing styling first.

No change is required to:

- generation logic
- preview rendering logic
- page parsing
- backend routes

## Acceptance Criteria

The redesign is successful if:

- the `Generate` shell feels intentionally designed for publishing work
- the left rail reads as a focused production desk
- the right pane reads as a document-review surface
- the shell clearly uses SF-recommended colors as its foundation
- the preview feels more editorial and more specific to SF.gov content review
- desktop, tablet, and mobile layouts remain usable
- the redesign does not require changes to core application behavior

## Risks

### 1. Over-theming

If the editorial language becomes too literal, the preview could feel theatrical instead of credible.

Mitigation:

- keep the typography and proofing cues restrained
- use editorial references as structure, not costume

### 2. Palette Drift

Using too many secondary colors could weaken SF palette discipline.

Mitigation:

- keep Slate, White, and Action blue as the primary visual backbone
- reserve secondary colors for sparse accents and statuses only

### 3. Reduced Usability From Decoration

Extra cues such as folios, stamps, or pinned notes could clutter the preview.

Mitigation:

- keep every visual cue tied to hierarchy, status, or review context
- remove decorative elements that do not improve comprehension

### 4. Mobile Regression

A more layered desktop surface can break down on smaller screens if not simplified.

Mitigation:

- keep the responsive stacking model
- simplify preview chrome aggressively on narrow widths

## Recommended Next Step

Create a focused implementation plan for the shell redesign, centered on:

- palette/token revision inside the scoped component CSS
- top bar restyling
- left rail hierarchy refinement
- preview workbench redesign
- responsive cleanup and re-verification
