import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PublicPageLayout from '../components/public/PublicPageLayout';
import PublicSection from '../components/public/PublicSection';
import SeoHead from '../components/seo/SeoHead';
import { sendContact } from '../api/supportApi';
import {
  COMPANY_NAME,
  REGISTERED_ADDRESS,
  SUPPORT_EMAIL,
  LEGAL_EMAIL,
  LAST_UPDATED,
  SITE_URL,
} from './publicConstants';

const initialState = {
  name: '',
  email: '',
  category: 'general',
  subject: '',
  message: '',
  productArea: '',
};

const ContactPage = () => {
  const location = useLocation();
  const [form, setForm] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const categoryOptions = useMemo(
    () => [
      { value: 'general', label: 'General Support' },
      { value: 'account', label: 'Account Access' },
      { value: 'safety', label: 'Safety and Moderation' },
      { value: 'technical', label: 'Technical Issue' },
      { value: 'billing', label: 'Billing and Plan' },
      { value: 'legal', label: 'Legal or Policy Inquiry' },
    ],
    []
  );

  const description =
    'Contact LitBuddy support for account assistance, technical issues, safety reports, and policy inquiries with production support workflows.';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: COMPANY_NAME,
      email: SUPPORT_EMAIL,
      address: {
        '@type': 'PostalAddress',
        addressLocality: REGISTERED_ADDRESS,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact Us',
      url: `${SITE_URL}/contact`,
      description,
    },
  ];

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
        pageUrl: `${window.location.origin}${location.pathname}`,
      };
      const data = await sendContact(payload);
      setSuccess(data.message || 'Your request has been submitted successfully.');
      setForm(initialState);
    } catch (err) {
      setError(err.message || 'Failed to submit contact request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SeoHead title="Contact Us" description={description} path="/contact" jsonLd={jsonLd} />
      <PublicPageLayout
        kicker="Support"
        title="Contact LitBuddy"
        description="For account support, technical issues, moderation concerns, or policy questions, submit a request and our team will review it through the official support workflow."
        lastUpdated={LAST_UPDATED}
        primaryAction={{ label: 'Open Help Center', to: '/help' }}
        secondaryAction={{ label: 'View FAQ', to: '/faq' }}
      >
        <PublicSection title="Support Service Expectations">
          <div className="public-grid-3">
            <article className="public-card">
              <h3 className="public-card-title">Initial review</h3>
              <p>Most requests are triaged within one business day based on urgency and category.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Safety priority</h3>
              <p>Safety and abuse-related submissions receive priority review by moderation staff.</p>
            </article>
            <article className="public-card">
              <h3 className="public-card-title">Resolution quality</h3>
              <p>Responses are documented and tracked in the internal support queue until resolved.</p>
            </article>
          </div>
        </PublicSection>

        <PublicSection title="Submit a Support Request" subtitle="Provide complete details for faster diagnosis and resolution.">
          {error ? <p className="public-error">{error}</p> : null}
          {success ? <p className="public-success">{success}</p> : null}

          <form className="public-form" onSubmit={onSubmit}>
            <div className="public-grid-2">
              <label className="public-field">
                <span className="public-label">Full name</span>
                <input className="public-input" name="name" value={form.name} onChange={onChange} required />
              </label>

              <label className="public-field">
                <span className="public-label">Email address</span>
                <input className="public-input" name="email" type="email" value={form.email} onChange={onChange} required />
              </label>
            </div>

            <div className="public-grid-2">
              <label className="public-field">
                <span className="public-label">Category</span>
                <select className="public-select" name="category" value={form.category} onChange={onChange}>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="public-field">
                <span className="public-label">Product area (optional)</span>
                <input
                  className="public-input"
                  name="productArea"
                  value={form.productArea}
                  onChange={onChange}
                  placeholder="Example: chat, clubs, profile"
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

            <button className="public-submit" type="submit" disabled={busy}>
              {busy ? 'Submitting...' : 'Submit Contact Request'}
            </button>
          </form>
        </PublicSection>

        <PublicSection title="Direct Contact Channels">
          <div className="public-data-grid">
            <div className="public-data-row">
              <span className="public-data-label">Support</span>
              <span className="public-data-value">{SUPPORT_EMAIL}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Legal and privacy</span>
              <span className="public-data-value">{LEGAL_EMAIL}</span>
            </div>
            <div className="public-data-row">
              <span className="public-data-label">Registered address</span>
              <span className="public-data-value">{REGISTERED_ADDRESS}</span>
            </div>
          </div>
          <p className="public-highlight">
            For product feedback and improvement ideas, use <Link to="/feedback">Send Feedback</Link>.
          </p>
        </PublicSection>
      </PublicPageLayout>
    </>
  );
};

export default ContactPage;
