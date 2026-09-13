// backend/controllers/matchController.js

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const CityIndex = require('../models/cityIndexModel');
const Suggestion = require('../models/suggestionModel');
const notificationService = require('../services/notificationService'); // NEW
const { getLogger } = require('../utils/logger');

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

const SUGGESTION_PROJECTION = {
  _id: 1,
  name: 1,
  displayName: 1,
  age: 1,
  gender: 1,
  bio: 1,
  quote: 1,
  profilePhotos: 1,
  favoriteBooks: 1,
  favoriteSongs: 1,
  preferences: 1,
  answers: 1,
};

function startOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * @desc    Get daily partner suggestions
 * @route   GET /api/match/suggestions
 * @access  Private
 * Query params (optional):
 *    limit -> number of results (default 5, max 50)
 *    lat, lng -> ad-hoc search origin for this request only, overriding the
 *                caller's saved CityIndex location. Both must be present
 *                and valid to take effect. Sent by LocationFilter.js on the
 *                Discover/Suggestions page.
 *    distanceKm -> ad-hoc search radius for this request only, overriding
 *                  the caller's saved User.maxDistanceKm preference. Can be
 *                  supplied with or without lat/lng (see below).
 *
 * 2026-09 fix: this handler only ever read `req.query.limit` -- lat, lng,
 * and distanceKm were parsed and sent by the frontend (LocationFilter.js /
 * matchApi.js::getSuggestions) but silently ignored here, so the "Location
 * Filter" control on the suggestions page had no effect on the results no
 * matter what a user entered. It's wired up below as a per-request
 * override; nothing here is persisted to the user's profile (persisting a
 * location happens exclusively through PUT /api/profile).
 *
 * Distance is an opt-in filter now (User.maxDistanceKm), not the primary sort
 * — it only applies if the user has explicitly set a preference. Eligibility
 * is mutual age range + mutual interestedIn/gender + (optionally) distance;
 * within the eligible pool, results are sampled randomly for now. Real
 * reading-compatibility ranking (books, clubs, challenges, taste) is the next
 * phase of this work, not this one. This pass fixes eligibility plus two
 * standing bugs: one-sided likes reappearing in suggestions, and suggestions
 * never rotating within a day.
 */
