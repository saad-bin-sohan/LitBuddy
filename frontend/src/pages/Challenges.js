import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getChallenges, 
  joinChallenge, 
  leaveChallenge, 
  getUserChallenges 
} from '../api/challengeApi';
import { createChallenge as createChallengeApi } from '../api/challengeApi';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './Challenges.css';

const Challenges = () => {
  const { user, isAdmin } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [userChallenges, setUserChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    type: '',
    category: ''
  });
  const isAdminUser = !!isAdmin;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'seasonal',
    category: 'summer',
    startDate: '',
    endDate: '',
    isPublic: true,
    maxParticipants: 1000,
    requirements: {
      booksToRead: 0,
      pagesToRead: 0,
      minutesToRead: 0,
      streakDays: 0,
      genres: []
    },
    rewards: {
      points: 0,
      badge: '',
      title: ''
    }
  });

  useEffect(() => {
    loadChallenges();
    if (user) {
      loadUserChallenges();
    }
  }, [user, filters]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const response = await getChallenges(filters);
      setChallenges(response.data);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('requirements.')) {
      const key = name.replace('requirements.', '');
      setForm((prev) => ({
        ...prev,
        requirements: {
          ...prev.requirements,
          [key]: key === 'genres' ? value.split(',').map((g) => g.trim()).filter(Boolean) : Number(value)
        }
      }));
    } else if (name.startsWith('rewards.')) {
      const key = name.replace('rewards.', '');
      setForm((prev) => ({
        ...prev,
        rewards: {
          ...prev.rewards,
          [key]: key === 'points' ? Number(value) : value
        }
      }));
    } else if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'maxParticipants') {
      setForm((prev) => ({ ...prev, maxParticipants: Number(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      // Basic validation
      if (!form.title || !form.description || !form.startDate || !form.endDate) {
        throw new Error('Please fill in title, description, start and end dates');
      }
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        category: form.category,
        startDate: form.startDate,
        endDate: form.endDate,
        isPublic: form.isPublic,
        maxParticipants: form.maxParticipants,
        requirements: {
          booksToRead: Number(form.requirements.booksToRead) || 0,
          pagesToRead: Number(form.requirements.pagesToRead) || 0,
          minutesToRead: Number(form.requirements.minutesToRead) || 0,
          streakDays: Number(form.requirements.streakDays) || 0,
          genres: Array.isArray(form.requirements.genres) ? form.requirements.genres : []
        },
        rewards: {
          points: Number(form.rewards.points) || 0,
          badge: form.rewards.badge || '',
          title: form.rewards.title || ''
        }
      };

      await createChallengeApi(payload);
      setShowCreateModal(false);
      setForm({
        title: '',
        description: '',
        type: 'seasonal',
        category: 'summer',
        startDate: '',
        endDate: '',
        isPublic: true,
        maxParticipants: 1000,
        requirements: { booksToRead: 0, pagesToRead: 0, minutesToRead: 0, streakDays: 0, genres: [] },
        rewards: { points: 0, badge: '', title: '' }
      });
      await loadChallenges();
    } catch (err) {
      setCreateError(err?.message || 'Failed to create challenge');
    } finally {
      setCreating(false);
    }
  };

  const loadUserChallenges = async () => {
    try {
      const response = await getUserChallenges();
      setUserChallenges(response.data);
    } catch (error) {
      console.error('Error loading user challenges:', error);
    }
  };

  const handleJoinChallenge = async (challengeId) => {
    try {
      await joinChallenge(challengeId);
      await loadChallenges();
      await loadUserChallenges();
    } catch (error) {
      console.error('Error joining challenge:', error);
      alert(error.message || 'Failed to join challenge');
    }
  };

  const handleLeaveChallenge = async (challengeId) => {
    try {
      await leaveChallenge(challengeId);
      await loadChallenges();
      await loadUserChallenges();
    } catch (error) {
      console.error('Error leaving challenge:', error);
      alert(error.message || 'Failed to leave challenge');
    }
  };

  const isParticipating = (challengeId) => {
    return userChallenges.some(c => c._id === challengeId);
  };

  const getChallengeIcon = (type, category) => {
    const icons = {
      seasonal: {
        summer: '☀️',
        winter: '❄️',
        spring: '🌸',
        fall: '🍂',
        holiday: '🎄'
      },
      genre: {
        mystery: '🔍',
        romance: '💕',
        fantasy: '🐉',
        scifi: '🚀',
        nonfiction: '📚',
        classic: '🏛️'
      },
      streak: '🔥',
      custom: '🎯'
    };

    if (type === 'seasonal' && icons.seasonal[category]) {
      return icons.seasonal[category];
    }
    if (type === 'genre' && icons.genre[category]) {
      return icons.genre[category];
    }
    return icons[type] || '📖';
  };

  const getProgressPercentage = (participant, requirements) => {
    if (!participant || !requirements) return 0;
    
    const booksProgress = requirements.booksToRead > 0 ? 
      (participant.progress.booksRead / requirements.booksToRead) * 100 : 100;
    const pagesProgress = requirements.pagesToRead > 0 ? 
      (participant.progress.pagesRead / requirements.pagesToRead) * 100 : 100;
    const minutesProgress = requirements.minutesToRead > 0 ? 
      (participant.progress.minutesRead / requirements.minutesToRead) * 100 : 100;

    return Math.min(booksProgress, pagesProgress, minutesProgress);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const isChallengeActive = (challenge) => {
    const now = new Date();
    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);
    return challenge.isActive && now >= startDate && now <= endDate;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="challenges-container">
      <div className="challenges-header">
        <h1>Reading Challenges</h1>
        <p>Join exciting reading challenges and compete with fellow book lovers!</p>
        {isAdminUser && (
          <div style={{ marginTop: 15 }}>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowCreateModal(true)}
              style={{ 
                backgroundColor: '#28a745', 
                borderColor: '#28a745',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)'
              }}
            >
              + Create Challenge
            </button>
          </div>
        )}
      </div>

      <div className="challenges-tabs">
        <button 
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Challenges
        </button>
        <button 
          className={`tab ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          My Challenges
        </button>
      </div>

      {activeTab === 'all' && (
        <div className="challenges-filters">
          <select 
            value={filters.type} 
            onChange={(e) => setFilters({...filters, type: e.target.value})}
          >
            <option value="">All Types</option>
            <option value="seasonal">Seasonal</option>
            <option value="genre">Genre</option>
            <option value="streak">Streak</option>
            <option value="custom">Custom</option>
          </select>
          <select 
            value={filters.category} 
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">All Categories</option>
            <option value="summer">Summer</option>
            <option value="winter">Winter</option>
            <option value="spring">Spring</option>
            <option value="fall">Fall</option>
            <option value="holiday">Holiday</option>
            <option value="mystery">Mystery</option>
            <option value="romance">Romance</option>
            <option value="fantasy">Fantasy</option>
            <option value="scifi">Sci-Fi</option>
            <option value="nonfiction">Non-Fiction</option>
            <option value="classic">Classic</option>
          </select>
        </div>
      )}

      <div className="challenges-grid">
        {(activeTab === 'all' ? challenges : userChallenges).map((challenge) => {
          const isParticipatingInThis = isParticipating(challenge._id);
          const participant = isParticipatingInThis ?
            challenge.participants.find(p => {
              const participantUserId = (p.user && p.user._id) ? p.user._id : p.user;
              return participantUserId?.toString() === user?.id;
            }) : null;
          const progressPercentage = getProgressPercentage(participant, challenge.requirements);
          const daysRemaining = getDaysRemaining(challenge.endDate);

          return (
            <div key={challenge._id} className="challenge-card">
              <div className="challenge-header">
                <div className="challenge-icon">
                  {getChallengeIcon(challenge.type, challenge.category)}
                </div>
                <div className="challenge-info">
                  <h3>{challenge.title}</h3>
                  <span className="challenge-type">{challenge.type} • {challenge.category}</span>
                </div>
                {isParticipatingInThis && (
                  <div className="participating-badge">Joined</div>
                )}
              </div>

              <p className="challenge-description">{challenge.description}</p>

              <div className="challenge-dates">
                <span>📅 {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}</span>
                {daysRemaining > 0 && (
                  <span className="days-remaining">{daysRemaining} days left</span>
                )}
              </div>

              <div className="challenge-requirements">
                <h4>Requirements:</h4>
                <ul>
                  {challenge.requirements.booksToRead > 0 && (
                    <li>📚 {challenge.requirements.booksToRead} books</li>
                  )}
                  {challenge.requirements.pagesToRead > 0 && (
                    <li>📄 {challenge.requirements.pagesToRead} pages</li>
                  )}
                  {challenge.requirements.minutesToRead > 0 && (
                    <li>⏱️ {challenge.requirements.minutesToRead} minutes</li>
                  )}
                  {challenge.requirements.streakDays > 0 && (
                    <li>🔥 {challenge.requirements.streakDays} day streak</li>
                  )}
                </ul>
              </div>

              {isParticipatingInThis && participant && (
                <div className="challenge-progress">
                  <h4>Your Progress:</h4>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${progressPercentage}%`}}
                    ></div>
                  </div>
                  <div className="progress-stats">
                    <span>📚 {participant.progress.booksRead}/{challenge.requirements.booksToRead}</span>
                    <span>📄 {participant.progress.pagesRead}/{challenge.requirements.pagesToRead}</span>
                    <span>⏱️ {participant.progress.minutesRead}/{challenge.requirements.minutesToRead}</span>
                  </div>
                  {participant.completed && (
                    <div className="completion-badge">🎉 Completed!</div>
                  )}
                </div>
              )}

              <div className="challenge-rewards">
                <h4>Rewards:</h4>
                <div className="rewards-list">
                  {challenge.rewards.points > 0 && (
                    <span className="reward">🏆 {challenge.rewards.points} points</span>
                  )}
                  {challenge.rewards.badge && (
                    <span className="reward">🏅 {challenge.rewards.badge}</span>
                  )}
                  {challenge.rewards.title && (
                    <span className="reward">👑 {challenge.rewards.title}</span>
                  )}
                </div>
              </div>

              <div className="challenge-participants">
                <span>👥 {challenge.participants.length} participants</span>
              </div>

              <div className="challenge-actions">
                {isParticipatingInThis ? (
                  <div className="action-buttons">
                    <Link 
                      to={`/challenges/${challenge._id}`} 
                      className="btn btn-primary"
                    >
                      View Details
                    </Link>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleLeaveChallenge(challenge._id)}
                    >
                      Leave Challenge
                    </button>
                  </div>
                ) : (
                  <div className="action-buttons">
                    <Link 
                      to={`/challenges/${challenge._id}`} 
                      className="btn btn-secondary"
                    >
                      View Details
                    </Link>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleJoinChallenge(challenge._id)}
                      disabled={!isChallengeActive(challenge)}
                    >
                      Join Challenge
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {challenges.length === 0 && (
        <div className="no-challenges">
          <p>No challenges available at the moment.</p>
          <p>Check back later for new reading challenges!</p>
        </div>
      )}

      {isAdminUser && showCreateModal && (
        <div className="modal-backdrop" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Create New Challenge</h3>
            {createError && (
              <div className="error-banner">{createError}</div>
            )}
            <form onSubmit={handleCreateSubmit} className="form-grid">
              <label>
                <span>Title</span>
                <input name="title" value={form.title} onChange={handleCreateChange} required />
              </label>
              <label className="full">
                <span>Description</span>
                <textarea name="description" value={form.description} onChange={handleCreateChange} required />
              </label>
              <label>
                <span>Type</span>
                <select name="type" value={form.type} onChange={handleCreateChange}>
                  <option value="seasonal">Seasonal</option>
                  <option value="genre">Genre</option>
                  <option value="streak">Streak</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label>
                <span>Category</span>
                <select name="category" value={form.category} onChange={handleCreateChange}>
                  <option value="summer">Summer</option>
                  <option value="winter">Winter</option>
                  <option value="spring">Spring</option>
                  <option value="fall">Fall</option>
                  <option value="holiday">Holiday</option>
                  <option value="mystery">Mystery</option>
                  <option value="romance">Romance</option>
                  <option value="fantasy">Fantasy</option>
                  <option value="scifi">Sci-Fi</option>
                  <option value="nonfiction">Non-Fiction</option>
                  <option value="classic">Classic</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                <span>Start Date</span>
                <input type="date" name="startDate" value={form.startDate} onChange={handleCreateChange} required />
              </label>
              <label>
                <span>End Date</span>
                <input type="date" name="endDate" value={form.endDate} onChange={handleCreateChange} required />
              </label>
              <label>
                <span>Public</span>
                <input type="checkbox" name="isPublic" checked={form.isPublic} onChange={handleCreateChange} />
              </label>
              <label>
                <span>Max Participants</span>
                <input type="number" min="1" name="maxParticipants" value={form.maxParticipants} onChange={handleCreateChange} />
              </label>

              <div className="section full">
                <h4 style={{ margin: '10px 0' }}>Requirements</h4>
                <div className="two-col">
                  <label>
                    <span>Books to Read</span>
                    <input type="number" min="0" name="requirements.booksToRead" value={form.requirements.booksToRead} onChange={handleCreateChange} />
                  </label>
                  <label>
                    <span>Pages to Read</span>
                    <input type="number" min="0" name="requirements.pagesToRead" value={form.requirements.pagesToRead} onChange={handleCreateChange} />
                  </label>
                  <label>
                    <span>Minutes to Read</span>
                    <input type="number" min="0" name="requirements.minutesToRead" value={form.requirements.minutesToRead} onChange={handleCreateChange} />
                  </label>
                  <label>
                    <span>Streak Days</span>
                    <input type="number" min="0" name="requirements.streakDays" value={form.requirements.streakDays} onChange={handleCreateChange} />
                  </label>
                  <label className="full">
                    <span>Genres (comma separated)</span>
                    <input name="requirements.genres" value={form.requirements.genres.join(', ')} onChange={handleCreateChange} />
                  </label>
                </div>
              </div>

              <div className="section full">
                <h4 style={{ margin: '10px 0' }}>Rewards</h4>
                <div className="two-col">
                  <label>
                    <span>Points</span>
                    <input type="number" min="0" name="rewards.points" value={form.rewards.points} onChange={handleCreateChange} />
                  </label>
                  <label>
                    <span>Badge</span>
                    <input name="rewards.badge" value={form.rewards.badge} onChange={handleCreateChange} />
                  </label>
                  <label className="full">
                    <span>Title</span>
                    <input name="rewards.title" value={form.rewards.title} onChange={handleCreateChange} />
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => !creating && setShowCreateModal(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Challenge'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Challenges;
