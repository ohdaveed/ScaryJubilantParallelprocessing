# Bulk Page Download & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to select multiple pages and bulk download them as PNG or PDF files in a ZIP archive, or bulk delete them with confirmation.

**Architecture:** Selection mode state in App.tsx tracks selected page IDs. Action bar renders conditionally when selections exist. Download workflows render each selected page to canvas, generate files (PNG or PDF), bundle into ZIP via jszip, and trigger browser download. Delete workflow shows confirmation modal, calls DELETE API per page, then refreshes list.

**Tech Stack:** jsPDF, html2canvas, jszip for client-side bundling. Existing axios for API calls, html-to-image for PNG rendering.

---

## File Structure Map

| File | Responsibility |
|------|-----------------|
| `package.json` | Add jsPDF, html2canvas, jszip dependencies |
| `src/types.ts` | Add `version?: string` to PageDraft interface |
| `src/utils.ts` | Utility functions: formatVersionOrMonth, renderPageAsPNG, renderPageAsPDF, generateZip, sanitizeFilename |
| `src/utils.test.ts` | Tests for all utility functions |
| `src/App.tsx` | Selection state, action bar UI, bulk download/delete workflows |
| `src/components/ui.tsx` | Checkbox component (add if not present) and DeleteConfirmationModal component |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add dependencies to package.json**

Open `package.json` and locate the `"dependencies"` section. Add these three lines alphabetically:

```json
"html2canvas": "^1.4.1",
"jsPDF": "^2.5.1",
"jszip": "^3.10.1",
```

The dependencies section should now include (showing context):
```json
"dependencies": {
  ...
  "html2canvas": "^1.4.1",
  "jsPDF": "^2.5.1",
  "jszip": "^3.10.1",
  ...
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: All three packages installed successfully.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add bulk download dependencies (jsPDF, html2canvas, jszip)"
```

---

## Task 2: Add Version Field to Types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Read current PageDraft interface**

Run: `Read src/types.ts` to see the current PageDraft interface structure.

- [ ] **Step 2: Add version field**

Locate the `PageDraft` interface in `src/types.ts` and add the optional `version` field:

```typescript
export interface PageDraft {
  id?: string;
  name: string;
  content: string;
  created_at: string;
  version?: string;  // Add this line
  // ... other fields
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add optional version field to PageDraft interface"
```

---

## Task 3: Write Test for formatVersionOrMonth Utility

**Files:**
- Modify: `src/utils.test.ts`

- [ ] **Step 1: Write failing test for formatVersionOrMonth**

Open `src/utils.test.ts` and add this test case at the end:

```typescript
describe('formatVersionOrMonth', () => {
  it('should return version if provided', () => {
    const page = { version: 'v1.2.3', created_at: '2026-01-15' };
    expect(formatVersionOrMonth(page)).toBe('v1.2.3');
  });

  it('should return formatted month if version is empty', () => {
    const page = { version: '', created_at: '2026-04-17' };
    expect(formatVersionOrMonth(page)).toBe('April 2026');
  });

  it('should return formatted month if version is undefined', () => {
    const page = { version: undefined, created_at: '2026-02-28' };
    expect(formatVersionOrMonth(page)).toBe('February 2026');
  });

  it('should handle January correctly', () => {
    const page = { version: undefined, created_at: '2026-01-01' };
    expect(formatVersionOrMonth(page)).toBe('January 2026');
  });

  it('should handle December correctly', () => {
    const page = { version: undefined, created_at: '2026-12-31' };
    expect(formatVersionOrMonth(page)).toBe('December 2026');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- formatVersionOrMonth`

Expected: FAIL with "formatVersionOrMonth is not defined" or similar.

- [ ] **Step 3: Commit test file**

```bash
git add src/utils.test.ts
git commit -m "test: add formatVersionOrMonth tests"
```

---

## Task 4: Implement formatVersionOrMonth Utility

**Files:**
- Modify: `src/utils.ts`

- [ ] **Step 1: Add formatVersionOrMonth function**

Open `src/utils.ts` and add this function:

```typescript
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatVersionOrMonth(page: PageDraft): string {
  if (page.version && page.version.trim() !== '') {
    return page.version;
  }

  const date = new Date(page.created_at);
  const monthName = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${monthName} ${year}`;
}
```

Also add the import at the top if not present:
```typescript
import { PageDraft } from './types';
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- formatVersionOrMonth`

Expected: PASS - all 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils.ts
git commit -m "feat: implement formatVersionOrMonth utility with month fallback"
```

