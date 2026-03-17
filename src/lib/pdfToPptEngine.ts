import * as pdfjsLib from "pdfjs-dist";
import pptxgen from "pptxgenjs";
import type { TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";
import { runOcrOnCanvas } from "./ocrEngine";

/* ---------------- TYPES ---------------- */

export interface PptConversionOptions {
  useOcr?: boolean;
  ocrLang?: string;
}

interface ExtractedTextRun {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
  color?: string;
}

interface TextLineGroup {
  runs: ExtractedTextRun[];
  y: number;
  minX: number;
  maxX: number;
  avgFontSize: number;
  fullText: string;
}

interface TextBlockGroup {
  lines: TextLineGroup[];
  x: number;
  y: number;
  width: number;
  height: number;
  avgFontSize: number;
  alignment: "left" | "center" | "right";
  isTitle: boolean;
}

/* ── Constants ────────────────────────────────────────────────────── */

const PPT_W = 10; // inches (16:9 layout)
const PPT_H = 5.625;
const LINE_Y_TOLERANCE = 3;
const WORD_GAP = 4;
const PARA_GAP_FACTOR = 1.5;
const RENDER_SCALE = 2.0; // for background image quality
const TEXT_RENDER_SCALE = 1.0; // for coordinate extraction

/* ── Coordinate Mapping ───────────────────────────────────────────── */

// PDF coords: origin bottom-left, Y goes up
// PPT coords: origin top-left, Y goes down, in inches

const toInchX = (pdfX: number, pageW: number) =>
  Math.max(0, Math.min((pdfX / pageW) * PPT_W, PPT_W - 0.1));

const toInchY = (pdfY: number, pageH: number) =>
  Math.max(0, Math.min(((pageH - pdfY) / pageH) * PPT_H, PPT_H - 0.1));

const toInchW = (pdfW: number, pageW: number) =>
  Math.max(0.3, Math.min((pdfW / pageW) * PPT_W, PPT_W));

const toInchH = (pdfH: number, pageH: number) =>
  Math.max(0.15, Math.min((pdfH / pageH) * PPT_H, PPT_H));

/* ── Text Extraction ──────────────────────────────────────────────── */

function extractTextRuns(textContent: any, viewport: any): ExtractedTextRun[] {
  const runs: ExtractedTextRun[] = [];

  for (const item of textContent.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const it = item as TextItem;
    const t = it.transform;
    const fontSize = Math.abs(t[0] || t[3] || 12);
    const font = (it.fontName || "").toLowerCase();

    runs.push({
      text: it.str,
      x: t[4],
      y: t[5],
      width: it.width || fontSize * it.str.length * 0.5,
      height: it.height || fontSize,
      fontSize,
      fontName: it.fontName || "",
      isBold: font.includes("bold") || font.includes("black"),
      isItalic: font.includes("italic") || font.includes("oblique"),
    });
  }

  return runs;
}

/* ── Line Grouping ────────────────────────────────────────────────── */

function groupIntoLines(runs: ExtractedTextRun[]): TextLineGroup[] {
  if (!runs.length) return [];

  const sorted = [...runs].sort((a, b) => {
    const yDiff = b.y - a.y; // top-to-bottom in reading order (higher Y = higher on page)
    if (Math.abs(yDiff) <= LINE_Y_TOLERANCE) return a.x - b.x;
    return yDiff;
  });

  const lines: TextLineGroup[] = [];
  let currentRuns: ExtractedTextRun[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const el = sorted[i];
    const lastY = currentRuns[currentRuns.length - 1].y;
    if (Math.abs(el.y - lastY) <= LINE_Y_TOLERANCE) {
      currentRuns.push(el);
    } else {
      lines.push(buildLine(currentRuns));
      currentRuns = [el];
    }
  }
  if (currentRuns.length) lines.push(buildLine(currentRuns));

  return lines;
}

function buildLine(runs: ExtractedTextRun[]): TextLineGroup {
  runs.sort((a, b) => a.x - b.x);

  let fullText = "";
  runs.forEach((r, i) => {
    if (i > 0) {
      const prev = runs[i - 1];
      if (r.x - (prev.x + prev.width) > WORD_GAP) fullText += " ";
    }
    fullText += r.text;
  });

  return {
    runs,
    y: runs[0].y,
    minX: runs[0].x,
    maxX: runs[runs.length - 1].x + runs[runs.length - 1].width,
    avgFontSize: runs.reduce((s, r) => s + r.fontSize, 0) / runs.length,
    fullText: fullText.trim(),
  };
}

/* ── Block Grouping ───────────────────────────────────────────────── */

function groupIntoBlocks(lines: TextLineGroup[], pageW: number, pageH: number): TextBlockGroup[] {
  if (!lines.length) return [];

  const blocks: TextBlockGroup[] = [];
  let current: TextLineGroup[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    const gap = Math.abs(prev.y - curr.y);
    const fontSizeChange = Math.abs(curr.avgFontSize - prev.avgFontSize) > 3;
    // Large gap or font size change = new block
    if (gap > prev.avgFontSize * PARA_GAP_FACTOR || fontSizeChange) {
      blocks.push(buildBlock(current, pageW, pageH));
      current = [curr];
    } else {
      current.push(curr);
    }
  }
  if (current.length) blocks.push(buildBlock(current, pageW, pageH));
  return blocks;
}

function buildBlock(lines: TextLineGroup[], pageW: number, pageH: number): TextBlockGroup {
  const avgFont = lines.reduce((s, l) => s + l.avgFontSize, 0) / lines.length;
  const minX = Math.min(...lines.map(l => l.minX));
  const maxX = Math.max(...lines.map(l => l.maxX));
  const maxY = Math.max(...lines.map(l => l.y)); // highest Y = top of block in PDF coords
  const minY = Math.min(...lines.map(l => l.y));

  const isTitle = avgFont > 16 && lines.length <= 3;

  let alignment: "left" | "center" | "right" = "left";
  const center = (minX + maxX) / 2;
  if (Math.abs(center - pageW / 2) < 40) alignment = "center";
  else if (minX > pageW * 0.55) alignment = "right";

  return {
    lines,
    x: minX,
    y: maxY,
    width: maxX - minX,
    height: (maxY - minY) + avgFont,
    avgFontSize: avgFont,
    alignment,
    isTitle,
  };
}

/* ── Table Detection ──────────────────────────────────────────────── */

interface DetectedTable {
  rows: { y: number; cells: { text: string; x: number; width: number; fontSize: number; bold: boolean }[] }[];
  startX: number;
  startY: number;
  width: number;
  height: number;
}

function detectTables(lines: TextLineGroup[], pageW: number): { tables: DetectedTable[]; remaining: TextLineGroup[] } {
  const COL_SNAP = 8;
  const tables: DetectedTable[] = [];
  const usedIndices = new Set<number>();

  // Build column histogram
  const colHist = new Map<number, number>();
  lines.forEach(line => {
    if (line.runs.length < 2) return;
    line.runs.forEach(r => {
      const snapped = Math.round(r.x / COL_SNAP) * COL_SNAP;
      colHist.set(snapped, (colHist.get(snapped) || 0) + 1);
    });
  });

  const colPositions = [...colHist.entries()]
    .filter(([_, count]) => count >= 3)
    .map(([x]) => x)
    .sort((a, b) => a - b);

  if (colPositions.length < 2) return { tables: [], remaining: lines };

  let tableRows: { idx: number; cells: any[] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.runs.length < 2) {
      if (tableRows.length >= 2) {
        const tbl = finalizeTable(tableRows, lines, colPositions);
        tables.push(tbl);
        tableRows.forEach(r => usedIndices.add(r.idx));
      }
      tableRows = [];
      continue;
    }

    let matchCount = 0;
    line.runs.forEach(r => {
      const snapped = Math.round(r.x / COL_SNAP) * COL_SNAP;
      if (colPositions.some(c => Math.abs(c - snapped) <= COL_SNAP)) matchCount++;
    });

    if (matchCount >= 2) {
      const cells = colPositions.map((cx, ci) => {
        const nextX = ci < colPositions.length - 1 ? colPositions[ci + 1] : cx + 100;
        const matching = line.runs.filter(r => {
          const snapped = Math.round(r.x / COL_SNAP) * COL_SNAP;
          return Math.abs(snapped - cx) <= COL_SNAP || (r.x >= cx && r.x < nextX);
        });
        return {
          text: matching.map(r => r.text).join(" ").trim(),
          x: cx,
          width: nextX - cx,
          fontSize: matching.length ? Math.max(...matching.map(r => r.fontSize)) : 12,
          bold: matching.some(r => r.isBold),
        };
      }).filter(c => c.text);

      if (cells.length >= 2) {
        tableRows.push({ idx: i, cells });
      } else {
        if (tableRows.length >= 2) {
          const tbl = finalizeTable(tableRows, lines, colPositions);
          tables.push(tbl);
          tableRows.forEach(r => usedIndices.add(r.idx));
        }
        tableRows = [];
      }
    } else {
      if (tableRows.length >= 2) {
        const tbl = finalizeTable(tableRows, lines, colPositions);
        tables.push(tbl);
        tableRows.forEach(r => usedIndices.add(r.idx));
      }
      tableRows = [];
    }
  }

  if (tableRows.length >= 2) {
    const tbl = finalizeTable(tableRows, lines, colPositions);
    tables.push(tbl);
    tableRows.forEach(r => usedIndices.add(r.idx));
  }

  return {
    tables,
    remaining: lines.filter((_, i) => !usedIndices.has(i)),
  };
}

