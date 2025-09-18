/**
 * Multi-Format Converters - Convert manifests to React, Vue, PHP, HTML
 * Supports modular manifests with proper dependency handling
 */

class ManifestToReactConverter {
  constructor(options = {}) {
    this.options = {
      typescript: options.typescript || false,
      includeTypes: options.includeTypes || true,
      exportDefault: options.exportDefault !== false,
      ...options
    };
  }

  /**
   * Convert manifest to React component
   */
  convertToReact(manifest) {
    const componentName = this.getComponentName(manifest);
    const imports = this.generateReactImports(manifest);
    const propTypes = this.generatePropTypes(manifest);
    const component = this.generateReactComponent(manifest, componentName);
    const styles = this.generateReactStyles(manifest);

    return {
      filename: `${componentName}.${this.options.typescript ? 'tsx' : 'jsx'}`,
      content: [
        imports,
        propTypes,
        component,
        styles,
        this.options.exportDefault ? `export default ${componentName};` : ''
      ].filter(Boolean).join('\n\n')
    };
  }

  generateReactImports(manifest) {
    const imports = ['import React from \'react\';'];

    // Add hook imports based on interactions
    const needsState = this.hasInteractions(manifest);
    const needsEffect = this.hasModules(manifest);
    
    if (needsState || needsEffect) {
      const hooks = [];
      if (needsState) hooks.push('useState');
      if (needsEffect) hooks.push('useEffect');
      imports.push(`import React, { ${hooks.join(', ')} } from 'react';`);
      imports.splice(0, 1); // Remove the first React import
    }

    // Add external script imports
    if (manifest.imports?.scripts) {
      manifest.imports.scripts.forEach(script => {
        if (!script.startsWith('http')) {
          const moduleName = this.extractModuleName(script);
          imports.push(`import ${moduleName} from '${script}';`);
        }
      });
    }

    // Add component imports from modules
    if (manifest._resolvedModules) {
      Object.entries(manifest._resolvedModules).forEach(([alias, module]) => {
        const componentName = this.pascalCase(alias);
        imports.push(`import ${componentName} from './${alias}';`);
      });
    }

    return imports.join('\n');
  }

  generatePropTypes(manifest) {
    if (!manifest.props || Object.keys(manifest.props).length === 0) {
      return '';
    }

    const props = Object.entries(manifest.props)
      .map(([name, prop]) => `  ${name}: ${this.convertPropType(prop)}`)
      .join(',\n');

    if (this.options.typescript) {
      return `interface ${this.getComponentName(manifest)}Props {\n${props}\n}`;
    } else {
      return `import PropTypes from 'prop-types';\n\n// PropTypes definition will be added at the end`;
    }
  }

  generateReactComponent(manifest, componentName) {
    const propsParam = manifest.props ? 'props' : '';
    const stateHooks = this.generateStateHooks(manifest);
    const effects = this.generateEffects(manifest);
    const handlers = this.generateEventHandlers(manifest);
    const jsx = this.generateJSX(manifest);

    return `const ${componentName} = (${propsParam}${this.options.typescript ? `: ${componentName}Props` : ''}) => {
${stateHooks}${effects}${handlers}
  return (
${jsx}
  );
};`;
  }

  generateStateHooks(manifest) {
    if (!this.hasInteractions(manifest)) return '';

    // Generate useState hooks based on form inputs or interactive elements
    const hooks = [];
    this.findInteractiveElements(manifest.structure, hooks);
    
    return hooks.map(hook => `  const [${hook.name}, set${this.pascalCase(hook.name)}] = useState(${hook.initial});`).join('\n') + '\n\n';
  }

  generateEffects(manifest) {
    if (!this.hasModules(manifest)) return '';

    return `  useEffect(() => {
    // Module initialization logic
  }, []);\n\n`;
  }

  generateEventHandlers(manifest) {
    if (!manifest.interactions) return '';

    return Object.entries(manifest.interactions)
      .map(([name, handler]) => {
        const code = handler.code.replace(/function\s+\w+\s*\(\s*\)\s*{/, '').replace(/}$/, '');
        return `  const ${name} = () => {${code}\n  };`;
      })
      .join('\n\n') + '\n\n';
  }

  generateJSX(manifest) {
    if (!manifest.structure) return '    <div>No structure defined</div>';

    return this.convertStructureToJSX(manifest.structure, 2);
  }

