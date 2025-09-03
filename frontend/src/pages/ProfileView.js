// frontend/src/pages/ProfileView.js

import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import ReportButton from '../components/ReportButton';

const ProfileView = () => {
  const { user } = useContext(AuthContext);

  if (!user) return <p>Loading profile...</p>;

  const loc = user.location || {};

  return (
    <div style={{ maxWidth: 800, margin: 'auto' }}>
      <h2>{user.displayName || user.name}</h2>
      <p><strong>Bio:</strong> {user.bio}</p>
      <p><strong>Quote:</strong> {user.quote}</p>

      <h3>Location</h3>
      {loc ? (
        <>
          <p><strong>City:</strong> {loc.cityName || '-'} {loc.admin1 && `(${loc.admin1})`}</p>
          <p><strong>Country:</strong> {loc.countryName || '-'} {loc.countryCode && `(${loc.countryCode})`}</p>
          <p><strong>Coordinates:</strong> {(loc.lat ?? '-')}, {(loc.lng ?? '-')}</p>
          {typeof loc.preferredSearchRadiusKm === 'number' && (
            <p><strong>Default Radius:</strong> {loc.preferredSearchRadiusKm} km</p>
          )}
        </>
      ) : (
        <p>No location set yet.</p>
      )}

      <h3>Photos</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {user.profilePhotos?.map((src, i) => (
          <img key={i} src={src} alt={`p-${i}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
        ))}
      </div>

      <h3>Favorites</h3>
      <p><strong>Books:</strong> {user.favoriteBooks?.join(', ')}</p>
      <p><strong>Songs:</strong> {user.favoriteSongs?.join(', ')}</p>

      <h3>Preferences</h3>
      <p><strong>Books:</strong> {user.preferences?.books?.join(', ')}</p>
      <p><strong>Music:</strong> {user.preferences?.music?.join(', ')}</p>

      <h3>Short Questions</h3>
      <ul>
        {user.answers?.map((a, i) => (
          <li key={i}><strong>{a.question}:</strong> {a.answer}</li>
        ))}
      </ul>
    </div>
  );
};

export default ProfileView;
