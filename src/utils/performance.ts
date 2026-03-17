// Performance monitoring utilities

export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};

export const measureAsyncPerformance = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
  return result;
};

// Bundle size monitoring
export const logBundleSize = () => {
  if (import.meta.env.DEV) {
    console.log('Bundle analysis available with: npm run analyze');
  }
};

// Performance budget warnings
export const checkPerformanceBudget = () => {
  if ('connection' in navigator) {
    const connection = (navigator as Record<string, unknown>).connection;
    if (connection && typeof connection === 'object' && connection !== null && 'effectiveType' in connection && connection.effectiveType === 'slow-2g') {
      console.warn('Slow connection detected - consider optimizing assets');
    }
  }
};

// Memory usage monitoring
export const logMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as Record<string, unknown>).memory;
    if (memory && typeof memory === 'object' && memory !== null) {
      const memoryObj = memory as { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      console.log('Memory usage:', {
        used: Math.round(memoryObj.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memoryObj.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memoryObj.jsHeapSizeLimit / 1048576) + ' MB',
      });
    }
  }
};