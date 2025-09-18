import React from 'react';

const HeaderComponent = () => {

  return (
    <header className="header-main">
      <nav className="nav-container">
        <a href="/" className="logo">🎯 MyApp</a>
        <ul className="nav-menu">
          <li>
            <a href="/" className="nav-link">Home</a>
          </li>
          <li>
            <a href="/about" className="nav-link">About</a>
          </li>
          <li>
            <a href="/services" className="nav-link">Services</a>
          </li>
          <li>
            <a href="/contact" className="nav-link">Contact</a>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default HeaderComponent;