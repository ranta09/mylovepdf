/**
 * MagicDOCX – Production-grade PDF → Word Engine
 * Converts PageLayout produced by documentProcessor.ts into a proper .docx Blob
 */

import * as pdfjsLib from "pdfjs-dist";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  LevelFormat,
  convertInchesToTwip,
  UnderlineType,
} from "docx";
import {
  analyzePageStructure,
  TextBlock,
  TableBlock,
  ExtractedImage,
  PageLayout,
  BlockType,
} from "./documentProcessor";
import { runOcrOnCanvas } from "./ocrEngine";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ptToTwip = (pt: number) => Math.round(pt * 20);
const ptToHalfPt = (pt: number) => Math.round(pt * 2);

function mapAlignment(align: string): any {
  switch (align) {
    case "center":    return AlignmentType.CENTER;
    case "right":     return AlignmentType.RIGHT;
    case "justified": return AlignmentType.JUSTIFIED;
    default:          return AlignmentType.LEFT;
  }
}

function mapHeadingLevel(type: BlockType): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  switch (type) {
    case "h1":    return HeadingLevel.HEADING_1;
    case "h2":    return HeadingLevel.HEADING_2;
    case "title": return HeadingLevel.HEADING_1;
    default:      return undefined;
  }
}

/**
 * Merge the text from a block's lines intelligently:
 * - Lines that end mid-sentence (no period/colon at end, next line start is lowercase) get a space
 * - Otherwise they get a newline (new paragraph within block)
 */
