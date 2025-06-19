import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  TextContent,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SalesforceClient } from '../client/salesforce-client.js';
import { ConfigManager } from '../config/config.js';

import {
  ToolAuthenticatePasswordArgs,
  ToolSoqlQueryArgs,
  ToolSoslSearchArgs,
  ToolGetObjectFieldsArgs,
  ToolGetRecordArgs,
  ToolCreateRecordArgs,
  ToolUpdateRecordArgs,
  ToolDeleteRecordArgs,
  ToolToolingExecuteArgs,
  ToolApexExecuteArgs,
  ToolRestfulArgs,
} from '../types/salesforce.js';
import { debugLog, errorLog } from '../utils/debug-log.js';

/**
 * MCP Server for Salesforce integration
 */
export class SalesforceMCPServer {
  private readonly server: Server;
  private salesforceClient: SalesforceClient;

  constructor() {
    this.server = new Server(
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

    // Initialize Salesforce client with configuration
    const config = ConfigManager.getSalesforceConfig();
    this.salesforceClient = new SalesforceClient(config);

    this.setupToolHandlers();
  }

  /**
   * Ensures the client is authenticated before proceeding
   * @throws {Error} If not authenticated
   */
  private ensureAuthenticated(): void {
    if (!this.salesforceClient.isAuthenticated()) {
      throw new Error(
        'Not authenticated. Please authenticate first using the authenticate_password tool.'
      );
    }
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getToolDefinitions(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'authenticate_password':
            return await this.handleAuthenticatePassword(
              args as unknown as ToolAuthenticatePasswordArgs
            );
          case 'run_soql_query':
            return await this.handleSoqlQuery(args as unknown as ToolSoqlQueryArgs);
          case 'run_sosl_search':
            return await this.handleSoslSearch(args as unknown as ToolSoslSearchArgs);
          case 'get_object_fields':
            return await this.handleGetObjectFields(args as unknown as ToolGetObjectFieldsArgs);
          case 'get_record':
            return await this.handleGetRecord(args as unknown as ToolGetRecordArgs);
          case 'create_record':
            return await this.handleCreateRecord(args as unknown as ToolCreateRecordArgs);
          case 'update_record':
            return await this.handleUpdateRecord(args as unknown as ToolUpdateRecordArgs);
          case 'delete_record':
            return await this.handleDeleteRecord(args as unknown as ToolDeleteRecordArgs);
          case 'tooling_execute':
            return await this.handleToolingExecute(args as unknown as ToolToolingExecuteArgs);
          case 'apex_execute':
            return await this.handleApexExecute(args as unknown as ToolApexExecuteArgs);
          case 'restful':
            return await this.handleRestful(args as unknown as ToolRestfulArgs);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `❌ Error: ${errorMessage}`,
            } as TextContent,
          ],
        };
      }
    });
  }

  /**
   * Define available tools
   */
  private getToolDefinitions(): Tool[] {
    return [
      this.getAuthenticationTool(),
      ...this.getQueryTools(),
      ...this.getRecordTools(),
      ...this.getApiTools(),
    ];
  }

  /**
   * Authentication tool definition
   */
  private getAuthenticationTool(): Tool {
    return {
      name: 'authenticate_password',
      description:
        'Authenticate using username/password with OAuth Resource Owner Password Credentials Flow',
      inputSchema: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: 'Salesforce username',
          },
          password: {
            type: 'string',
            description: 'Salesforce password',
          },
          security_token: {
            type: 'string',
            description: 'Salesforce security token (if required)',
          },
          sandbox: {
            type: 'boolean',
            description: 'Whether to authenticate against Salesforce Sandbox (default: false)',
          },
        },
        required: ['username', 'password'],
      },
    };
  }

  /**
   * Query and search tools definitions
   */
  private getQueryTools(): Tool[] {
    return [
      {
        name: 'run_soql_query',
        description: 'Executes a SOQL query against Salesforce',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The SOQL query to execute',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'run_sosl_search',
        description: 'Executes a SOSL search against Salesforce',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'The SOSL search to execute (e.g., "FIND {John Smith} IN ALL FIELDS")',
            },
          },
          required: ['search'],
        },
      },
      {
        name: 'get_object_fields',
        description: 'Retrieves field Names, labels and types for a specific Salesforce object',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'The name of the Salesforce object (e.g., "Account", "Contact")',
            },
          },
          required: ['object_name'],
        },
      },
    ];
  }

  /**
   * Record CRUD operations tools definitions
   */
  private getRecordTools(): Tool[] {
    return [
      {
        name: 'get_record',
        description: 'Retrieves a specific record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'The name of the Salesforce object (e.g., "Account", "Contact")',
            },
            record_id: {
              type: 'string',
              description: 'The ID of the record to retrieve',
            },
          },
          required: ['object_name', 'record_id'],
        },
      },
      {
        name: 'create_record',
        description: 'Creates a new record',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'The name of the Salesforce object (e.g., "Account", "Contact")',
            },
            data: {
              type: 'object',
              description: 'The data for the new record',
              additionalProperties: true,
            },
          },
          required: ['object_name', 'data'],
        },
      },
      {
        name: 'update_record',
        description: 'Updates an existing record',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'The name of the Salesforce object (e.g., "Account", "Contact")',
            },
            record_id: {
              type: 'string',
              description: 'The ID of the record to update',
            },
            data: {
              type: 'object',
              description: 'The updated data for the record',
              additionalProperties: true,
            },
          },
          required: ['object_name', 'record_id', 'data'],
        },
      },
      {
        name: 'delete_record',
        description: 'Deletes a record',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'The name of the Salesforce object (e.g., "Account", "Contact")',
            },
            record_id: {
              type: 'string',
              description: 'The ID of the record to delete',
            },
          },
          required: ['object_name', 'record_id'],
        },
      },
    ];
  }

  /**
   * API and advanced tools definitions
   */
  private getApiTools(): Tool[] {
    return [
      {
        name: 'tooling_execute',
        description: 'Executes a Tooling API request',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'The Tooling API endpoint to call (e.g., "sobjects/ApexClass")',
            },
            method: {
              type: 'string',
              description: 'The HTTP method (default: "GET")',
              enum: ['GET', 'POST', 'PATCH', 'DELETE'],
            },
            data: {
              type: 'object',
              description: 'Data for POST/PATCH requests',
              additionalProperties: true,
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'apex_execute',
        description: 'Executes an Apex REST request',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'The Apex REST endpoint to call (e.g., "/MyApexClass")',
            },
            method: {
              type: 'string',
              description: 'The HTTP method (default: "GET")',
              enum: ['GET', 'POST', 'PATCH', 'DELETE'],
            },
            data: {
              type: 'object',
              description: 'Data for POST/PATCH requests',
              additionalProperties: true,
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'restful',
        description: 'Makes a direct REST API call to Salesforce',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path of the REST API endpoint (e.g., "sobjects/Account/describe")',
            },
            method: {
              type: 'string',
              description: 'The HTTP method (default: "GET")',
              enum: ['GET', 'POST', 'PATCH', 'DELETE'],
            },
            params: {
              type: 'object',
              description: 'Query parameters for the request',
              additionalProperties: true,
            },
            data: {
              type: 'object',
              description: 'Data for POST/PATCH requests',
              additionalProperties: true,
            },
          },
          required: ['path'],
        },
      },
    ];
  }

  /**
   * Handle password authentication
   */
  private async handleAuthenticatePassword(
    args: ToolAuthenticatePasswordArgs
  ): Promise<CallToolResult> {
    const { username, password, security_token = '', sandbox = false } = args;

    if (!username || !password) {
      throw new Error('Password authentication requires username and password parameters.');
    }

    // Get OAuth credentials from environment
    const config = ConfigManager.getSalesforceConfig();

    if (!config.clientId || !config.clientSecret) {
      throw new Error(
        'Password authentication requires SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET environment variables to be set.'
      );
    }

    // Update the client configuration with provided credentials
    this.salesforceClient = new SalesforceClient({
      ...config,
      username,
      password,
      securityToken: security_token,
      sandbox,
    });

    const success = await this.salesforceClient.connect();

    if (success) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ Password authentication successful!\nConnected to: ${this.salesforceClient.getInstanceUrl()}\nYou can now use other Salesforce tools.`,
          } as TextContent,
        ],
      };
    }
    throw new Error('Password authentication failed. Please check your credentials and try again.');
  }

  /**
   * Handle SOQL query
   */
  private async handleSoqlQuery(args: ToolSoqlQueryArgs): Promise<CallToolResult> {
    const { query } = args;

    this.ensureAuthenticated();

    const results = await this.salesforceClient.queryAll(query);

    return {
      content: [
        {
          type: 'text',
          text: `SOQL Query Results (JSON):\n${JSON.stringify(results, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Handle SOSL search
   */
  private async handleSoslSearch(args: ToolSoslSearchArgs): Promise<CallToolResult> {
    const { search } = args;

    this.ensureAuthenticated();

    const results = await this.salesforceClient.search(search);

    return {
      content: [
        {
          type: 'text',
          text: `SOSL Search Results (JSON):\n${JSON.stringify(results, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Handle get object fields
   */
  private async handleGetObjectFields(args: ToolGetObjectFieldsArgs): Promise<CallToolResult> {
    const { object_name } = args;

    this.ensureAuthenticated();

    const fields = await this.salesforceClient.getObjectFields(object_name);

    return {
      content: [
        {
          type: 'text',
          text: `${object_name} Metadata (JSON):\n${JSON.stringify(fields, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Handle get record
   */
  private async handleGetRecord(args: ToolGetRecordArgs): Promise<CallToolResult> {
    const { object_name, record_id } = args;

    this.ensureAuthenticated();

    const record = await this.salesforceClient.getRecord(object_name, record_id);

    return {
      content: [
        {
          type: 'text',
          text: `${object_name} Record (JSON):\n${JSON.stringify(record, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Handle create record
   */
  private async handleCreateRecord(args: ToolCreateRecordArgs): Promise<CallToolResult> {
    const { object_name, data } = args;

    this.ensureAuthenticated();

    const result = await this.salesforceClient.createRecord(object_name, data);

    return {
      content: [
        {
          type: 'text',
          text: `Create ${object_name} Record Result (JSON):\n${JSON.stringify(result, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Handle update record
   */
  private async handleUpdateRecord(args: ToolUpdateRecordArgs): Promise<CallToolResult> {
    const { object_name, record_id, data } = args;

    this.ensureAuthenticated();

    const success = await this.salesforceClient.updateRecord(object_name, record_id, data);

    return {
      content: [
        {
          type: 'text',
          text: `Update ${object_name} Record Result: ${success ? 'Success' : 'Failed'}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Handle delete record
   */
  private async handleDeleteRecord(args: ToolDeleteRecordArgs): Promise<CallToolResult> {
    const { object_name, record_id } = args;

    this.ensureAuthenticated();

    const success = await this.salesforceClient.deleteRecord(object_name, record_id);

    return {
      content: [
        {
          type: 'text',
          text: `Delete ${object_name} Record Result: ${success ? 'Success' : 'Failed'}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Handle tooling execute
   */
  private async handleToolingExecute(args: ToolToolingExecuteArgs): Promise<CallToolResult> {
    const { action, method = 'GET', data } = args;

    this.ensureAuthenticated();

    const result = await this.salesforceClient.toolingExecute(action, method, data);

    return {
      content: [
        {
          type: 'text',
          text: `Tooling Execute Result (JSON):\n${JSON.stringify(result, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Handle apex execute
   */
  private async handleApexExecute(args: ToolApexExecuteArgs): Promise<CallToolResult> {
    const { action, method = 'GET', data } = args;

    this.ensureAuthenticated();

    const result = await this.salesforceClient.apexExecute(action, method, data);

    return {
      content: [
        {
          type: 'text',
          text: `Apex Execute Result (JSON):\n${JSON.stringify(result, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Handle restful API call
   */
  private async handleRestful(args: ToolRestfulArgs): Promise<CallToolResult> {
    const { path, method = 'GET', params, data } = args;

    this.ensureAuthenticated();

    const result = await this.salesforceClient.restful(path, method, params, data);

    return {
      content: [
        {
          type: 'text',
          text: `RESTful API Call Result (JSON):\n${JSON.stringify(result, null, 2)}`,
        } as TextContent,
      ],
    };
  }

  /**
   * Get the server instance
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Initialize the Salesforce connection if possible
   */
  async initialize(): Promise<void> {
    try {
      ConfigManager.logConfigStatus();

      // Try to connect with existing configuration
      if (await this.salesforceClient.connect()) {
        debugLog('✅ Salesforce connection established on startup');
      } else {
        errorLog(
          'ℹ️  Salesforce connection not established. Use authenticate_password tool to connect.'
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorLog(`ℹ️  Salesforce connection will be established when needed. (${errorMessage})`);
    }
  }
}
