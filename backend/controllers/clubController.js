const asyncHandler = require('express-async-handler');
const BookClub = require('../models/bookClubModel');
const ClubMember = require('../models/clubMemberModel');
const GroupChat = require('../models/groupChatModel');
const User = require('../models/userModel');

/**
 * GET /api/clubs
 * Get all public clubs or user's clubs
 */
const getClubs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, theme, search, myClubs = false } = req.query;
  const skip = (page - 1) * limit;

  let query = { isActive: true };

  if (myClubs === 'true') {
    // Get clubs where user is a member
    const memberships = await ClubMember.find({
      user: req.user._id,
      isActive: true
    }).select('club');
    const clubIds = memberships.map(m => m.club);
    query._id = { $in: clubIds };
  } else {
    // Public clubs only
    query.isPrivate = false;
  }

  if (theme) {
    query.theme = theme;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  const clubs = await BookClub.find(query)
    .populate('owner', 'name displayName profilePhotos')
    .populate('moderators', 'name displayName profilePhotos')
    .sort({ lastActivity: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Add membership status for each club
  for (const club of clubs) {
    const membership = await ClubMember.findOne({
      club: club._id,
      user: req.user._id,
      isActive: true
    }).select('role');
    club.membership = membership ? {
      isMember: true,
      role: membership.role
    } : { isMember: false };
  }

  const total = await BookClub.countDocuments(query);

  res.json({
    clubs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * GET /api/clubs/:clubId
 * Get club details
 */
const getClub = asyncHandler(async (req, res) => {
  const club = await BookClub.findOne({
    _id: req.params.clubId,
    isActive: true
  })
  .populate('owner', 'name displayName profilePhotos bio')
  .populate('moderators', 'name displayName profilePhotos')
  .lean();

  if (!club) {
    res.status(404);
    throw new Error('Club not found');
  }

  // Check if user can view this club
  const membership = await ClubMember.findOne({
    club: club._id,
    user: req.user._id,
    isActive: true
  });

  if (club.isPrivate && !membership) {
    res.status(403);
    throw new Error('This is a private club');
  }

  // Get members
  const members = await ClubMember.find({
    club: club._id,
    isActive: true
  })
  .populate('user', 'name displayName profilePhotos')
  .sort({ joinedAt: 1 })
  .lean();

  // Get recent activity (group chats with messages)
  const recentChats = await GroupChat.find({
    club: club._id,
    isActive: true
  })
  .populate('lastMessage.sender', 'name displayName')
  .sort({ lastActivity: -1 })
  .limit(5)
  .lean();

  res.json({
    ...club,
    members,
    membership: membership ? {
      isMember: true,
      role: membership.role,
      joinedAt: membership.joinedAt
    } : { isMember: false },
    recentChats
  });
});

/**
 * POST /api/clubs
 * Create a new club
 */
const createClub = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    theme,
    genres,
    isPrivate,
    maxMembers,
    rules,
    meetingSchedule,
    tags
  } = req.body;

  // Create the club
  const club = await BookClub.create({
    name,
    description,
    theme,
    genres: genres || [],
    isPrivate: isPrivate || false,
    owner: req.user._id,
    maxMembers: maxMembers || 50,
    rules,
    meetingSchedule,
    tags: tags || []
  });

  // Add owner as first member
  await ClubMember.create({
    club: club._id,
    user: req.user._id,
    role: 'owner'
  });

  // Create default group chat
  await GroupChat.create({
    club: club._id,
    name: 'General Discussion',
    description: 'Main discussion channel for the club',
    participants: [{
      user: req.user._id,
      role: 'owner'
    }],
    createdBy: req.user._id
  });

  const populatedClub = await BookClub.findById(club._id)
    .populate('owner', 'name displayName profilePhotos');

  res.status(201).json(populatedClub);
});

/**
 * PUT /api/clubs/:clubId
 * Update club details
 */
const updateClub = asyncHandler(async (req, res) => {
  const club = await BookClub.findById(req.params.clubId);

  if (!club) {
    res.status(404);
    throw new Error('Club not found');
  }

  // Check permissions
  if (!club.canManage(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to update this club');
  }

  const allowedFields = [
    'name', 'description', 'theme', 'genres', 'isPrivate',
    'maxMembers', 'rules', 'meetingSchedule', 'tags', 'coverImage'
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      club[field] = req.body[field];
    }
  });

  await club.save();
  await club.updateActivity();

  res.json(club);
});

/**
 * DELETE /api/clubs/:clubId
 * Delete club (only owner)
 */
const deleteClub = asyncHandler(async (req, res) => {
  const club = await BookClub.findById(req.params.clubId);

  if (!club) {
    res.status(404);
    throw new Error('Club not found');
  }

  if (!club.isOwner(req.user._id)) {
    res.status(403);
    throw new Error('Only club owner can delete the club');
  }

  // Soft delete
  club.isActive = false;
  await club.save();

  // Deactivate all memberships
  await ClubMember.updateMany(
    { club: club._id },
    { isActive: false }
  );

  // Deactivate all group chats
  await GroupChat.updateMany(
    { club: club._id },
    { isActive: false }
  );

  res.json({ message: 'Club deleted successfully' });
});

/**
 * POST /api/clubs/:clubId/join
 * Join a club
 */
const joinClub = asyncHandler(async (req, res) => {
  const club = await BookClub.findById(req.params.clubId);

  if (!club || !club.isActive) {
    res.status(404);
    throw new Error('Club not found');
  }

  // Check if already a member
  const existingMembership = await ClubMember.findOne({
    club: club._id,
    user: req.user._id,
    isActive: true
  });

  if (existingMembership) {
    res.status(400);
    throw new Error('Already a member of this club');
  }

  // Check member limit
  if (club.memberCount >= club.maxMembers) {
    res.status(400);
    throw new Error('Club is at maximum capacity');
  }

  // Create membership
  const membership = await ClubMember.create({
    club: club._id,
    user: req.user._id,
    role: 'member'
  });

  // Update club member count
  club.memberCount += 1;
  await club.save();

  // Add to default group chat
  const defaultChat = await GroupChat.findOne({
    club: club._id,
    name: 'General Discussion'
  });

  if (defaultChat) {
    await defaultChat.addParticipant(req.user._id, 'member');
  }

  res.json({
    message: 'Successfully joined the club',
    membership
  });
});

/**
 * POST /api/clubs/:clubId/leave
 * Leave a club
 */
const leaveClub = asyncHandler(async (req, res) => {
  const club = await BookClub.findById(req.params.clubId);

  if (!club) {
    res.status(404);
    throw new Error('Club not found');
  }

  const membership = await ClubMember.findOne({
    club: club._id,
    user: req.user._id,
    isActive: true
  });

  if (!membership) {
    res.status(400);
    throw new Error('Not a member of this club');
  }

  if (membership.role === 'owner') {
    res.status(400);
    throw new Error('Club owner cannot leave. Transfer ownership first or delete the club');
  }

  // Deactivate membership
  membership.isActive = false;
  await membership.save();

  // Update club member count
  club.memberCount -= 1;
  await club.save();

  // Remove from group chats
  await GroupChat.updateMany(
    { club: club._id },
    { $pull: { participants: { user: req.user._id } } }
  );

  res.json({ message: 'Successfully left the club' });
});

/**
 * POST /api/clubs/:clubId/invite
 * Invite user to club (moderators and owners only)
 */
const inviteToClub = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const club = await BookClub.findById(req.params.clubId);

  if (!club || !club.isActive) {
    res.status(404);
    throw new Error('Club not found');
  }

  // Check permissions
  const membership = await ClubMember.findOne({
    club: club._id,
    user: req.user._id,
    isActive: true
  });

  if (!membership || !membership.hasPermission('canInvite')) {
    res.status(403);
    throw new Error('Not authorized to invite members');
  }

  // Check if user exists
  const userToInvite = await User.findById(userId);
  if (!userToInvite) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if already a member
  const existingMembership = await ClubMember.findOne({
    club: club._id,
    user: userId,
    isActive: true
  });

  if (existingMembership) {
    res.status(400);
    throw new Error('User is already a member');
  }

  // Create membership
  const newMembership = await ClubMember.create({
    club: club._id,
    user: userId,
    role: 'member',
    invitedBy: req.user._id
  });

  // Update club member count
  club.memberCount += 1;
  await club.save();

  res.json({
    message: 'User invited successfully',
    membership: newMembership
  });
});