function mergeBlockText(block: TextBlock): string {
  const parts: string[] = [];
  for (let i = 0; i < block.lines.length; i++) {
    const line = block.lines[i];
    const next = block.lines[i + 1];
    parts.push(line.text);
    // Determine connector between current and next line
    if (next) {
      const endsWithBreak = /[.!?:;]$/.test(line.text.trim());
      const nextStartsLower = /^[a-z]/.test(next.text.trim());
      // If this line ends without sentence terminator and next line starts lowercase → wrap (space)
      if (!endsWithBreak && nextStartsLower) {
        parts.push(" ");
      } else if (!endsWithBreak) {
        // Likely a natural wrap – use space
        parts.push(" ");
      } else {
        // New sentence / paragraph break → newline
        parts.push("\n");
      }
    }
  }
  return parts.join("").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Element Builders
// ─────────────────────────────────────────────────────────────────────────────

function buildParagraph(block: TextBlock, mode: "exact" | "text"): Paragraph {
  const text = mergeBlockText(block);
  const headingLevel = mapHeadingLevel(block.type);
  const isBold = block.type === "h1" || block.type === "h2" || block.type === "title";

  // Build runs per line preserving individual bold/italic from elements
  const runs: TextRun[] = [];
  
  for (let li = 0; li < block.lines.length; li++) {
    const line = block.lines[li];
    
    // Segment the line by font style runs
    const lineRuns = buildLineRuns(line);
    runs.push(...lineRuns);
    
    // Add space/break between lines
    if (li < block.lines.length - 1) {
      const nextLine = block.lines[li + 1];
      const endsWithBreak = /[.!?:;]$/.test(line.text.trim());
      const nextStartsLower = /^[a-z]/.test(nextLine.text.trim());
      if (!endsWithBreak || nextStartsLower) {
        runs.push(new TextRun({ text: " " }));
      } else {
        runs.push(new TextRun({ break: 1 }));
      }
    }
  }

  const para: any = {
    alignment: mode === "exact" ? mapAlignment(block.alignment) : AlignmentType.LEFT,
    children: runs,
    spacing: {
      after: block.type === "h1" ? 280 : block.type === "h2" ? 200 : 120,
      before: block.type === "h1" ? 280 : block.type === "h2" ? 160 : 0,
    },
  };

  if (headingLevel !== undefined) {
    para.heading = headingLevel;
  }

  if (block.isBullet) {
    para.bullet = { level: block.listLevel || 0 };
  }

  if (mode === "exact" && block.x > 50) {
    para.indent = { left: ptToTwip(Math.min(block.x - 30, 200)) };
  }

  return new Paragraph(para);
}

function buildLineRuns(line: { elements: any[]; text: string; avgFontSize: number }): TextRun[] {
  if (!line.elements.length) {
    return [new TextRun({ text: line.text })];
  }

  // Group consecutive elements with same style
  const runs: TextRun[] = [];
  let currentStyle = { bold: line.elements[0].isBold, italic: line.elements[0].isItalic, fontSize: line.elements[0].fontSize };
  let currentText = "";

  for (let i = 0; i < line.elements.length; i++) {
    const el = line.elements[i];
    const sameStyle = el.isBold === currentStyle.bold && el.isItalic === currentStyle.italic;

    if (sameStyle) {
      const prevEl = line.elements[i - 1];
      if (prevEl) {
        const gap = el.x - (prevEl.x + prevEl.width);
        if (gap > 3) currentText += " ";
      }
      currentText += el.text;
    } else {
      if (currentText.trim()) {
        runs.push(new TextRun({
          text: currentText,
          bold: currentStyle.bold,
          italics: currentStyle.italic,
          size: ptToHalfPt(currentStyle.fontSize),
          font: "Calibri",
        }));
      }
      // Gap between styles
      const prevEl = line.elements[i - 1];
      if (prevEl) {
        const gap = el.x - (prevEl.x + prevEl.width);
        if (gap > 3) currentText = " " + el.text;
        else currentText = el.text;
      } else {
        currentText = el.text;
      }
      currentStyle = { bold: el.isBold, italic: el.isItalic, fontSize: el.fontSize };
    }
  }

  if (currentText.trim()) {
    runs.push(new TextRun({
      text: currentText.trim(),
      bold: currentStyle.bold,
      italics: currentStyle.italic,
      size: ptToHalfPt(currentStyle.fontSize),
      font: "Calibri",
    }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text: line.text })];
}

function buildTable(table: TableBlock, pageWidth: number): Table {
  // Calculate column widths proportionally
  const allPositions = [...new Set(table.rows.flatMap(r => r.cells.map(c => c.x)))].sort((a, b) => a - b);
  const totalWidth = table.width || pageWidth;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      left:   { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      right:  { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
    },
    rows: table.rows.map((row, rowIdx) =>
      new TableRow({
        tableHeader: rowIdx === 0, // First row is a header row
        children: row.cells.map(cell => {
          // Compute proportional width for this cell
          const cellWidthPct = Math.max(5, Math.round((cell.width / totalWidth) * 100));
          return new TableCell({
            width: { size: cellWidthPct, type: WidthType.PERCENTAGE },
            shading: rowIdx === 0 ? { fill: "F1F5F9" } : undefined,
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
              left:   { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
              right:  { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell.text,
                    bold: cell.bold || rowIdx === 0,
                    size: ptToHalfPt(cell.fontSize || 11),
                    font: "Calibri",
                  }),
                ],
                spacing: { after: 60, before: 60 },
              }),
            ],
          });
        }),
      })
    ),
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(",");
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return u8arr;
}

