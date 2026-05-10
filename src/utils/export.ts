import { formatVersionOrMonth, sanitizeFilename } from "./core";

export async function generateZip(files: Array<{ blob: Blob; filename: string }>): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const { blob, filename } of files) {
    const arrayBuffer = await blob.arrayBuffer();
    zip.file(filename, arrayBuffer);
  }
  return zip.generateAsync({ type: "blob" });
}

export async function renderPageAsPNG(
  page: { name: string; version?: string; created_at?: string; createdAt?: string },
  elementId: string
): Promise<{ blob: Blob; filename: string }> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Element not found");
  const { toBlob } = await import("html-to-image");
  const version = formatVersionOrMonth(page);
  const filename = `${sanitizeFilename(page.name)}_${version}.png`;
  const blob = await toBlob(element);
  if (!blob) throw new Error("Failed to render page as PNG");
  return { blob, filename };
}

export async function renderPageAsPDF(
  page: { name: string; version?: string; created_at?: string; createdAt?: string },
  elementId: string
): Promise<{ blob: Blob; filename: string }> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Element not found");
  const { toCanvas } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");
  const version = formatVersionOrMonth(page);
  const filename = `${sanitizeFilename(page.name)}_${version}.pdf`;
  const canvas = await toCanvas(element);
  if (canvas.width === 0 || canvas.height === 0) throw new Error("Element rendered to empty canvas");
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const imgWidth = 190;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
  const pdfArrayBuffer = pdf.output("arraybuffer");
  const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
  return { blob: pdfBlob, filename };
}
