import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { SalesforceClient } from './salesforce-client.js';
import { SalesforcePasswordAuth } from '../auth/password-auth.js';
import * as config from '../config/config.js';

// Mock dependencies
vi.mock('axios');
vi.mock('../auth/password-auth.js');
vi.mock('../config/config.js', () => ({
  getApiUrl: vi.fn(),
}));

const mockedAxios = vi.mocked(axios);
const MockedSalesforcePasswordAuth = vi.mocked(SalesforcePasswordAuth);

describe('SalesforceClient', () => {
  let client: SalesforceClient;
  let mockAuthClient: any;

  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    username: 'test@example.com',
    password: 'test-password',
    securityToken: 'test-token',
    sandbox: false,
    accessToken: undefined,
    instanceUrl: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create mock auth client
    mockAuthClient = {
      authenticate: vi.fn(),
      refreshAccessToken: vi.fn(),
      accessToken: null,
      instanceUrl: null,
      refreshToken: null,
    };

    MockedSalesforcePasswordAuth.mockImplementation(() => mockAuthClient);
    vi.mocked(config.getApiUrl).mockReturnValue(
      'https://test.salesforce.com/services/data/v58.0/sobjects'
    );

    client = new SalesforceClient({ ...mockConfig });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeInstanceOf(SalesforceClient);
    });
  });

  describe('connect', () => {
    describe('access token authentication', () => {
      it('should connect successfully with valid access token', async () => {
        const configWithToken = {
          ...mockConfig,
          accessToken: 'valid-token',
          instanceUrl: 'https://test.salesforce.com',
        };
        client = new SalesforceClient(configWithToken);

        mockedAxios.mockResolvedValueOnce({ data: {} });

        const result = await client.connect();

        expect(result).toBe(true);
        expect(mockedAxios).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              Authorization: 'Bearer valid-token',
            }),
          })
        );
      });

      it('should fall back to username/password when access token is invalid', async () => {
        const configWithInvalidToken = {
          ...mockConfig,
          accessToken: 'invalid-token',
          instanceUrl: 'https://test.salesforce.com',
        };
        client = new SalesforceClient(configWithInvalidToken);

        // First call (token validation) fails
        mockedAxios.mockRejectedValueOnce(new Error('Unauthorized'));

        // Setup successful username/password auth
        mockAuthClient.authenticate.mockResolvedValueOnce(true);
        mockAuthClient.accessToken = 'new-access-token';
        mockAuthClient.instanceUrl = 'https://test.salesforce.com';

        const result = await client.connect();

        expect(result).toBe(true);
        expect(mockAuthClient.authenticate).toHaveBeenCalledWith(
          'test@example.com',
          'test-password',
          'test-token',
          false
        );
      });
    });

    describe('username/password authentication', () => {
      it('should connect successfully with username/password', async () => {
        mockAuthClient.authenticate.mockResolvedValueOnce(true);
        mockAuthClient.accessToken = 'auth-token';
        mockAuthClient.instanceUrl = 'https://test.salesforce.com';

        const result = await client.connect();

        expect(result).toBe(true);
        expect(MockedSalesforcePasswordAuth).toHaveBeenCalledWith(
          'test-client-id',
          'test-client-secret'
        );
        expect(mockAuthClient.authenticate).toHaveBeenCalledWith(
          'test@example.com',
          'test-password',
          'test-token',
          false
        );
      });

      it('should return false when username/password auth fails', async () => {
        mockAuthClient.authenticate.mockResolvedValueOnce(false);

        const result = await client.connect();

        expect(result).toBe(false);
      });

      it('should return false when required credentials are missing', async () => {
        const incompleteConfig = {
          ...mockConfig,
          username: undefined,
        };
        client = new SalesforceClient(incompleteConfig);

        const result = await client.connect();

        expect(result).toBe(false);
        expect(MockedSalesforcePasswordAuth).not.toHaveBeenCalled();
      });
    });

    describe('token refresh', () => {
      it('should attempt token refresh on connection error', async () => {
        mockAuthClient.authenticate.mockRejectedValueOnce(new Error('Connection failed'));
        mockAuthClient.refreshToken = 'refresh-token';
        mockAuthClient.refreshAccessToken.mockResolvedValueOnce(true);
        mockAuthClient.accessToken = 'refreshed-token';
        mockAuthClient.instanceUrl = 'https://test.salesforce.com';

        const result = await client.connect();

        expect(result).toBe(true);
        expect(mockAuthClient.refreshAccessToken).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('makeRequest', () => {
    beforeEach(() => {
      // Setup authenticated client
      client = new SalesforceClient({
        ...mockConfig,
        accessToken: 'valid-token',
        instanceUrl: 'https://test.salesforce.com',
      });
    });

    it('should make authenticated request successfully', async () => {
      const mockResponse = { data: { success: true } };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await client.makeRequest('GET', '/sobjects');

      expect(result).toEqual({ success: true });
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw error when not authenticated', async () => {
      const unauthenticatedClient = new SalesforceClient(mockConfig);

      await expect(unauthenticatedClient.makeRequest('GET', '/sobjects')).rejects.toThrow(
        'Not authenticated. Call connect() first.'
      );
    });

    it('should retry request after token refresh on 401 error', async () => {
      // Setup client with auth client for refresh capability
      client = new SalesforceClient({
        ...mockConfig,
        accessToken: 'expired-token',
        instanceUrl: 'https://test.salesforce.com',
      });
      (client as any).authClient = mockAuthClient;

      // First request fails with 401
      const unauthorizedError = {
        isAxiosError: true,
        response: { status: 401, data: { message: 'Unauthorized' } },
      };

      // Token refresh succeeds and updates the config
      mockAuthClient.refreshAccessToken.mockResolvedValueOnce(true);
      mockAuthClient.accessToken = 'new-token';
      mockAuthClient.instanceUrl = 'https://test.salesforce.com';

      // Setup axios mocks
      vi.mocked(axios.isAxiosError).mockReturnValue(true);
      mockedAxios
        .mockRejectedValueOnce(unauthorizedError) // First call fails
        .mockResolvedValueOnce({ data: { success: true } }); // Retry succeeds

      // Mock the tryTokenRefresh method to simulate successful refresh
      const originalTryTokenRefresh = (client as any).tryTokenRefresh;
      (client as any).tryTokenRefresh = vi.fn().mockResolvedValueOnce(true);

      const result = await client.makeRequest('GET', '/sobjects');

      expect(result).toEqual({ success: true });
      expect(mockedAxios).toHaveBeenCalledTimes(2);
      expect((client as any).tryTokenRefresh).toHaveBeenCalled();

      // Restore original method
      (client as any).tryTokenRefresh = originalTryTokenRefresh;
    });

    it('should include query parameters and data', async () => {
      const mockResponse = { data: { success: true } };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await client.makeRequest(
        'POST',
        '/sobjects/Account',
        { Name: 'Test Account' },
        { fields: 'Id,Name' }
      );

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          params: { fields: 'Id,Name' },
          data: { Name: 'Test Account' },
        })
      );
    });
  });

  describe('query', () => {
    beforeEach(() => {
      client = new SalesforceClient({
        ...mockConfig,
        accessToken: 'valid-token',
        instanceUrl: 'https://test.salesforce.com',
      });
    });

    it('should execute SOQL query', async () => {
      const mockQueryResult = {
        totalSize: 1,
        done: true,
        records: [{ Id: '001xx000004TmhBAAS', Name: 'Test Account' }],
      };
      mockedAxios.mockResolvedValueOnce({ data: mockQueryResult });

      const result = await client.query('SELECT Id, Name FROM Account');

      expect(result).toEqual(mockQueryResult);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          params: { q: 'SELECT Id, Name FROM Account' },
        })
      );
    });
  });

  describe('queryAll', () => {
    beforeEach(() => {
      client = new SalesforceClient({
        ...mockConfig,
        accessToken: 'valid-token',
        instanceUrl: 'https://test.salesforce.com',
      });
    });

    it('should handle paginated results', async () => {
      const firstPage = {
        totalSize: 2,
        done: false,
        records: [{ Id: '001xx000004TmhBAAS', Name: 'Account 1' }],
        nextRecordsUrl: '/services/data/v58.0/query/01gxx0000001234-2000',
      };
      const secondPage = {
        totalSize: 2,
        done: true,
        records: [{ Id: '001xx000004TmhCAAS', Name: 'Account 2' }],
      };

      mockedAxios
        .mockResolvedValueOnce({ data: firstPage })
        .mockResolvedValueOnce({ data: secondPage });

      const result = await client.queryAll('SELECT Id, Name FROM Account');

      expect(result.records).toHaveLength(2);
      expect(result.done).toBe(true);
      expect(result.records[0].Name).toBe('Account 1');
      expect(result.records[1].Name).toBe('Account 2');
    });

    it('should return single page when done is true', async () => {
      const singlePage = {
        totalSize: 1,
        done: true,
        records: [{ Id: '001xx000004TmhBAAS', Name: 'Test Account' }],
      };
      mockedAxios.mockResolvedValueOnce({ data: singlePage });

      const result = await client.queryAll('SELECT Id, Name FROM Account');

      expect(result.records).toHaveLength(1);
      expect(result.done).toBe(true);
      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });
  });
});
