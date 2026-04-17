---
title: Google Drive corrective actions
---
# Google Drive Corrective Actions

## What & Why
Connect the app to a specific Google Drive folder (`1SrKB78oWGHhILjQxS7R-ZqCXkzuAlvKi`) that contains HHVC reference documents, templates, and regulatory content. The app will read those files and use them as source material when generating corrective action notices and page content — so Claude has accurate, department-approved language rather than making it up.

## Done looks like
- The app can list and read documents from the specified Google Drive folder
- A new "Corrective Actions" section (or tab) appears in the Builder where users can pick a Drive document as context
- When generating a page, selected Drive documents are passed as additional context to Claude so the output uses the department's own language and requirements
- Generated corrective action content can be saved to the Library like any other page
- The Drive connection is wired through the secure server-side Express proxy (API key + Drive tokens never exposed to the browser)

## Out of scope
- Editing or writing files back to Google Drive
- Accessing other Drive folders or the user's full Drive (only the one specified folder)
- Real-time sync / webhooks on Drive changes

## Tasks
1. **Wire Google Drive integration on the server** — Add the Google Drive connection to the project, install the Drive API package (`googleapis`), and create a server-side module that authenticates using Replit's connector token and exposes helper functions for listing and reading files from the specified folder ID.

2. **Add Drive API endpoints** — Create two Express endpoints: `GET /api/drive/files` (list documents in the folder) and `GET /api/drive/files/:fileId` (fetch a document's text content). Google Docs should be exported as plain text; other formats (PDF, DOCX) should be handled gracefully.

3. **Corrective Actions UI** — Add a collapsible "Reference documents" panel in the Builder tab. It shows the list of Drive files; the user can check one or more to include as context. Selected document content is fetched from the server and injected into the Claude generation request as additional context before the user's topic and user type.

4. **Update system prompt context injection** — Modify the `/api/chat` endpoint to accept an optional `driveContext` field in the request body. When present, prepend the Drive document text to the messages so Claude generates corrective action language grounded in the actual department documents.

## Relevant files
- `server.js`
- `src/App.tsx`
- `src/types.ts`
- `src/utils.ts`
- `src/constants.ts`