import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

export type ElementType = "image" | "text" | "checkbox";

export interface PlacedElement {
  id: string;
  type: ElementType;
  page: number; // 1-indexed
  x: number; // percentage of width 0-1
  y: number; // percentage of height 0-1
  width: number; // percentage of page width
  height: number; // percentage of page height
  rotation: number; // degrees
  data: string; // Base64 image, text string, or checkbox state
  fontFamily?: string; // for text
  color?: string; // hex string e.g. "#000000"
}

/**
 * Embeds highly-customizable user elements (signatures, text, dates) directly onto the PDF.
 */
export const applySignaturesToPdf = async (
  fileBytes: ArrayBuffer,
  elements: PlacedElement[],
  onProgress?: (p: number) => void
): Promise<Uint8Array> => {
  if (onProgress) onProgress(10);
  const pdfDoc = await PDFDocument.load(fileBytes);
  if (onProgress) onProgress(30);

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const pages = pdfDoc.getPages();

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? rgb(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ) : rgb(0,0,0);
  };

  let count = 0;
  for (const el of elements) {
    if (el.page < 1 || el.page > pages.length) continue;
    
    const page = pages[el.page - 1];
    const { width: pWidth, height: pHeight } = page.getSize();
    
    // PDF space coordinates
    const elWidthPt = el.width * pWidth;
    const elHeightPt = el.height * pHeight;
    const xPt = el.x * pWidth;
    const yPt = pHeight - (el.y * pHeight) - elHeightPt; 
    
    const color = hexToRgb(el.color || "#000000");

    if (el.type === "image") {
       const isPng = el.data.startsWith("data:image/png");
       const base64Data = el.data.split(",")[1];
       const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
       
       try {
         const image = isPng ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);
         
         // Fix PDF-lib rotation anchor offset using simple translation (bottom-left standard)
         page.drawImage(image, {
           x: xPt,
           y: yPt,
           width: elWidthPt,
           height: elHeightPt,
           rotate: degrees(el.rotation || 0),
         });
       } catch (e) {
         console.warn("Failed to embed image element", e);
       }
    } 
    else if (el.type === "text") {
       const fontSize = elHeightPt * 0.8;
       page.drawText(el.data, {
         x: xPt,
         y: yPt + (elHeightPt * 0.2), // Adjust baseline visually
         size: fontSize,
         font: el.fontFamily === 'serif' ? timesRoman : helvetica,
         color: color,
         rotate: degrees((el.rotation || 0) * -1)
       });
    }
    else if (el.type === "checkbox") {
      if (el.data === "true") {
         const checkPath = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";
         page.drawSvgPath(checkPath, {
           x: xPt,
           y: yPt + elHeightPt, 
           scale: (elHeightPt / 24) * 0.8,
           color: color
         });
      }
    }
    
    count++;
    if (onProgress) onProgress(30 + Math.round((count / elements.length) * 50));
  }

  // Flatten the form to ensure standard non-editability
  const form = pdfDoc.getForm();
  form.flatten();

  const saved = await pdfDoc.save({ useObjectStreams: false });
  if (onProgress) onProgress(100);
  return saved;
};