function finalizeTable(rows: { idx: number; cells: any[] }[], lines: TextLineGroup[], colPositions: number[]): DetectedTable {
  const allX = rows.flatMap(r => r.cells.map((c: any) => c.x));
  const minX = Math.min(...allX);
  const maxX = Math.max(...rows.flatMap(r => r.cells.map((c: any) => c.x + c.width)));
  const startY = lines[rows[0].idx].y;
  const endY = lines[rows[rows.length - 1].idx].y;

  return {
    rows: rows.map(r => ({ y: lines[r.idx].y, cells: r.cells })),
    startX: minX,
    startY,
    width: maxX - minX,
    height: Math.abs(startY - endY) + 14,
  };
}

/* ── Image Extraction ─────────────────────────────────────────────── */

async function extractPageImages(page: any, viewport: any): Promise<{ data: string; x: number; y: number; w: number; h: number }[]> {
  const images: { data: string; x: number; y: number; w: number; h: number }[] = [];
  try {
    const ops = await page.getOperatorList();
    let curTransform = [1, 0, 0, 1, 0, 0];

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];

      if (fn === pdfjsLib.OPS.transform) {
        curTransform = args;
      } else if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
        const imgName = args[0];
        let imgObj: any;
        try {
          imgObj = await Promise.race([
            new Promise((resolve, reject) => {
              page.objs.get(imgName, (data: any) => data ? resolve(data) : reject(new Error("No data")));
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
          ]);
        } catch {
          try { imgObj = page.commonObjs.get(imgName); } catch { continue; }
        }

        if (!imgObj || !imgObj.data || !imgObj.width || !imgObj.height) continue;
        // Skip tiny images (likely artifacts)
        if (imgObj.width < 10 || imgObj.height < 10) continue;

        const canvas = document.createElement("canvas");
        canvas.width = imgObj.width;
        canvas.height = imgObj.height;
        const ctx = canvas.getContext("2d")!;
        const imageData = ctx.createImageData(imgObj.width, imgObj.height);

        if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
          imageData.data.set(imgObj.data);
        } else if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
          for (let j = 0, k = 0; j < imgObj.data.length; j += 3, k += 4) {
            imageData.data[k] = imgObj.data[j];
            imageData.data[k + 1] = imgObj.data[j + 1];
            imageData.data[k + 2] = imgObj.data[j + 2];
            imageData.data[k + 3] = 255;
          }
        } else continue;

        ctx.putImageData(imageData, 0, 0);
        const [a, , , d, tx, ty] = curTransform;

        images.push({
          data: canvas.toDataURL("image/png"),
          x: tx,
          y: ty,
          w: Math.abs(imgObj.width * (a || 1)),
          h: Math.abs(imgObj.height * (d || 1)),
        });
      }
    }
  } catch (err) {
    console.warn("Image extraction warning:", err);
  }
  return images;
}

