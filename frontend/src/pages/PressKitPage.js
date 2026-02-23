import React, { useEffect, useMemo, useState } from 'react';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { getPressResources } from '../api/contentApi';
import {
  COMPANY_NAME,
  REGISTERED_ADDRESS,
  PRESS_EMAIL,
  SUPPORT_EMAIL,
  LAST_UPDATED,
  SITE_URL,
} from './publicConstants';

const PressKitPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resources, setResources] = useState([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getPressResources();
        if (!active) return;
        setResources(data.resources || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load press resources');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  const description =
    'Official LitBuddy press kit with company boilerplate, approved brand assets, media resources, and press contact details.';

  const jsonLd = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: COMPANY_NAME,
        email: PRESS_EMAIL,
        url: SITE_URL,
        address: {
          '@type': 'PostalAddress',
          addressLocality: REGISTERED_ADDRESS,
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Press Kit',
        description,
        url: `${SITE_URL}/press`,
      },
    ],
    [description]
  );

  return (
    <>
      <SeoHead title="Press Kit" description={description} path="/press" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Company"
        title="LitBuddy Press Kit"
        description="Approved company messaging, media assets, and publication references for journalists, partners, and research teams."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'About LitBuddy', to: '/about' }}
        secondaryAction={{ label: 'Contact Team', to: '/contact' }}
      >
        <PublicSection title="Company Boilerplate">
          <p>
            LitBuddy is a reader-focused social platform that helps people discover compatible reading partners, hold meaningful book discussions,
            and maintain consistent reading habits through structured progress and community features.
          </p>
          <p>
            Founded and operated as <strong>{COMPANY_NAME}</strong>, LitBuddy supports a global reader base with product operations aligned to high
            reliability, trust, and moderation standards.
          </p>
        </PublicSection>

        <PublicSection title="Company Facts">
          <div className="public-data-grid">
            <div className="public-data-row">
              <span className="public-data-label">Legal company name</span>
              <span className="public-data-value">{COMPANY_NAME}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Registered address</span>
              <span className="public-data-value">{REGISTERED_ADDRESS}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Press contact</span>
              <span className="public-data-value">{PRESS_EMAIL}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">General support</span>
              <span className="public-data-value">{SUPPORT_EMAIL}</span>
            </div>
          </div>
        </PublicSection>

        <PublicSection title="Press Resources">
          {loading ? <p className="public-empty">Loading press resources...</p> : null}
          {error ? <p className="public-error">{error}</p> : null}

          {!loading && !error && resources.length === 0 ? (
            <p className="public-empty">No press resources are published yet.</p>
          ) : null}

          {!loading && !error && resources.length > 0 ? (
            <div className="public-grid-2">
              {resources.map((resource) => (
                <a
                  key={resource._id}
                  className="press-resource-card"
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <p className="post-meta">{resource.resourceType}</p>
                  <h3>{resource.title}</h3>
                  <p>{resource.description || 'Official LitBuddy press resource.'}</p>
                  {resource.fileSizeLabel ? <p className="post-meta">File size: {resource.fileSizeLabel}</p> : null}
                </a>
              ))}
            </div>
          ) : null}
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default PressKitPage;
