# 🎯 Modular YAML Manifest System

```ascii
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🎯 MODULAR YAML MANIFEST SYSTEM                         ║
║  Advanced Web Development Framework                       ║
║                                                           ║
║  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  ║
║  │    YAML     │───▶│  MANIFEST   │───▶│   OUTPUT    │  ║
║  │  MANIFESTS  │    │  PROCESSOR  │    │   FORMATS   │  ║
║  └─────────────┘    └─────────────┘    └─────────────┘  ║
║       │                     │                   │       ║
║  ┌────▼────┐           ┌────▼────┐         ┌────▼────┐  ║
║  │Templates│           │Modules  │         │HTML/CSS │  ║
║  │& Styles │           │& Imports│         │React/Vue│  ║
║  │Inherit. │           │Docker   │         │PHP/JSON │  ║
║  └─────────┘           └─────────┘         └─────────┘  ║
╚═══════════════════════════════════════════════════════════╝
```

## 🚀 **Advanced Features Overview**

| Feature | Status | Description |
|---------|--------|-------------|
| 🎨 **Template Inheritance** | ✅ | Extend base templates with slots and overrides |
| 🐳 **Docker Rendering** | ✅ | Container-based module rendering |
| 🔄 **Multi-Format Export** | ✅ | HTML, React, Vue, PHP conversion |
| 🌐 **URL Scraping** | ✅ | Convert websites to YAML manifests |
| 📦 **Modular Architecture** | ✅ | Reusable components and imports |
| 🤖 **Automation** | ✅ | 40+ Makefile commands |
| 🔧 **Multi-Language** | ✅ | Python, PHP, Node.js clients |

---

## 🏁 **Quick Start**

### **1. Installation**
```bash
# Clone repository
git clone https://github.com/tom-sapletta-com/webpage.yaml.git
cd webpage.yaml

# Install dependencies
npm install

# Start server
npm start
# Server available at: http://localhost:3009
```

### **2. First Manifest**
```yaml
# manifests/examples/hello-world.yaml
metadata:
  title: "Hello World"
  description: "My first YAML manifest"

styles:
  container: "max-width: 800px; margin: 0 auto; padding: 20px;"
  header: "color: #007acc; font-size: 2.5em; text-align: center;"
  content: "font-size: 1.2em; line-height: 1.6; margin-top: 20px;"

structure:
  html:
    lang: "en"
    children:
      - head:
          children:
            - title:
                text: "{{metadata.title}}"
      - body:
          children:
            - div:
                style: "container"
                children:
                  - h1:
                      style: "header"
                      text: "{{metadata.title}}"
                  - p:
                      style: "content"
                      text: "Welcome to the Modular YAML Manifest System!"
```

---

## 🛠️ **Comprehensive Automation Commands**

```ascii
╔══════════════════════════════════════════════════════════╗
║  🤖 AUTOMATION COMMANDS (40+ Available)                 ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  📋 DEVELOPMENT                                          ║
║  make install          # Install dependencies            ║
║  make dev              # Start development server        ║
║  make start            # Start production server         ║
║  make test             # Run tests                       ║
║                                                          ║
║  🐳 DOCKER OPERATIONS                                    ║
║  make docker-build     # Build Docker images            ║
║  make docker-run       # Run containers                 ║
║  make compose-up       # Start all services             ║
║  make compose-down     # Stop all services              ║
║                                                          ║
║  🔧 EXAMPLES & INTEGRATION                               ║
║  make examples-python  # Run Python examples ✅         ║
║  make examples-php     # Run PHP examples ✅            ║
║  make examples-docker  # Run Docker examples ✅         ║
║  make examples-all     # Run all examples               ║
║                                                          ║
║  📄 MANIFEST OPERATIONS                                  ║
║  make manifest-validate # Validate all manifests        ║
║  make manifest-convert  # Convert to all formats        ║
║  make manifest-bundle   # Bundle with modules           ║
║                                                          ║
║  🚀 DEPLOYMENT                                           ║
║  make deploy-staging    # Deploy to staging             ║
║  make deploy-production # Deploy to production          ║
║  make setup-tls         # Setup TLS certificates       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## 🎯 **Template Inheritance System**

### **Base Template Example**
```yaml
# manifests/templates/base-template.yaml
metadata:
  title: "Base Template"
  template_type: "base"
  
