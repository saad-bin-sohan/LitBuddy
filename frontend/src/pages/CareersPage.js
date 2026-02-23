import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { getCareerOpenings } from '../api/contentApi';
import { LAST_UPDATED, SITE_URL, SUPPORT_EMAIL } from './publicConstants';

const CareersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: '', jobs: [], page: 1, pages: 1 });

  const currentPage = Number.parseInt(searchParams.get('page') || '1', 10) || 1;
  const currentStatus = searchParams.get('status') || 'open';
  const currentSearch = searchParams.get('search') || '';

  useEffect(() => {
    let active = true;

    const run = async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await getCareerOpenings({
          page: currentPage,
          limit: 8,
          status: currentStatus,
          search: currentSearch,
        });
        if (!active) return;
        setState({
          loading: false,
          error: '',
          jobs: data.jobs || [],
          page: data.page || 1,
          pages: data.pages || 1,
        });
      } catch (err) {
        if (!active) return;
        setState({ loading: false, error: err.message || 'Failed to load careers', jobs: [], page: 1, pages: 1 });
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [currentPage, currentStatus, currentSearch]);

  const itemListSchema = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: state.jobs.map((job, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${SITE_URL}/careers/${job.slug}`,
        name: job.title,
      })),
    };
  }, [state.jobs]);

  const description =
    'Explore LitBuddy careers, hiring principles, and open roles across product, engineering, operations, and community functions.';

  const onFilterSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    const status = String(form.get('status') || '').trim();
    const search = String(form.get('search') || '').trim();
    if (status) next.set('status', status);
    if (search) next.set('search', search);
    next.set('page', '1');
    setSearchParams(next);
  };

  const goToPage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  };

  return (
    <>
      <SeoHead
        title="Careers"
        description={description}
        path="/careers"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Careers',
            description,
            url: `${SITE_URL}/careers`,
          },
          itemListSchema,
        ]}
      />
      <PublicPageLayout
        kicker="Company"
        title="Careers at LitBuddy"
        description="We hire people who care deeply about reading communities, high-quality user experience, and durable product systems."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'View Open Roles', to: '/careers?status=open' }}
        secondaryAction={{ label: 'Press Kit', to: '/press' }}
      >
        <PublicSection title="Hiring Principles">
          <div className="public-grid-3">
            <article className="public-card">
              <h3 className="public-card-title">Reader empathy</h3>
              <p>We prioritize candidate judgment on reader experience over short-term feature velocity.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Operational rigor</h3>
              <p>We value engineering and process quality suitable for production-grade social platforms.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Clear ownership</h3>
              <p>Each role has measurable outcomes and accountability across delivery and reliability.</p>
            </article>
          </div>
        </PublicSection>

        <PublicSection title="Search Openings">
          <form className="public-form" onSubmit={onFilterSubmit}>
            <div className="public-grid-2">
              <label className="public-field">
                <span className="public-label">Status</span>
                <select className="public-select" name="status" defaultValue={currentStatus}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="all">All</option>
                </select>
              </label>
              <label className="public-field">
                <span className="public-label">Search</span>
                <input className="public-input" name="search" defaultValue={currentSearch} placeholder="Role, team, location" />
              </label>
            </div>
            <button className="public-submit" type="submit">Apply Filters</button>
          </form>
        </PublicSection>

        <PublicSection title="Current Roles">
          {state.loading ? <p className="public-empty">Loading career openings...</p> : null}
          {state.error ? <p className="public-error">{state.error}</p> : null}

          {!state.loading && !state.error && state.jobs.length === 0 ? (
            <>
              <p className="public-empty">No roles match the selected filters right now.</p>
              <p className="public-highlight">
                You can still share your interest at {SUPPORT_EMAIL} and we will notify you when relevant roles open.
              </p>
            </>
          ) : null}

          {!state.loading && !state.error && state.jobs.length > 0 ? (
            <div className="public-grid-2">
              {state.jobs.map((job) => (
                <Link key={job._id} to={`/careers/${job.slug}`} className="career-list-card">
                  <p className="career-meta">
                    {job.department} • {job.location} • {job.workplaceType}
                  </p>
                  <h3>{job.title}</h3>
                  <p>{job.summary}</p>
                  <div className="public-tags">
                    <span className="public-tag">{job.status}</span>
                    <span className="public-tag">{job.employmentType}</span>
                    <span className="public-tag">{job.experienceLevel}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}

          {state.pages > 1 && !state.loading && !state.error ? (
            <div className="public-actions">
              <button className="public-btn public-btn-secondary" disabled={state.page <= 1} onClick={() => goToPage(state.page - 1)}>
                Previous
              </button>
              <span className="public-meta-chip">Page {state.page} of {state.pages}</span>
              <button className="public-btn public-btn-secondary" disabled={state.page >= state.pages} onClick={() => goToPage(state.page + 1)}>
                Next
              </button>
            </div>
          ) : null}
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default CareersPage;
