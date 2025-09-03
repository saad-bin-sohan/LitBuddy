// backend/controllers/matchController.js

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const CityIndex = require('../models/cityIndexModel');
const notificationService = require('../services/notificationService'); // NEW
/**
 * Helper: safe cast to ObjectId
 */
const toObjectId = (v) => {
  try {
    if (v instanceof mongoose.Types.ObjectId) return v;
    return new mongoose.Types.ObjectId(String(v));
  } catch (e) {
    return null;
  }
};

/**
 * @desc    Get daily partner suggestions
 * @route   GET /api/match/suggestions
 * @access  Private
 * Query params (optional):
 *    lat, lng  -> center point (numbers)
 *    distanceKm -> radius in km (number)
 *    limit -> number of results (default 5)
 */
const getDailySuggestions = asyncHandler(async (req, res) => {
  const rawLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 5;
  const now = new Date();

  // Build exclusion list: self + matches
  const me = await User.findById(req.user._id).select('matches suspendedUntil').lean();
  const excludeSet = new Set([String(req.user._id)]);
  if (Array.isArray(me?.matches)) {
    for (const m of me.matches) {
      if (!m) continue;
      excludeSet.add(String(m._id ?? m));
    }
  }
  const excludeObjectIds = Array.from(excludeSet).map((s) => toObjectId(s)).filter(Boolean);

  // Robust parsing of client params
  let lat = req.query.lat !== undefined ? parseFloat(req.query.lat) : null;
  let lng = req.query.lng !== undefined ? parseFloat(req.query.lng) : null;
  let distanceKm = req.query.distanceKm !== undefined ? parseFloat(req.query.distanceKm) : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    lat = null;
    lng = null;
  }
  if (!Number.isFinite(distanceKm)) distanceKm = null;

  // If client did not pass coords, try user's saved CityIndex
  if (lat == null || lng == null) {
    const myCi = await CityIndex.findOne({ user: req.user._id }).lean();
    if (myCi && Array.isArray(myCi.location?.coordinates) && myCi.location.coordinates.length === 2) {
      lng = myCi.location.coordinates[0];
      lat = myCi.location.coordinates[1];
      if (distanceKm == null && typeof myCi.preferredSearchRadiusKm === 'number') {
        distanceKm = myCi.preferredSearchRadiusKm;
      }
    }
  }

  if (distanceKm == null || !Number.isFinite(distanceKm)) distanceKm = 50;
  distanceKm = Math.max(1, Math.min(500, distanceKm));
  const meters = distanceKm * 1000;

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'dist.calculated',
          spherical: true,
          maxDistance: meters,
          key: 'location',
          query: {
            user: { $nin: excludeObjectIds },
          },
        },
      },
      { $limit: Math.min(limit * 4, 200) },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: '$userDoc' },
      {
        $match: {
          $or: [
            { 'userDoc.suspendedUntil': null },
            { 'userDoc.suspendedUntil': { $lte: now } },
          ],
        },
      },
      {
        $project: {
          _id: '$userDoc._id',
          name: '$userDoc.name',
          displayName: '$userDoc.displayName',
          age: '$userDoc.age',
          gender: '$userDoc.gender',
          bio: '$userDoc.bio',
          quote: '$userDoc.quote',
          profilePhotos: '$userDoc.profilePhotos',
          favoriteBooks: '$userDoc.favoriteBooks',
          favoriteSongs: '$userDoc.favoriteSongs',
          preferences: '$userDoc.preferences',
          answers: '$userDoc.answers',
          dist: '$dist',
        },
      },
      { $limit: limit },
    ];

    const results = await CityIndex.aggregate(pipeline);
    return res.json(results);
  }

  const myCityIndex = await CityIndex.findOne({ user: req.user._id }).lean();
  if (myCityIndex?.citySlug) {
    const cityDocs = await CityIndex.find({
      citySlug: myCityIndex.citySlug,
      user: { $nin: excludeObjectIds }
    })
      .limit(limit * 4)
      .lean();

    const candidateUserIds = cityDocs.map(d => d.user).filter(Boolean);
    const users = await User.find({
      _id: { $in: candidateUserIds },
      $or: [{ suspendedUntil: null }, { suspendedUntil: { $lte: now } }],
    })
      .select('-password')
      .limit(limit)
      .lean();

    return res.json(users);
  }

  const cityDocsAny = await CityIndex.find({
    user: { $nin: excludeObjectIds }
  })
    .limit(limit * 4)
    .lean();

  if (cityDocsAny.length > 0) {
    const candidateUserIds = cityDocsAny.map(d => d.user).filter(Boolean);
    const users = await User.find({
      _id: { $in: candidateUserIds },
      $or: [{ suspendedUntil: null }, { suspendedUntil: { $lte: now } }],
    })
      .select('-password')
      .limit(limit)
      .lean();

    return res.json(users);
  }

  const users = await User.find({
    _id: { $nin: excludeObjectIds },
    $or: [{ suspendedUntil: null }, { suspendedUntil: { $lte: now } }],
  })
    .select('-password')
    .limit(limit)
    .lean();

  return res.json(users);
});

