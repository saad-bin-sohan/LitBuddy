import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

const ReviewForm = ({ bookId, onReviewAdded }) => {
  const { user, token } = useContext(AuthContext);
  const [rating, setRating] = useState(1);
  const [reviewText, setReviewText] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to add a review');
      return;
    }
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/reviews`, {
        bookId,
        rating,
        reviewText,
        spoiler,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      onReviewAdded(response.data.review);
      setRating(1);
      setReviewText('');
      setSpoiler(false);
    } catch (error) {
      console.error('Failed to add review:', error);
      alert('Failed to add review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add a Review</h3>
      <label>
        Rating:
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((num) => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </label>
      <br />
      <label>
        Review:
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          required
        />
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={spoiler}
          onChange={(e) => setSpoiler(e.target.checked)}
        />
        Contains Spoilers
      </label>
      <br />
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
};

export default ReviewForm;
