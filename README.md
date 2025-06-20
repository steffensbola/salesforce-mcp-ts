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

## Installation

### Using npm

```bash
npm install
npm run build
```

### Using bun

```bash
bun install
bun run build
```

### Using npx (recommended for quick testing)

```bash
npx tsx src/index.ts
```

## Configuration

### Environment Variables

Create a `.env` file with your Salesforce credentials:

```bash
# OAuth 2.0 Client Credentials (from Connected App)
SALESFORCE_CLIENT_ID=your_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_consumer_secret_here

# User Authentication Credentials
SALESFORCE_USERNAME=your_username@domain.com
SALESFORCE_PASSWORD=your_password_here
SALESFORCE_SECURITY_TOKEN=your_security_token_here

# Environment Configuration
SALESFORCE_SANDBOX=true  # Set to "false" for production

# Optional: Direct Token Authentication
# SALESFORCE_ACCESS_TOKEN=your_access_token_here
# SALESFORCE_INSTANCE_URL=https://your-instance.my.salesforce.com
```

### Connected App Setup

1. **Create a Connected App in Salesforce:**
   - Go to Setup → Apps → App Manager → New Connected App
   - Fill in basic information
   - Enable OAuth Settings
   - Set callback URL: `http://localhost:8080/callback` (required but not used)
   - Select OAuth Scopes:
     - Access your basic information (id, profile, email, address, phone)
     - Perform requests on your behalf at any time (refresh_token, offline_access)
     - Access and manage your data (api)

2. **Get your Consumer Key and Consumer Secret**
3. **Fill in your environment variables**

## Usage

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm run test
npm run test:connection

# Build for production
npm run build

# Start production server
npm start
```

### With bun

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build and start
bun run build
bun start
```

### Testing

```bash
# Test authentication
npm run test

# Test full connection and operations
npm run test:connection
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Set environment variables (override with docker run -e)
ENV NODE_ENV=production
ENV SALESFORCE_SANDBOX=false

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
```

Build and run:

```bash
# Build image
docker build -t mcp-salesforce-ts .

# Run with environment variables
docker run -e SALESFORCE_CLIENT_ID=your_key \
           -e SALESFORCE_CLIENT_SECRET=your_secret \
           -e SALESFORCE_USERNAME=your_username \
           -e SALESFORCE_PASSWORD=your_password \
           -e SALESFORCE_SECURITY_TOKEN=your_token \
           -e SALESFORCE_SANDBOX=true \
           mcp-salesforce-ts
```

## Docker Usage

### Using the Docker Image from Docker Hub

```bash
# Pull the latest version
docker pull steffensbola/salesforce-mcp-ts:latest

# Run the container
docker run -p 3000:3000 \
  -e SALESFORCE_USERNAME=your_salesforce_username \
  -e SALESFORCE_PASSWORD=your_salesforce_password \
  -e SF_LOGIN_URL=https://login.salesforce.com \
  -e SALESFORCE_CLIENT_ID=your_consumer_key \
  -e SALESFORCE_CLIENT_SECRET=your_consumer_secret \
  -e SALESFORCE_SECURITY_TOKEN=your_token \
  -e SALESFORCE_SANDBOX=true_or_false \
  steffensbola/salesforce-mcp-ts:latest
```


### Using Docker Compose

1. Create a `.env` file with your environment variables:

```bash
SF_USERNAME=your_salesforce_username
SF_PASSWORD=your_salesforce_password
SF_LOGIN_URL=https://login.salesforce.com
DOCKER_HUB_USERNAME=your_dockerhub_username
```

2. Run using Docker Compose:

```bash
docker-compose up -d
```

### Building and Publishing the Docker Image

A convenience script is provided to build and publish the Docker image:

```bash
# Install script dependencies
chmod +x scripts/docker-publish.sh

# Build and publish
./scripts/docker-publish.sh --username your_dockerhub_username
```

Options:
- `--username`, `-u`: Docker Hub username (required)
- `--tag`, `-t`: Specify tag (default: latest)
- `--version`, `-v`: Specify version (default: from package.json)

### GitHub Actions

This repository includes a GitHub Actions workflow for automated builds and publishing. To use it:

