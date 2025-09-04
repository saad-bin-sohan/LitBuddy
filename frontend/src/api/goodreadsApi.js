const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

export const goodreadsApi = {
  // Search books on GoodReads
  searchBooks: async (query, page = 1) => {
    const res = await fetch(`${API_URL}/goodreads/search?query=${encodeURIComponent(query)}&page=${page}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to search GoodReads');
    return data;
  },

  // Get book details by GoodReads ID
  getBookById: async (goodreadsId) => {
    const res = await fetch(`${API_URL}/goodreads/book/${goodreadsId}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get book details');
    return data;
  },

  // Get book details by ISBN
  getBookByIsbn: async (isbn) => {
    const res = await fetch(`${API_URL}/goodreads/book/isbn/${isbn}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get book by ISBN');
    return data;
  },

  // Get author information
  getAuthor: async (authorId) => {
    const res = await fetch(`${API_URL}/goodreads/author/${authorId}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get author information');
    return data;
  },

  // Import book from GoodReads
  importBook: async (importData) => {
    const res = await fetch(`${API_URL}/goodreads/import`, {
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
