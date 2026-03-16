/**
 * PDF to Word Coordinate-Based Layout Reconstruction Engine
 * 
 * Extracts element coordinates from PDF pages and reconstructs
 * layout-faithful DOCX documents using the docx library.
 */

import * as pdfjsLib from "pdfjs-dist";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ImageRun, AlignmentType, BorderStyle, Header, Footer,
  SectionType, PageBreak, HeadingLevel, TabStopPosition, TabStopType,
  convertInchesToTwip,
} from "docx";
import Tesseract from "tesseract.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface PdfTextItem {
  str: string;
  transform: number[]; // [scaleX, skewX, skewY, scaleY, translateX, translateY]
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

interface TextElement {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
  color?: { r: number; g: number; b: number };
}

interface TextLine {
  elements: TextElement[];
  y: number;
  minX: number;
  maxX: number;
  avgFontSize: number;
  text: string;
}

interface TextParagraph {
  lines: TextLine[];
  indent: number;
  alignment: "left" | "center" | "right" | "justified";
  isHeading: boolean;
  headingLevel?: 1 | 2 | 3 | 4;
  avgFontSize: number;
}

interface DetectedTable {
  rows: TableRowData[];
  startY: number;
  endY: number;
}

interface TableRowData {
  cells: TableCellData[];
  y: number;
}

interface TableCellData {
  text: string;
  x: number;
  width: number;
  fontSize: number;
  isBold: boolean;
}

interface PageElement {
  type: "paragraph" | "table" | "image";
  y: number;
  data: any;
}

interface ExtractedImage {
  data: Uint8Array;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "png" | "jpg";
}

// ── Constants ────────────────────────────────────────────────────────────────

const LINE_Y_THRESHOLD = 3; // pts — items within this Y range = same line
const WORD_GAP_THRESHOLD = 4; // pts — gap between chars to insert space
const PARAGRAPH_GAP_FACTOR = 1.6; // line spacing multiplier to detect paragraph break
const TABLE_COL_ALIGN_THRESHOLD = 8; // pts — X-alignment tolerance for column detection
const TABLE_MIN_COLS = 2;
const TABLE_MIN_ROWS = 2;
const HEADER_FOOTER_ZONE = 72; // pts from edge (1 inch)
const COLUMN_GAP_MIN = 36; // pts — minimum gap to detect multi-column

// Points to DOCX twips (1 pt = 20 twips)
const ptToTwip = (pt: number) => Math.round(pt * 20);
// Points to half-points (font sizes in docx are half-points)
const ptToHalfPt = (pt: number) => Math.round(pt * 2);

// ── Step 1: Extract Element Coordinates ──────────────────────────────────────

function extractTextElements(items: any[], styles: any): TextElement[] {
  return items
    .filter((item: any) => item.str && item.str.trim().length > 0)
    .map((item: any) => {
      const t = item.transform;
      const fontSize = Math.abs(t[0] || t[3] || 12);
      const fontName = (item.fontName || "").toLowerCase();
      return {
        text: item.str,
        x: t[4],
        y: t[5],
        width: item.width || fontSize * item.str.length * 0.5,
        height: item.height || fontSize,
        fontSize,
        fontName: item.fontName || "",
        isBold: fontName.includes("bold") || fontName.includes("black") || fontName.includes("heavy"),
        isItalic: fontName.includes("italic") || fontName.includes("oblique"),
        hasEOL: item.hasEOL,
      } as TextElement;
    });
}

// ── Step 2: Group Characters into Text Lines ─────────────────────────────────

function groupIntoLines(elements: TextElement[]): TextLine[] {
  if (elements.length === 0) return [];

  // Sort by Y descending (PDF coords: bottom-up), then X ascending
  const sorted = [...elements].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) <= LINE_Y_THRESHOLD) return a.x - b.x;
    return yDiff;
  });

  const lines: TextLine[] = [];
  let currentLineElements: TextElement[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const el = sorted[i];
    if (Math.abs(el.y - currentY) <= LINE_Y_THRESHOLD) {
      currentLineElements.push(el);
    } else {
      lines.push(buildLine(currentLineElements));
      currentLineElements = [el];
      currentY = el.y;
    }
  }
  if (currentLineElements.length > 0) {
    lines.push(buildLine(currentLineElements));
  }

  return lines;
}

