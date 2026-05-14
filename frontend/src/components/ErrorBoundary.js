// frontend/src/components/ErrorBoundary.js
//
// Catches JavaScript errors in the React component tree during render,
// in lifecycle methods, and in constructors. Renders a recovery UI instead
// of crashing the entire app to a blank screen.
//
// Usage:
//   <ErrorBoundary fallback={<MyFallback />}>
//     <SomeComponent />
//   </ErrorBoundary>

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log the error — in production you'd send this to a monitoring service
    console.error('[ErrorBoundary] Caught render error:', error, info?.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      // Allow a custom fallback to be passed via props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: '400px' }}>
            This page encountered an unexpected error.
            Try refreshing or going back to the home page.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid currentColor',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--color-charcoal-700)',
                color: 'var(--color-white)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Go to home
            </button>
          </div>
          {/* Show error detail in development only */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '1.5rem', textAlign: 'left', maxWidth: '600px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                Error details (dev only)
              </summary>
              <pre style={{ fontSize: '0.7rem', color: 'var(--color-error)', marginTop: '0.5rem', overflow: 'auto' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
