import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBookOpen } from 'react-icons/fi';
import { readingProgressApi } from '../api/readingProgressApi';
import ReviewForm from '../components/ReviewForm';
import './AddReview.css';

const AddReview = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const listsData = await readingProgressApi.getReadingLists();
      // Combine all books from different lists
      const allBooks = [
        ...listsData['currently-reading'],
        ...listsData['completed'],
        ...listsData['want-to-read']
      ];
      setBooks(allBooks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/reading-progress');
  };

  const handleReviewAdded = (review) => {
    // Navigate back to reading progress after successful review submission
    navigate('/reading-progress');
  };

  if (loading) {
    return (
      <div className="add-review-page">
        <div className="loading">Loading your books...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="add-review-page">
        <div className="error">Error: {error}</div>
        <button className="btn btn-outline" onClick={handleBack}>
          Back to Reading Progress
        </button>
      </div>
    );
  }

  return (
    <div className="add-review-page">
      <div className="page-header">
        <button className="back-btn" onClick={handleBack}>
          <FiArrowLeft />
          <span>Back to Reading Progress</span>
        </button>
        <h1>Add Review & Rating</h1>
        <p>Share your thoughts about a book you've read</p>
      </div>

      {!selectedBook ? (
        <div className="book-selection">
          <h2>Select a Book to Review</h2>
          {books.length === 0 ? (
            <div className="empty-state">
              <FiBookOpen className="empty-icon" />
              <h3>No books available</h3>
              <p>You need to add some books to your reading lists first.</p>
              <button className="btn btn-primary" onClick={() => navigate('/search-books')}>
                Search Books
              </button>
            </div>
          ) : (
            <div className="books-grid">
              {books.map(progress => (
                <div
                  key={progress._id}
                  className="book-card selectable"
                  onClick={() => setSelectedBook(progress.book)}
                >
                  <div className="book-cover">
                    {progress.book.coverImage ? (
                      <img src={progress.book.coverImage} alt={progress.book.title} />
                    ) : (
                      <div className="no-cover">
                        <FiBookOpen />
                      </div>
                    )}
                  </div>
                  <div className="book-info">
                    <h3>{progress.book.title}</h3>
                    <p className="author">by {progress.book.author}</p>
                    <div className="book-status">
                      <span className={`status-badge ${progress.listType}`}>
                        {progress.listType.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="review-form-section">
          <div className="selected-book-header">
            <button
              className="change-book-btn"
              onClick={() => setSelectedBook(null)}
            >
              Change Book
            </button>
            <div className="selected-book-info">
              <h2>Review: {selectedBook.title}</h2>
              <p>by {selectedBook.author}</p>
            </div>
          </div>

          <ReviewForm
            bookId={selectedBook._id}
            onReviewAdded={handleReviewAdded}
          />
        </div>
      )}
    </div>
  );
};

export default AddReview;
