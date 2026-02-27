function getUserId(user) {
  if (!user) return null;
  return String(user._id || user.id || '');
}

function isAdminUser(user) {
  return !!(user && (user.isAdmin || user.role === 'admin'));
}

function isBookOwner(book, user) {
  const userId = getUserId(user);
  if (!book || !userId) return false;
  return String(book.createdBy) === userId;
}

function canReadBook(book, user) {
  if (!book || book.isArchived) return false;
  if (book.visibility === 'public') return true;
  return isBookOwner(book, user);
}

function sanitizeBookForUser(book, user) {
  if (!book) return null;
  const payload = typeof book.toObject === 'function' ? book.toObject() : { ...book };

  if (!isBookOwner(book, user) && !isAdminUser(user)) {
    delete payload.createdBy;
    delete payload.mergedInto;
  }

  delete payload.__v;
  return payload;
}

module.exports = {
  isAdminUser,
  isBookOwner,
  canReadBook,
  sanitizeBookForUser,
};
