import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getClub, leaveClub, promoteMember, demoteMember, removeMember } from '../api/clubApi';
import { getGroupChats } from '../api/groupChatApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import './ClubDetails.css';

const ClubDetails = () => {
  const { clubId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [club, setClub] = useState(null);
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [managingMember, setManagingMember] = useState(null);

  useEffect(() => {
    loadClubData();
  }, [clubId]);

  const loadClubData = async () => {
    try {
      setLoading(true);
      const [clubData, chatsData] = await Promise.all([
        getClub(clubId),
        getGroupChats(clubId)
      ]);
      setClub(clubData);
      setGroupChats(chatsData);
    } catch (error) {
      console.error('Error loading club data:', error);
      if (error.response?.status === 403) {
        alert('You do not have permission to view this club');
        navigate('/clubs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!window.confirm('Are you sure you want to leave this club?')) return;

    try {
      await leaveClub(clubId);
      navigate('/clubs');
    } catch (error) {
      console.error('Error leaving club:', error);
      alert(error.message || 'Failed to leave club');
    }
  };

  const handlePromoteMember = async (memberId) => {
    setManagingMember(memberId);
    try {
      await promoteMember(clubId, memberId);
      await loadClubData(); // Refresh data
    } catch (error) {
      console.error('Error promoting member:', error);
      alert(error.message || 'Failed to promote member');
    } finally {
      setManagingMember(null);
    }
  };

  const handleDemoteMember = async (memberId) => {
    setManagingMember(memberId);
    try {
      await demoteMember(clubId, memberId);
      await loadClubData(); // Refresh data
    } catch (error) {
      console.error('Error demoting member:', error);
      alert(error.message || 'Failed to demote member');
    } finally {
      setManagingMember(null);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    setManagingMember(memberId);
    try {
      await removeMember(clubId, memberId);
      await loadClubData(); // Refresh data
    } catch (error) {
      console.error('Error removing member:', error);
      alert(error.message || 'Failed to remove member');
    } finally {
      setManagingMember(null);
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

  const canManageClub = () => {
    return club?.membership?.role === 'owner' || club?.membership?.role === 'moderator';
  };

  const canManageMember = (memberRole) => {
    if (club?.membership?.role === 'owner') return true;
    if (club?.membership?.role === 'moderator' && memberRole !== 'owner') return true;
    return false;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!club) {
    return (
      <div className="club-details-container">
        <div className="error-state">
          <h2>Club not found</h2>
          <Link to="/clubs" className="btn btn-primary">Back to Clubs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="club-details-container">
      <div className="club-details-header">
        <div className="club-header-info">
          <div className="club-theme-icon-large">
            {getThemeIcon(club.theme)}
          </div>
          <div>
            <h1>{club.name}</h1>
            <div className="club-meta">
              <span className="club-theme-badge">{club.theme}</span>
              <span>👥 {club.memberCount} members</span>
              <span>📅 Created {formatDate(club.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="club-header-actions">
          {club.membership?.isMember && (
            <>
              <Link to={`/clubs/${clubId}/chat`} className="btn btn-primary">
                💬 Group Chat
              </Link>
              {club.membership.role === 'owner' && (
                <Link to={`/clubs/${clubId}/manage`} className="btn btn-secondary">
                  ⚙️ Manage Club
                </Link>
              )}
              <button className="btn btn-outline" onClick={handleLeaveClub}>
                Leave Club
              </button>
            </>
          )}
        </div>
      </div>

      <div className="club-details-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({club.members?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          Group Chats ({groupChats.length})
        </button>
      </div>

      <div className="club-details-content">
        {activeTab === 'overview' && (
          <div className="club-overview">
            <div className="club-description-section">
              <h3>About This Club</h3>
              <p>{club.description}</p>
            </div>

            {club.currentBook && (
              <div className="club-current-book-section">
                <h3>Currently Reading</h3>
                <div className="current-book-card">
                  {club.currentBook.coverUrl && (
                    <img
                      src={club.currentBook.coverUrl}
                      alt={club.currentBook.title}
                      className="book-cover"
                    />
                  )}
                  <div className="book-info">
                    <h4>{club.currentBook.title}</h4>
                    {club.currentBook.author && <p>by {club.currentBook.author}</p>}
                    <p className="book-selected-date">
                      Selected {formatDate(club.currentBook.selectedDate)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {club.rules && (
              <div className="club-rules-section">
                <h3>Club Rules</h3>
                <p>{club.rules}</p>
              </div>
            )}

            {club.genres && club.genres.length > 0 && (
              <div className="club-genres-section">
                <h3>Preferred Genres</h3>
                <div className="genre-tags">
                  {club.genres.map((genre, index) => (
                    <span key={index} className="genre-tag">{genre}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="club-members">
            <h3>Members</h3>
            <div className="members-grid">
              {club.members?.map((member) => (
                <div key={member._id} className="member-card">
                  <div className="member-info">
                    <Avatar
                      size={48}
                      name={member.user.displayName || member.user.name}
                      className="member-avatar"
                    />
                    <div className="member-details">
                      <h4>{member.user.displayName || member.user.name}</h4>
                      <span className={`member-role role-${member.role}`}>
                        {member.role}
                      </span>
                      <span className="member-joined">
                        Joined {formatDate(member.joinedAt)}
                      </span>
                    </div>
                  </div>

                  {canManageMember(member.role) && member.user._id !== user._id && (
                    <div className="member-actions">
                      {managingMember === member._id ? (
                        <LoadingSpinner />
                      ) : (
                        <>
                          {member.role === 'member' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handlePromoteMember(member._id)}
                            >
                              Promote
                            </button>
                          )}
                          {member.role === 'moderator' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleDemoteMember(member._id)}
                            >
                              Demote
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRemoveMember(member._id)}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="club-chats">
            <h3>Group Discussions</h3>
            <div className="chats-list">
              {groupChats.map((chat) => (
                <div key={chat._id} className="chat-item">
                  <div className="chat-info">
                    <h4>{chat.name}</h4>
                    {chat.description && <p>{chat.description}</p>}
                    <span className="chat-stats">
                      👥 {chat.participants.length} participants •
                      💬 {chat.messageCount} messages
                    </span>
                  </div>
                  <Link
                    to={`/clubs/${clubId}/chat/${chat._id}`}
                    className="btn btn-primary"
                  >
                    Join Chat
                  </Link>
                </div>
              ))}
            </div>

            {groupChats.length === 0 && (
              <div className="no-chats">
                <p>No group chats available yet.</p>
                {canManageClub() && (
                  <p>Create the first discussion to get started!</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubDetails;