  convertStructureToJSX(structure, indent = 0) {
    const spaces = '  '.repeat(indent);
    
    if (typeof structure === 'string') {
      return `${spaces}"${structure}"`;
    }

    if (structure.text) {
      return `${spaces}"${structure.text}"`;
    }

    const entries = Object.entries(structure);
    if (entries.length !== 1) {
      // Multiple elements at same level
      return entries.map(([tag, props]) => 
        this.convertElementToJSX(tag, props, indent)
      ).join('\n');
    }

    const [tag, props] = entries[0];
    return this.convertElementToJSX(tag, props, indent);
  }

  convertElementToJSX(tag, props, indent) {
    const spaces = '  '.repeat(indent);
    const Tag = this.isComponent(tag) ? this.pascalCase(tag) : tag;
    
    const attributes = this.convertPropsToJSX(props);
    const children = props.children;
    const textContent = props.text;

    if (!children && !textContent && props._selfClosing) {
      return `${spaces}<${Tag}${attributes} />`;
    }

    if (!children && !textContent) {
      return `${spaces}<${Tag}${attributes}></${Tag}>`;
    }

    let content = '';
    if (textContent) {
      content = textContent;
    }
    
    if (children) {
      const childrenJSX = Array.isArray(children)
        ? children.map(child => this.convertStructureToJSX(child, indent + 1)).join('\n')
        : this.convertStructureToJSX(children, indent + 1);
      
      if (textContent && children) {
        content = `${textContent}\n${childrenJSX}\n${spaces}`;
      } else if (children) {
        content = `\n${childrenJSX}\n${spaces}`;
      }
    }

    return `${spaces}<${Tag}${attributes}>${content}</${Tag}>`;
  }

  convertPropsToJSX(props) {
    const attributes = [];
    
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'children' || key === '_selfClosing' || key === 'text') return;

      if (key === 'style' && typeof value === 'string') {
        attributes.push(`className="${value}"`);
      } else if (key.startsWith('on') && typeof value === 'string') {
        // Event handler
        attributes.push(`${key}={${value}}`);
      } else if (typeof value === 'boolean' && value) {
        attributes.push(key);
      } else if (typeof value === 'string') {
        attributes.push(`${key}="${value}"`);
      } else {
        attributes.push(`${key}={${JSON.stringify(value)}}`);
      }
    });

    return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
  }

  generateReactStyles(manifest) {
    if (!manifest._mergedStyles) return '';

    const cssRules = Object.entries(manifest._mergedStyles)
      .map(([className, styles]) => {
        const cssProps = Object.entries(styles)
          .map(([prop, value]) => `  ${prop}: ${JSON.stringify(value)};`)
          .join('\n');
        return `.${className} {\n${cssProps}\n}`;
      })
      .join('\n\n');

    return `const styles = \`\n${cssRules}\n\`;\n\n// Add styles to document\nif (typeof document !== 'undefined') {\n  const styleSheet = document.createElement('style');\n  styleSheet.textContent = styles;\n  document.head.appendChild(styleSheet);\n}`;
  }

  // Utility methods
  getComponentName(manifest) {
    return manifest.manifest?.name ? this.pascalCase(manifest.manifest.name) : 'Component';
  }

  hasInteractions(manifest) {
    return manifest.interactions && Object.keys(manifest.interactions).length > 0;
  }

  hasModules(manifest) {
    return manifest._resolvedModules && Object.keys(manifest._resolvedModules).length > 0;
  }

  isComponent(tag) {
    return /^[A-Z]/.test(tag);
  }

  pascalCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
              .replace(/^(.)/, (_, c) => c.toUpperCase());
  }

  convertPropType(prop) {
    if (this.options.typescript) {
      return prop.type || 'any';
    } else {
      // Convert to PropTypes
      switch (prop.type) {
        case 'string': return 'PropTypes.string';
        case 'number': return 'PropTypes.number';
        case 'boolean': return 'PropTypes.bool';
        case 'array': return 'PropTypes.array';
        case 'object': return 'PropTypes.object';
        case 'function': return 'PropTypes.func';
        default: return 'PropTypes.any';
      }
    }
  }

  extractModuleName(script) {
    return script.split('/').pop().replace(/\.(js|ts)$/, '');
  }

  findInteractiveElements(structure, hooks, path = []) {
    if (!structure || typeof structure !== 'object') return;

    Object.entries(structure).forEach(([tag, props]) => {
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        const name = props.id || props.name || `${tag}${path.length}`;
        hooks.push({
          name: this.camelCase(name),
          initial: props.type === 'checkbox' ? 'false' : "'"
        });
      }

      if (props.children) {
        if (Array.isArray(props.children)) {
          props.children.forEach((child, index) => {
            this.findInteractiveElements(child, hooks, [...path, index]);
          });
        } else {
          this.findInteractiveElements(props.children, hooks, [...path, 'child']);
        }
      }
    });
  }

  camelCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
  }
}

