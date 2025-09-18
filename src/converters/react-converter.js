/**
 * React Component to Manifest Converter
 * Analyzes React components and converts them to YAML manifests
 */

class ReactToManifestConverter {
  constructor(options = {}) {
    this.options = {
      preserveComments: true,
      extractStyles: true,
      generateTypescript: false,
      ...options
    };
  }

  /**
   * Convert React component string to manifest
   */
  convertComponentString(componentCode) {
    const ast = this.parseReactComponent(componentCode);
    return this.convertASTToManifest(ast);
  }

  /**
   * Convert React component file to manifest
   */
  async convertComponentFile(filePath) {
    const componentCode = await this.loadFile(filePath);
    return this.convertComponentString(componentCode);
  }

  /**
   * Parse React component into AST-like structure
   */
  parseReactComponent(code) {
    // Simple parser for React components
    // In production, use @babel/parser or typescript compiler API
    const component = {
      name: this.extractComponentName(code),
      props: this.extractPropsInterface(code),
      imports: this.extractImports(code),
      jsx: this.extractJSX(code),
      styles: this.extractStyles(code),
      hooks: this.extractHooks(code),
      handlers: this.extractEventHandlers(code)
    };

    return component;
  }

  /**
   * Convert parsed component to manifest structure
   */
  convertASTToManifest(ast) {
    const manifest = {
      manifest: {
        version: "2.0",
        name: this.camelToKebab(ast.name),
        description: `Converted from React component: ${ast.name}`,
        type: "component"
      },
      
      // Convert imports to manifest imports
      imports: this.convertImports(ast.imports),
      
      // Convert component props to manifest configuration
      props: ast.props,
      
      // Convert styles
      styles: this.convertStyles(ast.styles),
      
      // Convert JSX structure
      structure: this.convertJSXToStructure(ast.jsx),
      
      // Convert event handlers
      interactions: this.convertEventHandlers(ast.handlers),
      
      // React-specific metadata
      react: {
        componentName: ast.name,
        hooks: ast.hooks,
        originalCode: ast.originalCode
      }
    };

    return manifest;
  }

  /**
   * Extract component name from React code
   */
  extractComponentName(code) {
    // Match function/const component declarations
    const functionMatch = code.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/);
    if (functionMatch) return functionMatch[1];
    
    // Match class component declarations
    const classMatch = code.match(/class\s+([A-Z][a-zA-Z0-9]*)/);
    if (classMatch) return classMatch[1];
    
