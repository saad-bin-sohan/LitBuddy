// frontend/src/pages/ProfileWizard.js
import React, { useState, useContext } from 'react';
import { updateProfile } from '../api/profileApi';
import { AuthContext } from '../contexts/AuthContext';
import LocationPicker from './LocationPicker';
import { useNavigate } from 'react-router-dom';

const PREDEFINED_QUESTIONS = [
  { id: 'q1', text: 'What book changed you the most?' },
  { id: 'q2', text: 'Your top comfort song?' },
  { id: 'q3', text: 'One quote you live by?' },
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => resolve(evt.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const StepIndicator = ({ step, total }) => (
  <div style={{ marginBottom: 12 }}>
    Step {step} / {total}
  </div>
);

const ProfileWizard = () => {
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    displayName: user?.displayName || user?.name || '',
    bio: user?.bio || '',
    quote: user?.quote || '',
    profilePhotos: user?.profilePhotos || [],
    favoriteBooks: Array.isArray(user?.favoriteBooks) ? user.favoriteBooks.join(', ') : '',
    favoriteSongs: Array.isArray(user?.favoriteSongs) ? user.favoriteSongs.join(', ') : '',
    preferences: user?.preferences || { books: [], music: [] },
    answers: user?.answers?.length
      ? user.answers
      : PREDEFINED_QUESTIONS.map((q) => ({ questionId: q.id, question: q.text, answer: '' })),
    location: {
      lat: user?.location?.lat ?? null,
      lng: user?.location?.lng ?? null,
      cityName: user?.location?.cityName || '',
      admin1: user?.location?.admin1 || '',
      countryCode: user?.location?.countryCode || '',
      countryName: user?.location?.countryName || '',
      preferredSearchRadiusKm: user?.location?.preferredSearchRadiusKm ?? 25,
    },
  });

  const totalSteps = 6;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Basic fields
  const handleBasicChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Location updates
  const handleLocationChange = (loc) => {
    setForm({ ...form, location: { ...form.location, ...loc } });
  };

  const persistLocationNow = async (loc) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        location: {
          lat: typeof loc.lat === 'number' ? loc.lat : (form.location.lat ?? null),
          lng: typeof loc.lng === 'number' ? loc.lng : (form.location.lng ?? null),
          cityName: loc.cityName || form.location.cityName || '',
          admin1: loc.admin1 || form.location.admin1 || '',
          countryCode: (loc.countryCode || form.location.countryCode || '').toUpperCase(),
          countryName: loc.countryName || form.location.countryName || '',
          preferredSearchRadiusKm:
            typeof loc.preferredSearchRadiusKm === 'number'
              ? loc.preferredSearchRadiusKm
              : (form.location.preferredSearchRadiusKm ?? 25),
        },
      };

      const updated = await updateProfile(payload);

      // Apply the updated location into local form and auth state
      setForm((prev) => ({ ...prev, location: updated.location || payload.location }));
      setUser(updated);
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch (_) {}
      if (typeof refreshUser === 'function') await refreshUser();
      setMessage('Location saved successfully.');
    } catch (err) {
      console.error('persistLocationNow error', err);
      setError(err.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  // Photos
  const handlePhotoSelected = async (e) => {
    const files = Array.from(e.target.files).slice(0, 6 - form.profilePhotos.length);
    const dataUrls = await Promise.all(files.map((f) => fileToDataUrl(f)));
    setForm({ ...form, profilePhotos: [...form.profilePhotos, ...dataUrls] });
  };
  const removePhoto = (index) => {
    const arr = [...form.profilePhotos];
    arr.splice(index, 1);
    setForm({ ...form, profilePhotos: arr });
  };

  // Favorites
  const handleFavoritesChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Preferences & answers
  const togglePreference = (bucket, value) => {
    const cur = new Set(form.preferences[bucket] || []);
    cur.has(value) ? cur.delete(value) : cur.add(value);
    setForm({
      ...form,
      preferences: { ...form.preferences, [bucket]: Array.from(cur) },
    });
  };
  const handleAnswerChange = (idx, value) => {
    const arr = [...form.answers];
    arr[idx] = { ...arr[idx], answer: value };
    setForm({ ...form, answers: arr });
  };

  // Save all data
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        displayName: form.displayName,
        bio: form.bio,
        quote: form.quote,
        profilePhotos: form.profilePhotos,
        favoriteBooks: form.favoriteBooks
          ? form.favoriteBooks.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        favoriteSongs: form.favoriteSongs
          ? form.favoriteSongs.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        preferences: form.preferences,
        answers: form.answers,
        location: {
          lat: typeof form.location.lat === 'number' ? form.location.lat : null,
          lng: typeof form.location.lng === 'number' ? form.location.lng : null,
          cityName: form.location.cityName || '',
          admin1: form.location.admin1 || '',
          countryCode: (form.location.countryCode || '').toUpperCase(),
          countryName: form.location.countryName || '',
          preferredSearchRadiusKm: form.location.preferredSearchRadiusKm ?? 25,
        },
      };

      // capture previous completed state so we can decide first-time completion
      const wasCompletedBefore = !!user?.hasCompletedSetup;

      // call backend to update
      const updated = await updateProfile(payload);

      // update local auth state immediately
      setUser(updated);
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch (_) {}

      // refresh authoritative server profile if available
      if (typeof refreshUser === 'function') {
        await refreshUser();
      }

      // Decide navigation based on server-returned 'updated'
      if (!wasCompletedBefore && updated?.hasCompletedSetup) {
        navigate('/my-profile');
      } else {
        setMessage('Profile saved successfully.');
      }
    } catch (err) {
      console.error('handleSave error', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Steps
  const Step1 = () => (
    <div className="card">
      <h3>Basic Info</h3>
      <label>Display Name</label>
      <input name="displayName" value={form.displayName} onChange={handleBasicChange} />
      <label>Bio</label>
      <textarea name="bio" value={form.bio} onChange={handleBasicChange} />
      <label>Favorite Quote</label>
      <input name="quote" value={form.quote} onChange={handleBasicChange} />
    </div>
  );

  const Step2 = () => (
    <div>
      <h3>Location</h3>
      <LocationPicker
        value={form.location}
        onChange={handleLocationChange}
        onPersist={persistLocationNow}
      />
      <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
        Tip: Click "Save location to profile" to persist immediately. Otherwise it will be saved when you finish the wizard.
      </p>
    </div>
  );

  const Step3 = () => (
    <div className="card">
      <h3>Upload Photos (up to 6)</h3>
      <input type="file" accept="image/*" onChange={handlePhotoSelected} multiple />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {form.profilePhotos.map((src, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img src={src} alt={`p${i}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
            <button type="button" onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 4, right: 4 }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const Step4 = () => (
    <div className="card">
      <h3>Favorites</h3>
      <label>Favorite Books (comma-separated)</label>
      <input name="favoriteBooks" value={form.favoriteBooks} onChange={handleFavoritesChange} />
      <label>Favorite Songs (comma-separated)</label>
      <input name="favoriteSongs" value={form.favoriteSongs} onChange={handleFavoritesChange} />
    </div>
  );

  const Step5 = () => (
    <div className="card">
      <h3>Preferences & Questions</h3>
      <div style={{ marginBottom: 12 }}>
        <p><strong>Book Preferences</strong></p>
        {['Fiction','Non-fiction','Sci-fi','Romance','Mystery','Poetry'].map((t) => (
          <label key={t} style={{ marginRight: 8 }}>
            <input type="checkbox"
              checked={form.preferences.books?.includes(t)}
              onChange={() => togglePreference('books', t)}
            /> {t}
          </label>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        <p><strong>Music Preferences</strong></p>
        {['Pop','Rock','Classical','Jazz','Electronic','Indie'].map((t) => (
          <label key={t} style={{ marginRight: 8 }}>
            <input type="checkbox"
              checked={form.preferences.music?.includes(t)}
              onChange={() => togglePreference('music', t)}
            /> {t}
          </label>
        ))}
      </div>
      <div>
        <p><strong>Short Questions</strong></p>
        {form.answers.map((a, i) => (
          <div key={a.questionId} style={{ marginBottom: 8 }}>
            <label>{a.question}</label>
            <input value={a.answer || ''} onChange={(e) => handleAnswerChange(i, e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );

  const Step6 = () => (
    <div className="card">
      <h3>Review & Submit</h3>
      <p><strong>Display Name:</strong> {form.displayName}</p>
      <p><strong>Bio:</strong> {form.bio}</p>
      <p><strong>Quote:</strong> {form.quote}</p>
      <div className="card" style={{ marginTop: 8 }}>
        <h4>Location</h4>
        <p><strong>City:</strong> {form.location.cityName || '-'}</p>
        <p><strong>Country:</strong> {form.location.countryName || '-'}</p>
        <p><strong>Coordinates:</strong> {form.location.lat ?? '-'}, {form.location.lng ?? '-'}</p>
        <p><strong>Radius:</strong> {form.location.preferredSearchRadiusKm} km</p>
      </div>
      <div><strong>Photos:</strong></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {form.profilePhotos.map((src, i) => (
          <img key={i} src={src} alt={`rev-${i}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
        ))}
      </div>
      <p><strong>Favorite Books:</strong> {form.favoriteBooks}</p>
      <p><strong>Favorite Songs:</strong> {form.favoriteSongs}</p>
      <p><strong>Preferences - Books:</strong> {form.preferences.books.join(', ')}</p>
      <p><strong>Preferences - Music:</strong> {form.preferences.music.join(', ')}</p>
      <div>
        <strong>Answers:</strong>
        <ul>
          {form.answers.map((a) => (
            <li key={a.questionId}><strong>{a.question}:</strong> {a.answer}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const canNext = () => step !== 1 || form.displayName.trim().length > 0;

  return (
    <div style={{ maxWidth: 900, margin: 'auto' }}>
      <StepIndicator step={step} total={totalSteps} />
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {step === 1 && <Step1 />}
      {step === 2 && <Step2 />}
      {step === 3 && <Step3 />}
      {step === 4 && <Step4 />}
      {step === 5 && <Step5 />}
      {step === 6 && <Step6 />}

      <div style={{ marginTop: 16 }}>
        {step > 1 && <button onClick={() => setStep(step - 1)} style={{ marginRight: 8 }}>Back</button>}
        {step < totalSteps && <button onClick={() => canNext() ? setStep(step + 1) : setError('Please fill required fields')}>Next</button>}
        {step === totalSteps && (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileWizard;
