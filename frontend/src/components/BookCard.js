import React from 'react';
import './BookCard.css';
import ScrollAnimation from './ScrollAnimation';

const BookCard = ({ book, onAddToList, onEdit, onDelete, showActions = true, animated = true }) => {
  const handleAddToList = (status) => {
    onAddToList(book._id, status);
  };

  const CardWrapper = animated ? ScrollAnimation : 'div';
  const cardProps = animated ? { animation: 'fade-in-up', delay: 0.1 } : {};

  return (
    <CardWrapper {...cardProps}>
      <div className="book-card hover-lift">
        <div className="book-cover">
        {book.coverImage ? (
          <img src={book.coverImage} alt={book.title} />
        ) : (
          <div className="book-cover-placeholder">
            <span>{book.title.charAt(0)}</span>
          </div>
        )}
      </div>
      
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">by {book.author}</p>
        
        {book.genre && book.genre.length > 0 && (
          <div className="book-genres">
            {book.genre.slice(0, 3).map((genre, index) => (
              <span key={index} className="genre-tag">{genre}</span>
            ))}
          </div>
        )}
        
        {book.publishedYear && (
          <p className="book-year">{book.publishedYear}</p>
        )}
        
        {book.pageCount && (
          <p className="book-pages">{book.pageCount} pages</p>
        )}
        
        {book.description && (
          <p className="book-description">{book.description}</p>
        )}
      </div>

      {showActions && (
        <div className="book-actions">
          <div className="add-to-list-buttons">
            <button 
              className="btn btn-primary btn-sm hover-scale"
              onClick={() => handleAddToList('want-to-read')}
            >
              Want to Read
            </button>
            <button 
              className="btn btn-success btn-sm hover-scale"
              onClick={() => handleAddToList('currently-reading')}
            >
              Currently Reading
            </button>
          </div>
          
          <div className="book-management-buttons">
            <button 
              className="btn btn-outline btn-sm hover-scale"
              onClick={() => onEdit(book)}
            >
              Edit
            </button>
            <button 
              className="btn btn-danger btn-sm hover-scale"
              onClick={() => onDelete(book._id)}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
    </CardWrapper>
  );
};

export default BookCard;
