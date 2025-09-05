// frontend/src/components/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiGithub, FiTwitter, FiMail, FiBookOpen, FiUsers, FiMessageSquare, FiShield } from 'react-icons/fi';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="modern-footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-main">
          {/* Brand Section */}
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo.png" alt="LitBuddy Logo" className="footer-logo-image" />
              <div className="footer-logo-text">
                <div className="footer-brand-name">LitBuddy</div>
                <div className="footer-brand-tagline">Developed by Sohan</div>
              </div>
            </div>
            <p className="footer-description">
              Join thousands of readers who are already connecting, sharing, and building meaningful conversations around their favorite books.
            </p>
            <div className="footer-social">
              <a href="https://github.com/saad-bin-sohan" className="social-link" aria-label="GitHub">
                <FiGithub />
              </a>
              <a href="https://twitter.com" className="social-link" aria-label="Twitter">
                <FiTwitter />
              </a>
              <a href="mailto:hello@litbuddy.com" className="social-link" aria-label="Email">
                <FiMail />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-links">
            <div className="footer-section">
              <h3 className="footer-section-title">Platform</h3>
              <ul className="footer-link-list">
                <li><Link to="/suggestions" className="footer-link">Discover Readers</Link></li>
                <li><Link to="/matches" className="footer-link">Find Matches</Link></li>
                <li><Link to="/chats" className="footer-link">Start Chatting</Link></li>
                <li><Link to="/profile-setup" className="footer-link">Create Profile</Link></li>
              </ul>
            </div>

            <div className="footer-section">
              <h3 className="footer-section-title">Support</h3>
              <ul className="footer-link-list">
                <li><Link to="/help" className="footer-link">Help Center</Link></li>
                <li><Link to="/faq" className="footer-link">FAQ</Link></li>
                <li><Link to="/contact" className="footer-link">Contact Us</Link></li>
                <li><Link to="/feedback" className="footer-link">Send Feedback</Link></li>
              </ul>
            </div>

            <div className="footer-section">
              <h3 className="footer-section-title">Company</h3>
              <ul className="footer-link-list">
                <li><Link to="/about" className="footer-link">About Us</Link></li>
                <li><Link to="/blog" className="footer-link">Blog</Link></li>
                <li><Link to="/careers" className="footer-link">Careers</Link></li>
                <li><Link to="/press" className="footer-link">Press Kit</Link></li>
              </ul>
            </div>

            <div className="footer-section">
              <h3 className="footer-section-title">Legal</h3>
              <ul className="footer-link-list">
                <li><Link to="/privacy" className="footer-link">Privacy Policy</Link></li>
                <li><Link to="/terms" className="footer-link">Terms of Service</Link></li>
                <li><Link to="/cookies" className="footer-link">Cookie Policy</Link></li>
                <li><Link to="/guidelines" className="footer-link">Community Guidelines</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="footer-copyright">
              <span>© {currentYear} LitBuddy. All rights reserved.</span>
              <span className="footer-made-with">
                Made with <FiHeart className="heart-icon" /> for readers worldwide
              </span>
            </div>
            
            <div className="footer-stats">
              <div className="stat-item">
                <FiBookOpen className="stat-icon" />
                <span>50K+ Books</span>
              </div>
              <div className="stat-item">
                <FiUsers className="stat-icon" />
                <span>10K+ Readers</span>
              </div>
              <div className="stat-item">
                <FiMessageSquare className="stat-icon" />
                <span>100K+ Messages</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Decoration */}
        <div className="footer-decoration">
          <div className="decoration-line"></div>
          <div className="decoration-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="decoration-line"></div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
