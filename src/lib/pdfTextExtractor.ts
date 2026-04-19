import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TextBlock {
  id: string;
  pageIdx: number;
  // Position as % of the rendered image (at renderScale)
  x: number;
  y: number;
  width: number;
  height: number;
  // Content
  text: string;
  originalText: string;
  isDirty: boolean;
  // PDF coordinate space (bottom-left origin, points) — used when saving
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfFontSize: number;
  pdfPageWidth: number;
  pdfPageHeight: number;
  // Rendered font size at renderScale (px)
  renderedFontSize: number;
  // Detected font metadata — read directly from the embedded PDF font name
  fontName: string;                                // Raw name from pdf.js
  cssFamily: "sans-serif" | "serif" | "monospace"; // Mapped CSS family
  isBold: boolean;
  isItalic: boolean;
  // Per-block user overrides applied via toolbar (undefined = use detected value)
  customColor?: string;
  customFontFamily?: string;  // "helvetica" | "times" | "courier"
  customBold?: boolean;
  customItalic?: boolean;
  customUnderline?: boolean;
  customAlign?: "left" | "center" | "right";
}

// ─── Font name parsing ────────────────────────────────────────────────────────

interface RawItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

/**
 * Parse an embedded PDF font name (possibly subset-prefixed like
 * "TCKYFU+Times-BoldItalicMT") and return CSS family + bold/italic flags.
 */
function parseFontName(raw: string): {
  cssFamily: "sans-serif" | "serif" | "monospace";
  isBold: boolean;
  isItalic: boolean;
} {
  // Strip 6-char random subset prefix: "ABCDEF+FontName" → "FontName"
  const name = raw.replace(/^[A-Z]{6}\+/, "").toLowerCase();

  const isBold   = /bold|black|heavy|semibold|demibold|demi|extrabold|heavy/.test(name);
  const isItalic = /italic|oblique|slant(?:ed)?/.test(name);

  let cssFamily: "sans-serif" | "serif" | "monospace" = "sans-serif";
  if (/times|roman|georgia|garamond|palatino|bookman|caslon|bodoni|baskerville|minion|cambria|charter|didot/.test(name)) {
    cssFamily = "serif";
  } else if (/courier|mono(?:space)?|consol|inconsolata|typewriter|source.?code|menlo|monaco|fira.?code|jetbrains|lucida.?console/.test(name)) {
    cssFamily = "monospace";
  }

  return { cssFamily, isBold, isItalic };
}

// ─── Line grouping ────────────────────────────────────────────────────────────

/**
 * Group items into lines by Y proximity.
 * Tolerance is 55 % of the dominant font size so items on the same visual
 * baseline are merged while items on adjacent lines are kept separate.
 */
function groupIntoLines(items: RawItem[]): RawItem[][] {
  if (!items.length) return [];

  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);

  const lines: RawItem[][] = [];
  let currentLine: RawItem[] = [sorted[0]];
  let currentY    = sorted[0].transform[5];
  let currentSize = Math.abs(sorted[0].transform[3]) || 10;

  for (let i = 1; i < sorted.length; i++) {
    const item     = sorted[i];
    const fontSize = Math.abs(item.transform[3]) || 10;
    const tol      = Math.max(currentSize, fontSize) * 0.55;

    if (Math.abs(item.transform[5] - currentY) < tol) {
      currentLine.push(item);
    } else {
      lines.push(currentLine.sort((a, b) => a.transform[4] - b.transform[4]));
      currentLine  = [item];
      currentY     = item.transform[5];
      currentSize  = fontSize;
    }
  }
  lines.push(currentLine.sort((a, b) => a.transform[4] - b.transform[4]));
  return lines;
}

/**
 * Within a sorted line, split at horizontal gaps wider than 2.5× the font
 * size.  This separates columns, labels, and page numbers that happen to
 * share the same baseline into independent editable blocks.
 */
