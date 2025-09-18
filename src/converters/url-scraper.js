/**
 * URL Webpage Scraper - Convert any webpage to manifest format
 * Analyzes HTML structure, styles, and scripts to generate YAML manifests
 */

class WebpageToManifestConverter {
  constructor(options = {}) {
    this.options = {
      extractStyles: true,
      extractScripts: true,
      preserveClasses: true,
      generateModules: true,
      maxDepth: 10,
      ignoreElements: ['script', 'style', 'meta', 'link'],
      ...options
    };
  }

  /**
   * Convert webpage from URL to manifest
   */
  async convertFromUrl(url) {
    const html = await this.fetchwebpage(url);
    return this.convertFromHTML(html, url);
  }

  /**
   * Convert HTML string to manifest
   */
  convertFromHTML(html, baseUrl = '') {
    const parser = this.createDOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const manifest = {
      manifest: {
        version: "2.0",
        name: this.extractPageTitle(doc),
        description: this.extractPageDescription(doc),
        source: baseUrl,
        generatedAt: new Date().toISOString()
      },
      
      imports: this.extractImports(doc, baseUrl),
      styles: this.extractStyles(doc),
      structure: this.extractStructure(doc),
      meta: this.extractMeta(doc)
    };

    // Generate sub-modules if enabled
    if (this.options.generateModules) {
      manifest.modules = this.generateModules(doc, baseUrl);
    }

    return manifest;
  }