function buildLine(elements: TextElement[]): TextLine {
  // Sort by X
  elements.sort((a, b) => a.x - b.x);

  // Reconstruct text with proper word spacing
  let text = "";
  for (let i = 0; i < elements.length; i++) {
    if (i > 0) {
      const prevEnd = elements[i - 1].x + elements[i - 1].width;
      const gap = elements[i].x - prevEnd;
      if (gap > WORD_GAP_THRESHOLD) {
        text += " ";
      }
    }
    text += elements[i].text;
  }

  const avgFontSize = elements.reduce((s, e) => s + e.fontSize, 0) / elements.length;

  return {
    elements,
    y: elements[0].y,
    minX: Math.min(...elements.map(e => e.x)),
    maxX: Math.max(...elements.map(e => e.x + e.width)),
    avgFontSize,
    text: text.trim(),
  };
}

// ── Step 3: Paragraph Detection ──────────────────────────────────────────────

function groupIntoParagraphs(lines: TextLine[], pageWidth: number): TextParagraph[] {
  if (lines.length === 0) return [];

  const paragraphs: TextParagraph[] = [];
  let currentLines: TextLine[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    const lineGap = Math.abs(prev.y - curr.y);
    const expectedGap = prev.avgFontSize * 1.2; // normal line spacing
    const isParagraphBreak = lineGap > expectedGap * PARAGRAPH_GAP_FACTOR;

    // Also check for indent change or font size change
    const indentChange = Math.abs(curr.minX - prev.minX) > 10;
    const fontSizeChange = Math.abs(curr.avgFontSize - prev.avgFontSize) > 2;

    if (isParagraphBreak || fontSizeChange || indentChange) {
      paragraphs.push(buildParagraph(currentLines, pageWidth));
      currentLines = [curr];
    } else {
      currentLines.push(curr);
    }
  }
  if (currentLines.length > 0) {
    paragraphs.push(buildParagraph(currentLines, pageWidth));
  }

  return paragraphs;
}

function buildParagraph(lines: TextLine[], pageWidth: number): TextParagraph {
  const avgFontSize = lines.reduce((s, l) => s + l.avgFontSize, 0) / lines.length;
  const indent = Math.min(...lines.map(l => l.minX));

  // Detect alignment
  const alignment = detectAlignment(lines, pageWidth);

  // Detect heading
  const isHeading = avgFontSize > 14 || lines.every(l => l.elements.every(e => e.isBold));
  let headingLevel: 1 | 2 | 3 | 4 | undefined;
  if (isHeading) {
    if (avgFontSize >= 24) headingLevel = 1;
    else if (avgFontSize >= 18) headingLevel = 2;
    else if (avgFontSize >= 14) headingLevel = 3;
    else headingLevel = 4;
  }

  return { lines, indent, alignment, isHeading, headingLevel, avgFontSize };
}

function detectAlignment(lines: TextLine[], pageWidth: number): "left" | "center" | "right" | "justified" {
  if (lines.length < 2) {
    // Single line — check center
    const line = lines[0];
    const lineCenter = (line.minX + line.maxX) / 2;
    const pageCenter = pageWidth / 2;
    if (Math.abs(lineCenter - pageCenter) < 20) return "center";
    if (line.minX > pageWidth * 0.5) return "right";
    return "left";
  }

  // Multiple lines: check if right edges align (justified) or left edges align (left)
  const rightEdges = lines.map(l => l.maxX);
  const leftEdges = lines.map(l => l.minX);
  const rightVariance = Math.max(...rightEdges) - Math.min(...rightEdges);
  const leftVariance = Math.max(...leftEdges) - Math.min(...leftEdges);

  if (leftVariance < 5 && rightVariance < 15) return "justified";
  if (leftVariance < 5) return "left";

  // Check center alignment
  const centers = lines.map(l => (l.minX + l.maxX) / 2);
  const centerVariance = Math.max(...centers) - Math.min(...centers);
  if (centerVariance < 15) return "center";

  return "left";
}

// ── Step 4: Table Detection Using Grid Alignment ─────────────────────────────

