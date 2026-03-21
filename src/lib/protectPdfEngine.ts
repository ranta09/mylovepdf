import { encryptPDF, decryptPDF } from "cryptpdf";

export interface ProtectPdfOptions {
  userPassword?: string; // Password to open the PDF
  ownerPassword?: string; // Password to change permissions
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    fillingForms?: boolean;
    contentAccessibility?: boolean;
    documentAssembly?: boolean;
  };
}

/**
 * Encrypt a PDF with AES-256 client-side using cryptpdf
 */
export const protectPdf = async (
  fileBytes: ArrayBuffer,
  options: ProtectPdfOptions
): Promise<Uint8Array> => {
  try {
    const uint8Input = new Uint8Array(fileBytes);
    
    // Calculate 32-bit permission flags per PDF Rev 5 spec
    // Base allows everything (bits 3-12 set to 1, 1 and 2 to 0, rest 1)
    let perm = 0xFFFFFFFC; 

    if (options.permissions) {
      if (options.permissions.printing === false) perm &= ~(4 | 2048);
      if (options.permissions.modifying === false) perm &= ~8;
      if (options.permissions.copying === false) perm &= ~16;
      if (options.permissions.annotating === false) perm &= ~32;
      if (options.permissions.fillingForms === false) perm &= ~256;
      if (options.permissions.documentAssembly === false) perm &= ~1024;
      if (options.permissions.contentAccessibility === false) perm &= ~512;
    }

    const encrypted = await encryptPDF(
      uint8Input,
      options.userPassword || "",
      options.ownerPassword || options.userPassword || "",
      { permissions: perm, encryptMetadata: true }
    );

    return encrypted;
  } catch (error: any) {
    throw new Error(`Failed to protect PDF: ${error.message}`);
  }
};

/**
 * Validate if a password matches a protected PDF using AES-256
 */
export const validatePdfPassword = async (
  fileBytes: ArrayBuffer,
  password: string
): Promise<boolean> => {
  try {
    const uint8Input = new Uint8Array(fileBytes);
    await decryptPDF(uint8Input, password);
    return true;
  } catch {
    return false;
  }
};
