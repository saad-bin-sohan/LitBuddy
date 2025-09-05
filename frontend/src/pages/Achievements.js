import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUserAchievements, 
  markAchievementRead, 
  getGlobalLeaderboard 
} from '../api/challengeApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import './Achievements.css';

const Achievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('achievements');
  const [period, setPeriod] = useState('all');
  const [totalPoints, setTotalPoints] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  useEffect(() => {
    if (activeTab === 'achievements') {
      loadAchievements();
    } else {
      loadLeaderboard();
    }
  }, [activeTab, period, pagination.current]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const response = await getUserAchievements(pagination.current, 20);
      setAchievements(response.data);
      setTotalPoints(response.totalPoints);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await getGlobalLeaderboard(period);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (achievementId) => {
    try {
      await markAchievementRead(achievementId);
      setAchievements(prev => 
        prev.map(achievement => 
          achievement._id === achievementId 
            ? { ...achievement, isRead: true }
            : achievement
        )
      );
    } catch (error) {
      console.error('Error marking achievement as read:', error);
    }
  };

  const getAchievementIcon = (type) => {
    const icons = {
      challenge_completion: '🎉',
      reading_streak: '🔥',
      books_read: '📚',
      pages_read: '📄',
      minutes_read: '⏱️',
      genre_exploration: '🔍',
      seasonal_challenge: '🌍',
      first_challenge: '🎯',
      leaderboard_top: '🏆',
      perfect_streak: '⭐'
    };
    return icons[type] || '🏆';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="achievements-container">
      <div className="achievements-header">
        <h1>Achievements & Leaderboard</h1>
        <p>Track your reading accomplishments and compete with fellow book lovers!</p>
      </div>

      <div className="achievements-tabs">
        <button 
          className={`tab ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          My Achievements
        </button>
        <button 
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Global Leaderboard
        </button>
      </div>

      {activeTab === 'achievements' && (
        <div className="achievements-content">
          <div className="achievements-summary">
            <div className="summary-card">
              <h3>Total Points</h3>
              <div className="points-display">{totalPoints}</div>
            </div>
            <div className="summary-card">
              <h3>Achievements Earned</h3>
              <div className="achievements-count">{achievements.length}</div>
            </div>
            <div className="summary-card">
              <h3>Unread Achievements</h3>
              <div className="unread-count">
                {achievements.filter(a => !a.isRead).length}
              </div>
            </div>
          </div>

          <div className="achievements-grid">
            {achievements.map((achievement) => (
              <div 
                key={achievement._id} 
                className={`achievement-card ${!achievement.isRead ? 'unread' : ''}`}
                onClick={() => !achievement.isRead && handleMarkAsRead(achievement._id)}
              >
                <div className="achievement-icon">
                  {getAchievementIcon(achievement.type)}
                </div>
                <div className="achievement-content">
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                  <div className="achievement-meta">
                    <span className="points">+{achievement.points} points</span>
                    <span className="date">{formatDate(achievement.earnedAt)}</span>
                  </div>
                  {!achievement.isRead && (
                    <div className="unread-indicator">
                      <span>Click to mark as read</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {achievements.length === 0 && (
            <div className="no-achievements">
              <p>No achievements yet!</p>
              <p>Start reading and joining challenges to earn your first achievement.</p>
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                disabled={pagination.current === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.current} of {pagination.pages}
              </span>
              <button 
                onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                disabled={pagination.current === pagination.pages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="leaderboard-content">
          <div className="leaderboard-filters">
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className="period-select"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>

          <div className="leaderboard-table">
            <div className="leaderboard-header">
              <div className="rank-col">Rank</div>
              <div className="user-col">User</div>
              <div className="points-col">Points</div>
              <div className="achievements-col">Achievements</div>
            </div>
            
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.user._id} 
                className={`leaderboard-row ${entry.user._id === user?.id ? 'current-user' : ''}`}
              >
                <div className="rank-col">
                  <span className="rank-icon">{getRankIcon(entry.rank)}</span>
                </div>
                <div className="user-col">
                  <div className="user-info">
                    <Avatar 
                      user={entry.user} 
                      size="small"
                      className="leaderboard-avatar"
                    />
                    <div className="user-details">
                      <span className="user-name">
                        {entry.user.displayName || entry.user.name}
                      </span>
                      {entry.user._id === user?.id && (
                        <span className="you-badge">You</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="points-col">
                  <span className="points-value">{entry.totalPoints}</span>
                </div>
                <div className="achievements-col">
                  <span className="achievements-count">{entry.achievementCount}</span>
                </div>
              </div>
            ))}
          </div>

          {leaderboard.length === 0 && (
            <div className="no-leaderboard">
              <p>No leaderboard data available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Achievements;
