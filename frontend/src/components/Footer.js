// frontend/src/components/Footer.js
import React from 'react';

const Footer = () => (
  <footer className="app-footer">
    <div className="inner">
      <div>
        <strong>LitBuddy</strong> — built with ❤️ · © {new Date().getFullYear()}
      </div>
      <div className="muted small">
        <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
      </div>
    </div>
  </footer>
);

export default Footer;
