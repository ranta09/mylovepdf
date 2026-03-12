/**
 * Universal Document Text Extractor
 * Supports: PDF, DOCX, XLSX, CSV, TXT, RTF, PPTX, PNG/JPG images, URL, EPUB
 */

import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import JSZip from "jszip";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface ExtractResult {
    text: string;
    pageCount?: number;
    method: string; // e.g. "pdf", "docx", "ocr", "url" etc.
    warning?: string;
}

// ── PDF ──────────────────────────────────────────────────────────────────────

async function extractPdf(
    file: File,
    onProgress?: (p: number, s: string) => void
): Promise<ExtractResult> {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const pages: string[] = [];
    let ocrWorker: Tesseract.Worker | null = null;

    for (let i = 1; i <= pdf.numPages; i++) {
        onProgress?.(Math.round((i / pdf.numPages) * 80), `Reading page ${i} of ${pdf.numPages}…`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let text = content.items.map((it: any) => it.str).join(" ");

        if (text.trim().length < 80) {
            if (!ocrWorker) {
                onProgress?.(Math.round((i / pdf.numPages) * 80), "Initialising OCR…");
                ocrWorker = await createWorker("eng");
            }
            onProgress?.(Math.round((i / pdf.numPages) * 80), `OCR on page ${i}…`);
            const vp = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
            const { data: { text: t } } = await ocrWorker.recognize(canvas);
            text = t;
        }
        pages.push(text);
    }

    if (ocrWorker) await (ocrWorker as any).terminate();
    return { text: pages.join("\n\n"), pageCount: pdf.numPages, method: "pdf" };
}

// ── DOCX ─────────────────────────────────────────────────────────────────────

async function extractDocx(file: File): Promise<ExtractResult> {
    const mammoth = await import("mammoth");
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return { text: value, method: "docx" };
}

// ── XLSX / XLS / CSV ─────────────────────────────────────────────────────────

async function extractSpreadsheet(file: File): Promise<ExtractResult> {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const lines: string[] = [];
    wb.SheetNames.forEach(name => {
        const ws = wb.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(ws);
        lines.push(`--- Sheet: ${name} ---\n${csv}`);
    });
    return { text: lines.join("\n\n"), method: "xlsx" };
}

// ── TXT / RTF ────────────────────────────────────────────────────────────────

async function extractText(file: File): Promise<ExtractResult> {
    const text = await file.text();
    // Strip RTF markup if needed
    const clean = text.replace(/\{\\[^}]+\}|\\[a-zA-Z]+\d* ?/g, "").replace(/\s+/g, " ");
    return { text: clean, method: "txt" };
}

// ── PPTX (ZIP-based XML extraction) ─────────────────────────────────────────

async function extractPptx(file: File): Promise<ExtractResult> {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const texts: string[] = [];

    const slideFiles = Object.keys(zip.files)
        .filter(k => /ppt\/slides\/slide\d+\.xml/.test(k))
        .sort();

    for (const sf of slideFiles) {
        const xml = await zip.files[sf].async("text");
        // Extract text runs from <a:t> tags
        const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g) ?? [];
        const slideText = matches.map(m => m.replace(/<[^>]+>/g, "")).join(" ");
        if (slideText.trim()) texts.push(slideText);
    }

    return {
        text: texts.join("\n\n"),
        pageCount: slideFiles.length,
        method: "pptx",
        warning: texts.length === 0 ? "No extractable text found in PPTX slides." : undefined,
    };
}

// ── EPUB ─────────────────────────────────────────────────────────────────────

async function extractEpub(file: File): Promise<ExtractResult> {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const htmlFiles = Object.keys(zip.files).filter(k => /\.(xhtml|html|htm)$/i.test(k)).sort();
    const texts: string[] = [];

    for (const hf of htmlFiles) {
        const content = await zip.files[hf].async("text");
        const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (plain.length > 50) texts.push(plain);
    }

    return { text: texts.join("\n\n"), method: "epub" };
}

// ── Image / OCR ───────────────────────────────────────────────────────────────

async function extractImage(
    file: File,
    onProgress?: (p: number, s: string) => void
): Promise<ExtractResult> {
    onProgress?.(20, "Initialising OCR engine…");
    const worker = await createWorker("eng");
    onProgress?.(50, "Recognising text from image…");
    const url = URL.createObjectURL(file);
    const { data: { text } } = await worker.recognize(url);
    URL.revokeObjectURL(url);
    await (worker as any).terminate();
    return { text, method: "ocr" };
}

// ── URL ──────────────────────────────────────────────────────────────────────

export async function extractUrl(url: string): Promise<ExtractResult> {
    // Use a CORS proxy for arbitrary URLs
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Could not fetch URL: ${res.status}`);
    const json = await res.json();
    const html: string = json.contents ?? "";
    // Strip HTML tags and normalise whitespace
    const text = html
        .replace(/<(style|script|noscript|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (text.length < 100) throw new Error("URL contained no readable text content.");
    return { text, method: "url" };
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function extractDocument(
    file: File,
    onProgress?: (p: number, s: string) => void
): Promise<ExtractResult> {
    const name = file.name.toLowerCase();
    const ext = name.split(".").pop() ?? "";

    onProgress?.(5, "Detecting file type…");

    if (ext === "pdf") return extractPdf(file, onProgress);
    if (ext === "docx" || ext === "doc") return extractDocx(file);
    if (ext === "xlsx" || ext === "xls" || ext === "csv") return extractSpreadsheet(file);
    if (ext === "txt" || ext === "rtf" || ext === "odt") return extractText(file);
    if (ext === "pptx" || ext === "ppt") return extractPptx(file);
    if (ext === "epub") return extractEpub(file);
    if (/^(png|jpe?g|tiff?|bmp|webp)$/.test(ext)) return extractImage(file, onProgress);

    // Fallback: try as plaintext
    try { return extractText(file); } catch {
        throw new Error(`Unsupported file type: .${ext}`);
    }
}

export const SUPPORTED_EXTENSIONS = ".pdf,.doc,.docx,.txt,.rtf,.odt,.ppt,.pptx,.xlsx,.xls,.csv,.epub,.png,.jpg,.jpeg,.tiff,.bmp,.webp";
