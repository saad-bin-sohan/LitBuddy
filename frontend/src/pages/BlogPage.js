import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { getBlogPosts } from '../api/contentApi';
import { LAST_UPDATED, SITE_URL } from './publicConstants';

const BlogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: '', items: [], page: 1, pages: 1 });

  const currentPage = Number.parseInt(searchParams.get('page') || '1', 10) || 1;
  const currentTag = searchParams.get('tag') || '';
  const currentSearch = searchParams.get('search') || '';

  useEffect(() => {
    let active = true;

    const run = async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await getBlogPosts({ page: currentPage, limit: 9, tag: currentTag, search: currentSearch });
        if (!active) return;
        setState({
          loading: false,
          error: '',
          items: data.posts || [],
          page: data.page || 1,
          pages: data.pages || 1,
        });
      } catch (err) {
        if (!active) return;
        setState({ loading: false, error: err.message || 'Failed to load blog posts', items: [], page: 1, pages: 1 });
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [currentPage, currentTag, currentSearch]);

  const itemListSchema = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: state.items.map((item, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${SITE_URL}/blog/${item.slug}`,
        name: item.title,
      })),
    };
  }, [state.items]);

  const seoDescription =
    'Official LitBuddy blog with product updates, reading community insights, safety notices, and platform guidance for readers.';

  const onFilterSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    const tag = String(form.get('tag') || '').trim();
    const search = String(form.get('search') || '').trim();
    if (tag) next.set('tag', tag);
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
        title="Blog"
        description={seoDescription}
        path="/blog"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'LitBuddy Blog',
            description: seoDescription,
            url: `${SITE_URL}/blog`,
          },
          itemListSchema,
        ]}
      />
      <PublicPageLayout
        kicker="Company"
        title="LitBuddy Blog"
        description="Official updates from LitBuddy on product direction, reading community practices, trust and safety, and platform improvements."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Explore Careers', to: '/careers' }}
        secondaryAction={{ label: 'Press Kit', to: '/press' }}
      >
        <PublicSection title="Search and Filter">
          <form className="public-form" onSubmit={onFilterSubmit}>
            <div className="public-grid-2">
              <label className="public-field">
                <span className="public-label">Tag</span>
                <input className="public-input" name="tag" defaultValue={currentTag} placeholder="Example: product, safety" />
              </label>
              <label className="public-field">
                <span className="public-label">Search</span>
                <input className="public-input" name="search" defaultValue={currentSearch} placeholder="Search title or content" />
              </label>
            </div>
            <button className="public-submit" type="submit">Apply Filters</button>
          </form>
        </PublicSection>

        <PublicSection title="Latest Articles">
          {state.loading ? <p className="public-empty">Loading blog posts...</p> : null}
          {state.error ? <p className="public-error">{state.error}</p> : null}

          {!state.loading && !state.error && state.items.length === 0 ? (
            <p className="public-empty">No blog posts published yet. Please check back soon.</p>
          ) : null}

          {!state.loading && !state.error && state.items.length > 0 ? (
            <div className="public-grid-3">
              {state.items.map((post) => (
                <Link key={post._id} to={`/blog/${post.slug}`} className="post-list-card">
                  <p className="post-meta">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Unscheduled'}
                    {post.authorName ? ` • ${post.authorName}` : ''}
                  </p>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt || 'Read the full article for complete details.'}</p>
                  {post.tags?.length ? (
                    <div className="public-tags">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span key={`${post._id}-${tag}`} className="public-tag">{tag}</span>
                      ))}
                    </div>
                  ) : null}
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

export default BlogPage;
