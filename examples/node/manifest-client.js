/**
 * Node.js Client for Modular YAML Manifest System
 * Demonstrates integration with the manifest server API
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class ManifestClient {
    constructor(serverUrl = 'http://localhost:3009', timeout = 30000) {
        this.serverUrl = serverUrl.replace(/\/$/, '');
        this.client = axios.create({
            baseURL: this.serverUrl,
            timeout: timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Check if the manifest server is running
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * Load manifest from file or URL
     */
    async loadManifest(filePath) {
        try {
            let manifestData;
            
            if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
                // Load from URL
                const response = await this.client.post('/api/load/url', {
                    url: filePath
                });
                return response.data;
            } else {
                // Load from file
                const manifestContent = await fs.readFile(filePath, 'utf8');
                const response = await this.client.post('/api/load/manifest', manifestContent, {
                    headers: { 'Content-Type': 'text/yaml' }
                });
                return response.data;
            }
        } catch (error) {
            console.error(`Error loading manifest: ${error.message}`);
            return {};
        }
    }

    /**
     * Convert manifest to specified format
     */
    async convertToFormat(manifestData, format) {
        try {
            const response = await this.client.post(`/api/convert/manifest-to-${format}`, manifestData);
            return response.data;
        } catch (error) {
            console.error(`Error converting to ${format}: ${error.message}`);
            return '';
        }
    }

    /**
     * Convert URL content to manifest
     */
    async convertUrlToManifest(url) {
        try {
            const response = await this.client.post('/api/convert/url-to-manifest', { url });
            return response.data;
        } catch (error) {
            console.error(`Error converting URL to manifest: ${error.message}`);
            return {};
        }
    }

    /**
     * Validate manifest structure
     */
    async validateManifest(manifestData) {
        try {
            const response = await this.client.post('/api/validate', manifestData);
            return response.data;
        } catch (error) {
            console.error(`Error validating manifest: ${error.message}`);
            return { valid: false, errors: [error.message] };
        }
    }

    /**
     * Convert manifest to all formats and save to output directory
     */
    async batchConvert(manifestData, outputDir) {
        const formats = ['html', 'react', 'vue', 'php'];
        
        // Create output directory if it doesn't exist
        await fs.mkdir(outputDir, { recursive: true });
        
        for (const format of formats) {
            console.log(`Converting to ${format}...`);
            const content = await this.convertToFormat(manifestData, format);
            
            if (content) {
                const fileExt = format === 'react' ? 'jsx' : format;
                const outputFile = path.join(outputDir, `output.${fileExt}`);
                
                try {
                    await fs.writeFile(outputFile, content);
                    console.log(`✅ Saved: ${outputFile}`);
                } catch (error) {
                    console.log(`❌ Failed to save: ${outputFile}`);
                }
            } else {
                console.log(`❌ Failed to convert to ${format}`);
            }
        }
    }

    /**
     * Create a dynamic manifest structure
     */
    createDynamicManifest(data = {}) {
        return {
            metadata: {
                title: data.title || 'Node.js Generated Page',
                description: data.description || 'Page created dynamically from Node.js'
            },
            styles: {
                container: 'max-width: 800px; margin: 0 auto; padding: 20px;',
                header: 'background: #68C242; color: white; padding: 20px; border-radius: 8px;',
                content: 'margin: 20px 0; line-height: 1.6;',
                grid: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;',
                card: 'background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #68C242;',
                footer: 'background: #e9ecef; padding: 10px; margin-top: 20px; border-radius: 4px; text-align: center;'
            },
            structure: {
                div: {
                    style: 'container',
                    children: [
                        {
                            h1: {
                                style: 'header',
                                text: data.title || 'Node.js Integration Example'
                            }
                        },
                        {
                            div: {
                                style: 'content',
                                children: data.content || [
                                    {
                                        p: {
                                            text: 'This page was generated dynamically using Node.js and the Modular YAML Manifest System!'
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            div: {
                                style: 'grid',
                                children: this.createInfoCards()
                            }
                        },
                        {
                            footer: {
                                style: 'footer',
                                text: `Generated at ${new Date().toISOString()}`
                            }
                        }
                    ]
                }
            }
        };
    }

    /**
     * Create information cards for Node.js environment
     */
    createInfoCards() {
        return [
            {
                div: {
                    style: 'card',
                    children: [
                        { h3: { text: 'Node.js Version' } },
                        { p: { text: process.version } }
                    ]
                }
            },
            {
                div: {
                    style: 'card',
                    children: [
                        { h3: { text: 'Platform' } },
                        { p: { text: `${process.platform} ${process.arch}` } }
                    ]
                }
            },
            {
                div: {
                    style: 'card',
                    children: [
                        { h3: { text: 'Memory Usage' } },
                        { p: { text: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB` } }
                    ]
                }
            },
            {
                div: {
                    style: 'card',
                    children: [
                        { h3: { text: 'Uptime' } },
                        { p: { text: `${Math.round(process.uptime())} seconds` } }
                    ]
                }
            }
        ];
    }

    /**
     * Watch a manifest file for changes and auto-convert
     */
    async watchManifest(filePath, outputDir, formats = ['html']) {
        console.log(`👀 Watching ${filePath} for changes...`);
        
        const watcher = fs.watch(filePath, async (eventType) => {
            if (eventType === 'change') {
                console.log(`📝 ${filePath} changed, converting...`);
                
                try {
                    const manifest = await this.loadManifest(filePath);
                    if (manifest && Object.keys(manifest).length > 0) {
                        for (const format of formats) {
                            const content = await this.convertToFormat(manifest, format);
                            if (content) {
                                const fileExt = format === 'react' ? 'jsx' : format;
                                const outputFile = path.join(outputDir, `${path.basename(filePath, '.yaml')}.${fileExt}`);
                                await fs.writeFile(outputFile, content);
                                console.log(`✅ Auto-converted: ${outputFile}`);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`❌ Auto-conversion failed: ${error.message}`);
                }
            }
        });

        return watcher;
    }
}

/**
 * Example usage of the ManifestClient
 */
async function main() {
    const client = new ManifestClient();
    
    // Check server health
    if (!(await client.healthCheck())) {
        console.log('❌ Manifest server is not running!');
        console.log('Start it with: npm start');
        return;
    }
    
    console.log('✅ Connected to manifest server');
    
    // Example 1: Load and convert local manifest
    const manifestFile = '../../manifests/examples/complete-page.yaml';
    try {
        await fs.access(manifestFile);
        console.log(`\n📄 Loading manifest: ${manifestFile}`);
        const manifest = await client.loadManifest(manifestFile);
        
        if (manifest && Object.keys(manifest).length > 0) {
            // Validate manifest
            const validation = await client.validateManifest(manifest);
            if (validation.valid) {
                console.log('✅ Manifest is valid');
                
                // Convert to all formats
                await client.batchConvert(manifest, './output');
            } else {
                console.log('❌ Manifest validation failed:');
                validation.errors.forEach(error => console.log(`  - ${error}`));
            }
        }
    } catch (error) {
        console.log(`⚠️ Could not load ${manifestFile}: ${error.message}`);
    }
    
    // Example 2: Convert URL to manifest
    console.log('\n🌐 Converting URL to manifest...');
    const urlManifest = await client.convertUrlToManifest('https://example.com');
    if (urlManifest && Object.keys(urlManifest).length > 0) {
        console.log('✅ URL converted to manifest');
        console.log(`Structure: ${Object.keys(urlManifest).join(', ')}`);
    }
    
    // Example 3: Create dynamic manifest
    console.log('\n🔧 Creating dynamic manifest...');
    const dynamicData = {
        title: 'Node.js Generated Dashboard',
        description: 'Dynamic dashboard created with Node.js',
        content: [
            { h2: { text: 'Server Information' } },
            { p: { text: `Node.js Version: ${process.version}` } },
            { p: { text: `Platform: ${process.platform} ${process.arch}` } },
            { p: { text: `Working Directory: ${process.cwd()}` } }
        ]
    };
    
    const dynamicManifest = client.createDynamicManifest(dynamicData);
    
    // Convert dynamic manifest
    const htmlOutput = await client.convertToFormat(dynamicManifest, 'html');
    if (htmlOutput) {
        await fs.mkdir('./output', { recursive: true });
        await fs.writeFile('./output/nodejs-generated.html', htmlOutput);
        console.log('✅ Dynamic manifest converted and saved');
    }
    
    // Example 4: Watch for file changes (commented out for demo)
    // const watcher = await client.watchManifest('./test-manifest.yaml', './output', ['html', 'react']);
    // console.log('👀 File watcher started. Press Ctrl+C to stop.');
}

// Export for use as module
module.exports = ManifestClient;

// Run example if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
