import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import {
  COMPANY_NAME,
  REGISTERED_ADDRESS,
  SUPPORT_EMAIL,
  LEGAL_EMAIL,
  LAST_UPDATED,
  SITE_URL,
} from './publicConstants';

const TermsPage = () => {
  const description =
    'Official LitBuddy Terms of Service covering account use, conduct rules, moderation, liability, and governing law provisions.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms of Service',
    description,
    url: `${SITE_URL}/terms`,
  };

  return (
    <>
      <SeoHead title="Terms of Service" description={description} path="/terms" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Legal"
        title="Terms of Service"
        description="These Terms govern use of LitBuddy services, including account eligibility, acceptable behavior, enforcement actions, and dispute provisions."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Privacy Policy', to: '/privacy' }}
        secondaryAction={{ label: 'Community Guidelines', to: '/guidelines' }}
      >
        <PublicSection title="Agreement and Eligibility">
          <div className="public-policy-block">
            <p>
              By using LitBuddy, you agree to these Terms and our related policies. You must be at least 18 years old and legally permitted to enter a binding agreement.
            </p>
            <p>
              Service operator: <strong>{COMPANY_NAME}</strong>, registered at <strong>{REGISTERED_ADDRESS}</strong>.
            </p>
          </div>
        </PublicSection>

        <PublicSection title="Accounts and Security">
          <ul className="public-list">
            <li>You are responsible for maintaining accurate account information and safeguarding credentials.</li>
            <li>You may not share accounts or impersonate another person or organization.</li>
            <li>LitBuddy may suspend or restrict access when account misuse or security risk is detected.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Acceptable Use">
          <ul className="public-list">
            <li>Use the platform for lawful, reader-focused interactions consistent with our policies.</li>
            <li>No harassment, threats, hate speech, explicit abuse, impersonation, or deceptive activity.</li>
            <li>No attempts to disrupt service reliability, bypass security, or scrape protected data.</li>
            <li>No posting content that violates intellectual property or privacy rights.</li>
          </ul>
        </PublicSection>

        <PublicSection title="User Content and Platform Rights">
          <p>
            You retain ownership of content you submit. You grant LitBuddy a limited license to host, process, display, and moderate that content solely to operate and improve the service.
          </p>
          <p>
            We may remove content that violates law, policy, or operational safety standards.
          </p>
        </PublicSection>

        <PublicSection title="Moderation and Enforcement">
          <p>
            LitBuddy may investigate reports and apply actions including warnings, content removal, feature restrictions, temporary suspension, or permanent account termination depending on severity and recurrence.
          </p>
        </PublicSection>

        <PublicSection title="Disclaimers and Liability">
          <p>
            Services are provided on an "as available" basis. To the extent permitted by applicable law, LitBuddy disclaims implied warranties and limits liability for indirect, incidental, consequential, or special damages.
          </p>
          <p>
            Nothing in these Terms excludes liability that cannot be lawfully excluded.
          </p>
        </PublicSection>

        <PublicSection title="Governing Law and Disputes">
          <p>
            These Terms are governed by the laws of the United States, without regard to conflict-of-law principles, unless otherwise required by applicable mandatory law.
          </p>
          <p>
            Disputes should first be raised through written notice to <strong>{LEGAL_EMAIL}</strong> for good-faith resolution before formal proceedings.
          </p>
        </PublicSection>

        <PublicSection title="Changes and Contact">
          <p>
            We may update these Terms to reflect legal, security, or product changes. Continued use after updates constitutes acceptance of revised Terms.
          </p>
          <p>
            Questions: <strong>{SUPPORT_EMAIL}</strong> (general) or <strong>{LEGAL_EMAIL}</strong> (legal).
          </p>
          <p>
            Related policies: <Link to="/privacy">Privacy Policy</Link>, <Link to="/cookies">Cookie Policy</Link>, and{' '}
            <Link to="/guidelines">Community Guidelines</Link>.
          </p>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default TermsPage;
