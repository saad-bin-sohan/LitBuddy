import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const DEFAULT_SITE_URL = process.env.REACT_APP_SITE_URL || 'https://litbuddy.vercel.app';
const DEFAULT_IMAGE = `${DEFAULT_SITE_URL}/logo.png`;

function normalizeUrl(base, path) {
  const normalizedBase = String(base || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const normalizedPath = `/${String(path || '/').replace(/^\/+/, '')}`;
  if (normalizedPath === '//') return normalizedBase;
  return `${normalizedBase}${normalizedPath === '/' ? '' : normalizedPath}`;
}

const SeoHead = ({
  title,
  description,
  path,
  type = 'website',
  image = DEFAULT_IMAGE,
  jsonLd,
  keywords,
  noIndex = false,
}) => {
  const location = useLocation();
  const canonical = normalizeUrl(DEFAULT_SITE_URL, path || location.pathname || '/');
  const normalizedTitle = title ? `${title} | LitBuddy` : 'LitBuddy';

  return (
    <Helmet>
      <title>{normalizedTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="LitBuddy" />
      <meta property="og:title" content={normalizedTitle} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={normalizedTitle} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      <meta name="twitter:image" content={image} />

      {Array.isArray(jsonLd)
        ? jsonLd.map((entry, index) => (
            <script key={`jsonld-${index}`} type="application/ld+json">
              {JSON.stringify(entry)}
            </script>
          ))
        : jsonLd
          ? (
            <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            )
          : null}
    </Helmet>
  );
};

export default SeoHead;
