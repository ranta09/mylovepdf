/**
 * Global Document Processing Pipeline
 * Centralizes PDF analysis, layout detection, and structure mapping.
 */

import * as pdfjsLib from "pdfjs-dist";

// ── Types ────────────────────────────────────────────────────────────────────

import type { PDFPageProxy, TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";

export interface TextElement {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
}

export interface TextLine {
  elements: TextElement[];
  y: number;
  minX: number;
  maxX: number;
  avgFontSize: number;
  text: string;
}

export interface TableCell {
  text: string;
  x: number;
  width: number;
  fontSize: number;
  bold: boolean;
}

export interface TableRow {
  cells: TableCell[];
  y: number;
}

export interface TableBlock {
  rows: TableRow[];
  startX: number;
  startY: number;
  width: number;
}

export interface TextBlock {
  type: "paragraph" | "list" | "title";
  lines: TextLine[];
  x: number;
  y: number;
  width: number;
  height: number;
  avgFontSize: number;
  alignment: "left" | "center" | "right" | "justified";
  isBullet?: boolean;
}

export interface ExtractedImage {
  data: string; // dataURL
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageLayout {
  blocks: TextBlock[];
  tables: TableBlock[];
  images: ExtractedImage[];
  width: number;
  height: number;
}

// ── PPT Helpers ─────────────────────────────────────────────────────────────

export const PPT_WIDTH = 10;
export const PPT_HEIGHT = 5.625;

export const toPptX = (pdfX: number, pageWidth: number) => (pdfX / pageWidth) * PPT_WIDTH;

export const toPptY = (pdfY: number, pageHeight: number, fontSize: number) =>
  ((pageHeight - pdfY - fontSize) / pageHeight) * PPT_HEIGHT;

export const toPptW = (pdfW: number, pageWidth: number) => (pdfW / pageWidth) * PPT_WIDTH;

export const toPptH = (pdfH: number, pageHeight: number) => (pdfH / pageHeight) * PPT_HEIGHT;

// ── Constants ────────────────────────────────────────────────────────────────

const LINE_Y_THRESHOLD = 3;
const WORD_GAP_THRESHOLD = 4;
const PARA_GAP_FACTOR = 1.6;
const TABLE_COL_ALIGN_THRESHOLD = 8;

// ── Shared Analysis Logic ───────────────────────────────────────────────────

/**
 * Higher-level function to analyze a PDF page and return its structure
 */
export async function analyzePageStructure(page: PDFPageProxy): Promise<PageLayout> {
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  const width = viewport.width;
  const height = viewport.height;

  // 1. Extract Elements
  const rawElements = textContent.items
    .filter((it: TextItem | TextMarkedContent): it is TextItem => "str" in it && !!it.str.trim())
    .map((it: TextItem) => {
      const t = it.transform;
      const fontSize = Math.abs(t[0] || t[3] || 12);
      const font = (it.fontName || "").toLowerCase();
      return {
        text: it.str,
        x: t[4],
        y: t[5],
        width: it.width || fontSize * it.str.length * 0.5,
        height: it.height || fontSize,
        fontSize,
        fontName: it.fontName || "",
        isBold: font.includes("bold") || font.includes("black"),
        isItalic: font.includes("italic") || font.includes("oblique"),
      } as TextElement;
    });

  if (rawElements.length === 0) {
    return { blocks: [], tables: [], images: await extractImages(page, viewport), width, height };
  }

  // 2. Group into Lines
  const lines = groupIntoLines(rawElements);

  // 3. Detect Tables
  const { tables, remainingLines } = detectTables(lines, width);

  // 4. Group into Blocks
  const blocks = groupIntoBlocks(remainingLines, width, height);

  // 5. Extract Images
  const images = await extractImages(page, viewport);

  return { blocks, tables, images, width, height };
}

/**
 * Checks if a PDF page appears to be a scan or missing a text layer
 */
export async function detectOCRNeed(page: PDFPageProxy): Promise<boolean> {
  const textContent = await page.getTextContent();
  if (textContent.items.length === 0) return true;
  
  // If text exists but has very small or no dimensions, it might be hidden OCR text
  // or a poorly generated PDF. Alternatively, check if text characters are all whitespace.
  const visibleText = textContent.items.filter((it: TextItem | TextMarkedContent): it is TextItem => "str" in it && !!it.str.trim().length);
  return visibleText.length < 5; // Heuristic
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) return { valid: false, error: "File size exceeds 50MB limit." };
  if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
    return { valid: false, error: "Only PDF files are supported." };
  }
  return { valid: true };
}

