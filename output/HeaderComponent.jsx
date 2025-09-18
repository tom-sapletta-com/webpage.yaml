import React from 'react';

const HeaderComponent = () => {

  return (
    <header className="header-main">
      <nav className="nav-container">
        <a href="/" className="logo"></a>
        <ul className="nav-menu">
          <li>
            <a href="/" className="nav-link"></a>
          </li>
          <li>
            <a href="/about" className="nav-link"></a>
          </li>
          <li>
            <a href="/services" className="nav-link"></a>
          </li>
          <li>
            <a href="/contact" className="nav-link"></a>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default HeaderComponent;