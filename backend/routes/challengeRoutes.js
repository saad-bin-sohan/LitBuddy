const express = require('express');
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

// Public routes
router.get('/', getChallenges);
router.get('/:id', getChallengeById);
router.get('/:id/leaderboard', getLeaderboard);
router.get('/leaderboard/global', getGlobalLeaderboard);

// Protected routes
router.use(protect);

router.post('/:id/join', joinChallenge);
router.delete('/:id/leave', leaveChallenge);
router.put('/:id/progress', updateProgress);
router.get('/user/me', getUserChallenges);
router.get('/achievements', getUserAchievements);
router.put('/achievements/:id/read', markAchievementRead);

// Admin only routes
router.post('/', requireRole('admin'), createChallenge);
router.delete('/:id', requireRole('admin'), deleteChallenge);

module.exports = router;