// ── Private Helper Functions ───────────────────────────────────────────────

function groupIntoLines(elements: TextElement[]): TextLine[] {
  const sorted = [...elements].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) < LINE_Y_THRESHOLD) return a.x - b.x;
    return yDiff;
  });

  const lines: TextLine[] = [];
  let current: TextElement[] = [];
  let currentY = -1;

  for (const el of sorted) {
    if (currentY === -1 || Math.abs(el.y - currentY) < LINE_Y_THRESHOLD) {
      current.push(el);
    } else {
      lines.push(buildLine(current));
      current = [el];
    }
    currentY = el.y;
  }
  if (current.length) lines.push(buildLine(current));
  return lines;
}

function buildLine(elements: TextElement[]): TextLine {
  elements.sort((a, b) => a.x - b.x);
  let text = "";
  elements.forEach((el, i) => {
    if (i > 0) {
      const prev = elements[i - 1];
      if (el.x - (prev.x + prev.width) > WORD_GAP_THRESHOLD) text += " ";
    }
    text += el.text;
  });

  return {
    elements,
    y: elements[0].y,
    minX: elements[0].x,
    maxX: elements[elements.length - 1].x + elements[elements.length - 1].width,
    avgFontSize: elements.reduce((s, e) => s + e.fontSize, 0) / elements.length,
    text: text.trim(),
  };
}

function detectTables(lines: TextLine[], pageWidth: number) {
  const tables: TableBlock[] = [];
  const used = new Set<number>();
  const colHistogram = new Map<number, number>();

  lines.forEach((line) => {
    if (line.elements.length < 2) return;
    line.elements.forEach((el) => {
      const x = Math.round(el.x / TABLE_COL_ALIGN_THRESHOLD) * TABLE_COL_ALIGN_THRESHOLD;
      colHistogram.set(x, (colHistogram.get(x) || 0) + 1);
    });
  });

  const colPositions = [...colHistogram.entries()]
    .filter(([_, count]) => count >= 2)
    .map(([x]) => x)
    .sort((a, b) => a - b);

  if (colPositions.length < 2) return { tables: [], remainingLines: lines };

  let rows: { idx: number; cells: TableCell[] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matchCount = 0;
    line.elements.forEach((el) => {
      const rx = Math.round(el.x / TABLE_COL_ALIGN_THRESHOLD) * TABLE_COL_ALIGN_THRESHOLD;
      if (colPositions.some((c) => Math.abs(c - rx) <= TABLE_COL_ALIGN_THRESHOLD)) matchCount++;
    });

    if (matchCount >= 2 && line.elements.length >= 2) {
      const cells = assignColumns(line, colPositions);
      rows.push({ idx: i, cells });
    } else {
      if (rows.length >= 2) {
        tables.push(finalizeTable(rows, lines));
        rows.forEach((r) => used.add(r.idx));
      }
      rows = [];
    }
  }

  if (rows.length >= 2) {
    tables.push(finalizeTable(rows, lines));
    rows.forEach((r) => used.add(r.idx));
  }

  return { tables, remainingLines: lines.filter((_, i) => !used.has(i)) };
}

