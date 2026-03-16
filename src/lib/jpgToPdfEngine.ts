import { PDFDocument } from 'pdf-lib';

export interface ImageToPdfOptions {
  pageSize?: 'fit' | 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margin?: 'none' | 'small' | 'large';
  alignment?: 'center' | 'full' | 'fit';
}

/**
 * Converts a list of images to a single high-quality PDF document.
 * Each image is rendered on its own page according to the provided options.
 */
export async function convertImagesToPdf(files: File[], options: ImageToPdfOptions = {}): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  // Define margins in points (1 point = 1/72 inch)
  const margins = {
    none: 0,
    small: 20,
    large: 50,
  };
  const marginValue = margins[options.margin || 'none'];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const uint8 = new Uint8Array(bytes);
    const contentType = file.type;
    
    let img;
    try {
      if (contentType === 'image/png') {
        img = await pdfDoc.embedPng(uint8);
      } else {
        // Default to JPG for image/jpeg and other compatible formats
        img = await pdfDoc.embedJpg(uint8);
      }
    } catch (error) {
      console.error(`Failed to embed image ${file.name}:`, error);
      continue; // Skip failed images
    }

    let pageWidth = img.width;
    let pageHeight = img.height;

    // Determine target page size
    if (options.pageSize === 'a4') {
      pageWidth = 595.28;
      pageHeight = 841.89;
    } else if (options.pageSize === 'letter') {
      pageWidth = 612.0;
      pageHeight = 792.0;
    }

    // Handle orientation for standard sizes
    if (options.pageSize !== 'fit') {
      const isPortrait = options.orientation === 'portrait';
      
      const currentIsPortrait = pageHeight >= pageWidth;
      
      if (isPortrait !== currentIsPortrait) {
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
      }
    } else {
      // For 'fit', we might still want to respect orientation if explicitly set
      if (options.orientation === 'portrait' && pageWidth > pageHeight) {
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
      } else if (options.orientation === 'landscape' && pageHeight > pageWidth) {
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
      }
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Calculate available draw area after margins
    const availableWidth = pageWidth - (marginValue * 2);
    const availableHeight = pageHeight - (marginValue * 2);

    let drawWidth = img.width;
    let drawHeight = img.height;

    // Apply alignment/scaling logic
    if (options.alignment === 'full' || options.alignment === 'fit' || options.pageSize !== 'fit') {
      const scale = Math.min(availableWidth / img.width, availableHeight / img.height);
      drawWidth = img.width * scale;
      drawHeight = img.height * scale;
    }

    // Centering logic
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    page.drawImage(img, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}
