import { PDFDocument } from "pdf-lib";
import { decryptPDF } from "cryptpdf";

export type PdfProtectionStatus = "unlocked" | "has_restrictions" | "needs_password" | "error";

/**
 * Smart detection to analyze if PDF needs an open password, has only owner restrictions, or is unlocked.
 */
export const analyzePdfProtection = async (
  fileBytes: ArrayBuffer
): Promise<{ status: PdfProtectionStatus; error?: string }> => {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

  try {
    // 1. Check if it requires an Open Password using pdfjs
    const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
    await loadingTask.promise;
    
    // SUCCESS: No User Password needed to open.
    // Now determine if it has an Owner Password (Restrictions) or is fully unlocked.
    
    // Check if it's AES-256 encrypted using cryptpdf
    try {
      const uint8 = new Uint8Array(fileBytes);
      await decryptPDF(uint8, ""); // using empty password works for owner-restricted (no user password) AES-256 files
      return { status: "has_restrictions" };
    } catch (e: any) {
      // If it throws "Not Rev 5", it's not AES-256. If it throws "Invalid password" it might legitimately be encrypted but cryptpdf didn't like empty string?
      // Actually cryptpdf decryptPDF works with empty string if user password is empty.
      
      // Let's check with pdf-lib for RC4 / AES-128
      try {
        const pdfDoc = await PDFDocument.load(fileBytes);
        if (pdfDoc.isEncrypted) {
          return { status: "has_restrictions" };
        }
        return { status: "unlocked" };
      } catch (pdfErr: any) {
        // If pdf-lib throws an error but pdfjs loaded it fine, it's definitely encrypted (likely unsupported by pdf-lib).
        if (pdfErr.message?.toLowerCase().includes("password") || pdfErr.message?.toLowerCase().includes("encrypted")) {
          return { status: "has_restrictions" };
        }
        // If it throws for another reason, fallback to it being unlocked or has restrictions
        return { status: "unlocked" };
      }
    }
    
  } catch (error: any) {
    if (error.name === "PasswordException") {
      return { status: "needs_password" };
    }
    return { status: "error", error: error.message || "Failed to analyze PDF" };
  }
};

/**
 * Unlocks a password-protected PDF (Removes user/owner passwords and restrictions).
 * Supports AES-256, AES-128, and RC4.
 */
export const unlockPdfDocument = async (
  fileBytes: ArrayBuffer,
  password?: string
): Promise<Uint8Array> => {
  const uint8File = new Uint8Array(fileBytes);
  const pass = password || "";

  // Strategy 1: AES-256 using cryptpdf
  try {
    const decryptedBytes = await decryptPDF(uint8File, pass);
    return decryptedBytes;
  } catch (e: any) {
    // If it's a password error from cryptpdf, throw it immediately
    if (e.message?.toLowerCase().includes("password")) {
      throw new Error("INCORRECT_PASSWORD");
    }
    // If it says "Not Rev 5", it's not AES-256, continue to Strategy 2...
  }

  // Strategy 2: AES-128 / RC4 using pdf-lib
  try {
    const pdfDoc = await PDFDocument.load(fileBytes, {
      password: pass,
      updateMetadata: false,
    });

    const pages = pdfDoc.getPages();
    const newPdfDoc = await PDFDocument.create();

    for (const page of pages) {
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [
        pdfDoc.getPages().indexOf(page),
      ]);
      newPdfDoc.addPage(copiedPage);
    }

    // Copy metadata
    const title = pdfDoc.getTitle();
    if (title) newPdfDoc.setTitle(title);

    const unlockedPdfBytes = await newPdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });

    return unlockedPdfBytes;
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("password") || error.message?.toLowerCase().includes("encrypted")) {
      throw new Error("INCORRECT_PASSWORD");
    }
    
    // Fallback to rasterization if all decryption fails
    return await unlockPdfByRendering(fileBytes, pass);
  }
};

/**
 * Rasterization fallback for heavily encrypted / unsupported PDFs
 */
const unlockPdfByRendering = async (
  fileBytes: ArrayBuffer,
  password?: string
): Promise<Uint8Array> => {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: fileBytes,
      password: password || "",
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const { jsPDF } = await import("jspdf");
    let pdfDoc: any = null;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = 2.0; 
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not get canvas context");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      const widthPt = (viewport.width / scale) * 0.75;
      const heightPt = (viewport.height / scale) * 0.75;

      if (!pdfDoc) {
        pdfDoc = new jsPDF({
          orientation: widthPt > heightPt ? "landscape" : "portrait",
          unit: "pt",
          format: [widthPt, heightPt],
        });
      } else {
        pdfDoc.addPage([widthPt, heightPt], widthPt > heightPt ? "landscape" : "portrait");
      }

      pdfDoc.addImage(imgData, "JPEG", 0, 0, widthPt, heightPt);
    }

    if (!pdfDoc) throw new Error("No pages were processed");

    const arrayBuffer = pdfDoc.output("arraybuffer");
    return new Uint8Array(arrayBuffer);
  } catch (error: any) {
    if (error.name === "PasswordException") {
      throw new Error("INCORRECT_PASSWORD");
    }
    throw new Error(`Failed to unlock PDF: ${error.message}`);
  }
};