class ManifestToVueConverter {
  convertToVue(manifest) {
    const componentName = this.getComponentName(manifest);
    const template = this.generateVueTemplate(manifest);
    const script = this.generateVueScript(manifest);
    const style = this.generateVueStyle(manifest);

    return {
      filename: `${componentName}.vue`,
      content: `<template>\n${template}\n</template>\n\n<script>\n${script}\n</script>\n\n<style scoped>\n${style}\n</style>`
    };
  }

  generateVueTemplate(manifest) {
    return this.convertStructureToVue(manifest.structure, 1);
  }

  generateVueScript(manifest) {
    const componentName = this.getComponentName(manifest);
    const props = this.generateVueProps(manifest);
    const data = this.generateVueData(manifest);
    const methods = this.generateVueMethods(manifest);

    return `export default {
  name: '${componentName}',${props}${data}${methods}
};`;
  }

  generateVueStyle(manifest) {
    if (!manifest._mergedStyles) return '';

    return Object.entries(manifest._mergedStyles)
      .map(([className, styles]) => {
        const cssProps = Object.entries(styles)
          .map(([prop, value]) => `  ${prop}: ${value};`)
          .join('\n');
        return `.${className} {\n${cssProps}\n}`;
      })
      .join('\n\n');
  }

  convertStructureToVue(structure, indent = 0) {
    const spaces = '  '.repeat(indent);
    
    if (typeof structure === 'string') {
      return `${spaces}${structure}`;
    }

    if (structure.text) {
      return `${spaces}${structure.text}`;
    }

    const entries = Object.entries(structure);
    const [tag, props] = entries[0];
    
    const attributes = this.convertPropsToVue(props);
    const children = props.children;
    const textContent = props.text;

    // Handle self-closing tags
    const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    
    if (!children && !textContent) {
      if (selfClosingTags.includes(tag)) {
        return `${spaces}<${tag}${attributes} />`;
      } else {
        return `${spaces}<${tag}${attributes}></${tag}>`;
      }
    }

    let content = '';
    if (textContent) {
      content = textContent;
    }
    
    if (children) {
      const childrenVue = Array.isArray(children)
        ? children.map(child => this.convertStructureToVue(child, indent + 1)).join('\n')
        : this.convertStructureToVue(children, indent + 1);
      
      if (textContent && children) {
        content = `${textContent}\n${childrenVue}\n${spaces}`;
      } else if (children) {
        content = `\n${childrenVue}\n${spaces}`;
      }
    }

    return `${spaces}<${tag}${attributes}>${content}</${tag}>`;
  }

  convertPropsToVue(props) {
    const attributes = [];
    
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'children' || key === 'text') return;

      if (key === 'style' && typeof value === 'string') {
        attributes.push(`:class="'${value}'"`);
      } else if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        attributes.push(`@${eventName}="${value}"`);
      } else if (typeof value === 'string') {
        attributes.push(`${key}="${value}"`);
      } else {
        attributes.push(`:${key}="${JSON.stringify(value)}"`);
      }
    });

    return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
  }

  generateVueProps(manifest) {
    if (!manifest.props) return '';

    const props = Object.entries(manifest.props)
      .map(([name, prop]) => {
        return `    ${name}: {
      type: ${this.convertVuePropType(prop.type)},
      required: ${prop.required || false}
    }`;
      })
      .join(',\n');

    return `\n  props: {\n${props}\n  },`;
  }

  generateVueData(manifest) {
    // Generate reactive data based on interactive elements
    return `\n  data() {
    return {
      // Component data
    };
  },`;
  }

  generateVueMethods(manifest) {
    if (!manifest.interactions) return '';

    const methods = Object.entries(manifest.interactions)
      .map(([name, handler]) => {
        const code = handler.code.replace(/function\s+\w+\s*\(\s*\)\s*{/, '').replace(/}$/, '');
        return `    ${name}() {${code}\n    }`;
      })
      .join(',\n');

    return `\n  methods: {\n${methods}\n  }`;
  }

  getComponentName(manifest) {
    return manifest.manifest?.name ? this.pascalCase(manifest.manifest.name) : 'Component';
  }

  pascalCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
              .replace(/^(.)/, (_, c) => c.toUpperCase());
  }

  convertVuePropType(type) {
    switch (type) {
      case 'string': return 'String';
      case 'number': return 'Number';
      case 'boolean': return 'Boolean';
      case 'array': return 'Array';
      case 'object': return 'Object';
      case 'function': return 'Function';
      default: return 'String';
    }
  }
}

