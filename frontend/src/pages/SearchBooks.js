import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiFilter, FiX, FiArrowLeft, FiBookOpen, FiUser, FiCalendar, FiFileText } from 'react-icons/fi';
import { bookApi } from '../api/bookApi';
import { readingProgressApi } from '../api/readingProgressApi';
import BookCard from '../components/BookCard';
import './SearchBooks.css';

const SearchBooks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    author: '',
    genre: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [showAddToList, setShowAddToList] = useState(false);
  const [selectedList, setSelectedList] = useState('want-to-read');

  const genreOptions = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance', 'Science Fiction',
    'Fantasy', 'Historical Fiction', 'Biography', 'Autobiography', 'Memoir',
    'Self-Help', 'Business', 'Philosophy', 'Religion', 'Science', 'Technology',
    'Travel', 'Cooking', 'Art', 'Music', 'Poetry', 'Drama', 'Horror',
    'Young Adult', 'Children', 'Comics', 'Graphic Novel', 'Manga', 'Other'
  ];

  const listOptions = [
    { value: 'want-to-read', label: 'Want to Read' },
    { value: 'currently-reading', label: 'Currently Reading' },
    { value: 'completed', label: 'Completed' }
  ];

  useEffect(() => {
    if (searchQuery || searchFilters.author || searchFilters.genre) {
      performSearch();
    }
  }, [searchQuery, searchFilters]);

  const performSearch = async () => {
    if (!searchQuery && !searchFilters.author && !searchFilters.genre) {
      setBooks([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const searchParams = {};
      if (searchQuery) searchParams.query = searchQuery;
      if (searchFilters.author) searchParams.author = searchFilters.author;
      if (searchFilters.genre) searchParams.genre = searchFilters.genre;

      const results = await bookApi.searchBooks(searchParams);
      setBooks(results);
    } catch (err) {
      setError(err.message || 'Failed to search books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch();
  };

  const handleFilterChange = (name, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setSearchFilters({
      author: '',
      genre: ''
    });
    setSearchQuery('');
  };

  const toggleBookSelection = (bookId) => {
    setSelectedBooks(prev => {
      if (prev.includes(bookId)) {
        return prev.filter(id => id !== bookId);
      } else {
        return [...prev, bookId];
      }
    });
  };

  const handleAddToList = async () => {
    if (selectedBooks.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const promises = selectedBooks.map(bookId => {
        const book = books.find(b => b._id === bookId);
        return readingProgressApi.addToList({
          bookId,
          listType: selectedList,
          status: selectedList === 'currently-reading' ? 'reading' : 
                  selectedList === 'completed' ? 'completed' : 'want-to-read'
        });
      });

      await Promise.all(promises);
      
      // Clear selections and show success
      setSelectedBooks([]);
      setShowAddToList(false);
      
      // Refresh search results
      performSearch();
      
    } catch (err) {
      setError(err.message || 'Failed to add books to list');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/reading-progress');
  };

  const hasActiveFilters = searchQuery || searchFilters.author || searchFilters.genre;

  return (
    <div className="search-books-page">
      <div className="page-header">
        <button className="back-btn" onClick={handleBack}>
          <FiArrowLeft />
          <span>Back to Reading Progress</span>
        </button>
        <h1>Search Books</h1>
        <p>Find books in your library and add them to your reading lists</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="search-container">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <div className="search-input-wrapper">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="clear-search-btn"
                >
                  <FiX />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            >
              <FiFilter />
              Filters
            </button>
            <button type="submit" className="search-btn">
              Search
            </button>
          </div>

          {showFilters && (
            <div className="filters-panel">
              <div className="filters-row">
                <div className="filter-group">
                  <label htmlFor="author-filter">Author</label>
                  <input
                    type="text"
                    id="author-filter"
                    placeholder="Filter by author..."
                    value={searchFilters.author}
                    onChange={(e) => handleFilterChange('author', e.target.value)}
                    className="filter-input"
                  />
                </div>
                <div className="filter-group">
                  <label htmlFor="genre-filter">Genre</label>
                  <select
                    id="genre-filter"
                    value={searchFilters.genre}
                    onChange={(e) => handleFilterChange('genre', e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Genres</option>
                    {genreOptions.map(genre => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="clear-filters-btn"
                >
                  <FiX />
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {selectedBooks.length > 0 && (
        <div className="selection-actions">
          <div className="selection-info">
            <span>{selectedBooks.length} book(s) selected</span>
          </div>
          <div className="selection-controls">
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value)}
              className="list-select"
            >
              {listOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddToList(true)}
              className="btn btn-primary"
            >
              Add to List
            </button>
          </div>
        </div>
      )}

      <div className="search-results">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        ) : books.length > 0 ? (
          <div className="books-grid">
            {books.map(book => (
              <div key={book._id} className="book-item">
                <input
                  type="checkbox"
                  id={`book-${book._id}`}
                  checked={selectedBooks.includes(book._id)}
                  onChange={() => toggleBookSelection(book._id)}
                  className="book-checkbox"
                />
                <label htmlFor={`book-${book._id}`} className="book-checkbox-label">
                  <BookCard
                    book={book}
                    showActions={false}
                    className="selectable-book"
                  />
                </label>
              </div>
            ))}
          </div>
        ) : hasActiveFilters ? (
          <div className="empty-state">
            <FiBookOpen className="empty-icon" />
            <h3>No books found</h3>
            <p>Try adjusting your search criteria or filters</p>
            <button onClick={clearFilters} className="btn btn-outline">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <FiSearch className="empty-icon" />
            <h3>Start searching</h3>
            <p>Enter a book title or author to find books in your library</p>
          </div>
        )}
      </div>

      {/* Add to List Modal */}
      {showAddToList && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add to Reading List</h3>
              <button
                onClick={() => setShowAddToList(false)}
                className="modal-close-btn"
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Add {selectedBooks.length} selected book(s) to your "{listOptions.find(l => l.value === selectedList)?.label}" list?
              </p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowAddToList(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToList}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add to List'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBooks;
