import mammoth from "mammoth";
import html2pdf from "html2pdf.js";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export interface WordConversionOptions {
  pageOrientation?: "portrait" | "landscape";
  pageSize?: "A4" | "letter" | "original";
  mergeFiles?: boolean;
}

export interface ConversionMetadata {
  pageCount?: number;
  title?: string;
}

/**
 * Converts a Word document (.docx) to a PDF Blob using high-fidelity HTML rendering.
 */
export async function convertWordToPdf(
  file: File,
  options: WordConversionOptions = {}
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();

  // 1. Convert DOCX to structured HTML using mammoth
  // We use convertToHtml to preserve tables, lists, and basic formatting
  const result = await mammoth.convertToHtml({ arrayBuffer });
  let html = result.value;

  if (!html || html.trim().length === 0) {
    throw new Error("Could not extract content from Word document.");
  }

  // 2. Wrap HTML in a container with document-like styling
  const container = document.createElement("div");
  container.style.width = options.pageSize === "letter" ? "8.5in" : "210mm";
  container.style.padding = "20mm";
  container.style.margin = "0";
  container.style.backgroundColor = "white";
  container.style.color = "black";
  container.className = "word-conversion-container";

  // Add global styles for the document
  const style = document.createElement("style");
  style.textContent = `
    .word-conversion-container {
      font-family: 'Times New Roman', serif;
      line-height: 1.5;
      font-size: 11pt;
    }
    .word-conversion-container h1 { font-size: 24pt; margin-bottom: 0.5em; font-weight: bold; }
    .word-conversion-container h2 { font-size: 18pt; margin-top: 1em; margin-bottom: 0.5em; font-weight: bold; }
    .word-conversion-container h3 { font-size: 14pt; margin-top: 1em; margin-bottom: 0.5em; font-weight: bold; }
    .word-conversion-container p { margin-bottom: 1em; text-align: justify; }
    .word-conversion-container table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
    .word-conversion-container table, th, td { border: 1px solid #ccc; padding: 8px; }
    .word-conversion-container ul, .word-conversion-container ol { margin-bottom: 1em; padding-left: 2em; }
    .word-conversion-container img { max-width: 100%; height: auto; }
  `;
  container.innerHTML = html;
  container.prepend(style);

  // Hidden document needed for html2pdf to process styles correctly
  document.body.appendChild(container);

  // 3. Configure html2pdf options for professional output
  const opt = {
    margin: 0,
    filename: file.name.replace(/\.[^/.]+$/, "") + ".pdf",
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { 
      scale: 2, // Higher scale for print-ready resolution
      useCORS: true,
      letterRendering: true
    },
    jsPDF: { 
      unit: "mm" as const, 
      format: (options.pageSize === "letter" ? "letter" : "a4") as any, 
      orientation: options.pageOrientation || "portrait" 
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any }
  };

  try {
    const pdfBlob = await html2pdf()
      .from(container)
      .set(opt)
      .outputPdf("blob");
    
    return pdfBlob;
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

/**
 * Merges multiple PDF Blobs into a single PDF
 */
export async function mergePdfBlobs(blobs: Blob[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();
  
  for (const blob of blobs) {
    const pdfBytes = await blob.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([mergedPdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Extracts metadata (like page count) from a DOCX file by parsing its internal XML
 */
export async function getDocxMetadata(file: File): Promise<ConversionMetadata> {
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return {};
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Page count is usually in docProps/app.xml
    const appXml = await zip.file("docProps/app.xml")?.async("text");
    const coreXml = await zip.file("docProps/core.xml")?.async("text");
    
    let pageCount: number | undefined;
    let title: string | undefined;

    if (appXml) {
      const match = appXml.match(/<Pages>(\d+)<\/Pages>/);
      if (match) pageCount = parseInt(match[1]);
    }

    if (coreXml) {
      const match = coreXml.match(/<dc:title>([^<]+)<\/dc:title>/);
      if (match) title = match[1];
    }

    return { pageCount, title };
  } catch (err) {
    console.warn("Failed to extract DOCX metadata:", err);
    return {};
  }
}
