import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { PDFDocument } from "pdf-lib";

export interface ExcelConversionOptions {
  pageOrientation?: "portrait" | "landscape" | "auto";
  pageSize?: "A4" | "letter" | "original";
  scaling?: "fit" | "actual";
  selectedSheets?: string[]; // Empty means all
  mergeFiles?: boolean;
}

export interface ExcelMetadata {
  sheetNames: string[];
  fileSize: number;
  fileName: string;
}

/**
 * Extracts metadata from an Excel file
 */
export async function getExcelMetadata(file: File): Promise<ExcelMetadata> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  return {
    sheetNames: workbook.SheetNames,
    fileSize: file.size,
    fileName: file.name
  };
}

/**
 * Converts an Excel file (specific sheets) to a PDF Blob
 */
export async function convertExcelToPdf(
  file: File,
  options: ExcelConversionOptions = {}
): Promise<Blob> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellStyles: true, cellDates: true, cellNF: true });
  
  const sheetsToConvert = options.selectedSheets && options.selectedSheets.length > 0
    ? options.selectedSheets
    : workbook.SheetNames;

  const container = document.createElement("div");
  container.className = "excel-conversion-container";
  container.style.backgroundColor = "white";
  container.style.color = "black";
  container.style.padding = "10mm";

  const style = document.createElement("style");
  style.textContent = `
    .excel-conversion-container {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      font-size: 9pt;
    }
    .sheet-section {
      page-break-after: always;
      margin-bottom: 20px;
    }
    .sheet-title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
      border-bottom: 2px solid #10b981;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #dee2e6;
      padding: 6px 8px;
      text-align: left;
      word-wrap: break-word;
      min-width: 40px;
    }
    th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    .cell-numeric { text-align: right; }
    .cell-date { text-align: center; }
  `;
  container.appendChild(style);

  for (const sheetName of sheetsToConvert) {
    const sheetSection = document.createElement("div");
    sheetSection.className = "sheet-section";
    
    if (sheetsToConvert.length > 1) {
      const title = document.createElement("h2");
      title.className = "sheet-title";
      title.innerText = sheetName;
      sheetSection.appendChild(title);
    }

    const worksheet = workbook.Sheets[sheetName];
    // Convert to HTML but we'll wrap it to ensure it matches our styles
    const htmlTable = XLSX.utils.sheet_to_html(worksheet, { editable: false });
    
    const tableWrapper = document.createElement("div");
    tableWrapper.innerHTML = htmlTable;
    
    // Find the actual table element from the generated HTML
    const table = tableWrapper.querySelector("table");
    if (table) {
      table.style.width = "100%";
      sheetSection.appendChild(table);
    }

    container.appendChild(sheetSection);
  }

  // Hidden document needed for html2pdf
  document.body.appendChild(container);

  const opt = {
    margin: 5,
    filename: file.name.replace(/\.[^/.]+$/, "") + ".pdf",
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      letterRendering: true
    },
    jsPDF: { 
      unit: "mm" as const, 
      format: (options.pageSize === "letter" ? "letter" : "a4") as any, 
      orientation: options.pageOrientation === "auto" ? "landscape" : (options.pageOrientation || "landscape")
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
    document.body.removeChild(container);
  }
}

/**
 * Merges multiple PDF Blobs
 */
export async function mergeExcelPdfs(blobs: Blob[]): Promise<Blob> {
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