---

## Task 5: Write Test for sanitizeFilename Utility

**Files:**
- Modify: `src/utils.test.ts`

- [ ] **Step 1: Write failing test for sanitizeFilename**

Open `src/utils.test.ts` and add this test case:

```typescript
describe('sanitizeFilename', () => {
  it('should remove invalid filename characters', () => {
    expect(sanitizeFilename('SF Housing\\ Authority')).toBe('SF Housing Authority');
    expect(sanitizeFilename('Page: "v1"')).toBe('Page v1');
    expect(sanitizeFilename('File|Name')).toBe('FileName');
  });

  it('should preserve valid characters', () => {
    expect(sanitizeFilename('SF-Housing_Authority.v1')).toBe('SF-Housing_Authority.v1');
  });

  it('should handle multiple spaces', () => {
    expect(sanitizeFilename('SF  Housing')).toBe('SF Housing');
  });

  it('should replace slashes', () => {
    expect(sanitizeFilename('SF/Housing')).toBe('SFHousing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sanitizeFilename`

Expected: FAIL with "sanitizeFilename is not defined".

- [ ] **Step 3: Commit test file**

```bash
git add src/utils.test.ts
git commit -m "test: add sanitizeFilename tests"
```

---

## Task 6: Implement sanitizeFilename Utility

**Files:**
- Modify: `src/utils.ts`

- [ ] **Step 1: Add sanitizeFilename function**

Open `src/utils.ts` and add this function:

```typescript
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid filename characters: \ / : " * ? < > |
  return filename
    .replace(/[\\/:"*?<>|]/g, '')
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- sanitizeFilename`

