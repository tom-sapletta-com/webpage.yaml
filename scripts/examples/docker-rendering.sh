#!/bin/bash
# Docker Rendering Example Script
# Demonstrates Docker-based module rendering with local/remote images

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Running Docker Rendering Examples...${NC}"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is required but not installed${NC}"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    exit 1
fi

# Check Docker version
DOCKER_VERSION=$(docker --version)
echo -e "${GREEN}✅ $DOCKER_VERSION${NC}"

# Check if Node.js is available for Docker renderer
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    exit 1
fi

# Check if manifest server is running
SERVER_URL="http://localhost:${PORT:-3009}"
if ! curl -s "$SERVER_URL/health" > /dev/null; then
    echo -e "${RED}❌ Manifest server is not running at $SERVER_URL${NC}"
    echo -e "${YELLOW}💡 Start it with: npm start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server is running at $SERVER_URL${NC}"

# Create output directory
mkdir -p examples/docker/output

echo -e "${BLUE}🚀 Executing Docker rendering examples...${NC}"
echo ""

# Example 1: Simple container rendering
echo -e "${YELLOW}📋 Example 1: Simple Node.js container rendering${NC}"
docker run --rm \
  -v "$(pwd)/examples/docker:/workspace" \
  -w /workspace \
  node:18-alpine \
  node -e "
    console.log('🐳 Docker Container Rendering Example');
    console.log('Node.js Version:', process.version);
    console.log('Platform:', process.platform, process.arch);
    console.log('Working Directory:', process.cwd());
    console.log('✅ Container rendering successful!');
  " | tee examples/docker/output/simple-render.log

# Example 2: Python container with manifest processing
echo -e "${YELLOW}📋 Example 2: Python container with YAML processing${NC}"
docker run --rm \
  -v "$(pwd)/manifests:/manifests:ro" \
  -v "$(pwd)/examples/docker/output:/output" \
  python:3.11-alpine \
  sh -c "
    pip install pyyaml requests > /dev/null 2>&1;
    python3 -c \"
import yaml
import json
import os
from datetime import datetime

print('🐍 Python Container Processing YAML Manifests')
print('Python Version:', '$(python3 --version)')

# Create a sample manifest processing result
result = {
    'processed_at': datetime.now().isoformat(),
    'container': 'python:3.11-alpine',
    'manifests_found': len([f for f in os.listdir('/manifests') if f.endswith('.yaml')]) if os.path.exists('/manifests') else 0,
    'status': 'success'
}

with open('/output/python-processing.json', 'w') as f:
    json.dump(result, f, indent=2)

print('✅ Python processing completed!')
print('Result saved to: /output/python-processing.json')
    \"
  "

# Example 3: Multi-container orchestration example
echo -e "${YELLOW}📋 Example 3: Multi-container orchestration${NC}"
NETWORK_NAME="manifest-demo-$$"

# Create network
docker network create "$NETWORK_NAME" > /dev/null

# Start Redis container
echo -e "  🔄 Starting Redis container..."
REDIS_ID=$(docker run -d \
  --network "$NETWORK_NAME" \
  --name "redis-demo-$$" \
  redis:7-alpine)

# Start Node.js app container that connects to Redis
echo -e "  🔄 Starting Node.js app container..."
APP_ID=$(docker run -d \
  --network "$NETWORK_NAME" \
  --name "app-demo-$$" \
  -e REDIS_URL="redis://redis-demo-$$:6379" \
  node:18-alpine \
  sh -c "
    npm init -y > /dev/null 2>&1;
    npm install redis > /dev/null 2>&1;
    node -e \"
      console.log('🚀 Multi-container app started');
      console.log('Redis URL:', process.env.REDIS_URL);
      setTimeout(() => console.log('✅ App completed successfully'), 2000);
    \";
    sleep 3
  ")

# Wait for containers to complete
sleep 5

# Get logs
echo -e "  📋 App container logs:"
docker logs "$APP_ID" 2>/dev/null | sed 's/^/    /'

# Cleanup containers and network
docker rm -f "$REDIS_ID" "$APP_ID" > /dev/null 2>&1
docker network rm "$NETWORK_NAME" > /dev/null 2>&1

# Example 4: Demonstrate Docker renderer class
echo -e "${YELLOW}📋 Example 4: Docker Renderer Class Demo${NC}"
if [ -f "examples/docker/docker-renderer.js" ]; then
    cd examples/docker
    node -e "
      const DockerRenderer = require('./docker-renderer.js');
      
      console.log('🔧 Docker Renderer Class Demo');
      
      const renderer = new DockerRenderer({
        workingDir: './docker-workspace',
        manifestServerUrl: 'http://localhost:${PORT:-3009}'
      });
      
      // Demo manifest
      const demoManifest = {
        metadata: {
          title: 'Docker Rendered Page',
          description: 'Example of Docker-based rendering'
        },
        docker_rendering: {
          containers: [
            {
              name: 'demo-renderer',
              image: 'node',
              tag: '18-alpine',
              environment: {
                NODE_ENV: 'production'
              }
            }
          ]
        }
      };
      
      console.log('📋 Demo manifest prepared');
      console.log('🏗️  Docker Renderer initialized');
      console.log('✅ Docker rendering framework ready!');
    "
    cd ../..
fi

echo ""
echo -e "${GREEN}🎉 Docker rendering examples completed successfully!${NC}"
echo -e "${BLUE}📁 Check output in: examples/docker/output/${NC}"
echo ""

# Display generated files
if [ -d "examples/docker/output" ] && [ "$(ls -A examples/docker/output)" ]; then
    echo -e "${YELLOW}📄 Generated files:${NC}"
    ls -la examples/docker/output/
else
    echo -e "${YELLOW}⚠️  No output files generated${NC}"
fi

# Show Docker system info
echo ""
echo -e "${BLUE}🐳 Docker System Info:${NC}"
echo -e "   Containers: $(docker ps -a --format '{{.Names}}' | wc -l)"
echo -e "   Images: $(docker images --format '{{.Repository}}' | wc -l)"
echo -e "   Networks: $(docker network ls --format '{{.Name}}' | grep -v '^bridge$\|^host$\|^none$' | wc -l)"
