/**
 * File Validation Utility
 * Provides comprehensive file validation for all document types
 */

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_BATCH_SIZE = 20; // Maximum files in batch

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate PDF file
 */
export const validatePdfFile = async (file: File): Promise<ValidationResult> => {
  // Check size
  if (file.size === 0) {
    return {
      valid: false,
      error: `File "${file.name}" is empty`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds 100MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`
    };
  }
  
  // Check extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.pdf')) {
    return {
      valid: false,
      error: `File "${file.name}" is not a PDF file`
    };
  }
  
  // Check MIME type
  if (file.type && !file.type.includes('pdf') && file.type !== 'application/octet-stream') {
    return {
      valid: false,
      error: `File "${file.name}" has invalid type: ${file.type}`
    };
  }
  
  // Check magic number (PDF signature: %PDF-)
  try {
    const header = await file.slice(0, 5).text();
    if (!header.startsWith('%PDF-')) {
      return {
        valid: false,
        error: `File "${file.name}" is corrupted or not a valid PDF`
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: `File "${file.name}" could not be read`
    };
  }
  
  return { valid: true };
};

/**
 * Validate image file
 */
export const validateImageFile = async (file: File): Promise<ValidationResult> => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];
  
  if (file.size === 0) {
    return {
      valid: false,
      error: `File "${file.name}" is empty`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Image "${file.name}" exceeds 100MB limit`
    };
  }
  
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File "${file.name}" is not a valid image format`
    };
  }
  
  if (file.type && !validTypes.includes(file.type) && file.type !== 'application/octet-stream') {
    return {
      valid: false,
      error: `File "${file.name}" has invalid MIME type`
    };
  }

  // Check image magic numbers
  try {
    const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const hex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // JPEG: FFD8FF
    // PNG: 89504E47
    // GIF: 47494638
    // WebP: 52494646 (RIFF)
    const validHeaders = ['ffd8ff', '89504e47', '47494638', '52494646', '424d']; // BMP: 424D
    
    if (!validHeaders.some(h => hex.startsWith(h))) {
      return {
        valid: false,
        error: `File "${file.name}" is not a valid image file`
      };
    }
  } catch (error) {
    // If we can't read the header, allow it (might be a valid image)
  }
  
  return { valid: true };
};

/**
 * Validate Word document
 */
export const validateWordFile = async (file: File): Promise<ValidationResult> => {
  const validExtensions = ['.doc', '.docx'];
  const validTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'
  ];
  
  if (file.size === 0) {
    return {
      valid: false,
      error: `File "${file.name}" is empty`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Document "${file.name}" exceeds 100MB limit`
    };
  }
  
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File "${file.name}" is not a Word document (.doc or .docx)`
    };
  }
  
  if (file.type && !validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File "${file.name}" has invalid type`
    };
  }

  // Check for DOCX (ZIP signature: 504B0304)
  if (ext === '.docx') {
    try {
      const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      const hex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (hex !== '504b0304') {
        return {
          valid: false,
          error: `File "${file.name}" is not a valid DOCX file`
        };
      }
    } catch (error) {
      // Allow if we can't read header
    }
  }
  
  return { valid: true };
};

/**
 * Validate Excel file
 */
export const validateExcelFile = async (file: File): Promise<ValidationResult> => {
  const validExtensions = ['.xls', '.xlsx', '.csv'];
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/octet-stream'
  ];
  
  if (file.size === 0) {
    return {
      valid: false,
      error: `File "${file.name}" is empty`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Spreadsheet "${file.name}" exceeds 100MB limit`
    };
  }
  
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File "${file.name}" is not an Excel file`
    };
  }
  
  return { valid: true };
};

/**
 * Validate PowerPoint file
 */
export const validatePptFile = async (file: File): Promise<ValidationResult> => {
  const validExtensions = ['.ppt', '.pptx'];
  const validTypes = [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/octet-stream'
  ];
  
  if (file.size === 0) {
    return {
      valid: false,
      error: `File "${file.name}" is empty`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Presentation "${file.name}" exceeds 100MB limit`
    };
  }
  
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File "${file.name}" is not a PowerPoint file`
    };
  }
  
  return { valid: true };
};

/**
 * Validate HTML file
 */
export const validateHtmlFile = (file: File): ValidationResult => {
  const validExtensions = ['.html', '.htm'];
  
  if (file.size === 0) {
    return {
      valid: false,
      error: `File "${file.name}" is empty`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `HTML file "${file.name}" exceeds 100MB limit`
    };
  }
  
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File "${file.name}" is not an HTML file`
    };
  }
  
  return { valid: true };
};

/**
 * Validate batch of files
 */
export const validateBatch = (files: File[]): ValidationResult => {
  if (files.length === 0) {
    return {
      valid: false,
      error: 'No files selected'
    };
  }

  if (files.length > MAX_BATCH_SIZE) {
    return {
      valid: false,
      error: `Too many files. Maximum ${MAX_BATCH_SIZE} files allowed`
    };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_FILE_SIZE * 5) { // 500MB total
    return {
      valid: false,
      error: `Total file size exceeds 500MB limit`
    };
  }

  return { valid: true };
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .replace(/_+/g, '_')
    .substring(0, 255);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

/**
 * Check if file is likely corrupted
 */
export const isFileCorrupted = async (file: File): Promise<boolean> => {
  try {
    // Try to read first and last 1KB
    const start = await file.slice(0, 1024).arrayBuffer();
    const end = await file.slice(-1024).arrayBuffer();
    
    if (start.byteLength === 0 || end.byteLength === 0) {
      return true;
    }
    
    return false;
  } catch (error) {
    return true;
  }
};
