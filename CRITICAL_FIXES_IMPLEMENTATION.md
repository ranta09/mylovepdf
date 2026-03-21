# Critical Fixes - Implementation Guide

## Immediate Actions Required

### 1. Create Global Validation Utility

Create `src/lib/fileValidation.ts`:

```typescript
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validatePdfFile = async (file: File): Promise<ValidationResult> => {
  // Check size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds 100MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`
    };
  }
  
  // Check extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return {
      valid: false,
      error: `File "${file.name}" is not a PDF file`
    };
  }
  
  // Check MIME type
  if (file.type && !file.type.includes('pdf')) {
    return {
      valid: false,
      error: `File "${file.name}" has invalid MIME type: ${file.type}`
    };
  }
  
  // Check magic number (PDF signature)
  try {
    const header = await file.slice(0, 5).text();
    if (!header.startsWith('%PDF-')) {
      return {
        valid: false,
        error: `File "${file.name}" is not a valid PDF (corrupted or wrong format)`
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

export const validateImageFile = (file: File): ValidationResult => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
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
  
  if (file.type && !validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File "${file.name}" has invalid MIME type`
    };
  }
  
  return { valid: true };
};

export const validateWordFile = (file: File): ValidationResult => {
  const validExtensions = ['.doc', '.docx'];
  const validTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
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
      error: `File "${file.name}" is not a Word document`
    };
  }
  
  return { valid: true };
};

export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .substring(0, 255);
};
```

### 2. Create Retry Utility

Create `src/lib/retryUtil.ts`:

```typescript
export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true,
    onRetry
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw new Error(
          `Operation failed after ${maxAttempts} attempts: ${lastError.message}`
        );
      }
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      
      const delay = backoff ? delayMs * attempt : delayMs;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

### 3. Create Error Handler Utility

Create `src/lib/errorHandler.ts`:

```typescript
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
  
  if (error.name === 'PasswordException') {
    return 'This PDF is password protected. Please unlock it first.';
  }
  
  if (error.message?.includes('Invalid PDF')) {
    return 'The PDF file is corrupted or invalid. Please try another file.';
  }
  
  if (error.message?.includes('out of memory')) {
    return 'File is too large to process. Please try a smaller file or split it into parts.';
  }
  
  if (error.message?.includes('network')) {
    return 'Network error occurred. Please check your connection and try again.';
  }
  
  if (error.message?.includes('timeout')) {
    return 'Processing timed out. The file may be too complex. Please try again.';
  }
  
  return 'Conversion failed. Please try again or contact support if the problem persists.';
};
```

### 4. Create Performance Monitor

Create `src/lib/performanceMonitor.ts`:

```typescript
export class PerformanceMonitor {
  private startTime: number = 0;
  private checkpoints: Map<string, number> = new Map();
  
  start() {
    this.startTime = performance.now();
    this.checkpoints.clear();
  }
  
  checkpoint(name: string) {
    this.checkpoints.set(name, performance.now() - this.startTime);
  }
  
  end(): number {
    return performance.now() - this.startTime;
  }
  
  getReport(): Record<string, number> {
    const report: Record<string, number> = {};
    this.checkpoints.forEach((time, name) => {
      report[name] = Math.round(time);
    });
    report['total'] = Math.round(this.end());
    return report;
  }
  
  log() {
    console.table(this.getReport());
  }
}
```

### 5. Update PDF to Word with Fixes

Key changes needed in `src/pages/PdfToWord.tsx`:

```typescript
import { validatePdfFile, sanitizeFilename } from '@/lib/fileValidation';
import { withRetry } from '@/lib/retryUtil';
import { handleConversionError, ConversionError } from '@/lib/errorHandler';
import { PerformanceMonitor } from '@/lib/performanceMonitor';

// In component:
const handleFilesChange = async (newFiles: File[]) => {
  const errors: string[] = [];
  const validFiles: File[] = [];
  
  for (const file of newFiles) {
    const result = await validatePdfFile(file);
    if (!result.valid) {
      errors.push(result.error!);
    } else {
      validFiles.push(file);
    }
  }
  
  if (errors.length > 0) {
    toast.error(errors.join('\n'), { duration: 5000 });
  }
  
  if (validFiles.length > 0) {
    setFiles(prev => [...prev, ...validFiles]);
  }
};

const convert = async (forceOcr?: boolean) => {
  if (files.length === 0) return;
  
  const monitor = new PerformanceMonitor();
  monitor.start();
  
  setProcessing(true);
  setProgress(0);
  
  const newResults: ProcessingResult[] = [];
  
  try {
    for (const file of files) {
      monitor.checkpoint(`start-${file.name}`);
      
      // Validate again before processing
      const validation = await validatePdfFile(file);
      if (!validation.valid) {
        throw new ConversionError(validation.error!, 'VALIDATION_ERROR');
      }
      
      // Convert with retry
      const blob = await withRetry(
        async () => {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          // ... rest of conversion logic
          
          return await convertPdfToWord(file, options, (p, s) => {
            setProgress(p);
            setStatusText(s);
          });
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          backoff: true,
          onRetry: (attempt, error) => {
            toast.warning(`Retry attempt ${attempt}/3...`);
            console.warn(`Conversion retry ${attempt}:`, error);
          }
        }
      );
      
      monitor.checkpoint(`complete-${file.name}`);
      
      const outName = sanitizeFilename(
        file.name.replace(/\.[^/.]+$/, "") + "_converted.docx"
      );
      
      saveAs(blob, outName);
      newResults.push({
        file: blob,
        url: URL.createObjectURL(blob),
        filename: outName
      });
    }
    
    setResults(newResults);
    toast.success(`Conversion successful! (${monitor.end().toFixed(0)}ms)`);
    monitor.log();
    
  } catch (error) {
    console.error('Conversion error:', error);
    const errorMessage = handleConversionError(error);
    toast.error(errorMessage, { duration: 7000 });
  } finally {
    setProcessing(false);
    setProgress(0);
  }
};
```

### 6. Add Web Worker for Heavy Processing

Create `src/workers/pdfWorker.ts`:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

self.onmessage = async (e) => {
  const { type, data } = e.data;
  
  if (type === 'analyze') {
    try {
      const pdf = await pdfjsLib.getDocument({ data: data.buffer }).promise;
      const numPages = pdf.numPages;
      
      self.postMessage({
        type: 'progress',
        progress: 10,
        status: 'Analyzing PDF structure...'
      });
      
      const pages = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        pages.push({
          pageNumber: i,
          textItems: textContent.items.length,
          hasText: textContent.items.length > 0
        });
        
        self.postMessage({
          type: 'progress',
          progress: 10 + (i / numPages) * 40,
          status: `Analyzing page ${i}/${numPages}...`
        });
      }
      
      self.postMessage({
        type: 'complete',
        data: { pages, numPages }
      });
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
};
```

### 7. Add Memory Management

Create `src/lib/memoryManager.ts`:

```typescript
export class MemoryManager {
  private objectUrls: Set<string> = new Set();
  private cleanupCallbacks: Array<() => void> = [];
  
  registerObjectUrl(url: string) {
    this.objectUrls.add(url);
  }
  
  registerCleanup(callback: () => void) {
    this.cleanupCallbacks.push(callback);
  }
  
  cleanup() {
    // Revoke all object URLs
    this.objectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Failed to revoke URL:', error);
      }
    });
    this.objectUrls.clear();
    
    // Run cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Cleanup callback failed:', error);
      }
    });
    this.cleanupCallbacks = [];
    
    // Suggest garbage collection (if available)
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
    }
  }
  
  getMemoryUsage(): number {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }
}

export const globalMemoryManager = new MemoryManager();
```

---

## Implementation Priority

### Week 1 - Critical Fixes
1. ✅ Implement file validation utility
2. ✅ Add retry mechanism
3. ✅ Improve error handling
4. ✅ Add memory management
5. ✅ Update PDF to Word tool

### Week 2 - Performance
1. ✅ Add Web Workers
2. ✅ Implement chunked reading
3. ✅ Add performance monitoring
4. ✅ Optimize thumbnail generation
5. ✅ Add lazy loading

### Week 3 - Features
1. ✅ Multi-language OCR
2. ✅ Batch processing improvements
3. ✅ Cloud storage integration
4. ✅ Advanced options UI
5. ✅ Testing and QA

---

## Testing Commands

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test

# Build for production
npm run build

# Test bundle size
npm run analyze
```

---

## Monitoring & Metrics

Add to each tool:

```typescript
// Track conversion metrics
const trackConversion = (tool: string, duration: number, success: boolean) => {
  if (window.gtag) {
    window.gtag('event', 'conversion', {
      tool_name: tool,
      duration_ms: duration,
      success: success
    });
  }
};

// Track errors
const trackError = (tool: string, error: string) => {
  if (window.gtag) {
    window.gtag('event', 'error', {
      tool_name: tool,
      error_message: error
    });
  }
};
```

---

## Success Criteria

Each tool must pass:
- [ ] File validation (size, type, magic number)
- [ ] Error handling (retry, user-friendly messages)
- [ ] Performance (< 5s for typical files)
- [ ] Memory management (no leaks)
- [ ] Mobile responsive
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Security (sanitization, validation)
- [ ] User feedback (progress, errors, success)

---

## Rollout Plan

1. **Phase 1**: Deploy fixes to staging
2. **Phase 2**: A/B test with 10% of users
3. **Phase 3**: Monitor metrics for 48 hours
4. **Phase 4**: Full rollout if metrics improve
5. **Phase 5**: Document and train support team

---

This implementation guide provides all the code needed to fix critical issues across all tools while maintaining the existing UI.
