// frontend/src/components/LocationPicker.js
import React, { useState, useEffect } from 'react';

/**
 * LocationPicker
 *
 * Props:
 * - value: { lat, lng, cityName, admin1, countryCode, countryName, preferredSearchRadiusKm }
 * - onChange: function(updatedLocation)          // called any time local fields change
 * - onPersist: async function(updatedLocation)   // optional: parent-provided function to persist location (returns promise)
 *
 * Behavior:
 * - "Use my current location" obtains browser geolocation and calls onChange
 * - After acquiring coords, shows a "Save location to profile" button which calls onPersist (if provided)
 * - If onPersist isn't provided, it still calls onChange so parent can persist elsewhere (e.g., when Save Profile is clicked)
 */
const LocationPicker = ({ value = {}, onChange = () => {}, onPersist }) => {
  const [lat, setLat] = useState(value.lat ?? '');
  const [lng, setLng] = useState(value.lng ?? '');
  const [cityName, setCityName] = useState(value.cityName ?? '');
  const [admin1, setAdmin1] = useState(value.admin1 ?? '');
  const [countryName, setCountryName] = useState(value.countryName ?? '');
  const [countryCode, setCountryCode] = useState(value.countryCode ?? '');
  const [preferredSearchRadiusKm, setPreferredSearchRadiusKm] = useState(value.preferredSearchRadiusKm ?? 25);

  const [status, setStatus] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    // keep internal state synced when parent gives new value
    setLat(value.lat ?? '');
    setLng(value.lng ?? '');
    setCityName(value.cityName ?? '');
    setAdmin1(value.admin1 ?? '');
    setCountryName(value.countryName ?? '');
    setCountryCode(value.countryCode ?? '');
    setPreferredSearchRadiusKm(value.preferredSearchRadiusKm ?? 25);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  const emitChange = (patch = {}) => {
    const newObj = {
      lat: lat === '' ? null : Number(lat),
      lng: lng === '' ? null : Number(lng),
      cityName,
      admin1,
      countryName,
      countryCode,
      preferredSearchRadiusKm: Number(preferredSearchRadiusKm),
      ...patch,
    };
    onChange(newObj);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported by your browser.');
      return;
    }
    setStatus('Locating… allow browser permission');
    setGeoBusy(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latNum = pos.coords.latitude;
        const lngNum = pos.coords.longitude;
        setLat(String(latNum));
        setLng(String(lngNum));
        setStatus('Location acquired (not yet saved).');
        setGeoBusy(false);
        emitChange({ lat: latNum, lng: lngNum });
      },
      (err) => {
        setStatus('Failed to get location: ' + err.message);
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handlePersist = async () => {
    if (typeof onPersist !== 'function') {
      setStatus('No persistence handler provided. Save profile to persist location.');
      return;
    }

    const payload = {
      lat: lat === '' ? null : Number(lat),
      lng: lng === '' ? null : Number(lng),
      cityName: cityName || '',
      admin1: admin1 || '',
      countryCode: (countryCode || '').toUpperCase(),
      countryName: countryName || '',
      preferredSearchRadiusKm: Number(preferredSearchRadiusKm) || 25,
    };

    if (payload.lat == null || payload.lng == null) {
      setStatus('Cannot save: coordinates are missing.');
      return;
    }

    try {
      setSaving(true);
      setStatus('Saving location to your profile…');
      await onPersist(payload); // parent will call updateProfile
      setLastSavedAt(new Date());
      setStatus('Location saved to profile.');
    } catch (err) {
      console.error('persist error', err);
      setStatus(err?.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3>Location</h3>
      <p style={{ marginBottom: 8 }}>
        Use your device location or enter city + country. You can save this location to your profile so future matches use it automatically.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="btn btn-secondary" type="button" onClick={handleUseMyLocation} disabled={geoBusy}>
          {geoBusy ? 'Locating…' : 'Use my current location'}
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => { setLat(''); setLng(''); emitChange({ lat: null, lng: null }); setStatus('Coordinates cleared (not saved).'); }}
        >
          Clear coordinates
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', marginBottom: 8 }}>
        <div>
          <label>Latitude</label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => { setLat(e.target.value); emitChange({ lat: e.target.value === '' ? null : Number(e.target.value) }); }}
            placeholder="23.7724"
          />
        </div>
        <div>
          <label>Longitude</label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => { setLng(e.target.value); emitChange({ lng: e.target.value === '' ? null : Number(e.target.value) }); }}
            placeholder="90.4247"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', marginBottom: 8 }}>
        <div>
          <label>City</label>
          <input value={cityName} onChange={(e) => { setCityName(e.target.value); emitChange({ cityName: e.target.value }); }} placeholder="Dhaka" />
        </div>
        <div>
          <label>State / Region (optional)</label>
          <input value={admin1} onChange={(e) => { setAdmin1(e.target.value); emitChange({ admin1: e.target.value }); }} placeholder="Dhaka Division" />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', marginBottom: 8 }}>
        <div>
          <label>Country name</label>
          <input value={countryName} onChange={(e) => { setCountryName(e.target.value); emitChange({ countryName: e.target.value }); }} placeholder="Bangladesh" />
        </div>
        <div>
          <label>Country code (2 letters)</label>
          <input maxLength={2} value={countryCode} onChange={(e) => { setCountryCode(e.target.value.toUpperCase()); emitChange({ countryCode: e.target.value.toUpperCase() }); }} placeholder="BD" />
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Default search radius (km): {preferredSearchRadiusKm}</label>
        <input
          type="range"
          min={1}
          max={500}
          value={preferredSearchRadiusKm}
          onChange={(e) => { setPreferredSearchRadiusKm(Number(e.target.value)); emitChange({ preferredSearchRadiusKm: Number(e.target.value) }); }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" type="button" onClick={handlePersist} disabled={saving}>
          {saving ? 'Saving…' : 'Save location to profile'}
        </button>

        <button className="btn" type="button" onClick={() => { setStatus('Using location temporarily (not saved).'); }}>
          Use temporarily
        </button>
      </div>

      {status && <p style={{ marginTop: 8, color: '#444' }}>{status}</p>}
      {lastSavedAt && <p style={{ fontSize: 12, color: '#666' }}>Last saved: {new Date(lastSavedAt).toLocaleString()}</p>}
    </div>
  );
};

export default LocationPicker;
