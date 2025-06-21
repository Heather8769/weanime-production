export const performanceUtils = {
  // Monitor function execution time
  measureTime: (fn, name) => {
    return async (...args) => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const end = performance.now();
        console.log(`⚡ [${name}] took ${Math.round(end - start)}ms`);
        return result;
      } catch (error) {
        const end = performance.now();
        console.error(`❌ [${name}] failed after ${Math.round(end - start)}ms:`, error);
        throw error;
      }
    };
  },
  
  // Log memory usage (server-side)
  logMemory: (label) => {
    if (typeof process !== 'undefined') {
      const usage = process.memoryUsage();
      console.log(`💾 [${label}] Memory:`, {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heap: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      });
    }
  },
  
  // Check if function is running out of memory
  checkMemoryLimit: () => {
    if (typeof process !== 'undefined') {
      const usage = process.memoryUsage();
      const memoryUsedMB = usage.rss / 1024 / 1024;
      
      if (memoryUsedMB > 900) { // Alert at 900MB (close to 1024MB limit)
        console.warn(`🚨 HIGH MEMORY USAGE: ${Math.round(memoryUsedMB)}MB`);
        return true;
      }
    }
    return false;
  }
};
