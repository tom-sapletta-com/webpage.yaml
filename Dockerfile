# Multi-stage Dockerfile for Modular YAML Manifest System
# Optimized for production deployment with Docker rendering capabilities

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build || echo "No build script defined"

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for Docker rendering
RUN apk add --no-cache \
    docker \
    docker-compose \
    python3 \
    py3-pip \
    php8 \
    php8-cli \
    bash \
    curl \
    git

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app .

# Create necessary directories
RUN mkdir -p manifests output examples scripts logs && \
    chown -R nodejs:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3009
ENV DOCKER_ENABLED=true

# Expose the port
EXPOSE 3009

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3009/health || exit 1

# Switch to non-root user
USER nodejs

# Start the application
CMD ["npm", "start"]

# Labels for metadata
LABEL maintainer="Tom Sapletta <tom@sapletta.com>"
LABEL description="Modular YAML Manifest System with Docker rendering support"
LABEL version="2.0.0"
LABEL org.opencontainers.image.source="https://github.com/tom-sapletta-com/webpage.yaml"
