import React, { useState } from 'react';
import { googleBooksApi } from '../api/googleBooksApi';
import './GoogleBooksSearch.css';

const GoogleBooksSearch = ({ onImportBook, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedBook, setSelectedBook] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const results = await googleBooksApi.searchBooks(searchQuery.trim(), 1);
      setSearchResults(results.results || []);
      setTotalPages(results.totalPages || 0);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (page) => {
    try {
      setLoading(true);
      const results = await googleBooksApi.searchBooks(searchQuery.trim(), page);
      setSearchResults(results.results || []);
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSelect = async (book) => {
    try {
      setLoading(true);
      const detailedBook = await googleBooksApi.getBookById(book.googleBooksId);
      setSelectedBook(detailedBook);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedBook) return;

    try {
      setLoading(true);
      await googleBooksApi.importBook({
        googleBooksId: selectedBook.googleBooksId,
        status: 'want-to-read',
        totalPages: selectedBook.pages // Include totalPages to fix the validation error
      });

      if (onImportBook) {
        onImportBook(selectedBook);
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedBook(null);
    setError(null);
    onClose();
  };

  return (
    <div className="googlebooks-search-overlay">
      <div className="googlebooks-search-modal">
        <div className="modal-header">
          <h2>Search Google Books</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for books by title, author, or ISBN..."
              className="search-input"
            />
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="search-results">
            <h3>Search Results</h3>
            <div className="results-grid">
              {searchResults.map((book) => (
                <div
                  key={book.googleBooksId}
                  className={`result-item ${selectedBook?.googleBooksId === book.googleBooksId ? 'selected' : ''}`}
                  onClick={() => handleBookSelect(book)}
                >
                  <div className="book-cover">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} />
                    ) : (
                      <div className="cover-placeholder">
                        <span>{book.title.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="book-info">
                    <h4>{book.title}</h4>
                    <p className="author">by {book.author}</p>
                    {book.publicationYear && (
                      <p className="year">{book.publicationYear}</p>
                    )}
                    {book.averageRating > 0 && (
                      <div className="rating">
                        <span className="stars">
                          {'★'.repeat(Math.round(book.averageRating))}
                          {'☆'.repeat(5 - Math.round(book.averageRating))}
                        </span>
                        <span className="rating-text">
                          {book.averageRating.toFixed(1)} ({book.ratingsCount} ratings)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="page-btn"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {selectedBook && (
          <div className="selected-book">
            <h3>Selected Book</h3>
            <div className="selected-book-details">
              <div className="book-cover-large">
                {selectedBook.imageUrl ? (
                  <img src={selectedBook.imageUrl} alt={selectedBook.title} />
                ) : (
                  <div className="cover-placeholder-large">
                    <span>{selectedBook.title.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="book-details">
                <h4>{selectedBook.title}</h4>
                <p className="author">by {selectedBook.author}</p>
                {selectedBook.publicationYear && (
                  <p className="year">{selectedBook.publicationYear}</p>
                )}
                {selectedBook.pages && (
                  <p className="pages">{selectedBook.pages} pages</p>
                )}
                {selectedBook.description && (
                  <p className="description">{selectedBook.description}</p>
                )}
                {selectedBook.categories && selectedBook.categories.length > 0 && (
                  <div className="genres">
                    {selectedBook.categories.map((category, index) => (
                      <span key={index} className="genre-tag">{category}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleImport}
                  className="import-btn"
                  disabled={loading}
                >
                  {loading ? 'Importing...' : 'Import to My Library'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleBooksSearch;
