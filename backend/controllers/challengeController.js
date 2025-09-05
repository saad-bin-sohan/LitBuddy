const Challenge = require('../models/challengeModel');
const Achievement = require('../models/achievementModel');
const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

// @desc    Create a new challenge
// @route   POST /api/challenges
// @access  Private (Admin only)
const createChallenge = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    type,
    category,
    startDate,
    endDate,
    requirements,
    rewards,
    maxParticipants,
    isPublic
  } = req.body;

  const challenge = await Challenge.create({
    title,
    description,
    type,
    category,
    startDate,
    endDate,
    requirements,
    rewards,
    maxParticipants,
    isPublic,
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: challenge
  });
});

// @desc    Get all active challenges
// @route   GET /api/challenges
// @access  Public
const getChallenges = asyncHandler(async (req, res) => {
  const { type, category, page = 1, limit = 10 } = req.query;
  
  const query = { isActive: true };
  if (type) query.type = type;
  if (category) query.category = category;

  const challenges = await Challenge.find(query)
    .populate('createdBy', 'name displayName')
    .populate('participants.user', 'name displayName profilePhotos')
    .sort({ startDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Challenge.countDocuments(query);

  res.json({
    success: true,
    data: challenges,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
});

// @desc    Get challenge by ID
// @route   GET /api/challenges/:id
// @access  Public
const getChallengeById = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id)
    .populate('createdBy', 'name displayName')
    .populate('participants.user', 'name displayName profilePhotos');

  if (!challenge) {
    res.status(404);
    throw new Error('Challenge not found');
  }

  res.json({
    success: true,
    data: challenge
  });
});

// @desc    Join a challenge
// @route   POST /api/challenges/:id/join
// @access  Private
const joinChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  
  if (!challenge) {
    res.status(404);
    throw new Error('Challenge not found');
  }

  if (!challenge.isCurrentlyActive()) {
    res.status(400);
    throw new Error('Challenge is not currently active');
  }

  if (challenge.participants.length >= challenge.maxParticipants) {
    res.status(400);
    throw new Error('Challenge is full');
  }

  const existingParticipant = challenge.participants.find(
    p => p.user.toString() === req.user.id
  );

  if (existingParticipant) {
    res.status(400);
    throw new Error('Already joined this challenge');
  }

  challenge.participants.push({
    user: req.user.id,
    joinedAt: new Date()
  });

  await challenge.save();

  // Create achievement for first challenge
  const existingAchievement = await Achievement.findOne({
    user: req.user.id,
    type: 'first_challenge'
  });

  if (!existingAchievement) {
    await Achievement.create({
      user: req.user.id,
      type: 'first_challenge',
      title: 'First Steps',
      description: 'Joined your first reading challenge',
      icon: '🎯',
      points: 10,
      metadata: { challengeId: challenge._id }
    });
  }

  res.json({
    success: true,
    message: 'Successfully joined challenge',
    data: challenge
  });
});

// @desc    Leave a challenge
// @route   DELETE /api/challenges/:id/leave
// @access  Private
const leaveChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  
  if (!challenge) {
    res.status(404);
    throw new Error('Challenge not found');
  }

  const participantIndex = challenge.participants.findIndex(
    p => p.user.toString() === req.user.id
  );

  if (participantIndex === -1) {
    res.status(400);
    throw new Error('Not participating in this challenge');
  }

  challenge.participants.splice(participantIndex, 1);
  await challenge.save();

  res.json({
    success: true,
    message: 'Successfully left challenge'
  });
});

// @desc    Update challenge progress
// @route   PUT /api/challenges/:id/progress
// @access  Private
const updateProgress = asyncHandler(async (req, res) => {
  const { booksRead, pagesRead, minutesRead } = req.body;
  
  const challenge = await Challenge.findById(req.params.id);
  
  if (!challenge) {
    res.status(404);
    throw new Error('Challenge not found');
  }

  const participant = challenge.getParticipant(req.user.id);
  
  if (!participant) {
    res.status(400);
    throw new Error('Not participating in this challenge');
  }

  // Update progress
  const updates = {};
  if (booksRead !== undefined) updates.booksRead = booksRead;
  if (pagesRead !== undefined) updates.pagesRead = pagesRead;
  if (minutesRead !== undefined) updates.minutesRead = minutesRead;

  challenge.updateParticipantProgress(req.user.id, updates);

  // Check for completion
  const isCompleted = challenge.checkCompletion(req.user.id);
  if (isCompleted && !participant.completed) {
    participant.completed = true;
    participant.completedAt = new Date();
    participant.points = challenge.rewards.points;

    // Create completion achievement
    await Achievement.create({
      user: req.user.id,
      type: 'challenge_completion',
      title: `Challenge Completed: ${challenge.title}`,
      description: `Successfully completed the ${challenge.title} challenge`,
      icon: '🎉',
      points: challenge.rewards.points,
      metadata: { 
        challengeId: challenge._id,
        challengeTitle: challenge.title
      }
    });
  }

  await challenge.save();

  res.json({
    success: true,
    data: participant,
    completed: isCompleted
  });
});

