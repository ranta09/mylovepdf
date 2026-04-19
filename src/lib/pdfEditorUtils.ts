import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import type { TextBlock } from "./pdfTextExtractor";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TextOverlay {
    id: string;
    type: "text";
    text: string;
    x: number; // percent of page width
    y: number; // percent of page height
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    fontFamily?: string;
}

export interface ImageOverlay {
    id: string;
    type: "image";
    dataUrl: string; // base64
    x: number; // percent
    y: number;
    width: number;  // percent
    height: number; // percent
}

export interface AnnotationOverlay {
    id: string;
    type: "annotation";
    kind: "highlight" | "rectangle" | "ellipse" | "comment" | "freehand";
    x: number;
    y: number;
    width?: number;
    height?: number;
    color: string;
    text?: string;          // for comment kind
    points?: number[][];    // for freehand kind
}

export interface SignatureOverlay {
    id: string;
    type: "signature";
    dataUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export type Overlay = TextOverlay | ImageOverlay | AnnotationOverlay | SignatureOverlay;

export interface PageState {
    overlays: Overlay[];
    rotation: number; // 0, 90, 180, 270
}

export interface EditorState {
    pages: PageState[];
    pageOrder: number[]; // indices into original pages array
}

export function makeId() {
    return Math.random().toString(36).slice(2, 9);
}

// ─── Rendering ───────────────────────────────────────────────────────────────

export async function renderPdfPages(file: File, scale = 1.5): Promise<string[]> {
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const results: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        results.push(canvas.toDataURL("image/jpeg", 0.88));
    }

    return results;
}

// ─── Font selection helper ────────────────────────────────────────────────────

type FontVariants = { normal: any; bold: any; italic: any; boldItalic: any };
type FontMap = { helvetica: FontVariants; times: FontVariants; courier: FontVariants };

/** Pick the closest standard font for a TextBlock, respecting user overrides. */
function pickFont(fonts: FontMap, block: TextBlock): any {
    const family = (block.customFontFamily || block.cssFamily || "sans-serif").toLowerCase();
    const useBold   = block.customBold   !== undefined ? block.customBold   : (block.isBold   ?? false);
    const useItalic = block.customItalic !== undefined ? block.customItalic : (block.isItalic ?? false);

    const set: FontVariants =
        family === "times"   || family === "serif"     ? fonts.times   :
        family === "courier" || family === "monospace" ? fonts.courier :
        fonts.helvetica;

    if (useBold && useItalic) return set.boldItalic;
    if (useBold)              return set.bold;
    if (useItalic)            return set.italic;
    return set.normal;
}

const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
};

// ─── PDF Output ──────────────────────────────────────────────────────────────