function detectTables(lines: TextLine[], pageWidth: number): { tables: DetectedTable[]; nonTableLines: TextLine[] } {
  const tables: DetectedTable[] = [];
  const nonTableLineIndices = new Set<number>(lines.map((_, i) => i));

  // Find X positions that repeat across multiple lines (column boundaries)
  const xPositions: Map<number, number> = new Map(); // rounded X → count

  lines.forEach(line => {
    if (line.elements.length >= TABLE_MIN_COLS) {
      line.elements.forEach(el => {
        const roundedX = Math.round(el.x / TABLE_COL_ALIGN_THRESHOLD) * TABLE_COL_ALIGN_THRESHOLD;
        xPositions.set(roundedX, (xPositions.get(roundedX) || 0) + 1);
      });
    }
  });

  // Find column positions that appear in multiple lines
  const colPositions = [...xPositions.entries()]
    .filter(([_, count]) => count >= TABLE_MIN_ROWS)
    .map(([x]) => x)
    .sort((a, b) => a - b);

  if (colPositions.length < TABLE_MIN_COLS) {
    return { tables, nonTableLines: lines };
  }

  // Group consecutive lines that match column positions into table regions
  let tableStartIdx = -1;
  let tableRows: { lineIdx: number; cells: TableCellData[] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.elements.length < TABLE_MIN_COLS) {
      if (tableRows.length >= TABLE_MIN_ROWS) {
        tables.push(buildTable(tableRows, lines, colPositions));
        tableRows.forEach(r => nonTableLineIndices.delete(r.lineIdx));
      }
      tableRows = [];
      continue;
    }

    // Check if elements align with detected columns
    let matchCount = 0;
    line.elements.forEach(el => {
      const roundedX = Math.round(el.x / TABLE_COL_ALIGN_THRESHOLD) * TABLE_COL_ALIGN_THRESHOLD;
      if (colPositions.includes(roundedX)) matchCount++;
    });

    if (matchCount >= TABLE_MIN_COLS) {
      const cells: TableCellData[] = assignElementsToColumns(line, colPositions);
      tableRows.push({ lineIdx: i, cells });
    } else {
      if (tableRows.length >= TABLE_MIN_ROWS) {
        tables.push(buildTable(tableRows, lines, colPositions));
        tableRows.forEach(r => nonTableLineIndices.delete(r.lineIdx));
      }
      tableRows = [];
    }
  }

  // Flush remaining
  if (tableRows.length >= TABLE_MIN_ROWS) {
    tables.push(buildTable(tableRows, lines, colPositions));
    tableRows.forEach(r => nonTableLineIndices.delete(r.lineIdx));
  }

  const nonTableLines = [...nonTableLineIndices].sort((a, b) => a - b).map(i => lines[i]);
  return { tables, nonTableLines };
}

function assignElementsToColumns(line: TextLine, colPositions: number[]): TableCellData[] {
  const cells: TableCellData[] = colPositions.map(x => ({
    text: "",
    x,
    width: 0,
    fontSize: 12,
    isBold: false,
  }));

  line.elements.forEach(el => {
    const roundedX = Math.round(el.x / TABLE_COL_ALIGN_THRESHOLD) * TABLE_COL_ALIGN_THRESHOLD;
    let bestIdx = 0;
    let bestDist = Infinity;
    colPositions.forEach((cp, idx) => {
      const dist = Math.abs(roundedX - cp);
      if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
    });
    cells[bestIdx].text += (cells[bestIdx].text ? " " : "") + el.text;
    cells[bestIdx].fontSize = el.fontSize;
    cells[bestIdx].isBold = el.isBold;
  });

  return cells;
}

function buildTable(rows: { lineIdx: number; cells: TableCellData[] }[], lines: TextLine[], colPositions: number[]): DetectedTable {
  return {
    rows: rows.map(r => ({ cells: r.cells, y: lines[r.lineIdx].y })),
    startY: lines[rows[0].lineIdx].y,
    endY: lines[rows[rows.length - 1].lineIdx].y,
  };
}

// ── Step 5: Image Extraction ─────────────────────────────────────────────────

