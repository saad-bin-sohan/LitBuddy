// frontend/src/components/ReportButton.js
import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FiFlag } from 'react-icons/fi';

/**
 * ReportButton
 * - reportedUserId: string (required to open the report form)
 * - messageId: optional string (when reporting a specific message)
 * - variant: 'icon' | 'text'  (default 'icon')
 * - className: extra classes
 *
 * Behavior: navigates to /report/:userId and passes { messageId } via location.state if provided.
 */
export default function ReportButton({ reportedUserId, messageId, variant = 'icon', className = '', title = 'Report' }) {
  const navigate = useNavigate();

  const onClick = (e) => {
    e.stopPropagation();
    if (!reportedUserId) {
      // graceful fallback
      console.warn('ReportButton clicked without reportedUserId');
      return;
    }
    const path = `/report/${encodeURIComponent(reportedUserId)}`;
    if (messageId) {
      navigate(path, { state: { messageId } });
    } else {
      navigate(path);
    }
  };

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`btn btn-ghost report-button ${className}`}
        aria-label={title}
      >
        <FiFlag style={{ marginRight: 8 }} />
        {title}
      </button>
    );
  }

  // default: compact icon button (use existing .icon-btn style in your app)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`icon-btn report-icon ${className}`}
      title={title}
      aria-label={title}
      onKeyDown={(e)=>{ if(e.key === 'Enter') onClick(e); }}
    >
      <FiFlag />
    </button>
  );
}

ReportButton.propTypes = {
  reportedUserId: PropTypes.string.isRequired,
  messageId: PropTypes.string,
  variant: PropTypes.oneOf(['icon', 'text']),
  className: PropTypes.string,
  title: PropTypes.string,
};
