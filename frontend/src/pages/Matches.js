// frontend/src/pages/Matches.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMatches } from '../api/matchApi';
import { startChat } from '../api/chatApi';
import Card from '../components/Card';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import ScrollAnimation from '../components/ScrollAnimation';

/**
 * safe formatter for various location shapes
 * - string -> returns as-is
 * - GeoJSON Point { type, coordinates: [lng, lat] } -> returns "lat, lng"
 * - { latitude, longitude } -> returns "lat, lng"
 * - { city, name } -> returns city or name
 * - array -> join
 * - object fallback -> JSON string
 */
function formatLocation(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  if (Array.isArray(loc)) return loc.join(', ');
  // GeoJSON Point
  if (loc.type && Array.isArray(loc.coordinates)) {
    const [lng, lat] = loc.coordinates;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    }
    return String(loc.coordinates);
  }
  if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    return `${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}`;
  }
  if (loc.city || loc.name) return loc.city || loc.name;
  try {
    return JSON.stringify(loc);
  } catch (e) {
    return String(loc);
  }
}

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getMatches();
        if (!mounted) return;
        setMatches(Array.isArray(res) ? res : (res.matches || []));
      } catch (e) {
        setMsg(e.message || 'Failed to load');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleMessage = async (userId) => {
    try {
      const chat = await startChat(userId);
      const chatId = chat?._id || chat?.id || chat?.chatId;
      if (!chatId) throw new Error('Could not create chat');
      navigate(`/chat/${chatId}`);
    } catch (e) {
      setMsg(e.message || 'Failed to start chat');
    }
  };

  return (
    <main className="container animate-fade-in">
      <ScrollAnimation animation="fade-in-up" delay={0.1}>
        <h2>Your Matches</h2>
      </ScrollAnimation>
      {msg && <ScrollAnimation animation="fade-in-up" delay={0.2}><p className="muted">{msg}</p></ScrollAnimation>}
      <div style={{ marginTop: 12 }} className="l-grid">
        {matches.map((u, index) => (
          <ScrollAnimation key={u._id} animation="fade-in-up" delay={0.3 + index * 0.1}>
            <Card className="match-card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
              <Avatar src={u.profilePhoto} name={u.name || u.displayName} size={64} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{u.name || u.displayName || 'User'}</h4>
                    <small className="muted">
                      {formatLocation(u.location) || u.bio || 'Loves contemporary fiction'}
                    </small>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <Button variant="ghost" onClick={() => handleMessage(u._id)}>Message</Button>
                    <small className="muted">Matched 5d ago</small>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          </ScrollAnimation>
        ))}
      </div>
    </main>
  );
};

export default Matches;
