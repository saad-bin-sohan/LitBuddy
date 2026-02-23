import React, { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

/* ─── Scroll-reveal hook ─── */
function useScrollAnimation() {
  const observedRef = useRef(new Set());

  const observe = useCallback((node) => {
    if (!node || observedRef.current.has(node)) return;
    observedRef.current.add(node);
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReduced) {
      observedRef.current.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    observedRef.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return observe;
}

/* ─── Inline SVG icons for features ─── */
const FeatureIcons = {
  smartMatch: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7.5" cy="10" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12.5" cy="10" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 4.5C3 3.67 3.67 3 4.5 3h7c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5H7l-2.5 2V11H4.5C3.67 11 3 10.33 3 9.5v-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 13v1.5c0 .83.67 1.5 1.5 1.5H13l2.5 2V16h.5c.83 0 1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  bookClub: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 14c0-1.66 1.34-3 3-3s3 1.34 3 3v2H7v-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  readingProgress: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="16" height="4" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="8" width="10" height="4" rx="2" fill="currentColor" opacity="0.2" />
      <path d="M12 5v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  challenges: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2l2 4 4.5.7-3.25 3.2.77 4.5L10 12.3 5.98 14.4l.77-4.5L3.5 6.7 8 6l2-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  achievements: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2l1.5 3.1 3.4.5-2.45 2.4.58 3.4L10 9.9 6.97 11.4l.58-3.4L5.1 5.6l3.4-.5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  discovery: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 7v3M8.5 7v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),
  reviews: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 3h9c.55 0 1 .45 1 1v12l-5.5-3L3 16V4c0-.55.45-1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.5 7l.6 1.2 1.3.2-.95.9.22 1.3-1.17-.6-1.17.6.22-1.3-.95-.9 1.3-.2.6-1.2z" fill="currentColor" />
    </svg>
  ),
  safety: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2l6 3v4.5c0 3.5-2.5 6.5-6 7.5-3.5-1-6-4-6-7.5V5l6-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.5 10l1.5 1.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const QuoteIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.7 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.172 0-2.283-.58-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.7 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.172 0-2.283-.58-2.917-1.179z" />
  </svg>
);

/* Arrow icon for CTA button */
const ArrowIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─── Hero Illustration SVG ─── */
const HeroIllustration = () => (
  <svg
    viewBox="0 0 400 380"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    role="img"
  >
    <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
      @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes dash {
        to { stroke-dashoffset: 0; }
      }
      .illus-root { animation: fadeInScale 0.8s ease-out both; }
      .illus-book { animation: float 4s ease-in-out infinite; }
      .illus-dash {
        stroke-dasharray: 120;
        stroke-dashoffset: 120;
        animation: dash 1.5s ease-out 0.4s forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .illus-root, .illus-book, .illus-dash {
          animation: none !important;
        }
        .illus-dash { stroke-dashoffset: 0; }
      }
    `}</style>

    <g className="illus-root">
      {/* Background blobs */}
      <rect x="40" y="60" width="180" height="160" rx="80" fill="rgba(50,184,198,0.08)" />
      <rect x="200" y="140" width="160" height="140" rx="70" fill="rgba(245,158,11,0.06)" />
      <rect x="100" y="200" width="140" height="120" rx="60" fill="rgba(147,51,234,0.05)" />

      {/* Main open book */}
      <g className="illus-book" style={{ transformOrigin: '185px 190px' }}>
        {/* Left page */}
        <path d="M185 150 C185 150, 185 240, 185 240 C185 240, 130 240, 120 238 C110 236, 105 232, 105 228 L105 162 C105 156, 110 152, 120 150 Z" fill="#FCFCF9" stroke="#32B8C6" strokeWidth="1.8" />
        {/* Right page */}
        <path d="M185 150 C185 150, 185 240, 185 240 C185 240, 240 240, 250 238 C260 236, 265 232, 265 228 L265 162 C265 156, 260 152, 250 150 Z" fill="#FCFCF9" stroke="#32B8C6" strokeWidth="1.8" />
        {/* Spine */}
        <path d="M185 148 L185 242" stroke="#32B8C6" strokeWidth="2" />
        {/* Text lines — left page */}
        <line x1="118" y1="170" x2="170" y2="170" stroke="#32B8C6" strokeWidth="0.8" opacity="0.25" />
        <line x1="118" y1="180" x2="165" y2="180" stroke="#32B8C6" strokeWidth="0.8" opacity="0.2" />
        <line x1="118" y1="190" x2="172" y2="190" stroke="#32B8C6" strokeWidth="0.8" opacity="0.25" />
        <line x1="118" y1="200" x2="160" y2="200" stroke="#32B8C6" strokeWidth="0.8" opacity="0.2" />
        <line x1="118" y1="210" x2="168" y2="210" stroke="#32B8C6" strokeWidth="0.8" opacity="0.25" />
        {/* Text lines — right page */}
        <line x1="200" y1="170" x2="252" y2="170" stroke="#32B8C6" strokeWidth="0.8" opacity="0.25" />
        <line x1="200" y1="180" x2="248" y2="180" stroke="#32B8C6" strokeWidth="0.8" opacity="0.2" />
        <line x1="200" y1="190" x2="254" y2="190" stroke="#32B8C6" strokeWidth="0.8" opacity="0.25" />
        <line x1="200" y1="200" x2="242" y2="200" stroke="#32B8C6" strokeWidth="0.8" opacity="0.2" />
        <line x1="200" y1="210" x2="250" y2="210" stroke="#32B8C6" strokeWidth="0.8" opacity="0.25" />
      </g>

      {/* Connection lines to reader nodes */}
      <path className="illus-dash" d="M265 175 C290 165, 310 135, 330 120" stroke="#32B8C6" strokeWidth="1.2" strokeDasharray="4 4" fill="none" opacity="0.5" />
      <path className="illus-dash" d="M265 200 C295 205, 315 235, 340 255" stroke="#32B8C6" strokeWidth="1.2" strokeDasharray="4 4" fill="none" opacity="0.5" />
      <path className="illus-dash" d="M105 180 C80 165, 60 130, 55 105" stroke="#32B8C6" strokeWidth="1.2" strokeDasharray="4 4" fill="none" opacity="0.5" />

      {/* Reader node 1 — top right */}
      <circle cx="335" cy="115" r="12" fill="#32B8C6" opacity="0.15" />
      <circle cx="335" cy="115" r="7" fill="#32B8C6" opacity="0.4" />
      <circle cx="335" cy="115" r="12" stroke="#32B8C6" strokeWidth="1" fill="none" opacity="0.3" />

      {/* Reader node 2 — bottom right */}
      <circle cx="345" cy="260" r="12" fill="#32B8C6" opacity="0.15" />
      <circle cx="345" cy="260" r="7" fill="#32B8C6" opacity="0.4" />
      <circle cx="345" cy="260" r="12" stroke="#32B8C6" strokeWidth="1" fill="none" opacity="0.3" />

      {/* Reader node 3 — top left */}
      <circle cx="50" cy="100" r="12" fill="#32B8C6" opacity="0.15" />
      <circle cx="50" cy="100" r="7" fill="#32B8C6" opacity="0.4" />
      <circle cx="50" cy="100" r="12" stroke="#32B8C6" strokeWidth="1" fill="none" opacity="0.3" />

      {/* Floating book chips */}
      <g transform="translate(80, 280) rotate(-8)">
        <rect width="28" height="48" rx="4" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />
        <line x1="8" y1="14" x2="20" y2="14" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
        <line x1="8" y1="20" x2="18" y2="20" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />
      </g>
      <g transform="translate(290, 60) rotate(12)">
        <rect width="24" height="42" rx="4" fill="rgba(147,51,234,0.12)" stroke="rgba(147,51,234,0.2)" strokeWidth="1" />
        <line x1="7" y1="12" x2="17" y2="12" stroke="rgba(147,51,234,0.3)" strokeWidth="1" />
        <line x1="7" y1="18" x2="15" y2="18" stroke="rgba(147,51,234,0.2)" strokeWidth="1" />
      </g>
      <g transform="translate(310, 310) rotate(-4)">
        <rect width="22" height="38" rx="4" fill="rgba(236,72,153,0.12)" stroke="rgba(236,72,153,0.2)" strokeWidth="1" />
        <line x1="6" y1="11" x2="16" y2="11" stroke="rgba(236,72,153,0.3)" strokeWidth="1" />
        <line x1="6" y1="16" x2="14" y2="16" stroke="rgba(236,72,153,0.2)" strokeWidth="1" />
      </g>

      {/* Sparkle accents — 4-pointed stars */}
      <path d="M320 170 L322 175 L327 177 L322 179 L320 184 L318 179 L313 177 L318 175 Z" fill="#32B8C6" opacity="0.3" />
      <path d="M70 150 L71.5 154 L75.5 155.5 L71.5 157 L70 161 L68.5 157 L64.5 155.5 L68.5 154 Z" fill="#32B8C6" opacity="0.25" />
      <path d="M240 290 L241 293 L244 294 L241 295 L240 298 L239 295 L236 294 L239 293 Z" fill="#32B8C6" opacity="0.2" />
      <path d="M160 80 L161.5 84 L165.5 85.5 L161.5 87 L160 91 L158.5 87 L154.5 85.5 L158.5 84 Z" fill="#32B8C6" opacity="0.3" />
      <path d="M360 190 L361 193 L364 194 L361 195 L360 198 L359 195 L356 194 L359 193 Z" fill="#32B8C6" opacity="0.2" />
    </g>
  </svg>
);

/* ─── Feature data ─── */
const features = [
  {
    key: 'smart-match',
    title: 'Smart Matching',
    desc: 'We analyze your reading history and taste to surface readers you\u2019ll actually click with.',
    icon: FeatureIcons.smartMatch,
    color: 'var(--color-bg-1)',
  },
  {
    key: 'chat',
    title: 'Private Chat',
    desc: '1:1 conversations with pause, resume, and notification controls. Your inbox, your rules.',
    icon: FeatureIcons.chat,
    color: 'var(--color-bg-2)',
  },
  {
    key: 'clubs',
    title: 'Book Clubs',
    desc: 'Create or join clubs around genres, authors, or specific books. With group chat built in.',
    icon: FeatureIcons.bookClub,
    color: 'var(--color-bg-3)',
  },
  {
    key: 'progress',
    title: 'Reading Progress',
    desc: 'Log what you\u2019re reading, track your pace, and see your reading history at a glance.',
    icon: FeatureIcons.readingProgress,
    color: 'var(--color-bg-8)',
  },
  {
    key: 'challenges',
    title: 'Challenges & Goals',
    desc: 'Set annual reading goals, join community challenges, and celebrate every book finished.',
    icon: FeatureIcons.challenges,
    color: 'var(--color-bg-5)',
  },
  {
    key: 'achievements',
    title: 'Achievements',
    desc: 'Earn badges for reading milestones \u2014 from first review to 50-book streaks.',
    icon: FeatureIcons.achievements,
    color: 'var(--color-bg-6)',
  },
  {
    key: 'discovery',
    title: 'Book Discovery',
    desc: 'Search millions of books via Google Books and Goodreads. Add them to your shelf in seconds.',
    icon: FeatureIcons.discovery,
    color: 'var(--color-bg-4)',
  },
  {
    key: 'reviews',
    title: 'Reviews & Ratings',
    desc: 'Write thoughtful reviews, read what your matches think, and discover books through people you trust.',
    icon: FeatureIcons.reviews,
    color: 'var(--color-bg-7)',
  },
  {
    key: 'safety',
    title: 'Safe Community',
    desc: 'Built-in reporting, admin moderation, and safe messaging controls. No wild west.',
    icon: FeatureIcons.safety,
    color: 'var(--color-bg-3)',
  },
];

const testimonials = [
  {
    text: '\u201cFinally, people who actually want to discuss books deeply \u2014 not just post ratings.\u201d',
    author: 'Abdul, Canada',
  },
  {
    text: '\u201cMatched with my reading twin in 3 days. We\u2019ve been chatting ever since.\u201d',
    author: 'Anuradha, India',
  },
  {
    text: '\u201cThe book clubs here feel like real communities, not ghost towns.\u201d',
    author: 'Rhidy, Bangladesh',
  },
];

const steps = [
  {
    num: '1',
    title: 'Create your reading profile',
    desc: 'Tell us what you read, what you love, and what you\u2019re looking for in a reading buddy.',
  },
  {
    num: '2',
    title: 'Get matched',
    desc: 'Our algorithm finds readers whose tastes align with yours. Browse matches and send a connection.',
  },
  {
    num: '3',
    title: 'Start the conversation',
    desc: 'Chat privately, join their book club, or challenge each other to read something new.',
  },
];

/* ─── Component ─── */
const Home = () => {
  const animate = useScrollAnimation();

  return (
    <div className="home-page">
      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-text">
            <div className="home-hero-badge">
              <span className="home-hero-badge-dot" aria-hidden="true" />
              <span>Connecting readers worldwide</span>
            </div>

            <h1 className="home-hero-title">
              Find the readers who actually get you.
            </h1>

            <p className="home-hero-sub">
              LitBuddy matches you with fellow book lovers based on what you
              read, and gives you a real space to talk about it.
            </p>

            <div className="home-hero-actions">
              <Link to="/matches" className="home-btn-primary">
                Find your match
                <ArrowIcon />
              </Link>
              <Link to="/register" className="home-btn-secondary">
                Join free
              </Link>
            </div>

            <div className="home-social-proof">
              <div className="home-avatar-stack">
                <span className="home-avatar home-avatar-1">AK</span>
                <span className="home-avatar home-avatar-2">RP</span>
                <span className="home-avatar home-avatar-3">CL</span>
                <span className="home-avatar home-avatar-4">TM</span>
              </div>
              <span className="home-social-proof-text">
                Joined by readers in 4+ countries
              </span>
            </div>
          </div>

          <div className="home-hero-illustration">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="home-testimonials" ref={animate} data-animate>
        <div className="home-section-inner">
          <div className="home-testimonials-grid" ref={animate} data-animate>
            {testimonials.map((t, i) => (
              <div key={i} className="home-testimonial-card">
                <div className="home-testimonial-quote-icon">
                  <QuoteIcon />
                </div>
                <p className="home-testimonial-text">{t.text}</p>
                <span className="home-testimonial-author">{t.author}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="home-features">
        <div className="home-section-inner">
          <div className="home-section-header" ref={animate} data-animate>
            <h2 className="home-section-title">
              Everything you need to connect over books
            </h2>
            <p className="home-section-subtitle">
              Matching, chatting, tracking, discovering — all in one place built
              for readers.
            </p>
          </div>

          <div className="home-features-grid">
            {features.map((f) => (
              <div
                key={f.key}
                className="home-feature-card"
                ref={animate}
                data-animate
              >
                <div
                  className="home-feature-icon-wrap"
                  style={{ background: f.color }}
                >
                  {f.icon}
                </div>
                <h3 className="home-feature-title">{f.title}</h3>
                <p className="home-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="home-how-it-works" id="how-it-works">
        <div className="home-section-inner">
          <div className="home-section-header" ref={animate} data-animate>
            <h2 className="home-section-title">How it works</h2>
            <p className="home-section-subtitle">
              Three steps from sign-up to your first book conversation.
            </p>
          </div>

          <div className="home-steps">
            {steps.map((s) => (
              <div
                key={s.num}
                className="home-step"
                ref={animate}
                data-animate
              >
                <div className="home-step-indicator">
                  <span className="home-step-line" aria-hidden="true" />
                  <span className="home-step-number">{s.num}</span>
                  <span className="home-step-line" aria-hidden="true" />
                </div>
                <div className="home-step-content">
                  <h3 className="home-step-title">{s.title}</h3>
                  <p className="home-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="home-cta">
        <div className="home-section-inner" ref={animate} data-animate>
          <h2 className="home-cta-title">
            Ready to find your reading community?
          </h2>
          <p className="home-cta-subtitle">
            Hundreds of readers are already matching, chatting, and discovering
            books together. Your next great read — or reading friend — is here.
          </p>
          <div className="home-cta-actions">
            <Link to="/register" className="home-btn-primary">
              Get started free
              <ArrowIcon />
            </Link>
            <a href="#how-it-works" className="home-btn-secondary">
              See how it works
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
