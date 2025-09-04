const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

export const bookApi = {
  // Create a new book
  createBook: async (bookData) => {
    const res = await fetch(`${API_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create book');
    return data;
  },

  // Search books
  searchBooks: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/books/search?${queryString}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to search books');
    return data;
  },

  // Get book by ID
  getBookById: async (bookId) => {
    const res = await fetch(`${API_URL}/books/${bookId}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get book');
    return data;
  },

  // Update book
  updateBook: async (bookId, bookData) => {
    const res = await fetch(`${API_URL}/books/${bookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update book');
    return data;
  },

  // Delete book
  deleteBook: async (bookId) => {
    const res = await fetch(`${API_URL}/books/${bookId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete book');
    return data;
  },

  // Get user's books
  getMyBooks: async () => {
    const res = await fetch(`${API_URL}/books`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get books');
    return data;
  }
};
