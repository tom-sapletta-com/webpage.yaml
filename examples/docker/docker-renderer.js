/**
 * Docker-based Module Renderer for Modular YAML Manifest System
 * Supports local and remote Docker image rendering
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class DockerRenderer {
    constructor(options = {}) {
        this.registry = options.registry || 'docker.io';
        this.namespace = options.namespace || 'modular-yaml';
        this.workingDir = options.workingDir || './docker-workspace';
        this.manifestServerUrl = options.manifestServerUrl || 'http://localhost:3009';
        this.enableCache = options.enableCache !== false;
        this.imageCache = new Map();
    }

    /**
     * Render a manifest using Docker containers
     */
    async renderManifest(manifest, options = {}) {
        try {
            // Ensure working directory exists
            await fs.mkdir(this.workingDir, { recursive: true });

            // Analyze manifest for Docker rendering requirements
            const renderingPlan = await this._analyzeManifest(manifest);
            
            // Execute rendering plan
            const results = await this._executeRenderingPlan(renderingPlan, manifest, options);
            
            return {
                success: true,
                renderedContent: results.content,
                metadata: results.metadata,
                renderingTime: results.renderingTime,
                containersUsed: results.containers
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    }

    /**
     * Analyze manifest to determine Docker rendering requirements
     */
    async _analyzeManifest(manifest) {
        const plan = {
            containers: [],
            dependencies: [],
            renderingSteps: [],
            volumes: [],
            networks: []
        };

        // Check for Docker-specific rendering instructions
        if (manifest.docker_rendering) {
            plan.containers = manifest.docker_rendering.containers || [];
            plan.dependencies = manifest.docker_rendering.dependencies || [];
        }

        // Analyze modules for Docker requirements
        if (manifest.modules) {
            for (const [alias, module] of Object.entries(manifest.modules)) {
                if (module.manifest && module.manifest.docker_config) {
                    const dockerConfig = module.manifest.docker_config;
                    
                    plan.containers.push({
                        name: `${alias}-renderer`,
                        image: dockerConfig.image,
                        tag: dockerConfig.tag || 'latest',
                        environment: dockerConfig.environment || {},
                        volumes: dockerConfig.volumes || [],
                        ports: dockerConfig.ports || [],
                        command: dockerConfig.command,
                        module: alias
                    });
                }
            }
        }

        // Add default rendering containers if none specified
        if (plan.containers.length === 0) {
            plan.containers.push({
                name: 'default-renderer',
                image: `${this.namespace}/manifest-renderer`,
                tag: 'latest',
                environment: {
                    MANIFEST_SERVER_URL: this.manifestServerUrl
                },
                command: ['render', '--format', 'html']
            });
        }

        return plan;
    }

    /**
     * Execute the rendering plan using Docker containers
     */
    async _executeRenderingPlan(plan, manifest, options) {
        const startTime = Date.now();
        const results = {
            content: {},
            metadata: {},
            containers: [],
            renderingTime: 0
        };

        // Create Docker network for containers to communicate
        const networkName = `manifest-render-${Date.now()}`;
        await this._createDockerNetwork(networkName);

        try {
            // Start containers in dependency order
            const runningContainers = [];
            
            for (const container of plan.containers) {
                console.log(`🐳 Starting container: ${container.name}`);
                
                const containerId = await this._startContainer(container, networkName, manifest);
                runningContainers.push({
                    id: containerId,
                    name: container.name,
                    image: `${container.image}:${container.tag}`
                });
                
                // Wait for container to be ready
                await this._waitForContainer(containerId);
                
                // Execute rendering in container
                const renderResult = await this._executeInContainer(containerId, container, manifest);
                
                if (renderResult.success) {
                    results.content[container.module || 'main'] = renderResult.content;
                    results.metadata[container.module || 'main'] = renderResult.metadata;
                }
            }
            
            results.containers = runningContainers;
            
            // Combine results from multiple containers
            if (Object.keys(results.content).length > 1) {
                results.content = await this._combineContainerResults(results.content, manifest);
            }
            
        } finally {
            // Cleanup containers and network
            await this._cleanupContainers(plan.containers);
            await this._cleanupDockerNetwork(networkName);
        }

        results.renderingTime = Date.now() - startTime;
        return results;
    }

    /**
     * Start a Docker container for rendering
     */
    async _startContainer(container, networkName, manifest) {
        const imageName = `${container.image}:${container.tag}`;
        
        // Pull image if not cached
        if (!this.imageCache.has(imageName)) {
            console.log(`📥 Pulling Docker image: ${imageName}`);
            await this._pullDockerImage(imageName);
            this.imageCache.set(imageName, true);
        }

        // Prepare container configuration
        const dockerArgs = [
            'run', '-d',
            '--network', networkName,
            '--name', container.name
        ];

        // Add environment variables
        for (const [key, value] of Object.entries(container.environment || {})) {
            dockerArgs.push('-e', `${key}=${value}`);
        }

        // Add volumes
        for (const volume of container.volumes || []) {
            dockerArgs.push('-v', volume);
        }

        // Add working directory volume
        const workspaceDir = path.join(this.workingDir, container.name);
        await fs.mkdir(workspaceDir, { recursive: true });
        
        // Write manifest to workspace
        const manifestFile = path.join(workspaceDir, 'manifest.yaml');
        await fs.writeFile(manifestFile, yaml.dump(manifest));
        
        dockerArgs.push('-v', `${path.resolve(workspaceDir)}:/workspace`);
        dockerArgs.push('-w', '/workspace');

        // Add image and command
        dockerArgs.push(imageName);
        if (container.command) {
            dockerArgs.push(...container.command);
        }

        return new Promise((resolve, reject) => {
            const docker = spawn('docker', dockerArgs);
            let containerId = '';
            
            docker.stdout.on('data', (data) => {
                containerId += data.toString().trim();
            });
            
            docker.stderr.on('data', (data) => {
                console.error(`Docker error: ${data}`);
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    resolve(containerId);
                } else {
                    reject(new Error(`Failed to start container: ${container.name}`));
                }
            });
        });
    }

    /**
     * Execute rendering command in container
     */
    async _executeInContainer(containerId, container, manifest) {
        const command = container.renderCommand || [
            'node', '-e', `
                const ManifestClient = require('/app/manifest-client');
                const fs = require('fs');
                const client = new ManifestClient('${this.manifestServerUrl}');
                
                (async () => {
                    try {
                        const manifest = JSON.parse(fs.readFileSync('/workspace/manifest.yaml', 'utf8'));
                        const html = await client.convertToFormat(manifest, 'html');
                        console.log(JSON.stringify({
                            success: true,
                            content: html,
                            metadata: { renderedAt: new Date().toISOString() }
                        }));
                    } catch (error) {
                        console.log(JSON.stringify({
                            success: false,
                            error: error.message
                        }));
                    }
                })();
            `
        ];

        return new Promise((resolve, reject) => {
            const dockerExec = spawn('docker', ['exec', containerId, ...command]);
            let output = '';
            let errorOutput = '';
            
            dockerExec.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            dockerExec.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            dockerExec.on('close', (code) => {
                try {
                    if (code === 0 && output.trim()) {
                        const result = JSON.parse(output.trim());
                        resolve(result);
                    } else {
                        resolve({
                            success: false,
                            error: errorOutput || 'Container execution failed',
                            exitCode: code
                        });
                    }
                } catch (error) {
                    resolve({
                        success: false,
                        error: `Failed to parse container output: ${error.message}`,
                        output: output
                    });
                }
            });
        });
    }

    /**
     * Create Docker network for container communication
     */
    async _createDockerNetwork(networkName) {
        return new Promise((resolve, reject) => {
            const docker = spawn('docker', ['network', 'create', networkName]);
            
            docker.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Failed to create Docker network: ${networkName}`));
                }
            });
        });
    }

    /**
     * Pull Docker image
     */
    async _pullDockerImage(imageName) {
        return new Promise((resolve, reject) => {
            const docker = spawn('docker', ['pull', imageName]);
            
            docker.stdout.on('data', (data) => {
                process.stdout.write(data);
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Failed to pull Docker image: ${imageName}`));
                }
            });
        });
    }

    /**
     * Wait for container to be ready
     */
    async _waitForContainer(containerId, timeout = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const result = await this._checkContainerHealth(containerId);
                if (result.running) {
                    return true;
                }
            } catch (error) {
                // Container not ready yet
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error(`Container ${containerId} failed to become ready within ${timeout}ms`);
    }

    /**
     * Check container health
     */
    async _checkContainerHealth(containerId) {
        return new Promise((resolve, reject) => {
            const docker = spawn('docker', ['inspect', containerId]);
            let output = '';
            
            docker.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    try {
                        const inspection = JSON.parse(output);
                        resolve({
                            running: inspection[0].State.Running,
                            status: inspection[0].State.Status
                        });
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error('Failed to inspect container'));
                }
            });
        });
    }

    /**
     * Combine results from multiple containers
     */
    async _combineContainerResults(contentMap, manifest) {
        // Simple combination - in practice, this would be more sophisticated
        const combined = Object.values(contentMap).join('\n\n');
        return combined;
    }

    /**
     * Cleanup containers
     */
    async _cleanupContainers(containers) {
        for (const container of containers) {
            try {
                await this._stopAndRemoveContainer(container.name);
            } catch (error) {
                console.warn(`Failed to cleanup container ${container.name}: ${error.message}`);
            }
        }
    }

    /**
     * Stop and remove container
     */
    async _stopAndRemoveContainer(containerName) {
        return new Promise((resolve) => {
            const docker = spawn('docker', ['rm', '-f', containerName]);
            docker.on('close', () => resolve());
        });
    }

    /**
     * Cleanup Docker network
     */
    async _cleanupDockerNetwork(networkName) {
        return new Promise((resolve) => {
            const docker = spawn('docker', ['network', 'rm', networkName]);
            docker.on('close', () => resolve());
        });
    }

    /**
     * Get available Docker images for rendering
     */
    async getAvailableImages() {
        return new Promise((resolve, reject) => {
            const docker = spawn('docker', ['images', '--format', 'json']);
            let output = '';
            
            docker.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    try {
                        const images = output.trim().split('\n')
                            .filter(line => line.trim())
                            .map(line => JSON.parse(line));
                        resolve(images);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error('Failed to list Docker images'));
                }
            });
        });
    }
}

module.exports = DockerRenderer;