async function extractPageImages(page: any, viewport: any): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  try {
    const ops = await page.getOperatorList();
    const imgKeys = new Set<string>();

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      // OPS.paintImageXObject = 85, OPS.paintJpegXObject = 82
      if (fn === 85 || fn === 82) {
        const imgName = ops.argsArray[i][0];
        if (imgKeys.has(imgName)) continue;
        imgKeys.add(imgName);

        try {
          const imgData = await page.objs.get(imgName);
          if (!imgData || !imgData.data) continue;

          // Render image to canvas to get PNG
          const canvas = document.createElement("canvas");
          canvas.width = imgData.width;
          canvas.height = imgData.height;
          const ctx = canvas.getContext("2d")!;
          const imageData = ctx.createImageData(imgData.width, imgData.height);

          // Handle different color spaces
          if (imgData.data.length === imgData.width * imgData.height * 4) {
            imageData.data.set(imgData.data);
          } else if (imgData.data.length === imgData.width * imgData.height * 3) {
            // RGB → RGBA
            for (let j = 0; j < imgData.width * imgData.height; j++) {
              imageData.data[j * 4] = imgData.data[j * 3];
              imageData.data[j * 4 + 1] = imgData.data[j * 3 + 1];
              imageData.data[j * 4 + 2] = imgData.data[j * 3 + 2];
              imageData.data[j * 4 + 3] = 255;
            }
          } else {
            // Grayscale
            for (let j = 0; j < imgData.width * imgData.height; j++) {
              const v = imgData.data[j] ?? 0;
              imageData.data[j * 4] = v;
              imageData.data[j * 4 + 1] = v;
              imageData.data[j * 4 + 2] = v;
              imageData.data[j * 4 + 3] = 255;
            }
          }

          ctx.putImageData(imageData, 0, 0);

          const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png"));
          if (blob && blob.size > 500) { // Skip tiny images (artifacts)
            const arrBuf = await blob.arrayBuffer();
            // Scale dimensions to viewport
            const scaleX = viewport.width / page.getViewport({ scale: 1 }).width;
            const scaleY = viewport.height / page.getViewport({ scale: 1 }).height;

            images.push({
              data: new Uint8Array(arrBuf),
              x: 0,
              y: 0,
              width: Math.min(imgData.width, viewport.width * 0.9),
              height: Math.min(imgData.height, viewport.height * 0.9),
              type: "png",
            });
          }
        } catch {
          // Skip unreadable images
        }
      }
    }
  } catch {
    // OperatorList may fail on some PDFs
  }
  return images;
}

// ── Step 7: Multi-Column Detection ───────────────────────────────────────────

function detectColumns(lines: TextLine[], pageWidth: number): number {
  if (lines.length < 5) return 1;

  // Look for a vertical gap in the middle of the page
  const midX = pageWidth / 2;
  let leftCount = 0;
  let rightCount = 0;
  let spanCount = 0;

  lines.forEach(line => {
    if (line.maxX < midX - COLUMN_GAP_MIN / 2) leftCount++;
    else if (line.minX > midX + COLUMN_GAP_MIN / 2) rightCount++;
    else spanCount++;
  });

  // If significant portion is split, it's 2-column
  if (leftCount > lines.length * 0.2 && rightCount > lines.length * 0.2) return 2;
  return 1;
}

// ── Step 8: Header/Footer Detection ──────────────────────────────────────────

interface HeaderFooterResult {
  headerLines: TextLine[];
  footerLines: TextLine[];
  bodyLines: TextLine[];
}

function separateHeaderFooter(
  allPagesLines: TextLine[][],
  pageHeight: number
): { headers: TextLine[]; footers: TextLine[] } {
  if (allPagesLines.length < 2) return { headers: [], footers: [] };

  // Find text that appears in the same Y zone across multiple pages
  const headers: TextLine[] = [];
  const footers: TextLine[] = [];

  // Check first page's top/bottom lines against other pages
  const firstPage = allPagesLines[0];

  firstPage.forEach(line => {
    // Header zone: Y close to pageHeight (top in PDF coords)
    if (line.y > pageHeight - HEADER_FOOTER_ZONE) {
      const repeats = allPagesLines.filter(pageLines =>
        pageLines.some(pl => Math.abs(pl.y - line.y) < 5 && pl.text.length > 0)
      ).length;
      if (repeats >= Math.min(allPagesLines.length, 3)) {
        headers.push(line);
      }
    }
    // Footer zone: Y close to 0 (bottom in PDF coords)
    if (line.y < HEADER_FOOTER_ZONE) {
      const repeats = allPagesLines.filter(pageLines =>
        pageLines.some(pl => Math.abs(pl.y - line.y) < 5 && pl.text.length > 0)
      ).length;
      if (repeats >= Math.min(allPagesLines.length, 3)) {
        footers.push(line);
      }
    }
  });

  return { headers, footers };
}

// ── Build DOCX Elements ──────────────────────────────────────────────────────

