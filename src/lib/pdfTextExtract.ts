import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export async function extractTextFromPdf(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pages: string[] = [];
  let worker: Tesseract.Worker | null = null;

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(Math.round(((i - 1) / numPages) * 100), `Processing page ${i} of ${numPages}...`);

    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let text = content.items
      .map((item: any) => item.str)
      .join(" ");

    // If text is very sparse, it might be a scanned PDF
    if (text.trim().length < 100) {
      if (!worker) {
        onProgress?.(Math.round(((i - 1) / numPages) * 100), `Initializing OCR engine...`);
        worker = await createWorker('eng');
      }

      onProgress?.(Math.round(((i - 0.5) / numPages) * 100), `Running OCR on page ${i}...`);

      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const canvasContext = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (canvasContext) {
        await page.render({ canvasContext, viewport }).promise;
        const { data: { text: ocrText } } = await worker.recognize(canvas);
        text = ocrText;
      }
    }

    pages.push(text);
  }

  if (worker) {
    await (worker as any).terminate();
  }

  return pages.join("\n\n");
}
