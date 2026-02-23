import React, { useEffect, useMemo, useState } from 'react';
import AdminGuard from '../components/AdminGuard';
import { adminContentApi } from '../api/adminContentApi';
import './PublicPages.css';

const BLOG_STATUSES = ['draft', 'published', 'archived'];
const CAREER_STATUSES = ['draft', 'open', 'closed', 'archived'];
const PRESS_STATUSES = ['draft', 'published', 'archived'];

const initialBlogForm = {
  title: '',
  excerpt: '',
  content: '',
  tags: '',
  authorName: 'LitBuddy Editorial Team',
  coverImageUrl: '',
  status: 'draft',
  seoTitle: '',
  seoDescription: '',
};

const initialCareerForm = {
  title: '',
  department: 'General',
  location: 'Dhaka, Bangladesh',
  employmentType: 'full-time',
  workplaceType: 'hybrid',
  experienceLevel: 'Mid-Level',
  summary: '',
  responsibilities: '',
  requirements: '',
  niceToHave: '',
  benefits: '',
  applyEmail: 'sohan.helpdesk@gmail.com',
  applyUrl: '',
  status: 'draft',
  seoTitle: '',
  seoDescription: '',
};

const initialPressForm = {
  title: '',
  resourceType: 'other',
  description: '',
  fileUrl: '',
  fileSizeLabel: '',
  sortOrder: 0,
  status: 'draft',
  seoTitle: '',
  seoDescription: '',
};

function arrayToMultiline(value) {
  if (!Array.isArray(value)) return '';
  return value.join('\n');
}

