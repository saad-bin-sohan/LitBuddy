import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { sendFeedback } from '../api/supportApi';
import { LAST_UPDATED, SITE_URL } from './publicConstants';

const initialForm = {
  name: '',
  email: '',
  category: 'product',
  productArea: '',
  subject: '',
  message: '',
  rating: 5,
};

const FeedbackPage = () => {
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const description =
    'Submit structured feedback to the LitBuddy product team and help improve matching, messaging, clubs, and reading tools.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Send Feedback',
    description,
    url: `${SITE_URL}/feedback`,
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const payload = {
        ...form,
        rating: Number.parseInt(form.rating, 10),
        pageUrl: `${window.location.origin}${location.pathname}`,
      };
      const data = await sendFeedback(payload);
      setSuccess(data.message || 'Thank you for your feedback.');
      setForm(initialForm);
    } catch (err) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SeoHead title="Send Feedback" description={description} path="/feedback" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Support"
        title="Send Product Feedback"
        description="Your feedback is reviewed by the LitBuddy team and tracked in our internal product planning workflow to prioritize durable improvements."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'View Help Center', to: '/help' }}
        secondaryAction={{ label: 'Contact Support', to: '/contact' }}
      >
        <PublicSection title="What Feedback Helps Most">
          <div className="public-grid-3">
            <article className="public-card">
              <h3 className="public-card-title">Specific context</h3>
              <p>Include where the issue happened, what you expected, and what actually occurred.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">User impact</h3>
              <p>Explain how the current behavior affects your reading workflow or discussion quality.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Actionable proposals</h3>
              <p>Describe what should change and the expected benefit for readers.</p>
            </article>
          </div>
        </PublicSection>

        <PublicSection title="Submit Feedback">
          {error ? <p className="public-error">{error}</p> : null}
          {success ? <p className="public-success">{success}</p> : null}

          <form className="public-form" onSubmit={onSubmit}>
            <div className="public-grid-2">
              <label className="public-field">
                <span className="public-label">Name</span>
                <input className="public-input" name="name" value={form.name} onChange={onChange} required />
              </label>
              <label className="public-field">
                <span className="public-label">Email</span>
                <input className="public-input" name="email" type="email" value={form.email} onChange={onChange} required />
              </label>
            </div>

            <div className="public-grid-2">
              <label className="public-field">
                <span className="public-label">Feedback type</span>
                <select className="public-select" name="category" value={form.category} onChange={onChange}>
                  <option value="product">Product experience</option>
                  <option value="feature-request">Feature request</option>
                  <option value="performance">Performance</option>
                  <option value="ui-ux">UI and UX</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="public-field">
                <span className="public-label">Area (optional)</span>
                <input
                  className="public-input"
                  name="productArea"
                  value={form.productArea}
                  onChange={onChange}
                  placeholder="matching, chat, clubs, progress"
                />
              </label>
            </div>

            <label className="public-field">
              <span className="public-label">Subject</span>
              <input className="public-input" name="subject" value={form.subject} onChange={onChange} required />
            </label>

            <label className="public-field">
              <span className="public-label">Message</span>
              <textarea className="public-textarea" name="message" value={form.message} onChange={onChange} required />
            </label>

            <label className="public-field">
              <span className="public-label">Overall experience rating</span>
              <select className="public-select" name="rating" value={form.rating} onChange={onChange}>
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Fair</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Very poor</option>
              </select>
            </label>

            <button className="public-submit" type="submit" disabled={busy}>
              {busy ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
          <p className="public-highlight">
            Need urgent help instead of product feedback? Use <Link to="/contact">Contact Us</Link>.
          </p>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default FeedbackPage;
