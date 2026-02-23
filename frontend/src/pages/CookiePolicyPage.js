import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { LAST_UPDATED, SITE_URL, SUPPORT_EMAIL, LEGAL_EMAIL } from './publicConstants';

const CookiePolicyPage = () => {
  const description =
    'LitBuddy Cookie Policy describing essential cookies, security session storage, and browser controls for cookie management.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Cookie Policy',
    description,
    url: `${SITE_URL}/cookies`,
  };

  return (
    <>
      <SeoHead title="Cookie Policy" description={description} path="/cookies" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Legal"
        title="Cookie Policy"
        description="This policy explains how LitBuddy uses cookies and similar technologies for authentication, security, and essential functionality."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Privacy Policy', to: '/privacy' }}
        secondaryAction={{ label: 'Terms of Service', to: '/terms' }}
      >
        <PublicSection title="What Are Cookies?">
          <p>
            Cookies are small text files stored by your browser to help websites recognize sessions, maintain preferences, and improve service reliability.
          </p>
        </PublicSection>

        <PublicSection title="How LitBuddy Uses Cookies">
          <div className="public-policy-block">
            <h3>Essential and authentication cookies</h3>
            <p>Used to maintain secure login sessions, protect accounts, and enforce access control rules.</p>
          </div>
          <div className="public-policy-block">
            <h3>Security and abuse prevention</h3>
            <p>Used to detect suspicious behavior, prevent unauthorized activity, and protect platform integrity.</p>
          </div>
          <div className="public-policy-block">
            <h3>Operational performance</h3>
            <p>Used to support reliability diagnostics and service quality improvements.</p>
          </div>
        </PublicSection>

        <PublicSection title="Cookie Categories">
          <div className="public-data-grid">
            <div className="public-data-row">
              <span className="public-data-label">Strictly necessary</span>
              <span className="public-data-value">Required for account login and protected routes</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Security</span>
              <span className="public-data-value">Supports fraud prevention and abuse monitoring</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Functional</span>
              <span className="public-data-value">Helps maintain consistent session behavior</span>
            </div>
          </div>
        </PublicSection>

        <PublicSection title="Managing Cookies">
          <ul className="public-list">
            <li>You can manage or delete cookies through browser privacy settings.</li>
            <li>Disabling essential cookies may prevent login, security checks, or key features from working.</li>
            <li>After changing cookie settings, sign out and sign in again to refresh session state.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Contact and Related Policies">
          <p>
            Cookie and privacy inquiries: <strong>{LEGAL_EMAIL}</strong>. General support: <strong>{SUPPORT_EMAIL}</strong>.
          </p>
          <p>
            See <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms of Service</Link> for related legal details.
          </p>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default CookiePolicyPage;
