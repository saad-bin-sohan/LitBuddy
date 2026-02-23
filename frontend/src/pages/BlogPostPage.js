import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { getBlogPostBySlug, getBlogPosts } from '../api/contentApi';
import { LAST_UPDATED, SITE_URL } from './publicConstants';

const BlogPostPage = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const postData = await getBlogPostBySlug(slug);
        const relatedData = await getBlogPosts({ limit: 4, tag: postData.tags?.[0] || '' });
        if (!active) return;
        setPost(postData);
        const filtered = (relatedData.posts || []).filter((item) => item.slug !== postData.slug).slice(0, 3);
        setRelated(filtered);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load blog post');
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
    if (!post) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.seoDescription || post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        '@type': 'Organization',
        name: post.authorName || 'LitBuddy Editorial Team',
      },
      publisher: {
        '@type': 'Organization',
        name: 'LitBuddy',
      },
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    };
  }, [post]);

  if (loading) {
    return (
      <PublicPageLayout
        kicker="Company"
        title="Loading article"
        description="Please wait while we load this article."
        lastUpdated={LAST_UPDATED}
      >
        <p className="public-empty">Loading article...</p>
      </PublicPageLayout>
    );
  }

  if (error || !post) {
    return (
      <PublicPageLayout
        kicker="Company"
        title="Article unavailable"
        description="The requested article could not be loaded."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Back to Blog', to: '/blog' }}
      >
        <p className="public-error">{error || 'Blog post not found'}</p>
      </PublicPageLayout>
    );
  }

  return (
    <>
      <SeoHead
        title={post.seoTitle || post.title}
        description={post.seoDescription || post.excerpt || 'Official LitBuddy blog article.'}
        path={`/blog/${post.slug}`}
        type="article"
        jsonLd={jsonLd}
      />
      <PublicPageLayout
        kicker="Blog"
        title={post.title}
        description={post.excerpt || 'Official LitBuddy publication.'}
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Back to Blog', to: '/blog' }}
        secondaryAction={{ label: 'Explore Careers', to: '/careers' }}
      >
        <PublicSection title="Article Details">
          <p className="post-meta">
            Published: {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Not specified'}
            {post.authorName ? ` • Author: ${post.authorName}` : ''}
          </p>
          <div className="post-content">{post.content}</div>
          {post.tags?.length ? (
            <div className="public-tags">
              {post.tags.map((tag) => (
                <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`} className="public-tag">#{tag}</Link>
              ))}
            </div>
          ) : null}
        </PublicSection>

        <PublicSection title="Continue Reading">
          {related.length === 0 ? (
            <p className="public-empty">No related posts available right now.</p>
          ) : (
            <div className="public-grid-3">
              {related.map((item) => (
                <Link key={item._id} to={`/blog/${item.slug}`} className="post-list-card">
                  <p className="post-meta">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Unscheduled'}</p>
                  <h3>{item.title}</h3>
                  <p>{item.excerpt || 'Read the full article.'}</p>
                </Link>
              ))}
            </div>
          )}
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default BlogPostPage;
