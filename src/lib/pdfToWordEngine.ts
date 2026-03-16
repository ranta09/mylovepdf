/**
 * MagicDOCX Professional PDF → Word Engine
 * Upgraded for professional-level layout reconstruction and OCR support.
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
  Header,
  Footer,
} from "docx";
import { 
  analyzePageStructure, 
  TextBlock, 
  TableBlock, 
  ExtractedImage, 
  PageLayout 
} from "./documentProcessor";
import { runOcrOnCanvas } from "./ocrEngine";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ptToTwip = (pt: number) => Math.round(pt * 20);
const ptToHalfPt = (pt: number) => Math.round(pt * 2);

function mapAlignment(align: string): any {
  switch (align) {
    case "center": return AlignmentType.CENTER;
    case "right": return AlignmentType.RIGHT;
    case "justified": return AlignmentType.JUSTIFIED;
    default: return AlignmentType.LEFT;
  }
}

function mapFont(fontName: string): string {
  const f = fontName.toLowerCase();
  if (f.includes("arial") || f.includes("helvetica")) return "Arial";
  if (f.includes("times")) return "Times New Roman";
  if (f.includes("courier")) return "Courier New";
  if (f.includes("georgia")) return "Georgia";
  return "Calibri";
}

// ── Word Element Builders ──────────────────────────────────────────────────

function blockToDocx(block: TextBlock, mode: "exact" | "text"): Paragraph {
  const text = block.lines.map(l => l.text).join(mode === "exact" ? "\n" : " ");
  
  return new Paragraph({
    alignment: mode === "exact" ? mapAlignment(block.alignment) : AlignmentType.LEFT,
    spacing: { after: mode === "exact" ? ptToTwip(block.avgFontSize * 0.4) : 200 },
    indent: mode === "exact" && block.x > 50 ? { left: ptToTwip(block.x - 50) } : undefined,
    children: [
      new TextRun({
        text,
        size: ptToHalfPt(block.avgFontSize),
        bold: block.type === "title" || block.isBullet,
        font: "Calibri",
      })
    ]
  });
}

function tableToDocx(table: TableBlock): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: table.rows.map(row => new TableRow({
      children: row.cells.map(cell => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ 
            text: cell.text, 
            size: ptToHalfPt(cell.fontSize), 
            bold: cell.bold 
          })],
        })],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        }
      }))
    }))
  });
}

async function imageToDocx(img: ExtractedImage, maxWidth: number): Promise<Paragraph> {
  // Convert dataURL to Uint8Array for docx
  const response = await fetch(img.data);
  const blob = await response.blob();
  const arrBuf = await blob.arrayBuffer();
  
  let w = img.width;
  let h = img.height;
  if (w > maxWidth) {
    h = h * (maxWidth / w);
    w = maxWidth;
  }

  return new Paragraph({
    children: [
      new ImageRun({
        data: new Uint8Array(arrBuf),
        transformation: { width: w, height: h },
        type: "jpg"
      } as any)
    ],
    spacing: { after: ptToTwip(10) }
  });
}

// ── Main Conversion Engine ───────────────────────────────────────────────────

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
    
    const progress = 5 + Math.round((i / options.pages.length) * 85);
    onProgress?.(progress, `Processing page ${pageNum}...`);

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
      
      // Map OCR paragraphs to TextBlocks
      layout = {
        blocks: ocrResult.paragraphs.map(p => ({
          type: "paragraph",
          lines: [{ text: p.text, elements: [], y: p.bbox.y0, minX: p.bbox.x0, maxX: p.bbox.x1, avgFontSize: 11 }],
          x: p.bbox.x0 / 2, // Scale back to 1.0
          y: p.bbox.y0 / 2,
          width: (p.bbox.x1 - p.bbox.x0) / 2,
          height: (p.bbox.y1 - p.bbox.y0) / 2,
          avgFontSize: 11,
          alignment: "left"
        })),
        tables: [],
        images: [],
        width: viewport.width,
        height: viewport.height
      };
    } else {
      // Standard Path
      layout = await analyzePageStructure(page);
    }

    // Build Word elements
    const children: any[] = [];
    
    // Sort items by Y descending (PDF top-to-bottom)
    const elements: { y: number; el: any }[] = [];
    
    layout.blocks.forEach(b => elements.push({ y: b.y, el: blockToDocx(b, options.mode) }));
    layout.tables.forEach(t => elements.push({ y: t.startY, el: tableToDocx(t) }));
    
    if (options.mode === "exact") {
      for (const img of layout.images) {
        elements.push({ y: img.y, el: await imageToDocx(img, viewport.width - 100) });
      }
    }

    elements.sort((a, b) => b.y - a.y);
    elements.forEach(e => children.push(e.el));

    if (children.length === 0) {
      children.push(new Paragraph({ children: [new TextRun("")] }));
    }

    sections.push({
      properties: {
        page: {
          size: { width: ptToTwip(viewport.width), height: ptToTwip(viewport.height) },
          margin: { top: 720, bottom: 720, left: 720, right: 720 }
        }
      },
      children
    });
  }

  onProgress?.(95, "Generating Word file...");
  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  onProgress?.(100, "Done");
  return blob;
}
