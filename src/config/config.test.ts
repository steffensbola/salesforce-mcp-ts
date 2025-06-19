import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from './config.js';

describe('ConfigManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getSalesforceConfig', () => {
    it('should return config with primary environment variables', () => {
      process.env.SALESFORCE_CLIENT_ID = 'test-client-id';
      process.env.SALESFORCE_CLIENT_SECRET = 'test-client-secret';
      process.env.SALESFORCE_USERNAME = 'test@example.com';
      process.env.SALESFORCE_PASSWORD = 'test-password';
      process.env.SALESFORCE_SECURITY_TOKEN = 'test-token';
      process.env.SALESFORCE_SANDBOX = 'true';

      const config = ConfigManager.getSalesforceConfig();

      expect(config).toEqual({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        username: 'test@example.com',
        password: 'test-password',
        securityToken: 'test-token',
        sandbox: true,
        accessToken: undefined,
        instanceUrl: undefined,
      });
    });

    it('should use fallback environment variables', () => {
      process.env.SF_CONSUMER_KEY = 'fallback-client-id';
      process.env.SF_CONSUMER_SECRET = 'fallback-client-secret';
      process.env.SF_USERNAME = 'fallback@example.com';
      process.env.SF_PASSWORD = 'fallback-password';
      process.env.SF_SECURITY_TOKEN = 'fallback-token';

      const config = ConfigManager.getSalesforceConfig();

      expect(config.clientId).toBe('fallback-client-id');
      expect(config.clientSecret).toBe('fallback-client-secret');
      expect(config.username).toBe('fallback@example.com');
      expect(config.password).toBe('fallback-password');
      expect(config.securityToken).toBe('fallback-token');
    });

    it('should prefer primary environment variables over fallbacks', () => {
      process.env.SALESFORCE_CLIENT_ID = 'primary-client-id';
      process.env.SF_CONSUMER_KEY = 'fallback-client-id';
      process.env.SALESFORCE_CLIENT_SECRET = 'primary-client-secret';
      process.env.SF_CONSUMER_SECRET = 'fallback-client-secret';

      const config = ConfigManager.getSalesforceConfig();

      expect(config.clientId).toBe('primary-client-id');
      expect(config.clientSecret).toBe('primary-client-secret');
    });

    it('should default sandbox to false', () => {
      process.env.SALESFORCE_CLIENT_ID = 'test-client-id';
      process.env.SALESFORCE_CLIENT_SECRET = 'test-client-secret';

      const config = ConfigManager.getSalesforceConfig();

      expect(config.sandbox).toBe(false);
    });

    it('should parse sandbox as true for various truthy values', () => {
      const truthyValues = ['true', 'TRUE', 'True'];

      for (const value of truthyValues) {
        process.env.SALESFORCE_CLIENT_ID = 'test-client-id';
        process.env.SALESFORCE_CLIENT_SECRET = 'test-client-secret';
        process.env.SALESFORCE_SANDBOX = value;

        const config = ConfigManager.getSalesforceConfig();
        expect(config.sandbox).toBe(true);
      }
    });

    it('should throw error when client ID is missing', () => {
      process.env.SALESFORCE_CLIENT_SECRET = 'test-client-secret';

      expect(() => ConfigManager.getSalesforceConfig()).toThrow(
        'Missing required environment variables: SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET must be set'
      );
    });

    it('should throw error when client secret is missing', () => {
      process.env.SALESFORCE_CLIENT_ID = 'test-client-id';

      expect(() => ConfigManager.getSalesforceConfig()).toThrow(
        'Missing required environment variables: SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET must be set'
      );
    });
  });

  describe('validateConfig', () => {
    it('should not throw for valid config with client credentials and tokens', () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        accessToken: 'test-token',
        instanceUrl: 'https://test.salesforce.com',
        sandbox: false,
      };

      expect(() => ConfigManager.validateConfig(config)).not.toThrow();
    });

    it('should not throw for valid config with username and password', () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        username: 'test@example.com',
        password: 'test-password',
        sandbox: false,
      };

      expect(() => ConfigManager.validateConfig(config)).not.toThrow();
    });

    it('should throw error when client ID is missing', () => {
      const config = {
        clientId: '',
        clientSecret: 'test-client-secret',
        sandbox: false,
      };

      expect(() => ConfigManager.validateConfig(config)).toThrow(
        'Client ID and Client Secret are required'
      );
    });

    it('should throw error when client secret is missing', () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: '',
        sandbox: false,
      };

      expect(() => ConfigManager.validateConfig(config)).toThrow(
        'Client ID and Client Secret are required'
      );
    });

    it('should throw error when neither tokens nor credentials are provided', () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        sandbox: false,
      };

      expect(() => ConfigManager.validateConfig(config)).toThrow(
        'Either (SALESFORCE_ACCESS_TOKEN + SALESFORCE_INSTANCE_URL) or (SALESFORCE_USERNAME + SALESFORCE_PASSWORD) must be provided'
      );
    });
  });
});
