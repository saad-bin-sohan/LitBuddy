import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import {
  COMPANY_NAME,
  REGISTERED_ADDRESS,
  LEGAL_EMAIL,
  SUPPORT_EMAIL,
  LAST_UPDATED,
  SITE_URL,
} from './publicConstants';

const PrivacyPolicyPage = () => {
  const description =
    'Official LitBuddy Privacy Policy describing data collection, processing purposes, retention, account rights, and contact details.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy',
    description,
    url: `${SITE_URL}/privacy`,
  };

  return (
    <>
      <SeoHead title="Privacy Policy" description={description} path="/privacy" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Legal"
        title="Privacy Policy"
        description="This policy explains how LitBuddy collects, uses, stores, and protects personal information when you use our platform and related services."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Terms of Service', to: '/terms' }}
        secondaryAction={{ label: 'Cookie Policy', to: '/cookies' }}
      >
        <PublicSection title="Scope and Controller">
          <div className="public-policy-block">
            <p>
              This Privacy Policy applies to the LitBuddy platform, including website and application experiences, communication channels, and support workflows.
            </p>
            <p>
              Data controller: <strong>{COMPANY_NAME}</strong>. Registered business address: <strong>{REGISTERED_ADDRESS}</strong>. Privacy contact:
              <strong> {LEGAL_EMAIL}</strong>.
            </p>
          </div>
        </PublicSection>

        <PublicSection title="Information We Collect">
          <div className="public-policy-block">
            <h3>Account and profile data</h3>
            <p>Name, email, authentication credentials, age, profile preferences, and optional profile content you submit.</p>
          </div>
          <div className="public-policy-block">
            <h3>Usage and interaction data</h3>
            <p>Reading activity, matching interactions, chat metadata, feature usage events, and challenge/achievement progress.</p>
          </div>
          <div className="public-policy-block">
            <h3>Operational and security data</h3>
            <p>Device indicators, IP logs, session information, moderation events, and abuse-prevention signals.</p>
          </div>
        </PublicSection>

        <PublicSection title="Why We Process Data">
          <ul className="public-list">
            <li>Provide core platform functionality such as matching, messaging, and profile services.</li>
            <li>Maintain account security, fraud prevention, and abuse mitigation controls.</li>
            <li>Operate customer support, respond to legal requests, and enforce platform policies.</li>
            <li>Analyze product performance and improve reader experience quality.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Sharing and Disclosures">
          <p>
            LitBuddy does not sell personal information. Data may be shared with service providers that support hosting, communications, analytics,
            and security operations under contractual confidentiality requirements. We may also disclose information when legally required, to protect
            user safety, or to enforce platform rights and policies.
          </p>
        </PublicSection>

        <PublicSection title="Retention">
          <p>
            We retain information only as long as needed for service delivery, legal compliance, dispute resolution, and legitimate operational needs.
            Retention duration varies by data type and policy obligations.
          </p>
        </PublicSection>

        <PublicSection title="Your Rights and Choices">
          <ul className="public-list">
            <li>Access and update profile information through account settings where available.</li>
            <li>Request account assistance, data corrections, or deletion inquiries via support channels.</li>
            <li>Manage cookies and browser storage using browser-level controls.</li>
            <li>Opt out of non-essential communications where supported.</li>
          </ul>
        </PublicSection>

        <PublicSection title="International Processing">
          <p>
            LitBuddy may process information across jurisdictions where our infrastructure or service providers operate. We apply contractual,
            organizational, and technical measures designed to protect transferred data.
          </p>
        </PublicSection>

        <PublicSection title="Contact and Updates">
          <p>
            For privacy-specific inquiries: <strong>{LEGAL_EMAIL}</strong>. For general support: <strong>{SUPPORT_EMAIL}</strong>.
          </p>
          <p>
            Related legal documents: <Link to="/terms">Terms of Service</Link>, <Link to="/cookies">Cookie Policy</Link>, and{' '}
            <Link to="/guidelines">Community Guidelines</Link>.
          </p>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default PrivacyPolicyPage;
