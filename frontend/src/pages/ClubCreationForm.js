import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createClub } from '../api/clubApi';
import LoadingSpinner from '../components/LoadingSpinner';
import './ClubCreationForm.css';

const ClubCreationForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    theme: 'other',
    genres: [],
    isPrivate: false,
    maxMembers: 50,
    rules: '',
    meetingSchedule: {
      frequency: 'none',
      dayOfWeek: '',
      time: '',
      timezone: 'UTC'
    },
    tags: []
  });

  const [tagInput, setTagInput] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const themes = [
    { value: 'mystery', label: 'Mystery', icon: '🔍' },
    { value: 'romance', label: 'Romance', icon: '💕' },
    { value: 'fantasy', label: 'Fantasy', icon: '🐉' },
    { value: 'scifi', label: 'Sci-Fi', icon: '🚀' },
    { value: 'nonfiction', label: 'Non-Fiction', icon: '📚' },
    { value: 'classic', label: 'Classic', icon: '🏛️' },
    { value: 'historical', label: 'Historical', icon: '📜' },
    { value: 'biography', label: 'Biography', icon: '👤' },
    { value: 'self-help', label: 'Self-Help', icon: '💡' },
    { value: 'other', label: 'Other', icon: '📖' }
  ];

  const availableGenres = [
    'mystery', 'romance', 'fantasy', 'scifi', 'nonfiction', 'classic',
    'historical', 'biography', 'self-help', 'other'
  ];

  const frequencies = [
    { value: 'none', label: 'No regular meetings' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const daysOfWeek = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMeetingScheduleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      meetingSchedule: {
        ...prev.meetingSchedule,
        [name]: value
      }
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addGenre = () => {
    if (genreInput && !formData.genres.includes(genreInput)) {
      setFormData(prev => ({
        ...prev,
        genres: [...prev.genres, genreInput]
      }));
      setGenreInput('');
    }
  };

  const removeGenre = (genreToRemove) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(genre => genre !== genreToRemove)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Club name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Club name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Club description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.maxMembers < 1 || formData.maxMembers > 500) {
      newErrors.maxMembers = 'Maximum members must be between 1 and 500';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const clubData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        rules: formData.rules.trim(),
        meetingSchedule: formData.meetingSchedule.frequency === 'none'
          ? { frequency: 'none' }
          : formData.meetingSchedule
      };

      const response = await createClub(clubData);
      navigate(`/clubs/${response._id}`);
    } catch (error) {
      console.error('Error creating club:', error);
      setErrors({ submit: error.message || 'Failed to create club' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="club-creation-container">
      <div className="club-creation-header">
        <h1>Create a Book Club</h1>
        <p>Start your own reading community and connect with fellow book lovers</p>
      </div>

      <form onSubmit={handleSubmit} className="club-creation-form">
        {/* Basic Information */}
        <div className="form-section">
          <h2>Basic Information</h2>

          <div className="form-group">
            <label htmlFor="name">Club Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your club name"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your club's focus, goals, and what members can expect..."
              rows="4"
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="theme">Primary Theme *</label>
            <select
              id="theme"
              name="theme"
              value={formData.theme}
              onChange={handleInputChange}
            >
              {themes.map(theme => (
                <option key={theme.value} value={theme.value}>
                  {theme.icon} {theme.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Genres and Tags */}
        <div className="form-section">
          <h2>Genres & Tags</h2>

          <div className="form-group">
            <label>Preferred Genres</label>
            <div className="tag-input-group">
              <select
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
              >
                <option value="">Select a genre...</option>
                {availableGenres.map(genre => (
                  <option key={genre} value={genre}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addGenre}
                className="btn btn-secondary"
                disabled={!genreInput}
              >
                Add Genre
              </button>
            </div>
            <div className="tags-list">
              {formData.genres.map(genre => (
                <span key={genre} className="tag">
                  {genre}
                  <button
                    type="button"
                    onClick={() => removeGenre(genre)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="tag-input-group">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addTag)}
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={addTag}
                className="btn btn-secondary"
                disabled={!tagInput.trim()}
              >
                Add Tag
              </button>
            </div>
            <div className="tags-list">
              {formData.tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="form-section">
          <h2>Club Settings</h2>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleInputChange}
              />
              <span className="checkmark"></span>
              Private Club (invite-only)
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="maxMembers">Maximum Members</label>
            <input
              type="number"
              id="maxMembers"
              name="maxMembers"
              value={formData.maxMembers}
              onChange={handleInputChange}
              min="1"
              max="500"
              className={errors.maxMembers ? 'error' : ''}
            />
            {errors.maxMembers && <span className="error-message">{errors.maxMembers}</span>}
          </div>
        </div>

        {/* Meeting Schedule */}
        <div className="form-section">
          <h2>Meeting Schedule</h2>

          <div className="form-group">
            <label htmlFor="frequency">Meeting Frequency</label>
            <select
              id="frequency"
              name="frequency"
              value={formData.meetingSchedule.frequency}
              onChange={handleMeetingScheduleChange}
            >
              {frequencies.map(freq => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          {formData.meetingSchedule.frequency !== 'none' && (
            <>
              <div className="form-group">
                <label htmlFor="dayOfWeek">Day of Week</label>
                <select
                  id="dayOfWeek"
                  name="dayOfWeek"
                  value={formData.meetingSchedule.dayOfWeek}
                  onChange={handleMeetingScheduleChange}
                >
                  <option value="">Select day...</option>
                  {daysOfWeek.map(day => (
                    <option key={day} value={day}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="time">Time</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.meetingSchedule.time}
                  onChange={handleMeetingScheduleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="timezone">Timezone</label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.meetingSchedule.timezone}
                  onChange={handleMeetingScheduleChange}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Rules */}
        <div className="form-section">
          <h2>Club Rules (Optional)</h2>

          <div className="form-group">
            <label htmlFor="rules">Club Rules</label>
            <textarea
              id="rules"
              name="rules"
              value={formData.rules}
              onChange={handleInputChange}
              placeholder="Set some ground rules for your club members..."
              rows="3"
            />
          </div>
        </div>

        {errors.submit && (
          <div className="error-message submit-error">{errors.submit}</div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/clubs')}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating Club...' : 'Create Club'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClubCreationForm;