/**
 * POST /api/clubs/:clubId/members/:memberId/promote
 * Promote member to moderator
 */
const promoteMember = asyncHandler(async (req, res) => {
  const club = await BookClub.findById(req.params.clubId);

  if (!club || !club.isActive) {
    res.status(404);
    throw new Error('Club not found');
  }

  if (!club.isOwner(req.user._id)) {
    res.status(403);
    throw new Error('Only club owner can promote members to moderators');
  }

  const membership = await ClubMember.findOne({
    club: club._id,
    _id: req.params.memberId,
    isActive: true
  });

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  if (membership.role === 'owner') {
    res.status(400);
    throw new Error('Cannot promote owner');
  }

  await membership.promote();

  res.json({
    message: 'Member promoted successfully',
    membership
  });
});

/**
 * POST /api/clubs/:clubId/members/:memberId/demote
 * Demote moderator to member
 */
const demoteMember = asyncHandler(async (req, res) => {
  const club = await BookClub.findById(req.params.clubId);

  if (!club || !club.isActive) {
    res.status(404);
    throw new Error('Club not found');
  }

  if (!club.canManage(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to manage members');
  }

  const membership = await ClubMember.findOne({
    club: club._id,
    _id: req.params.memberId,
    isActive: true
  });

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  if (membership.role === 'owner') {
    res.status(400);
    throw new Error('Cannot demote owner');
  }

  await membership.demote();

  res.json({
    message: 'Member demoted successfully',
    membership
  });
});

/**
 * DELETE /api/clubs/:clubId/members/:memberId
 * Remove member from club
 */
const removeMember = asyncHandler(async (req, res) => {
  const club = await BookClub.findById(req.params.clubId);

  if (!club || !club.isActive) {
    res.status(404);
    throw new Error('Club not found');
  }

  const membership = await ClubMember.findOne({
    club: club._id,
    _id: req.params.memberId,
    isActive: true
  });

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  // Check permissions
  const currentUserMembership = await ClubMember.findOne({
    club: club._id,
    user: req.user._id,
    isActive: true
  });

  const canRemove = currentUserMembership &&
    (currentUserMembership.hasPermission('canRemoveMembers') ||
     membership.user.toString() === req.user._id); // Users can remove themselves

  if (!canRemove) {
    res.status(403);
    throw new Error('Not authorized to remove this member');
  }

  if (membership.role === 'owner') {
    res.status(400);
    throw new Error('Cannot remove club owner');
  }

  // Deactivate membership
  membership.isActive = false;
  await membership.save();

  // Update club member count
  club.memberCount -= 1;
  await club.save();

  // Remove from group chats
  await GroupChat.updateMany(
    { club: club._id },
    { $pull: { participants: { user: membership.user } } }
  );

  res.json({ message: 'Member removed successfully' });
});

module.exports = {
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
};
