# Screenshot Upload for Context

## What & Why
Add the ability to upload a screenshot image (from the user's local machine) that gets passed as visual context to the AI during page generation. This lets users show the AI what an existing page looks like, reference a design mockup, or provide visual examples alongside their text prompt — similar to how Google Drive documents already provide text context.

## Done looks like
- A new "Screenshot" upload area appears in the Builder sidebar (below the Context/notes field or near Reference Documents)
- User can click to browse or drag-and-drop an image file (PNG, JPG, WEBP)
- A small thumbnail preview shows the uploaded image with a remove button
- When generating a page, the screenshot is sent as a base64 image content block in the Anthropic API request (Claude's vision capability)
- The AI sees the screenshot and can reference it when producing the page draft
- Multiple screenshots can be uploaded per generation (up to 3)
- Screenshots are session-only (not persisted to the database)

## Out of scope
- Server-side image storage or database persistence
- Image editing or cropping
- Uploading non-image files through this mechanism (Drive integration already handles documents)
- Using screenshots during the Karl evaluation or structure-improvement passes

## Tasks
1. **File input UI in Builder sidebar** — Add a styled upload area with click-to-browse and drag-and-drop support, thumbnail preview grid, and remove button per image. Limit to 3 images, max 4MB each, PNG/JPG/WEBP only.

2. **Client-side base64 conversion** — Use FileReader to convert uploaded images to base64 data URLs, store them in component state as an array of `{ name, base64, mimeType }` objects.

3. **Pass images to the API** — Update the generate function to include the base64 images in the `/api/chat` request body as an `images` field.

4. **Server-side image injection** — Update the `/api/chat` endpoint in server.js to accept the `images` array and convert them into Anthropic vision-format content blocks (type: "image" with base64 source) appended to the user message. Increase the express JSON body limit to accommodate image payloads.

5. **Clear state after generation** — Reset the uploaded screenshots after a successful generation so the next generation starts clean.

## Relevant files
- `src/App.tsx:621-762`
- `src/App.tsx:900-1050`
- `server.js:169-222`
