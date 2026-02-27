import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBookOpen, FiUser, FiCalendar, FiFileText } from 'react-icons/fi';
import { bookApi } from '../api/bookApi';
import BookReviews from '../components/BookReviews';
import ReviewForm from '../components/ReviewForm';
import { AuthContext } from '../contexts/AuthContext';
import './BookDetailsPage.css';

const BookDetailsPage = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewsKey, setReviewsKey] = useState(0);
  const [visibilityUpdating, setVisibilityUpdating] = useState(false);

  const fetchBookDetails = useCallback(async () => {
    try {
      setLoading(true);
      const bookData = await bookApi.getBookById(bookId);
      setBook(bookData);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load book details');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchBookDetails();
  }, [fetchBookDetails]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleReviewAdded = () => {
    setReviewsKey((prev) => prev + 1);
  };

  const ownerId = book && book.createdBy
    ? String(book.createdBy._id || book.createdBy)
    : null;
  const canManageVisibility = !!(user && ownerId && String(user._id) === ownerId);

  const handleToggleVisibility = async () => {
    if (!book || !canManageVisibility) return;

    const nextVisibility = book.visibility === 'public' ? 'private' : 'public';
    try {
      setVisibilityUpdating(true);
      const updatedBook = await bookApi.updateBookVisibility(book._id, nextVisibility);
      setBook(updatedBook);
    } catch (err) {
      setError(err.message || 'Failed to update visibility');
    } finally {
      setVisibilityUpdating(false);
    }
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
          <button onClick={handleBack} className="book-details-btn book-details-btn-primary">
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
          <button onClick={handleBack} className="book-details-btn book-details-btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="book-details-page">
      <div className="book-details-header">
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
                {Array.isArray(book.genre) ? book.genre.join(', ') : book.genre}
              </p>
            )}
            {book.publishedYear && (
              <p className="published-date">
                <FiCalendar />
                Published: {book.publishedYear}
              </p>
            )}

            {canManageVisibility && (
              <div className="book-visibility-controls">
                <p><strong>Visibility:</strong> {book.visibility}</p>
                <button
                  type="button"
                  className="book-details-btn book-details-btn-primary"
                  disabled={visibilityUpdating}
                  onClick={handleToggleVisibility}
                >
                  {visibilityUpdating
                    ? 'Updating...'
                    : `Make ${book.visibility === 'public' ? 'Private' : 'Public'}`}
                </button>
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

        <div className="book-reviews">
          <BookReviews key={reviewsKey} bookId={bookId} />
          <ReviewForm bookId={bookId} onReviewAdded={handleReviewAdded} />
        </div>
      </div>
    </div>
  );
};

export default BookDetailsPage;
