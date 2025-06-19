import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SalesforceMCPServer } from './mcp-server.js';
import { SalesforceClient } from '../client/salesforce-client.js';
import { ConfigManager } from '../config/config.js';

// Mock dependencies
vi.mock('@modelcontextprotocol/sdk/server/index.js');
vi.mock('../client/salesforce-client.js');
vi.mock('../config/config.js');

const MockedServer = vi.mocked(Server);
const MockedSalesforceClient = vi.mocked(SalesforceClient);
const MockedConfigManager = vi.mocked(ConfigManager);

describe('SalesforceMCPServer', () => {
  let server: SalesforceMCPServer;
  let mockServerInstance: any;
  let mockSalesforceClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock server instance
    mockServerInstance = {
      setRequestHandler: vi.fn(),
    };
    MockedServer.mockImplementation(() => mockServerInstance);

    // Mock Salesforce client
    mockSalesforceClient = {
      connect: vi.fn(),
      query: vi.fn(),
      search: vi.fn(),
      getObjectFields: vi.fn(),
      getRecord: vi.fn(),
      createRecord: vi.fn(),
      updateRecord: vi.fn(),
      deleteRecord: vi.fn(),
      makeRequest: vi.fn(),
    };
    MockedSalesforceClient.mockImplementation(() => mockSalesforceClient);

    // Mock config
    const mockConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      sandbox: false,
    };
    MockedConfigManager.getSalesforceConfig.mockReturnValue(mockConfig);

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize server with correct configuration', () => {
    server = new SalesforceMCPServer();

    expect(MockedServer).toHaveBeenCalledWith(
      {
        name: 'salesforce-mcp-ts',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    expect(MockedConfigManager.getSalesforceConfig).toHaveBeenCalled();
    expect(MockedSalesforceClient).toHaveBeenCalled();
  });

  it('should setup tool handlers', () => {
    server = new SalesforceMCPServer();

    expect(mockServerInstance.setRequestHandler).toHaveBeenCalledTimes(2);
  });

  it('should return server instance', () => {
    server = new SalesforceMCPServer();

    const serverInstance = server.getServer();

    expect(serverInstance).toBe(mockServerInstance);
  });

  it('should initialize successfully when connection succeeds', async () => {
    server = new SalesforceMCPServer();
    mockSalesforceClient.connect.mockResolvedValue(true);
    MockedConfigManager.logConfigStatus = vi.fn();

    await server.initialize();

    expect(MockedConfigManager.logConfigStatus).toHaveBeenCalled();
    expect(mockSalesforceClient.connect).toHaveBeenCalled();
  });

  it('should handle connection failure gracefully', async () => {
    server = new SalesforceMCPServer();
    mockSalesforceClient.connect.mockResolvedValue(false);
    MockedConfigManager.logConfigStatus = vi.fn();

    await server.initialize();

    expect(MockedConfigManager.logConfigStatus).toHaveBeenCalled();
    expect(mockSalesforceClient.connect).toHaveBeenCalled();
  });

  it('should handle connection errors gracefully', async () => {
    server = new SalesforceMCPServer();
    mockSalesforceClient.connect.mockRejectedValue(new Error('Connection failed'));
    MockedConfigManager.logConfigStatus = vi.fn();

    await server.initialize();

    expect(MockedConfigManager.logConfigStatus).toHaveBeenCalled();
    expect(mockSalesforceClient.connect).toHaveBeenCalled();
  });
});
