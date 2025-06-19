import { config } from 'dotenv';
import { SalesforceConfig } from '../types/salesforce.js';
import { debugLog } from '../utils/debug-log.js';

// Load environment variables
config();

/**
 * Configuration utility for environment variables
 */
export class ConfigManager {
  /**
   * Get Salesforce configuration from environment variables
   */
  static getSalesforceConfig(): SalesforceConfig {
    // Primary environment variable names
    const clientId = process.env.SALESFORCE_CLIENT_ID ?? process.env.SF_CONSUMER_KEY;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET ?? process.env.SF_CONSUMER_SECRET;
    const username = process.env.SALESFORCE_USERNAME ?? process.env.SF_USERNAME;
    const password = process.env.SALESFORCE_PASSWORD ?? process.env.SF_PASSWORD;
    const securityToken = process.env.SALESFORCE_SECURITY_TOKEN ?? process.env.SF_SECURITY_TOKEN;
    const sandbox = (process.env.SALESFORCE_SANDBOX ?? 'false').toLowerCase() === 'true';
    const accessToken = process.env.SALESFORCE_ACCESS_TOKEN;
    const instanceUrl = process.env.SALESFORCE_INSTANCE_URL;

    if (!clientId || !clientSecret) {
      throw new Error(
        'Missing required environment variables: SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET must be set'
      );
    }

    return {
      clientId,
      clientSecret,
      username,
      password,
      securityToken,
      sandbox,
      accessToken,
      instanceUrl,
    };
  }

  /**
   * Validate that required configuration is present
   */
  static validateConfig(config: SalesforceConfig): void {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('Client ID and Client Secret are required');
    }

    // Check if we have either direct tokens or username/password
    const hasDirectTokens = config.accessToken && config.instanceUrl;
    const hasCredentials = config.username && config.password;

    if (!hasDirectTokens && !hasCredentials) {
      throw new Error(
        'Either (SALESFORCE_ACCESS_TOKEN + SALESFORCE_INSTANCE_URL) or (SALESFORCE_USERNAME + SALESFORCE_PASSWORD) must be provided'
      );
    }
  }

  /**
   * Get configuration with validation
   */
  static getValidatedConfig(): SalesforceConfig {
    const config = this.getSalesforceConfig();
    this.validateConfig(config);
    return config;
  }

  /**
   * Log configuration status (without sensitive data)
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  static logConfigStatus(): void {
    // Only log config status when DEBUG is enabled
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      const config = this.getSalesforceConfig();

      debugLog('🔧 Configuration Status:');
      debugLog(`   Client ID: ${config.clientId ? '✅ Set' : '❌ Missing'}`);
      debugLog(`   Client Secret: ${config.clientSecret ? '✅ Set' : '❌ Missing'}`);
      debugLog(`   Username: ${config.username ? '✅ Set' : '❌ Missing'}`);
      debugLog(`   Password: ${config.password ? '✅ Set' : '❌ Missing'}`);
      debugLog(`   Security Token: ${config.securityToken ? '✅ Set' : '❌ Missing'}`);
      debugLog(`   Access Token: ${config.accessToken ? '✅ Set' : '❌ Missing'}`);
      debugLog(`   Instance URL: ${config.instanceUrl ? '✅ Set' : '❌ Missing'}`);
      debugLog(`   Sandbox: ${config.sandbox ? '✅ Enabled' : '❌ Disabled'}`);
    }
  }
}

/**
 * Salesforce API endpoints
 */
export const SALESFORCE_ENDPOINTS = {
  LOGIN_URL: 'https://login.salesforce.com',
  SANDBOX_URL: 'https://test.salesforce.com',
  OAUTH_TOKEN_PATH: '/services/oauth2/token',
  API_VERSION: 'v58.0',
} as const;

/**
 * Get the appropriate Salesforce base URL
 */
export function getSalesforceBaseUrl(sandbox: boolean): string {
  return sandbox ? SALESFORCE_ENDPOINTS.SANDBOX_URL : SALESFORCE_ENDPOINTS.LOGIN_URL;
}

/**
 * Get the OAuth token URL
 */
export function getOAuthTokenUrl(sandbox: boolean): string {
  return `${getSalesforceBaseUrl(sandbox)}${SALESFORCE_ENDPOINTS.OAUTH_TOKEN_PATH}`;
}

/**
 * Get API URL for instance
 */
export function getApiUrl(instanceUrl: string, path: string): string {
  const cleanInstanceUrl = instanceUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanInstanceUrl}/services/data/${SALESFORCE_ENDPOINTS.API_VERSION}${cleanPath}`;
}
