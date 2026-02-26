const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const {
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
} = require('../controllers/challengeController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');

const validateChallengeId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Challenge not found', code: 'CHALLENGE_NOT_FOUND' });
  }
  return next();
};

// Public routes
router.get('/', getChallenges);
router.get('/leaderboard/global', getGlobalLeaderboard);
router.get('/:id/leaderboard', validateChallengeId, getLeaderboard);
router.get('/:id', validateChallengeId, getChallengeById);

// Protected routes
router.use(protect);

router.get('/user/me', getUserChallenges);
router.get('/achievements', getUserAchievements);
router.put('/achievements/:id/read', markAchievementRead);
router.post('/:id/join', validateChallengeId, joinChallenge);
router.delete('/:id/leave', validateChallengeId, leaveChallenge);
router.put('/:id/progress', validateChallengeId, updateProgress);

// Admin only routes
router.post('/', requireRole('admin'), createChallenge);
router.delete('/:id', validateChallengeId, requireRole('admin'), deleteChallenge);

module.exports = router;
