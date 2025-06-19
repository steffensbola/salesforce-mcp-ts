import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { SalesforcePasswordAuth } from './password-auth.js';
import * as config from '../config/config.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock config
vi.mock('../config/config.js', () => ({
  getOAuthTokenUrl: vi.fn(),
}));

describe('SalesforcePasswordAuth', () => {
  let auth: SalesforcePasswordAuth;
  const mockClientId = 'test-client-id';
  const mockClientSecret = 'test-client-secret';

  beforeEach(() => {
    auth = new SalesforcePasswordAuth(mockClientId, mockClientSecret);
    vi.clearAllMocks();

    // Mock console methods to avoid noise in test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with client credentials', () => {
      expect(auth).toBeInstanceOf(SalesforcePasswordAuth);
      expect(auth.accessToken).toBeNull();
      expect(auth.instanceUrl).toBeNull();
      expect(auth.refreshToken).toBeNull();
    });
  });

  describe('authenticate', () => {
    const mockResponse = {
      status: 200,
      data: {
        access_token: 'mock-access-token',
        instance_url: 'https://test.salesforce.com',
        refresh_token: 'mock-refresh-token',
        id: 'mock-id',
        token_type: 'Bearer',
        issued_at: '1234567890',
        signature: 'mock-signature',
      },
    };

    beforeEach(() => {
      vi.mocked(config.getOAuthTokenUrl).mockReturnValue(
        'https://login.salesforce.com/services/oauth2/token'
      );
    });

    it('should authenticate successfully with valid credentials', async () => {
      (mockedAxios.post as any).mockResolvedValueOnce(mockResponse);

      const result = await auth.authenticate('test@example.com', 'password', 'token');

      expect(result).toBe(true);
      expect(auth.accessToken).toBe('mock-access-token');
      expect(auth.instanceUrl).toBe('https://test.salesforce.com');
      expect(auth.refreshToken).toBe('mock-refresh-token');
    });

    it('should combine password and security token', async () => {
      (mockedAxios.post as any).mockResolvedValueOnce(mockResponse);

      await auth.authenticate('test@example.com', 'password', 'token');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://login.salesforce.com/services/oauth2/token',
        expect.any(URLSearchParams),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const callArgs = (mockedAxios.post as any).mock.calls[0];
      const params = callArgs[1] as URLSearchParams;
      expect(params.get('password')).toBe('passwordtoken');
    });

    it('should use password only when no security token provided', async () => {
      (mockedAxios.post as any).mockResolvedValueOnce(mockResponse);

      await auth.authenticate('test@example.com', 'password');

      const callArgs = (mockedAxios.post as any).mock.calls[0];
      const params = callArgs[1] as URLSearchParams;
      expect(params.get('password')).toBe('password');
    });

    it('should handle sandbox URL', async () => {
      vi.mocked(config.getOAuthTokenUrl).mockReturnValue(
        'https://test.salesforce.com/services/oauth2/token'
      );
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await auth.authenticate('test@example.com', 'password', '', true);

      expect(config.getOAuthTokenUrl).toHaveBeenCalledWith(true);
    });

    it('should return false on authentication failure', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 400,
        data: { error: 'invalid_grant' },
      });

      const result = await auth.authenticate('test@example.com', 'wrong-password');

      expect(result).toBe(false);
      expect(auth.accessToken).toBeNull();
    });

    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await auth.authenticate('test@example.com', 'password');

      expect(result).toBe(false);
      expect(auth.accessToken).toBeNull();
    });

    it('should handle axios errors with response', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: 'invalid_grant',
            error_description: 'authentication failure',
          },
        },
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await auth.authenticate('test@example.com', 'wrong-password');

      expect(result).toBe(false);
    });
  });

  describe('refreshAccessToken', () => {
    const mockRefreshResponse = {
      status: 200,
      data: {
        access_token: 'new-access-token',
        instance_url: 'https://test.salesforce.com',
        id: 'mock-id',
        token_type: 'Bearer',
        issued_at: '1234567890',
        signature: 'mock-signature',
      },
    };

    beforeEach(() => {
      auth.refreshToken = 'mock-refresh-token';
      vi.mocked(config.getOAuthTokenUrl).mockReturnValue(
        'https://login.salesforce.com/services/oauth2/token'
      );
    });

    it('should refresh token successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockRefreshResponse);

      const result = await auth.refreshAccessToken();

      expect(result).toBe(true);
      expect(auth.accessToken).toBe('new-access-token');
    });

    it('should return false when no refresh token available', async () => {
      auth.refreshToken = null;

      const result = await auth.refreshAccessToken();

      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle refresh token errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Token refresh failed'));

      const result = await auth.refreshAccessToken();

      expect(result).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when both access token and instance URL are set', () => {
      auth.accessToken = 'mock-token';
      auth.instanceUrl = 'https://test.salesforce.com';

      expect(auth.isAuthenticated()).toBe(true);
    });

    it('should return false when access token is missing', () => {
      auth.instanceUrl = 'https://test.salesforce.com';

      expect(auth.isAuthenticated()).toBe(false);
    });

    it('should return false when instance URL is missing', () => {
      auth.accessToken = 'mock-token';

      expect(auth.isAuthenticated()).toBe(false);
    });

    it('should return false when both are missing', () => {
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('should clear all authentication data', () => {
      auth.accessToken = 'mock-token';
      auth.instanceUrl = 'https://test.salesforce.com';
      auth.refreshToken = 'mock-refresh-token';

      auth.clearAuth();

      expect(auth.accessToken).toBeNull();
      expect(auth.instanceUrl).toBeNull();
      expect(auth.refreshToken).toBeNull();
    });
  });
});
