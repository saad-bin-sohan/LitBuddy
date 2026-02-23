import React from 'react';

const PublicSection = ({ id, title, subtitle, children, className = '' }) => {
  return (
    <section id={id} className={`public-section ${className}`.trim()}>
      {(title || subtitle) && (
        <header className="public-section-header">
          {title ? <h2 className="public-section-title">{title}</h2> : null}
          {subtitle ? <p className="public-section-subtitle">{subtitle}</p> : null}
        </header>
      )}
      <div className="public-section-body">{children}</div>
    </section>
  );
};

export default PublicSection;