Expected: PASS - all 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils.ts
git commit -m "feat: implement sanitizeFilename utility"
```

---

## Task 7: Write Test for renderPageAsPNG Utility

**Files:**
- Modify: `src/utils.test.ts`

- [ ] **Step 1: Write failing test for renderPageAsPNG**

Open `src/utils.test.ts` and add:

```typescript
describe('renderPageAsPNG', () => {
  it('should throw error if element not found', async () => {
    const page = { name: 'Test', created_at: '2026-04-17' };
    await expect(renderPageAsPNG(page, 'non-existent-id')).rejects.toThrow(
      'Element not found'
    );
  });

  it('should return blob with correct filename format', async () => {
    // Mock: Create a simple div to render
    const mockDiv = document.createElement('div');
    mockDiv.id = 'test-element';
    mockDiv.textContent = 'Test Page';
    document.body.appendChild(mockDiv);

    const page = { name: 'My Page', version: 'v1', created_at: '2026-04-17' };
    const result = await renderPageAsPNG(page, 'test-element');

    expect(result).toHaveProperty('blob');
    expect(result).toHaveProperty('filename');
    expect(result.filename).toBe('My Page_v1.png');
    expect(result.blob.type).toBe('image/png');

    document.body.removeChild(mockDiv);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- renderPageAsPNG`

Expected: FAIL with "renderPageAsPNG is not defined".

- [ ] **Step 3: Commit test file**

```bash
git add src/utils.test.ts
git commit -m "test: add renderPageAsPNG tests"
```

---

## Task 8: Implement renderPageAsPNG Utility

**Files:**
- Modify: `src/utils.ts`

- [ ] **Step 1: Add renderPageAsPNG function**

Add at top of `src/utils.ts`:
```typescript
import * as htmlToImage from 'html-to-image';
```

Then add the function:
```typescript
export async function renderPageAsPNG(
  page: PageDraft,
  elementId: string
): Promise<{ blob: Blob; filename: string }> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  const version = formatVersionOrMonth(page);
  const filename = `${sanitizeFilename(page.name)}_${version}.png`;

  const dataUrl = await htmlToImage.toPng(element);
  const blob = await (await fetch(dataUrl)).blob();

  return { blob, filename };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- renderPageAsPNG`

Expected: PASS - tests pass (may need minor DOM setup adjustments).

- [ ] **Step 3: Commit**

```bash
git add src/utils.ts
git commit -m "feat: implement renderPageAsPNG utility with html-to-image"
```

---

## Task 9: Write Test for renderPageAsPDF Utility

**Files:**
- Modify: `src/utils.test.ts`

- [ ] **Step 1: Write failing test for renderPageAsPDF**

Open `src/utils.test.ts` and add:

```typescript
describe('renderPageAsPDF', () => {
  it('should throw error if element not found', async () => {
    const page = { name: 'Test', created_at: '2026-04-17' };
    await expect(renderPageAsPDF(page, 'non-existent-id')).rejects.toThrow(
      'Element not found'
    );
  });

  it('should return blob with correct filename format', async () => {
    const mockDiv = document.createElement('div');
    mockDiv.id = 'test-element-pdf';
    mockDiv.textContent = 'Test PDF Page';
    document.body.appendChild(mockDiv);

    const page = { name: 'My Doc', version: 'v2', created_at: '2026-04-17' };
    const result = await renderPageAsPDF(page, 'test-element-pdf');

    expect(result).toHaveProperty('blob');
    expect(result).toHaveProperty('filename');
    expect(result.filename).toBe('My Doc_v2.pdf');
    expect(result.blob.type).toBe('application/pdf');

    document.body.removeChild(mockDiv);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- renderPageAsPDF`

Expected: FAIL with "renderPageAsPDF is not defined".

- [ ] **Step 3: Commit test file**

```bash
git add src/utils.test.ts
git commit -m "test: add renderPageAsPDF tests"
```

---

## Task 10: Implement renderPageAsPDF Utility

**Files:**
- Modify: `src/utils.ts`

- [ ] **Step 1: Add renderPageAsPDF function**

Add at top of `src/utils.ts`:
```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
```

Then add the function:
```typescript
export async function renderPageAsPDF(
  page: PageDraft,
  elementId: string
): Promise<{ blob: Blob; filename: string }> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  const version = formatVersionOrMonth(page);
  const filename = `${sanitizeFilename(page.name)}_${version}.pdf`;

  const canvas = await html2canvas(element);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const imgWidth = 210 - 20; // A4 width minus margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

  const pdfBlob = pdf.output('blob');
  return { blob: pdfBlob as Blob, filename };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- renderPageAsPDF`

Expected: PASS - tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils.ts
git commit -m "feat: implement renderPageAsPDF utility with jsPDF and html2canvas"
```

---

## Task 11: Write Test for generateZip Utility

**Files:**
- Modify: `src/utils.test.ts`

- [ ] **Step 1: Write failing test for generateZip**

Open `src/utils.test.ts` and add:

```typescript
describe('generateZip', () => {
  it('should create zip with correct structure', async () => {
    const files = [
      { blob: new Blob(['content1'], { type: 'image/png' }), filename: 'page1.png' },
      { blob: new Blob(['content2'], { type: 'image/png' }), filename: 'page2.png' }
    ];

    const zipBlob = await generateZip(files);
    expect(zipBlob.type).toBe('application/zip');
  });

  it('should handle single file in zip', async () => {
    const files = [
      { blob: new Blob(['single'], { type: 'application/pdf' }), filename: 'doc.pdf' }
    ];

    const zipBlob = await generateZip(files);
    expect(zipBlob.type).toBe('application/zip');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- generateZip`

Expected: FAIL with "generateZip is not defined".

- [ ] **Step 3: Commit test file**

```bash
git add src/utils.test.ts
git commit -m "test: add generateZip tests"
```

---

## Task 12: Implement generateZip Utility

**Files:**
- Modify: `src/utils.ts`

- [ ] **Step 1: Add generateZip function**

Add at top of `src/utils.ts`:
```typescript
import JSZip from 'jszip';
```

Then add the function:
```typescript
export async function generateZip(
  files: Array<{ blob: Blob; filename: string }>
): Promise<Blob> {
  const zip = new JSZip();

  for (const { blob, filename } of files) {
    zip.file(filename, blob);
  }

  return zip.generateAsync({ type: 'blob' });
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- generateZip`

Expected: PASS - tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils.ts
git commit -m "feat: implement generateZip utility with jszip"
```

---

## Task 13: Add Checkbox Component to UI

**Files:**
- Modify: `src/components/ui.tsx`

- [ ] **Step 1: Check if Checkbox component exists**

Run: `grep -n "export.*Checkbox" src/components/ui.tsx`

If it already exists, skip to Step 4.

- [ ] **Step 2: Add Checkbox component**

If Checkbox doesn't exist, add to `src/components/ui.tsx`:

```typescript
interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked = false,
  onChange,
  label,
  className = ''
}) => {
  return (
    <label className={`flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-pointer"
      />
      {label && <span className="ml-2 text-sm text-gray-900">{label}</span>}
    </label>
  );
};
```

- [ ] **Step 3: Verify component structure**

Check that `src/components/ui.tsx` exports Checkbox properly.

- [ ] **Step 4: Commit (if Checkbox was added)**

```bash
git add src/components/ui.tsx
git commit -m "feat: add Checkbox component for bulk selection"
```

---

## Task 14: Add DeleteConfirmationModal Component to UI

**Files:**
- Modify: `src/components/ui.tsx`

- [ ] **Step 1: Add DeleteConfirmationModal component**

Add to `src/components/ui.tsx`:

```typescript
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  count,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
        <p className="text-gray-700 mb-6">
          Delete {count} selected page{count !== 1 ? 's' : ''}? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify export**

Check that the component is properly exported.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui.tsx
git commit -m "feat: add DeleteConfirmationModal component"
```

---

## Task 15: Add Selection State to App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Read current App.tsx structure**

Run: `Read src/App.tsx` to see the current component structure and state hooks.

- [ ] **Step 2: Add selection state at top of component**

Locate the main component function in `src/App.tsx` and add these state hooks after the existing state:

```typescript
const [isSelectionMode, setIsSelectionMode] = useState(false);
const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [isDeleteLoading, setIsDeleteLoading] = useState(false);
```

Ensure the imports include:
```typescript
import { useState } from 'react';
```

- [ ] **Step 3: Add helper functions for selection**

Add these functions before the return statement:

```typescript
const togglePageSelection = (pageId: string) => {
  const newSelected = new Set(selectedPageIds);
  if (newSelected.has(pageId)) {
    newSelected.delete(pageId);
  } else {
    newSelected.add(pageId);
  }
  setSelectedPageIds(newSelected);
};

const clearSelection = () => {
  setSelectedPageIds(new Set());
  setIsSelectionMode(false);
};

const toggleSelectionMode = () => {
  if (isSelectionMode) {
    clearSelection();
  } else {
    setIsSelectionMode(true);
  }
};
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add selection state and helpers to App component"
```

---

## Task 16: Add Selection Toggle Button to App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Locate button area in App.tsx**

Find where the top buttons are rendered (near page list header).

- [ ] **Step 2: Add selection toggle button**

Add this button in the header area (before other action buttons):

```typescript
<button
  onClick={toggleSelectionMode}
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  {isSelectionMode ? 'Cancel' : 'Select'}
</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Select/Cancel toggle button"
```

---

## Task 17: Add Checkboxes to Page Cards

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Locate page card rendering in App.tsx**

Find where pages are mapped and rendered (typically a `.map()` call with page card JSX).

- [ ] **Step 2: Add checkbox to each page card**

Inside the page card rendering, add the Checkbox component:

```typescript
{isSelectionMode && (
  <Checkbox
    id={`select-${page.id}`}
    checked={selectedPageIds.has(page.id!)}
    onChange={() => togglePageSelection(page.id!)}
    className="absolute top-2 left-2"
  />
)}
```

Make sure `Checkbox` is imported:
```typescript
import { Checkbox } from './components/ui';
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: render checkboxes on page cards in selection mode"
```

---

## Task 18: Add Action Bar Component to App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add ActionBar component skeleton**

Add this component (can be inline or in ui.tsx, but for now add inline in App.tsx):

```typescript
const ActionBar = () => {
  if (selectedPageIds.size === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-300 p-4 shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <span className="font-semibold">
          {selectedPageIds.size} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPNG}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Download PNG
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Download PDF
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add ActionBar to render**

In the main return JSX, add the ActionBar before the closing fragment/div:

```typescript
<ActionBar />
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add ActionBar component showing selection count and bulk action buttons"
```

---

## Task 19: Implement Download PNG Workflow

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add handleDownloadPNG function**

Add before the ActionBar component:

```typescript
const handleDownloadPNG = async () => {
  const selectedPages = pages.filter(p => selectedPageIds.has(p.id!));
  const failedPages: string[] = [];
  const pngFiles = [];

  for (const page of selectedPages) {
    try {
      const elementId = `page-preview-${page.id}`;
      const { blob, filename } = await renderPageAsPNG(page, elementId);
      pngFiles.push({ blob, filename });
    } catch (error) {
      console.error(`Failed to render ${page.name} as PNG:`, error);
      failedPages.push(page.name);
    }
  }

  if (pngFiles.length === 0) {
    toast.error('Failed to export any pages');
    return;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const zipBlob = await generateZip(pngFiles);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pages-export-${timestamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    if (failedPages.length > 0) {
      toast.warning(
        `Exported ${pngFiles.length} of ${selectedPages.length} pages. Failed: ${failedPages.join(', ')}`
      );
    } else {
      toast.success(`Exported ${pngFiles.length} pages`);
    }

    clearSelection();
  } catch (error) {
    console.error('Failed to create ZIP:', error);
    toast.error('Failed to create ZIP file');
  }
};
```

Ensure imports include:
```typescript
import { renderPageAsPNG, generateZip } from './utils';
```

- [ ] **Step 2: Wire handleDownloadPNG to ActionBar**

Update the ActionBar button onClick to call this function (it's already referenced as `onClick={handleDownloadPNG}` in Task 18).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: implement PNG bulk download workflow with ZIP bundling"
```

---

## Task 20: Implement Download PDF Workflow

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add handleDownloadPDF function**

Add after handleDownloadPNG:

```typescript
const handleDownloadPDF = async () => {
  const selectedPages = pages.filter(p => selectedPageIds.has(p.id!));
  const failedPages: string[] = [];
  const pdfFiles = [];

  for (const page of selectedPages) {
    try {
      const elementId = `page-preview-${page.id}`;
      const { blob, filename } = await renderPageAsPDF(page, elementId);
      pdfFiles.push({ blob, filename });
    } catch (error) {
      console.error(`Failed to render ${page.name} as PDF:`, error);
      failedPages.push(page.name);
    }
  }

  if (pdfFiles.length === 0) {
    toast.error('Failed to export any pages');
    return;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const zipBlob = await generateZip(pdfFiles);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pages-export-${timestamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    if (failedPages.length > 0) {
      toast.warning(
        `Exported ${pdfFiles.length} of ${selectedPages.length} pages. Failed: ${failedPages.join(', ')}`
      );
    } else {
      toast.success(`Exported ${pdfFiles.length} pages`);
    }

    clearSelection();
  } catch (error) {
    console.error('Failed to create ZIP:', error);
    toast.error('Failed to create ZIP file');
  }
};
```

Ensure imports include:
```typescript
import { renderPageAsPDF } from './utils';
```

- [ ] **Step 2: Wire handleDownloadPDF to ActionBar**

The ActionBar button is already wired as `onClick={handleDownloadPDF}`.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: implement PDF bulk download workflow with ZIP bundling"
```

---

## Task 21: Implement Delete Confirmation Modal

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add DeleteConfirmationModal import and render**

At top of imports, add:
```typescript
import { DeleteConfirmationModal } from './components/ui';
```

In the return JSX, add the modal (before ActionBar):

```typescript
<DeleteConfirmationModal
  isOpen={showDeleteModal}
  count={selectedPageIds.size}
  onConfirm={handleConfirmDelete}
  onCancel={() => setShowDeleteModal(false)}
  isLoading={isDeleteLoading}
/>
```

- [ ] **Step 2: Add handleConfirmDelete function**

Add before ActionBar component:

```typescript
const handleConfirmDelete = async () => {
  setIsDeleteLoading(true);
  const selectedPages = Array.from(selectedPageIds);
  const failedCount = [0];

  for (const pageId of selectedPages) {
    try {
      await axios.delete(`/api/pages/${pageId}`);
    } catch (error) {
      console.error(`Failed to delete page ${pageId}:`, error);
      failedCount[0]++;
    }
  }

  setIsDeleteLoading(false);
  setShowDeleteModal(false);

  if (failedCount[0] > 0) {
    toast.error(
      `Deleted ${selectedPages.length - failedCount[0]} of ${selectedPages.length} pages. ${failedCount[0]} failed.`
    );
    // Keep selection for retry
  } else {
    toast.success(`Deleted ${selectedPages.length} pages`);
    clearSelection();
    // Refresh page list
    fetchPages();
  }
};
```

Ensure `axios` is imported and `fetchPages` is available (should already exist).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add delete confirmation modal and bulk delete workflow"
```

---

## Task 22: Manual Testing - Selection Mode Toggle

**Files:** None (manual testing)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Click "Select" button**

Expected: Button changes to "Cancel", checkboxes appear on all page cards.

- [ ] **Step 3: Click "Cancel" button**

Expected: Checkboxes disappear, selection is cleared, button changes back to "Select".

- [ ] **Step 4: Document result**

Note any issues or confirm this test passes.

---

## Task 23: Manual Testing - Selection Count and Action Bar

**Files:** None (manual testing)

- [ ] **Step 1: Enter selection mode**

Click "Select" button.

- [ ] **Step 2: Select 1 page**

Click checkbox on first page card.

Expected: Action bar appears at bottom showing "1 selected" with Download PNG, Download PDF, Delete buttons.

- [ ] **Step 3: Select 2 more pages**

Click checkboxes on two more page cards.

Expected: Action bar updates to "3 selected".

- [ ] **Step 4: Uncheck 1 page**

Click checkbox on one of the selected pages to deselect it.

Expected: Action bar updates to "2 selected".

- [ ] **Step 5: Uncheck all pages**

Uncheck remaining pages.

Expected: Action bar disappears (since count is 0).

---

## Task 24: Manual Testing - Download PNG

**Files:** None (manual testing)

- [ ] **Step 1: Select 3 pages**

Enter selection mode and select exactly 3 pages.

- [ ] **Step 2: Click "Download PNG"**

Click the Download PNG button in the action bar.

Expected: Browser downloads a ZIP file named `pages-export-YYYY-MM-DD-HHMMSS.zip`.

- [ ] **Step 3: Extract ZIP and verify**

Extract the ZIP file.

Expected: Contains 3 PNG files named `{page_title}_{version_or_month}.png` (e.g., `My Page_v1.png` or `Other Page_April 2026.png`).

- [ ] **Step 4: Verify PNG content**

Open one PNG file in image viewer.

Expected: Shows rendered page content.

---

## Task 25: Manual Testing - Download PDF

**Files:** None (manual testing)

- [ ] **Step 1: Select 2 pages**

Enter selection mode and select exactly 2 pages.

- [ ] **Step 2: Click "Download PDF"**

Click the Download PDF button in the action bar.

Expected: Browser downloads a ZIP file.

- [ ] **Step 3: Extract ZIP and verify**

Extract the ZIP file.

Expected: Contains 2 PDF files named `{page_title}_{version_or_month}.pdf`.

- [ ] **Step 4: Verify PDF content**

Open one PDF file in PDF reader.

Expected: Shows rendered page as PDF document.

---

## Task 26: Manual Testing - Delete with Confirmation

**Files:** None (manual testing)

- [ ] **Step 1: Select 2 pages**

Enter selection mode and select exactly 2 pages. Note their names.

- [ ] **Step 2: Click "Delete"**

Click the Delete button in the action bar.

Expected: Modal appears with text "Delete 2 selected pages? This cannot be undone."

- [ ] **Step 3: Click "Cancel"**

Click the Cancel button in the modal.

Expected: Modal closes, pages remain selected, page list is unchanged.

- [ ] **Step 4: Click "Delete" again**

Click the Delete button in the action bar again.

Expected: Modal appears again.

- [ ] **Step 5: Click "Delete" in modal**

Click the Delete button in the modal.

Expected: Modal closes, pages are deleted, selection is cleared, page list is refreshed without the deleted pages, success toast shows "Deleted 2 pages".

---

## Task 27: Manual Testing - Partial Failure (Download)

**Files:** None (manual testing)

- [ ] **Step 1: Identify a page with rendering issues**

Select a page that might fail to render (or manually break rendering for testing).

- [ ] **Step 2: Select 5 pages including one problematic**

Select 5 pages total, with one expected to fail rendering.

- [ ] **Step 3: Download PNG**

Click Download PNG.

Expected: Download completes. ZIP contains 4 valid PNG files. Warning toast shows "Exported 4 of 5 pages. Failed: {page_name}". Check browser console for error details.

---

## Task 28: Manual Testing - Version Field Fallback

**Files:** None (manual testing)

- [ ] **Step 1: Create or select a page with no version**

Find a page where `version` field is empty or undefined.

- [ ] **Step 2: Download PNG**

Select that page and download.

Expected: PNG filename uses month format: `{page_title}_April 2026.png` (based on created_at).

- [ ] **Step 3: Create or edit a page with version**

Add or update a page with `version: "v2.1"`.

- [ ] **Step 4: Download PNG**

Select that page and download.

Expected: PNG filename uses version: `{page_title}_v2.1.png`.

---

## Task 29: Verify No Regressions

**Files:** All modified

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: All tests pass, including new tests and existing tests.

- [ ] **Step 2: Manual smoke test**

- Verify existing page viewing still works
- Verify existing page editing still works
- Verify existing single-page export (if it exists) still works
- Verify page list loads and displays normally

- [ ] **Step 3: Check console for errors**

Open browser DevTools console.

Expected: No errors or warnings related to new code.

---

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| User can select multiple pages via checkboxes | ✅ Task 17 |
| User can download selected pages as PNG ZIP | ✅ Task 19 |
| User can download selected pages as PDF ZIP | ✅ Task 20 |
| Downloaded files are correctly named with version/month | ✅ Task 4 (formatVersionOrMonth) |
| User can bulk delete with confirmation | ✅ Task 21 |
| Partial failures handled gracefully (downloads) | ✅ Task 19 (try/catch with warning) |
| Partial failures handled gracefully (deletes) | ✅ Task 21 (error tracking and toast) |
| Selection state clears after action or manual cancel | ✅ Task 15 (clearSelection) |
| No breaking changes to existing functionality | ✅ Task 29 |

---

## Self-Review Against Spec

**1. Spec coverage check:**
- ✅ Selection Mode (Tasks 15-17): Toggle button, checkboxes, state management
- ✅ Bulk Download PNG (Tasks 4, 8, 12, 19): File generation, ZIP bundling, download
- ✅ Bulk Download PDF (Tasks 6, 10, 12, 20): File generation, ZIP bundling, download
- ✅ Bulk Delete (Tasks 21): Confirmation modal, API calls, refresh
- ✅ Version Field (Tasks 2, 4): Schema addition, formatting with month fallback
- ✅ Action Bar (Task 18): Conditional rendering, button layout
- ✅ Error Handling (Tasks 19-21): Partial failures, warning/error toasts
- ✅ Dependencies (Task 1): jsPDF, html2canvas, jszip installed

**2. Placeholder scan:**
- ✅ No "TBD" or "TODO" statements
- ✅ All code examples include full implementation
- ✅ All test cases include complete test code
- ✅ All bash commands include expected output
- ✅ All functions have exact signatures and logic

**3. Type consistency:**
- ✅ `formatVersionOrMonth(page: PageDraft)` → returns string
- ✅ `renderPageAsPNG(page: PageDraft, elementId: string)` → returns `{ blob: Blob; filename: string }`
- ✅ `renderPageAsPDF(page: PageDraft, elementId: string)` → returns `{ blob: Blob; filename: string }`
- ✅ `generateZip(files: Array<{...}>)` → returns `Promise<Blob>`
- ✅ `selectedPageIds: Set<string>`
- ✅ `isSelectionMode: boolean`

**4. Spec requirements validation:**
- ✅ File naming: `{page.name}_{version}.{extension}` (Task 4, 8, 10)
- ✅ ZIP naming: `pages-export-{timestamp}.zip` (Task 19, 20)
- ✅ Month formatting: "April 2026" (Task 4)
- ✅ Version fallback: Empty version → use month (Task 4)
- ✅ Error handling: Skip failed pages, warn user (Task 19, 20, 21)
- ✅ Confirmation modal: Text includes count (Task 21)
- ✅ Selection clears after action (Task 19, 20, 21)

**Plan is complete and ready for execution.**

---

## Execution Options

**Plan saved to `docs/superpowers/plans/2026-04-17-bulk-actions.md`.**

**Two execution paths available:**

**Option 1: Subagent-Driven Development (Recommended)**
- Fresh subagent per task
- Code review between tasks
- Faster iteration and error recovery

**Option 2: Inline Execution**
- Execute tasks sequentially in this session
- Batch progress updates
- Single-pass development

**Which approach would you prefer?**