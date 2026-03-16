/**
 * MagicDOCX Professional PDF → Image Engine
 * High-resolution rasterization and export.
 */

import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

export interface PageConversionOptions {
  page: number;
  rotation: number;
}

export interface ImageConversionOptions {
  format: "jpg" | "png";
  quality: number;
  dpi: number;
  pages?: number[];
  pageSettings?: PageConversionOptions[];
}

export interface ImageResult {
  blob: Blob;
  filename: string;
  dataUrl: string;
}

export async function convertPdfToImages(
  file: File,
  options: ImageConversionOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<ImageResult[]> {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  
  const pagesToConvert = options.pages || Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  const totalPages = pagesToConvert.length;
  const results: ImageResult[] = [];

  // Professional scaling: 72 DPI is base. 
  // 300 DPI = 300 / 72 = 4.16x scale
  const scale = options.dpi / 72;
  const mimeType = options.format === "jpg" ? "image/jpeg" : "image/png";

  for (let idx = 0; idx < totalPages; idx++) {
    const pageNum = pagesToConvert[idx];
    const pageSetting = options.pageSettings?.find(s => s.page === pageNum);
    const manualRotation = pageSetting?.rotation || 0;

    onProgress?.(Math.round((idx / totalPages) * 100), `Rendering page ${pageNum}...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale, rotation: manualRotation });
    
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    
    // Fill white background for JPG (since it doesn't support transparency)
    if (options.format === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const dataUrl = canvas.toDataURL(mimeType, options.quality);
    const blob = await (await fetch(dataUrl)).blob();
    
    results.push({
      blob,
      filename: `${file.name.replace(/\.[^/.]+$/, "")}_page_${pageNum}.${options.format}`,
      dataUrl
    });
  }

  onProgress?.(100, "Done");
  return results;
}

export async function packageImagesToZip(results: ImageResult[]): Promise<Blob> {
  const zip = new JSZip();
  results.forEach(res => {
    zip.file(res.filename, res.blob);
  });
  return await zip.generateAsync({ type: "blob" });
}