class ManifestToPHPConverter {
  convertToPHP(manifest) {
    const className = this.getClassName(manifest);
    const phpClass = this.generatePHPClass(manifest, className);

    return {
      filename: `${className}.php`,
      content: `<?php\n\n${phpClass}`
    };
  }

  generatePHPClass(manifest, className) {
    const namespace = manifest.targets?.php?.namespace || 'App\\Components';
    const properties = this.generatePHPProperties(manifest);
    const constructor = this.generatePHPConstructor(manifest);
    const methods = this.generatePHPMethods(manifest);
    const render = this.generatePHPRender(manifest);

    return `namespace ${namespace};

class ${className}
{${properties}
${constructor}
${methods}
${render}
}`;
  }

  generatePHPProperties(manifest) {
    if (!manifest.props) return '';

    return Object.keys(manifest.props)
      .map(prop => `    private $${prop};`)
      .join('\n') + '\n';
  }

  generatePHPConstructor(manifest) {
    if (!manifest.props) return '';

    const params = Object.entries(manifest.props)
      .map(([name, prop]) => `$${name} = null`)
      .join(', ');

    const assignments = Object.keys(manifest.props)
      .map(prop => `        $this->${prop} = $${prop};`)
      .join('\n');

    return `    public function __construct(${params})
    {
${assignments}
    }\n`;
  }

  generatePHPMethods(manifest) {
    if (!manifest.interactions) return '';

    return Object.entries(manifest.interactions)
      .map(([name, handler]) => {
        return `    public function ${name}()
    {
        // ${handler.type} interaction
        // TODO: Convert JavaScript to PHP logic
    }`;
      })
      .join('\n\n') + '\n';
  }

  generatePHPRender(manifest) {
    const html = this.convertStructureToPHP(manifest.structure);
    const css = this.generatePHPStyles(manifest);

    return `    public function render(): string
    {
        $styles = '${css}';
        $html = '${html}';
        
        return "<style>$styles</style>$html";
    }`;
  }

  convertStructureToPHP(structure) {
    if (typeof structure === 'string') {
      return structure;
    }

    if (structure.text) {
      return structure.text;
    }

    const [tag, props] = Object.entries(structure)[0];
    const attributes = this.convertPropsToPHP(props);
    const children = props.children;
    const textContent = props.text;

    // Handle self-closing tags
    const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    
    if (!children && !textContent) {
      if (selfClosingTags.includes(tag)) {
        return `<${tag}${attributes} />`;
      } else {
        return `<${tag}${attributes}></${tag}>`;
      }
    }

    let content = '';
    if (textContent) {
      content = textContent;
    }
    
    if (children) {
      const childrenHTML = Array.isArray(children)
        ? children.map(child => this.convertStructureToPHP(child)).join('')
        : this.convertStructureToPHP(children);
      
      if (textContent && children) {
        content = `${textContent}${childrenHTML}`;
      } else if (children) {
        content = childrenHTML;
      }
    }

    return `<${tag}${attributes}>${content}</${tag}>`;
  }

  convertPropsToPHP(props) {
    const attributes = [];
    
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'children' || key === 'text') return;

      if (key === 'style') {
        attributes.push(`class="${value}"`);
      } else if (typeof value === 'string') {
        attributes.push(`${key}="${value}"`);
      } else if (typeof value === 'boolean' && value) {
        attributes.push(key);
      }
    });

    return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
  }

  generatePHPStyles(manifest) {
    if (!manifest._mergedStyles) return '';

    return Object.entries(manifest._mergedStyles)
      .map(([className, styles]) => {
        const cssProps = Object.entries(styles)
          .map(([prop, value]) => `${prop}:${value}`)
          .join(';');
        return `.${className}{${cssProps}}`;
      })
      .join('');
  }

  getClassName(manifest) {
    return manifest.manifest?.name ? this.pascalCase(manifest.manifest.name) : 'Component';
  }

  pascalCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
              .replace(/^(.)/, (_, c) => c.toUpperCase());
  }
}

class ManifestToHTMLConverter {
  convertToHTML(manifest) {
    const title = manifest.manifest?.name || 'Generated Page';
    const html = this.generateHTML(manifest);

    return {
      filename: 'index.html',
      content: html
    };
  }

