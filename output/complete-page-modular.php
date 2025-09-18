<?php

namespace App\Pages;

class CompletePageExample
{

    public function smoothScroll()
    {
        // javascript interaction
        // TODO: Convert JavaScript to PHP logic
    }

    public function featureCardHover()
    {
        // javascript interaction
        // TODO: Convert JavaScript to PHP logic
    }

    public function render(): string
    {
        $styles = '.body{font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;margin:0;padding:0;line-height:1.6;color:#333;min-height:100vh;display:flex;flex-direction:column}.hero{background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:5rem 2rem;text-align:center}.hero-container{max-width:800px;margin:0 auto}.hero-title{font-size:3.5rem;font-weight:700;margin-bottom:1rem;line-height:1.2}.hero-subtitle{font-size:1.25rem;margin-bottom:2rem;opacity:0.9}.cta-button{background:white;color:#667eea;padding:1rem 2rem;border:none;border-radius:50px;font-size:1.1rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;transition:all 0.3s ease;box-shadow:0 4px 15px rgba(0,0,0,0.2)}.cta-button-hover{background:white;color:#667eea;padding:1rem 2rem;border:none;border-radius:50px;font-size:1.1rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;transition:all 0.3s ease;box-shadow:0 6px 20px rgba(0,0,0,0.3);transform:translateY(-2px)}.features{padding:5rem 2rem;background:#f8fafc}.features-container{max-width:1200px;margin:0 auto}.section-title{text-align:center;font-size:2.5rem;font-weight:600;margin-bottom:3rem;color:#1e293b}.features-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:2rem}.feature-card{background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05);text-align:center;transition:transform 0.3s ease}.feature-card-hover{background:white;padding:2rem;border-radius:12px;box-shadow:0 8px 15px rgba(0,0,0,0.1);text-align:center;transition:transform 0.3s ease;transform:translateY(-5px)}.feature-icon{font-size:3rem;margin-bottom:1rem}.feature-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem;color:#1e293b}.feature-description{color:#64748b;line-height:1.6}.main-content{flex:1;padding:0}';
        $html = '<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Complete Modular Page Example</title><meta name="description" content="Example of a complete webpage built with modular YAML manifests" /></head></html>';
        
        return "<style>$styles</style>$html";
    }
}