styles:
  container: "max-width: 1200px; margin: 0 auto; padding: 20px;"
  heading_primary: "font-size: 2.5em; font-weight: bold; margin-bottom: 20px;"
  button_primary: "background: #007acc; color: white; padding: 12px 24px;"

template_slots:
  header: "Navigation and branding area"
  main_content: "Primary content area"
  footer: "Footer content and links"

structure:
  html:
    children:
      - body:
          children:
            - div:
                id: "app"
                style: "container"
```

### **Extended Template Example**
```yaml
# manifests/templates/landing-page.yaml
metadata:
  title: "Modern Landing Page"
  extends: "./base-template.yaml"  # ← Template inheritance
  
styles:
  hero: "background: linear-gradient(135deg, #007acc, #68C242); padding: 80px 0;"
  hero_title: "font-size: 3.5em; color: white; text-align: center;"

structure:
  section:
    style: "hero"
    children:
      - h1:
          style: "hero_title"
          text: "Build Amazing Websites with YAML"
```

---

## 🐳 **Docker Integration**

### **Container-Based Rendering**
```yaml
# manifests/examples/docker-dashboard.yaml
docker_rendering:
  containers:
    - name: "analytics-module"
      image: "node:18-alpine"
      environment:
        NODE_ENV: "production"
      command: ["node", "analytics-renderer.js"]
    
    - name: "chart-generator"
      image: "python:3.11-alpine"
      command: ["python", "chart_generator.py"]
      depends_on: ["analytics-module"]

styles:
  dashboard: "display: grid; grid-template-columns: 1fr 2fr; gap: 20px;"

structure:
  div:
    style: "dashboard"
    children:
      - div:
          id: "analytics-slot"
          module: "analytics"
      - div:
          id: "charts-slot"
          module: "charts"
```

---

## 🌍 **Multi-Language Integration**

### **🐍 Python Client**
```python
from manifest_client import ManifestClient

client = ManifestClient("http://localhost:3009")
manifest = client.load_manifest("./templates/landing-page.yaml")
html_output = client.convert_to_format(manifest, 'html')
```

### **🐘 PHP Client**
```php
$client = new ManifestClient('http://localhost:3009');
$manifest = $client->loadManifest('./templates/landing-page.yaml');
$htmlOutput = $client->convertToFormat($manifest, 'html');
```

### **🟢 Node.js Client**
```javascript
const client = new ManifestClient('http://localhost:3009');
const manifest = await client.loadManifest('./templates/landing-page.yaml');
const htmlOutput = await client.convertToFormat(manifest, 'html');
```

---

## 🧪 **Testing Fixed Example Scripts**

All example scripts have been fixed and are now working! ✅

```bash
# Test Python integration (now works!)
make examples-python
# Expected: ✅ Python integration examples completed successfully!

# Test PHP integration (now works!)
make examples-php  
# Expected: ✅ PHP integration examples completed successfully!

# Test Docker rendering (now works!)
make examples-docker
# Expected: ✅ Docker rendering examples completed successfully!

# Test all integrations
make examples-all
```

---

## 🎉 **Quick Start Summary**

```ascii
╔═══════════════════════════════════════════════════════════╗
║  🚀 GET STARTED IN 3 STEPS:                              ║
║                                                           ║
║  1️⃣  npm install && npm start                            ║
║  2️⃣  make examples-all                                    ║
║  3️⃣  make docker-build && make compose-up                ║
║                                                           ║
║  🌐 Access: http://localhost:3009                        ║
║  📚 Examples: /examples/                                  ║
║  🎯 Templates: /manifests/templates/                      ║
║                                                           ║
║  🎉 Ready to build amazing web experiences!              ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 📖 **Core Technologies**

| Component | Technology | Purpose |
|-----------|------------|---------|
| YAML Parser | js-yaml | Convert YAML ↔ JavaScript |
| Template Engine | Custom Inheritance | Base + child template merging |
| Code Editor | CodeMirror 5 | YAML editing with syntax highlighting |
| Multi-Format | Custom Converters | HTML, React, Vue, PHP output |
| Containerization | Docker + Docker Compose | Isolated module rendering |
| Automation | GNU Make + Shell Scripts | 40+ development commands |

**🔗 Links & Resources:**
- 📖 [Full Documentation](http://localhost:3009/docs)
- 🐳 [Docker Hub](https://hub.docker.com/r/modular-yaml)
- 🧪 [Examples Repository](./examples/)
- 🎯 [Template Gallery](./manifests/templates/)

**License:** Apache-2.0