export async function buildEditedPdf(
    originalFile: File,
    state: EditorState,
    onProgress?: (n: number) => void,
    textBlocksPerPage?: TextBlock[][]
): Promise<Uint8Array> {
    const bytes = await originalFile.arrayBuffer();
    const srcDoc = await PDFDocument.load(bytes);
    const outDoc = await PDFDocument.create();

    // Embed all 12 standard font variants ONCE for the whole document,
    // not once per page (was 12 embedFont calls × N pages before).
    const fonts: FontMap = {
        helvetica: {
            normal:     await outDoc.embedFont(StandardFonts.Helvetica),
            bold:       await outDoc.embedFont(StandardFonts.HelveticaBold),
            italic:     await outDoc.embedFont(StandardFonts.HelveticaOblique),
            boldItalic: await outDoc.embedFont(StandardFonts.HelveticaBoldOblique),
        },
        times: {
            normal:     await outDoc.embedFont(StandardFonts.TimesRoman),
            bold:       await outDoc.embedFont(StandardFonts.TimesRomanBold),
            italic:     await outDoc.embedFont(StandardFonts.TimesRomanItalic),
            boldItalic: await outDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
        },
        courier: {
            normal:     await outDoc.embedFont(StandardFonts.Courier),
            bold:       await outDoc.embedFont(StandardFonts.CourierBold),
            italic:     await outDoc.embedFont(StandardFonts.CourierOblique),
            boldItalic: await outDoc.embedFont(StandardFonts.CourierBoldOblique),
        },
    };

    const total = state.pageOrder.length;

    for (let idx = 0; idx < total; idx++) {
        onProgress?.(Math.round((idx / total) * 80));

        const srcPageIdx = state.pageOrder[idx];
        const [copiedPage] = await outDoc.copyPages(srcDoc, [srcPageIdx]);
        outDoc.addPage(copiedPage);

        const pg = outDoc.getPages()[idx];
        const pageState = state.pages[srcPageIdx];
        const { width, height } = pg.getSize();

        if (pageState.rotation !== 0) {
            pg.setRotation(degrees(pageState.rotation));
        }

        for (const overlay of pageState.overlays) {
            if (overlay.type === "text") {
                const o = overlay as TextOverlay;
                const absX = (o.x / 100) * width;
                const absY = height - (o.y / 100) * height;

                const family = (o.fontFamily || "helvetica").toLowerCase() as keyof typeof fonts;
                const fontSet = fonts[family] || fonts.helvetica;
                let selectedFont = fontSet.normal;
                if (o.bold && o.italic) selectedFont = fontSet.boldItalic;
                else if (o.bold) selectedFont = fontSet.bold;
                else if (o.italic) selectedFont = fontSet.italic;

                try {
                    pg.drawText(o.text, {
                        x: absX,
                        y: absY,
                        size: o.fontSize,
                        font: selectedFont,
                        color: hexToRgb(o.color),
                    });
                } catch {
                    pg.drawText(o.text, { x: absX, y: absY, size: o.fontSize, font: fonts.helvetica.normal, color: rgb(0, 0, 0) });
                }
            }

            if (overlay.type === "image") {
                const o = overlay as ImageOverlay;
                try {
                    const base64Data = o.dataUrl.split(",")[1];
                    const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                    const isPng = o.dataUrl.includes("image/png");
                    const embeddedImg = isPng
                        ? await outDoc.embedPng(imgBytes)
                        : await outDoc.embedJpg(imgBytes);

                    const absX = (o.x / 100) * width;
                    const absY = height - ((o.y + o.height) / 100) * height;
                    const absW = (o.width / 100) * width;
                    const absH = (o.height / 100) * height;

                    pg.drawImage(embeddedImg, { x: absX, y: absY, width: absW, height: absH });
                } catch { /* skip malformed images */ }
            }

            if (overlay.type === "annotation") {
                const o = overlay as AnnotationOverlay;
                const absX = (o.x / 100) * width;
                const absY = height - (o.y / 100) * height;
                const absW = o.width ? (o.width / 100) * width : 80;
                const absH = o.height ? (o.height / 100) * height : 20;
                const c = hexToRgb(o.color);

                if (o.kind === "highlight") {
                    pg.drawRectangle({ x: absX, y: absY - absH, width: absW, height: absH, color: rgb(1, 1, 0), opacity: 0.35 });
                } else if (o.kind === "rectangle") {
                    pg.drawRectangle({ x: absX, y: absY - absH, width: absW, height: absH, borderColor: c, borderWidth: 2 });
                } else if (o.kind === "ellipse") {
                    pg.drawEllipse({ x: absX + absW / 2, y: absY - absH / 2, xScale: absW / 2, yScale: absH / 2, borderColor: c, borderWidth: 2 });
                } else if (o.kind === "comment" && o.text) {
                    pg.drawRectangle({ x: absX, y: absY - 22, width: Math.max(100, o.text.length * 6), height: 20, color: rgb(1, 1, 0.6), opacity: 0.8 });
                    pg.drawText(o.text, { x: absX + 4, y: absY - 16, size: 9, font: fonts.helvetica.normal, color: rgb(0.2, 0.2, 0.2) });
                } else if (o.kind === "line" || o.kind === "arrow") {
                    const endX = o.width ? absX + (o.width / 100) * width : absX;
                    const endY = o.height ? absY - (o.height / 100) * height : absY;
                    pg.drawLine({ start: { x: absX, y: absY }, end: { x: endX, y: endY }, thickness: 2.5, color: c });
                    if (o.kind === "arrow") {
                       const dx = endX - absX;
                       const dy = endY - absY;
                       const len = Math.sqrt(dx*dx + dy*dy) || 1;
                       const ux = dx/len;
                       const uy = dy/len;
                       const arrowSize = 8;
                       const ax = endX - ux * arrowSize;
                       const ay = endY - uy * arrowSize;
                       const px = -uy * arrowSize * 0.5;
                       const py = ux * arrowSize * 0.5;
                       const path = `M ${endX} ${endY} L ${ax + px} ${ay + py} L ${ax - px} ${ay - py} Z`;
                       pg.drawSvgPath(path, { color: c });
                    }
                } else if (o.kind === "freehand" && o.points && o.points.length > 1) {
                    const pathParts = o.points.map((p, i) => {
                       const px = (p[0] / 100) * width;
                       const py = height - (p[1] / 100) * height;
                       return `${i === 0 ? "M" : "L"} ${px} ${py}`;
                    });
                    pg.drawSvgPath(pathParts.join(" "), { borderColor: c, borderWidth: 2 });
                }
            }

            if (overlay.type === "signature") {
                const o = overlay as SignatureOverlay;
                try {
                    const base64Data = o.dataUrl.split(",")[1];
                    const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                    const sig = await outDoc.embedPng(imgBytes);
                    const absX = (o.x / 100) * width;
                    const absY = height - ((o.y + o.height) / 100) * height;
                    pg.drawImage(sig, { x: absX, y: absY, width: (o.width / 100) * width, height: (o.height / 100) * height });
                } catch { /* skip */ }
            }
        }

        // ── Apply dirty text-block edits: white-cover original → draw replacement ──
        const dirtyBlocks = (textBlocksPerPage?.[srcPageIdx] ?? []).filter(b => b.isDirty);
        for (const block of dirtyBlocks) {
            // Scale factor: PDF-unit (scale=1) → actual page size in points
            const scaleX = width  / block.pdfPageWidth;
            const scaleY = height / block.pdfPageHeight;

            // block.pdfY is the text BASELINE in PDF-unit space.
            // In pdf-lib coordinates (bottom-left origin), we keep it as-is.
            const bx = block.pdfX * scaleX;
            const by = block.pdfY * scaleY;   // baseline in output page coords
            const bw = (block.pdfWidth || block.pdfFontSize * block.originalText.length * 0.55) * scaleX;
            const fs = block.pdfFontSize * scaleY; // font size in output pts

            // White cover: from below the descenders to above the ascenders.
            // Typical Latin glyphs: ascender ≈ 0.85 × fs, descender ≈ 0.25 × fs
            pg.drawRectangle({
                x:      bx - 2,
                y:      by - fs * 0.30,          // descenders below baseline
                width:  Math.max(bw + 4, 12),
                height: fs * 1.20,               // ascenders + descenders
                color:  rgb(1, 1, 1),
                opacity: 1,
            });

            if (!block.text.trim()) continue;

            // Choose the closest matching standard font (detected + user overrides)
            const selectedFont = pickFont(fonts, block);
            const drawSize = Math.max(4, fs);
            const textColor = block.customColor ? hexToRgb(block.customColor) : rgb(0, 0, 0);

            // Horizontal alignment within the original block width
            let textX = bx;
            try {
                const tW = selectedFont.widthOfTextAtSize(block.text, drawSize);
                if (block.customAlign === "center") textX = bx + (bw - tW) / 2;
                else if (block.customAlign === "right")  textX = bx + bw - tW;
            } catch { /* widthOfTextAtSize may fail for some chars */ }

            // Draw replacement text at the original baseline
            try {
                pg.drawText(block.text, {
                    x:    textX,
                    y:    by,          // draw at baseline — same as original
                    size: drawSize,
                    font: selectedFont,
                    color: textColor,
                });

                // Underline drawn 1 pt below baseline
                if (block.customUnderline) {
                    try {
                        const tW = selectedFont.widthOfTextAtSize(block.text, drawSize);
                        pg.drawLine({
                            start: { x: textX, y: by - 1 },
                            end:   { x: textX + tW, y: by - 1 },
                            thickness: Math.max(0.5, drawSize * 0.06),
                            color: textColor,
                        });
                    } catch { /* skip if width calc fails */ }
                }
            } catch { /* skip blocks with characters the chosen font cannot encode */ }
        }
    }

    onProgress?.(100);
    return outDoc.save();
}