  generateHTML(manifest) {
    const head = this.generateHead(manifest);
    const body = this.generateBody(manifest);
    const scripts = this.generateScripts(manifest);

    return `<!DOCTYPE html>
<html lang="en">
<head>
${head}
</head>
<body>
${body}
${scripts}
</body>
</html>`;
  }

  generateHead(manifest) {
    const title = manifest.manifest?.name || 'Generated Page';
    const styles = this.generateHTMLStyles(manifest);
    const imports = this.generateHTMLImports(manifest);

    return `  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
${styles}${imports}`;
  }

  generateBody(manifest) {
    return this.convertStructureToHTML(manifest.structure, 1);
  }

  generateHTMLStyles(manifest) {
    if (!manifest._mergedStyles) return '';

    const css = Object.entries(manifest._mergedStyles)
      .map(([className, styles]) => {
        const cssProps = Object.entries(styles)
          .map(([prop, value]) => `    ${prop}: ${value};`)
          .join('\n');
        return `  .${className} {\n${cssProps}\n  }`;
      })
      .join('\n');

    return `  <style>\n${css}\n  </style>\n`;
  }

  generateHTMLImports(manifest) {
    let imports = '';

    if (manifest.imports?.styles) {
      imports += manifest.imports.styles
        .map(style => `  <link rel="stylesheet" href="${style}">`)
        .join('\n') + '\n';
    }

    if (manifest.imports?.scripts) {
      imports += manifest.imports.scripts
        .map(script => `  <script src="${script}"></script>`)
        .join('\n') + '\n';
    }

    return imports;
  }

  generateScripts(manifest) {
    if (!manifest.interactions) return '';

    const scripts = Object.entries(manifest.interactions)
      .map(([name, handler]) => handler.code)
      .join('\n\n');

    return `  <script>\n${scripts}\n  </script>`;
  }

  convertStructureToHTML(structure, indent = 0) {
    const spaces = '  '.repeat(indent);
    
    if (typeof structure === 'string') {
      return `${spaces}${structure}`;
    }

    if (structure.text) {
      return `${spaces}${structure.text}`;
    }

    const [tag, props] = Object.entries(structure)[0];
    const attributes = this.convertPropsToHTML(props);
    const children = props.children;
    const textContent = props.text;

    // Handle self-closing tags
    const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    
    if (!children && !textContent) {
      if (selfClosingTags.includes(tag)) {
        return `${spaces}<${tag}${attributes} />`;
      } else {
        return `${spaces}<${tag}${attributes}></${tag}>`;
      }
    }

    let content = '';
    if (textContent) {
      content = textContent;
    }
    
    if (children) {
      let childrenHTML = '';
      
      if (Array.isArray(children)) {
        // Handle array of children
        childrenHTML = children.map(child => this.convertStructureToHTML(child, indent + 1)).join('\n');
      } else if (typeof children === 'object' && children !== null) {
        // Handle single child object or object with multiple children
        if (Object.keys(children).length === 1 && typeof Object.values(children)[0] === 'object') {
          // Single nested child
          childrenHTML = this.convertStructureToHTML(children, indent + 1);
        } else {
          // Object representing a single element structure
          childrenHTML = this.convertStructureToHTML(children, indent + 1);
        }
      } else {
        // Handle primitive children
        childrenHTML = this.convertStructureToHTML(children, indent + 1);
      }
      
      if (textContent && children) {
        content = `\n${spaces}  ${textContent}\n${childrenHTML}\n${spaces}`;
      } else if (children) {
        content = `\n${childrenHTML}\n${spaces}`;
      }
    }

    return `${spaces}<${tag}${attributes}>${content}</${tag}>`;
  }

  convertPropsToHTML(props) {
    const attributes = [];
    
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'children' || key === 'text') return;

      if (key === 'style' && typeof value === 'string') {
        attributes.push(`class="${value}"`);
      } else if (typeof value === 'string') {
        attributes.push(`${key}="${value}"`);
      } else if (typeof value === 'boolean' && value) {
        attributes.push(key);
      }
    });

    return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
  }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ManifestToReactConverter,
    ManifestToVueConverter,
    ManifestToPHPConverter,
    ManifestToHTMLConverter
  };
} else if (typeof window !== 'undefined') {
  window.ManifestToReactConverter = ManifestToReactConverter;
  window.ManifestToVueConverter = ManifestToVueConverter;
  window.ManifestToPHPConverter = ManifestToPHPConverter;
  window.ManifestToHTMLConverter = ManifestToHTMLConverter;
}
