#!/bin/bash
# Docker Build Script for Modular YAML Manifest System

set -e

# Load environment variables
source .env

echo "🐳 Building Docker image for Modular YAML Manifest System..."

# Build the Docker image
docker build \
  --tag ${DOCKER_NAMESPACE:-modular-yaml}:latest \
  --tag ${DOCKER_NAMESPACE:-modular-yaml}:$(date +%Y%m%d) \
  --build-arg NODE_VERSION=${NODE_VERSION:-18} \
  --build-arg PORT=${PORT:-3009} \
  --file Dockerfile \
  .

echo "✅ Docker image built successfully!"

# Optional: Run security scan
if command -v docker &> /dev/null && docker --version | grep -q "scan"; then
    echo "🔍 Running security scan..."
    docker scan ${DOCKER_NAMESPACE:-modular-yaml}:latest || echo "⚠️ Security scan not available"
fi

echo "🎉 Docker build completed!"
