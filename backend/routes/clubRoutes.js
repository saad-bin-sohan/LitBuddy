const express = require('express');
const router = express.Router();
const {
  getClubs,
  getClub,
  createClub,
  updateClub,
  deleteClub,
  joinClub,
  leaveClub,
  inviteToClub,
  promoteMember,
  demoteMember,
  removeMember
} = require('../controllers/clubController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Club CRUD routes
router.get('/', getClubs);
router.post('/', createClub);
router.get('/:clubId', getClub);
router.put('/:clubId', updateClub);
router.delete('/:clubId', deleteClub);

// Membership routes
router.post('/:clubId/join', joinClub);
router.post('/:clubId/leave', leaveClub);
router.post('/:clubId/invite', inviteToClub);

// Member management routes
router.post('/:clubId/members/:memberId/promote', promoteMember);
router.post('/:clubId/members/:memberId/demote', demoteMember);
router.delete('/:clubId/members/:memberId', removeMember);

module.exports = router;
