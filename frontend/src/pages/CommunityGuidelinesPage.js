import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { LAST_UPDATED, SITE_URL } from './publicConstants';

const CommunityGuidelinesPage = () => {
  const description =
    'Official LitBuddy Community Guidelines defining behavior expectations, prohibited conduct, and moderation enforcement standards.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Community Guidelines',
    description,
    url: `${SITE_URL}/guidelines`,
  };

  return (
    <>
      <SeoHead title="Community Guidelines" description={description} path="/guidelines" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Legal"
        title="Community Guidelines"
        description="These guidelines define the conduct standards for all LitBuddy users across matching, private chat, club spaces, and user-generated content."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Report an Issue', to: '/contact' }}
        secondaryAction={{ label: 'Terms of Service', to: '/terms' }}
      >
        <PublicSection title="Core Expectations">
          <ul className="public-list">
            <li>Engage respectfully and keep discussions focused on books, reading, and community learning.</li>
            <li>Protect other users' privacy and avoid sharing personal information without consent.</li>
            <li>Use clear and constructive communication, especially in disagreements.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Prohibited Behavior">
          <ul className="public-list">
            <li>Harassment, threats, intimidation, hateful conduct, or targeted abuse.</li>
            <li>Sexual exploitation, explicit coercive messaging, or predatory behavior.</li>
            <li>Impersonation, fraud, misinformation designed to deceive, or coordinated manipulation.</li>
            <li>Spam, repetitive unsolicited outreach, or malicious external links.</li>
            <li>Content violating intellectual property, privacy, or applicable law.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Reporting and Enforcement">
          <div className="public-grid-2">
            <article className="public-card">
              <h3 className="public-card-title">How to report</h3>
              <p>Use in-platform report flows or submit supporting details via Contact Us for moderation review.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">How actions are applied</h3>
              <p>Actions can include warning, content removal, feature restriction, suspension, or permanent ban.</p>
            </article>
          </div>
          <p className="public-highlight">
            Repeated or severe violations may result in immediate account suspension without prior warning.
          </p>
        </PublicSection>

        <PublicSection title="Appeals and Cooperation">
          <p>
            If you believe an enforcement action was applied incorrectly, submit a clear appeal through <Link to="/contact">Contact Us</Link> with
            relevant context. We review appeals in good faith but reserve final moderation discretion where safety risk exists.
          </p>
        </PublicSection>

        <PublicSection title="Policy Relationship">
          <p>
            These guidelines supplement our <Link to="/terms">Terms of Service</Link>, <Link to="/privacy">Privacy Policy</Link>, and{' '}
            <Link to="/cookies">Cookie Policy</Link>.
          </p>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default CommunityGuidelinesPage;
