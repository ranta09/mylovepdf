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
 * Converts HTML content to a PDF Blob.
 */
export const convertHtmlToPdf = async (
  element: HTMLElement,
  options: HtmlConversionOptions
): Promise<Blob> => {
  const { pageSize, orientation, margin, scale } = options;
  const marginPx = MARGIN_VALUES[margin];

  // Configure canvas
  const canvas = await html2canvas(element, {
    scale: 2, // Use 2x for high clarity
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Determine PDF format
  let format: any = pageSize === "auto" ? [imgWidth, imgHeight] : pageSize.toLowerCase();
  
  const pdf = new jsPDF({
    orientation,
    unit: "pt",
    format,
  });

  // Calculate available dimensions
  const pdfPageWidth = pdf.internal.pageSize.getWidth();
  const pdfPageHeight = pdf.internal.pageSize.getHeight();
  const innerWidth = pdfPageWidth - marginPx * 2;
  const innerHeight = pdfPageHeight - marginPx * 2;

  // Scaling logic
  let finalWidth = innerWidth;
  let finalHeight = (imgHeight * innerWidth) / imgWidth;

  if (scale === "actual") {
    // In pt, 1px is approx 0.75pt at 96dpi
    finalWidth = imgWidth * 0.75;
    finalHeight = imgHeight * 0.75;
  }

  // Multi-page handling
  let heightLeft = finalHeight;
  let position = marginPx;

  // Add first page
  pdf.addImage(imgData, "PNG", marginPx, position, finalWidth, finalHeight);
  heightLeft -= innerHeight;

  // Add more pages if content overflows
  while (heightLeft >= 0) {
    position = heightLeft - finalHeight + marginPx;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", marginPx, position, finalWidth, finalHeight);
    heightLeft -= innerHeight;
  }

  return pdf.output("blob");
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

/**
 * Basic HTML file validation.
 */
export const isValidHtmlFile = (file: File): boolean => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "html" || ext === "htm";
};
