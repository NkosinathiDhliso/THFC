import { SSMClient, GetParameterCommand, GetParametersCommand } from '@aws-sdk/client-ssm';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const region = process.env['REGION'] || 'us-east-1';
const stage = process.env['STAGE'] || 'dev';

const ssmClient = new SSMClient({ region });
const secretsClient = new SecretsManagerClient({ region });

// Cache for configuration values
const configCache = new Map<string, string>();
const secretCache = new Map<string, string>();

/**
 * Get a parameter from AWS Systems Manager Parameter Store
 */
export async function getParameter(name: string, decrypt: boolean = false): Promise<string> {
  const cacheKey = `${name}_${decrypt}`;
  
  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)!;
  }

  try {
    const command = new GetParameterCommand({
      Name: `/thfcscan/${stage}/${name}`,
      WithDecryption: decrypt
    });
    
    const response = await ssmClient.send(command);
    const value = response.Parameter?.Value;
    
    if (!value) {
      throw new Error(`Parameter /thfcscan/${stage}/${name} not found`);
    }
    
    configCache.set(cacheKey, value);
    return value;
  } catch (error) {
    console.error(`Failed to get parameter ${name}:`, error);
    throw error;
  }
}

/**
 * Get multiple parameters from AWS Systems Manager Parameter Store
 */
export async function getParameters(names: string[], decrypt: boolean = false): Promise<Record<string, string>> {
  const parameterNames = names.map(name => `/thfcscan/${stage}/${name}`);
  
  try {
    const command = new GetParametersCommand({
      Names: parameterNames,
      WithDecryption: decrypt
    });
    
    const response = await ssmClient.send(command);
    const result: Record<string, string> = {};
    
    response.Parameters?.forEach(param => {
      if (param.Name && param.Value) {
        const shortName = param.Name.replace(`/thfcscan/${stage}/`, '');
        result[shortName] = param.Value;
        configCache.set(`${shortName}_${decrypt}`, param.Value);
      }
    });
    
    return result;
  } catch (error) {
    console.error('Failed to get parameters:', error);
    throw error;
  }
}

/**
 * Get a secret from AWS Secrets Manager
 */
export async function getSecret(secretName: string): Promise<string> {
  if (secretCache.has(secretName)) {
    return secretCache.get(secretName)!;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: `/thfcscan/${stage}/${secretName}`
    });
    
    const response = await secretsClient.send(command);
    const value = response.SecretString;
    
    if (!value) {
      throw new Error(`Secret /thfcscan/${stage}/${secretName} not found`);
    }
    
    secretCache.set(secretName, value);
    return value;
  } catch (error) {
    console.error(`Failed to get secret ${secretName}:`, error);
    throw error;
  }
}

/**
 * Get application configuration
 */
export async function getAppConfig() {
  const config = await getParameters([
    'supabase/url',
    'supabase/anon_key',
    'azure/storage_connection_string',
    'aws/s3/photo_bucket'
  ]);
  
  const secrets = {
    supabaseServiceKey: await getSecret('supabase/service_role_key'),
    awsSesAccessKeyId: await getSecret('aws/ses/access_key_id'),
    awsSesSecretAccessKey: await getSecret('aws/ses/secret_access_key')
  };
  
  return {
    supabase: {
      url: config['supabase/url'] || process.env['SUPABASE_URL']!,
      anonKey: config['supabase/anon_key'] || process.env['SUPABASE_ANON_KEY']!,
      serviceRoleKey: secrets.supabaseServiceKey
    },
    aws: {
      ses: {
        accessKeyId: secrets.awsSesAccessKeyId,
        secretAccessKey: secrets.awsSesSecretAccessKey,
        region: region
      },
      s3: {
        photoBucket: config['aws/s3/photo_bucket']
      }
    },
    azure: {
      storageConnectionString: config['azure/storage_connection_string']
    },
    stage,
    region
  };
}

/**
 * Clear configuration cache (useful for testing)
 */
export function clearConfigCache(): void {
  configCache.clear();
  secretCache.clear();
}