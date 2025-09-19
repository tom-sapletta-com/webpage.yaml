#!/bin/bash
# Python Integration Example Script
# Demonstrates Python client usage with the Modular YAML Manifest System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐍 Running Python Integration Examples...${NC}"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required but not installed${NC}"
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 is required but not installed${NC}"
    exit 1
fi

# Set up Python virtual environment and install dependencies
echo -e "${YELLOW}📦 Setting up Python virtual environment...${NC}"

# Get the project root directory (2 levels up from scripts/examples/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXAMPLES_DIR="$PROJECT_ROOT/examples/python"
VENV_PATH="$EXAMPLES_DIR/venv"

echo "Project root: $PROJECT_ROOT"
echo "Examples directory: $EXAMPLES_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_PATH" ]; then
    python3 -m venv "$VENV_PATH" || {
        echo -e "${RED}❌ Failed to create Python virtual environment${NC}"
        exit 1
    }
fi

# Activate virtual environment and install dependencies
source "$VENV_PATH/bin/activate" || {
    echo -e "${RED}❌ Failed to activate virtual environment${NC}"
    exit 1
}

pip install requests pyyaml --quiet || {
    echo -e "${RED}❌ Failed to install Python dependencies${NC}"
    exit 1
}

# Check if manifest server is running
SERVER_URL="http://localhost:${PORT:-3009}"
if ! curl -s "$SERVER_URL/health" > /dev/null; then
    echo -e "${RED}❌ Manifest server is not running at $SERVER_URL${NC}"
    echo -e "${YELLOW}💡 Start it with: npm start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server is running at $SERVER_URL${NC}"

# Create output directory
mkdir -p "$EXAMPLES_DIR/output"

# Run Python examples
echo -e "${BLUE}🚀 Executing Python client examples...${NC}"
cd "$EXAMPLES_DIR"

# Ensure we're in the right directory and use Python from virtual environment
echo "Current directory: $(pwd)"
echo "Python script exists: $(ls -la manifest_client.py | head -1)"

# Use Python from virtual environment
"$VENV_PATH/bin/python" manifest_client.py

echo ""
echo -e "${GREEN}🎉 Python integration examples completed successfully!${NC}"
echo -e "${BLUE}📁 Check output in: examples/python/output/${NC}"
echo ""

# Display generated files
if [ -d "./output" ] && [ "$(ls -A ./output)" ]; then
    echo -e "${YELLOW}📄 Generated files:${NC}"
    ls -la ./output/
else
    echo -e "${YELLOW}⚠️  No output files generated${NC}"
fi
