#!/usr/bin/env python3
"""
Python Client for Modular YAML Manifest System
Demonstrates integration with the manifest server API
"""

import requests
import yaml
import json
import os
from typing import Dict, Any, List
from pathlib import Path

class ManifestClient:
    """Client for interacting with the Modular YAML Manifest System"""
    
    def __init__(self, server_url: str = "http://localhost:3009"):
        self.server_url = server_url.rstrip('/')
        self.session = requests.Session()
        
    def health_check(self) -> bool:
        """Check if the manifest server is running"""
        try:
            response = self.session.get(f"{self.server_url}/health")
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def load_manifest(self, file_path: str) -> Dict[str, Any]:
        """Load manifest from file or URL"""
        try:
            if file_path.startswith(('http://', 'https://')):
                # Load from URL - use url-to-manifest converter
                response = self.session.post(
                    f"{self.server_url}/api/convert/url-to-manifest",
                    json={"url": file_path}
                )
            else:
                # Load from file - parse locally and return as dict
                with open(file_path, 'r') as f:
                    manifest_data = yaml.safe_load(f.read())
                return manifest_data
            
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error loading manifest: {e}")
            return {}
    
    def convert_to_format(self, manifest_data: Dict[str, Any], format_type: str) -> str:
        """Convert manifest to specified format (html, react, vue, php)"""
        try:
            # Wrap manifest data in expected format for server API
            request_data = {
                "manifest": manifest_data,
                "options": {}
            }
            response = self.session.post(
                f"{self.server_url}/api/convert/manifest-to-{format_type}",
                json=request_data
            )
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"Error converting to {format_type}: {e}")
            return ""
    
    def convert_url_to_manifest(self, url: str) -> Dict[str, Any]:
        """Convert URL content to manifest"""
        try:
            response = self.session.post(
                f"{self.server_url}/api/convert/url-to-manifest",
                json={"url": url}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error converting URL to manifest: {e}")
            return {}
    
    def validate_manifest(self, manifest_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate manifest structure"""
        try:
            response = self.session.post(
                f"{self.server_url}/api/validate",
                json=manifest_data
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error validating manifest: {e}")
            return {"valid": False, "errors": [str(e)]}
    
    def batch_convert(self, manifest_data: Dict[str, Any], output_dir: str) -> None:
        """Convert manifest to all formats and save to output directory"""
        formats = ['html', 'react', 'vue', 'php']
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        for format_type in formats:
            print(f"Converting to {format_type}...")
            content = self.convert_to_format(manifest_data, format_type)
            
            if content:
                file_ext = 'jsx' if format_type == 'react' else format_type
                output_file = Path(output_dir) / f"output.{file_ext}"
                
                with open(output_file, 'w') as f:
                    f.write(content)
                print(f"✅ Saved: {output_file}")
            else:
                print(f"❌ Failed to convert to {format_type}")


def main():
    """Example usage of the ManifestClient"""
    client = ManifestClient()
    
    # Check server health
    if not client.health_check():
        print("❌ Manifest server is not running!")
        print("Start it with: npm start")
        return
    
    print("✅ Connected to manifest server")
    
    # Example 1: Load and convert local manifest
    manifest_file = "../../manifests/examples/complete-page.yaml"
    if os.path.exists(manifest_file):
        print(f"\n📄 Loading manifest: {manifest_file}")
        manifest = client.load_manifest(manifest_file)
        
        if manifest:
            # Validate manifest
            validation = client.validate_manifest(manifest)
            if validation.get('valid', False):
                print("✅ Manifest is valid")
                
                # Convert to all formats
                client.batch_convert(manifest, "./output")
            else:
                print("❌ Manifest validation failed:")
                for error in validation.get('errors', []):
                    print(f"  - {error}")
    
    # Example 2: Convert URL to manifest
    print("\n🌐 Converting URL to manifest...")
    url_manifest = client.convert_url_to_manifest("https://example.com")
    if url_manifest:
        print("✅ URL converted to manifest")
        print(f"Structure: {list(url_manifest.keys())}")
    
    # Example 3: Create dynamic manifest
    print("\n🔧 Creating dynamic manifest...")
    dynamic_manifest = {
        "metadata": {
            "title": "Python Generated Page",
            "description": "Page created dynamically from Python"
        },
        "styles": {
            "container": "max-width: 800px; margin: 0 auto; padding: 20px;",
            "header": "background: #007acc; color: white; padding: 20px; border-radius: 8px;",
            "content": "margin: 20px 0; line-height: 1.6;"
        },
        "structure": {
            "div": {
                "style": "container",
                "children": [
                    {
                        "h1": {
                            "style": "header",
                            "text": "Python Integration Example"
                        }
                    },
                    {
                        "p": {
                            "style": "content",
                            "text": "This page was generated dynamically using Python and the Modular YAML Manifest System!"
                        }
                    }
                ]
            }
        }
    }
    
    # Convert dynamic manifest
    html_output = client.convert_to_format(dynamic_manifest, 'html')
    if html_output:
        with open('./output/python-generated.html', 'w') as f:
            f.write(html_output)
        print("✅ Dynamic manifest converted and saved")


if __name__ == "__main__":
    main()
