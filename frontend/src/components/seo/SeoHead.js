import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};
const processEnv = typeof process !== 'undefined' ? process.env || {} : {};

const DEFAULT_SITE_URL =
  viteEnv.VITE_SITE_URL || processEnv.REACT_APP_SITE_URL || 'https://litbuddy.vercel.app';
const DEFAULT_IMAGE = `${DEFAULT_SITE_URL}/logo.png`;

function normalizeUrl(base, path) {
  const normalizedBase = String(base || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const normalizedPath = `/${String(path || '/').replace(/^\/+/, '')}`;
  if (normalizedPath === '//') return normalizedBase;
  return `${normalizedBase}${normalizedPath === '/' ? '' : normalizedPath}`;
}

function upsertMeta(attribute, key, content) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector);
  if (!content) {
    if (element) element.remove();
    return;
  }

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', String(content));
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    if (element) element.remove();
    return;
  }

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function upsertJsonLd(jsonLd) {
  const existing = document.head.querySelectorAll('script[data-litbuddy-jsonld="true"]');
  existing.forEach((script) => script.remove());

  if (!jsonLd) return;
  const entries = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  entries.forEach((entry) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.litbuddyJsonld = 'true';
    script.text = JSON.stringify(entry);
    document.head.appendChild(script);
  });
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

  useEffect(() => {
    document.title = normalizedTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', 'LitBuddy');
    upsertMeta('property', 'og:title', normalizedTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', image);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', normalizedTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    upsertJsonLd(jsonLd);
  }, [canonical, description, image, jsonLd, keywords, noIndex, normalizedTitle, type]);

  return null;
};

export default SeoHead;
