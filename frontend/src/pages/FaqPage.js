import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { LAST_UPDATED } from './publicConstants';

const faqGroups = [
  {
    title: 'Account and Access',
    items: [
      {
        q: 'Do I need to complete profile setup before using LitBuddy features?',
        a: 'Yes. Profile setup is required before accessing protected features like matching and chat.',
      },
      {
        q: 'How do I reset my password?',
        a: 'Use the password reset flow from the login page. A secure reset link is sent to your registered email.',
      },
      {
        q: 'Can I use Google sign-in instead of password login?',
        a: 'Yes. LitBuddy supports Google OAuth for account access where available.',
      },
    ],
  },
  {
    title: 'Matching and Discovery',
    items: [
      {
        q: 'How are reader matches generated?',
        a: 'Matches are based on your profile, declared reading preferences, and reading-related behavior in the platform.',
      },
      {
        q: 'Why are my match suggestions limited?',
        a: 'Suggestions depend on profile completeness, active user availability, and preference overlap quality.',
      },
      {
        q: 'How can I improve match quality?',
        a: 'Add accurate favorite books, update preferences, and keep your profile details current.',
      },
    ],
  },
  {
    title: 'Messaging and Clubs',
    items: [
      {
        q: 'Is one-to-one chat private?',
        a: 'Chats are private to participants, subject to platform monitoring and moderation where policy violations are reported.',
      },
      {
        q: 'Can I create and manage my own club?',
        a: 'Yes. Eligible users can create clubs, manage members, and host book-centered discussions.',
      },
      {
        q: 'What should I do if messages fail to send?',
        a: 'Refresh the page, verify connectivity, then retry. If issues persist, contact support with context and timestamps.',
      },
    ],
  },
  {
    title: 'Safety and Moderation',
    items: [
      {
        q: 'How do I report abusive behavior?',
        a: 'Use the in-app report feature and provide detailed context. Admin moderators review and take action under policy.',
      },
      {
        q: 'Can accounts be suspended?',
        a: 'Yes. Accounts that violate Terms or Community Guidelines may be suspended based on moderation review.',
      },
      {
        q: 'Where can I read community rules?',
        a: 'Community standards are published on the Community Guidelines page.',
      },
    ],
  },
  {
    title: 'Data, Privacy, and Policies',
    items: [
      {
        q: 'What data does LitBuddy collect?',
        a: 'LitBuddy collects account, profile, activity, and operational data as described in the Privacy Policy.',
      },
      {
        q: 'Does LitBuddy use cookies?',
        a: 'Yes. Cookies are used for authentication, security, and essential product functionality.',
      },
      {
        q: 'Where can I review legal policies?',
        a: 'Visit Privacy Policy, Terms of Service, and Cookie Policy for complete policy details.',
      },
    ],
  },
];

const allFaqItems = faqGroups.flatMap((group) => group.items);

const FaqPage = () => {
  const description =
    'Frequently asked questions about LitBuddy account setup, reader matching, messaging, safety moderation, and legal policies.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <>
      <SeoHead title="FAQ" description={description} path="/faq" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Support"
        title="Frequently Asked Questions"
        description="Answers to common operational, policy, and troubleshooting questions for LitBuddy users."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Contact Support', to: '/contact' }}
        secondaryAction={{ label: 'Visit Help Center', to: '/help' }}
      >
        {faqGroups.map((group) => (
          <PublicSection key={group.title} title={group.title}>
            {group.items.map((item) => (
              <article key={item.q} className="public-faq-item">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </PublicSection>
        ))}

        <PublicSection title="Related Resources">
          <ul className="public-link-list">
            <li><Link to="/help">Help Center</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default FaqPage;