function paragraphToDocx(para: TextParagraph, pageMinX: number): Paragraph {
  const runs: TextRun[] = [];

  para.lines.forEach((line, lineIdx) => {
    line.elements.forEach((el, elIdx) => {
      // Add space between elements when needed
      let text = el.text;
      if (elIdx < line.elements.length - 1) {
        const nextEl = line.elements[elIdx + 1];
        const gap = nextEl.x - (el.x + el.width);
        if (gap > WORD_GAP_THRESHOLD) text += " ";
      }

      runs.push(new TextRun({
        text,
        size: ptToHalfPt(el.fontSize),
        bold: el.isBold,
        italics: el.isItalic,
        font: mapFont(el.fontName),
      }));
    });

    // Add line break between lines within same paragraph (not after last)
    if (lineIdx < para.lines.length - 1) {
      runs.push(new TextRun({ text: "", break: 1 }));
    }
  });

  const alignMap: Record<string, typeof AlignmentType[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justified: AlignmentType.JUSTIFIED,
  };

  const indent = Math.max(0, para.indent - pageMinX);

  const paragraphOptions: any = {
    children: runs,
    alignment: alignMap[para.alignment],
    spacing: { after: ptToTwip(para.avgFontSize * 0.4) },
  };

  if (indent > 5) {
    paragraphOptions.indent = { left: ptToTwip(indent) };
  }

  if (para.isHeading && para.headingLevel) {
    const headingMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
    };
    paragraphOptions.heading = headingMap[para.headingLevel];
  }

  return new Paragraph(paragraphOptions);
}

function tableToDocx(table: DetectedTable): Table {
  const rows = table.rows.map(row => {
    const cells = row.cells
      .filter(c => c.text.trim().length > 0 || row.cells.indexOf(c) === 0)
      .map(cell =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell.text.trim(),
                  size: ptToHalfPt(cell.fontSize),
                  bold: cell.isBold,
                  font: "Calibri",
                }),
              ],
            }),
          ],
          width: { size: Math.max(5, 100 / Math.max(row.cells.length, 1)), type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
        })
      );

    // Ensure at least one cell per row
    if (cells.length === 0) {
      cells.push(new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "" })] })],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
    }

    return new TableRow({ children: cells });
  });

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function imageToDocx(img: ExtractedImage, maxWidth: number): Paragraph {
  // Scale to fit page width
  let w = img.width;
  let h = img.height;
  if (w > maxWidth) {
    const ratio = maxWidth / w;
    w = maxWidth;
    h = h * ratio;
  }

  return new Paragraph({
    children: [
      new ImageRun({
        data: img.data,
        transformation: { width: w, height: h },
        type: img.type,
      } as any),
    ],
    spacing: { after: 200 },
  });
}

function mapFont(pdfFontName: string): string {
  const lower = pdfFontName.toLowerCase();
  if (lower.includes("arial") || lower.includes("helvetica")) return "Arial";
  if (lower.includes("times")) return "Times New Roman";
  if (lower.includes("courier")) return "Courier New";
  if (lower.includes("georgia")) return "Georgia";
  if (lower.includes("verdana")) return "Verdana";
  if (lower.includes("tahoma")) return "Tahoma";
  return "Calibri";
}

// ── Main Conversion: Exact Layout ────────────────────────────────────────────