/**
 * @desc    Like a user (and check for mutual match)
 * @route   POST /api/match/like/:id
 * @access  Private
 */
const likeUser = asyncHandler(async (req, res) => {
  const likedUserId = req.params.id;
  if (!likedUserId) {
    res.status(400);
    throw new Error('Missing target user id');
  }
  if (String(likedUserId) === String(req.user._id)) {
    res.status(400);
    throw new Error('Cannot like yourself');
  }

  const currentUser = await User.findById(req.user._id);
  if (!currentUser) {
    res.status(404);
    throw new Error('Current user not found');
  }

  if (!Array.isArray(currentUser.likes)) currentUser.likes = [];
  if (!Array.isArray(currentUser.matches)) currentUser.matches = [];

  const alreadyLiked = currentUser.likes.map(String).includes(String(likedUserId));
  const alreadyMatched = currentUser.matches.map(String).includes(String(likedUserId));
  if (alreadyLiked || alreadyMatched) {
    return res.status(400).json({ message: 'Already liked or matched with this user' });
  }

  currentUser.likes.push(likedUserId);
  await currentUser.save();

  const otherUser = await User.findById(likedUserId);
  if (!otherUser) {
    return res.status(404).json({ message: 'Target user not found' });
  }
  if (!Array.isArray(otherUser.likes)) otherUser.likes = [];
  if (!Array.isArray(otherUser.matches)) otherUser.matches = [];

  if (otherUser.likes.map(String).includes(String(req.user._id))) {
    if (!currentUser.matches.map(String).includes(String(likedUserId))) currentUser.matches.push(likedUserId);
    if (!otherUser.matches.map(String).includes(String(req.user._id))) otherUser.matches.push(req.user._id);

    await currentUser.save();
    await otherUser.save();

    // CREATE notifications for both users (real-time & persisted)
    try {
      const curDisplay = currentUser.displayName || currentUser.name || 'Someone';
      const otherDisplay = otherUser.displayName || otherUser.name || 'Someone';

      await notificationService.createAndSend({
        userId: currentUser._id,
        type: 'match',
        title: "It's a match!",
        body: `You matched with ${otherDisplay}`,
        data: { withUserId: otherUser._id },
      });

      await notificationService.createAndSend({
        userId: otherUser._id,
        type: 'match',
        title: "It's a match!",
        body: `You matched with ${curDisplay}`,
        data: { withUserId: currentUser._id },
      });
    } catch (err) {
      console.error('Failed to create/send notifications for match:', err);
    }

    return res.json({ message: 'It’s a match!', matchId: likedUserId });
  }

  return res.json({ message: 'User liked successfully' });
});

/**
 * @desc    Get all matches of logged-in user
 * @route   GET /api/match
 * @access  Private
 */
const getMatches = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('matches', '-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user.matches || []);
});

module.exports = {
  getDailySuggestions,
  likeUser,
  getMatches,
};
