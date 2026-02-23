import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import {
  COMPANY_NAME,
  REGISTERED_ADDRESS,
  SUPPORT_EMAIL,
  PRESS_EMAIL,
  LAST_UPDATED,
  SITE_URL,
} from './publicConstants';

const AboutPage = () => {
  const seoDescription =
    'Learn about LitBuddy, our mission, platform principles, trust and safety practices, and company information for readers worldwide.';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: COMPANY_NAME,
      url: SITE_URL,
      email: SUPPORT_EMAIL,
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: SUPPORT_EMAIL,
          areaServed: 'Worldwide',
        },
        {
          '@type': 'ContactPoint',
          contactType: 'press',
          email: PRESS_EMAIL,
          areaServed: 'Worldwide',
        },
      ],
      address: {
        '@type': 'PostalAddress',
        addressLocality: REGISTERED_ADDRESS,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'About Us',
      description: seoDescription,
      url: `${SITE_URL}/about`,
    },
  ];

  return (
    <>
      <SeoHead title="About Us" description={seoDescription} path="/about" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Company"
        title="About LitBuddy"
        description="LitBuddy is a reading-first social platform that helps people discover compatible readers, build meaningful conversations, and sustain long-term reading habits through thoughtful community features."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Explore Platform', to: '/suggestions' }}
        secondaryAction={{ label: 'Contact Support', to: '/contact' }}
      >
        <PublicSection title="Our Mission">
          <p>
            LitBuddy exists to make reading more social, intentional, and sustainable. We built the product for readers who want more than
            one-click ratings. Our goal is to help people find reading partners, discuss books with depth, and stay accountable to their reading goals.
          </p>
        </PublicSection>

        <PublicSection title="Product Principles" subtitle="How we make product decisions">
          <div className="public-grid-3">
            <article className="public-card">
              <h3 className="public-card-title">Reader-first utility</h3>
              <p>Every feature should improve discovery, discussion quality, or reading consistency in measurable ways.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Trust and safety by default</h3>
              <p>Reporting, moderation, and account protections are product requirements, not afterthoughts.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Sustainable engagement</h3>
              <p>We prioritize healthy recurring reading behavior over short-term vanity metrics.</p>
            </article>
          </div>
        </PublicSection>

        <PublicSection title="What LitBuddy Offers">
          <ul className="public-list">
            <li>Reader matching based on profile and preference signals.</li>
            <li>Private and group chat built for book-centric conversations.</li>
            <li>Reading progress tracking, goals, challenges, and achievements.</li>
            <li>Book discovery through integrated external book sources.</li>
            <li>Community moderation tools for safety and policy enforcement.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Company Information">
          <div className="public-data-grid">
            <div className="public-data-row">
              <span className="public-data-label">Legal company name</span>
              <span className="public-data-value">{COMPANY_NAME}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Registered business address</span>
              <span className="public-data-value">{REGISTERED_ADDRESS}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Support email</span>
              <span className="public-data-value">{SUPPORT_EMAIL}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Press email</span>
              <span className="public-data-value">{PRESS_EMAIL}</span>
            </div>
          </div>
        </PublicSection>

        <PublicSection title="Related Pages">
          <ul className="public-link-list">
            <li><Link to="/press">Press Kit</Link></li>
            <li><Link to="/careers">Careers</Link></li>
            <li><Link to="/help">Help Center</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
          </ul>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default AboutPage;
