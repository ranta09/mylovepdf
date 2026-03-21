/**
 * MagicDOCX – Production-grade PDF Document Processor
 * Multi-stage pipeline: Extract → Cluster → Detect → Reconstruct
 */

import * as pdfjsLib from "pdfjs-dist";
import type { PDFPageProxy, TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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
  colSpan?: number;
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

export type BlockType = "title" | "h1" | "h2" | "paragraph" | "list_item" | "header_footer";

export interface TextBlock {
  type: BlockType;
  lines: TextLine[];
  x: number;
  y: number;
  width: number;
  height: number;
  avgFontSize: number;
  alignment: "left" | "center" | "right" | "justified";
  isBullet?: boolean;
  listLevel?: number;
  column?: number; // 0-indexed column this block belongs to
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
  columnCount: number; // Detected number of columns
  medianFontSize: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LINE_Y_THRESHOLD = 2.5;         // px – elements within this Y are on the same line
const WORD_GAP_THRESHOLD = 3;         // px – gaps larger than this get a space
const PARA_GAP_FACTOR = 1.4;          // × line height – larger gaps split paragraphs
const HEADER_FOOTER_ZONE = 0.06;      // fraction of page height treated as header/footer
const TABLE_COL_ALIGN_THRESHOLD = 6;  // px – column alignment tolerance
const TABLE_MIN_ROWS = 2;             // minimum rows to recognize a table
const TABLE_MIN_COLS = 2;             // minimum columns to recognize a table
const COLUMN_GAP_FACTOR = 2.5;        // × median char width – gap to identify column break

// ─────────────────────────────────────────────────────────────────────────────
// PPT Helpers (kept for backward compat)
// ─────────────────────────────────────────────────────────────────────────────

export const PPT_WIDTH = 10;
export const PPT_HEIGHT = 5.625;
export const toPptX = (pdfX: number, pageWidth: number) => (pdfX / pageWidth) * PPT_WIDTH;
export const toPptY = (pdfY: number, pageHeight: number, fontSize: number) =>
  ((pageHeight - pdfY - fontSize) / pageHeight) * PPT_HEIGHT;
export const toPptW = (pdfW: number, pageWidth: number) => (pdfW / pageWidth) * PPT_WIDTH;
export const toPptH = (pdfH: number, pageHeight: number) => (pdfH / pageHeight) * PPT_HEIGHT;

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzePageStructure(page: PDFPageProxy): Promise<PageLayout> {
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  const width = viewport.width;
  const height = viewport.height;

  // 1. Extract raw text elements
  const rawElements = extractElements(textContent.items, height);

  if (rawElements.length === 0) {
    return { blocks: [], tables: [], images: await extractImages(page, viewport), width, height, columnCount: 1, medianFontSize: 12 };
  }

  // 2. Compute median font size for heading detection
  const fontSizes = rawElements.map(e => e.fontSize).sort((a, b) => a - b);
  const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;

  // 3. Remove header/footer elements
  const bodyElements = rawElements.filter(e => {
    const relY = (height - e.y) / height; // 0=top, 1=bottom
    return relY > HEADER_FOOTER_ZONE && relY < (1 - HEADER_FOOTER_ZONE);
  });

  // 4. Group into lines
  const lines = groupIntoLines(bodyElements);

  // 5. Detect column layout
  const columnCount = detectColumnCount(lines, width);

  // 6. Two-pass table detection
  const { tables, remainingLines } = detectTables(lines, width);

  // 7. Group into semantic blocks
  const blocks = groupIntoBlocks(remainingLines, width, height, medianFontSize, columnCount);

  // 8. Extract images
  const images = await extractImages(page, viewport);

  return { blocks, tables, images, width, height, columnCount, medianFontSize };
}

export async function detectOCRNeed(page: PDFPageProxy): Promise<boolean> {
  const textContent = await page.getTextContent();
  const visibleText = textContent.items.filter(
    (it: TextItem | TextMarkedContent): it is TextItem =>
      "str" in it && !!it.str.trim().length
  );
  return visibleText.length < 5;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) return { valid: false, error: "File size exceeds 50MB limit." };
  if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf"))
    return { valid: false, error: "Only PDF files are supported." };
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Element Extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractElements(items: (TextItem | TextMarkedContent)[], pageHeight: number): TextElement[] {
  return items
    .filter((it): it is TextItem => "str" in it && !!it.str.trim())
    .map((it: TextItem) => {
      const t = it.transform;
      // fontSize is the scale of the font matrix
      const scaleX = Math.sqrt(t[0] * t[0] + t[1] * t[1]);
      const scaleY = Math.sqrt(t[2] * t[2] + t[3] * t[3]);
      const fontSize = Math.max(scaleX, scaleY, 1);
      const font = (it.fontName || "").toLowerCase();
      return {
        text: it.str,
        x: t[4],
        // PDF coords: y=0 is bottom. Flip so y=0 is top.
        y: pageHeight - t[5] - fontSize,
        width: Math.abs(it.width) || fontSize * it.str.length * 0.55,
        height: it.height || fontSize,
        fontSize,
        fontName: it.fontName || "",
        isBold: /bold|black|heavy|demi/i.test(font),
        isItalic: /italic|oblique/i.test(font),
      } as TextElement;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Line Grouping
// ─────────────────────────────────────────────────────────────────────────────

function groupIntoLines(elements: TextElement[]): TextLine[] {
  if (!elements.length) return [];

  // Sort by y then x
  const sorted = [...elements].sort((a, b) => {
    const dy = a.y - b.y;
    if (Math.abs(dy) < LINE_Y_THRESHOLD) return a.x - b.x;
    return dy;
  });

  const lines: TextLine[] = [];
  let bucket = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const el = sorted[i];
    const refY = bucket[0].y;
    if (Math.abs(el.y - refY) < LINE_Y_THRESHOLD) {
      bucket.push(el);
    } else {
      lines.push(buildLine(bucket));
      bucket = [el];
    }
  }
  if (bucket.length) lines.push(buildLine(bucket));

  return lines;
}

function buildLine(elements: TextElement[]): TextLine {
  elements.sort((a, b) => a.x - b.x);
  let text = "";
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (i > 0) {
      const prev = elements[i - 1];
      const gap = el.x - (prev.x + prev.width);
      // Use a space if there's a visual word-gap
      if (gap > WORD_GAP_THRESHOLD) text += " ";
    }
    text += el.text;
  }
  const avgFontSize = elements.reduce((s, e) => s + e.fontSize, 0) / elements.length;
  return {
    elements,
    y: elements[0].y,
    minX: elements[0].x,
    maxX: elements[elements.length - 1].x + elements[elements.length - 1].width,
    avgFontSize,
    text: text.trim(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Column Detection
// ─────────────────────────────────────────────────────────────────────────────

function detectColumnCount(lines: TextLine[], pageWidth: number): number {
  if (!lines.length) return 1;

  // Find the median text-start X – all lines that start far right of median indicate a 2-column layout
  const starts = lines.map(l => l.minX).sort((a, b) => a - b);
  const medianStart = starts[Math.floor(starts.length / 2)];
  const rightStartLines = lines.filter(l => l.minX > medianStart + pageWidth * 0.25).length;

  // If more than 20% of lines start in the right half, it's likely 2-column
  if (rightStartLines / lines.length > 0.2) return 2;
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Two-Pass Table Detection
// ─────────────────────────────────────────────────────────────────────────────

function detectTables(lines: TextLine[], pageWidth: number) {
  // PASS 1: Build a histogram of element X-positions across all lines
  const colHistogram = new Map<number, number>();
  lines.forEach(line => {
    line.elements.forEach(el => {
      const bucket = Math.round(el.x / TABLE_COL_ALIGN_THRESHOLD) * TABLE_COL_ALIGN_THRESHOLD;
      colHistogram.set(bucket, (colHistogram.get(bucket) || 0) + 1);
    });
  });

  // Only keep columns that appear in multiple rows
  const colPositions = [...colHistogram.entries()]
    .filter(([, count]) => count >= TABLE_MIN_ROWS)
    .map(([x]) => x)
    .sort((a, b) => a - b);

  if (colPositions.length < TABLE_MIN_COLS) {
    return { tables: [], remainingLines: lines };
  }

  // PASS 2: Scan lines to find runs that match multiple columns
  const tables: TableBlock[] = [];
  const usedLineIndices = new Set<number>();
  let runStart = -1;
  let runRows: { idx: number; cells: TableCell[] }[] = [];

  const flushRun = () => {
    if (runRows.length >= TABLE_MIN_ROWS) {
      const allX = runRows.flatMap(r => r.cells.map(c => c.x));
      const allMaxX = runRows.flatMap(r => r.cells.map(c => c.x + c.width));
      const startX = Math.min(...allX);
      const endX = Math.max(...allMaxX);
      tables.push({
        rows: runRows.map(r => ({ y: lines[r.idx].y, cells: r.cells })),
        startX,
        startY: lines[runRows[0].idx].y,
        width: endX - startX,
      });
      runRows.forEach(r => usedLineIndices.add(r.idx));
    }
    runRows = [];
    runStart = -1;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Count how many elements align to known column positions
    let matchCount = 0;
    line.elements.forEach(el => {
      const rx = Math.round(el.x / TABLE_COL_ALIGN_THRESHOLD) * TABLE_COL_ALIGN_THRESHOLD;
      if (colPositions.some(c => Math.abs(c - rx) <= TABLE_COL_ALIGN_THRESHOLD)) matchCount++;
    });

    const qualifies = matchCount >= TABLE_MIN_COLS && line.elements.length >= TABLE_MIN_COLS;

    if (qualifies) {
      if (runStart === -1) runStart = i;
      const cells = assignColumns(line, colPositions);
      runRows.push({ idx: i, cells });
    } else {
      flushRun();
    }
  }
  flushRun();

  const remainingLines = lines.filter((_, i) => !usedLineIndices.has(i));
  return { tables, remainingLines };
}

function assignColumns(line: TextLine, colPositions: number[]): TableCell[] {
  // Initialize one cell per detected column position
  const cells: TableCell[] = colPositions.map((x, idx) => ({
    text: "",
    x,
    width: idx < colPositions.length - 1 ? colPositions[idx + 1] - x : 120,
    fontSize: 11,
    bold: false,
  }));

  // Assign each element to its closest column
  line.elements.forEach(el => {
    let bestIdx = 0;
    let bestDist = Infinity;
    colPositions.forEach((c, i) => {
      const d = Math.abs(c - el.x);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    cells[bestIdx].text += (cells[bestIdx].text ? " " : "") + el.text;
    cells[bestIdx].fontSize = Math.max(cells[bestIdx].fontSize, el.fontSize);
    cells[bestIdx].bold = cells[bestIdx].bold || el.isBold;
  });

  // Only keep cells with content
  return cells.filter(c => c.text.trim().length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Block Grouping with Semantic Classification
// ─────────────────────────────────────────────────────────────────────────────

// List prefix patterns
const LIST_PREFIXES = /^(\s*([\u2022\u2023\u25E6\u2043\u2219•\-\*]|\d+[.)]\s+))/;

function groupIntoBlocks(
  lines: TextLine[],
  pageWidth: number,
  pageHeight: number,
  medianFontSize: number,
  columnCount: number
): TextBlock[] {
  if (!lines.length) return [];

  // Sort lines by Y first
  lines.sort((a, b) => a.y - b.y);

  const blocks: TextBlock[] = [];
  let current: TextLine[] = [lines[0]];

  const flush = (lineSet: TextLine[]) => {
    if (!lineSet.length) return;
    blocks.push(classifyBlock(lineSet, pageWidth, pageHeight, medianFontSize, columnCount));
  };

  for (let i = 1; i < lines.length; i++) {
    const prev = current[current.length - 1];
    const curr = lines[i];

    // Gap between text baselines
    const gap = curr.y - (prev.y + prev.avgFontSize);
    const lineHeightEstimate = prev.avgFontSize * PARA_GAP_FACTOR;

    const isBullet = LIST_PREFIXES.test(curr.text);
    const isNewBullet = isBullet && !LIST_PREFIXES.test(prev.text);
    const fontSizeJump = Math.abs(curr.avgFontSize - prev.avgFontSize) > 2;

    // Column shift for multi-column pages
    const columnShift = columnCount > 1 && curr.minX > pageWidth * 0.5 && prev.minX < pageWidth * 0.4;

    // Split conditions
    if (gap > lineHeightEstimate || fontSizeJump || isNewBullet || columnShift) {
      flush(current);
      current = [curr];
    } else {
      current.push(curr);
    }
  }
  flush(current);

  return blocks;
}

function classifyBlock(
  lines: TextLine[],
  pageWidth: number,
  pageHeight: number,
  medianFontSize: number,
  columnCount: number
): TextBlock {
  const avgFont = lines.reduce((s, l) => s + l.avgFontSize, 0) / lines.length;
  const minX = Math.min(...lines.map(l => l.minX));
  const maxX = Math.max(...lines.map(l => l.maxX));
  const topY = lines[0].y;
  const bottomY = lines[lines.length - 1].y + lines[lines.length - 1].avgFontSize;

  // Merging broken lines into paragraphs:
  // Lines that end NOT at page-right edge and continue on next with similar X are wrapped lines
  // We unify them into a single text when building the block

  // Bullet detection
  const firstText = lines[0].text;
  const isBullet = LIST_PREFIXES.test(firstText);
  const listLevel = isBullet ? (firstText.match(/^(\s+)/) ? firstText.match(/^(\s+)/)![0].length / 2 : 0) : 0;

  // Heading detection based on font size relative to median
  let blockType: BlockType = "paragraph";
  if (avgFont >= medianFontSize * 1.5) blockType = "h1";
  else if (avgFont >= medianFontSize * 1.2) blockType = "h2";
  else if (isBullet) blockType = "list_item";

  // Alignment detection
  let alignment: TextBlock["alignment"] = "left";
  const center = (minX + maxX) / 2;
  const pageMid = pageWidth / 2;
  if (Math.abs(center - pageMid) < pageWidth * 0.08) alignment = "center";
  else if (minX > pageWidth * 0.55) alignment = "right";
  else if (lines.length > 1) {
    // Check if lines are justified (right edges vary widely but start at same X)
    const rightVariance = Math.max(...lines.map(l => l.maxX)) - Math.min(...lines.map(l => l.maxX));
    const leftVariance = Math.max(...lines.map(l => l.minX)) - Math.min(...lines.map(l => l.minX));
    if (leftVariance < 5 && rightVariance > pageWidth * 0.1) alignment = "justified";
  }

  // Column assignment (for 2-column docs)
  const column = columnCount > 1 && minX > pageWidth * 0.5 ? 1 : 0;

  return {
    type: blockType,
    lines,
    x: minX,
    y: topY,
    width: maxX - minX,
    height: bottomY - topY,
    avgFontSize: avgFont,
    alignment,
    isBullet,
    listLevel,
    column,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6: Image Extraction
// ─────────────────────────────────────────────────────────────────────────────

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
        continue;
      }

      if (fn !== pdfjsLib.OPS.paintImageXObject && fn !== pdfjsLib.OPS.paintInlineImageXObject) continue;

      const imgName = args[0];
      let imgObj: any;
      try {
        imgObj = await Promise.race([
          new Promise<any>((resolve, reject) => {
            page.objs.get(imgName, (data: any) => (data ? resolve(data) : reject(new Error("No data"))));
          }),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000)),
        ]);
      } catch {
        try { imgObj = objs.get(imgName); } catch { continue; }
      }

      if (!imgObj?.data) continue;

      const canvas = document.createElement("canvas");
      canvas.width = imgObj.width;
      canvas.height = imgObj.height;
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.createImageData(imgObj.width, imgObj.height);

      if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
        imageData.data.set(imgObj.data);
      } else {
        // RGB → RGBA
        for (let j = 0, k = 0; j < imgObj.data.length && k < imageData.data.length; j += 3, k += 4) {
          imageData.data[k] = imgObj.data[j];
          imageData.data[k + 1] = imgObj.data[j + 1];
          imageData.data[k + 2] = imgObj.data[j + 2];
          imageData.data[k + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const [a, , , d, tx, ty] = currentTransform;

      images.push({
        data: canvas.toDataURL("image/jpeg", 0.9),
        x: tx,
        // Convert from PDF bottom-origin to top-origin
        y: viewport.height - ty - Math.abs(imgObj.height * d),
        width: Math.abs(imgObj.width * a),
        height: Math.abs(imgObj.height * d),
      });
    }
  } catch (err) {
    console.warn("Image extraction error:", err);
  }
  return images;
}