function buildImage(img: ExtractedImage, maxWidthPt: number): Paragraph | null {
  try {
    const u8arr = dataUrlToUint8Array(img.data);
    let w = img.width;
    let h = img.height;
    if (w > maxWidthPt) { h = h * (maxWidthPt / w); w = maxWidthPt; }
    if (w < 10 || h < 10) return null; // Skip tiny images

    return new Paragraph({
      children: [
        new ImageRun({
          data: u8arr,
          transformation: { width: Math.round(w), height: Math.round(h) },
          type: "jpg",
        } as any),
      ],
      spacing: { after: ptToTwip(8), before: ptToTwip(8) },
    });
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Spacing Normalizer
// ─────────────────────────────────────────────────────────────────────────────

/** Remove consecutive blank paragraphs from the output */
function normalizeChildren(children: any[]): any[] {
  const result: any[] = [];
  let lastWasBlank = false;
  for (const el of children) {
    const isBlank = el instanceof Paragraph && !(el as any).preparedDocument;
    // Keep all non-paragraph elements (tables, images)
    result.push(el);
    lastWasBlank = isBlank;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Conversion Engine
// ─────────────────────────────────────────────────────────────────────────────

export async function convertPdfToWord(
  file: File,
  options: {
    mode: "exact" | "text";
    pages: number[];
    useOcr: boolean;
    ocrLang?: string;
  },
  onProgress?: (p: number, s: string) => void
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const sections: any[] = [];

  onProgress?.(5, "Analyzing PDF structure...");

  for (let i = 0; i < options.pages.length; i++) {
    const pageNum = options.pages[i];
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    const progressPct = 5 + Math.round((i / options.pages.length) * 85);
    onProgress?.(progressPct, `Reconstructing page ${pageNum} of ${options.pages.length}...`);

    let layout: PageLayout;

    if (options.useOcr) {
      // ── OCR Path ──────────────────────────────────────────────────────────
      const ocrViewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = ocrViewport.width;
      canvas.height = ocrViewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport: ocrViewport }).promise;

      const ocrResult = await runOcrOnCanvas(canvas, options.ocrLang || "eng");

      // Post-process: collapse multiple spaces, fix word-break hyphens
      const cleanOcrText = ocrResult.paragraphs
        .map(p => p.text.replace(/-\s*\n/g, "").replace(/\s+/g, " ").trim())
        .filter(t => t.length > 0);

      layout = {
        blocks: cleanOcrText.map((pText, idx) => ({
          type: "paragraph" as const,
          lines: [{
            elements: [],
            y: idx * 30,
            minX: 0,
            maxX: viewport.width,
            avgFontSize: 11,
            text: pText,
          }],
          x: 0,
          y: idx * 30,
          width: viewport.width,
          height: 30,
          avgFontSize: 11,
          alignment: "left" as const,
        })),
        tables: [],
        images: [],
        width: viewport.width,
        height: viewport.height,
        columnCount: 1,
        medianFontSize: 11,
      };
    } else {
      // ── Standard Path ─────────────────────────────────────────────────────
      layout = await analyzePageStructure(page);
    }

    // ── Build Word Elements ────────────────────────────────────────────────
    const elements: { y: number; el: any }[] = [];

    // For multi-column: process column 0 first (left), then column 1 (right)
    const sortedBlocks = layout.columnCount > 1
      ? [
          ...layout.blocks.filter(b => b.column === 0),
          ...layout.blocks.filter(b => b.column === 1),
        ]
      : layout.blocks;

    sortedBlocks.forEach(b => {
      if (b.type === "header_footer") return;
      elements.push({ y: b.y, el: buildParagraph(b, options.mode) });
    });

    layout.tables.forEach(t => {
      elements.push({ y: t.startY, el: buildTable(t, viewport.width) });
    });

    if (options.mode !== "text") {
      for (const img of layout.images) {
        const para = buildImage(img, viewport.width - 72); // 36pt margin each side
        if (para) elements.push({ y: img.y, el: para });
      }
    }

    // Sort by Y (top-to-bottom reading order), respecting column layout already
    if (layout.columnCount <= 1) {
      elements.sort((a, b) => a.y - b.y);
    }

    const children = elements.map(e => e.el);

    if (children.length === 0) {
      children.push(new Paragraph({ children: [new TextRun("")] }));
    }

    sections.push({
      properties: {
        page: {
          size: {
            width: ptToTwip(viewport.width),
            height: ptToTwip(viewport.height),
          },
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children,
    });
  }

  onProgress?.(95, "Compiling Word document...");

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
            },
          ],
        },
      ],
    },
    sections,
  });

  const blob = await Packer.toBlob(doc);
  onProgress?.(100, "Done — your Word file is ready.");
  return blob;
}
