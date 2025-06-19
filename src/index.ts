#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SalesforceMCPServer } from './server/mcp-server.js';
import { debugLog, errorLog } from './utils/debug-log.js';

/**
 * Main entry point for the MCP Salesforce TypeScript server
 */
async function main(): Promise<void> {
  debugLog('🚀 Starting MCP Salesforce TypeScript Server...');

  try {
    // Create and initialize the server
    const mcpServer = new SalesforceMCPServer();
    await mcpServer.initialize();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await mcpServer.getServer().connect(transport);

    debugLog('✅ MCP Salesforce server is running and ready for connections');

    // Keep the process running
    process.on('SIGINT', async () => {
      debugLog('\n🛑 Shutting down MCP Salesforce server...');
      await transport.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      debugLog('\n🛑 Shutting down MCP Salesforce server...');
      await transport.close();
      process.exit(0);
    });
  } catch (error) {
    errorLog('❌ Failed to start MCP Salesforce server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  errorLog('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  errorLog('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    errorLog('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { main };
