import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { getCareerBySlug } from '../api/contentApi';
import { LAST_UPDATED, SITE_URL, SUPPORT_EMAIL } from './publicConstants';

const CareerDetailsPage = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getCareerBySlug(slug);
        if (!active) return;
        setRole(data);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load role details');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [slug]);

  const jsonLd = useMemo(() => {
    if (!role) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: role.title,
      description: role.summary,
      datePosted: role.publishedAt || role.createdAt,
      employmentType: role.employmentType,
      jobLocationType: role.workplaceType === 'remote' ? 'TELECOMMUTE' : 'ON_SITE',
      hiringOrganization: {
        '@type': 'Organization',
        name: 'LitBuddy',
        sameAs: SITE_URL,
      },
      applicantLocationRequirements: {
        '@type': 'Country',
        name: 'Bangladesh',
      },
      validThrough: role.status === 'open' ? undefined : new Date().toISOString(),
    };
  }, [role]);

  if (loading) {
    return (
      <PublicPageLayout
        kicker="Careers"
        title="Loading role"
        description="Please wait while we load this role."
        lastUpdated={LAST_UPDATED}
      >
        <p className="public-empty">Loading role details...</p>
      </PublicPageLayout>
    );
  }

  if (error || !role) {
    return (
      <PublicPageLayout
        kicker="Careers"
        title="Role unavailable"
        description="The requested role could not be loaded."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Back to Careers', to: '/careers' }}
      >
        <p className="public-error">{error || 'Role not found'}</p>
      </PublicPageLayout>
    );
  }

  return (
    <>
      <SeoHead
        title={role.seoTitle || role.title}
        description={role.seoDescription || role.summary}
        path={`/careers/${role.slug}`}
        jsonLd={jsonLd}
      />
      <PublicPageLayout
        kicker="Careers"
        title={role.title}
        description={role.summary}
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Back to Careers', to: '/careers' }}
        secondaryAction={{ label: 'Contact Recruiting', to: '/contact' }}
      >
        <PublicSection title="Role Snapshot">
          <div className="public-data-grid">
            <div className="public-data-row">
              <span className="public-data-label">Department</span>
              <span className="public-data-value">{role.department}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Location</span>
              <span className="public-data-value">{role.location}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Employment type</span>
              <span className="public-data-value">{role.employmentType}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Workplace type</span>
              <span className="public-data-value">{role.workplaceType}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Experience level</span>
              <span className="public-data-value">{role.experienceLevel}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Status</span>
              <span className="public-data-value">{role.status}</span>
            </div>
          </div>
        </PublicSection>

        <PublicSection title="Key Responsibilities">
          {role.responsibilities?.length ? (
            <ul className="public-list">
              {role.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="public-empty">Responsibilities will be shared during the interview process.</p>
          )}
        </PublicSection>

        <PublicSection title="Required Qualifications">
          {role.requirements?.length ? (
            <ul className="public-list">
              {role.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="public-empty">Requirements are currently being finalized.</p>
          )}
        </PublicSection>

        <PublicSection title="Nice-to-Have Skills">
          {role.niceToHave?.length ? (
            <ul className="public-list">
              {role.niceToHave.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="public-empty">No additional nice-to-have criteria listed.</p>
          )}
        </PublicSection>

        <PublicSection title="How to Apply">
          <p>
            Send your resume and a concise role-fit summary to <strong>{role.applyEmail || SUPPORT_EMAIL}</strong>. If an external application link is
            provided, use that path first.
          </p>
          {role.applyUrl ? (
            <p className="public-highlight">
              External application link: <a href={role.applyUrl} target="_blank" rel="noopener noreferrer">{role.applyUrl}</a>
            </p>
          ) : null}
          <p>
            By applying, you acknowledge that LitBuddy may review your submitted information for recruiting and evaluation purposes consistent with
            our <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default CareerDetailsPage;
