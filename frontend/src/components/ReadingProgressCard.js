import React, { useState } from 'react';
import './ReadingProgressCard.css';

const ReadingProgressCard = ({ progress, onUpdateProgress, onRemoveFromList, onMoveToList }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    currentPage: progress.currentPage,
    rating: progress.rating || '',
    review: progress.review || '',
    notes: progress.notes || ''
  });

  const handleSave = () => {
    onUpdateProgress(progress._id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      currentPage: progress.currentPage,
      rating: progress.rating || '',
      review: progress.review || '',
      notes: progress.notes || ''
    });
    setIsEditing(false);
  };

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'completed') {
      onUpdateProgress(progress._id, { 
        status: newStatus, 
        currentPage: progress.totalPages,
        finishDate: new Date()
      });
    } else {
      onUpdateProgress(progress._id, { status: newStatus });
    }
  };

  const progressPercentage = Math.round((progress.currentPage / progress.totalPages) * 100);

  return (
    <div className="reading-progress-card">
      <div className="book-cover">
        {progress.book.coverImage ? (
          <img src={progress.book.coverImage} alt={progress.book.title} />
        ) : (
          <div className="book-cover-placeholder">
            <span>{progress.book.title.charAt(0)}</span>
          </div>
        )}
      </div>
      
      <div className="book-info">
        <h3 className="book-title">{progress.book.title}</h3>
        <p className="book-author">by {progress.book.author}</p>
        
        <div className="progress-info">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="progress-text">
            {progress.currentPage} / {progress.totalPages} pages ({progressPercentage}%)
          </p>
        </div>

        {progress.status === 'currently-reading' && (
          <div className="reading-actions">
            <button 
              className="btn btn-success btn-sm"
              onClick={() => handleStatusChange('completed')}
            >
              Mark as Complete
            </button>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setIsEditing(true)}
            >
              Update Progress
            </button>
          </div>
        )}

        {progress.status === 'completed' && progress.rating && (
          <div className="rating">
            <span className="stars">
              {'★'.repeat(progress.rating)}{'☆'.repeat(5 - progress.rating)}
            </span>
            <span className="rating-text">{progress.rating}/5</span>
          </div>
        )}

        {progress.review && (
          <p className="review">{progress.review}</p>
        )}

        {progress.notes && (
          <p className="notes">{progress.notes}</p>
        )}
      </div>

      <div className="list-actions">
        <div className="status-buttons">
          <button 
            className={`btn btn-sm ${progress.status === 'want-to-read' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleStatusChange('want-to-read')}
          >
            Want to Read
          </button>
          <button 
            className={`btn btn-sm ${progress.status === 'currently-reading' ? 'btn-success' : 'btn-outline'}`}
            onClick={() => handleStatusChange('currently-reading')}
          >
            Currently Reading
          </button>
          <button 
            className={`btn btn-sm ${progress.status === 'completed' ? 'btn-success' : 'btn-outline'}`}
            onClick={() => handleStatusChange('completed')}
          >
            Completed
          </button>
          <button 
            className={`btn btn-sm ${progress.status === 'dnf' ? 'btn-warning' : 'btn-outline'}`}
            onClick={() => handleStatusChange('dnf')}
          >
            DNF
          </button>
        </div>
        
        <button 
          className="btn btn-danger btn-sm"
          onClick={() => onRemoveFromList(progress._id)}
        >
          Remove
        </button>
      </div>

      {isEditing && (
        <div className="edit-overlay">
          <div className="edit-form">
            <h4>Update Progress</h4>
            
            <div className="form-group">
              <label>Current Page:</label>
              <input
                type="number"
                min="0"
                max={progress.totalPages}
                value={editData.currentPage}
                onChange={(e) => setEditData({...editData, currentPage: parseInt(e.target.value)})}
              />
            </div>

            <div className="form-group">
              <label>Rating (1-5):</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editData.rating}
                onChange={(e) => setEditData({...editData, rating: parseInt(e.target.value)})}
              />
            </div>

            <div className="form-group">
              <label>Review:</label>
              <textarea
                value={editData.review}
                onChange={(e) => setEditData({...editData, review: e.target.value})}
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Notes:</label>
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({...editData, notes: e.target.value})}
                rows="2"
              />
            </div>

            <div className="edit-actions">
              <button className="btn btn-success btn-sm" onClick={handleSave}>
                Save
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingProgressCard;
