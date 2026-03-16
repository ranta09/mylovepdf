/**
 * MagicDOCX Professional PDF → Excel Engine
 * Specialized in table extraction and structure preservation.
 */

import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import { 
  analyzePageStructure, 
  TableBlock 
} from "./documentProcessor";

export interface ExcelConversionOptions {
  outputFormat: "xlsx" | "csv";
  useOcr?: boolean;
  ocrLang?: string;
}

export async function convertPdfToExcel(
  file: File,
  options: ExcelConversionOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const wb = XLSX.utils.book_new();
  
  onProgress?.(5, "Analyzing document tables...");

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const layout = await analyzePageStructure(page);
    
    // Combine all tables on the page into one sheet or separate ones?
    // Following professional standards, we extract all tables and put them in one sheet per page
    const pageData: any[][] = [];
    
    // Sort tables by Y position
    const sortedTables = [...layout.tables].sort((a, b) => b.startY - a.startY);

    sortedTables.forEach((table, tableIdx) => {
      // Add a header if multiple tables
      if (sortedTables.length > 1) {
        pageData.push([`Table ${tableIdx + 1}`]);
      }

      table.rows.forEach(row => {
        const rowData = row.cells.map(cell => cleanCellValue(cell.text));
        pageData.push(rowData);
      });

      // Add a spacer row
      pageData.push([]);
    });

    if (pageData.length > 0) {
      const ws = XLSX.utils.aoa_to_sheet(pageData);
      
      // Auto-size columns
      const maxWidths = pageData[0] ? pageData[0].map((_, colIdx) => ({
        wch: Math.max(...pageData.map(row => String(row[colIdx] || "").length)) + 5
      })) : [];
      ws['!cols'] = maxWidths;

      XLSX.utils.book_append_sheet(wb, ws, `Page ${i}`);
    }

    onProgress?.(5 + Math.round((i / pdf.numPages) * 90), `Processing page ${i}...`);
  }

  let blob: Blob;
  if (options.outputFormat === "csv") {
    let csvContent = "";
    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      csvContent += XLSX.utils.sheet_to_csv(ws) + "\n\n";
    });
    blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  } else {
    const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    blob = new Blob([xlsxBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  onProgress?.(100, "Done");
  return blob;
}

function cleanCellValue(val: string): string | number {
  let clean = val.trim();
  if (!clean) return "";

  // Remove random line breaks
  clean = clean.replace(/\n+/g, " ");
  // Remove excessive spaces
  clean = clean.replace(/\s+/g, " ");

  // Simple numeric detection
  const numericTest = clean.replace(/[$,€,£]/g, "").replace(/,/g, "");
  if (numericTest && !isNaN(Number(numericTest)) && /^-?\d*\.?\d+$/.test(numericTest)) {
    return Number(numericTest);
  }

  return clean;
}
