import * as pdfjsLib from "pdfjs-dist";
import pptxgen from "pptxgenjs";
import { 
  analyzePageStructure, 
  TextBlock, 
  TableBlock, 
  toPptX, 
  toPptY, 
  toPptW, 
  toPptH,
  PPT_WIDTH,
  PageLayout
} from "./documentProcessor";
import { runOcrOnCanvas } from "./ocrEngine";

/* ---------------- TYPES ---------------- */

export interface PptConversionOptions {
  useOcr?: boolean;
  ocrLang?: string;
}

/* ---------------- MAIN CONVERTER ---------------- */

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

  onProgress(2, "Initializing engine...");

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
    for (let i = 1; i <= pdf.numPages; i++) {
      processed++;
      const progress = Math.round((processed / totalPages) * 95);
      onProgress(progress, `Processing page ${i}`);

      const page = await pdf.getPage(i);
      let layout: PageLayout;

      if (options.useOcr) {
        // OCR Path
        const ocrViewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = ocrViewport.width;
        canvas.height = ocrViewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: ocrViewport }).promise;
        
        const ocrResult = await runOcrOnCanvas(canvas, options.ocrLang || "eng");
        
        layout = {
          blocks: ocrResult.paragraphs.map(p => ({
            type: "paragraph",
            lines: [{ text: p.text, elements: [], y: p.bbox.y0, minX: p.bbox.x0, maxX: p.bbox.x1, avgFontSize: 14 }],
            x: p.bbox.x0 / 2,
            y: p.bbox.y0 / 2,
            width: (p.bbox.x1 - p.bbox.x0) / 2,
            height: (p.bbox.y1 - p.bbox.y0) / 2,
            avgFontSize: 14,
            alignment: "left"
          })),
          tables: [],
          images: [],
          width: ocrViewport.width / 2,
          height: ocrViewport.height / 2
        };
      } else {
        layout = await analyzePageStructure(page);
      }

      const slide = pptx.addSlide();

      // Ensure every slide has a title-like structure if detected
      const titleBlock = layout.blocks.find(b => b.type === "title");

      layout.blocks.forEach((b: TextBlock) => {
        const text = b.lines.map((l) => l.text).join("\n");

        slide.addText(text, {
          x: toPptX(b.x, layout.width),
          y: toPptY(b.y, layout.height, b.avgFontSize),
          w: Math.min(toPptW(b.width, layout.width) * 1.2, PPT_WIDTH - 1),
          h: toPptH(b.height, layout.height),
          fontSize: Math.max(10, Math.min(28, b.avgFontSize * 0.85)),
          bold: b.type === "title" || b === titleBlock,
          align: b.alignment as any,
          color: b.type === "title" ? "000000" : "333333"
        });
      });

      layout.tables.forEach((t: TableBlock) => {
        const data = t.rows.map((r) =>
          r.cells.map((c) => ({
            text: c.text,
            options: {
              bold: c.bold,
              fontSize: Math.max(8, c.fontSize * 0.8),
              valign: "middle" as any
            },
          }))
        );

        slide.addTable(data, {
          x: toPptX(t.startX, layout.width),
          y: toPptY(t.startY, layout.height, 12),
          w: toPptW(t.width, layout.width),
          border: { type: "solid", pt: 0.5, color: "BBBBBB" },
          fill: { color: "FFFFFF" }
        });
      });

      layout.images.forEach((img) => {
        slide.addImage({
          data: img.data,
          x: toPptX(img.x, layout.width),
          y: toPptY(img.y, layout.height, 0),
          w: toPptW(img.width, layout.width),
          h: toPptH(img.height, layout.height),
        });
      });
    }
  }

  onProgress(98, "Finalizing PPTX...");
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  onProgress(100, "Done");
  return blob;
}