/**
 * Performance Monitor Utility
 * Tracks and reports performance metrics
 */

export class PerformanceMonitor {
  private startTime: number = 0;
  private checkpoints: Map<string, number> = new Map();
  private metadata: Record<string, any> = {};
  
  start(metadata?: Record<string, any>) {
    this.startTime = performance.now();
    this.checkpoints.clear();
    this.metadata = metadata || {};
  }
  
  checkpoint(name: string) {
    if (this.startTime === 0) {
      console.warn('PerformanceMonitor: start() not called');
      return;
    }
    this.checkpoints.set(name, performance.now() - this.startTime);
  }
  
  end(): number {
    if (this.startTime === 0) {
      return 0;
    }
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
  
  log(prefix: string = 'Performance') {
    const report = this.getReport();
    console.log(`[${prefix}]`, {
      ...report,
      metadata: this.metadata
    });
  }
  
  logTable() {
    console.table(this.getReport());
  }
  
  /**
   * Get memory usage if available
   */
  getMemoryUsage(): number | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / (1024 * 1024)); // MB
    }
    return null;
  }
  
  /**
   * Get formatted duration string
   */
  getFormattedDuration(): string {
    const ms = this.end();
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * Simple performance timer for quick measurements
 */
export const measureTime = async <T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  if (label) {
    console.log(`[${label}] ${Math.round(duration)}ms`);
  }
  
  return { result, duration };
};

/**
 * Track conversion metrics
 */
export interface ConversionMetrics {
  tool: string;
  fileSize: number;
  duration: number;
  success: boolean;
  error?: string;
}

export const trackConversion = (metrics: ConversionMetrics) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Conversion Metrics]', metrics);
  }
  
  // Send to analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'conversion', {
      tool_name: metrics.tool,
      file_size: metrics.fileSize,
      duration_ms: metrics.duration,
      success: metrics.success,
      error: metrics.error
    });
  }
};