  /**
   * Fetch webpage content
   */
  async fetchwebpage(url) {
    if (typeof fetch !== 'undefined') {
      // Browser environment
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      }
      return await response.text();
    } else {
      // Node.js environment
      const https = require('https');
      const http = require('http');
      
      return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;
        
        client.get(url, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => resolve(data));
        }).on('error', reject);
      });
    }
  }

  /**
   * Create DOM parser for different environments
   */
  createDOMParser() {
    if (typeof DOMParser !== 'undefined') {
      return new DOMParser();
    } else {
      // Node.js environment
      const { JSDOM } = require('jsdom');
      return {
        parseFromString: (html, type) => new JSDOM(html).window.document
      };
    }
  }

  /**
   * Extract page title
   */
  extractPageTitle(doc) {
    const titleEl = doc.querySelector('title');
    if (titleEl) return titleEl.textContent.trim();
    
    const h1 = doc.querySelector('h1');
    if (h1) return h1.textContent.trim();
    
    return 'Untitled Page';
  }

  /**
   * Extract page description
   */
  extractPageDescription(doc) {
    const metaDesc = doc.querySelector('meta[name="description"]');
    if (metaDesc) return metaDesc.getAttribute('content');
    
    const firstP = doc.querySelector('p');
    if (firstP) {
      const text = firstP.textContent.trim();
      return text.length > 160 ? text.substring(0, 157) + '...' : text;
    }
    
    return 'Generated from webpage';
  }

  /**
   * Extract external imports (CSS, JS, fonts)
   */
  extractImports(doc, baseUrl) {
    const imports = {
      styles: [],
      scripts: [],
      fonts: []
    };

    // Extract CSS files
    const cssLinks = doc.querySelectorAll('link[rel="stylesheet"]');
    cssLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        imports.styles.push(this.resolveUrl(href, baseUrl));
      }
    });

    // Extract external scripts
    const scripts = doc.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && !this.isInlineScript(src)) {
        imports.scripts.push(this.resolveUrl(src, baseUrl));
      }
    });

    // Extract Google Fonts
    const fontLinks = doc.querySelectorAll('link[href*="fonts.googleapis.com"]');
    fontLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        imports.fonts.push(href);
      }
    });

    return imports;
  }

  /**
   * Extract and convert CSS styles to manifest format
   */
  extractStyles(doc) {
    const styles = {};
    
    // Extract inline styles
    const styleElements = doc.querySelectorAll('style');
    styleElements.forEach((styleEl, index) => {
      const cssText = styleEl.textContent;
      const parsedStyles = this.parseCSSText(cssText);
      
      Object.entries(parsedStyles).forEach(([selector, rules]) => {
        const className = this.selectorToClassName(selector, index);
        styles[className] = this.cssRulesToObject(rules);
      });
    });

    // Extract computed styles from elements with classes
    const elementsWithClasses = doc.querySelectorAll('[class]');
    elementsWithClasses.forEach(el => {
      const classes = el.className.split(' ').filter(Boolean);
      classes.forEach(className => {
        if (!styles[className]) {
          styles[className] = this.extractElementStyles(el);
        }
      });
    });

    return styles;
  }

  /**
   * Extract DOM structure and convert to manifest format
   */
  extractStructure(doc) {
    const body = doc.querySelector('body');
    if (!body) return {};

    return this.convertElementToManifest(body, 0);
  }

  /**
   * Convert DOM element to manifest structure
   */
  convertElementToManifest(element, depth) {
    if (depth > this.options.maxDepth) {
      return { text: '[Max depth reached]' };
    }

    const tagName = element.tagName.toLowerCase();
    
    // Skip ignored elements
    if (this.options.ignoreElements.includes(tagName)) {
      return null;
    }

    const manifestNode = {
      [tagName]: {}
    };

    const props = manifestNode[tagName];

    // Extract attributes
    if (element.attributes) {
      Array.from(element.attributes).forEach(attr => {
        if (attr.name === 'class' && this.options.preserveClasses) {
          props.style = attr.value.split(' ').filter(Boolean).join(' ');
        } else if (attr.name !== 'style') {
          props[attr.name] = attr.value;
        }
      });
    }

    // Extract text content (for leaf nodes)
    if (element.children.length === 0 && element.textContent.trim()) {
      props.text = element.textContent.trim();
    }

    // Extract children
    if (element.children.length > 0) {
      const children = [];
      Array.from(element.children).forEach(child => {
        const childManifest = this.convertElementToManifest(child, depth + 1);
        if (childManifest) {
          children.push(childManifest);
        }
      });
      
      if (children.length > 0) {
        props.children = children.length === 1 ? children[0] : children;
      }
    }

    return manifestNode;
  }

  /**
   * Extract meta information
   */
  extractMeta(doc) {
    const meta = {};
    
    // Extract meta tags
    const metaTags = doc.querySelectorAll('meta');
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      
      if (name && content) {
        meta[name] = content;
      }
    });

    // Extract viewport
    const viewport = doc.querySelector('meta[name="viewport"]');
    if (viewport) {
      meta.viewport = viewport.getAttribute('content');
    }

    // Extract charset
    const charset = doc.querySelector('meta[charset]');
    if (charset) {
      meta.charset = charset.getAttribute('charset');
    }

    return meta;
  }

  /**
   * Generate sub-modules for reusable components
   */
  generateModules(doc, baseUrl) {
    const modules = [];
    
    // Identify potential modules (common patterns)
    const moduleSelectors = [
      'header',
      'nav',
      'footer',
      '.header',
      '.navigation',
      '.sidebar',
      '.modal',
      '.card',
      '[data-component]'
    ];

    moduleSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((el, index) => {
        const moduleName = this.generateModuleName(selector, index);
        const moduleManifest = this.convertElementToManifest(el, 0);
        
        if (moduleManifest) {
          modules.push({
            url: `./${moduleName}.yaml`,
            alias: moduleName,
            type: 'component',
            _content: moduleManifest
          });
        }
      });
    });

    return modules;
  }

  /**
   * Parse CSS text into selectors and rules
   */
  parseCSSText(cssText) {
    const styles = {};
    
    // Remove comments
    cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Simple CSS parser - split by closing braces
    const rules = cssText.split('}').filter(rule => rule.trim());
    
    rules.forEach(rule => {
      const colonIndex = rule.indexOf('{');
      if (colonIndex === -1) return;
      
      const selector = rule.substring(0, colonIndex).trim();
      const declarations = rule.substring(colonIndex + 1).trim();
      
      if (selector && declarations) {
        styles[selector] = declarations;
      }
    });

    return styles;
  }

  /**
   * Convert CSS selector to class name
   */
  selectorToClassName(selector, index) {
    // Simplify selector to create a valid class name
    let className = selector
      .replace(/[#\.\[\]:,\s>+~]/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-')
      .toLowerCase();
    
    if (!className || className === '-') {
      className = `style-${index}`;
    }
    
    return className;
  }

  /**
   * Convert CSS rules string to object
   */
  cssRulesToObject(rulesString) {
    const rules = {};
    
    const declarations = rulesString.split(';').filter(decl => decl.trim());
    declarations.forEach(decl => {
      const colonIndex = decl.indexOf(':');
      if (colonIndex === -1) return;
      
      const property = decl.substring(0, colonIndex).trim();
      const value = decl.substring(colonIndex + 1).trim();
      
      if (property && value) {
        rules[property] = value;
      }
    });

    return rules;
  }

  /**
   * Extract styles from element (simplified)
   */
  extractElementStyles(element) {
    const styles = {};
    
    // This would ideally use getComputedStyle in browser
    // For now, just return basic structure
    if (element.tagName === 'DIV') {
      styles.display = 'block';
    } else if (element.tagName === 'SPAN') {
      styles.display = 'inline';
    }
    
    return styles;
  }

  /**
   * Generate module name from selector
   */
  generateModuleName(selector, index) {
    let name = selector
      .replace(/[#\.\[\]]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase();
    
    if (!name) {
      name = `module-${index}`;
    }
    
    return name;
  }

  /**
   * Check if script is inline
   */
  isInlineScript(src) {
    return src.startsWith('data:') || src.startsWith('javascript:');
  }

  /**
   * Resolve relative URLs
   */
  resolveUrl(url, baseUrl) {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return url;
    }
    
    if (!baseUrl) return url;
    
    try {
      return new URL(url, baseUrl).href;
    } catch (e) {
      return url;
    }
  }
}

/**
 * Bulk webpage analyzer for converting multiple pages
 */
class BulkWebpageAnalyzer {
  constructor(options = {}) {
    this.converter = new WebpageToManifestConverter(options);
    this.options = {
      concurrency: 3,
      delay: 1000, // ms between requests
      ...options
    };
  }

  /**
   * Convert multiple URLs to manifests
   */
  async convertMultipleUrls(urls) {
    const results = [];
    const errors = [];
    
    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < urls.length; i += this.options.concurrency) {
      const batch = urls.slice(i, i + this.options.concurrency);
      
      const batchPromises = batch.map(async (url) => {
        try {
          await this.delay(this.options.delay);
          const manifest = await this.converter.convertFromUrl(url);
          return { url, manifest, success: true };
        } catch (error) {
          return { url, error: error.message, success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });
    }

    return { results, errors };
  }

  /**
   * Analyze a website's sitemap
   */
  async analyzeSitemap(sitemapUrl) {
    const sitemapContent = await this.converter.fetchWebpage(sitemapUrl);
    const urls = this.extractUrlsFromSitemap(sitemapContent);
    
    return this.convertMultipleUrls(urls);
  }

  /**
   * Extract URLs from sitemap XML
   */
  extractUrlsFromSitemap(sitemapXml) {
    const urls = [];
    const urlMatches = sitemapXml.match(/<loc>(.*?)<\/loc>/g);
    
    if (urlMatches) {
      urlMatches.forEach(match => {
        const url = match.replace(/<\/?loc>/g, '');
        urls.push(url);
      });
    }
    
    return urls;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for both environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WebpageToManifestConverter, BulkWebpageAnalyzer };
} else if (typeof window !== 'undefined') {
  window.WebpageToManifestConverter = WebpageToManifestConverter;
  window.BulkWebpageAnalyzer = BulkWebpageAnalyzer;
}
