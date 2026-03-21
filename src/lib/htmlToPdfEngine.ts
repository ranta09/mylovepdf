import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type PageSize = "A4" | "letter" | "legal" | "auto";
export type Orientation = "portrait" | "landscape";
export type MarginSize = "none" | "small" | "normal" | "large";

export interface HtmlConversionOptions {
  pageSize: PageSize;
  orientation: Orientation;
  margin: MarginSize;
  scale: "fit" | "actual";
}

const PAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  A4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
};

const MARGIN_VALUES: Record<MarginSize, number> = {
  none: 0,
  small: 10,
  normal: 20,
  large: 40,
};

/**
 * Preloads all images in the element to ensure they're rendered
 */
const preloadImages = async (element: HTMLElement): Promise<void> => {
  const images = element.querySelectorAll('img');
  const imagePromises: Promise<void>[] = [];

  images.forEach((img) => {
    if (img.complete) return;
    
    imagePromises.push(
      new Promise((resolve) => {
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.onload = () => resolve();
        tempImg.onerror = () => resolve(); // Continue even if image fails
        tempImg.src = img.src;
      })
    );
  });

  await Promise.all(imagePromises);
};

/**
 * Applies print-friendly styles to the element
 */
const applyPrintStyles = (element: HTMLElement): () => void => {
  const originalStyles = new Map<HTMLElement, string>();
  
  // Apply print media query styles
  const styleSheets = Array.from(document.styleSheets);
  const printStyles: string[] = [];
  
  styleSheets.forEach(sheet => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      rules.forEach(rule => {
        if (rule instanceof CSSMediaRule && rule.media.mediaText.includes('print')) {
          printStyles.push(rule.cssText.replace('@media print', '@media all'));
        }
      });
    } catch (e) {
      // Skip cross-origin stylesheets
    }
  });

  // Create temporary style element for print styles
  let printStyleElement: HTMLStyleElement | null = null;
  if (printStyles.length > 0) {
    printStyleElement = document.createElement('style');
    printStyleElement.textContent = printStyles.join('\n');
    element.appendChild(printStyleElement);
  }

  // Ensure backgrounds are visible
  const allElements = element.querySelectorAll('*');
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computedStyle = window.getComputedStyle(htmlEl);
    
    // Store original style
    originalStyles.set(htmlEl, htmlEl.style.cssText);
    
    // Force background rendering
    if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      htmlEl.style.backgroundColor = computedStyle.backgroundColor;
    }
    if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
      htmlEl.style.backgroundImage = computedStyle.backgroundImage;
    }
    
    // Fix common rendering issues
    if (computedStyle.position === 'fixed') {
      htmlEl.style.position = 'absolute';
    }
    if (computedStyle.position === 'sticky') {
      htmlEl.style.position = 'relative';
    }
  });

  // Cleanup function
  return () => {
    if (printStyleElement) {
      printStyleElement.remove();
    }
    originalStyles.forEach((style, el) => {
      el.style.cssText = style;
    });
  };
};

/**
 * Handles lazy-loaded images by scrolling through content
 */
const triggerLazyLoad = async (element: HTMLElement): Promise<void> => {
  const lazyImages = element.querySelectorAll('img[loading="lazy"], img[data-src]');
  
  lazyImages.forEach((img) => {
    const htmlImg = img as HTMLImageElement;
    // Trigger lazy load by setting data-src to src
    if (htmlImg.dataset.src && !htmlImg.src) {
      htmlImg.src = htmlImg.dataset.src;
    }
    // Remove lazy loading attribute
    htmlImg.removeAttribute('loading');
  });

  // Wait for images to load
  await new Promise(resolve => setTimeout(resolve, 1000));
};

/**
 * Optimizes canvas rendering quality
 */
const getOptimalScale = (element: HTMLElement): number => {
  const width = element.scrollWidth;
  const height = element.scrollHeight;
  
  // Use higher scale for smaller content, lower for very large content
  if (width * height < 1000000) return 3; // Small content: 3x
  if (width * height < 5000000) return 2.5; // Medium content: 2.5x
  return 2; // Large content: 2x
};

/**
 * Extracts and preserves hyperlinks from HTML
 */
const extractLinks = (element: HTMLElement): Array<{x: number, y: number, width: number, height: number, url: string}> => {
  const links: Array<{x: number, y: number, width: number, height: number, url: string}> = [];
  const anchorElements = element.querySelectorAll('a[href]');
  
  anchorElements.forEach((anchor) => {
    const rect = anchor.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const href = anchor.getAttribute('href');
    
    if (href && rect.width > 0 && rect.height > 0) {
      links.push({
        x: rect.left - elementRect.left,
        y: rect.top - elementRect.top,
        width: rect.width,
        height: rect.height,
        url: href.startsWith('http') ? href : `https://${href}`
      });
    }
  });
  
  return links;
};

/**
 * Converts HTML content to a PDF Blob with advanced rendering.
 */
