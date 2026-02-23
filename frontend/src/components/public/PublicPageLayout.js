import React from 'react';
import { Link } from 'react-router-dom';
import '../../pages/PublicPages.css';

const PublicPageLayout = ({
  kicker,
  title,
  description,
  lastUpdated,
  primaryAction,
  secondaryAction,
  children,
}) => {
  return (
    <div className="public-page">
      <section className="public-hero" aria-labelledby="public-page-title">
        <div className="public-shell">
          {kicker ? <p className="public-kicker">{kicker}</p> : null}
          <h1 id="public-page-title" className="public-title">{title}</h1>
          {description ? <p className="public-description">{description}</p> : null}
          <div className="public-meta-row">
            {lastUpdated ? <span className="public-meta-chip">Last updated: {lastUpdated}</span> : null}
            <span className="public-meta-chip">Official LitBuddy page</span>
          </div>

          {(primaryAction || secondaryAction) && (
            <div className="public-actions">
              {primaryAction ? (
                <Link className="public-btn public-btn-primary" to={primaryAction.to}>
                  {primaryAction.label}
                </Link>
              ) : null}
              {secondaryAction ? (
                <Link className="public-btn public-btn-secondary" to={secondaryAction.to}>
                  {secondaryAction.label}
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <div className="public-shell public-main">{children}</div>
    </div>
  );
};

export default PublicPageLayout;
