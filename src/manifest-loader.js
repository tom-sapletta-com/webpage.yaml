/**
 * Manifest Loader - Core system for loading and resolving modular YAML manifests
 * Supports URL-based loading, dependency resolution, and caching
 */

class ManifestLoader {
  constructor(options = {}) {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.baseUrl = options.baseUrl || '';
    this.maxCacheAge = options.maxCacheAge || 300000; // 5 minutes
    this.resolver = new DependencyResolver();
  }

  /**
   * Load a manifest from URL or path with module resolution
   */
  async loadManifest(url, options = {}) {
    const resolvedUrl = this.resolveUrl(url);
    const cacheKey = `${resolvedUrl}:${JSON.stringify(options)}`;

    // Check cache first
    if (this.cache.has(cacheKey) && !options.ignoreCache) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.maxCacheAge) {
        return cached.manifest;
      }
    }

    // Prevent duplicate loading
    if (this.loadingPromises.has(cacheKey)) {
      return await this.loadingPromises.get(cacheKey);
    }

    const loadingPromise = this._loadManifestInternal(resolvedUrl, options);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const manifest = await loadingPromise;
      
      // Cache the result
      this.cache.set(cacheKey, {
        manifest,
        timestamp: Date.now()
      });

      return manifest;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Internal manifest loading logic
   */
  async _loadManifestInternal(url, options) {
    let yamlContent;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Load from remote URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load manifest from ${url}: ${response.statusText}`);
      }
      yamlContent = await response.text();
    } else {
      // Load from local file or relative path
      yamlContent = await this._loadLocalFile(url);
    }

    // Parse YAML
    const manifest = jsyaml.load(yamlContent);
    
    // Validate manifest structure
    this._validateManifest(manifest);

    // Resolve and load modules
    if (manifest.modules && manifest.modules.length > 0) {
      manifest._resolvedModules = await this._resolveModules(manifest.modules, url);
    }

    // Process imports
    if (manifest.imports) {
      manifest._processedImports = await this._processImports(manifest.imports, url);
    }

    // Merge styles from modules
    manifest._mergedStyles = this._mergeModuleStyles(manifest);

    return manifest;
  }

  /**
   * Resolve module dependencies
   */
  async _resolveModules(modules, baseUrl) {
    const resolvedModules = {};
    const loadPromises = modules.map(async (moduleConfig) => {
      const moduleUrl = this.resolveUrl(moduleConfig.url, baseUrl);
      const loadedModule = await this.loadManifest(moduleUrl);
      
      // Apply version constraints if specified
      if (moduleConfig.version && moduleConfig.version !== 'latest') {
        this._checkVersionCompatibility(loadedModule, moduleConfig.version);
      }

      resolvedModules[moduleConfig.alias] = {
        config: moduleConfig,
        manifest: loadedModule,
        url: moduleUrl
      };
    });

    await Promise.all(loadPromises);
    return resolvedModules;
  }

  /**
   * Process external imports (scripts, styles, fonts)
   */
  async _processImports(imports, baseUrl) {
    const processed = {
      scripts: [],
      styles: [],
      fonts: []
    };

    for (const [type, urls] of Object.entries(imports)) {
      if (processed[type]) {
        processed[type] = urls.map(url => this.resolveUrl(url, baseUrl));
      }
    }

    return processed;
  }

  /**
   * Merge styles from all loaded modules
   */
  _mergeModuleStyles(manifest) {
    const mergedStyles = { ...manifest.styles || {} };

    if (manifest._resolvedModules) {
      for (const [alias, module] of Object.entries(manifest._resolvedModules)) {
        const moduleStyles = module.manifest.styles || {};
        
        // Prefix module styles with alias to avoid conflicts
        for (const [styleName, styleValue] of Object.entries(moduleStyles)) {
          const prefixedName = `${alias}.${styleName}`;
          mergedStyles[prefixedName] = styleValue;
        }
      }
    }

    return this._resolveStyleInheritance(mergedStyles);
  }

  /**
   * Resolve style inheritance with support for module references
   */
  _resolveStyleInheritance(styles) {
    const resolved = {};
    const resolving = new Set();

    const resolveStyle = (name) => {
      if (resolved[name]) return resolved[name];
      if (resolving.has(name)) {
        throw new Error(`Circular style inheritance detected: ${name}`);
      }

      resolving.add(name);
      const style = styles[name];
      
      if (!style) {
        throw new Error(`Style '${name}' not found`);
      }

      let result = {};
      
      if (style.extends) {
        const parentStyle = resolveStyle(style.extends);
        result = { ...parentStyle };
      }

      // Merge current style (excluding extends)
      for (const [key, value] of Object.entries(style)) {
        if (key !== 'extends') {
          result[key] = value;
        }
      }

      resolving.delete(name);
      resolved[name] = result;
      return result;
    };

    for (const styleName of Object.keys(styles)) {
      resolveStyle(styleName);
    }

    return resolved;
  }

  /**
   * Validate manifest structure
   */
  _validateManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Invalid manifest: must be an object');
    }

    if (manifest.manifest && manifest.manifest.version) {
      const version = manifest.manifest.version;
      if (!this._isVersionSupported(version)) {
        throw new Error(`Unsupported manifest version: ${version}`);
      }
    }
  }

  /**
   * Check version compatibility
   */
  _checkVersionCompatibility(manifest, requiredVersion) {
    const manifestVersion = manifest.manifest?.version || '1.0.0';
    // Simple version check - in production, use a proper semver library
    if (requiredVersion.startsWith('^')) {
      const required = requiredVersion.slice(1);
      if (manifestVersion < required) {
        throw new Error(`Version mismatch: required ${requiredVersion}, got ${manifestVersion}`);
      }
    }
  }

  /**
   * Check if manifest version is supported
   */
  _isVersionSupported(version) {
    const supportedVersions = ['1.0', '2.0'];
    return supportedVersions.some(v => version.startsWith(v));
  }

  /**
   * Resolve URL relative to base URL
   */
  resolveUrl(url, baseUrl = null) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    const base = baseUrl || this.baseUrl;
    if (base && !url.startsWith('/')) {
      return new URL(url, base).href;
    }
    
    return url;
  }

  /**
   * Load local file content (browser environment)
   */
  async _loadLocalFile(path) {
    // In browser environment, this would typically use fetch for relative paths
    // In Node.js environment, this would use fs.readFile
    if (typeof window !== 'undefined') {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load local file: ${path}`);
      }
      return await response.text();
    } else {
      // Node.js environment
      const fs = require('fs').promises;
      return await fs.readFile(path, 'utf8');
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      loading: this.loadingPromises.size
    };
  }
}

/**
 * Dependency resolver for module ordering and conflict resolution
 */
class DependencyResolver {
  constructor() {
    this.dependencies = new Map();
  }

  /**
   * Add dependency relationship
   */
  addDependency(module, dependsOn) {
    if (!this.dependencies.has(module)) {
      this.dependencies.set(module, new Set());
    }
    this.dependencies.get(module).add(dependsOn);
  }

  /**
   * Resolve dependencies using topological sort
   */
  resolve(modules) {
    const resolved = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (module) => {
      if (visiting.has(module)) {
        throw new Error(`Circular dependency detected: ${module}`);
      }
      if (visited.has(module)) {
        return;
      }

      visiting.add(module);
      
      const deps = this.dependencies.get(module) || new Set();
      for (const dep of deps) {
        visit(dep);
      }

      visiting.delete(module);
      visited.add(module);
      resolved.push(module);
    };

    for (const module of modules) {
      visit(module);
    }

    return resolved;
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ManifestLoader, DependencyResolver };
} else if (typeof window !== 'undefined') {
  window.ManifestLoader = ManifestLoader;
  window.DependencyResolver = DependencyResolver;
}
