// frontend/src/pages/MatchSuggestions.js
import React, { useState, useEffect } from 'react';
import { getSuggestions, likeUser } from '../api/matchApi';
import LocationFilter from '../components/LocationFilter';

const MatchSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState('');
  const [, setFilter] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async (params = null) => {
    setLoading(true);
    setMessage('');
    try {
      const data = await getSuggestions(params || {});
      if (Array.isArray(data)) {
        setSuggestions(data);
        if (data.length === 0) setMessage('No suggestions available.');
      } else if (data && data.message) {
        setMessage(data.message);
        setSuggestions([]);
      } else {
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      }
    } catch (err) {
      setMessage(err.message || 'Failed to fetch suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions(); // initial unfiltered load
  }, []);

  const handleLike = async (id) => {
    try {
      const res = await likeUser(id);
      setMessage(res.message || 'Liked');
      setSuggestions(prev => prev.filter(u => u._id !== id));
    } catch (err) {
      setMessage(err.message || 'Failed to like');
    }
  };

  const handleApplyFilter = (params) => {
    setFilter(params);
    if (params) {
      fetchSuggestions(params);
    } else {
      // cleared filter
      fetchSuggestions();
    }
  };

  return (
    <div>
      <h2>Daily Suggestions</h2>

      <LocationFilter onApply={handleApplyFilter} />

      {loading && <p>Loading suggestions…</p>}
      {message && <p>{message}</p>}

      {suggestions.length === 0 && !loading ? (
        <p>No suggestions found.</p>
      ) : (
        suggestions.map((user) => (
          <div key={user._id} className="card" style={{ marginBottom: 12 }}>
            <h3>{user.displayName || user.name}</h3>
            <p>Age: {user.age}</p>
            <p>Gender: {user.gender}</p>
            {typeof user.dist === 'object' && user.dist.calculated && (
              <p>Distance: {(user.dist.calculated / 1000).toFixed(1)} km</p>
            )}
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => handleLike(user._id)}>Like</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MatchSuggestions;