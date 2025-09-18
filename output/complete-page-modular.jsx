import React, { useState } from 'react';

const CompletePageExample = () => {


  const smoothScroll = () => {// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

  };

  const featureCardHover = () => {// Add hover effects to feature cards
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-5px)';
    this.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
  });
});

  };


  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8"></meta>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
        <title>Complete Modular Page Example</title>
        <meta name="description" content="Example of a complete webpage built with modular YAML manifests"></meta>
      </head>
      <body className="body">
        <header header={{"style":"header-main","children":{"nav":{"style":"nav-container","children":[{"a":{"href":"/","style":"logo","text":"🎯 MyApp"}},{"ul":{"style":"nav-menu","children":[{"li":{"children":{"a":{"href":"/","style":"nav-link","text":"Home"}}}},{"li":{"children":{"a":{"href":"/about","style":"nav-link","text":"About"}}}},{"li":{"children":{"a":{"href":"/services","style":"nav-link","text":"Services"}}}},{"li":{"children":{"a":{"href":"/contact","style":"nav-link","text":"Contact"}}}}]}}]}}}}></header>
        <main className="main-content">
          <section className="hero">
            <div className="hero-container">
              <h1 className="hero-title">🎯 Modular Web Development</h1>
              <p className="hero-subtitle">Build beautiful, maintainable websites using YAML manifests and modular components</p>
              <a href="#features" className="cta-button">Get Started</a>
            </div>
          </section>
          <section className="features" id="features">
            <div className="features-container">
              <h2 className="section-title">Why Choose Modular Manifests?</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🚀</div>
                  <h3 className="feature-title">Lightning Fast</h3>
                  <p className="feature-description">Generate websites instantly from YAML configurations with zero setup time.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔧</div>
                  <h3 className="feature-title">Highly Configurable</h3>
                  <p className="feature-description">Every aspect can be customized through simple YAML configuration files.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📦</div>
                  <h3 className="feature-title">Modular Components</h3>
                  <p className="feature-description">Reusable components that can be shared across multiple projects and teams.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🌐</div>
                  <h3 className="feature-title">Multi-Format Export</h3>
                  <p className="feature-description">Convert to React, Vue, PHP, or HTML with a single click.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔄</div>
                  <h3 className="feature-title">Live Preview</h3>
                  <p className="feature-description">See your changes in real-time as you edit your YAML manifest.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📱</div>
                  <h3 className="feature-title">Responsive Design</h3>
                  <p className="feature-description">Built-in responsive breakpoints and mobile-first design principles.</p>
                </div>
              </div>
            </div>
          </section>
        </main>
        <footer footer={{"style":"footer-main","children":[{"div":{"style":"footer-container","children":[{"div":{"style":"footer-section","children":[{"h3":{"style":"footer-title","text":"Company"}},{"ul":{"style":"footer-links","children":[{"li":{"children":{"a":{"href":"/about","style":"footer-link","text":"About Us"}}}},{"li":{"children":{"a":{"href":"/careers","style":"footer-link","text":"Careers"}}}},{"li":{"children":{"a":{"href":"/press","style":"footer-link","text":"Press"}}}}]}}]}},{"div":{"style":"footer-section","children":[{"h3":{"style":"footer-title","text":"Support"}},{"ul":{"style":"footer-links","children":[{"li":{"children":{"a":{"href":"/help","style":"footer-link","text":"Help Center"}}}},{"li":{"children":{"a":{"href":"/contact","style":"footer-link","text":"Contact Us"}}}},{"li":{"children":{"a":{"href":"/status","style":"footer-link","text":"Service Status"}}}}]}}]}},{"div":{"style":"footer-section","children":[{"h3":{"style":"footer-title","text":"Legal"}},{"ul":{"style":"footer-links","children":[{"li":{"children":{"a":{"href":"/privacy","style":"footer-link","text":"Privacy Policy"}}}},{"li":{"children":{"a":{"href":"/terms","style":"footer-link","text":"Terms of Service"}}}},{"li":{"children":{"a":{"href":"/cookies","style":"footer-link","text":"Cookie Policy"}}}}]}}]}}]}},{"div":{"style":"footer-bottom","children":{"p":{"text":"© 2024 MyApp. All rights reserved."}}}}]}}></footer>
      </body>
    </html>
  );
};

const styles = `
.body {
  font-family: "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  margin: 0;
  padding: 0;
  line-height: 1.6;
  color: "#333";
  min-height: "100vh";
  display: "flex";
  flex-direction: "column";
}

.hero {
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  color: "white";
  padding: "5rem 2rem";
  text-align: "center";
}

.hero-container {
  max-width: "800px";
  margin: "0 auto";
}

.hero-title {
  font-size: "3.5rem";
  font-weight: 700;
  margin-bottom: "1rem";
  line-height: 1.2;
}

.hero-subtitle {
  font-size: "1.25rem";
  margin-bottom: "2rem";
  opacity: 0.9;
}

.cta-button {
  background: "white";
  color: "#667eea";
  padding: "1rem 2rem";
  border: "none";
  border-radius: "50px";
  font-size: "1.1rem";
  font-weight: 600;
  cursor: "pointer";
  text-decoration: "none";
  display: "inline-block";
  transition: "all 0.3s ease";
  box-shadow: "0 4px 15px rgba(0,0,0,0.2)";
}

.cta-button-hover {
  background: "white";
  color: "#667eea";
  padding: "1rem 2rem";
  border: "none";
  border-radius: "50px";
  font-size: "1.1rem";
  font-weight: 600;
  cursor: "pointer";
  text-decoration: "none";
  display: "inline-block";
  transition: "all 0.3s ease";
  box-shadow: "0 6px 20px rgba(0,0,0,0.3)";
  transform: "translateY(-2px)";
}

.features {
  padding: "5rem 2rem";
  background: "#f8fafc";
}

.features-container {
  max-width: "1200px";
  margin: "0 auto";
}

.section-title {
  text-align: "center";
  font-size: "2.5rem";
  font-weight: 600;
  margin-bottom: "3rem";
  color: "#1e293b";
}

.features-grid {
  display: "grid";
  grid-template-columns: "repeat(auto-fit, minmax(300px, 1fr))";
  gap: "2rem";
}

.feature-card {
  background: "white";
  padding: "2rem";
  border-radius: "12px";
  box-shadow: "0 4px 6px rgba(0,0,0,0.05)";
  text-align: "center";
  transition: "transform 0.3s ease";
}

.feature-card-hover {
  background: "white";
  padding: "2rem";
  border-radius: "12px";
  box-shadow: "0 8px 15px rgba(0,0,0,0.1)";
  text-align: "center";
  transition: "transform 0.3s ease";
  transform: "translateY(-5px)";
}

.feature-icon {
  font-size: "3rem";
  margin-bottom: "1rem";
}

.feature-title {
  font-size: "1.25rem";
  font-weight: 600;
  margin-bottom: "1rem";
  color: "#1e293b";
}

.feature-description {
  color: "#64748b";
  line-height: 1.6;
}

.main-content {
  flex: 1;
  padding: "0";
}
`;

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default CompletePageExample;