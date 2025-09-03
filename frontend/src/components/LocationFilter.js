// frontend/src/components/LocationFilter.js
import React, { useState } from 'react';

const toNumOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const LocationFilter = ({ onApply, initialDistance = 50 }) => {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [distanceKm, setDistanceKm] = useState(initialDistance);
  const [status, setStatus] = useState('');

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported by your browser.');
      return;
    }
    setStatus('Locating… (allow permission)');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setStatus('Location acquired.');
      },
      (err) => setStatus('Failed to get location: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleApply = () => {
    const latNum = toNumOrNull(lat);
    const lngNum = toNumOrNull(lng);
    const distNum = toNumOrNull(distanceKm);

    // Build params: only include lat/lng if BOTH valid; distance always if valid
    const params = {};
    if (latNum !== null && lngNum !== null) {
      params.lat = latNum;
      params.lng = lngNum;
    }
    if (distNum !== null) params.distanceKm = distNum;

    onApply(params);
  };

  const handleClear = () => {
    setLat(''); setLng(''); setDistanceKm(initialDistance); setStatus('');
    onApply(null); // clears filter -> backend uses saved defaults
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h4>Location Filter</h4>
      <p style={{ marginBottom: 8, color: '#555' }}>
        Set a distance (km). If you leave coordinates empty, we’ll use your saved location.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="btn btn-secondary" type="button" onClick={handleUseMyLocation}>
          Use my location
        </button>
        <button className="btn" type="button" onClick={() => { setLat(''); setLng(''); }}>
          Clear coordinates
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="number"
          step="any"
          placeholder="Latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          style={{ width: '50%' }}
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          style={{ width: '50%' }}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Distance (km)</label>
        <input
          type="number"
          min="1"
          step="1"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={handleApply}>Apply</button>
        <button className="btn" onClick={handleClear}>Reset</button>
      </div>

      {status && <p style={{ marginTop: 8, color: '#666' }}>{status}</p>}
    </div>
  );
};

export default LocationFilter;
