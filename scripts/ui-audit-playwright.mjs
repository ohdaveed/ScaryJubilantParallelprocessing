/**
 * Full-page screenshots for UI review. Run with dev server: npm run dev
 * Usage: node scripts/ui-audit-playwright.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, ".playwright-ui-audit");

const url = process.env.UI_AUDIT_URL || "http://localhost:5000/";

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "desktop-1440", width: 1440, height: 900 },
    { name: "laptop-1280", width: 1280, height: 800 },
    { name: "tablet-900", width: 900, height: 1024 }
  ];

  const report = { url, shots: [], layout: null };

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(800);
    const path = join(outDir, `generate-${vp.name}.png`);
    await page.screenshot({ path, fullPage: true });
    report.shots.push({ ...vp, path });
    await page.close();
  }

  // Desktop: bounding boxes for main regions
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  report.layout = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
    };
    return {
      authoringRail: pick(".authoring-rail"),
      previewWorkbench: pick(".preview-workbench"),
      previewSheet: pick(".preview-sheet-frame"),
      studioGenerate: pick(".app-studio-generate"),
      studioMain: pick(".app-studio-generate__main"),
      studioRail: pick(".app-studio-generate__rail")
    };
  });
  await browser.close();

  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("Wrote screenshots and report to", outDir);
  console.log(JSON.stringify(report.layout, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
