/**
 * MagicDOCX – Production-grade PDF → Excel Engine
 * Multi-stage: Extract → Cluster → Detect Tables → Type → Generate XLSX
 */

import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import type { TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";
import { runOcrOnCanvas } from "./ocrEngine";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RawElement {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
}

interface GridRow {
  y: number;
  cells: string[];  // indexed by column bucket
  rawElements: RawElement[];
}

interface DetectedTable {
  colBuckets: number[];   // sorted X start positions of each column
  rows: GridRow[];
  pageStart: number;
  pageEnd: number;
}

type CellValue = string | number | Date;

export interface ExcelConversionOptions {
  outputFormat: "xlsx" | "csv";
  useOcr?: boolean;
  ocrLang?: string;
  multiTableMode?: "separate_sheets" | "same_sheet";
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LINE_Y_TOLERANCE = 3;       // px, elements within this Y delta are on the same line
const COL_GAP_MIN_FACTOR = 1.8;  // minimum gap to qualify as a column separator (× avg char width)
const MIN_TABLE_ROWS = 2;         // minimum rows to recognise a table
const MIN_TABLE_COLS = 2;         // minimum columns to recognise a table
const COL_BUCKET_TOLERANCE = 8;   // px, two X positions within this are same column

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry
// ─────────────────────────────────────────────────────────────────────────────

export async function convertPdfToExcel(
  file: File,
  options: ExcelConversionOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const wb = XLSX.utils.book_new();

  onProgress?.(5, "Analyzing document structure…");

  // Collect all tables across all pages (enables multi-page table continuation)
  const allPageElements: RawElement[][] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress?.(
      5 + Math.round(((p - 1) / pdf.numPages) * 50),
      `Extracting page ${p} of ${pdf.numPages}…`
    );

    const page = await pdf.getPage(p);

    let elements: RawElement[];
    if (options.useOcr) {
      elements = await extractViaOcr(page, options.ocrLang || "eng");
    } else {
      elements = extractElements(page, await page.getTextContent());
    }

    allPageElements.push(elements);
  }

  onProgress?.(55, "Detecting tables…");

  // Detect tables per-page, then try to merge multi-page continuations
  const allTables: DetectedTable[] = [];

  for (let p = 0; p < allPageElements.length; p++) {
    const pageTables = detectTablesOnPage(allPageElements[p], p + 1);
    allTables.push(...pageTables);
  }

  // Merge consecutive tables that share the same column structure (multi-page)
  const mergedTables = mergeMultiPageTables(allTables);

  onProgress?.(75, "Building spreadsheet…");

  if (mergedTables.length === 0) {
    // Fallback: structured text extraction (no tables found)
    const ws = buildFallbackSheet(allPageElements);
    XLSX.utils.book_append_sheet(wb, ws, "Extracted Data");
  } else {
    // Build one sheet per table (up to 30 tables; Excel max is 255 sheet names)
    mergedTables.slice(0, 30).forEach((table, idx) => {
      const sheetName = buildSheetName(table, idx);
      const ws = buildTableSheet(table);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  }

  onProgress?.(95, "Generating file…");

  let blob: Blob;
  if (options.outputFormat === "csv") {
    // Concatenate all sheets with spacers
    let csv = "";
    wb.SheetNames.forEach(name => {
      csv += `--- ${name} ---\n`;
      csv += XLSX.utils.sheet_to_csv(wb.Sheets[name]) + "\n\n";
    });
    blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  } else {
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  onProgress?.(100, "Done, your Excel file is ready.");
  return blob;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 1: Text Extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractElements(page: any, textContent: any): RawElement[] {
  const vp = page.getViewport({ scale: 1.0 });
  const pageHeight = vp.height;

  return textContent.items
    .filter((it: TextItem | TextMarkedContent): it is TextItem =>
      "str" in it && it.str.trim().length > 0
    )
    .map((it: TextItem): RawElement => {
      const t = it.transform;
      const scaleX = Math.sqrt(t[0] * t[0] + t[1] * t[1]);
      const scaleY = Math.sqrt(t[2] * t[2] + t[3] * t[3]);
      const fontSize = Math.max(scaleX, scaleY, 1);
      const font = (it.fontName || "").toLowerCase();
      return {
        text: it.str,
        x: t[4],
        y: pageHeight - t[5] - fontSize, // flip: y=0 at top
        width: Math.abs(it.width) || fontSize * it.str.length * 0.55,
        height: it.height || fontSize,
        fontSize,
        isBold: /bold|black|heavy|demi/i.test(font),
      };
    });
}

async function extractViaOcr(page: any, lang: string): Promise<RawElement[]> {
  const vp = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = vp.width;
  canvas.height = vp.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  const result = await runOcrOnCanvas(canvas, lang);
  return result.paragraphs.map((p, i) => ({
    text: p.text.replace(/\s+/g, " ").trim(),
    x: p.bbox.x0 / 2,
    y: p.bbox.y0 / 2,
    width: (p.bbox.x1 - p.bbox.x0) / 2,
    height: (p.bbox.y1 - p.bbox.y0) / 2,
    fontSize: 11,
    isBold: false,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 2: Row Grouping
// ─────────────────────────────────────────────────────────────────────────────

function groupIntoRows(elements: RawElement[]): RawElement[][] {
  if (!elements.length) return [];

  // Sort by Y then X
  const sorted = [...elements].sort((a, b) => {
    const dy = a.y - b.y;
    if (Math.abs(dy) < LINE_Y_TOLERANCE) return a.x - b.x;
    return dy;
  });

  const rows: RawElement[][] = [];
  let current: RawElement[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const el = sorted[i];
    const refY = current[0].y;
    if (Math.abs(el.y - refY) < LINE_Y_TOLERANCE) {
      current.push(el);
    } else {
      rows.push(current);
      current = [el];
    }
  }
  if (current.length) rows.push(current);

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 3: Column Bucket Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a list of rows, find the shared column X positions via histogram.
 * Returns sorted X bucket positions that appear in at least MIN_TABLE_ROWS rows.
 */
function detectColumnBuckets(rows: RawElement[][]): number[] {
  const histogram = new Map<number, number>();

  rows.forEach(row => {
    // Compute average char width for this row
    const avgCharWidth = row.reduce((s, e) => s + (e.width / Math.max(e.text.length, 1)), 0) / row.length;
    const bucketSize = Math.max(COL_BUCKET_TOLERANCE, avgCharWidth * 0.5);

    row.forEach(el => {
      const bucket = Math.round(el.x / bucketSize) * bucketSize;
      histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
    });
  });

  return [...histogram.entries()]
    .filter(([, count]) => count >= MIN_TABLE_ROWS)
    .map(([x]) => x)
    .sort((a, b) => a - b);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 4: Table Detection (Hybrid Whitespace + Alignment)
// ─────────────────────────────────────────────────────────────────────────────

function detectTablesOnPage(elements: RawElement[], pageNum: number): DetectedTable[] {
  if (!elements.length) return [];

  const rowGroups = groupIntoRows(elements);
  if (rowGroups.length < MIN_TABLE_ROWS) return [];

  // Find column buckets across all rows
  const colBuckets = detectColumnBuckets(rowGroups);
  if (colBuckets.length < MIN_TABLE_COLS) {
    return [];
  }

  // Build grid rows: assign each element to its closest column bucket
  const gridRows: GridRow[] = rowGroups.map(row => {
    const cells: string[] = new Array(colBuckets.length).fill("");
    row.forEach(el => {
      const col = closestBucketIndex(el.x, colBuckets);
      cells[col] += (cells[col] ? " " : "") + el.text;
    });
    return {
      y: row[0].y,
      cells,
      rawElements: row,
    };
  });

  // Qualify table runs: find contiguous runs where ≥ 2 columns have content
  const tables: DetectedTable[] = [];
  let runStart = -1;
  let runRows: GridRow[] = [];

  const flush = () => {
    if (runRows.length >= MIN_TABLE_ROWS) {
      // Compute which columns actually have any data
      const activeCols = colBuckets
        .map((x, i) => ({ x, i }))
        .filter(({ i }) => runRows.some(r => r.cells[i]?.trim()));

      if (activeCols.length >= MIN_TABLE_COLS) {
        const filteredColBuckets = activeCols.map(c => c.x);
        const filteredRows = runRows.map(gr => ({
          ...gr,
          cells: activeCols.map(c => gr.cells[c.i] || ""),
        }));
        tables.push({
          colBuckets: filteredColBuckets,
          rows: filteredRows,
          pageStart: pageNum,
          pageEnd: pageNum,
        });
      }
    }
    runRows = [];
    runStart = -1;
  };

  for (let i = 0; i < gridRows.length; i++) {
    const gr = gridRows[i];
    const populated = gr.cells.filter(c => c.trim().length > 0).length;

    if (populated >= MIN_TABLE_COLS) {
      if (runStart === -1) runStart = i;
      runRows.push(gr);
    } else {
      flush();
    }
  }
  flush();

  return tables;
}

function closestBucketIndex(x: number, buckets: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  buckets.forEach((b, i) => {
    const d = Math.abs(b - x);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 5: Multi-Page Table Continuation
// ─────────────────────────────────────────────────────────────────────────────

function mergeMultiPageTables(tables: DetectedTable[]): DetectedTable[] {
  if (tables.length <= 1) return tables;

  const merged: DetectedTable[] = [];
  let current = tables[0];

  for (let i = 1; i < tables.length; i++) {
    const next = tables[i];
    // Continuations: adjacent pages AND same number of columns
    const sameColumns = current.colBuckets.length === next.colBuckets.length;
    const adjacentPages = next.pageStart === current.pageEnd + 1;

    if (sameColumns && adjacentPages) {
      // Merge rows (skip duplicate header on continuation page)
      const continueRows = next.rows.slice(1); // skip header row on continued page
      current = {
        ...current,
        rows: [...current.rows, ...continueRows],
        pageEnd: next.pageEnd,
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 6: Cell Type Detection & Cleaning
// ─────────────────────────────────────────────────────────────────────────────

// Common date patterns
const DATE_PATTERNS = [
  /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/,      // dd/mm/yyyy or mm-dd-yyyy
  /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,          // yyyy-mm-dd (ISO)
  /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,           // dd/mm/yy
];

function parseCellValue(raw: string): CellValue {
  const s = raw.trim();
  if (!s) return "";

  // Remove line breaks and normalize whitespace
  const clean = s.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();

  // Try date
  for (const pat of DATE_PATTERNS) {
    if (pat.test(clean)) {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Try percentage (e.g. "12.5%")
  if (/^-?\d[\d,]*\.?\d*\s*%$/.test(clean)) {
    const num = parseFloat(clean.replace(/[,%]/g, ""));
    if (!isNaN(num)) return num / 100;
  }

  // Try currency / number (e.g. "$1,234.56", "1.234.56", "1,234")
  const stripped = clean.replace(/^[$€£¥₹]\s*/, "").replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(stripped)) {
    const num = parseFloat(stripped);
    if (!isNaN(num)) return num;
  }

  // Fallback: clean text
  return clean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 7: XLSX Sheet Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildTableSheet(table: DetectedTable): XLSX.WorkSheet {
  if (!table.rows.length) return XLSX.utils.aoa_to_sheet([]);

  // Convert all cells to typed values
  const data: CellValue[][] = table.rows.map(row =>
    row.cells.map(c => parseCellValue(c))
  );

  const ws = XLSX.utils.aoa_to_sheet(data);

  // --- Bold the first row (header) ---
  const headerStyle = { font: { bold: true }, alignment: { wrapText: true, vertical: "top" as const } };
  const numCols = table.colBuckets.length;
  for (let c = 0; c < numCols; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellAddr]) {
      ws[cellAddr].s = headerStyle;
    }
  }

  // --- Style percentage cells ---
  data.forEach((row, ri) => {
    row.forEach((val, ci) => {
      if (typeof val === "number" && val < 1 && val > 0) {
        const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (ws[addr]) ws[addr].z = "0.00%";
      }
      if (val instanceof Date) {
        const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (ws[addr]) ws[addr].z = "dd/mm/yyyy";
      }
    });
  });

  // --- Auto column widths ---
  const colWidths = table.colBuckets.map((_, ci) => {
    const maxLen = Math.max(
      ...data.map(row => String(row[ci] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 4, 10), 60) };
  });
  ws["!cols"] = colWidths;

  return ws;
}

/** Fallback when no tables are found, produce structured text rows */
function buildFallbackSheet(allPageElements: RawElement[][]): XLSX.WorkSheet {
  const rows: string[][] = [["Page", "Text Content"]];

  allPageElements.forEach((elements, pi) => {
    const rowGroups = groupIntoRows(elements);
    rowGroups.forEach(rg => {
      const text = rg
        .sort((a, b) => a.x - b.x)
        .map(e => e.text)
        .join(" ")
        .trim();
      if (text) rows.push([String(pi + 1), text]);
    });
    rows.push(["", ""]); // spacer between pages
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Bold header
  ["A1", "B1"].forEach(addr => {
    if (ws[addr]) ws[addr].s = { font: { bold: true } };
  });

  ws["!cols"] = [{ wch: 8 }, { wch: 90 }];
  return ws;
}

/** Derive a human-readable sheet name from first row header text */
function buildSheetName(table: DetectedTable, idx: number): string {
  const firstRow = table.rows[0]?.cells.filter(c => c.trim()).join(" ") || "";
  const raw = firstRow.substring(0, 25).trim().replace(/[\\/:?*[\]]/g, "_") || `Table ${idx + 1}`;
  // Excel sheet names must be ≤ 31 chars and unique
  return raw.substring(0, 31);
}
