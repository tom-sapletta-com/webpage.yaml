/**
 * Manifest Loader - Core system for loading and resolving modular YAML manifests
 * Supports URL-based loading, dependency resolution, and caching
 */

const jsyaml = require('js-yaml');
const path = require('path');

class ManifestLoader {
  constructor(options = {}) {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.baseUrl = options.baseUrl || '';
    this.baseDir = options.baseDir || options; // Support both options object and string
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
      const fullPath = path.resolve(this.baseDir, url);
      yamlContent = await this._loadLocalFile(fullPath);
    }

    // Parse YAML
    const manifest = jsyaml.load(yamlContent);
    
    // Validate manifest structure
    this._validateManifest(manifest);

    // Resolve and load modules
    if (manifest.modules && manifest.modules.length > 0) {
      manifest.modules = await this._resolveModules(manifest.modules, url);
    }

    // Process imports
    if (manifest.imports) {
      manifest._processedImports = await this._processImports(manifest.imports, url);
    }

    // Merge styles from modules
    manifest._mergedStyles = this._mergeModuleStyles(manifest);

    // Expand module references in structure
    if (manifest.structure) {
      manifest.structure = this._expandModuleReferences(manifest.structure, manifest.modules);
    }

    return manifest;
  }

  /**
   * Expand modules in a manifest object (without loading from file/URL)
   * Used when manifest is passed directly to API endpoints
   */
  async expandManifest(manifestObj, baseDir = null) {
    // Create a copy to avoid mutating the original
    let manifest = JSON.parse(JSON.stringify(manifestObj));
    
    // Set baseDir for module resolution context
    const originalBaseDir = this.baseDir;
    const originalBaseUrl = this.baseUrl;
    
    if (baseDir) {
      this.baseDir = baseDir;
    } else if (!this.baseDir || typeof this.baseDir !== 'string') {
      this.baseDir = './manifests';
    }
    
    // Force local file loading by clearing baseUrl
    this.baseUrl = '';
    
    try {
      // Handle template inheritance first
      if (manifest.metadata && manifest.metadata.extends) {
        manifest = await this._processTemplateInheritance(manifest);
      }

      // Validate manifest structure
      this._validateManifest(manifest);

      // Resolve and load modules if they exist
      if (manifest.modules && manifest.modules.length > 0) {
        // Resolve modules using local file system with proper path resolution
        manifest.modules = await this._resolveModulesLocal(manifest.modules);
      }

      // Process template slots
      if (manifest.template_slots) {
        manifest = await this._processTemplateSlots(manifest);
      }

      // Process imports with proper base context
      if (manifest.imports) {
        manifest._processedImports = await this._processImportsAdvanced(manifest.imports, '.');
      }

      // Merge styles from modules
      manifest._mergedStyles = this._mergeModuleStyles(manifest);

      // Expand module references in structure
      if (manifest.structure) {
        manifest.structure = this._expandModuleReferences(manifest.structure, manifest.modules);
      }

      return manifest;
    } finally {
      // Restore original settings
      this.baseDir = originalBaseDir;
      this.baseUrl = originalBaseUrl;
    }
  }

  /**
   * Resolve module dependencies for local file system (no HTTP URLs)
   * Used by expandManifest for direct manifest processing
   */
  async _resolveModulesLocal(modules) {
    const resolvedModules = {};
    const loadPromises = modules.map(async (moduleConfig) => {
      // Force local file path resolution
      let moduleUrl = moduleConfig.url;
      
      // Resolve relative to manifests directory
      if (!moduleUrl.startsWith('/')) {
        moduleUrl = path.join(this.baseDir, moduleUrl);
      }
      
      const loadedModule = await this.loadManifest(moduleUrl);
      
      // Apply version constraints if specified
      if (moduleConfig.version && moduleConfig.version !== 'latest') {
        this._checkVersionCompatibility(loadedModule, moduleConfig.version);
      }

      resolvedModules[moduleConfig.alias] = {
        config: moduleConfig,
        manifest: loadedModule,
        url: moduleUrl,
        loaded: true,
        source: moduleConfig.url,
        version: moduleConfig.version || 'latest',
        exports: loadedModule.exports || {}
      };
    });

    await Promise.all(loadPromises);
    return resolvedModules;
  }

  /**
   * Resolve module dependencies
   */
  async _resolveModules(modules, baseUrl) {
    const resolvedModules = {};
    const loadPromises = modules.map(async (moduleConfig) => {
      let moduleUrl;
      
      if (moduleConfig.url.startsWith('http')) {
        // Absolute HTTP URL
        moduleUrl = moduleConfig.url;
      } else if (moduleConfig.url.startsWith('/')) {
        // Absolute local path
        moduleUrl = moduleConfig.url;
      } else {
        // Relative path - resolve relative to the current manifest's directory within baseDir
        const currentManifestFullPath = path.resolve(this.baseDir, baseUrl);
        const currentManifestDir = path.dirname(currentManifestFullPath);
        const resolvedFullPath = path.resolve(currentManifestDir, moduleConfig.url);
        // Make path relative to baseDir
        moduleUrl = path.relative(path.resolve(this.baseDir), resolvedFullPath);
      }
      
      const loadedModule = await this.loadManifest(moduleUrl);
      
      // Apply version constraints if specified
      if (moduleConfig.version && moduleConfig.version !== 'latest') {
        this._checkVersionCompatibility(loadedModule, moduleConfig.version);
      }

      resolvedModules[moduleConfig.alias] = {
        config: moduleConfig,
        manifest: loadedModule,
        url: moduleUrl,
        loaded: true,
        source: moduleConfig.url,
        version: moduleConfig.version || 'latest',
        exports: loadedModule.exports || {}
      };
    });

    await Promise.all(loadPromises);
    return resolvedModules;
  }

  /**
   * Process template inheritance
   */
  async _processTemplateInheritance(manifest) {
    const templatePath = manifest.metadata.extends;
    const templateManifest = await this.loadManifest(templatePath);
    
    // Merge inheritance configuration
    const inheritanceConfig = {
      merge_styles: true,
      override_structure: false,
      preserve_slots: [],
      ...manifest.metadata.inheritance
    };
    
    // Create merged manifest
    const mergedManifest = JSON.parse(JSON.stringify(templateManifest));
    
    // Merge metadata
    mergedManifest.metadata = {
      ...templateManifest.metadata,
      ...manifest.metadata
    };
    
    // Merge styles
    if (inheritanceConfig.merge_styles && manifest.styles) {
      mergedManifest.styles = {
        ...templateManifest.styles,
        ...manifest.styles
      };
    } else if (manifest.styles) {
      mergedManifest.styles = manifest.styles;
    }
    
    // Handle structure inheritance
    if (inheritanceConfig.override_structure && manifest.structure) {
      mergedManifest.structure = manifest.structure;
    } else if (manifest.structure) {
      mergedManifest.structure = this._mergeStructures(
        templateManifest.structure,
        manifest.structure,
        inheritanceConfig.preserve_slots
      );
    }
    
    // Merge template slots
    if (manifest.template_slots) {
      mergedManifest.template_slots = {
        ...templateManifest.template_slots,
        ...manifest.template_slots
      };
    }
    
    // Merge imports
    if (manifest.imports) {
      mergedManifest.imports = [
        ...(templateManifest.imports || []),
        ...manifest.imports
      ];
    }
    
    return mergedManifest;
  }

  /**
   * Process template slots
   */
  async _processTemplateSlots(manifest) {
    if (!manifest.template_slots) return manifest;
    
    const processedManifest = JSON.parse(JSON.stringify(manifest));
    
    for (const [slotName, slotConfig] of Object.entries(manifest.template_slots)) {
      // Find slot element in structure
      const slotElement = this._findElementById(processedManifest.structure, slotConfig.element_id);
      
      if (slotElement) {
        // Check if we have content for this slot from imports
        const slotContent = await this._resolveSlotContent(slotName, slotConfig, manifest.imports);
        
        if (slotContent) {
          // Replace slot element with actual content
          this._replaceSlotElement(processedManifest.structure, slotConfig.element_id, slotContent);
        } else if (slotConfig.default_content) {
          // Use default content if available
          this._replaceSlotElement(processedManifest.structure, slotConfig.element_id, slotConfig.default_content);
        }
      }
    }
    
    return processedManifest;
  }

  /**
   * Process external imports (scripts, styles, fonts) with advanced features
   */
  async _processImportsAdvanced(imports, baseUrl) {
    const processed = {
      scripts: [],
      styles: [],
      fonts: [],
      modules: [],
      templates: []
    };

    for (const importItem of imports) {
      if (typeof importItem === 'string') {
        // Legacy format - assume it's a style
        processed.styles.push(this.resolveUrl(importItem, baseUrl));
      } else if (typeof importItem === 'object') {
        const { type, url, path, slot, optional = false } = importItem;
        
        try {
          switch (type) {
            case 'css':
            case 'style':
              processed.styles.push(this.resolveUrl(url || path, baseUrl));
              break;
            case 'js':
            case 'script':
              processed.scripts.push(this.resolveUrl(url || path, baseUrl));
              break;
            case 'font':
              processed.fonts.push(this.resolveUrl(url || path, baseUrl));
              break;
            case 'module':
              // Handle module imports for slots
              if (slot) {
                const moduleManifest = await this.loadManifest(path);
                processed.modules.push({
                  slot,
                  manifest: moduleManifest,
                  path: path
                });
              }
              break;
            case 'template':
              // Template inheritance is handled separately
              break;
          }
        } catch (error) {
          if (!optional) {
            throw new Error(`Failed to process import: ${error.message}`);
          }
          console.warn(`Optional import failed: ${error.message}`);
        }
      }
    }

    return processed;
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
   * Expand module references in structure
   */
  _expandModuleReferences(structure, modules) {
    if (!structure || !modules) return structure;

    const expandNode = (node) => {
      if (typeof node !== 'object' || node === null) return node;

      // Handle arrays
      if (Array.isArray(node)) {
        return node.map(expandNode);
      }

      // Handle objects
      const result = {};
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'object' && value !== null) {
          // Check if this node has a module reference
          if (value.module && modules[value.module]) {
            const moduleManifest = modules[value.module].manifest;
            // Try to get component structure from module exports
            if (moduleManifest.exports && moduleManifest.exports.components && moduleManifest.exports.components[key]) {
              result[key] = expandNode(moduleManifest.exports.components[key]);
            } else if (moduleManifest.structure) {
              // Fallback to module's main structure
              result[key] = expandNode(moduleManifest.structure);
            } else {
              // Keep original if no matching structure found
              result[key] = expandNode(value);
            }
          } else {
            // Recursively expand children
            result[key] = expandNode(value);
          }
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return expandNode(structure);
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
      
      // Convert versions to comparable format (e.g., "2.0" -> "2.0.0")
      const normalizeVersion = (v) => {
        const parts = v.split('.');
        while (parts.length < 3) parts.push('0');
        return parts.map(p => parseInt(p)).join('.');
      };
      
      const normalizedManifest = normalizeVersion(manifestVersion);
      const normalizedRequired = normalizeVersion(required);
      
      // For caret (^) compatibility: major version must match, minor/patch can be higher
      const manifestParts = normalizedManifest.split('.').map(p => parseInt(p));
      const requiredParts = normalizedRequired.split('.').map(p => parseInt(p));
      
      if (manifestParts[0] !== requiredParts[0] || 
          manifestParts[0] < requiredParts[0] ||
          (manifestParts[0] === requiredParts[0] && manifestParts[1] < requiredParts[1])) {
        throw new Error(`Version mismatch: required ${requiredVersion}, got ${manifestVersion}`);
      }
    }
  }

  /**
   * Merge structures from template inheritance
   */
  _mergeStructures(templateStructure, childStructure, preserveSlots = []) {
    if (!templateStructure) return childStructure;
    if (!childStructure) return templateStructure;
    
    // Deep merge structures while preserving certain slots
    const merged = JSON.parse(JSON.stringify(templateStructure));
    
    const mergeNodes = (templateNode, childNode, path = '') => {
      if (!templateNode || !childNode) return childNode || templateNode;
      
      if (Array.isArray(childNode)) {
        return childNode;
      }
      
      if (typeof childNode === 'object' && typeof templateNode === 'object') {
        const result = { ...templateNode };
        
        for (const [key, value] of Object.entries(childNode)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          // Check if this is a preserved slot
          if (preserveSlots.includes(currentPath)) {
            result[key] = templateNode[key] || value;
          } else if (templateNode[key] && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = mergeNodes(templateNode[key], value, currentPath);
          } else {
            result[key] = value;
          }
        }
        
        return result;
      }
      
      return childNode;
    };
    
    return mergeNodes(templateStructure, childStructure);
  }

  /**
   * Find element by ID in structure
   */
  _findElementById(structure, elementId) {
    if (!structure || !elementId) return null;
    
    const findInNode = (node) => {
      if (typeof node !== 'object' || node === null) return null;
      
      if (Array.isArray(node)) {
        for (const item of node) {
          const found = findInNode(item);
          if (found) return found;
        }
        return null;
      }
      
      // Check if this node has the target ID
      for (const [tag, props] of Object.entries(node)) {
        if (props && props.id === elementId) {
          return { tag, props, parent: node };
        }
        
        // Recursively search children
        if (props && props.children) {
          const found = findInNode(props.children);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    return findInNode(structure);
  }

  /**
   * Resolve slot content from imports
   */
  async _resolveSlotContent(slotName, slotConfig, imports) {
    if (!imports) return null;
    
    // Look for module imports that target this slot
    for (const importItem of imports) {
      if (typeof importItem === 'object' && importItem.slot === slotName) {
        if (importItem.type === 'module' && importItem.path) {
          try {
            const moduleManifest = await this.loadManifest(importItem.path);
            return moduleManifest.structure || moduleManifest.exports?.structure;
          } catch (error) {
            if (!importItem.optional) {
              throw error;
            }
            console.warn(`Optional slot content failed to load: ${error.message}`);
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Replace slot element with actual content
   */
  _replaceSlotElement(structure, elementId, content) {
    if (!structure || !elementId || !content) return;
    
    const replaceInNode = (node) => {
      if (typeof node !== 'object' || node === null) return false;
      
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          if (replaceInNode(node[i])) return true;
          
          // Check if array item needs replacement
          if (typeof node[i] === 'object') {
            for (const [tag, props] of Object.entries(node[i])) {
              if (props && props.id === elementId) {
                node[i] = content;
                return true;
              }
            }
          }
        }
        return false;
      }
      
      // Check current node
      for (const [tag, props] of Object.entries(node)) {
        if (props && props.id === elementId) {
          // Replace the entire node
          Object.keys(node).forEach(key => delete node[key]);
          Object.assign(node, content);
          return true;
        }
        
        // Recursively search children
        if (props && props.children) {
          if (replaceInNode(props.children)) return true;
        }
      }
      
      return false;
    };
    
    replaceInNode(structure);
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
      // Handle HTTP URLs
      if (base.startsWith('http://') || base.startsWith('https://')) {
        return new URL(url, base).href;
      }
      // Handle local paths
      return path.join(base, url);
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