// @desc    Get challenge leaderboard
// @route   GET /api/challenges/:id/leaderboard
// @access  Public
const getLeaderboard = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id)
    .populate('participants.user', 'name displayName profilePhotos');

  if (!challenge) {
    res.status(404);
    throw new Error('Challenge not found');
  }

  // Sort participants by points (descending), then by completion time
  const sortedParticipants = challenge.participants
    .sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      if (a.completed && b.completed) {
        return a.completedAt - b.completedAt;
      }
      if (a.completed) return -1;
      if (b.completed) return 1;
      return 0;
    })
    .map((participant, index) => ({
      ...participant.toObject(),
      rank: index + 1
    }));

  res.json({
    success: true,
    data: {
      challenge: {
        title: challenge.title,
        type: challenge.type,
        category: challenge.category
      },
      participants: sortedParticipants
    }
  });
});

// @desc    Get user's challenges
// @route   GET /api/challenges/user/me
// @access  Private
const getUserChallenges = asyncHandler(async (req, res) => {
  const challenges = await Challenge.find({
    'participants.user': req.user.id
  })
  .populate('createdBy', 'name displayName')
  .sort({ startDate: -1 });

  res.json({
    success: true,
    data: challenges
  });
});

// @desc    Get user's achievements
// @route   GET /api/challenges/achievements
// @access  Private
const getUserAchievements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const achievements = await Achievement.find({ user: req.user.id })
    .sort({ earnedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Achievement.countDocuments({ user: req.user.id });

  const totalPoints = await Achievement.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: null, total: { $sum: '$points' } } }
  ]);

  res.json({
    success: true,
    data: achievements,
    totalPoints: totalPoints[0]?.total || 0,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
});

// @desc    Mark achievement as read
// @route   PUT /api/challenges/achievements/:id/read
// @access  Private
const markAchievementRead = asyncHandler(async (req, res) => {
  const achievement = await Achievement.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!achievement) {
    res.status(404);
    throw new Error('Achievement not found');
  }

  achievement.isRead = true;
  await achievement.save();

  res.json({
    success: true,
    message: 'Achievement marked as read'
  });
});

// @desc    Get global leaderboard
// @route   GET /api/challenges/leaderboard/global
// @access  Public
const getGlobalLeaderboard = asyncHandler(async (req, res) => {
  const { period = 'all' } = req.query;
  
  let dateFilter = {};
  if (period === 'month') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    dateFilter = { earnedAt: { $gte: startOfMonth } };
  } else if (period === 'week') {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    dateFilter = { earnedAt: { $gte: startOfWeek } };
  }

  const leaderboard = await Achievement.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$user',
        totalPoints: { $sum: '$points' },
        achievementCount: { $sum: 1 }
      }
    },
    { $sort: { totalPoints: -1 } },
    { $limit: 50 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        user: {
          _id: '$user._id',
          name: '$user.name',
          displayName: '$user.displayName',
          profilePhotos: '$user.profilePhotos'
        },
        totalPoints: 1,
        achievementCount: 1
      }
    }
  ]);

  res.json({
    success: true,
    data: leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))
  });
});

// @desc    Delete a challenge
// @route   DELETE /api/challenges/:id
// @access  Private (Admin only)
const deleteChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);

  if (!challenge) {
    res.status(404);
    throw new Error('Challenge not found');
  }

  await challenge.deleteOne();

  res.json({
    success: true,
    message: 'Challenge deleted successfully'
  });
});

module.exports = {
  createChallenge,
  getChallenges,
  getChallengeById,
  joinChallenge,
  leaveChallenge,
  updateProgress,
  getLeaderboard,
  getUserChallenges,
  getUserAchievements,
  markAchievementRead,
  getGlobalLeaderboard,
  deleteChallenge
};
