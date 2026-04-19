/**
 * Error Handler Utility
 * Provides user-friendly error messages
 */

export class ConversionError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}

export const handleConversionError = (error: any): string => {
  if (error instanceof ConversionError) {
    return error.message;
  }

  const msg = (error?.message || "").toLowerCase();

  // Always log full details for debugging
  console.error("[Conversion Error]", {
    message: error?.message,
    name: error?.name,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  });
  
  // Password protected
  if (error.name === 'PasswordException' || msg.includes('password')) {
    return 'This PDF is password protected. Please unlock it first using our Unlock PDF tool.';
  }
  
  // Invalid/corrupted PDF
  if (msg.includes('invalid pdf') || msg.includes('corrupted') || msg.includes('malformed')) {
    return 'The file is corrupted or invalid. Please try another file or re-download the original.';
  }
  
  // Memory issues
  if (msg.includes('out of memory') || msg.includes('memory') || msg.includes('heap')) {
    return 'File is too large to process in your browser. Please try a smaller file or split it into parts.';
  }
  
  // Timeout
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Processing timed out. The file may be too complex or large. Please try again or use a simpler file.';
  }

  // Cancelled
  if (msg.includes('cancel') || msg.includes('abort')) {
    return 'Processing was cancelled. Please try again.';
  }
  
  // File reading errors
  if (msg.includes('failed to read') || msg.includes('could not be read')) {
    return 'Could not read the file. It may be corrupted or in use by another program.';
  }
  
  // Conversion specific
  if (msg.includes('conversion failed')) {
    return 'Conversion failed. The file format may not be fully supported. Please try another file.';
  }
  
  // OCR errors
  if (msg.includes('ocr') || msg.includes('text recognition')) {
    return 'Text recognition failed. The image quality may be too low or the text is not clear enough.';
  }

  // Empty output
  if (msg.includes('empty') || msg.includes('size === 0') || msg.includes('0 bytes')) {
    return 'File generation produced an empty result. Please try again with a different file.';
  }
  
  // IMPORTANT: Do NOT use "check internet connection" for browser-side errors.
  // This app processes files entirely in-browser, network is not involved.
  return 'File generation failed. Please try again. If the problem persists, try a different or simpler file.';
};

/**
 * Log error for debugging
 */
export const logError = (context: string, error: any) => {
  console.error(`[${context}]`, {
    message: error.message,
    name: error.name,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
};

/**
 * Check if error is recoverable
 */
export const isRecoverableError = (error: any): boolean => {
  if (error instanceof ConversionError) {
    return error.recoverable;
  }
  
  // Network and timeout errors are recoverable
  const recoverablePatterns = [
    'network',
    'timeout',
    'fetch',
    'ECONNREFUSED',
    'ETIMEDOUT'
  ];
  
  return recoverablePatterns.some(pattern => 
    error.message?.toLowerCase().includes(pattern.toLowerCase())
  );
};
