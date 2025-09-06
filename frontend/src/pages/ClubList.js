import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getClubs, joinClub, leaveClub } from '../api/clubApi';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './ClubList.css';

const ClubList = () => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    theme: '',
    search: '',
    myClubs: false
  });
  const [joiningClub, setJoiningClub] = useState(null);

  useEffect(() => {
    loadClubs();
  }, [filters]);

  const loadClubs = async () => {
    try {
      setLoading(true);
      const response = await getClubs(filters);
      setClubs(response.clubs);
    } catch (error) {
      console.error('Error loading clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (clubId) => {
    setJoiningClub(clubId);
    try {
      await joinClub(clubId);
      await loadClubs(); // Refresh the list
    } catch (error) {
      console.error('Error joining club:', error);
      alert(error.message || 'Failed to join club');
    } finally {
      setJoiningClub(null);
    }
  };

  const handleLeaveClub = async (clubId) => {
    if (!window.confirm('Are you sure you want to leave this club?')) return;

    setJoiningClub(clubId);
    try {
      await leaveClub(clubId);
      await loadClubs(); // Refresh the list
    } catch (error) {
      console.error('Error leaving club:', error);
      alert(error.message || 'Failed to leave club');
    } finally {
      setJoiningClub(null);
    }
  };

  const getThemeIcon = (theme) => {
    const icons = {
      mystery: '🔍',
      romance: '💕',
      fantasy: '🐉',
      scifi: '🚀',
      nonfiction: '📚',
      classic: '🏛️',
      historical: '📜',
      biography: '👤',
      'self-help': '💡',
      other: '📖'
    };
    return icons[theme] || '📖';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="club-list-container">
      <div className="club-list-header">
        <h1>Book Clubs</h1>
        <p>Discover and join reading communities that match your interests</p>
        <Link to="/clubs/create" className="btn btn-primary">
          + Create Club
        </Link>
      </div>

      <div className="club-list-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search clubs..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="search-input"
          />
          <select
            value={filters.theme}
            onChange={(e) => setFilters({...filters, theme: e.target.value})}
          >
            <option value="">All Themes</option>
            <option value="mystery">Mystery</option>
            <option value="romance">Romance</option>
            <option value="fantasy">Fantasy</option>
            <option value="scifi">Sci-Fi</option>
            <option value="nonfiction">Non-Fiction</option>
            <option value="classic">Classic</option>
            <option value="historical">Historical</option>
            <option value="biography">Biography</option>
            <option value="self-help">Self-Help</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="filter-toggle">
          <label>
            <input
              type="checkbox"
              checked={filters.myClubs}
              onChange={(e) => setFilters({...filters, myClubs: e.target.checked})}
            />
            My Clubs Only
          </label>
        </div>
      </div>

      <div className="club-grid">
        {clubs.map((club) => (
          <div key={club._id} className="club-card">
            <div className="club-card-header">
              <div className="club-theme-icon">
                {getThemeIcon(club.theme)}
              </div>
              <div className="club-card-info">
                <h3>{club.name}</h3>
                <span className="club-theme">{club.theme}</span>
              </div>
              {club.membership?.isMember && (
                <div className="membership-badge">Member</div>
              )}
            </div>

            <p className="club-description">{club.description}</p>

            <div className="club-stats">
              <span>👥 {club.memberCount} members</span>
              <span>📅 Created {formatDate(club.createdAt)}</span>
            </div>

            {club.currentBook && (
              <div className="club-current-book">
                <h4>Currently Reading:</h4>
                <p>{club.currentBook.title}</p>
                {club.currentBook.author && <p>by {club.currentBook.author}</p>}
              </div>
            )}

            <div className="club-card-actions">
              <Link to={`/clubs/${club._id}`} className="btn btn-secondary">
                View Details
              </Link>

              {club.membership?.isMember ? (
                <button
                  className="btn btn-outline"
                  onClick={() => handleLeaveClub(club._id)}
                  disabled={joiningClub === club._id}
                >
                  {joiningClub === club._id ? 'Leaving...' : 'Leave Club'}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleJoinClub(club._id)}
                  disabled={joiningClub === club._id || club.memberCount >= club.maxMembers}
                >
                  {joiningClub === club._id ? 'Joining...' :
                   club.memberCount >= club.maxMembers ? 'Club Full' : 'Join Club'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {clubs.length === 0 && (
        <div className="no-clubs">
          <div className="no-clubs-icon">📚</div>
          <h3>No clubs found</h3>
          <p>
            {filters.myClubs
              ? "You haven't joined any clubs yet."
              : "No clubs match your current filters."}
          </p>
          {!filters.myClubs && (
            <Link to="/clubs/create" className="btn btn-primary">
              Create the First Club
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default ClubList;
