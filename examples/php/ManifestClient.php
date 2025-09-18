<?php
/**
 * PHP Client for Modular YAML Manifest System
 * Demonstrates integration with the manifest server API
 */

class ManifestClient {
    private $serverUrl;
    private $timeout;
    
    public function __construct($serverUrl = 'http://localhost:3009', $timeout = 30) {
        $this->serverUrl = rtrim($serverUrl, '/');
        $this->timeout = $timeout;
    }
    
    /**
     * Check if the manifest server is running
     */
    public function healthCheck(): bool {
        try {
            $response = $this->makeRequest('GET', '/health');
            return $response !== false;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Load manifest from file or URL
     */
    public function loadManifest($filePath): array {
        try {
            if (filter_var($filePath, FILTER_VALIDATE_URL)) {
                // Load from URL
                $response = $this->makeRequest('POST', '/api/load/url', [
                    'url' => $filePath
                ]);
            } else {
                // Load from file
                if (!file_exists($filePath)) {
                    throw new Exception("File not found: $filePath");
                }
                
                $manifestData = file_get_contents($filePath);
                $response = $this->makeRequest('POST', '/api/load/manifest', 
                    $manifestData, ['Content-Type: text/yaml']);
            }
            
            return json_decode($response, true) ?: [];
        } catch (Exception $e) {
            error_log("Error loading manifest: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Convert manifest to specified format
     */
    public function convertToFormat(array $manifestData, string $format): string {
        try {
            $response = $this->makeRequest('POST', "/api/convert/manifest-to-$format", 
                $manifestData);
            return $response ?: '';
        } catch (Exception $e) {
            error_log("Error converting to $format: " . $e->getMessage());
            return '';
        }
    }
    
    /**
     * Convert URL content to manifest
     */
    public function convertUrlToManifest(string $url): array {
        try {
            $response = $this->makeRequest('POST', '/api/convert/url-to-manifest', [
                'url' => $url
            ]);
            return json_decode($response, true) ?: [];
        } catch (Exception $e) {
            error_log("Error converting URL to manifest: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Validate manifest structure
     */
    public function validateManifest(array $manifestData): array {
        try {
            $response = $this->makeRequest('POST', '/api/validate', $manifestData);
            return json_decode($response, true) ?: ['valid' => false, 'errors' => ['Unknown error']];
        } catch (Exception $e) {
            error_log("Error validating manifest: " . $e->getMessage());
            return ['valid' => false, 'errors' => [$e->getMessage()]];
        }
    }
    
    /**
     * Convert manifest to all formats and save to output directory
     */
    public function batchConvert(array $manifestData, string $outputDir): void {
        $formats = ['html', 'react', 'vue', 'php'];
        
        // Create output directory if it doesn't exist
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }
        
        foreach ($formats as $format) {
            echo "Converting to $format...\n";
            $content = $this->convertToFormat($manifestData, $format);
            
            if (!empty($content)) {
                $fileExt = $format === 'react' ? 'jsx' : $format;
                $outputFile = "$outputDir/output.$fileExt";
                
                if (file_put_contents($outputFile, $content)) {
                    echo "✅ Saved: $outputFile\n";
                } else {
                    echo "❌ Failed to save: $outputFile\n";
                }
            } else {
                echo "❌ Failed to convert to $format\n";
            }
        }
    }
    
    /**
     * Create a dynamic manifest structure
     */
    public function createDynamicManifest(array $data): array {
        return [
            'metadata' => [
                'title' => $data['title'] ?? 'PHP Generated Page',
                'description' => $data['description'] ?? 'Page created dynamically from PHP'
            ],
            'styles' => [
                'container' => 'max-width: 800px; margin: 0 auto; padding: 20px;',
                'header' => 'background: #8892BF; color: white; padding: 20px; border-radius: 8px;',
                'content' => 'margin: 20px 0; line-height: 1.6;',
                'footer' => 'background: #f0f0f0; padding: 10px; margin-top: 20px; border-radius: 4px;'
            ],
            'structure' => [
                'div' => [
                    'style' => 'container',
                    'children' => [
                        [
                            'h1' => [
                                'style' => 'header',
                                'text' => $data['title'] ?? 'PHP Integration Example'
                            ]
                        ],
                        [
                            'div' => [
                                'style' => 'content',
                                'children' => $data['content'] ?? [
                                    [
                                        'p' => [
                                            'text' => 'This page was generated dynamically using PHP and the Modular YAML Manifest System!'
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        [
                            'footer' => [
                                'style' => 'footer',
                                'text' => 'Generated at ' . date('Y-m-d H:i:s')
                            ]
                        ]
                    ]
                ]
            ]
        ];
    }
    
    /**
     * Make HTTP request to the manifest server
     */
    private function makeRequest(string $method, string $endpoint, $data = null, array $headers = []): string {
        $url = $this->serverUrl . $endpoint;
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => array_merge([
                'Content-Type: application/json'
            ], $headers)
        ]);
        
        if ($data !== null) {
            if (is_array($data)) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            } else {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            }
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_error($ch)) {
            throw new Exception('cURL error: ' . curl_error($ch));
        }
        
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception("HTTP $httpCode error for $url");
        }
        
        return $response;
    }
}

/**
 * Example usage of the ManifestClient
 */
function main() {
    $client = new ManifestClient();
    
    // Check server health
    if (!$client->healthCheck()) {
        echo "❌ Manifest server is not running!\n";
        echo "Start it with: npm start\n";
        return;
    }
    
    echo "✅ Connected to manifest server\n";
    
    // Example 1: Load and convert local manifest
    $manifestFile = "../../manifests/examples/complete-page.yaml";
    if (file_exists($manifestFile)) {
        echo "\n📄 Loading manifest: $manifestFile\n";
        $manifest = $client->loadManifest($manifestFile);
        
        if (!empty($manifest)) {
            // Validate manifest
            $validation = $client->validateManifest($manifest);
            if ($validation['valid'] ?? false) {
                echo "✅ Manifest is valid\n";
                
                // Convert to all formats
                $client->batchConvert($manifest, "./output");
            } else {
                echo "❌ Manifest validation failed:\n";
                foreach ($validation['errors'] ?? [] as $error) {
                    echo "  - $error\n";
                }
            }
        }
    }
    
    // Example 2: Convert URL to manifest
    echo "\n🌐 Converting URL to manifest...\n";
    $urlManifest = $client->convertUrlToManifest("https://example.com");
    if (!empty($urlManifest)) {
        echo "✅ URL converted to manifest\n";
        echo "Structure: " . implode(", ", array_keys($urlManifest)) . "\n";
    }
    
    // Example 3: Create dynamic manifest
    echo "\n🔧 Creating dynamic manifest...\n";
    $dynamicData = [
        'title' => 'PHP Generated Dashboard',
        'description' => 'Dynamic dashboard created with PHP',
        'content' => [
            [
                'h2' => ['text' => 'Server Information']
            ],
            [
                'p' => ['text' => 'PHP Version: ' . phpversion()]
            ],
            [
                'p' => ['text' => 'Server Time: ' . date('Y-m-d H:i:s')]
            ],
            [
                'p' => ['text' => 'Memory Usage: ' . round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB']
            ]
        ]
    ];
    
    $dynamicManifest = $client->createDynamicManifest($dynamicData);
    
    // Convert dynamic manifest
    $htmlOutput = $client->convertToFormat($dynamicManifest, 'html');
    if (!empty($htmlOutput)) {
        if (!is_dir('./output')) {
            mkdir('./output', 0755, true);
        }
        
        if (file_put_contents('./output/php-generated.html', $htmlOutput)) {
            echo "✅ Dynamic manifest converted and saved\n";
        } else {
            echo "❌ Failed to save dynamic manifest\n";
        }
    }
}

// Run example if this file is executed directly
if (basename(__FILE__) == basename($_SERVER["SCRIPT_NAME"])) {
    main();
}
?>