export const convertHtmlToPdf = async (
  element: HTMLElement,
  options: HtmlConversionOptions
): Promise<Blob> => {
  const { pageSize, orientation, margin, scale } = options;
  const marginPx = MARGIN_VALUES[margin];

  try {
    // Step 1: Preload all images
    await preloadImages(element);
    
    // Step 2: Trigger lazy-loaded content
    await triggerLazyLoad(element);
    
    // Step 3: Apply print-friendly styles
    const cleanupStyles = applyPrintStyles(element);
    
    // Step 4: Extract links before rendering
    const links = extractLinks(element);
    
    // Step 5: Wait for any remaining async content
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 6: Determine optimal rendering scale
    const renderScale = getOptimalScale(element);
    
    // Step 7: Configure and render canvas with advanced options
    const canvas = await html2canvas(element, {
      scale: renderScale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      imageTimeout: 15000,
      removeContainer: true,
      // Advanced options for better quality
      foreignObjectRendering: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      // Capture backgrounds and borders
      ignoreElements: (element) => {
        // Skip hidden elements
        const style = window.getComputedStyle(element);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      },
    });
    
    // Step 8: Cleanup styles
    cleanupStyles();
    
    // Step 9: Convert canvas to optimized image
    const imgData = canvas.toDataURL("image/jpeg", 0.95); // Use JPEG with 95% quality for better compression
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Step 10: Determine PDF format
    let format: any;
    if (pageSize === "auto") {
      // Auto-size based on content with reasonable limits
      const maxWidth = 2000;
      const maxHeight = 3000;
      const width = Math.min(imgWidth / renderScale, maxWidth);
      const height = Math.min(imgHeight / renderScale, maxHeight);
      format = [width, height];
    } else {
      format = pageSize.toLowerCase();
    }
    
    // Step 11: Create PDF with compression
    const pdf = new jsPDF({
      orientation,
      unit: "pt",
      format,
      compress: true,
      precision: 2,
    });

    // Step 12: Calculate dimensions
    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const innerWidth = pdfPageWidth - marginPx * 2;
    const innerHeight = pdfPageHeight - marginPx * 2;

    // Step 13: Apply scaling logic
    let finalWidth = innerWidth;
    let finalHeight = (imgHeight * innerWidth) / imgWidth;

    if (scale === "actual") {
      // Convert pixels to points (1px = 0.75pt at 96dpi)
      finalWidth = (imgWidth / renderScale) * 0.75;
      finalHeight = (imgHeight / renderScale) * 0.75;
      
      // Ensure it fits within page bounds
      if (finalWidth > innerWidth) {
        const ratio = innerWidth / finalWidth;
        finalWidth = innerWidth;
        finalHeight *= ratio;
      }
    }

    // Step 14: Smart multi-page handling with better page breaks
    let currentY = marginPx;
    let remainingHeight = finalHeight;
    let sourceY = 0;
    let pageNumber = 0;

    while (remainingHeight > 0) {
      if (pageNumber > 0) {
        pdf.addPage();
      }

      const heightToRender = Math.min(remainingHeight, innerHeight);
      const sourceHeight = (heightToRender / finalHeight) * imgHeight;

      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidth;
      pageCanvas.height = sourceHeight;
      const pageCtx = pageCanvas.getContext('2d');
      
      if (pageCtx) {
        pageCtx.drawImage(
          canvas,
          0, sourceY,
          imgWidth, sourceHeight,
          0, 0,
          imgWidth, sourceHeight
        );
        
        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(pageImgData, "JPEG", marginPx, currentY, finalWidth, heightToRender, undefined, 'FAST');
      }

      // Add links for this page
      const pageLinks = links.filter(link => {
        const linkY = (link.y / element.scrollHeight) * finalHeight;
        return linkY >= sourceY && linkY < sourceY + heightToRender;
      });

      pageLinks.forEach(link => {
        const linkX = (link.x / element.scrollWidth) * finalWidth + marginPx;
        const linkY = ((link.y / element.scrollHeight) * finalHeight - sourceY) + currentY;
        const linkWidth = (link.width / element.scrollWidth) * finalWidth;
        const linkHeight = (link.height / element.scrollHeight) * finalHeight;
        
        try {
          pdf.link(linkX, linkY, linkWidth, linkHeight, { url: link.url });
        } catch (e) {
          // Skip invalid links
        }
      });

      sourceY += sourceHeight;
      remainingHeight -= heightToRender;
      pageNumber++;
      currentY = marginPx;
    }

    // Step 15: Add metadata
    pdf.setProperties({
      title: 'Converted HTML Document',
      subject: 'HTML to PDF Conversion',
      creator: 'MagicDocx HTML to PDF Converter',
      keywords: 'html, pdf, conversion',
    });

    return pdf.output("blob");
    
  } catch (error) {
    console.error("Advanced PDF conversion failed:", error);
    
    // Fallback to basic conversion
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    let format: any = pageSize === "auto" ? [imgWidth / 2, imgHeight / 2] : pageSize.toLowerCase();
    
    const pdf = new jsPDF({
      orientation,
      unit: "pt",
      format,
      compress: true,
    });

    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const innerWidth = pdfPageWidth - marginPx * 2;
    const innerHeight = pdfPageHeight - marginPx * 2;

    let finalWidth = innerWidth;
    let finalHeight = (imgHeight * innerWidth) / imgWidth;

    if (scale === "actual") {
      finalWidth = imgWidth * 0.75;
      finalHeight = imgHeight * 0.75;
    }

    let heightLeft = finalHeight;
    let position = marginPx;

    pdf.addImage(imgData, "PNG", marginPx, position, finalWidth, finalHeight);
    heightLeft -= innerHeight;

    while (heightLeft >= 0) {
      position = heightLeft - finalHeight + marginPx;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", marginPx, position, finalWidth, finalHeight);
      heightLeft -= innerHeight;
    }

    return pdf.output("blob");
  }
};

/**
 * Validates a URL.
 */
export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

