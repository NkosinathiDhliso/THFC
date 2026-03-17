import { useCallback } from 'react';

interface ErrorHandlerOptions {
  onError?: (error: Error) => void;
  logToConsole?: boolean;
  logToService?: boolean;
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const { onError, logToConsole = true, logToService = false } = options;

  const handleError = useCallback(
    (error: unknown, context?: string) => {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (logToConsole) {
        console.error(`Error${context ? ` in ${context}` : ''}:`, errorObj);
      }

      if (logToService && import.meta.env.PROD) {
        // Log to external service in production
        // Example: logErrorToService(errorObj, context);
      }

      if (onError) {
        onError(errorObj);
      }

      return errorObj;
    },
    [onError, logToConsole, logToService]
  );

  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      context?: string,
      fallbackValue?: T
    ): Promise<T | undefined> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, context);
        return fallbackValue;
      }
    },
    [handleError]
  );

  return { handleError, handleAsyncError };
};