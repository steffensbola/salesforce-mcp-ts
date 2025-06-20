# MCP Salesforce TypeScript Connector

A TypeScript implementation of a Model Context Protocol (MCP) server for Salesforce integration, allowing LLMs to interact with Salesforce data through SOQL queries, SOSL searches, and CRUD operations.

## Features

- **🔐 Simplified Password Authentication**: Secure OAuth 2.0 Resource Owner Password Credentials Flow
- **📊 SOQL & SOSL**: Execute queries and searches against Salesforce
- **🔍 Metadata Access**: Retrieve object fields, labels, and types
- **✏️ CRUD Operations**: Create, read, update, and delete records
- **🛠️ Tooling API**: Execute Tooling API requests
- **⚡ Apex REST**: Execute Apex REST requests
- **🌐 REST API**: Make direct REST API calls to Salesforce
- **🐳 Docker Ready**: No hardcoded values, fully configurable via environment variables
- **🔄 Token Refresh**: Automatic token refresh for long-running sessions

## Available Tools

- `authenticate_password` - Authenticate using username/password with OAuth
- `run_soql_query` - Execute SOQL queries
- `run_sosl_search` - Execute SOSL searches
- `get_object_fields` - Get metadata for Salesforce objects
- `get_record` - Retrieve specific records by ID
- `create_record` - Create new records
- `update_record` - Update existing records
- `delete_record` - Delete records
- `tooling_execute` - Execute Tooling API requests
- `apex_execute` - Execute Apex REST requests
- `restful` - Make direct REST API calls

## Quick Start with Docker

### Prerequisites

1. **Create a Connected App in Salesforce:**
   - Go to Setup → Apps → App Manager → New Connected App
   - Fill in basic information (App Name, API Name, Contact Email)
   - Enable OAuth Settings
   - Set callback URL: `http://localhost:8080/callback` (required but not used)
   - Select OAuth Scopes:
     - Access your basic information (id, profile, email, address, phone)
     - Perform requests on your behalf at any time (refresh_token, offline_access)
     - Access and manage your data (api)
   - Save and note down the Consumer Key and Consumer Secret

2. **Get your Security Token:**
   - Go to Setup → My Personal Information → Reset Security Token
   - Check your email for the new security token

### Using the Docker Image

Pull and run the latest Docker image:

```bash
# Pull the image
docker pull steffensbola/salesforce-mcp-ts:latest

# Run with your credentials
docker run -p 3000:3000 \
  -e SALESFORCE_CLIENT_ID=your_consumer_key \
  -e SALESFORCE_CLIENT_SECRET=your_consumer_secret \
  -e SALESFORCE_USERNAME=your_username@domain.com \
  -e SALESFORCE_PASSWORD=your_password \
  -e SALESFORCE_SECURITY_TOKEN=your_security_token \
  -e SALESFORCE_SANDBOX=true \
  steffensbola/salesforce-mcp-ts:latest
```

## MCP Configuration

### VS Code using Docker image

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "salesforce": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "SALESFORCE_CLIENT_ID=your_consumer_key",
        "-e", "SALESFORCE_CLIENT_SECRET=your_consumer_secret",
        "-e", "SALESFORCE_USERNAME=your_username@domain.com",
        "-e", "SALESFORCE_PASSWORD=your_password",
        "-e", "SALESFORCE_SECURITY_TOKEN=your_token",
        "-e", "SALESFORCE_SANDBOX=true",
        "steffensbola/salesforce-mcp-ts:latest"
      ]
    }
  }
}
```

You can also use volumes to mount a config file instead of passing environment variables:

```json
{
  "servers": {
    "salesforce": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v", "${workspaceFolder}/.env:/app/.env",
        "steffensbola/salesforce-mcp-ts:latest"
      ]
    }
  }
}
```

### Claude Desktop using Docker image

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "SALESFORCE_CLIENT_ID=your_consumer_key",
        "-e", "SALESFORCE_CLIENT_SECRET=your_consumer_secret",
        "-e", "SALESFORCE_USERNAME=your_username@domain.com",
        "-e", "SALESFORCE_PASSWORD=your_password",
        "-e", "SALESFORCE_SECURITY_TOKEN=your_token",
        "-e", "SALESFORCE_SANDBOX=true",
        "steffensbola/salesforce-mcp-ts:latest"
      ]
    }
  }
}
```

## Environment Variables

The server requires the following environment variables:

### Required (OAuth Authentication)
- `SALESFORCE_CLIENT_ID` - Consumer Key from your Connected App
- `SALESFORCE_CLIENT_SECRET` - Consumer Secret from your Connected App
- `SALESFORCE_USERNAME` - Your Salesforce username
- `SALESFORCE_PASSWORD` - Your Salesforce password
- `SALESFORCE_SECURITY_TOKEN` - Your Salesforce security token

### Optional
- `SALESFORCE_SANDBOX` - Set to `"true"` for sandbox, `"false"` for production (default: `"false"`)

### Alternative (Direct Token Authentication)
Instead of username/password, you can use:
- `SALESFORCE_ACCESS_TOKEN` - Direct access token
- `SALESFORCE_INSTANCE_URL` - Salesforce instance URL (e.g., `https://your-instance.my.salesforce.com`)

### Backward Compatibility
The server also supports alternative variable names:
- `SF_CONSUMER_KEY` / `SF_CONSUMER_SECRET`
- `SF_USERNAME` / `SF_PASSWORD` / `SF_SECURITY_TOKEN`

## Using Docker Compose

1. Create a `.env` file with your environment variables:

```bash
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
SALESFORCE_USERNAME=your_username@domain.com
SALESFORCE_PASSWORD=your_password
SALESFORCE_SECURITY_TOKEN=your_token
SALESFORCE_SANDBOX=true
DOCKER_HUB_USERNAME=steffensbola
```

2. Run using Docker Compose:

```bash
docker-compose up -d
```

## Examples

### Using the Tools

Once connected, you can use the tools through your MCP client:

**Authentication:**
```
Please authenticate with Salesforce using my credentials
```

**Query Data:**
```
Run this SOQL query: SELECT Id, Name, Industry FROM Account WHERE Industry = 'Technology' LIMIT 10
```

**Search:**
```
Search for contacts named "John" using SOSL
```

**Get Metadata:**
```
Get all the fields for the Contact object
```

**Create Record:**
```
Create a new Account with Name "Test Company" and Industry "Technology"
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify credentials are correct
   - Check Connected App OAuth scopes include "Access and manage your data (api)"
   - Ensure security token is current (reset if needed)
   - Verify sandbox setting matches your org type

2. **Container Won't Start**
   - Ensure both CLIENT_ID and CLIENT_SECRET are provided
   - Check that all required environment variables are set
   - Verify Docker has access to pull the image

3. **Network Errors**
   - Check internet connection
   - Verify Salesforce service status
   - Check firewall settings allow outbound HTTPS connections

### Debug Mode

For verbose logging, add the debug environment variable:

```bash
docker run -e DEBUG=true \
  -e SALESFORCE_CLIENT_ID=... \
  # ... other variables
  steffensbola/salesforce-mcp-ts:latest
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for information about:
- Project architecture and development setup
- Running from source code
- Contributing guidelines and pull request process

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [Salesforce Documentation](https://developer.salesforce.com/docs)
- [Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk)
- [Docker Hub Repository](https://hub.docker.com/r/steffensbola/salesforce-mcp-ts)
