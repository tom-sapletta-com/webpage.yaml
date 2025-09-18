/**
 * Manifest Conversion Server
 * Express.js server providing APIs for all manifest operations:
 * - URL to manifest conversion
 * - React to manifest conversion  
 * - Manifest to multiple formats (React/Vue/PHP/HTML)
 * - Module resolution and bundling
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const jsyaml = require('js-yaml');

// Import our converters
const { ManifestLoader } = require('./src/manifest-loader');
const ReactToManifestConverter = require('./src/converters/react-converter');
const { WebpageToManifestConverter } = require('./src/converters/url-scraper');
const {
  ManifestToReactConverter,
  ManifestToVueConverter,
  ManifestToPHPConverter,
  ManifestToHTMLConverter
} = require('./src/converters/format-converters');

class ManifestServer {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || 3000;
    this.manifestDir = options.manifestDir || './manifests';
    this.outputDir = options.outputDir || './output';
    
    // Initialize converters
    this.manifestLoader = new ManifestLoader({ baseUrl: `http://localhost:${this.port}` });
    this.reactConverter = new ReactToManifestConverter();
    this.urlConverter = new WebpageToManifestConverter();
    this.toReactConverter = new ManifestToReactConverter();
    this.toVueConverter = new ManifestToVueConverter();
    this.toPHPConverter = new ManifestToPHPConverter();
    this.toHTMLConverter = new ManifestToHTMLConverter();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Serve static files
    this.app.use('/manifests', express.static(this.manifestDir));
    this.app.use('/output', express.static(this.outputDir));
    this.app.use('/', express.static('.'));

    // Error handling middleware
    this.app.use(this.errorHandler.bind(this));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // API Routes
    this.app.get('/api/manifest/:name', this.getManifest.bind(this));
    this.app.post('/api/manifest', this.createManifest.bind(this));
    this.app.put('/api/manifest/:name', this.updateManifest.bind(this));
    this.app.delete('/api/manifest/:name', this.deleteManifest.bind(this));

    // Conversion routes
    this.app.post('/api/convert/url-to-manifest', this.convertUrlToManifest.bind(this));
    this.app.post('/api/convert/react-to-manifest', this.convertReactToManifest.bind(this));
    this.app.post('/api/convert/manifest-to-react', this.convertManifestToReact.bind(this));
    this.app.post('/api/convert/manifest-to-vue', this.convertManifestToVue.bind(this));
    this.app.post('/api/convert/manifest-to-php', this.convertManifestToPHP.bind(this));
    this.app.post('/api/convert/manifest-to-html', this.convertManifestToHTML.bind(this));

    // Bulk operations
    this.app.post('/api/convert/bulk', this.bulkConvert.bind(this));
    this.app.post('/api/analyze/sitemap', this.analyzeSitemap.bind(this));

    // Module operations
    this.app.get('/api/manifest/:name/resolved', this.getResolvedManifest.bind(this));
    this.app.get('/api/manifest/:name/dependencies', this.getManifestDependencies.bind(this));
    this.app.post('/api/bundle', this.bundleManifests.bind(this));

    // Development routes
    this.app.get('/api/preview/:name', this.previewManifest.bind(this));
    this.app.get('/dev/:name', this.devMode.bind(this));
    
    // Serve the main UI
    this.app.get('/', this.serveMainUI.bind(this));
  }

  /**
   * Get manifest by name with optional module resolution
   */
  async getManifest(req, res) {
    try {
      const { name } = req.params;
      const { resolve = false } = req.query;
      
      const manifestPath = path.join(this.manifestDir, `${name}.yaml`);
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      
      if (resolve === 'true') {
        const manifest = await this.manifestLoader.loadManifest(manifestPath);
        res.json(manifest);
      } else {
        const manifest = jsyaml.load(manifestContent);
        res.json(manifest);
      }
    } catch (error) {
      res.status(404).json({ error: `Manifest not found: ${error.message}` });
    }
  }

  /**
   * Create new manifest
   */
  async createManifest(req, res) {
    try {
      const { name, manifest } = req.body;
      
      if (!name || !manifest) {
        return res.status(400).json({ error: 'Name and manifest are required' });
      }

      const manifestPath = path.join(this.manifestDir, `${name}.yaml`);
      const yamlContent = jsyaml.dump(manifest, { indent: 2 });
      
      // Ensure manifest directory exists
      await fs.mkdir(this.manifestDir, { recursive: true });
      await fs.writeFile(manifestPath, yamlContent, 'utf8');
      
      res.json({ success: true, path: manifestPath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update existing manifest
   */
  async updateManifest(req, res) {
    try {
      const { name } = req.params;
      const { manifest } = req.body;
      
      const manifestPath = path.join(this.manifestDir, `${name}.yaml`);
      const yamlContent = jsyaml.dump(manifest, { indent: 2 });
      
      await fs.writeFile(manifestPath, yamlContent, 'utf8');
      
      res.json({ success: true, path: manifestPath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Delete manifest
   */
  async deleteManifest(req, res) {
    try {
      const { name } = req.params;
      const manifestPath = path.join(this.manifestDir, `${name}.yaml`);
      
      await fs.unlink(manifestPath);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Convert URL to manifest
   */
  async convertUrlToManifest(req, res) {
    try {
      const { url, options = {} } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const manifest = await this.urlConverter.convertFromUrl(url);
      
      // Optionally save the manifest
      if (options.save) {
        const name = options.name || this.urlToName(url);
        await this.saveManifest(name, manifest);
      }
      
      res.json({ manifest, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Convert React component to manifest
   */
  async convertReactToManifest(req, res) {
    try {
      const { code, filePath, options = {} } = req.body;
      
      let manifest;
      if (code) {
        manifest = this.reactConverter.convertComponentString(code);
      } else if (filePath) {
        manifest = await this.reactConverter.convertComponentFile(filePath);
      } else {
        return res.status(400).json({ error: 'Either code or filePath is required' });
      }

      // Optionally save the manifest
      if (options.save) {
        const name = options.name || manifest.manifest.name;
        await this.saveManifest(name, manifest);
      }
      
      res.json({ manifest, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Convert manifest to React component
   */
  async convertManifestToReact(req, res) {
    try {
      const { manifestName, manifest: directManifest, options = {} } = req.body;
      
      let manifest;
      if (directManifest) {
        manifest = directManifest;
      } else if (manifestName) {
        manifest = await this.loadManifest(manifestName, true);
      } else {
        return res.status(400).json({ error: 'Either manifestName or manifest is required' });
      }

      const result = this.toReactConverter.convertToReact(manifest);
      
      // Optionally save the output
      if (options.save) {
        await this.saveOutput(result.filename, result.content);
      }
      
      res.json({ result, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Convert manifest to Vue component
   */
  async convertManifestToVue(req, res) {
    try {
      const { manifestName, manifest: directManifest, options = {} } = req.body;
      
      let manifest;
      if (directManifest) {
        manifest = directManifest;
      } else if (manifestName) {
        manifest = await this.loadManifest(manifestName, true);
      } else {
        return res.status(400).json({ error: 'Either manifestName or manifest is required' });
      }

      const result = this.toVueConverter.convertToVue(manifest);
      
      if (options.save) {
        await this.saveOutput(result.filename, result.content);
      }
      
      res.json({ result, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Convert manifest to PHP class
   */
  async convertManifestToPHP(req, res) {
    try {
      const { manifestName, manifest: directManifest, options = {} } = req.body;
      
      let manifest;
      if (directManifest) {
        manifest = directManifest;
      } else if (manifestName) {
        manifest = await this.loadManifest(manifestName, true);
      } else {
        return res.status(400).json({ error: 'Either manifestName or manifest is required' });
      }

      const result = this.toPHPConverter.convertToPHP(manifest);
      
      if (options.save) {
        await this.saveOutput(result.filename, result.content);
      }
      
      res.json({ result, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Convert manifest to HTML page
   */
  async convertManifestToHTML(req, res) {
    try {
      const { manifestName, manifest: directManifest, options = {} } = req.body;
      
      let manifest;
      if (directManifest) {
        manifest = directManifest;
      } else if (manifestName) {
        manifest = await this.loadManifest(manifestName, true);
      } else {
        return res.status(400).json({ error: 'Either manifestName or manifest is required' });
      }

      const result = this.toHTMLConverter.convertToHTML(manifest);
      
      if (options.save) {
        await this.saveOutput(result.filename, result.content);
      }
      
      res.json({ result, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Bulk convert multiple items
   */
  async bulkConvert(req, res) {
    try {
      const { operations } = req.body;
      
      if (!Array.isArray(operations)) {
        return res.status(400).json({ error: 'Operations must be an array' });
      }

      const results = [];
      const errors = [];

      for (const operation of operations) {
        try {
          const result = await this.processOperation(operation);
          results.push({ operation, result, success: true });
        } catch (error) {
          errors.push({ operation, error: error.message, success: false });
        }
      }

      res.json({ results, errors, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Analyze sitemap and convert pages
   */
  async analyzeSitemap(req, res) {
    try {
      const { sitemapUrl, options = {} } = req.body;
      
      if (!sitemapUrl) {
        return res.status(400).json({ error: 'Sitemap URL is required' });
      }

      const { BulkWebpageAnalyzer } = require('./src/converters/url-scraper');
      const analyzer = new BulkWebpageAnalyzer(options);
      
      const results = await analyzer.analyzeSitemap(sitemapUrl);
      
      res.json({ results, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get resolved manifest with all modules loaded
   */
  async getResolvedManifest(req, res) {
    try {
      const { name } = req.params;
      const manifestPath = path.join(this.manifestDir, `${name}.yaml`);
      
      const manifest = await this.manifestLoader.loadManifest(manifestPath);
      
      res.json({ manifest, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get manifest dependencies tree
   */
  async getManifestDependencies(req, res) {
    try {
      const { name } = req.params;
      const manifestPath = path.join(this.manifestDir, `${name}.yaml`);
      
      const manifest = await this.manifestLoader.loadManifest(manifestPath);
      const dependencies = this.extractDependencyTree(manifest);
      
      res.json({ dependencies, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Bundle multiple manifests into one
   */
  async bundleManifests(req, res) {
    try {
      const { manifests, options = {} } = req.body;
      
      if (!Array.isArray(manifests)) {
        return res.status(400).json({ error: 'Manifests must be an array' });
      }

      const bundled = await this.bundleMultipleManifests(manifests, options);
      
      if (options.save) {
        const name = options.name || 'bundled-manifest';
        await this.saveManifest(name, bundled);
      }
      
      res.json({ manifest: bundled, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Preview manifest as HTML
   */
  async previewManifest(req, res) {
    try {
      const { name } = req.params;
      const manifest = await this.loadManifest(name, true);
      
      const htmlResult = this.toHTMLConverter.convertToHTML(manifest);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlResult.content);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Development mode with live reload
   */
  async devMode(req, res) {
    try {
      const { name } = req.params;
      
      const devHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Dev Mode: ${name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .dev-toolbar { background: #f0f0f0; padding: 10px; margin-bottom: 20px; }
    #preview { border: 1px solid #ccc; min-height: 400px; }
  </style>
</head>
<body>
  <div class="dev-toolbar">
    <h2>Development Mode: ${name}</h2>
    <button onclick="reload()">Reload</button>
    <button onclick="exportCode()">Export Code</button>
  </div>
  <div id="preview"></div>
  
  <script>
    async function reload() {
      const response = await fetch('/api/preview/${name}');
      const html = await response.text();
      document.getElementById('preview').innerHTML = html;
    }
    
    async function exportCode() {
      const formats = ['react', 'vue', 'php', 'html'];
      for (const format of formats) {
        const response = await fetch('/api/convert/manifest-to-' + format, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifestName: '${name}', options: { save: true } })
        });
        const result = await response.json();
        console.log(format + ' exported:', result);
      }
      alert('Code exported to all formats!');
    }
    
    // Auto-reload every 2 seconds in dev mode
    setInterval(reload, 2000);
    reload(); // Initial load
  </script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(devHTML);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Serve main UI
   */
  async serveMainUI(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
  }

  // Helper methods
  async loadManifest(name, resolve = false) {
    const manifestPath = path.join(this.manifestDir, `${name}.yaml`);
    
    if (resolve) {
      return await this.manifestLoader.loadManifest(manifestPath);
    } else {
      const content = await fs.readFile(manifestPath, 'utf8');
      return jsyaml.load(content);
    }
  }

  async saveManifest(name, manifest) {
    await fs.mkdir(this.manifestDir, { recursive: true });
    const manifestPath = path.join(this.manifestDir, `${name}.yaml`);
    const yamlContent = jsyaml.dump(manifest, { indent: 2 });
    await fs.writeFile(manifestPath, yamlContent, 'utf8');
    return manifestPath;
  }

  async saveOutput(filename, content) {
    await fs.mkdir(this.outputDir, { recursive: true });
    const outputPath = path.join(this.outputDir, filename);
    await fs.writeFile(outputPath, content, 'utf8');
    return outputPath;
  }

  urlToName(url) {
    return url.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  }

  extractDependencyTree(manifest) {
    const tree = { name: manifest.manifest?.name || 'root', children: [] };
    
    if (manifest._resolvedModules) {
      Object.entries(manifest._resolvedModules).forEach(([alias, module]) => {
        tree.children.push({
          name: alias,
          url: module.url,
          children: this.extractDependencyTree(module.manifest).children
        });
      });
    }
    
    return tree;
  }

  async bundleMultipleManifests(manifestNames, options) {
    const bundled = {
      manifest: {
        version: "2.0",
        name: options.name || "bundled-manifest",
        description: "Bundled from multiple manifests",
        bundledFrom: manifestNames
      },
      styles: {},
      structure: { div: { children: [] } },
      interactions: {},
      imports: { scripts: [], styles: [], fonts: [] }
    };

    for (const name of manifestNames) {
      const manifest = await this.loadManifest(name, true);
      
      // Merge styles with prefixes
      if (manifest._mergedStyles) {
        Object.entries(manifest._mergedStyles).forEach(([key, value]) => {
          bundled.styles[`${name}-${key}`] = value;
        });
      }
      
      // Merge structures
      if (manifest.structure) {
        bundled.structure.div.children.push(manifest.structure);
      }
      
      // Merge interactions
      if (manifest.interactions) {
        Object.entries(manifest.interactions).forEach(([key, value]) => {
          bundled.interactions[`${name}-${key}`] = value;
        });
      }
      
      // Merge imports
      if (manifest.imports) {
        ['scripts', 'styles', 'fonts'].forEach(type => {
          if (manifest.imports[type]) {
            bundled.imports[type].push(...manifest.imports[type]);
          }
        });
      }
    }

    // Remove duplicates from imports
    ['scripts', 'styles', 'fonts'].forEach(type => {
      bundled.imports[type] = [...new Set(bundled.imports[type])];
    });

    return bundled;
  }

  async processOperation(operation) {
    const { type, ...params } = operation;
    
    switch (type) {
      case 'url-to-manifest':
        return await this.urlConverter.convertFromUrl(params.url);
      case 'react-to-manifest':
        return this.reactConverter.convertComponentString(params.code);
      case 'manifest-to-react':
        const manifest = await this.loadManifest(params.name, true);
        return this.toReactConverter.convertToReact(manifest);
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  errorHandler(error, req, res, next) {
    console.error('Server Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }

  async start() {
    // Ensure directories exist
    await fs.mkdir(this.manifestDir, { recursive: true });
    await fs.mkdir(this.outputDir, { recursive: true });
    
    this.app.listen(this.port, () => {
      console.log(`🚀 Manifest Server running on http://localhost:${this.port}`);
      console.log(`📁 Manifests directory: ${this.manifestDir}`);
      console.log(`📤 Output directory: ${this.outputDir}`);
      console.log(`🔧 API endpoints available at http://localhost:${this.port}/api/`);
    });
  }
}

// Create and start server if run directly
if (require.main === module) {
  const server = new ManifestServer({
    port: process.env.PORT || 3000,
    manifestDir: process.env.MANIFEST_DIR || './manifests',
    outputDir: process.env.OUTPUT_DIR || './output'
  });
  
  server.start().catch(console.error);
}

module.exports = ManifestServer;