export async function convertPdfToWordExact(
  file: File,
  pagesToConvert: number[],
  imageHandling: string,
  onProgress?: (progress: number, status: string) => void,
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pagesToConvert.length;

  // First pass: collect all page lines for header/footer detection
  onProgress?.(5, "Analyzing document structure...");
  const allPagesLines: TextLine[][] = [];
  const allPagesViewports: any[] = [];

  for (let idx = 0; idx < totalPages; idx++) {
    const pageNum = pagesToConvert[idx];
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    allPagesViewports.push(viewport);

    const textContent = await page.getTextContent();
    const elements = extractTextElements(textContent.items, textContent.styles);
    const lines = groupIntoLines(elements);
    allPagesLines.push(lines);

    onProgress?.(5 + Math.round((idx / totalPages) * 10), `Scanning page ${pageNum}...`);
  }

  // Detect headers/footers across pages
  const pageHeight = allPagesViewports[0]?.height || 792;
  const { headers: headerLines, footers: footerLines } = separateHeaderFooter(allPagesLines, pageHeight);
  const headerYs = new Set(headerLines.map(l => Math.round(l.y)));
  const footerYs = new Set(footerLines.map(l => Math.round(l.y)));

  // Build header/footer paragraphs for DOCX
  let docHeader: Header | undefined;
  let docFooter: Footer | undefined;

  if (headerLines.length > 0) {
    docHeader = new Header({
      children: headerLines.map(l => new Paragraph({
        children: l.elements.map(e => new TextRun({
          text: e.text + " ",
          size: ptToHalfPt(e.fontSize),
          bold: e.isBold,
          font: mapFont(e.fontName),
        })),
      })),
    });
  }

  if (footerLines.length > 0) {
    docFooter = new Footer({
      children: footerLines.map(l => new Paragraph({
        children: l.elements.map(e => new TextRun({
          text: e.text + " ",
          size: ptToHalfPt(e.fontSize),
          bold: e.isBold,
          font: mapFont(e.fontName),
        })),
      })),
    });
  }

  // Second pass: build sections
  const sections: any[] = [];

  for (let idx = 0; idx < totalPages; idx++) {
    const pageNum = pagesToConvert[idx];
    const page = await pdf.getPage(pageNum);
    const viewport = allPagesViewports[idx];
    const pageWidth = viewport.width;

    onProgress?.(
      15 + Math.round((idx / totalPages) * 75),
      `Reconstructing page ${pageNum} layout...`
    );

    // Filter out header/footer lines from body
    const bodyLines = allPagesLines[idx].filter(l => {
      const roundedY = Math.round(l.y);
      return !headerYs.has(roundedY) && !footerYs.has(roundedY);
    });

    // Detect tables
    const { tables, nonTableLines } = detectTables(bodyLines, pageWidth);

    // Detect columns
    const numColumns = detectColumns(bodyLines, pageWidth);

    // Group non-table lines into paragraphs
    const paragraphs = groupIntoParagraphs(nonTableLines, pageWidth);

    // Extract images if requested
    let images: ExtractedImage[] = [];
    if (imageHandling === "keep") {
      try {
        images = await extractPageImages(page, viewport);
      } catch { /* skip */ }
    }

    // Merge all elements and sort by Y position (top to bottom)
    const pageElements: PageElement[] = [];

    paragraphs.forEach(p => {
      pageElements.push({
        type: "paragraph",
        y: p.lines[0]?.y || 0,
        data: p,
      });
    });

    tables.forEach(t => {
      pageElements.push({
        type: "table",
        y: t.startY,
        data: t,
      });
    });

    images.forEach(img => {
      pageElements.push({
        type: "image",
        y: img.y || pageHeight,
        data: img,
      });
    });

    // Sort top to bottom (higher Y = higher on page in PDF coords)
    pageElements.sort((a, b) => b.y - a.y);

    // Find the minimum X for indent calculation
    const pageMinX = bodyLines.length > 0 ? Math.min(...bodyLines.map(l => l.minX)) : 0;

    // Convert to DOCX children
    const children: any[] = [];

    // Add images at the start if they seem to be at the top
    const topImages = images.filter(img => img.y > pageHeight * 0.7);
    topImages.forEach(img => {
      children.push(imageToDocx(img, pageWidth - 100));
    });

    pageElements.forEach(el => {
      if (el.type === "paragraph") {
        children.push(paragraphToDocx(el.data, pageMinX));
      } else if (el.type === "table") {
        children.push(tableToDocx(el.data));
        children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
      } else if (el.type === "image" && !topImages.includes(el.data)) {
        children.push(imageToDocx(el.data, pageWidth - 100));
      }
    });

    // Ensure at least one child per section
    if (children.length === 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    }

    const sectionProps: any = {
      page: {
        size: {
          width: ptToTwip(pageWidth),
          height: ptToTwip(viewport.height),
        },
        margin: {
          top: 720,
          bottom: 720,
          left: ptToTwip(Math.max(pageMinX - 10, 36)),
          right: 720,
        },
      },
    };

    if (numColumns === 2) {
      sectionProps.column = {
        space: ptToTwip(COLUMN_GAP_MIN),
        count: 2,
      };
    }

    if (docHeader) sectionProps.headers = { default: docHeader };
    if (docFooter) sectionProps.footers = { default: docFooter };

    sections.push({
      properties: sectionProps,
      children,
    });
  }

  onProgress?.(92, "Building Word document...");

  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);

  onProgress?.(100, "Done!");
  return blob;
}

// ── Main Conversion: OCR Mode ────────────────────────────────────────────────