const getDailySuggestions = asyncHandler(async (req, res) => {
  const rawLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 5;
  const now = new Date();
  const today = startOfTodayUTC();

  const me = await User.findById(req.user._id)
    .select('gender interestedIn ageRangePreference maxDistanceKm age matches likes suspendedUntil')
    .lean();

  if (!me) {
    res.status(404);
    throw new Error('User not found');
  }

  // Anyone already matched, already liked (one-sided or not), or already
  // shown today should never reappear in suggestions.
  const shownToday = await Suggestion.find({ user: req.user._id, date: today })
    .select('shownUser')
    .lean();

  const excludeSet = new Set([String(req.user._id)]);
  for (const m of me.matches || []) excludeSet.add(String(m));
  for (const l of me.likes || []) excludeSet.add(String(l));
  for (const s of shownToday) excludeSet.add(String(s.shownUser));
  const excludeObjectIds = Array.from(excludeSet).map(toObjectId).filter(Boolean);

  // Mutual age-range filter: their age has to fit my preference, and my age
  // has to fit theirs. Defaults are wide (18-100) so nobody who hasn't set a
  // preference gets accidentally excluded during rollout.
  const myAgeMin = me.ageRangePreference?.min ?? 18;
  const myAgeMax = me.ageRangePreference?.max ?? 100;
  const myInterestedIn = Array.isArray(me.interestedIn) ? me.interestedIn : [];

  // Every $or lives as its own entry in this array — combining several $or
  // objects with a plain object spread would silently clobber all but the
  // last one, since they'd all collide on the same "$or" key.
  const conditions = [
    { _id: { $nin: excludeObjectIds } },
    { age: { $gte: myAgeMin, $lte: myAgeMax } },
    {
      $or: [
        { 'ageRangePreference.min': { $exists: false } },
        {
          'ageRangePreference.min': { $lte: me.age ?? myAgeMax },
          'ageRangePreference.max': { $gte: me.age ?? myAgeMin },
        },
      ],
    },
    {
      $or: [
        { interestedIn: { $exists: false } },
        { interestedIn: { $size: 0 } },
        { interestedIn: me.gender },
      ],
    },
    { $or: [{ suspendedUntil: null }, { suspendedUntil: { $lte: now } }] },
  ];
  if (myInterestedIn.length) {
    conditions.push({ gender: { $in: myInterestedIn } });
  }
  const finalMatch = { $and: conditions };
  const projectStage = { $project: { ...SUGGESTION_PROJECTION, dist: 1 } };

  // Ad-hoc location override from the query string (see the route's JSDoc
  // above). Both lat and lng must be present and valid to count as a
  // coordinate override; distanceKm can be supplied independently.
  const queryLat = Number(req.query.lat);
  const queryLng = Number(req.query.lng);
  const queryDistanceKm = Number(req.query.distanceKm);

  const hasQueryCoords =
    Number.isFinite(queryLat) &&
    Number.isFinite(queryLng) &&
    queryLat >= -90 &&
    queryLat <= 90 &&
    queryLng >= -180 &&
    queryLng <= 180;
  const hasQueryDistance = Number.isFinite(queryDistanceKm) && queryDistanceKm > 0;
  const hasSavedDistancePref = Number.isFinite(me.maxDistanceKm) && me.maxDistanceKm > 0;

  // An ad-hoc coordinate pair or an ad-hoc distance both signal "filter by
  // distance for this request", even for a user who has never set a
  // maxDistanceKm preference on their own profile.
  const useDistance = hasQueryCoords || hasQueryDistance || hasSavedDistancePref;
  let candidates = [];

  if (useDistance) {
    let coords = hasQueryCoords ? [queryLng, queryLat] : null;
    if (!coords) {
      const myCi = await CityIndex.findOne({ user: req.user._id }).lean();
      coords = myCi?.location?.coordinates;
    }

    if (Array.isArray(coords) && coords.length === 2) {
      const maxDistanceKm = hasQueryDistance
        ? queryDistanceKm
        : hasSavedDistancePref
          ? me.maxDistanceKm
          : 50; // LocationFilter.js's own default radius when only ad-hoc coords are given

      candidates = await CityIndex.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: coords },
            distanceField: 'dist.calculated',
            spherical: true,
            maxDistance: maxDistanceKm * 1000,
            key: 'location',
            query: { user: { $nin: excludeObjectIds } },
          },
        },
        { $limit: Math.min(limit * 10, 300) },
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDoc' } },
        { $unwind: '$userDoc' },
        { $replaceRoot: { newRoot: { $mergeObjects: ['$userDoc', { dist: '$dist' }] } } },
        { $match: finalMatch },
        { $sample: { size: limit } },
        projectStage,
      ]);
    }
    // If distance filtering was requested (saved preference or ad-hoc query
    // params) but there's no usable coordinate pair to search from, fall
    // through to the no-distance branch below instead of failing the
    // request outright.
  }

  if (!useDistance || candidates.length === 0) {
    candidates = await User.aggregate([
      { $match: finalMatch },
      { $sample: { size: limit } },
      projectStage,
    ]);
  }

  // Record today's suggestions so nobody repeats within the same day,
  // independent of whether they get liked or ignored.
  if (candidates.length) {
    const ops = candidates.map((c) => ({
      updateOne: {
        filter: { user: req.user._id, shownUser: c._id, date: today },
        update: { $setOnInsert: { user: req.user._id, shownUser: c._id, date: today } },
        upsert: true,
      },
    }));
    try {
      await Suggestion.bulkWrite(ops, { ordered: false });
    } catch (err) {
      getLogger(req).warn({ err }, 'match.suggestion_bookkeeping_failed');
    }
  }

  return res.json(candidates);
});

/**
 * @desc    Like a user (and check for mutual match)
 * @route   POST /api/match/like/:id
 * @access  Private
 */
const likeUser = asyncHandler(async (req, res) => {
  const requestLogger = getLogger(req);
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
  // Cap likes to 2000 entries — prevent unbounded User document growth
  if (currentUser.likes.length > 2000) {
    currentUser.likes = currentUser.likes.slice(-2000);
  }
  await currentUser.save();

  const otherUser = await User.findById(likedUserId);
  if (!otherUser) {
    return res.status(404).json({ message: 'Target user not found' });
  }
  if (!Array.isArray(otherUser.likes)) otherUser.likes = [];
  if (!Array.isArray(otherUser.matches)) otherUser.matches = [];

  if (otherUser.likes.map(String).includes(String(req.user._id))) {
    if (!currentUser.matches.map(String).includes(String(likedUserId))) {
      currentUser.matches.push(likedUserId);
      // Cap matches to 2000 entries
      if (currentUser.matches.length > 2000) {
        currentUser.matches = currentUser.matches.slice(-2000);
      }
    }
    if (!otherUser.matches.map(String).includes(String(req.user._id))) {
      otherUser.matches.push(req.user._id);
      // Cap matches to 2000 entries
      if (otherUser.matches.length > 2000) {
        otherUser.matches = otherUser.matches.slice(-2000);
      }
    }

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
      requestLogger.error(
        {
          err,
          currentUserId: String(currentUser._id),
          otherUserId: String(otherUser._id),
        },
        'match.notification_dispatch_failed'
      );
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
