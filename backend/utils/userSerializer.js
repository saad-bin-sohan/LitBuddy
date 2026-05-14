// backend/utils/userSerializer.js
//
// Single source of truth for user response serialization.
// Used by authController and googleAuthController (and anywhere else
// that returns a user object in an API response).
//
// Fields deliberately excluded from API responses:
//   password, resetPasswordToken, resetPasswordExpires,
//   devices, loginIPs, __v, failedLoginAttempts

function sanitizeUserForResponse(user) {
  if (!user) return null;
  // Support both Mongoose documents and plain objects
  const u = (typeof user.toObject === 'function') ? user.toObject() : { ...user };
  return {
    _id: u._id,
    name: u.name,
    displayName: u.displayName,
    email: u.email,
    phone: u.phone,
    age: u.age,
    gender: u.gender,
    bio: u.bio,
    favoriteBooks: u.favoriteBooks,
    favoriteSongs: u.favoriteSongs,
    quote: u.quote,
    preferences: u.preferences,
    profilePhotos: u.profilePhotos || [],
    isVerified: !!u.isVerified,
    isAdmin: !!u.isAdmin,
    role: u.role || (u.isAdmin ? 'admin' : 'reader'),
    plan: u.plan,
    maxActiveConversations: u.maxActiveConversations,
    activeConversations: u.activeConversations,
    hasCompletedSetup: !!u.hasCompletedSetup,
    suspendedUntil: u.suspendedUntil || null,
    // Google OAuth fields — null for password-based users
    googleId: u.googleId || null,
    googleEmail: u.googleEmail || null,
    isGoogleUser: !!u.isGoogleUser,
  };
}

module.exports = { sanitizeUserForResponse };
