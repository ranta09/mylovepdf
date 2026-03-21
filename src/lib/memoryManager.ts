/**
 * Memory Manager Utility
 * Manages memory cleanup and prevents leaks
 */

export class MemoryManager {
  private objectUrls: Set<string> = new Set();
  private cleanupCallbacks: Array<() => void> = [];
  private timers: Set<number> = new Set();
  
  /**
   * Register an object URL for cleanup
   */
  registerObjectUrl(url: string) {
    this.objectUrls.add(url);
  }
  
  /**
   * Register a cleanup callback
   */
  registerCleanup(callback: () => void) {
    this.cleanupCallbacks.push(callback);
  }
  
  /**
   * Register a timer for cleanup
   */
  registerTimer(timerId: number) {
    this.timers.add(timerId);
  }
  
  /**
   * Clean up all registered resources
   */
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
    
    // Clear all timers
    this.timers.forEach(timerId => {
      try {
        clearTimeout(timerId);
      } catch (error) {
        console.warn('Failed to clear timer:', error);
      }
    });
    this.timers.clear();
    
    // Run cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Cleanup callback failed:', error);
      }
    });
    this.cleanupCallbacks = [];
  }
  
  /**
   * Get current memory usage (if available)
   */
  getMemoryUsage(): number | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / (1024 * 1024)); // MB
    }
    return null;
  }
  
  /**
   * Get memory usage percentage (if available)
   */
  getMemoryUsagePercent(): number | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }
    return null;
  }
  
  /**
   * Check if memory usage is high
   */
  isMemoryHigh(): boolean {
    const percent = this.getMemoryUsagePercent();
    return percent !== null && percent > 80;
  }
  
  /**
   * Log memory status
   */
  logMemoryStatus() {
    const usage = this.getMemoryUsage();
    const percent = this.getMemoryUsagePercent();
    
    if (usage !== null && percent !== null) {
      console.log(`[Memory] ${usage}MB used (${percent}%)`);
    }
  }
}

/**
 * Global memory manager instance
 */
export const globalMemoryManager = new MemoryManager();

/**
 * Auto-cleanup hook for React components
 */
export const useMemoryCleanup = (manager: MemoryManager = globalMemoryManager) => {
  if (typeof window !== 'undefined') {
    // Cleanup on unmount
    return () => {
      manager.cleanup();
    };
  }
  return () => {};
};

/**
 * Create a scoped memory manager for a specific operation
 */
export const createScopedMemoryManager = (): MemoryManager => {
  return new MemoryManager();
};

/**
 * Chunk large arrays to prevent memory spikes
 */
export const processInChunks = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  chunkSize: number = 10
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);
    
    // Allow garbage collection between chunks
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
};
