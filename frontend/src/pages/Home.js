// frontend/src/pages/Home.js
import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';

const features = [
  { 
    title: 'Smart Matches', 
    desc: 'Find readers who like the same books and topics.',
    icon: '🎯',
    color: 'var(--color-bg-1)'
  },
  { 
    title: 'Realtime Chat', 
    desc: 'Private chats with message pause, resume & notifications.',
    icon: '💬',
    color: 'var(--color-bg-2)'
  },
  { 
    title: 'Safe Profiles', 
    desc: 'Profiles, reports, and moderation tools.',
    icon: '🛡️',
    color: 'var(--color-bg-3)'
  }
];

const stats = [
  { number: '10K+', label: 'Active Readers' },
  { number: '50K+', label: 'Books Discussed' },
  { number: '100K+', label: 'Messages Sent' }
];

const Home = () => {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="hero-pattern"></div>
        </div>
        
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <div className="hero-badge">
                <span className="badge-icon">📚</span>
                <span>Welcome to LitBuddy</span>
              </div>
              
              <h1 className="hero-title">
                Find readers. Start conversations. 
                <span className="gradient-text"> Build your reading circle.</span>
              </h1>
              
              <p className="hero-description">
                Discover people who care about the same books and ideas. Private chat, 
                safe controls, and simple workflows to connect with fellow book lovers.
              </p>
              
              <div className="hero-actions">
                <Link to="/matches">
                  <Button className="hero-cta">
                    <span>Find matches</span>
                    <span className="arrow">→</span>
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="ghost" className="hero-secondary">
                    Join for free
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="hero-visual">
              <div className="hero-card">
                <div className="card-header">
                  <div className="card-avatar">
                    <span>📖</span>
                  </div>
                  <div className="card-info">
                    <h4>New this week</h4>
                    <p>Recently matched readers around the world</p>
                  </div>
                </div>
                <div className="card-image">
                  <img 
                    alt="Reading together" 
                    src="https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=600&auto=format&fit=crop&crop=faces" 
                  />
                  <div className="image-overlay">
                    <span>Start your journey</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Why choose LitBuddy?</h2>
            <p>Everything you need to connect with fellow book lovers</p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <Card key={feature.title} className="feature-card">
                <div className="feature-icon" style={{backgroundColor: feature.color}}>
                  <span>{feature.icon}</span>
                </div>
                <div className="feature-content">
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to find your reading community?</h2>
            <p>Join thousands of readers who are already connecting and sharing their love for books.</p>
            <div className="cta-actions">
              <Link to="/register">
                <Button className="cta-primary">Get Started</Button>
              </Link>
              <Link to="/matches">
                <Button variant="ghost" className="cta-secondary">Browse Matches</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