function splitByGap(items: RawItem[]): RawItem[][] {
  if (items.length <= 1) return [items];

  const chunks: RawItem[][] = [];
  let current: RawItem[] = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const prev      = items[i - 1];
    const curr      = items[i];
    const prevRight = prev.transform[4] + (prev.width || 0);
    const gap       = curr.transform[4] - prevRight;
    const fontSize  = Math.abs(curr.transform[3]) || 10;

    if (gap > fontSize * 2.5) {
      chunks.push(current);
      current = [curr];
    } else {
      current.push(curr);
    }
  }
  chunks.push(current);
  return chunks;
}

// ─── Main extractor ───────────────────────────────────────────────────────────

export async function extractTextBlocks(
  file: File,
  pageIdx: number,
  renderScale = 2.0
): Promise<TextBlock[]> {
  const bytes = await file.arrayBuffer();
  const pdf   = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page  = await pdf.getPage(pageIdx + 1);

  const viewport    = page.getViewport({ scale: renderScale });
  const pdfViewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();

  const rawItems: RawItem[] = textContent.items
    .filter((it): it is pdfjsLib.TextItem => "str" in it && it.str.trim().length > 0)
    .map(it => ({
      str:       it.str,
      transform: it.transform as number[],
      width:     (it as any).width  ?? 0,
      height:    (it as any).height ?? 0,
      fontName:  (it as any).fontName ?? "",
    }));

  const lines  = groupIntoLines(rawItems);
  const blocks: TextBlock[] = [];

  for (const line of lines) {
    const chunks = splitByGap(line);

    for (const chunk of chunks) {
      // Concatenate exactly as pdf.js gives the strings (spaces embedded)
      const text = chunk.map(i => i.str).join("");
      if (!text.trim()) continue;

      const first = chunk[0];
      const last  = chunk[chunk.length - 1];

      const pdfX        = first.transform[4];
      const pdfY        = first.transform[5]; // baseline in PDF coords
      const pdfFontSize = Math.abs(first.transform[3]) || 10;

      // Width in PDF-point space
      const pdfWidth =
        last === first
          ? (first.width || pdfFontSize * text.length * 0.55)
          : (last.transform[4] - first.transform[4]) + (last.width || pdfFontSize * 0.55);

      // Dominant font by character count
      const votes = new Map<string, number>();
      for (const item of chunk) {
        votes.set(item.fontName, (votes.get(item.fontName) ?? 0) + item.str.length);
      }
      const dominantFont = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      const { cssFamily, isBold, isItalic } = parseFontName(dominantFont);

      // Convert PDF baseline → viewport pixel
      const [vpX, vpY]   = viewport.convertToViewportPoint(pdfX, pdfY);
      const renderedFontSize = pdfFontSize * renderScale;

      // Block top-left as % of rendered image
      const xPct      = (vpX / viewport.width)  * 100;
      const yPct      = ((vpY - renderedFontSize) / viewport.height) * 100;
      const [vpX2]    = viewport.convertToViewportPoint(pdfX + pdfWidth, pdfY);
      const widthPct  = Math.max(1,   ((vpX2 - vpX) / viewport.width)  * 100);
      const heightPct = Math.max(0.5, (renderedFontSize * 1.35 / viewport.height) * 100);

      // Skip blocks that are completely outside the page (rotated PDFs etc.)
      if (xPct < -5 || yPct < -5 || xPct > 105 || yPct > 105) continue;

      blocks.push({
        id:            `tb-${pageIdx}-${blocks.length}`,
        pageIdx,
        x: xPct, y: yPct, width: widthPct, height: heightPct,
        text,
        originalText: text,
        isDirty:      false,
        pdfX, pdfY, pdfWidth,
        pdfFontSize,
        pdfPageWidth:  pdfViewport.width,
        pdfPageHeight: pdfViewport.height,
        renderedFontSize,
        fontName: dominantFont,
        cssFamily,
        isBold,
        isItalic,
      });
    }
  }

  return blocks;
}
