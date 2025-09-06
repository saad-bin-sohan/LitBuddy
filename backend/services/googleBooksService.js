const axios = require('axios');

class GoogleBooksService {
  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/books/v1';
    this.referer = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  // Search for books by title, author, or ISBN
  async searchBooks(query, page = 1) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Books API key not configured');
      }

      const maxResults = 20;
      const startIndex = (page - 1) * maxResults;

      const response = await axios.get(`${this.baseUrl}/volumes`, {
        params: {
          q: query,
          startIndex,
          maxResults,
          key: this.apiKey
        },
        headers: {
          'Referer': this.referer // Add referer header for API key restrictions
        }
      });

      const data = response.data;

      const books = data.items ? data.items.map(item => this.formatBookData(item)) : [];

      const totalResults = data.totalItems || 0;
      const totalPages = Math.ceil(totalResults / maxResults);

      return {
        totalResults,
        results: books,
        currentPage: page,
        totalPages
      };
    } catch (error) {
      console.error('Google Books search error:', error.message);
      throw new Error('Failed to search Google Books');
    }
  }

  // Get book details by Google Books volume ID
  async getBookById(volumeId) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Books API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/volumes/${volumeId}`, {
        params: {
          key: this.apiKey
        },
        headers: {
          'Referer': this.referer // Add referer header for API key restrictions
        }
      });

      const data = response.data;

      if (!data) {
        throw new Error('Book not found');
      }

      return this.formatDetailedBookData(data);
    } catch (error) {
      console.error('Google Books book fetch error:', error.message);
      throw new Error('Failed to fetch book details');
    }
  }

  // Format basic book data from search results
  formatBookData(item) {
    const volumeInfo = item.volumeInfo || {};
    return {
      googleBooksId: item.id,
      title: volumeInfo.title || 'Unknown Title',
      author: volumeInfo.authors ? volumeInfo.authors[0] : 'Unknown Author',
      imageUrl: volumeInfo.imageLinks ? volumeInfo.imageLinks.thumbnail : null,
      averageRating: volumeInfo.averageRating || 0,
      ratingsCount: volumeInfo.ratingsCount || 0,
      publicationYear: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.substring(0,4)) : null,
      pageCount: volumeInfo.pageCount || null
    };
  }

  // Format detailed book data
  formatDetailedBookData(data) {
    const volumeInfo = data.volumeInfo || {};
    return {
      googleBooksId: data.id,
      title: volumeInfo.title || 'Unknown Title',
      author: volumeInfo.authors ? volumeInfo.authors[0] : 'Unknown Author',
      isbn: this.getIsbn(volumeInfo.industryIdentifiers),
      imageUrl: volumeInfo.imageLinks ? volumeInfo.imageLinks.thumbnail : null,
      description: volumeInfo.description || '',
      averageRating: volumeInfo.averageRating || 0,
      ratingsCount: volumeInfo.ratingsCount || 0,
      publicationYear: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.substring(0,4)) : null,
      publisher: volumeInfo.publisher || null,
      language: volumeInfo.language || 'en',
      pages: volumeInfo.pageCount || null,
      categories: volumeInfo.categories || [],
      previewLink: volumeInfo.previewLink || null
    };
  }

  // Helper to get ISBN from industryIdentifiers array
  getIsbn(industryIdentifiers) {
    if (!industryIdentifiers || !Array.isArray(industryIdentifiers)) return null;
    const isbn13 = industryIdentifiers.find(id => id.type === 'ISBN_13');
    if (isbn13) return isbn13.identifier;
    const isbn10 = industryIdentifiers.find(id => id.type === 'ISBN_10');
    if (isbn10) return isbn10.identifier;
    return null;
  }
}

module.exports = new GoogleBooksService();