export async function convertPdfToWordOCR(
  file: File,
  pagesToConvert: number[],
  ocrLanguage: string,
  onProgress?: (progress: number, status: string) => void,
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pagesToConvert.length;

  onProgress?.(5, "Initializing OCR engine...");
  const worker = await Tesseract.createWorker(ocrLanguage === "auto" ? "eng" : ocrLanguage);

  const sections: any[] = [];

  for (let idx = 0; idx < totalPages; idx++) {
    const pageNum = pagesToConvert[idx];
    onProgress?.(
      5 + Math.round((idx / totalPages) * 85),
      `Running OCR on page ${pageNum}...`
    );

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const { data } = await worker.recognize(canvas);

    const children: any[] = [];

    // Use Tesseract's paragraph/line structure for better reconstruction
    if (data.paragraphs && data.paragraphs.length > 0) {
      data.paragraphs.forEach((para: any) => {
        const text = para.text?.trim();
        if (!text) return;

        // Detect heading heuristic: short line, larger confidence blocks
        const isShort = text.length < 80 && !text.endsWith(".");
        const isUpperCase = text === text.toUpperCase() && text.length > 3;

        const runs: TextRun[] = [];

        // Clean OCR artifacts
        const cleaned = text
          .replace(/[|}{[\]]/g, "") // remove common OCR artifacts
          .replace(/\s{3,}/g, "  ") // reduce excessive spaces
          .replace(/([a-z])(\s)([a-z])/g, "$1$3") // fix broken words
          .trim();

        if (cleaned.length === 0) return;

        runs.push(new TextRun({
          text: cleaned,
          size: isShort && isUpperCase ? 28 : 22,
          bold: isShort && isUpperCase,
          font: "Calibri",
        }));

        children.push(new Paragraph({
          children: runs,
          spacing: { after: 200 },
          heading: isShort && isUpperCase ? HeadingLevel.HEADING_2 : undefined,
        }));
      });
    } else {
      // Fallback: split by lines
      const lines = data.text.split("\n").filter((l: string) => l.trim().length > 0);
      let currentParagraph: string[] = [];

      lines.forEach((line: string, i: number) => {
        const cleaned = line
          .replace(/[|}{[\]]/g, "")
          .replace(/\s{3,}/g, "  ")
          .trim();

        if (cleaned.length === 0) {
          if (currentParagraph.length > 0) {
            children.push(new Paragraph({
              children: [new TextRun({ text: currentParagraph.join(" "), size: 22, font: "Calibri" })],
              spacing: { after: 200 },
            }));
            currentParagraph = [];
          }
          return;
        }
        currentParagraph.push(cleaned);
      });

      if (currentParagraph.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: currentParagraph.join(" "), size: 22, font: "Calibri" })],
          spacing: { after: 200 },
        }));
      }
    }

    if (children.length === 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    }

    const origViewport = page.getViewport({ scale: 1.0 });
    sections.push({
      properties: {
        page: {
          size: { width: ptToTwip(origViewport.width), height: ptToTwip(origViewport.height) },
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children,
    });
  }

  await (worker as any).terminate();

  onProgress?.(95, "Building Word document...");
  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  onProgress?.(100, "Done!");
  return blob;
}

// ── Image-only conversion (scanned, no OCR) ──────────────────────────────────

export async function convertPdfToWordImage(
  file: File,
  pagesToConvert: number[],
  onProgress?: (progress: number, status: string) => void,
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pagesToConvert.length;
  const sections: any[] = [];

  for (let idx = 0; idx < totalPages; idx++) {
    const pageNum = pagesToConvert[idx];
    onProgress?.(Math.round((idx / totalPages) * 90), `Rendering page ${pageNum}...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const origViewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png"));
    if (!blob) continue;
    const arrBuf = await blob.arrayBuffer();

    sections.push({
      properties: {
        page: {
          size: { width: ptToTwip(origViewport.width), height: ptToTwip(origViewport.height) },
          margin: { top: 360, bottom: 360, left: 360, right: 360 },
        },
      },
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              data: new Uint8Array(arrBuf),
              transformation: {
                width: origViewport.width - 36,
                height: origViewport.height - 36,
              },
              type: "png",
            } as any),
          ],
        }),
      ],
    });
  }

  onProgress?.(95, "Building Word document...");
  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  onProgress?.(100, "Done!");
  return blob;
}