1. Add the following secrets to your GitHub repository:
   - `DOCKER_HUB_USERNAME`: Your Docker Hub username
   - `DOCKER_HUB_TOKEN`: A Docker Hub access token (create one at [Docker Hub](https://hub.docker.com/settings/security))

2. The workflow will automatically build and publish images:
   - On pushes to the `main` branch
   - When a tag is pushed (format: `v*.*.*`)
   - When manually triggered

The published Docker image will be available at `your_username/salesforce-mcp-ts` on Docker Hub.

## MCP Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "salesforce-ts": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/salesforce-mcp-ts/src/index.ts"
      ],
      "env": {
        "SALESFORCE_CLIENT_ID": "your_consumer_key",
        "SALESFORCE_CLIENT_SECRET": "your_consumer_secret",
        "SALESFORCE_USERNAME": "your_username",
        "SALESFORCE_PASSWORD": "your_password",
        "SALESFORCE_SECURITY_TOKEN": "your_token",
        "SALESFORCE_SANDBOX": "true"
      }
    }
  }
}
```

### Alternative: Using built version

```json
{
  "mcpServers": {
    "salesforce-ts": {
      "command": "node",
      "args": [
        "/path/to/salesforce-mcp-ts/dist/index.js"
      ],
      "env": {
        "SALESFORCE_CLIENT_ID": "your_consumer_key",
        "SALESFORCE_CLIENT_SECRET": "your_consumer_secret",
        "SALESFORCE_USERNAME": "your_username",
        "SALESFORCE_PASSWORD": "your_password",
        "SALESFORCE_SECURITY_TOKEN": "your_token",
        "SALESFORCE_SANDBOX": "true"
      }
    }
  }
}
```

## Authentication

The server supports multiple authentication methods in priority order:

1. **Access Token (Direct)**: Use `SALESFORCE_ACCESS_TOKEN` + `SALESFORCE_INSTANCE_URL`
2. **Username/Password with OAuth**: Secure OAuth flow with user credentials

### Environment Variable Compatibility

The server supports both primary and alternative variable names:

**Primary (recommended):**
- `SALESFORCE_CLIENT_ID` / `SALESFORCE_CLIENT_SECRET`
- `SALESFORCE_USERNAME` / `SALESFORCE_PASSWORD` / `SALESFORCE_SECURITY_TOKEN`

**Alternative (backward compatibility):**
- `SF_CONSUMER_KEY` / `SF_CONSUMER_SECRET`
- `SF_USERNAME` / `SF_PASSWORD` / `SF_SECURITY_TOKEN`

## Project Structure

```
src/
├── auth/
│   └── password-auth.ts      # OAuth 2.0 password authentication
├── client/
│   └── salesforce-client.ts  # Main Salesforce client
├── config/
│   └── config.ts             # Configuration management
├── server/
│   └── mcp-server.ts         # MCP server implementation
├── test/
│   ├── test-auth.ts          # Authentication tests
│   └── test-connection.ts    # Connection tests
├── types/
│   └── salesforce.ts         # TypeScript interfaces
└── index.ts                  # Main entry point
```

## Development

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format
```

### Architecture

- **Modular Design**: Separated authentication, client, and server logic
- **Type Safety**: Full TypeScript with comprehensive interfaces
- **Error Handling**: Robust error handling with detailed messages
- **Configuration**: Environment-driven configuration for Docker compatibility
- **Testing**: Comprehensive test suite for authentication and operations

## Examples

### Using the Tools

Once connected, you can use the tools through Claude Desktop:

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
   - Check Connected App OAuth scopes
   - Ensure security token is current
   - Verify sandbox setting matches your org

2. **Missing Environment Variables**
   - Check `.env` file exists and has correct values
   - Verify environment variables are being loaded

3. **Network Errors**
   - Check internet connection
   - Verify Salesforce service status
   - Check firewall settings

### Debug Mode

Set `NODE_ENV=development` for verbose logging:

```bash
NODE_ENV=development npm start
```

## License

MIT License - see [LICENSE](../LICENSE) file for details.

## Links

- [Salesforce Documentation](https://developer.salesforce.com/docs)
- [Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk)
