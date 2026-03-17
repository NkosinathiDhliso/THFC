import { supabase } from '../lib/supabase';

/**
 * Interface for API response, providing data, error, success status, and HTTP status.
 * @template T - The type of the data returned by the API.
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  status?: number;
}

/**
 * Handles common API errors based on the HTTP response.
 * Specifically handles 401/403 status codes for session expiration and signs out the user.
 * @param {Response} response - The HTTP response object.
 * @throws {Error} If the response is not OK, throws an error with the HTTP status.
 */
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Attempt to parse error body to check for 'session_not_found' code
      const errorBody = await response.json().catch(() => ({}));
      if (errorBody.code === 'session_not_found') {
        // Sign out the user if the session is not found
        await supabase.auth.signOut();
      }
    }
    // Throw an error including the HTTP status for later parsing
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

/**
 * A client for making API requests with built-in authentication handling,
 * mobile device detection, and enhanced error messages.
 */
export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  /**
   * Constructs an ApiClient instance.
   * @param {string} baseUrl - The base URL for API requests. Defaults to an empty string.
   */
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Retrieves authentication headers, including the Supabase session access token if available.
   * @returns {Promise<Record<string, string>>} A promise that resolves to an object of headers.
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    // Get the current Supabase session
    const { data: { session } } = await supabase.auth.getSession();

    // If an access token exists, add it to the headers
    if (session?.access_token) {
      return {
        ...this.headers,
        'Authorization': `Bearer ${session.access_token}`,
      };
    }

    // Otherwise, return default headers
    return this.headers;
  }

  /**
   * Checks if the current device likely has touch capabilities and smaller screen.
   * Uses modern feature detection instead of unreliable user agent strings.
   * @returns {boolean} True if likely a mobile/touch device, false otherwise.
   */
  private isMobileDevice(): boolean {
    // Use modern feature detection instead of user agent
    const hasTouchscreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasSmallScreen = window.innerWidth <= 768; // Common mobile breakpoint
    
    // Consider it mobile if it has touch AND small screen
    return hasTouchscreen && hasSmallScreen;
  }

  /**
   * Enhances generic error messages with more user-friendly details.
   * Focuses on clear, actionable error messages without device-specific assumptions.
   * @param {unknown} error - The error object to enhance.
   * @returns {string} An enhanced error message.
   */
  private enhanceErrorMessage(error: unknown): string {
    if (error instanceof TypeError && typeof error.message === 'string' && error.message.includes('Failed to fetch')) {
      return 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
    }

    // Check for CORS errors
    if (typeof error.message === 'string' && error.message.includes('CORS')) {
      return 'Server configuration error: The server is not configured to accept requests from this browser. Please contact support.';
    }

    // Check for timeout errors
    if (typeof error.message === 'string' && (error.message.includes('timeout') || error.message.includes('timed out'))) {
      return 'Request timeout: The server took too long to respond. Please try again.';
    }

    // Check for authentication errors
    if (typeof error.message === 'string' && (error.message.includes('401') || error.message.includes('403'))) {
      return 'Authentication error: Please log in again to continue.';
    }

    // Check for server errors
    if (typeof error.message === 'string' && error.message.includes('5')) {
      return 'Server error: The server is experiencing issues. Please try again later.';
    }

    // Default fallback
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }

  /**
   * Generic private method to make an API request. This centralizes common logic for
   * setting up fetch configuration, handling responses, and catching errors.
   * @template T - The expected type of the data in the successful API response.
   * @param {string} method - The HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE').
   * @param {string} endpoint - The API endpoint relative to the baseUrl.
   * @param {unknown} [body] - The request body for methods like POST or PUT.
   * @param {Record<string, string>} [customHeaders] - Optional custom headers to merge or override.
   * @returns {Promise<ApiResponse<T>>} A promise that resolves to an ApiResponse object.
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    customHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      // Get authentication headers and merge with any custom headers
      const headers = {
        ...(await this.getAuthHeaders()),
        ...customHeaders, // Custom headers override default or auth headers if keys are duplicated
      };

      // Configure the fetch request with timeout and security settings
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const config: RequestInit = {
        method,
        headers,
        mode: 'cors', // Enable CORS
        credentials: 'omit', // Do not send cookies or HTTP authentication headers for security
        signal: controller.signal,
        // Additional security headers
        referrerPolicy: 'strict-origin-when-cross-origin',
      };

      // Add request body for methods that typically send one (excluding GET and HEAD)
      if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
        config.body = JSON.stringify(body);
      }

      try {
        // Perform the fetch request
        const response = await fetch(`${this.baseUrl}${endpoint}`, config);
        clearTimeout(timeoutId); // Clear timeout on successful response

        // Handle common API errors (e.g., non-OK status, session expiry)
        await handleApiError(response);

        // Determine content type and parse JSON if applicable
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
          const data = await response.json();
          return { data, success: true, status: response.status };
        }

        // For non-JSON responses, just indicate success
        return { success: true, status: response.status };
      } catch (fetchError) {
        clearTimeout(timeoutId); // Clear timeout on error
        throw fetchError;
      }
    } catch (error) {
      // Log the full error for debugging purposes
      console.error(`API ${method} error:`, error);

      // Handle AbortError specifically for timeouts
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          error: 'Request timeout: The server took too long to respond. Please try again.',
          success: false,
          status: 408, // Request Timeout
        };
      }

      // Default status code for unknown errors
      let statusCode = 500;
      // Try to extract status code from the error message if handleApiError included it
      if (error instanceof Error && typeof error.message === 'string') {
        const statusMatch = error.message.match(/status: (\d+)/);
        if (statusMatch && statusMatch[1]) {
          statusCode = parseInt(statusMatch[1], 10);
        }
      }

      // Return an ApiResponse indicating failure with an enhanced error message and status
      return {
        error: this.enhanceErrorMessage(error),
        success: false,
        status: statusCode,
      };
    }
  }

  /**
   * Sends a GET request to the specified endpoint.
   * @template T - The expected type of the data in the successful API response.
   * @param {string} endpoint - The API endpoint.
   * @returns {Promise<ApiResponse<T>>} A promise that resolves to an ApiResponse object.
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  /**
   * Sends a POST request to the specified endpoint with a body.
   * @template T - The expected type of the data in the successful API response.
   * @param {string} endpoint - The API endpoint.
   * @param {unknown} body - The request body to be sent as JSON.
   * @param {Record<string, string>} [customHeaders] - Optional custom headers.
   * @returns {Promise<ApiResponse<T>>} A promise that resolves to an ApiResponse object.
   */
  async post<T>(endpoint: string, body: unknown, customHeaders?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, customHeaders);
  }

  /**
   * Sends a PUT request to the specified endpoint with a body.
   * @template T - The expected type of the data in the successful API response.
   * @param {string} endpoint - The API endpoint.
   * @param {unknown} body - The request body to be sent as JSON.
   * @returns {Promise<ApiResponse<T>>} A promise that resolves to an ApiResponse object.
   */
  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body);
  }

  /**
   * Sends a DELETE request to the specified endpoint.
   * @template T - The expected type of the data in the successful API response.
   * @param {string} endpoint - The API endpoint.
   * @returns {Promise<ApiResponse<T>>} A promise that resolves to an ApiResponse object.
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }
}

// Default API client instance for general use
export const apiClient = new ApiClient();

// API client instance specifically configured for AWS Lambda Functions, using an environment variable for the base URL
export const awsLambdaClient = new ApiClient(
  import.meta.env.VITE_AWS_API_URL || '' // Use VITE_AWS_API_URL from environment variables
);
