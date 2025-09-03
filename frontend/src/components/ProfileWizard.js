// frontend/src/pages/ProfileWizard.js
import React, { useState, useContext, useCallback, useMemo, useRef, useEffect } from 'react';
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

  // Initialize userData directly
  const initialUserData = {
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
  };

  // Use initialUserData to initialize form state
  const [form, setForm] = useState(initialUserData);

  const totalSteps = 6;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Simplified change handlers
  const handleBasicChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }));
  }, []);

  // Location updates - Memoized with useCallback
  const handleLocationChange = useCallback((loc) => {
    setForm(prevForm => ({ ...prevForm, location: { ...prevForm.location, ...loc } }));
  }, []);

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

      // ONLY update the local form state - don't update the global user context
      setForm((prev) => ({ ...prev, location: updated.location || payload.location }));
      
      setMessage('Location saved successfully.');
    } catch (err) {
      console.error('persistLocationNow error', err);
      setError(err.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  // Photos - Memoized with useCallback
  const handlePhotoSelected = useCallback(async (e) => {
    const files = Array.from(e.target.files).slice(0, 6 - form.profilePhotos.length);
    const dataUrls = await Promise.all(files.map((f) => fileToDataUrl(f)));
    setForm(prevForm => ({ ...prevForm, profilePhotos: [...prevForm.profilePhotos, ...dataUrls] }));
  }, [form.profilePhotos.length]);

  const removePhoto = useCallback((index) => {
    setForm(prevForm => {
      const arr = [...prevForm.profilePhotos];
      arr.splice(index, 1);
      return { ...prevForm, profilePhotos: arr };
    });
  }, []);

  // Simplified change handlers
  const handleFavoritesChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }));
  }, []);

  // Preferences & answers - Fixed to use functional update
  const togglePreference = (bucket, value) => {
    setForm(prevForm => {
      const cur = new Set(prevForm.preferences[bucket] || []);
      cur.has(value) ? cur.delete(value) : cur.add(value);
      return {
        ...prevForm,
        preferences: { ...prevForm.preferences, [bucket]: Array.from(cur) },
      };
    });
  };

  const handleAnswerChange = useCallback((idx, value) => {
    setForm(prevForm => {
      const arr = [...prevForm.answers];
      arr[idx] = { ...arr[idx], answer: value };
      return { ...prevForm, answers: arr };
    });
  }, []);

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

  const Step1 = () => (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Basic Info</h3>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Display Name</label>
        <input 
          name="displayName" 
          value={form.displayName} 
          onChange={handleBasicChange}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Bio</label>
        <textarea 
          name="bio" 
          value={form.bio} 
          onChange={handleBasicChange}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            minHeight: '100px',
            resize: 'vertical'
          }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Favorite Quote</label>
        <input 
          name="quote" 
          value={form.quote} 
          onChange={handleBasicChange}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>
    </div>
  );

  const Step2 = () => (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Location</h3>
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
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Upload Photos (up to 6)</h3>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handlePhotoSelected} 
        multiple 
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '16px'
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {form.profilePhotos.map((src, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img src={src} alt={`p${i}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
            <button 
              type="button" 
              onClick={() => removePhoto(i)} 
              style={{ 
                position: 'absolute', 
                top: 4, 
                right: 4,
                background: 'red',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const Step4 = () => (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Favorites</h3>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Favorite Books (comma-separated)</label>
        <input 
          name="favoriteBooks" 
          value={form.favoriteBooks} 
          onChange={handleFavoritesChange}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Favorite Songs (comma-separated)</label>
        <input 
          name="favoriteSongs" 
          value={form.favoriteSongs} 
          onChange={handleFavoritesChange}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>
    </div>
  );

  const Step5 = () => (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Preferences & Questions</h3>
      <div style={{ marginBottom: '12' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Book Preferences</p>
        {['Fiction','Non-fiction','Sci-fi','Romance','Mystery','Poetry'].map((t) => (
          <label key={t} style={{ marginRight: 8, display: 'inline-block', marginBottom: '8px' }}>
            <input 
              type="checkbox"
              checked={form.preferences.books?.includes(t)}
              onChange={() => togglePreference('books', t)}
              style={{ marginRight: '5px' }}
            /> {t}
          </label>
        ))}
      </div>
      <div style={{ marginBottom: '12' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Music Preferences</p>
        {['Pop','Rock','Classical','Jazz','Electronic','Indie'].map((t) => (
          <label key={t} style={{ marginRight: 8, display: 'inline-block', marginBottom: '8px' }}>
            <input 
              type="checkbox"
              checked={form.preferences.music?.includes(t)}
              onChange={() => togglePreference('music', t)}
              style={{ marginRight: '5px' }}
            /> {t}
          </label>
        ))}
      </div>
      <div>
        <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Short Questions</p>
        {form.answers.map((a, i) => (
          <div key={a.questionId} style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{a.question}</label>
            <input 
              value={a.answer || ''} 
              onChange={(e) => handleAnswerChange(i, e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const Step6 = () => (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Review & Submit</h3>
      <p><strong>Display Name:</strong> {form.displayName}</p>
      <p><strong>Bio:</strong> {form.bio}</p>
      <p><strong>Quote:</strong> {form.quote}</p>
      <div style={{
        border: '1px solid #eee',
        borderRadius: '6px',
        padding: '15px',
        marginTop: 8,
        backgroundColor: '#f9f9f9'
      }}>
        <h4 style={{ marginTop: 0 }}>Location</h4>
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
        {step > 1 && (
          <button 
            onClick={() => setStep(step - 1)} 
            style={{ 
              marginRight: 8,
              padding: '10px 20px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        )}
        {step < totalSteps && (
          <button 
            onClick={() => canNext() ? setStep(step + 1) : setError('Please fill required fields')}
            style={{
              padding: '10px 20px',
              border: '1px solid #007bff',
              borderRadius: '4px',
              backgroundColor: '#007bff',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Next
          </button>
        )}
        {step === totalSteps && (
          <button 
            onClick={handleSave} 
            disabled={saving}
            style={{
              padding: '12px 24px',
              border: '1px solid #28a745',
              borderRadius: '4px',
              backgroundColor: '#28a745',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileWizard;
