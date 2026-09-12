import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { apiJson } from '../api/httpClient';

const ReviewForm = ({ bookId, onReviewAdded }) => {
  const { user } = useContext(AuthContext);
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
      // 2026-09 fix: this used a raw axios.post() that never sent the
      // 'X-Requested-With' header backend/middleware/csrfMiddleware.js
      // requires on mutating requests -- submitting a review was
      // silently rejected with a 403 before reaching the controller.
      // apiJson() (used everywhere else in the app) sends it
      // automatically.
      const data = await apiJson('/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookId, rating, reviewText, spoiler }),
        errorMessage: 'Failed to add review',
      });

      onReviewAdded(data.review);
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
