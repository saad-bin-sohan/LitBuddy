import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

const BookReviews = ({ bookId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(`${API_URL}/reviews/book/${bookId}`, {
          withCredentials: true
        });
        setReviews(response.data);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [bookId]);

  if (loading) return <p>Loading reviews...</p>;

  return (
    <div>
      <h3>Book Reviews</h3>
      {reviews.length === 0 ? (
        <p>No reviews yet. Be the first to review this book!</p>
      ) : (
        <ul>
          {reviews.map((review) => (
            <li key={review._id}>
              <p><strong>{review.userId.name}</strong> rated it {review.rating}/5</p>
              {review.spoiler ? (
                <SpoilerText text={review.reviewText} />
              ) : (
                <p>{review.reviewText}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SpoilerText = ({ text }) => {
  const [showSpoiler, setShowSpoiler] = React.useState(false);

  return (
    <div>
      {!showSpoiler ? (
        <button onClick={() => setShowSpoiler(true)}>Show Spoiler</button>
      ) : (
        <p>{text}</p>
      )}
    </div>
  );
};

export default BookReviews;
