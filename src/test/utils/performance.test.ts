import { describe, it, expect, vi } from 'vitest';
import { measurePerformance, measureAsyncPerformance, checkPerformanceBudget } from '../../utils/performance';

describe('Performance Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures synchronous performance', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const testFn = vi.fn();
    measurePerformance('test operation', testFn);
    
    expect(testFn).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/test operation took \d+(\.\d+)? milliseconds/)
    );
    
    consoleSpy.mockRestore();
  });

  it('measures asynchronous performance', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const testFn = vi.fn().mockResolvedValue('result');
    const result = await measureAsyncPerformance('async test', testFn);
    
    expect(testFn).toHaveBeenCalled();
    expect(result).toBe('result');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/async test took \d+(\.\d+)? milliseconds/)
    );
    
    consoleSpy.mockRestore();
  });

  it('checks performance budget with slow connection', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock navigator.connection
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: { effectiveType: 'slow-2g' },
    });
    
    checkPerformanceBudget();
    
    expect(consoleSpy).toHaveBeenCalledWith('Slow connection detected - consider optimizing assets');
    
    consoleSpy.mockRestore();
  });

  it('handles missing connection API gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Remove connection property
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: undefined,
    });
    
    checkPerformanceBudget();
    
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});