# Contributing to MCP Salesforce TypeScript Connector

Thank you for your interest in contributing to this project! This guide will help you get started with development and contribution.

## Project Architecture

### Overview

The MCP Salesforce TypeScript Connector is built with a modular architecture that separates concerns across different layers:

```
src/
├── auth/
│   └── password-auth.ts      # OAuth 2.0 password authentication
├── client/
│   └── salesforce-client.ts  # Main Salesforce client with caching
├── config/
│   └── config.ts             # Configuration management and validation
├── server/
│   └── mcp-server.ts         # MCP server implementation and tool handlers
├── types/
│   └── salesforce.ts         # TypeScript interfaces and type definitions
├── utils/
│   └── debug-log.ts          # Logging utilities
└── index.ts                  # Main entry point and process management
```

### Architecture Principles

- **Modular Design**: Each component has a single responsibility
- **Type Safety**: Full TypeScript with comprehensive interfaces
- **Error Handling**: Robust error handling with detailed messages
- **Configuration**: Environment-driven configuration for Docker compatibility
- **Caching**: Intelligent caching for metadata and connections
- **Authentication**: Support for multiple authentication methods

### Key Components

#### 1. Authentication Layer (`auth/`)
- **SalesforcePasswordAuth**: Handles OAuth 2.0 Resource Owner Password Credentials Flow
- Supports both production and sandbox environments
- Automatic token refresh capabilities

#### 2. Client Layer (`client/`)
- **SalesforceClient**: Main interface to Salesforce APIs
- Connection management and authentication orchestration
- Caching for SObject metadata to improve performance
- Support for SOQL, SOSL, REST API, Tooling API, and Apex REST

#### 3. Server Layer (`server/`)
- **SalesforceMCPServer**: MCP protocol implementation
- Tool registration and handler routing
- Request validation and response formatting
- Authentication state management

#### 4. Configuration (`config/`)
- Environment variable management with fallbacks
- Configuration validation and error reporting
- Support for multiple credential formats

## Development Setup

### Prerequisites

- Node.js 22+ or Bun
- TypeScript knowledge
- Salesforce Developer Account (for testing)
- Docker (optional, for container testing)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/steffensbola/salesforce-mcp-ts.git
   cd salesforce-mcp-ts
   ```

2. **Install dependencies:**
   ```bash
   # Using npm
   npm install
   
   # Or using bun
   bun install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Salesforce credentials
   ```

### Running from Source

#### Development Mode

```bash
# With npm
npm run dev

# With bun
bun run dev

# With npx (quick testing)
npx tsx src/index.ts
```

#### Production Build

```bash
# Build the project
npm run build

# Start production server
npm start
```

### Testing

#### Unit Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Open coverage UI
npm run test:ui
```

#### Integration Tests

```bash
# Test authentication (requires valid credentials in .env)
npm run test:connection
```

#### Manual Testing

For manual testing with MCP clients:

1. **Claude Desktop**: Add the server to your `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "salesforce": {
         "command": "npx",
         "args": ["tsx", "/path/to/salesforce-mcp-ts/src/index.ts"],
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

2. **VS Code with MCP**: Use the `.vscode/mcp.json` configuration from the README

### Code Quality

#### Linting and Formatting

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix
```

#### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Use meaningful variable and function names
- Prefer composition over inheritance

### Docker Development

#### Building Locally

```bash
# Build the Docker image
docker build -t mcp-salesforce-ts .

# Run with environment variables
docker run -e SALESFORCE_CLIENT_ID=your_key \
           -e SALESFORCE_CLIENT_SECRET=your_secret \
           # ... other variables
           mcp-salesforce-ts
```

#### Using Docker Compose

```bash
# Development with Docker Compose
docker-compose up --build
```

#### Publishing (Maintainers)

```bash
# Use the convenience script
chmod +x scripts/docker-publish.sh
./scripts/docker-publish.sh --username your_dockerhub_username
```

## Contributing Guidelines

### Pull Request Process

1. **Fork the repository** and create your feature branch from `main`
2. **Make your changes** following the coding standards
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Ensure all tests pass**: `npm run test`
6. **Ensure linting passes**: `npm run lint`
7. **Test Docker build**: `docker build -t test .`
8. **Submit a pull request** with a clear description

### Commit Message Format

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(client): add support for bulk API operations
fix(auth): handle token refresh edge cases
docs(readme): update Docker configuration examples
```

### Code Review Criteria

Pull requests will be reviewed for:

1. **Functionality**: Does it work as intended?
2. **Code Quality**: Is it readable, maintainable, and follows patterns?
3. **Testing**: Are there appropriate tests?
4. **Documentation**: Is it properly documented?
5. **Backwards Compatibility**: Does it break existing functionality?
6. **Security**: Are credentials handled securely?

### Adding New Tools

When adding new MCP tools:

1. **Add type definitions** in `src/types/salesforce.ts`
2. **Implement the tool handler** in `src/server/mcp-server.ts`
3. **Add client method** in `src/client/salesforce-client.ts` if needed
4. **Write tests** for the new functionality
5. **Update documentation** including the README tool list

Example tool structure:
```typescript
// In mcp-server.ts
case 'your_new_tool':
  return await this.handleYourNewTool(args as unknown as ToolYourNewToolArgs);

private async handleYourNewTool(args: ToolYourNewToolArgs): Promise<CallToolResult> {
  this.ensureAuthenticated();
  
  try {
    const result = await this.salesforceClient.yourNewMethod(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    return this.handleToolError('your_new_tool', error);
  }
}
```

### Debugging

#### Enable Debug Logging

```bash
# Set environment variable
export DEBUG=true
npm run dev

# Or inline
DEBUG=true npm run dev
```

#### Common Debug Scenarios

1. **Authentication Issues**: Check token validation and refresh logic
2. **API Errors**: Review Salesforce API response handling
3. **MCP Protocol**: Verify request/response format compliance
4. **Docker Issues**: Check environment variable passing and file permissions

## Release Process

### Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### GitHub Actions

The project includes automated workflows for:
- **Testing**: Run on all PRs and pushes
- **Docker Publishing**: Automatic builds and publishing to Docker Hub
- **Release**: Automated releases on version tags

## Getting Help

### Resources

- [Salesforce REST API Documentation](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Community

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: Contact the maintainer for security issues

### Issue Templates

When reporting bugs, please include:
- Operating system and Node.js version
- Salesforce org type (Production/Sandbox)
- Error messages and stack traces
- Steps to reproduce
- Expected vs actual behavior

When requesting features, please include:
- Use case description
- Proposed API or interface
- Alternative solutions considered
- Willingness to contribute the implementation

## Security

### Reporting Security Issues

Please do not report security vulnerabilities through public GitHub issues. Instead, email the maintainer directly.

### Security Best Practices

- Never commit credentials or tokens to the repository
- Use environment variables for all sensitive configuration
- Validate all inputs from external sources
- Follow Salesforce security best practices for Connected Apps
- Keep dependencies updated

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.
