import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { readingProgressApi } from '../api/readingProgressApi';
import { readingGoalApi } from '../api/readingGoalApi';
import ReadingProgressCard from '../components/ReadingProgressCard';
import GoogleBooksSearch from '../components/GoogleBooksSearch';
import './ReadingProgress.css';

const ReadingProgress = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('lists');
  const [readingLists, setReadingLists] = useState({
    'want-to-read': [],
    'currently-reading': [],
    'completed': [],
    'dnf': []
  });
  const [readingStats, setReadingStats] = useState(null);
  const [readingGoals, setReadingGoals] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGoogleBooksSearch, setShowGoogleBooksSearch] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listsData, statsData, goalsData, achievementsData] = await Promise.all([
        readingProgressApi.getReadingLists(),
        readingProgressApi.getReadingStats(),
        readingGoalApi.getReadingGoals(),
        readingGoalApi.getAchievements()
      ]);

      setReadingLists(listsData);
      setReadingStats(statsData);
      setReadingGoals(goalsData);
      setAchievements(achievementsData.achievements || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const handleUpdateProgress = async (progressId, updates) => {
    try {
      await readingProgressApi.updateProgress(progressId, updates);
      loadData(); // Reload to get updated data
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveFromList = async (progressId) => {
    try {
      await readingProgressApi.removeFromList(progressId);
      loadData(); // Reload to get updated data
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateBook = () => {
    navigate('/create-book');
  };

  const handleSearchBooks = () => {
    navigate('/search-books');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="reading-progress-page">
      <div className="page-header">
        <h1>Reading Progress</h1>
      <div className="header-actions">
          <button className="btn btn-primary" onClick={handleCreateBook}>
            Add New Book
          </button>
          <button className="btn btn-outline" onClick={handleSearchBooks}>
            Search Books
          </button>
          <button className="btn btn-success" onClick={() => setShowGoogleBooksSearch(true)}>
            Search Google Books
          </button>
          <button className="btn btn-info" onClick={() => navigate('/add-review')}>
            Add Review / Rating
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'lists' ? 'active' : ''}`}
          onClick={() => setActiveTab('lists')}
        >
          Reading Lists
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
        <button
          className={`tab ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals & Achievements
        </button>
      </div>

      {activeTab === 'lists' && (
        <div className="reading-lists">
          <div className="list-section">
            <h2>Currently Reading ({readingLists['currently-reading'].length})</h2>
            {readingLists['currently-reading'].length > 0 ? (
              <div className="list-grid">
                {readingLists['currently-reading'].map(progress => (
                  <ReadingProgressCard
                    key={progress._id}
                    progress={progress}
                    onUpdateProgress={handleUpdateProgress}
                    onRemoveFromList={handleRemoveFromList}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-state">No books currently being read.</p>
            )}
          </div>

          <div className="list-section">
            <h2>Want to Read ({readingLists['want-to-read'].length})</h2>
            {readingLists['want-to-read'].length > 0 ? (
              <div className="list-grid">
                {readingLists['want-to-read'].map(progress => (
                  <ReadingProgressCard
                    key={progress._id}
                    progress={progress}
                    onUpdateProgress={handleUpdateProgress}
                    onRemoveFromList={handleRemoveFromList}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-state">No books in your want-to-read list.</p>
            )}
          </div>

          <div className="list-section">
            <h2>Completed ({readingLists['completed'].length})</h2>
            {readingLists['completed'].length > 0 ? (
              <div className="list-grid">
                {readingLists['completed'].map(progress => (
                  <ReadingProgressCard
                    key={progress._id}
                    progress={progress}
                    onUpdateProgress={handleUpdateProgress}
                    onRemoveFromList={handleRemoveFromList}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-state">No completed books yet.</p>
            )}
          </div>

          <div className="list-section">
            <h2>Did Not Finish ({readingLists['dnf'].length})</h2>
            {readingLists['dnf'].length > 0 ? (
              <div className="list-grid">
                {readingLists['dnf'].map(progress => (
                  <ReadingProgressCard
                    key={progress._id}
                    progress={progress}
                    onUpdateProgress={handleUpdateProgress}
                    onRemoveFromList={handleRemoveFromList}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-state">No DNF books.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stats' && readingStats && (
        <div className="reading-stats">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Books Read This Year</h3>
              <div className="stat-value">{readingStats.totalBooks}</div>
              <p>Total pages: {readingStats.totalPages}</p>
            </div>

            <div className="stat-card">
              <h3>Reading Streak</h3>
              <div className="stat-value">{readingStats.readingStreak}</div>
              <p>Books completed recently</p>
            </div>

            <div className="stat-card">
              <h3>Average Pages per Book</h3>
              <div className="stat-value">{readingStats.averagePagesPerBook}</div>
              <p>Based on completed books</p>
            </div>

            <div className="stat-card">
              <h3>Currently Reading</h3>
              <div className="stat-value">{readingStats.currentlyReading.length}</div>
              <p>Books in progress</p>
            </div>
          </div>

          {readingStats.currentlyReading.length > 0 && (
            <div className="current-reading-section">
              <h3>Current Reading Progress</h3>
              <div className="current-reading-grid">
                {readingStats.currentlyReading.map((book, index) => (
                  <div key={index} className="current-reading-item">
                    <h4>{book.book.title}</h4>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${book.progressPercentage}%` }}
                      ></div>
                    </div>
                    <p>{book.currentPage} / {book.totalPages} pages ({book.progressPercentage}%)</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'goals' && readingGoals && (
        <div className="reading-goals">
          <div className="goals-section">
            <h2>Yearly Goals</h2>
            <div className="goals-grid">
              <div className="goal-card">
                <h3>Books</h3>
                <div className="goal-progress">
                  <div className="goal-bar">
                    <div 
                      className="goal-fill" 
                      style={{ width: `${readingGoals.yearlyProgress.books}%` }}
                    ></div>
                  </div>
                  <p>{readingGoals.yearlyGoals.completedBooks} / {readingGoals.yearlyGoals.targetBooks}</p>
                </div>
              </div>

              <div className="goal-card">
                <h3>Pages</h3>
                <div className="goal-progress">
                  <div className="goal-bar">
                    <div 
                      className="goal-fill" 
                      style={{ width: `${readingGoals.yearlyProgress.pages}%` }}
                    ></div>
                  </div>
                  <p>{readingGoals.yearlyGoals.completedPages} / {readingGoals.yearlyGoals.targetPages}</p>
                </div>
              </div>

              <div className="goal-card">
                <h3>Reading Time</h3>
                <div className="goal-progress">
                  <div className="goal-bar">
                    <div 
                      className="goal-fill" 
                      style={{ width: `${readingGoals.yearlyProgress.minutes}%` }}
                    ></div>
                  </div>
                  <p>{readingGoals.yearlyGoals.completedMinutes} / {readingGoals.yearlyGoals.targetMinutes} minutes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="achievements-section">
            <h2>Achievements</h2>
            {achievements.length > 0 ? (
              <div className="achievements-grid">
                {achievements.map((achievement, index) => (
                  <div key={index} className="achievement-card">
                    <div className="achievement-icon">🏆</div>
                    <h4>{achievement.title}</h4>
                    <p>{achievement.description}</p>
                    <small>{new Date(achievement.earnedAt).toLocaleDateString()}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No achievements yet. Keep reading to earn them!</p>
            )}
          </div>
        </div>
      )}

      {showGoogleBooksSearch && (
        <GoogleBooksSearch
          onImportBook={(book) => {
            // Refresh the data after importing
            loadData();
          }}
          onClose={() => setShowGoogleBooksSearch(false)}
        />
      )}
    </div>
  );
};

export default ReadingProgress;
