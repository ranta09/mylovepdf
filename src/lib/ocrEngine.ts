import { createWorker } from "tesseract.js";

export interface OcrResult {
  text: string;
  confidence: number;
  paragraphs: {
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }[];
}

interface TesseractParagraph {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/**
 * Preprocesses a canvas for better OCR results.
 * Applies grayscale, contrast enhancement, and simple binarization.
 */
export function preprocessCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Grayscale
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Contrast Enhancement (simple threshold-based)
    // Values below 128 become darker, above become lighter
    const contrast = 1.2;
    gray = (gray - 128) * contrast + 128;
    
    // Binarization (simple threshold)
    const threshold = 120;
    const final = gray < threshold ? 0 : 255;

    data[i] = final;
    data[i + 1] = final;
    data[i + 2] = final;
  }

  ctx.putImageData(imageData, 0, 0);
}

export async function runOcrOnCanvas(
  canvas: HTMLCanvasElement,
  language: string = "eng",
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  // Apply preprocessing before OCR
  preprocessCanvas(canvas);

  const worker = await createWorker(language, 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(m.progress);
      }
    },
  });
  
  try {
    const { data } = await worker.recognize(canvas);
    
    // Explicitly type paragraphs from Tesseract data
    const rawParagraphs = (data as { paragraphs?: TesseractParagraph[] }).paragraphs;
    const paragraphs = rawParagraphs?.map((p: TesseractParagraph) => ({
      text: p.text,
      bbox: p.bbox
    })) || [];

    return {
      text: data.text,
      confidence: data.confidence,
      paragraphs
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Analyzes a PDF document to detect scanned pages and searchable text.
 */
export async function analyzePdfDocument(pdf: any): Promise<{
  totalCount: number;
  scannedCount: number;
  hasText: boolean;
  languageHint?: string;
}> {
  let scannedCount = 0;
  let hasText = false;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const isTextPresent = content.items.some((item: any) => item.str && item.str.trim().length > 0);
    
    if (isTextPresent) {
      hasText = true;
    } else {
      scannedCount++;
    }
  }

  return {
    totalCount: pdf.numPages,
    scannedCount,
    hasText,
  };
}

/**
 * Detects if a PDF page actually has selectable text.
 * If not, it suggests OCR.
 * @deprecated Use analyzePdfDocument for more comprehensive analysis
 */
export async function isScannedPage(page: any): Promise<boolean> {
  const textContent = await page.getTextContent();
  const hasText = textContent.items.some((item: any) => item.str && item.str.trim().length > 0);
  return !hasText;
}
