// frontend/src/pages/Home.js
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import ScrollAnimation from '../components/ScrollAnimation';

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
  useEffect(() => {
    // Add entrance animation to the page
    document.body.classList.add('page-loaded');
    return () => {
      document.body.classList.remove('page-loaded');
    };
  }, []);

  return (
    <div className="home-page animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="hero-pattern"></div>
        </div>
        
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <ScrollAnimation animation="fade-in-down" delay={0.1}>
                <div className="hero-badge animate-float">
                  <span className="badge-icon">📚</span>
                  <span>Welcome to LitBuddy</span>
                </div>
              </ScrollAnimation>
              
              <ScrollAnimation animation="fade-in-up" delay={0.2}>
                <h1 className="hero-title">
                  Find readers. Start conversations. 
                  <span className="gradient-text"> Build your reading circle.</span>
                </h1>
              </ScrollAnimation>
              
              <ScrollAnimation animation="fade-in-up" delay={0.3}>
                <p className="hero-description">
                  Discover people who care about the same books and ideas. Private chat, 
                  safe controls, and simple workflows to connect with fellow book lovers.
                </p>
              </ScrollAnimation>
              
              <ScrollAnimation animation="fade-in-up" delay={0.4}>
                <div className="hero-actions">
                  <Link to="/matches">
                    <Button className="hero-cta hover-lift">
                      <span>Find matches</span>
                      <span className="arrow">→</span>
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="ghost" className="hero-secondary hover-lift">
                      Join for free
                    </Button>
                  </Link>
                </div>
              </ScrollAnimation>
            </div>
            
            <ScrollAnimation animation="fade-in-right" delay={0.5}>
              <div className="hero-visual">
                <div className="hero-card hover-lift">
                  <div className="card-header">
                    <div className="card-avatar animate-pulse">
                      <span>📖</span>
                    </div>
                    <div className="card-info">
                      <h4>Find out what others are reading</h4>
                      <p>From Recently matched readers around the world</p>
                    </div>
                  </div>
                  <div className="card-image">
                    <img 
                      alt="Reading together" 
                      src="https://electricliterature.com/wp-content/uploads/2021/11/Best-Book-Cover-Electric-Lit-2021-1.png" 
                    />
                    <div className="image-overlay">
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollAnimation>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <ScrollAnimation key={index} animation="bounce-in" delay={index * 0.1} repeat>
                <div className="stat-item hover-scale">
                  <div className="stat-number animate-pulse">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <ScrollAnimation animation="fade-in-up" delay={0.1} repeat>
            <div className="section-header">
              <h2>Why choose LitBuddy?</h2>
              <p>Everything you need to connect with fellow book lovers</p>
            </div>
          </ScrollAnimation>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <ScrollAnimation key={feature.title} animation="fade-in-up" delay={0.2 + index * 0.1} repeat>
                <Card className="feature-card hover-lift">
                  <div className="feature-icon animate-float" style={{backgroundColor: feature.color}}>
                    <span>{feature.icon}</span>
                  </div>
                  <div className="feature-content">
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                </Card>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <ScrollAnimation animation="fade-in-up" delay={0.1} repeat>
            <div className="cta-content">
              <h2>Ready to find your reading community?</h2>
              <p>Join thousands of readers who are already connecting and sharing their love for books.</p>
              <div className="cta-actions">
                <Link to="/register">
                  <Button className="cta-primary hover-lift">Get Started</Button>
                </Link>
                <Link to="/matches">
                  <Button variant="ghost" className="cta-secondary hover-lift">Browse Matches</Button>
                </Link>
              </div>
            </div>
          </ScrollAnimation>
        </div>
      </section>
    </div>
  );
};

export default Home;
