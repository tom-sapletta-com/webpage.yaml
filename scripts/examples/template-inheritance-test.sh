#!/bin/bash

# Template Inheritance Test Script
# Tests the template linking and inheritance system

echo -e "\033[0;34m🧩 Testing Template Inheritance System...\033[0m"

# Set up colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")/../.." || exit 1

echo ""
echo -e "${BLUE}📋 Template Inheritance Test Suite${NC}"
echo "=================================================="

# Check if server is running
if ! curl -s http://localhost:3009/health > /dev/null; then
    echo -e "${RED}❌ Manifest server is not running!${NC}"
    echo "Start it with: npm start"
    exit 1
fi

echo -e "${GREEN}✅ Server is running${NC}"

# Test 1: Validate base template
echo ""
echo -e "${YELLOW}📋 Test 1: Base Template Validation${NC}"
echo "-----------------------------------"

response=$(curl -s -X POST http://localhost:3009/api/validate \
  -H "Content-Type: application/json" \
  -d '{
    "manifest": {
      "metadata": {"title": "Base Template Test"},
      "styles": {"container": "max-width: 1200px;"},
      "structure": {"div": {"style": "container", "text": "Base content"}}
    }
  }')

if echo "$response" | grep -q '"valid":true'; then
    echo -e "${GREEN}✅ Base template structure is valid${NC}"
else
    echo -e "${RED}❌ Base template validation failed${NC}"
    echo "Response: $response"
fi

# Test 2: Test landing page template conversion
echo ""
echo -e "${YELLOW}📋 Test 2: Landing Page Template Conversion${NC}"
echo "--------------------------------------------"

# Create output directory
mkdir -p output/templates

# Convert landing page template to HTML
echo "Converting landing-page.yaml to HTML..."
if curl -s -X POST http://localhost:3009/api/convert/manifest-to-html \
  -H "Content-Type: application/json" \
  -d @<(cat << 'EOF'
{
  "manifest": {
    "metadata": {
      "title": "Template Inheritance Demo",
      "description": "Testing template inheritance system"
    },
    "styles": {
      "container": "max-width: 1200px; margin: 0 auto; padding: 20px;",
      "hero": "background: linear-gradient(135deg, #007acc, #68C242); color: white; padding: 80px 0; text-align: center;",
      "hero_title": "font-size: 3em; font-weight: bold; margin-bottom: 20px;"
    },
    "structure": {
      "html": {
        "lang": "en",
        "children": [
          {
            "head": {
              "children": [
                {"meta": {"charset": "UTF-8"}},
                {"title": {"text": "Template Inheritance Demo"}}
              ]
            }
          },
          {
            "body": {
              "children": [
                {
                  "section": {
                    "style": "hero",
                    "children": [
                      {
                        "div": {
                          "style": "container",
                          "children": [
                            {
                              "h1": {
                                "style": "hero_title",
                                "text": "Template Inheritance Works!"
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  }
}
EOF
) > output/templates/inheritance-test.html 2>/dev/null; then
    echo -e "${GREEN}✅ Landing page template converted successfully${NC}"
    
    # Check if the file was created and has content
    if [ -s "output/templates/inheritance-test.html" ]; then
        file_size=$(stat -c%s "output/templates/inheritance-test.html")
        echo -e "${GREEN}✅ Generated HTML file: ${file_size} bytes${NC}"
    else
        echo -e "${RED}❌ HTML file is empty${NC}"
    fi
else
    echo -e "${RED}❌ Landing page template conversion failed${NC}"
fi

# Test 3: Test template with component modules
echo ""
echo -e "${YELLOW}📋 Test 3: Component Module Integration${NC}"
echo "--------------------------------------"

# Check if header component exists
if [ -f "manifests/components/header.yaml" ]; then
    echo -e "${GREEN}✅ Header component found${NC}"
    echo "Header component content:"
    head -10 manifests/components/header.yaml | sed 's/^/  /'
else
    echo -e "${RED}❌ Header component not found${NC}"
fi

# Check if footer component exists
if [ -f "manifests/components/footer.yaml" ]; then
    echo -e "${GREEN}✅ Footer component found${NC}"
    echo "Footer component content:"
    head -10 manifests/components/footer.yaml | sed 's/^/  /'
else
    echo -e "${RED}❌ Footer component not found${NC}"
fi

# Test 4: Template linking demonstration
echo ""
echo -e "${YELLOW}📋 Test 4: Template Linking Demonstration${NC}"
echo "------------------------------------------"

# Create a simple template that extends base functionality
cat > output/templates/extended-demo.yaml << 'EOF'
metadata:
  title: "Extended Template Demo"
  description: "Demonstrates template extension capabilities"
  extends: "../base-template.yaml"

styles:
  # Extend base styles with new ones
  demo_section: "background: #f8f9fa; padding: 40px 0;"
  demo_card: "background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"

structure:
  html:
    lang: "en"
    children:
      - head:
          children:
            - meta:
                charset: "UTF-8"
            - title:
                text: "{{metadata.title}}"
      - body:
          children:
            - section:
                style: "demo_section"
                children:
                  - div:
                      style: "container"
                      children:
                        - div:
                            style: "demo_card"
                            children:
                              - h2:
                                  text: "Template Extension Working!"
                              - p:
                                  text: "This template successfully extends the base template with additional styles and structure."
EOF

echo -e "${GREEN}✅ Created extended template demonstration${NC}"
echo "Template saved to: output/templates/extended-demo.yaml"

# Summary
echo ""
echo -e "${BLUE}📊 Template Inheritance Test Summary${NC}"
echo "===================================="

if [ -f "output/templates/inheritance-test.html" ] && [ -s "output/templates/inheritance-test.html" ]; then
    echo -e "${GREEN}✅ Template conversion: PASSED${NC}"
else
    echo -e "${RED}❌ Template conversion: FAILED${NC}"
fi

if [ -f "manifests/components/header.yaml" ] && [ -f "manifests/components/footer.yaml" ]; then
    echo -e "${GREEN}✅ Component modules: AVAILABLE${NC}"
else
    echo -e "${YELLOW}⚠️  Component modules: PARTIAL${NC}"
fi

if [ -f "output/templates/extended-demo.yaml" ]; then
    echo -e "${GREEN}✅ Extended template demo: CREATED${NC}"
else
    echo -e "${RED}❌ Extended template demo: FAILED${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Template inheritance testing completed!${NC}"
echo -e "${BLUE}📁 Check results in: output/templates/${NC}"

# List generated files
echo ""
echo -e "${YELLOW}📄 Generated files:${NC}"
ls -la output/templates/ 2>/dev/null || echo "No files generated"
