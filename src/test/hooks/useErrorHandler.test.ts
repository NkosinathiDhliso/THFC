import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useErrorHandler } from '../../hooks/useErrorHandler';

describe('useErrorHandler', () => {
  it('handles errors with default options', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useErrorHandler());
    
    const testError = new Error('Test error');
    const handledError = result.current.handleError(testError, 'test context');
    
    expect(handledError).toBe(testError);
    expect(consoleSpy).toHaveBeenCalledWith('Error in test context:', testError);
    
    consoleSpy.mockRestore();
  });

  it('calls custom error handler when provided', () => {
    const mockOnError = vi.fn().mockImplementation(() => {});
    
    const { result } = renderHook(() => useErrorHandler({ onError: mockOnError }));
    
    const testError = new Error('Test error');
    result.current.handleError(testError);
    
    expect(mockOnError).toHaveBeenCalledWith(testError);
  });

  it('handles async errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useErrorHandler());
    
    const asyncFn = async () => {
      throw new Error('Async error');
    };
    
    const result_value = await result.current.handleAsyncError(asyncFn, 'async context', 'fallback');
    
    expect(result_value).toBe('fallback');
    expect(consoleSpy).toHaveBeenCalledWith('Error in async context:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('returns successful async results', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const asyncFn = async () => 'success';
    
    const result_value = await result.current.handleAsyncError(asyncFn);
    
    expect(result_value).toBe('success');
  });

  it('converts non-Error objects to Error instances', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useErrorHandler());
    
    const handledError = result.current.handleError('string error');
    
    expect(handledError).toBeInstanceOf(Error);
    expect(handledError.message).toBe('string error');
    
    consoleSpy.mockRestore();
  });
});