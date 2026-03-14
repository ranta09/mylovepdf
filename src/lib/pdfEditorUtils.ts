import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

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

// ─── PDF Output ──────────────────────────────────────────────────────────────

export async function buildEditedPdf(
    originalFile: File,
    state: EditorState,
    onProgress?: (n: number) => void
): Promise<Uint8Array> {
    const bytes = await originalFile.arrayBuffer();
    const srcDoc = await PDFDocument.load(bytes);
    const outDoc = await PDFDocument.create();

    const srcPages = srcDoc.getPages();
    const total = state.pageOrder.length;

    for (let idx = 0; idx < total; idx++) {
        onProgress?.(Math.round((idx / total) * 80));

        const srcPageIdx = state.pageOrder[idx];
        const [copiedPage] = await outDoc.copyPages(srcDoc, [srcPageIdx]);
        outDoc.addPage(copiedPage);

        const pg = outDoc.getPages()[idx];
        const pageState = state.pages[srcPageIdx];
        const { width, height } = pg.getSize();

        // Apply rotation
        if (pageState.rotation !== 0) {
            pg.setRotation(degrees(pageState.rotation));
        }

        const fonts = {
            helvetica: {
                normal: await outDoc.embedFont(StandardFonts.Helvetica),
                bold: await outDoc.embedFont(StandardFonts.HelveticaBold),
                italic: await outDoc.embedFont(StandardFonts.HelveticaOblique),
                boldItalic: await outDoc.embedFont(StandardFonts.HelveticaBoldOblique),
            },
            times: {
                normal: await outDoc.embedFont(StandardFonts.TimesRoman),
                bold: await outDoc.embedFont(StandardFonts.TimesRomanBold),
                italic: await outDoc.embedFont(StandardFonts.TimesRomanItalic),
                boldItalic: await outDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
            },
            courier: {
                normal: await outDoc.embedFont(StandardFonts.Courier),
                bold: await outDoc.embedFont(StandardFonts.CourierBold),
                italic: await outDoc.embedFont(StandardFonts.CourierOblique),
                boldItalic: await outDoc.embedFont(StandardFonts.CourierBoldOblique),
            }
        };

        for (const overlay of pageState.overlays) {
            if (overlay.type === "text") {
                const o = overlay as TextOverlay;
                const absX = (o.x / 100) * width;
                const absY = height - (o.y / 100) * height;
                const hexToRgb = (hex: string) => {
                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                    const b = parseInt(hex.slice(5, 7), 16) / 255;
                    return rgb(r, g, b);
                };

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
                const hexToRgb = (hex: string) => {
                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                    const b = parseInt(hex.slice(5, 7), 16) / 255;
                    return rgb(r, g, b);
                };
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
    }

    onProgress?.(100);
    return outDoc.save();
}
