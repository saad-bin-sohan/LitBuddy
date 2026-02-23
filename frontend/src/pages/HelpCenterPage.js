import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { LAST_UPDATED, SITE_URL } from './publicConstants';

const HelpCenterPage = () => {
  const description =
    'Get help with account setup, profile completion, matching, chats, clubs, reading progress, and troubleshooting in LitBuddy.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Help Center',
    description,
    url: `${SITE_URL}/help`,
  };

  return (
    <>
      <SeoHead title="Help Center" description={description} path="/help" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Support"
        title="LitBuddy Help Center"
        description="Guidance for setup, matching, messaging, clubs, and account safety. Use this page as the primary support reference before opening a support ticket."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Open Contact Form', to: '/contact' }}
        secondaryAction={{ label: 'Read FAQs', to: '/faq' }}
      >
        <PublicSection title="Account Setup and Profile Completion">
          <ul className="public-list">
            <li>Create an account with a valid email and complete required profile fields.</li>
            <li>Add clear reading preferences to improve match quality and discovery accuracy.</li>
            <li>Use a strong password and keep your recovery email active.</li>
            <li>If profile setup redirects unexpectedly, log out and sign in again to refresh session state.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Matching and Discovery">
          <ul className="public-list">
            <li>Visit Discover Readers to review suggestions generated from profile preferences.</li>
            <li>Use profile quality and stated interests to prioritize stronger matches.</li>
            <li>Keep favorite books and reading preferences up to date for improved recommendations.</li>
            <li>Use reporting tools immediately for inappropriate behavior during matching.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Chats and Clubs">
          <ul className="public-list">
            <li>Use private chat for one-to-one book discussions and club chat for shared reading threads.</li>
            <li>Respect community guidelines in all messages and uploaded content.</li>
            <li>For missing messages, refresh the page and verify network connectivity before retrying.</li>
            <li>For repeated chat delivery issues, include chat ID and timestamps when contacting support.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Reading Progress, Goals, and Challenges">
          <ul className="public-list">
            <li>Add books from search to maintain a structured reading history.</li>
            <li>Update progress consistently to keep achievements and challenge milestones accurate.</li>
            <li>Use monthly or annual goals for realistic pacing and accountability.</li>
          </ul>
        </PublicSection>

        <PublicSection title="Troubleshooting Checklist">
          <div className="public-grid-2">
            <article className="public-card">
              <h3 className="public-card-title">Login issues</h3>
              <p>Confirm credentials, reset password if needed, and verify browser cookie settings are enabled for authentication.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Feature access errors</h3>
              <p>Complete profile setup and refresh session. Some routes require an authenticated user.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Slow loading</h3>
              <p>Check connection stability, then retry. Capture screenshots for reproducible issues.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Report and safety</h3>
              <p>Use in-app reporting immediately and include detailed context for faster moderator review.</p>
            </article>
          </div>
          <p className="public-highlight">
            If this page does not resolve your issue, submit a detailed request via <Link to="/contact">Contact Us</Link>.
          </p>
        </PublicSection>

        <PublicSection title="Related Support Links">
          <ul className="public-link-list">
            <li><Link to="/faq">Frequently Asked Questions</Link></li>
            <li><Link to="/feedback">Send Product Feedback</Link></li>
            <li><Link to="/guidelines">Community Guidelines</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
          </ul>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default HelpCenterPage;
