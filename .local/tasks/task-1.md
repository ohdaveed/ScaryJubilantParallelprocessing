---
title: Fix app structure and get it running
---
# Fix App Structure and Get It Running

## What & Why

The app is currently broken and cannot run at all. The single `index.ts` file is a concatenation of two separate code blocks with broken imports — it imports from modules (`./types`, `./constants`, `./utils`, `./components/ui`, `../constants`, `../utils`) that do not exist anywhere in the project. The app is also configured to run as a Deno script, but it contains React JSX which requires a bundler. Additionally, the Anthropic API call is missing authentication headers, and there is no workflow configured to serve the app.

## Done looks like

- The app loads and renders in the preview pane with three tabs: Page builder, System map, Library
- Clicking "Generate page" triggers a real streaming call to the Anthropic API
- Generated pages appear in the Library and System map
- The todo list in the System map tab persists across page reloads

## Out of scope

- Redesigning the UI or changing any functionality
- Adding new features beyond what already exists in the code

## Tasks

1. **Set up React + Vite project** — Create `package.json`, `vite.config.ts`, and `index.html`. Install React, ReactDOM, and Vite with TypeScript support. Update `.replit` to run the Vite dev server on port 5000 and configure a workflow.

2. **Create the source file structure** — Create `src/types.ts`, `src/constants.ts`, `src/utils.ts`, `src/components/ui.tsx`, and `src/App.tsx` using the correct code from `conversation.md`. Each file must have the right relative imports so they resolve correctly.

3. **Add a backend API proxy** — Create a small Express/Node server (`server.js`) that proxies requests to the Anthropic API, injecting the `ANTHROPIC_API_KEY` secret server-side. Update the frontend `generate` function to call `/api/chat` (the local proxy) instead of `https://api.anthropic.com` directly, so the key is never exposed in the browser.

4. **Request the ANTHROPIC_API_KEY secret** — If not already set, prompt the user to provide their Anthropic API key so generation works.

5. **Fix the `renderLines` logic bug** — In `src/App.tsx`, the `renderLines` function uses `cleaned.indexOf(l)` to look up the original line, which finds the first occurrence and breaks for duplicate lines. Fix it by iterating with index instead.

## Relevant files

- `index.ts`
- `conversation.md:1-1139`
- `.replit`
- `replit.nix`