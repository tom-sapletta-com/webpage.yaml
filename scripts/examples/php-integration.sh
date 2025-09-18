#!/bin/bash
# PHP Integration Example Script
# Demonstrates PHP client usage with the Modular YAML Manifest System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐘 Running PHP Integration Examples...${NC}"
echo ""

# Check if PHP is available
if ! command -v php &> /dev/null; then
    echo -e "${RED}❌ PHP is required but not installed${NC}"
    exit 1
fi

# Check PHP version
PHP_VERSION=$(php -r "echo PHP_VERSION;")
echo -e "${GREEN}✅ PHP Version: $PHP_VERSION${NC}"

# Check if curl extension is available
if ! php -m | grep -q curl; then
    echo -e "${RED}❌ PHP curl extension is required${NC}"
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
mkdir -p examples/php/output

# Run PHP examples
echo -e "${BLUE}🚀 Executing PHP client examples...${NC}"
cd examples/php

php ManifestClient.php

echo ""
echo -e "${GREEN}🎉 PHP integration examples completed successfully!${NC}"
echo -e "${BLUE}📁 Check output in: examples/php/output/${NC}"
echo ""

# Display generated files
if [ -d "./output" ] && [ "$(ls -A ./output)" ]; then
    echo -e "${YELLOW}📄 Generated files:${NC}"
    ls -la ./output/
else
    echo -e "${YELLOW}⚠️  No output files generated${NC}"
fi

# Show PHP memory usage
echo ""
echo -e "${BLUE}📊 PHP Performance Info:${NC}"
php -r "
    echo '   Memory Limit: ' . ini_get('memory_limit') . PHP_EOL;
    echo '   Max Execution Time: ' . ini_get('max_execution_time') . 's' . PHP_EOL;
    echo '   Peak Memory Usage: ' . round(memory_get_peak_usage(true) / 1024 / 1024, 2) . ' MB' . PHP_EOL;
"
