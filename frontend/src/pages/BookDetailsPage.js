import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBookOpen, FiUser, FiCalendar, FiFileText, FiStar } from 'react-icons/fi';
import { bookApi } from '../api/bookApi';
import BookReviews from '../components/BookReviews';
import ReviewForm from '../components/ReviewForm';
import './BookDetailsPage.css';

const BookDetailsPage = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewsKey, setReviewsKey] = useState(0); // Key to force re-render of BookReviews

  useEffect(() => {
    fetchBookDetails();
  }, [bookId]);

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      const bookData = await bookApi.getBookById(bookId);
      setBook(bookData);
    } catch (err) {
      setError(err.message || 'Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleReviewAdded = () => {
    // Force re-render of BookReviews component to refresh the list
    setReviewsKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="book-details-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading book details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="book-details-page">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={handleBack} className="btn btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="book-details-page">
        <div className="error-state">
          <h2>Book Not Found</h2>
          <p>The book you're looking for doesn't exist.</p>
          <button onClick={handleBack} className="btn btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="book-details-page">
      <div className="page-header">
        <button className="back-btn" onClick={handleBack}>
          <FiArrowLeft />
          <span>Back</span>
        </button>
        <h1>Book Details</h1>
      </div>

      <div className="book-details-content">
        <div className="book-header">
          <div className="book-cover">
            {book.coverImage ? (
              <img src={book.coverImage} alt={book.title} />
            ) : (
              <div className="no-cover">
                <FiBookOpen />
              </div>
            )}
          </div>
          <div className="book-info">
            <h2>{book.title}</h2>
            <p className="author">
              <FiUser />
              by {book.author}
            </p>
            {book.genre && (
              <p className="genre">
                <FiFileText />
                {book.genre}
              </p>
            )}
            {book.publishedDate && (
              <p className="published-date">
                <FiCalendar />
                Published: {new Date(book.publishedDate).getFullYear()}
              </p>
            )}
            {book.rating && (
              <div className="rating">
                <FiStar />
                <span>{book.rating}/5</span>
              </div>
            )}
          </div>
        </div>

        {book.description && (
          <div className="book-description">
            <h3>Description</h3>
            <p>{book.description}</p>
          </div>
        )}

        {book.isbn && (
          <div className="book-metadata">
            <h3>Additional Information</h3>
            <p><strong>ISBN:</strong> {book.isbn}</p>
            {book.pageCount && <p><strong>Pages:</strong> {book.pageCount}</p>}
            {book.language && <p><strong>Language:</strong> {book.language}</p>}
          </div>
        )}

        {/* Reviews Section */}
        <div className="book-reviews">
          <BookReviews key={reviewsKey} bookId={bookId} />
          <ReviewForm bookId={bookId} onReviewAdded={handleReviewAdded} />
        </div>
      </div>
    </div>
  );
};

export default BookDetailsPage;
