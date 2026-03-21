import { PDFDocument, PDFName, PDFDict, PDFArray } from "pdf-lib";

export interface FlattenAnalysis {
  hasForms: boolean;
  hasAnnotations: boolean;
  isFlattened: boolean;
}

export type FlattenMode = "forms_only" | "full";

/**
 * Smart detection to analyze if PDF contains forms, annotations, or is already completely static.
 */
export const analyzePdfFlattenState = async (
  fileBytes: ArrayBuffer
): Promise<{ status: FlattenAnalysis; error?: string }> => {
  try {
    const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    
    // Check for fillable form fields
    const form = pdfDoc.getForm();
    const hasForms = form.getFields().length > 0;
    
    // Check for general user annotations/comments
    let hasAnnotations = false;
    const pages = pdfDoc.getPages();
    
    for (const page of pages) {
      if (hasAnnotations) break;
      const annots = page.node.Annots();
      
      if (annots instanceof PDFArray) {
        for (let i = 0; i < annots.size(); i++) {
          const annotRef = annots.get(i);
          const annot = pdfDoc.context.lookupMaybe(annotRef, PDFDict);
          if (annot) {
            const subtype = annot.lookup(PDFName.of("Subtype"));
            
            // We ignore Link (hyperlinks) and Widget (form fields) to cleanly detect purely visual annotations/comments
            if (subtype !== PDFName.of("Widget") && subtype !== PDFName.of("Link")) {
              hasAnnotations = true;
              break;
            }
          }
        }
      }
    }

    const isFlattened = !hasForms && !hasAnnotations;

    return { 
      status: { hasForms, hasAnnotations, isFlattened }
    };
  } catch (error: any) {
    return { 
      status: { hasForms: false, hasAnnotations: false, isFlattened: false },
      error: error.message || "Failed to analyze PDF" 
    };
  }
};

/**
 * Advanced PDF Flattener supporting native vector-preserving form flattening and deep rasterization.
 */
export const flattenPdfDocument = async (
  fileBytes: ArrayBuffer,
  mode: FlattenMode,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> => {
  
  // Option 1: Native Vector-Preserving Form Flattening
  // Safely converts interactive form fields into standard static lines and text in the content stream.
  if (mode === "forms_only") {
    if (onProgress) onProgress(10);
    const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    if (onProgress) onProgress(40);
    
    const form = pdfDoc.getForm();
    form.flatten();
    if (onProgress) onProgress(60);

    const saved = await pdfDoc.save({ useObjectStreams: false });
    if (onProgress) onProgress(100);
    return saved;
  }
  
  // Option 2: Fallback to high-quality rasterization
  // Merges absolutely every layer, annotation, font, and path into a single locked visual layer.
  return await flattenByRasterizing(fileBytes, onProgress);
};

const flattenByRasterizing = async (
  fileBytes: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> => {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

  const srcPdf = await pdfjsLib.getDocument({ data: fileBytes }).promise;
  const outDoc = await PDFDocument.create();
  if (onProgress) onProgress(5);

  for (let i = 1; i <= srcPdf.numPages; i++) {
    const page = await srcPdf.getPage(i);
    const origViewport = page.getViewport({ scale: 1 });
    
    // Render at 2x resolution to maintain high document fidelity while ensuring absolute un-editability
    const scale = 2.0; 
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    
    // Clear the canvas to white first (in case of transparent PDFs)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpegBlob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95)
    );
    const jpegData = new Uint8Array(await jpegBlob.arrayBuffer());
    
    // Embed the heavily compressed high-fidelity JPEG wrapper
    const jpegImage = await outDoc.embedJpg(jpegData);

    const pdfPage = outDoc.addPage([origViewport.width, origViewport.height]);
    pdfPage.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height,
    });

    if (onProgress) onProgress(5 + Math.round((i / srcPdf.numPages) * 85));
  }

  const pdfBytes = await outDoc.save({ useObjectStreams: false });
  if (onProgress) onProgress(100);
  return pdfBytes;
};