/* ── Render Page as Background Image ──────────────────────────────── */

async function renderPageToImage(page: any, scale: number): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.92);
}

/* ── PPT Font Size Mapping ────────────────────────────────────────── */

function mapFontSize(pdfFontSize: number): number {
  // PDF font sizes tend to be in points already but we clamp for PPT readability
  if (pdfFontSize > 24) return Math.min(36, Math.round(pdfFontSize * 0.8));
  if (pdfFontSize > 14) return Math.round(pdfFontSize * 0.85);
  return Math.max(8, Math.round(pdfFontSize * 0.9));
}

/* ── MAIN CONVERTER ───────────────────────────────────────────────── */

export async function convertPdfToPptEditable(
  input: File | File[],
  options: PptConversionOptions = {},
  onProgress: (p: number, s: string) => void = () => {}
): Promise<Blob> {
  const files = Array.isArray(input) ? input : [input];
  const pptx = new pptxgen();

  pptx.layout = "LAYOUT_16x9";
  pptx.author = "MagicDOCX";
  pptx.company = "MagicDOCX";

  onProgress(2, "Loading documents...");

  let totalPages = 0;
  const docs: any[] = [];

  for (const f of files) {
    const buf = await f.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    totalPages += pdf.numPages;
    docs.push(pdf);
  }

  let processed = 0;

  for (const pdf of docs) {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      processed++;
      const pct = Math.round((processed / totalPages) * 93) + 2;
      onProgress(pct, `Converting page ${processed} of ${totalPages}...`);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: TEXT_RENDER_SCALE });
      const pageW = viewport.width;
      const pageH = viewport.height;

      const slide = pptx.addSlide();

      // ── Step 1: Render background image for visual fidelity ──
      const bgImage = await renderPageToImage(page, RENDER_SCALE);
      slide.addImage({
        data: bgImage,
        x: 0,
        y: 0,
        w: PPT_W,
        h: PPT_H,
      });

      // ── Step 2: Extract & overlay editable text ──
      if (options.useOcr) {
        // OCR path
        const ocrCanvas = document.createElement("canvas");
        const ocrVp = page.getViewport({ scale: 2.0 });
        ocrCanvas.width = ocrVp.width;
        ocrCanvas.height = ocrVp.height;
        const ocrCtx = ocrCanvas.getContext("2d")!;
        await page.render({ canvasContext: ocrCtx, viewport: ocrVp }).promise;

        const ocrResult = await runOcrOnCanvas(ocrCanvas, options.ocrLang || "eng");

        for (const para of ocrResult.paragraphs) {
          const { x0, y0, x1, y1 } = para.bbox;
          // OCR coords are in canvas pixels at scale 2.0
          const pdfX = x0 / 2;
          const pdfYTop = y0 / 2;
          const pdfW = (x1 - x0) / 2;
          const pdfH = (y1 - y0) / 2;

          const ix = toInchX(pdfX, pageW);
          const iy = Math.max(0, (pdfYTop / pageH) * PPT_H); // OCR Y is already top-down
          const iw = toInchW(pdfW, pageW);
          const ih = Math.max(0.15, (pdfH / pageH) * PPT_H);

          slide.addText(para.text, {
            x: ix,
            y: iy,
            w: Math.min(iw * 1.1, PPT_W - ix),
            h: ih,
            fontSize: 11,
            color: "000000",
            fontFace: "Arial",
            valign: "top",
            transparency: 100, // invisible overlay for selectability
          });
        }
      } else {
        // Standard text extraction
        const textContent = await page.getTextContent();
        const runs = extractTextRuns(textContent, viewport);

        if (runs.length > 0) {
          const lines = groupIntoLines(runs);
          const { tables, remaining } = detectTables(lines, pageW);
          const blocks = groupIntoBlocks(remaining, pageW, pageH);

          // Add text blocks as invisible editable overlays
          for (const block of blocks) {
            const text = block.lines.map(l => l.fullText).join("\n");
            if (!text.trim()) continue;

            // Convert PDF coords (bottom-left origin) to PPT coords (top-left origin)
            const topY = pageH - block.y; // top of the block in top-down coords
            const ix = toInchX(block.x, pageW);
            const iy = Math.max(0, (topY / pageH) * PPT_H);
            const iw = toInchW(block.width, pageW);
            const ih = Math.max(0.2, toInchH(block.height, pageH));

            // Build rich text runs for per-line styling
            const textRuns: any[] = [];
            block.lines.forEach((line, li) => {
              if (li > 0) textRuns.push({ text: "\n", options: { fontSize: 1 } });

              // Group runs in this line by font properties
              const lineRuns = line.runs;
              if (lineRuns.length === 0) {
                textRuns.push({
                  text: line.fullText,
                  options: {
                    fontSize: mapFontSize(line.avgFontSize),
                    bold: false,
                    italic: false,
                    color: "000000",
                    fontFace: "Arial",
                  },
                });
              } else {
                lineRuns.forEach((r, ri) => {
                  let prefix = "";
                  if (ri > 0) {
                    const prev = lineRuns[ri - 1];
                    if (r.x - (prev.x + prev.width) > WORD_GAP) prefix = " ";
                  }
                  textRuns.push({
                    text: prefix + r.text,
                    options: {
                      fontSize: mapFontSize(r.fontSize),
                      bold: r.isBold,
                      italic: r.isItalic,
                      color: "000000",
                      fontFace: "Arial",
                    },
                  });
                });
              }
            });

            slide.addText(textRuns, {
              x: ix,
              y: iy,
              w: Math.min(iw * 1.05, PPT_W - ix),
              h: ih,
              valign: "top",
              align: block.alignment,
              transparency: 100, // invisible but selectable/editable
              paraSpaceAfter: 2,
            });
          }

          // Add tables as editable PPT tables (visible)
          for (const table of tables) {
            // Normalize cell count per row
            const maxCols = Math.max(...table.rows.map(r => r.cells.length));

            const data = table.rows.map(r => {
              const row: any[] = r.cells.map(c => ({
                text: c.text,
                options: {
                  bold: c.bold,
                  fontSize: Math.max(7, mapFontSize(c.fontSize)),
                  valign: "middle" as const,
                  color: "333333",
                  fontFace: "Arial",
                },
              }));
              // Pad to maxCols
              while (row.length < maxCols) {
                row.push({ text: "", options: { fontSize: 8 } });
              }
              return row;
            });

            if (data.length === 0 || maxCols === 0) continue;

            const topY = pageH - table.startY;
            const tx = toInchX(table.startX, pageW);
            const ty = Math.max(0, (topY / pageH) * PPT_H);
            const tw = toInchW(table.width, pageW);

            slide.addTable(data, {
              x: tx,
              y: ty,
              w: Math.min(tw, PPT_W - tx),
              border: { type: "solid", pt: 0.5, color: "CCCCCC" },
              fill: { color: "FFFFFF" },
              transparency: 0,
            });
          }
        }
      }
    }
  }

  onProgress(97, "Building PowerPoint file...");
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  onProgress(100, "Done!");
  return blob;
}
