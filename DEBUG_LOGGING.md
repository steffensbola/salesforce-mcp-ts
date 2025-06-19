# Debug Logging Configuration

The MCP Salesforce TypeScript server now supports configurable debug logging to prevent console output from interfering with the MCP protocol communication.

## How It Works

- **Normal Mode**: No informational logs are output, keeping stdout clean for MCP protocol messages
- **Debug Mode**: Detailed logging is sent to stderr when debug mode is enabled

## Enabling Debug Mode

Set one of these environment variables:

```bash
# Option 1: Set DEBUG flag
export DEBUG=true

# Option 2: Set development environment
export NODE_ENV=development
```

## Debug Output Examples

When debug mode is enabled, you'll see logs like:

```
🚀 Starting MCP Salesforce TypeScript Server...
🔧 Configuration Status:
   Client ID: ✅ Set
   Client Secret: ✅ Set
   Username: ✅ Set
   Password: ✅ Set
   Security Token: ✅ Set
   Access Token: ❌ Missing
   Instance URL: ❌ Missing
   Sandbox: ✅ Enabled
🔐 Using username/password authentication with OAuth flow...
🔐 Authenticating with Salesforce using password flow...
✅ Authentication successful!
   Instance URL: https://your-org.salesforce.com
✅ Salesforce connection established on startup
✅ MCP Salesforce server is running and ready for connections
```

## Running with Debug Mode

```bash
# Start with debug logging
DEBUG=true npm start

# Or use development mode
NODE_ENV=development npm start
```

## Why This Matters

The Model Context Protocol (MCP) uses stdout for protocol communication. Any console.log output to stdout can interfere with the JSON-RPC messages between the MCP client and server, causing parsing errors like:

```
Failed to parse message: "🚀 Starting MCP Salesforce TypeScript Server...\n"
```

By routing debug logs to stderr and making them optional, the server maintains clean protocol communication while still providing useful debugging information when needed.
