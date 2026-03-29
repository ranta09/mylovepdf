/**
 * Batch Processor Utility
 * Handles sequential processing of multiple files with progress tracking
 */

export interface FileStatus {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
  result?: Blob;
  resultUrl?: string;
  outputFilename?: string;
}

export interface BatchProcessorOptions {
  maxFiles?: number;
  onFileStart?: (fileStatus: FileStatus) => void;
  onFileProgress?: (fileStatus: FileStatus, progress: number) => void;
  onFileComplete?: (fileStatus: FileStatus) => void;
  onFileError?: (fileStatus: FileStatus, error: Error) => void;
  onBatchProgress?: (completed: number, total: number, overallProgress: number) => void;
  onBatchComplete?: (results: FileStatus[]) => void;
}

export class BatchProcessor {
  private files: FileStatus[] = [];
  private options: BatchProcessorOptions;
  private isProcessing = false;
  private aborted = false;

  constructor(options: BatchProcessorOptions = {}) {
    this.options = {
      maxFiles: 10,
      ...options
    };
  }

  /**
   * Add files to the batch
   */
  addFiles(files: File[]): FileStatus[] {
    const newStatuses: FileStatus[] = files.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0
    }));

    this.files.push(...newStatuses);

    // Enforce max files limit
    if (this.files.length > this.options.maxFiles!) {
      this.files = this.files.slice(0, this.options.maxFiles);
    }

    return newStatuses;
  }

  /**
   * Get all file statuses
   */
  getFiles(): FileStatus[] {
    return this.files;
  }

  /**
   * Remove a file from the batch
   */
  removeFile(id: string): void {
    this.files = this.files.filter(f => f.id !== id);
  }

  /**
   * Clear all files
   */
  clear(): void {
    // Revoke object URLs
    this.files.forEach(f => {
      if (f.resultUrl) {
        URL.revokeObjectURL(f.resultUrl);
      }
    });
    this.files = [];
  }

  /**
   * Process all files sequentially
   */
  async processBatch(
    processor: (file: File, onProgress: (progress: number) => void) => Promise<{ blob: Blob; filename: string }>
  ): Promise<FileStatus[]> {
    if (this.isProcessing) {
      throw new Error('Batch processing already in progress');
    }

    this.isProcessing = true;
    this.aborted = false;

    const total = this.files.length;
    let completed = 0;

    for (const fileStatus of this.files) {
      if (this.aborted) {
        fileStatus.status = 'error';
        fileStatus.error = 'Processing aborted';
        continue;
      }

      // Update status to processing
      fileStatus.status = 'processing';
      fileStatus.progress = 0;
      
      if (this.options.onFileStart) {
        this.options.onFileStart(fileStatus);
      }

      try {
        // Process the file
        const result = await processor(fileStatus.file, (progress) => {
          fileStatus.progress = progress;
          if (this.options.onFileProgress) {
            this.options.onFileProgress(fileStatus, progress);
          }
        });

        // Mark as complete
        fileStatus.status = 'done';
        fileStatus.progress = 100;
        fileStatus.result = result.blob;
        fileStatus.outputFilename = result.filename;
        fileStatus.resultUrl = URL.createObjectURL(result.blob);

        if (this.options.onFileComplete) {
          this.options.onFileComplete(fileStatus);
        }

        completed++;
      } catch (error: any) {
        fileStatus.status = 'error';
        fileStatus.error = error.message || 'Processing failed';

        if (this.options.onFileError) {
          this.options.onFileError(fileStatus, error);
        }

        completed++;
      }

      // Update overall progress
      const overallProgress = Math.round((completed / total) * 100);
      if (this.options.onBatchProgress) {
        this.options.onBatchProgress(completed, total, overallProgress);
      }
    }

    this.isProcessing = false;

    if (this.options.onBatchComplete) {
      this.options.onBatchComplete(this.files);
    }

    return this.files;
  }

  /**
   * Abort processing
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Check if processing
   */
  isActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    done: number;
    error: number;
  } {
    return {
      total: this.files.length,
      pending: this.files.filter(f => f.status === 'pending').length,
      processing: this.files.filter(f => f.status === 'processing').length,
      done: this.files.filter(f => f.status === 'done').length,
      error: this.files.filter(f => f.status === 'error').length
    };
  }
}
