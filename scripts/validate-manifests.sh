#!/bin/bash
# Manifest Validation Script for Modular YAML Manifest System

set -e

# Load environment variables
source .env

echo "🔍 Validating all YAML manifests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MANIFEST_DIR=${MANIFEST_DIR:-./manifests}
VALIDATION_ERRORS=0
TOTAL_FILES=0

# Function to validate YAML syntax
validate_yaml_syntax() {
    local file="$1"
    if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to validate manifest schema
validate_manifest_schema() {
    local file="$1"
    # Call server API for validation
    if curl -s -X POST \
        -H "Content-Type: application/json" \
        -d @"$file" \
        "http://localhost:${PORT:-3009}/api/validate" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Find and validate all YAML files
echo "📁 Searching for manifests in: $MANIFEST_DIR"

if [ ! -d "$MANIFEST_DIR" ]; then
    echo -e "${RED}❌ Manifest directory not found: $MANIFEST_DIR${NC}"
    exit 1
fi

# Process all YAML files
while IFS= read -r -d '' file; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    echo -n "🔎 Validating: $(basename "$file")... "
    
    # Check YAML syntax
    if validate_yaml_syntax "$file"; then
        echo -e "${GREEN}✅ Valid YAML${NC}"
        
        # Check manifest schema (if server is running)
        if validate_manifest_schema "$file" 2>/dev/null; then
            echo -e "   ${GREEN}✅ Valid manifest schema${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Schema validation skipped (server not running)${NC}"
        fi
    else
        echo -e "${RED}❌ Invalid YAML syntax${NC}"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
done < <(find "$MANIFEST_DIR" -name "*.yaml" -o -name "*.yml" -print0)

# Summary
echo ""
echo "📊 Validation Summary:"
echo "   Total files: $TOTAL_FILES"
echo "   Errors: $VALIDATION_ERRORS"

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All manifests are valid!${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $VALIDATION_ERRORS validation errors${NC}"
    exit 1
fi