function multilineToArray(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const AdminContent = () => {
  const [tab, setTab] = useState('blog');
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [blogForm, setBlogForm] = useState(initialBlogForm);
  const [careerForm, setCareerForm] = useState(initialCareerForm);
  const [pressForm, setPressForm] = useState(initialPressForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const statusOptions = useMemo(() => {
    if (tab === 'blog') return BLOG_STATUSES;
    if (tab === 'careers') return CAREER_STATUSES;
    return PRESS_STATUSES;
  }, [tab]);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100, status: statusFilter, search };
      const data =
        tab === 'blog'
          ? await adminContentApi.listBlog(params)
          : tab === 'careers'
            ? await adminContentApi.listCareers(params)
            : await adminContentApi.listPressResources(params);
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setSelectedId('');
    setError('');
    setSuccess('');
    if (nextTab === 'blog') setBlogForm(initialBlogForm);
    if (nextTab === 'careers') setCareerForm(initialCareerForm);
    if (nextTab === 'press') setPressForm(initialPressForm);
  };

  const resetSelection = () => {
    setSelectedId('');
    setSuccess('');
    setError('');
    if (tab === 'blog') setBlogForm(initialBlogForm);
    if (tab === 'careers') setCareerForm(initialCareerForm);
    if (tab === 'press') setPressForm(initialPressForm);
  };

  const selectItem = (item) => {
    setSelectedId(item._id);
    setSuccess('');
    setError('');

    if (tab === 'blog') {
      setBlogForm({
        title: item.title || '',
        excerpt: item.excerpt || '',
        content: item.content || '',
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
        authorName: item.authorName || 'LitBuddy Editorial Team',
        coverImageUrl: item.coverImageUrl || '',
        status: item.status || 'draft',
        seoTitle: item.seoTitle || '',
        seoDescription: item.seoDescription || '',
      });
      return;
    }

    if (tab === 'careers') {
      setCareerForm({
        title: item.title || '',
        department: item.department || 'General',
        location: item.location || 'Dhaka, Bangladesh',
        employmentType: item.employmentType || 'full-time',
        workplaceType: item.workplaceType || 'hybrid',
        experienceLevel: item.experienceLevel || 'Mid-Level',
        summary: item.summary || '',
        responsibilities: arrayToMultiline(item.responsibilities),
        requirements: arrayToMultiline(item.requirements),
        niceToHave: arrayToMultiline(item.niceToHave),
        benefits: arrayToMultiline(item.benefits),
        applyEmail: item.applyEmail || 'sohan.helpdesk@gmail.com',
        applyUrl: item.applyUrl || '',
        status: item.status || 'draft',
        seoTitle: item.seoTitle || '',
        seoDescription: item.seoDescription || '',
      });
      return;
    }

    setPressForm({
      title: item.title || '',
      resourceType: item.resourceType || 'other',
      description: item.description || '',
      fileUrl: item.fileUrl || '',
      fileSizeLabel: item.fileSizeLabel || '',
      sortOrder: item.sortOrder || 0,
      status: item.status || 'draft',
      seoTitle: item.seoTitle || '',
      seoDescription: item.seoDescription || '',
    });
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    if (tab === 'blog') setBlogForm((prev) => ({ ...prev, [name]: value }));
    if (tab === 'careers') setCareerForm((prev) => ({ ...prev, [name]: value }));
    if (tab === 'press') setPressForm((prev) => ({ ...prev, [name]: value }));
  };

  const toPayload = () => {
    if (tab === 'blog') {
      return {
        ...blogForm,
        tags: blogForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
    }

    if (tab === 'careers') {
      return {
        ...careerForm,
        responsibilities: multilineToArray(careerForm.responsibilities),
        requirements: multilineToArray(careerForm.requirements),
        niceToHave: multilineToArray(careerForm.niceToHave),
        benefits: multilineToArray(careerForm.benefits),
      };
    }

    return {
      ...pressForm,
      sortOrder: Number.parseInt(pressForm.sortOrder, 10) || 0,
    };
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = toPayload();

      if (tab === 'blog') {
        if (selectedId) await adminContentApi.updateBlog(selectedId, payload);
        else await adminContentApi.createBlog(payload);
      }

      if (tab === 'careers') {
        if (selectedId) await adminContentApi.updateCareer(selectedId, payload);
        else await adminContentApi.createCareer(payload);
      }

      if (tab === 'press') {
        if (selectedId) await adminContentApi.updatePressResource(selectedId, payload);
        else await adminContentApi.createPressResource(payload);
      }

      setSuccess(selectedId ? 'Updated successfully.' : 'Created successfully.');
      await loadItems();
      if (!selectedId) resetSelection();
    } catch (err) {
      setError(err.message || 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this item permanently?')) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (tab === 'blog') await adminContentApi.deleteBlog(selectedId);
      if (tab === 'careers') await adminContentApi.deleteCareer(selectedId);
      if (tab === 'press') await adminContentApi.deletePressResource(selectedId);
      resetSelection();
      await loadItems();
      setSuccess('Deleted successfully.');
    } catch (err) {
      setError(err.message || 'Failed to delete item');
    } finally {
      setSaving(false);
    }
  };

  const deleteItemById = async (id) => {
    if (!id) return;
    if (!window.confirm('Delete this item permanently?')) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (tab === 'blog') await adminContentApi.deleteBlog(id);
      if (tab === 'careers') await adminContentApi.deleteCareer(id);
      if (tab === 'press') await adminContentApi.deletePressResource(id);
      if (selectedId === id) resetSelection();
      await loadItems();
      setSuccess('Deleted successfully.');
    } catch (err) {
      setError(err.message || 'Failed to delete item');
    } finally {
      setSaving(false);
    }
  };

  const renderBlogForm = () => (
    <>
      <label className="public-field">
        <span className="public-label">Title</span>
        <input className="public-input" name="title" value={blogForm.title} onChange={onChange} required />
      </label>
      <label className="public-field">
        <span className="public-label">Excerpt</span>
        <textarea className="public-textarea" name="excerpt" value={blogForm.excerpt} onChange={onChange} />
      </label>
      <label className="public-field">
        <span className="public-label">Content</span>
        <textarea className="public-textarea" name="content" value={blogForm.content} onChange={onChange} required />
      </label>
      <label className="public-field">
        <span className="public-label">Tags (comma-separated)</span>
        <input className="public-input" name="tags" value={blogForm.tags} onChange={onChange} />
      </label>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">Author name</span>
          <input className="public-input" name="authorName" value={blogForm.authorName} onChange={onChange} />
        </label>
        <label className="public-field">
          <span className="public-label">Status</span>
          <select className="public-select" name="status" value={blogForm.status} onChange={onChange}>
            {BLOG_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="public-field">
        <span className="public-label">Cover image URL</span>
        <input className="public-input" name="coverImageUrl" value={blogForm.coverImageUrl} onChange={onChange} />
      </label>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">SEO title</span>
          <input className="public-input" name="seoTitle" value={blogForm.seoTitle} onChange={onChange} />
        </label>
        <label className="public-field">
          <span className="public-label">SEO description</span>
          <input className="public-input" name="seoDescription" value={blogForm.seoDescription} onChange={onChange} />
        </label>
      </div>
    </>
  );

  const renderCareerForm = () => (
    <>
      <label className="public-field">
        <span className="public-label">Title</span>
        <input className="public-input" name="title" value={careerForm.title} onChange={onChange} required />
      </label>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">Department</span>
          <input className="public-input" name="department" value={careerForm.department} onChange={onChange} />
        </label>
        <label className="public-field">
          <span className="public-label">Location</span>
          <input className="public-input" name="location" value={careerForm.location} onChange={onChange} />
        </label>
      </div>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">Employment type</span>
          <select className="public-select" name="employmentType" value={careerForm.employmentType} onChange={onChange}>
            <option value="full-time">full-time</option>
            <option value="part-time">part-time</option>
            <option value="contract">contract</option>
            <option value="internship">internship</option>
            <option value="temporary">temporary</option>
          </select>
        </label>
        <label className="public-field">
          <span className="public-label">Workplace type</span>
          <select className="public-select" name="workplaceType" value={careerForm.workplaceType} onChange={onChange}>
            <option value="hybrid">hybrid</option>
            <option value="remote">remote</option>
            <option value="on-site">on-site</option>
          </select>
        </label>
      </div>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">Experience level</span>
          <input className="public-input" name="experienceLevel" value={careerForm.experienceLevel} onChange={onChange} />
        </label>
        <label className="public-field">
          <span className="public-label">Status</span>
          <select className="public-select" name="status" value={careerForm.status} onChange={onChange}>
            {CAREER_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="public-field">
        <span className="public-label">Summary</span>
        <textarea className="public-textarea" name="summary" value={careerForm.summary} onChange={onChange} required />
      </label>
      <label className="public-field">
        <span className="public-label">Responsibilities (new line separated)</span>
        <textarea className="public-textarea" name="responsibilities" value={careerForm.responsibilities} onChange={onChange} />
      </label>
      <label className="public-field">
        <span className="public-label">Requirements (new line separated)</span>
        <textarea className="public-textarea" name="requirements" value={careerForm.requirements} onChange={onChange} />
      </label>
      <label className="public-field">
        <span className="public-label">Nice-to-have (new line separated)</span>
        <textarea className="public-textarea" name="niceToHave" value={careerForm.niceToHave} onChange={onChange} />
      </label>
      <label className="public-field">
        <span className="public-label">Benefits (new line separated)</span>
        <textarea className="public-textarea" name="benefits" value={careerForm.benefits} onChange={onChange} />
      </label>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">Apply email</span>
          <input className="public-input" name="applyEmail" value={careerForm.applyEmail} onChange={onChange} />
        </label>
        <label className="public-field">
          <span className="public-label">Apply URL</span>
          <input className="public-input" name="applyUrl" value={careerForm.applyUrl} onChange={onChange} />
        </label>
      </div>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">SEO title</span>
          <input className="public-input" name="seoTitle" value={careerForm.seoTitle} onChange={onChange} />
        </label>
        <label className="public-field">
          <span className="public-label">SEO description</span>
          <input className="public-input" name="seoDescription" value={careerForm.seoDescription} onChange={onChange} />
        </label>
      </div>
    </>
  );

  const renderPressForm = () => (
    <>
      <label className="public-field">
        <span className="public-label">Title</span>
        <input className="public-input" name="title" value={pressForm.title} onChange={onChange} required />
      </label>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">Resource type</span>
          <select className="public-select" name="resourceType" value={pressForm.resourceType} onChange={onChange}>
            <option value="other">other</option>
            <option value="logo">logo</option>
            <option value="brand-guidelines">brand-guidelines</option>
            <option value="screenshot">screenshot</option>
            <option value="fact-sheet">fact-sheet</option>
            <option value="press-release">press-release</option>
            <option value="media-mention">media-mention</option>
          </select>
        </label>
        <label className="public-field">
          <span className="public-label">Status</span>
          <select className="public-select" name="status" value={pressForm.status} onChange={onChange}>
            {PRESS_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="public-field">
        <span className="public-label">Description</span>
        <textarea className="public-textarea" name="description" value={pressForm.description} onChange={onChange} />
      </label>
      <label className="public-field">
        <span className="public-label">File URL</span>
        <input className="public-input" name="fileUrl" value={pressForm.fileUrl} onChange={onChange} required />
      </label>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">File size label</span>
          <input className="public-input" name="fileSizeLabel" value={pressForm.fileSizeLabel} onChange={onChange} />
        </label>
        <label className="public-field">
          <span className="public-label">Sort order</span>
          <input className="public-input" name="sortOrder" type="number" value={pressForm.sortOrder} onChange={onChange} />
        </label>
      </div>
      <div className="public-grid-2">
        <label className="public-field">
          <span className="public-label">SEO title</span>
          <input className="public-input" name="seoTitle" value={pressForm.seoTitle} onChange={onChange} />
        </label>
        <label className="public-field">
          <span className="public-label">SEO description</span>
          <input className="public-input" name="seoDescription" value={pressForm.seoDescription} onChange={onChange} />
        </label>
      </div>
    </>
  );

  return (
    <AdminGuard>
      <div className="admin-panel">
        <h1 className="admin-heading">Admin Content Management</h1>
        <p className="admin-subheading">Create, update, publish, unpublish, and remove public content for Blog, Careers, and Press.</p>

        <div className="admin-toolbar">
          <button className={tab === 'blog' ? 'active' : ''} onClick={() => switchTab('blog')}>
            Blog
          </button>
          <button className={tab === 'careers' ? 'active' : ''} onClick={() => switchTab('careers')}>
            Careers
          </button>
          <button className={tab === 'press' ? 'active' : ''} onClick={() => switchTab('press')}>
            Press Resources
          </button>
        </div>

        <div className="admin-toolbar">
          <select className="public-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <input
            className="public-input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={loadItems}>Refresh</button>
          <button onClick={resetSelection}>New {tab === 'press' ? 'Resource' : 'Entry'}</button>
        </div>

        {error ? <p className="public-error">{error}</p> : null}
        {success ? <p className="public-success">{success}</p> : null}

        <div className="admin-grid">
          <section className="admin-card">
            <h2>{tab === 'blog' ? 'Blog Posts' : tab === 'careers' ? 'Career Openings' : 'Press Resources'}</h2>
            {loading ? <p className="public-empty">Loading...</p> : null}
            {!loading && items.length === 0 ? <p className="public-empty">No items found.</p> : null}

            <div className="admin-list">
              {items.map((item) => (
                <article key={item._id} className="admin-list-item">
                  <h4>{item.title}</h4>
                  <p>Status: {item.status}</p>
                  {item.slug ? <p>Slug: {item.slug}</p> : null}
                  {item.updatedAt ? <p>Updated: {new Date(item.updatedAt).toLocaleString()}</p> : null}
                  <div className="admin-inline-actions">
                    <button onClick={() => selectItem(item)}>Edit</button>
                    <button className="danger" onClick={() => deleteItemById(item._id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <h2>{selectedId ? 'Edit Entry' : 'Create New Entry'}</h2>
            <form className="admin-form" onSubmit={onSubmit}>
              {tab === 'blog' ? renderBlogForm() : null}
              {tab === 'careers' ? renderCareerForm() : null}
              {tab === 'press' ? renderPressForm() : null}

              <div className="admin-inline-actions">
                <button className="public-submit" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : selectedId ? 'Update' : 'Create'}
                </button>
                {selectedId ? (
                  <button type="button" className="danger" onClick={onDelete} disabled={saving}>
                    Delete
                  </button>
                ) : null}
                <button type="button" onClick={resetSelection} disabled={saving}>
                  Reset
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </AdminGuard>
  );
};

export default AdminContent;
