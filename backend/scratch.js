const mongoose = require('mongoose');
const bookSchema = new mongoose.Schema({ isbn: String });
bookSchema.pre('validate', function() {
  console.log('Validate hook running');
  this.isbn = '123-456';
});
const Book = mongoose.model('Book', bookSchema);
const doc = new Book({ isbn: '123' });
doc.validate().then(() => console.log('Validated, isbn is:', doc.isbn)).catch(err => console.log('Validation Error:', err.message));
