import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBook, FiUser, FiHash, FiImage, FiFileText, FiTag, FiCalendar, FiGlobe, FiSave, FiArrowLeft } from 'react-icons/fi';
import { bookApi } from '../api/bookApi';
import './CreateBook.css';

const CreateBook = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    coverImage: '',
    description: '',
    genre: [],
    publishedYear: '',
    pageCount: '',
    language: 'English'
  });

  const [selectedGenres, setSelectedGenres] = useState([]);

  const genreOptions = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance', 'Science Fiction',
    'Fantasy', 'Historical Fiction', 'Biography', 'Autobiography', 'Memoir',
    'Self-Help', 'Business', 'Philosophy', 'Religion', 'Science', 'Technology',
    'Travel', 'Cooking', 'Art', 'Music', 'Poetry', 'Drama', 'Horror',
    'Young Adult', 'Children', 'Comics', 'Graphic Novel', 'Manga', 'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenreToggle = (genre) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const bookData = {
        ...formData,
        genre: selectedGenres,
        publishedYear: formData.publishedYear ? parseInt(formData.publishedYear) : undefined,
        pageCount: formData.pageCount ? parseInt(formData.pageCount) : undefined
      };

      await bookApi.createBook(bookData);
      setSuccess('Book added successfully!');
      
      // Reset form
      setFormData({
        title: '',
        author: '',
        isbn: '',
        coverImage: '',
        description: '',
        genre: [],
        publishedYear: '',
        pageCount: '',
        language: 'English'
      });
      setSelectedGenres([]);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/reading-progress');
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'Failed to create book');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/reading-progress');
  };

  return (
    <div className="create-book-page">
      <div className="page-header">
        <button className="back-btn" onClick={handleBack}>
          <FiArrowLeft />
          <span>Back to Reading Progress</span>
        </button>
        <h1>Add New Book</h1>
        <p>Manually add a book to your personal library</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="create-book-form-container">
        <form onSubmit={handleSubmit} className="create-book-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="title">
                <FiBook />
                Book Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter book title"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="author">
                <FiUser />
                Author *
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                placeholder="Enter author name"
                required
                className="form-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="isbn">
                  <FiHash />
                  ISBN
                </label>
                <input
                  type="text"
                  id="isbn"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleInputChange}
                  placeholder="Enter ISBN (optional)"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="language">
                  <FiGlobe />
                  Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Italian">Italian</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Russian">Russian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Publication Details</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="publishedYear">
                  <FiCalendar />
                  Published Year
                </label>
                <input
                  type="number"
                  id="publishedYear"
                  name="publishedYear"
                  value={formData.publishedYear}
                  onChange={handleInputChange}
                  placeholder="e.g., 2023"
                  min="1000"
                  max={new Date().getFullYear() + 1}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="pageCount">
                  <FiFileText />
                  Page Count
                </label>
                <input
                  type="number"
                  id="pageCount"
                  name="pageCount"
                  value={formData.pageCount}
                  onChange={handleInputChange}
                  placeholder="e.g., 350"
                  min="1"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Genres & Categories</h3>
            
            <div className="genre-selection">
              <p className="genre-hint">Select all that apply:</p>
              <div className="genre-grid">
                {genreOptions.map(genre => (
                  <button
                    key={genre}
                    type="button"
                    className={`genre-chip ${selectedGenres.includes(genre) ? 'selected' : ''}`}
                    onClick={() => handleGenreToggle(genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Cover & Description</h3>
            
            <div className="form-group">
              <label htmlFor="coverImage">
                <FiImage />
                Cover Image URL
              </label>
              <input
                type="url"
                id="coverImage"
                name="coverImage"
                value={formData.coverImage}
                onChange={handleInputChange}
                placeholder="https://example.com/book-cover.jpg"
                className="form-input"
              />
              {formData.coverImage && (
                <div className="cover-preview">
                  <img 
                    src={formData.coverImage} 
                    alt="Cover preview" 
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description">
                <FiFileText />
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter a brief description of the book..."
                rows="4"
                className="form-textarea"
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={handleBack}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !formData.title || !formData.author}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Adding Book...
                </>
              ) : (
                <>
                  <FiSave />
                  Add Book
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBook;
