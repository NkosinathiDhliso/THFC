/**
 * Application configuration utility
 * Manages environment variables and app settings
 */

export interface AppConfig {
  awsApiUrl?: string;
  awsApiKey?: string;
  s3BucketName?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  environment: 'development' | 'production' | 'staging';
}

/**
 * Get the current application configuration
 */
export const getAppConfig = (): AppConfig => {
  return {
    awsApiUrl: import.meta.env.VITE_AWS_API_URL,
    awsApiKey: import.meta.env.VITE_AWS_API_KEY,
    s3BucketName: import.meta.env.VITE_S3_BUCKET_NAME || 'thfcscan-storage-prod',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    environment: (import.meta.env.VITE_ENVIRONMENT as 'development' | 'production' | 'staging') || 'development'
  };
};

/**
 * Check if required configuration is present
 */
export const validateConfig = (): { isValid: boolean; missingKeys: string[] } => {
  const config = getAppConfig();
  const requiredKeys: (keyof AppConfig)[] = ['supabaseUrl', 'supabaseAnonKey'];
  const missingKeys: string[] = [];

  for (const key of requiredKeys) {
    if (!config[key]) {
      missingKeys.push(key);
    }
  }

  return {
    isValid: missingKeys.length === 0,
    missingKeys
  };
};

/**
 * Get environment-specific settings
 */
export const getEnvironmentSettings = () => {
  const config = getAppConfig();
  
  switch (config.environment) {
    case 'production':
      return {
        apiTimeout: 30000,
        maxRetries: 3,
        logLevel: 'error',
        enableAnalytics: true
      };
    case 'staging':
      return {
        apiTimeout: 20000,
        maxRetries: 2,
        logLevel: 'warn',
        enableAnalytics: false
      };
    default: // development
      return {
        apiTimeout: 10000,
        maxRetries: 1,
        logLevel: 'debug',
        enableAnalytics: false
      };
  }
};
