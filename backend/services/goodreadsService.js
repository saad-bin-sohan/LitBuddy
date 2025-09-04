const axios = require('axios');
const xml2js = require('xml2js');

class GoodReadsService {
  constructor() {
    this.apiKey = process.env.GOODREADS_API_KEY;
    this.baseUrl = 'https://www.goodreads.com';
    this.parser = new xml2js.Parser({ explicitArray: false });
  }

  // Search for books by title, author, or ISBN
  async searchBooks(query, page = 1) {
    try {
      if (!this.apiKey) {
        throw new Error('GoodReads API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/search/index.xml`, {
        params: {
          key: this.apiKey,
          q: query,
          page: page
        }
      });

      const result = await this.parser.parseStringPromise(response.data);
      
      if (result.GoodreadsResponse && result.GoodreadsResponse.search) {
        const search = result.GoodreadsResponse.search;
        const books = search.results ? (Array.isArray(search.results.work) ? search.results.work : [search.results.work]) : [];
        
        return {
          totalResults: parseInt(search['total-results'] || 0),
          results: books.map(work => this.formatBookData(work.best_book)),
          currentPage: parseInt(search['results-start'] || 1),
          totalPages: Math.ceil(parseInt(search['total-results'] || 0) / 20)
        };
      }

      return { totalResults: 0, results: [], currentPage: 1, totalPages: 0 };
    } catch (error) {
      console.error('GoodReads search error:', error.message);
      throw new Error('Failed to search GoodReads');
    }
  }

  // Get book details by GoodReads ID
  async getBookById(goodreadsId) {
    try {
      if (!this.apiKey) {
        throw new Error('GoodReads API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/book/show/${goodreadsId}.xml`, {
        params: {
          key: this.apiKey
        }
      });

      const result = await this.parser.parseStringPromise(response.data);
      
      if (result.GoodreadsResponse && result.GoodreadsResponse.book) {
        return this.formatDetailedBookData(result.GoodreadsResponse.book);
      }

      throw new Error('Book not found');
    } catch (error) {
      console.error('GoodReads book fetch error:', error.message);
      throw new Error('Failed to fetch book details');
    }
  }

  // Get book details by ISBN
  async getBookByIsbn(isbn) {
    try {
      if (!this.apiKey) {
        throw new Error('GoodReads API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/book/isbn/${isbn}`, {
        params: {
          key: this.apiKey
        }
      });

      const result = await this.parser.parseStringPromise(response.data);
      
      if (result.GoodreadsResponse && result.GoodreadsResponse.book) {
        return this.formatDetailedBookData(result.GoodreadsResponse.book);
      }

      throw new Error('Book not found');
    } catch (error) {
      console.error('GoodReads ISBN search error:', error.message);
      throw new Error('Failed to fetch book by ISBN');
    }
  }

  // Format basic book data from search results
  formatBookData(book) {
    return {
      goodreadsId: book.id,
      title: book.title,
      author: book.author ? book.author.name : 'Unknown Author',
      imageUrl: book.image_url,
      smallImageUrl: book.small_image_url,
      averageRating: parseFloat(book.average_rating) || 0,
      ratingsCount: parseInt(book.ratings_count) || 0,
      publicationYear: book.publication_year ? parseInt(book.publication_year) : null
    };
  }

  // Format detailed book data
  formatDetailedBookData(book) {
    return {
      goodreadsId: book.id,
      title: book.title,
      author: book.authors ? (Array.isArray(book.authors.author) ? book.authors.author[0].name : book.authors.author.name) : 'Unknown Author',
      isbn: book.isbn || book.isbn13 || null,
      imageUrl: book.image_url,
      smallImageUrl: book.small_image_url,
      largeImageUrl: book.large_image_url,
      description: book.description || '',
      averageRating: parseFloat(book.average_rating) || 0,
      ratingsCount: parseInt(book.ratings_count) || 0,
      reviewCount: parseInt(book.text_reviews_count) || 0,
      publicationYear: book.publication_year ? parseInt(book.publication_year) : null,
      publisher: book.publisher || null,
      language: book.language_code || 'en',
      pages: book.num_pages ? parseInt(book.num_pages) : null,
      format: book.format || null,
      genres: book.popular_shelves ? 
        (Array.isArray(book.popular_shelves.shelf) ? 
          book.popular_shelves.shelf.slice(0, 5).map(shelf => shelf.name) : 
          [book.popular_shelves.shelf.name]) : [],
      url: book.url || null
    };
  }

  // Get author information
  async getAuthorInfo(authorId) {
    try {
      if (!this.apiKey) {
        throw new Error('GoodReads API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/author/show/${authorId}.xml`, {
        params: {
          key: this.apiKey
        }
      });

      const result = await this.parser.parseStringPromise(response.data);
      
      if (result.GoodreadsResponse && result.GoodreadsResponse.author) {
        const author = result.GoodreadsResponse.author;
        return {
          id: author.id,
          name: author.name,
          imageUrl: author.image_url,
          smallImageUrl: author.small_image_url,
          largeImageUrl: author.large_image_url,
          hometown: author.hometown || null,
          bornAt: author.born_at || null,
          diedAt: author.died_at || null,
          about: author.about || '',
          influences: author.influences || '',
          worksCount: parseInt(author.works_count) || 0,
          gender: author.gender || null,
          url: author.link || null
        };
      }

      throw new Error('Author not found');
    } catch (error) {
      console.error('GoodReads author fetch error:', error.message);
      throw new Error('Failed to fetch author information');
    }
  }
}

module.exports = new GoodReadsService();
