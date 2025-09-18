#!/bin/bash
# Manifest Conversion Script for Modular YAML Manifest System

set -e

# Load environment variables
source .env

echo "🔄 Converting all manifests to multiple formats..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MANIFEST_DIR=${MANIFEST_DIR:-./manifests}
OUTPUT_DIR=${OUTPUT_DIR:-./output}
SERVER_URL="http://localhost:${PORT:-3009}"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "📁 Processing manifests from: $MANIFEST_DIR"
echo "📤 Output directory: $OUTPUT_DIR"

# Function to convert manifest to format
convert_manifest() {
    local file="$1"
    local format="$2"
    local basename=$(basename "$file" .yaml)
    local output_file="$OUTPUT_DIR/${basename}.${format}"
    
    echo -n "   🔄 Converting to $format... "
    
    if curl -s -X POST \
        -H "Content-Type: application/json" \
        -d @"$file" \
        "$SERVER_URL/api/convert/manifest-to-$format" \
        -o "$output_file"; then
        echo -e "${GREEN}✅${NC}"
        return 0
    else
        echo -e "${RED}❌${NC}"
        return 1
    fi
}

# Check if server is running
if ! curl -s "$SERVER_URL/health" > /dev/null; then
    echo -e "${RED}❌ Server not running at $SERVER_URL${NC}"
    echo "   Start the server with: npm start"
    exit 1
fi

# Process all YAML files
TOTAL_FILES=0
CONVERSION_ERRORS=0

while IFS= read -r -d '' file; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    echo -e "${BLUE}📄 Processing: $(basename "$file")${NC}"
    
    # Convert to all formats
    for format in html react vue php; do
        if ! convert_manifest "$file" "$format"; then
            CONVERSION_ERRORS=$((CONVERSION_ERRORS + 1))
        fi
    done
    
    echo ""
done < <(find "$MANIFEST_DIR" -name "*.yaml" -o -name "*.yml" -print0)

# Summary
echo "📊 Conversion Summary:"
echo "   Total files processed: $TOTAL_FILES"
echo "   Conversion errors: $CONVERSION_ERRORS"

if [ $CONVERSION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All conversions completed successfully!${NC}"
    echo "📁 Check output in: $OUTPUT_DIR"
else
    echo -e "${YELLOW}⚠️  Some conversions failed${NC}"
fi
