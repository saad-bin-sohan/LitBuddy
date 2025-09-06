const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

export const googleBooksApi = {
  // Search books on Google Books
  searchBooks: async (query, page = 1) => {
    const res = await fetch(`${API_URL}/googlebooks/search?query=${encodeURIComponent(query)}&page=${page}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to search Google Books');
    return data;
  },

  // Get book details by Google Books volume ID
  getBookById: async (volumeId) => {
    const res = await fetch(`${API_URL}/googlebooks/book/${volumeId}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get book details');
    return data;
  },

  // Get book details by ISBN
  getBookByIsbn: async (isbn) => {
    const res = await fetch(`${API_URL}/googlebooks/book/isbn/${isbn}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get book by ISBN');
    return data;
  },

  // Import book from Google Books
  importBook: async (importData) => {
    const res = await fetch(`${API_URL}/googlebooks/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importData),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to import book');
    return data;
  }
};
