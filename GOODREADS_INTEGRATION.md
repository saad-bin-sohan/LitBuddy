# GoodReads API Integration

## Overview
The GoodReads API integration allows users to search for books, get detailed book information, and import books directly from GoodReads into their personal reading library.

## Features

### 1. **Book Search**
- Search books by title, author, or general keywords
- Paginated results with navigation
- Real-time search with GoodReads API

### 2. **Book Information**
- Detailed book metadata including:
  - Title, author, ISBN
  - Cover images (small, medium, large)
  - Publication year, page count, language
  - Average rating and number of ratings
  - Book description and genres
  - Publisher and format information

### 3. **Author Information**
- Author details including:
  - Biography and influences
  - Hometown, birth/death dates
  - Number of works published
  - Author photos

### 4. **Book Import**
- One-click import from GoodReads to personal library
- Automatic metadata population
- Option to add directly to reading lists
- Duplicate prevention

## Technical Implementation

### Backend Services

#### **GoodReads Service** (`backend/services/goodreadsService.js`)
- Handles all GoodReads API calls
- XML response parsing (GoodReads returns XML)
- Data formatting and normalization
- Error handling and rate limiting

#### **GoodReads Controller** (`backend/controllers/goodreadsController.js`)
- API endpoint handlers
- Input validation
- Error handling
- Book import logic

#### **GoodReads Routes** (`backend/routes/goodreadsRoutes.js`)
- RESTful API endpoints
- Authentication middleware
- Route organization

### Frontend Components

#### **GoodReads Search Component** (`frontend/src/components/GoodReadsSearch.js`)
- Modal-based search interface
- Search results display
- Book selection and preview
- Import functionality

#### **GoodReads API Service** (`frontend/src/api/goodreadsApi.js`)
- Frontend API calls to backend
- Error handling
- Data transformation

### API Endpoints

```
GET  /api/goodreads/search?query={search}&page={page}
GET  /api/goodreads/book/:id
GET  /api/goodreads/book/isbn/:isbn
GET  /api/goodreads/author/:id
POST /api/goodreads/import
```

## Setup Instructions

### 1. **Get GoodReads API Key**
1. Visit [GoodReads Developer Portal](https://www.goodreads.com/api)
2. Apply for an API key
3. Wait for approval (usually 24-48 hours)

### 2. **Environment Variables**
Add to your `.env` file:
```env
GOODREADS_API_KEY=your_api_key_here
```

### 3. **Install Dependencies**
```bash
cd backend
npm install axios xml2js
```

### 4. **Database Schema Updates**
The Book model has been updated to include GoodReads fields:
- `goodreadsId`: Unique GoodReads identifier
- `goodreadsRating`: Average rating from GoodReads
- `goodreadsRatingsCount`: Number of ratings

## Usage

### **Searching for Books**
1. Click "Search GoodReads" button on Reading Progress page
2. Enter search query (title, author, or keywords)
3. Browse search results
4. Click on a book to see detailed information

### **Importing Books**
1. Select a book from search results
2. Review book details
3. Click "Import to My Library"
4. Book is automatically added to your library

### **Reading List Integration**
- Imported books can be automatically added to reading lists
- Choose status: "Want to Read", "Currently Reading", etc.
- Full reading progress tracking available

## GoodReads API Limitations

### **Rate Limiting**
- GoodReads has rate limits on API calls
- Implemented error handling for rate limit exceeded
- Consider implementing request caching for better performance

### **Data Availability**
- Not all books have complete metadata
- Some books may be missing covers, descriptions, or ratings
- ISBN search may not work for all books

### **API Response Format**
- GoodReads returns XML responses
- Requires XML parsing on backend
- Data normalization for consistent frontend experience

## Error Handling

### **Common Errors**
- API key not configured
- Invalid search query
- Book not found
- Rate limit exceeded
- Network errors

### **User Feedback**
- Clear error messages
- Loading states during API calls
- Graceful fallbacks for missing data

## Future Enhancements

### **Caching**
- Cache frequently searched books
- Store book metadata locally
- Reduce API calls and improve performance

### **Advanced Search**
- Filter by genre, publication year, rating
- Sort by relevance, rating, popularity
- Search within specific book series

### **Batch Import**
- Import multiple books at once
- Import reading lists from GoodReads
- Sync reading progress

### **Social Features**
- Share GoodReads book links
- Compare ratings with friends
- Book recommendations based on GoodReads data

## Security Considerations

### **API Key Protection**
- API key stored in environment variables
- Never exposed to frontend
- Secure backend-only access

### **User Data Privacy**
- Only import books user explicitly chooses
- No automatic data sharing with GoodReads
- User maintains control over their library

### **Input Validation**
- Search query sanitization
- ISBN format validation
- Rate limiting on import operations

## Troubleshooting

### **API Key Issues**
- Verify API key is correct
- Check if API key is approved
- Ensure environment variable is loaded

### **Search Not Working**
- Check network connectivity
- Verify GoodReads API status
- Review error logs for specific issues

### **Import Failures**
- Check if book already exists in library
- Verify book has required metadata
- Review backend error logs

## Support

For issues with the GoodReads integration:
1. Check backend logs for API errors
2. Verify GoodReads API key and permissions
3. Test API endpoints directly
4. Review GoodReads API documentation for changes

## Dependencies

- **Backend**: `axios` (HTTP client), `xml2js` (XML parsing)
- **Frontend**: React components with modern CSS
- **API**: GoodReads REST API with XML responses