function assignColumns(line: TextLine, cols: number[]): TableCell[] {
  const cells: TableCell[] = cols.map((x, idx) => ({
    text: "", x, width: idx < cols.length - 1 ? cols[idx + 1] - x : 80, fontSize: 12, bold: false,
  }));

  line.elements.forEach((el) => {
    let best = 0;
    let bestDist = Infinity;
    cols.forEach((c, i) => {
      const d = Math.abs(c - el.x);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    cells[best].text += (cells[best].text ? " " : "") + el.text;
    cells[best].fontSize = Math.max(cells[best].fontSize, el.fontSize);
    cells[best].bold = cells[best].bold || el.isBold;
  });
  return cells.filter((c) => c.text);
}

function finalizeTable(rows: any[], lines: TextLine[]): TableBlock {
  const allX = rows.flatMap((r) => r.cells.map((c: any) => c.x));
  const minX = Math.min(...allX);
  const maxX = Math.max(...rows.flatMap((r) => r.cells.map((c: any) => c.x + c.width)));
  return {
    rows: rows.map((r) => ({ y: lines[r.idx].y, cells: r.cells })),
    startX: minX,
    startY: lines[rows[0].idx].y,
    width: maxX - minX,
  };
}

function groupIntoBlocks(lines: TextLine[], pageWidth: number, pageHeight: number) {
  const blocks: TextBlock[] = [];
  if (!lines.length) return blocks;
  let current = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    const gap = Math.abs(prev.y - curr.y);
    const isBullet = curr.text.startsWith("•") || curr.text.startsWith("-");
    const fontSizeChange = Math.abs(curr.avgFontSize - prev.avgFontSize) > 2;

    if (gap > prev.avgFontSize * PARA_GAP_FACTOR || isBullet || fontSizeChange) {
      blocks.push(buildBlock(current, pageWidth, pageHeight));
      current = [curr];
    } else current.push(curr);
  }
  if (current.length) blocks.push(buildBlock(current, pageWidth, pageHeight));
  return blocks;
}

function buildBlock(lines: TextLine[], pageWidth: number, pageHeight: number): TextBlock {
  const avgFont = lines.reduce((s, l) => s + l.avgFontSize, 0) / lines.length;
  const minX = Math.min(...lines.map((l) => l.minX));
  const maxX = Math.max(...lines.map((l) => l.maxX));
  const minY = Math.min(...lines.map((l) => l.y));
  const maxY = Math.max(...lines.map((l) => l.y));

  const isTitle = avgFont > 16 && lines.length <= 2 && maxY > pageHeight * 0.7;
  const isBullet = lines[0].text.startsWith("•") || lines[0].text.startsWith("-");

  let alignment: "left" | "center" | "right" | "justified" = "left";
  const center = (minX + maxX) / 2;
  if (Math.abs(center - pageWidth / 2) < 30) alignment = "center";
  else if (minX > pageWidth * 0.5) alignment = "right";

  return {
    type: isTitle ? "title" : "paragraph",
    lines,
    x: minX,
    y: maxY,
    width: maxX - minX,
    height: maxY - minY + avgFont,
    avgFontSize: avgFont,
    alignment,
    isBullet,
  };
}

async function extractImages(page: PDFPageProxy, viewport: any): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  try {
    const operatorList = await page.getOperatorList();
    const objs = page.commonObjs;
    let currentTransform = [1, 0, 0, 1, 0, 0];

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];

      if (fn === pdfjsLib.OPS.transform) {
        currentTransform = args;
      } else if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
        const imgName = args[0];
        let imgObj;
        try {
          imgObj = await Promise.race([
            new Promise((resolve, reject) => {
              page.objs.get(imgName, (data: any) => data ? resolve(data) : reject(new Error("No data")));
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))
          ]);
        } catch {
           try { imgObj = objs.get(imgName); } catch { continue; }
        }

        if (!imgObj || !imgObj.data) continue;

        const canvas = document.createElement("canvas");
        canvas.width = imgObj.width;
        canvas.height = imgObj.height;
        const ctx = canvas.getContext("2d")!;
        const imageData = ctx.createImageData(imgObj.width, imgObj.height);
        
        if (imgObj.data && imgObj.data.length === imgObj.width * imgObj.height * 4) {
          imageData.data.set(imgObj.data);
        } else if (imgObj.data) {
          for (let j = 0, k = 0; j < imgObj.data.length && k < imageData.data.length; j += 3, k += 4) {
            imageData.data[k] = imgObj.data[j];
            imageData.data[k+1] = imgObj.data[j+1];
            imageData.data[k+2] = imgObj.data[j+2];
            imageData.data[k+3] = 255;
          }
        } else continue;
        
        ctx.putImageData(imageData, 0, 0);
        const [a, b, c, d, tx, ty] = currentTransform;
        
        images.push({
          data: canvas.toDataURL("image/jpeg", 0.9),
          x: tx,
          y: viewport.height - ty - Math.abs(imgObj.height * d),
          width: Math.abs(imgObj.width * a),
          height: Math.abs(imgObj.height * d)
        });
      }
    }
  } catch (err) {
    console.warn("Image extraction error:", err);
  }
  return images;
}
