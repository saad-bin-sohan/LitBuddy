const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

export const readingProgressApi = {
  // Add book to reading list
  addBookToList: async (bookData) => {
    const res = await fetch(`${API_URL}/reading-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add book to list');
    return data;
  },

  // Add book to specific reading list
  addToList: async (bookData) => {
    const res = await fetch(`${API_URL}/reading-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add book to list');
    return data;
  },

  // Update reading progress
  updateProgress: async (progressId, progressData) => {
    const res = await fetch(`${API_URL}/reading-progress/${progressId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressData),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update progress');
    return data;
  },

  // Get reading lists
  getReadingLists: async (status) => {
    const params = status ? { status } : {};
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/reading-progress/lists?${queryString}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get reading lists');
    return data;
  },

  // Remove book from list
  removeFromList: async (progressId) => {
    const res = await fetch(`${API_URL}/reading-progress/${progressId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to remove book from list');
    return data;
  },

  // Get reading statistics
  getReadingStats: async (year) => {
    const params = year ? { year } : {};
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/reading-progress/stats?${queryString}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get reading stats');
    return data;
  }
};
