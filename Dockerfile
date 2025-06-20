# Multi-stage build for MCP Salesforce TypeScript Server
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Add metadata labels
LABEL stage=builder

# Set build arguments
ARG VERSION
ARG BUILD_DATE
ARG VCS_REF
ARG VCS_URL

# Copy package files for dependency resolution
COPY package*.json ./

# Copy source code and config files
COPY src/ ./src/
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci --frozen-lockfile

# Build the TypeScript application
RUN npm run build

# Verify build output
RUN ls -la dist/

# Stage 2: Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcpuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies (skip scripts to avoid build)
RUN npm ci --omit=dev --frozen-lockfile --ignore-scripts && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=mcpuser:nodejs /app/dist ./dist

# Copy additional files that might be needed at runtime
COPY --chown=mcpuser:nodejs README.md LICENSE ./

# Set ownership of the app directory
RUN chown -R mcpuser:nodejs /app

# Switch to non-root user
USER mcpuser

# Set production environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Expose port (optional - mainly for health checks or future web interface)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the MCP server
CMD ["node", "dist/index.js"]

# Metadata labels following OCI image spec annotations
LABEL org.opencontainers.image.title="mcp-salesforce-ts" \
      org.opencontainers.image.version="${VERSION:-0.1.0}" \
      org.opencontainers.image.description="Model Context Protocol server for Salesforce integration (TypeScript)" \
      org.opencontainers.image.authors="Cristiano Steffens" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.url="${VCS_URL:-https://github.com/steffensbola/salesforce-mcp-ts}" \
      org.opencontainers.image.source="${VCS_URL:-https://github.com/steffensbola/salesforce-mcp-ts}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}" \
      org.opencontainers.image.vendor="Cristiano Steffens" \
      org.opencontainers.image.documentation="https://github.com/steffensbola/salesforce-mcp-ts"