    return 'UnknownComponent';
  }

  /**
   * Extract props interface/types
   */
  extractPropsInterface(code) {
    const props = {};
    
    // Extract TypeScript interface
    const interfaceMatch = code.match(/interface\s+\w+Props\s*{([^}]+)}/);
    if (interfaceMatch) {
      const propsString = interfaceMatch[1];
      const propLines = propsString.split('\n').filter(line => line.trim());
      
      propLines.forEach(line => {
        const propMatch = line.match(/(\w+)(\?)?:\s*([^;]+)/);
        if (propMatch) {
          const [, name, optional, type] = propMatch;
          props[name] = {
            type: type.trim(),
            required: !optional,
            description: this.extractPropComment(code, name)
          };
        }
      });
    }

    // Extract PropTypes (if using prop-types)
    const propTypesMatch = code.match(/\.propTypes\s*=\s*{([^}]+)}/);
    if (propTypesMatch) {
      // Parse PropTypes definitions
      // This is a simplified version
    }

    return props;
  }

  /**
   * Extract import statements
   */
  extractImports(code) {
    const imports = {
      scripts: [],
      components: [],
      styles: []
    };

    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)(?:\s*,\s*{[^}]*})?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const importPath = match[1];
      
      if (importPath.endsWith('.css') || importPath.endsWith('.scss')) {
        imports.styles.push(importPath);
      } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
        imports.components.push(importPath);
      } else {
        imports.scripts.push(importPath);
      }
    }

    return imports;
  }

  /**
   * Extract JSX structure
   */
  extractJSX(code) {
    // Find the return statement or JSX fragment
    const returnMatch = code.match(/return\s*\(([\s\S]*?)\);?\s*}/);
    if (!returnMatch) return null;

    const jsx = returnMatch[1].trim();
    return this.parseJSXString(jsx);
  }

  /**
   * Parse JSX string into structure
   */
  parseJSXString(jsx) {
    // Simplified JSX parser
    // In production, use @babel/parser with JSX plugin
    
    // Remove comments and normalize whitespace
    jsx = jsx.replace(/{\s*\/\*[\s\S]*?\*\/\s*}/g, '');
    jsx = jsx.replace(/\/\*[\s\S]*?\*\//g, '');
    jsx = jsx.replace(/\/\/.*$/gm, '');

    return this.parseJSXElement(jsx);
  }

  /**
   * Parse individual JSX element
   */
  parseJSXElement(elementString) {
    elementString = elementString.trim();
    
    // Handle fragments
    if (elementString.startsWith('<>') || elementString.startsWith('<React.Fragment>')) {
      return this.parseFragment(elementString);
    }

    // Handle self-closing tags
    const selfClosingMatch = elementString.match(/^<(\w+)([^>]*?)\/>/);
    if (selfClosingMatch) {
      const [, tag, attributes] = selfClosingMatch;
      return {
        [tag.toLowerCase()]: {
          ...this.parseAttributes(attributes),
          _selfClosing: true
        }
      };
    }

    // Handle regular tags
    const openTagMatch = elementString.match(/^<(\w+)([^>]*?)>/);
    if (openTagMatch) {
      const [, tag, attributes] = openTagMatch;
      const closeTag = `</${tag}>`;
      const closeIndex = elementString.lastIndexOf(closeTag);
      
      if (closeIndex === -1) {
        throw new Error(`No closing tag found for <${tag}>`);
      }

      const content = elementString.slice(openTagMatch[0].length, closeIndex);
      const children = this.parseJSXChildren(content);

      return {
        [tag.toLowerCase()]: {
          ...this.parseAttributes(attributes),
          ...(children.length > 0 && { children })
        }
      };
    }

    // Handle text content
    if (!elementString.startsWith('<')) {
      const textContent = elementString.replace(/^['"`]|['"`]$/g, '');
      return { text: textContent };
    }

    return null;
  }

  /**
   * Parse JSX attributes
   */
  parseAttributes(attributeString) {
    const attributes = {};
    const attrRegex = /(\w+)(?:=(?:{([^}]+)}|"([^"]*)"|'([^']*)'))?/g;
    let match;

    while ((match = attrRegex.exec(attributeString)) !== null) {
      const [, name, jsValue, doubleQuoted, singleQuoted] = match;
      
      if (jsValue) {
        // JavaScript expression
        attributes[name] = `{${jsValue}}`;
      } else if (doubleQuoted || singleQuoted) {
        // String value
        attributes[name] = doubleQuoted || singleQuoted;
      } else {
        // Boolean attribute
        attributes[name] = true;
      }
    }

    return attributes;
  }

  /**
   * Parse JSX children
   */
  parseJSXChildren(content) {
    const children = [];
    content = content.trim();
    
    if (!content) return children;

    // Split by top-level JSX elements
    const elements = this.splitJSXElements(content);
    
    elements.forEach(element => {
      const child = this.parseJSXElement(element);
      if (child) children.push(child);
    });

    return children;
  }

  /**
   * Split JSX content into individual elements
   */
  splitJSXElements(content) {
    const elements = [];
    let depth = 0;
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
      } else if (!inString) {
        if (char === '<' && content[i + 1] !== '/') {
          depth++;
        } else if (char === '<' && content[i + 1] === '/') {
          depth--;
        }
      }

      current += char;

      if (depth === 0 && current.trim()) {
        elements.push(current.trim());
        current = '';
      }
    }

    if (current.trim()) {
      elements.push(current.trim());
    }

    return elements;
  }

  /**
   * Convert React imports to manifest imports
   */
  convertImports(reactImports) {
    const manifestImports = {};

    if (reactImports.scripts.length > 0) {
      manifestImports.scripts = reactImports.scripts.filter(script => 
        !script.includes('react') && !script.includes('prop-types')
      );
    }

    if (reactImports.styles.length > 0) {
      manifestImports.styles = reactImports.styles;
    }

    if (reactImports.components.length > 0) {
      manifestImports.modules = reactImports.components.map(comp => ({
        url: comp.replace(/\.(jsx?|tsx?)$/, '.yaml'),
        alias: this.extractComponentAlias(comp),
        type: 'component'
      }));
    }

    return manifestImports;
  }

  /**
   * Convert React styles to manifest styles
   */
  convertStyles(reactStyles) {
    // This would handle styled-components, CSS modules, etc.
    const manifestStyles = {};

    // Extract CSS-in-JS styles
    Object.entries(reactStyles || {}).forEach(([name, style]) => {
      manifestStyles[this.camelToKebab(name)] = this.convertStyleObject(style);
    });

    return manifestStyles;
  }

  /**
   * Convert JSX to manifest structure
   */
  convertJSXToStructure(jsx) {
    if (!jsx) return {};
    
    return jsx;
  }

  /**
   * Convert event handlers
   */
  convertEventHandlers(handlers) {
    const interactions = {};

    Object.entries(handlers || {}).forEach(([name, handler]) => {
      interactions[name] = {
        type: 'javascript',
        code: handler.code || handler
      };
    });

    return interactions;
  }

  /**
   * Extract React hooks
   */
  extractHooks(code) {
    const hooks = [];
    const hookRegex = /use[A-Z]\w*\(/g;
    let match;

    while ((match = hookRegex.exec(code)) !== null) {
      const hookName = match[0].slice(0, -1); // Remove opening parenthesis
      if (!hooks.includes(hookName)) {
        hooks.push(hookName);
      }
    }

    return hooks;
  }

  /**
   * Extract event handlers from React code
   */
  extractEventHandlers(code) {
    const handlers = {};
    
    // Find function declarations
    const functionRegex = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{([^}]+)}/g;
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      const [, name, body] = match;
      if (name.startsWith('handle') || name.includes('Click') || name.includes('Change')) {
        handlers[name] = {
          type: 'javascript',
          code: `function ${name}() { ${body} }`
        };
      }
    }

    return handlers;
  }

  /**
   * Utility methods
   */
  camelToKebab(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  extractComponentAlias(path) {
    const filename = path.split('/').pop();
    return filename.replace(/\.(jsx?|tsx?)$/, '');
  }

  convertStyleObject(styleObj) {
    const converted = {};
    Object.entries(styleObj).forEach(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      converted[cssKey] = value;
    });
    return converted;
  }

  async loadFile(filePath) {
    if (typeof window !== 'undefined') {
      const response = await fetch(filePath);
      return await response.text();
    } else {
      const fs = require('fs').promises;
      return await fs.readFile(filePath, 'utf8');
    }
  }

  extractPropComment(code, propName) {
    // Extract JSDoc comments for props
    const commentRegex = new RegExp(`\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*${propName}`, 'g');
    const match = commentRegex.exec(code);
    return match ? match[1].replace(/\*/g, '').trim() : '';
  }

  parseFragment(fragmentString) {
    // Handle React fragments
    const content = fragmentString.replace(/^<(?:>|React\.Fragment[^>]*>)/, '')
                                 .replace(/<\/(?:>|React\.Fragment)>$/, '');
    
    return {
      fragment: {
        children: this.parseJSXChildren(content)
      }
    };
  }
}

// Export for both environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReactToManifestConverter;
} else if (typeof window !== 'undefined') {
  window.ReactToManifestConverter = ReactToManifestConverter;
}
