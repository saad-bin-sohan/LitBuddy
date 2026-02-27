const mongoose = require('mongoose');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');
const stompBroker = require('../utils/stompBroker');
const notificationService = require('./notificationService');
const { logger } = require('../utils/logger');

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  const text = String(id);
  if (!mongoose.Types.ObjectId.isValid(text)) return null;
  return new mongoose.Types.ObjectId(text);
}

function toUserIdText(user) {
  if (!user) return '';
  return String(user._id || user.id || user);
}

function buildLimitError({ blockedFor, currentCount, maxAllowed }) {
  const err = new Error('Active conversations limit reached');
  err.status = 403;
  err.blockedFor = String(blockedFor);
  err.currentCount = currentCount;
  err.maxAllowed = maxAllowed;
  return err;
}

function buildForbidden(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}

async function getActiveConversationCount(userId) {
  return Chat.countDocuments({
    participants: toObjectId(userId),
    status: 'active',
  });
}

async function syncUsersActiveConversationCounts(userIds) {
  const uniqueIds = [...new Set(userIds.map((id) => String(id)).filter(Boolean))];
  await Promise.all(
    uniqueIds.map(async (id) => {
      const count = await getActiveConversationCount(id);
      await User.findByIdAndUpdate(id, { activeConversations: count });
    })
  );
}

async function assertActiveConversationCapacity(userIds) {
  const uniqueIds = [...new Set(userIds.map((id) => String(id)).filter(Boolean))];

  for (const id of uniqueIds) {
    const user = await User.findById(id).select('_id maxActiveConversations');
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const currentCount = await getActiveConversationCount(user._id);
    const maxAllowed = Number.isFinite(Number(user.maxActiveConversations))
      ? Number(user.maxActiveConversations)
      : 3;
    if (currentCount >= maxAllowed) {
      throw buildLimitError({
        blockedFor: user._id,
        currentCount,
        maxAllowed,
      });
    }
  }
}

function publishConversationStatus(chat) {
  const payload = {
    chatId: String(chat._id),
    status: chat.status,
    pausedBy: chat.pausedBy ? String(chat.pausedBy) : null,
    pausedAt: chat.pausedAt ? new Date(chat.pausedAt).toISOString() : null,
    lastActive: chat.lastActive ? new Date(chat.lastActive).toISOString() : null,
  };

  try {
    stompBroker.publish(`/topic/chat/${chat._id}/status`, payload);
    for (const participant of chat.participants) {
      stompBroker.publish(`/user/${participant}/queue/conversation-status`, payload);
    }
  } catch (err) {
    logger.error({ err, chatId: String(chat._id) }, 'chat.publish_status_failed');
  }
}

async function notifyParticipants(chat, actorId, { title, bodyPrefix }) {
  try {
    for (const participant of chat.participants) {
      if (String(participant) === String(actorId)) continue;
      await notificationService.createAndSend({
        userId: participant,
        type: 'system',
        title,
        body: `${bodyPrefix} by ${String(actorId)}`,
        data: { chatId: chat._id },
      });
    }
  } catch (err) {
    logger.error({ err, chatId: String(chat._id) }, 'chat.notify_participants_failed');
  }
}

function hasMutualMatch(userA, userB) {
  const aId = String(userA._id);
  const bId = String(userB._id);
  const aMatches = Array.isArray(userA.matches) ? userA.matches.map(String) : [];
  const bMatches = Array.isArray(userB.matches) ? userB.matches.map(String) : [];
  return aMatches.includes(bId) && bMatches.includes(aId);
}

async function createChatBetween(requesterIdRaw, otherUserIdRaw) {
  const requesterId = toObjectId(requesterIdRaw);
  const otherUserId = toObjectId(otherUserIdRaw);
  if (!requesterId || !otherUserId) {
    const err = new Error('Invalid user ID');
    err.status = 400;
    throw err;
  }
  if (String(requesterId) === String(otherUserId)) {
    const err = new Error('Cannot start a conversation with yourself');
    err.status = 400;
    throw err;
  }

  const existingChat = await Chat.findOne({
    participants: { $all: [requesterId, otherUserId] },
    $expr: { $eq: [{ $size: '$participants' }, 2] },
  }).sort({ createdAt: -1 });
  if (existingChat) return existingChat.toObject();

  const [userA, userB] = await Promise.all([
    User.findById(requesterId).select('_id name displayName matches suspendedUntil maxActiveConversations'),
    User.findById(otherUserId).select('_id name displayName matches suspendedUntil maxActiveConversations'),
  ]);
  if (!userA || !userB) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (userB.suspendedUntil && userB.suspendedUntil > new Date()) {
    throw buildForbidden('Cannot start chat with suspended user');
  }
  if (!hasMutualMatch(userA, userB)) {
    throw buildForbidden('You can only start chats with matched users');
  }

  await assertActiveConversationCapacity([userA._id, userB._id]);

  const chatDoc = await Chat.create({
    participants: [userA._id, userB._id],
    status: 'active',
    lastActive: new Date(),
    messages: [],
  });

  await syncUsersActiveConversationCounts([userA._id, userB._id]);

  publishConversationStatus(chatDoc);

  try {
    await notificationService.createAndSend({
      userId: userB._id,
      type: 'message',
      title: 'New conversation started',
      body: `You have a new conversation with ${userA.displayName || userA.name || 'Someone'}`,
      data: { chatId: chatDoc._id },
    });
  } catch (err) {
    logger.error({ err, chatId: String(chatDoc._id) }, 'chat.create_notify_failed');
  }

  return chatDoc.toObject();
}

async function listChatsForUser(userIdRaw) {
  const userId = toObjectId(userIdRaw);
  if (!userId) {
    const err = new Error('Invalid user ID');
    err.status = 400;
    throw err;
  }
  const userExists = await User.findById(userId).select('_id');
  if (!userExists) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (mongoose.connection.readyState !== 1) {
    const err = new Error('Database connection not ready');
    err.status = 503;
    throw err;
  }

  const chats = await Chat.find({ participants: userId })
    .populate('participants', 'name displayName profilePhotos location')
    .populate('messages.sender', 'name displayName')
    .sort({ lastActive: -1, updatedAt: -1 })
    .lean();

  return chats.map((chat) => {
    const otherParticipant = Array.isArray(chat.participants)
      ? chat.participants.find((p) => String(p._id) !== String(userId))
      : null;
    const lastMessage = Array.isArray(chat.messages) && chat.messages.length > 0
      ? chat.messages[chat.messages.length - 1]
      : null;
    const unreadCount = Array.isArray(chat.messages)
      ? chat.messages.filter(
        (msg) => msg.sender && msg.sender._id && String(msg.sender._id) !== String(userId)
      ).length
      : 0;

    return {
      ...chat,
      otherParticipant,
      lastMessage: lastMessage
        ? {
          text: lastMessage.text,
          timestamp: lastMessage.timestamp,
          sender: lastMessage.sender,
        }
        : null,
      unreadCount,
      lastActivity: lastMessage ? lastMessage.timestamp : chat.lastActive || chat.updatedAt,
    };
  });
}

async function pauseChat(requesterIdRaw, chatIdRaw) {
  const requesterId = toObjectId(requesterIdRaw);
  const chatId = toObjectId(chatIdRaw);
  if (!requesterId || !chatId) {
    const err = new Error('Invalid chat or user ID');
    err.status = 400;
    throw err;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }
  if (!chat.participants.map(String).includes(String(requesterId))) {
    throw buildForbidden('Not a participant');
  }
  if (chat.status !== 'active') {
    const err = new Error(`Chat cannot be paused from status "${chat.status}"`);
    err.status = 409;
    err.chatStatus = chat.status;
    throw err;
  }

  chat.status = 'paused';
  chat.pausedBy = requesterId;
  chat.pausedAt = new Date();
  await chat.save();

  await syncUsersActiveConversationCounts(chat.participants);
  publishConversationStatus(chat);
  await notifyParticipants(chat, requesterId, {
    title: 'Conversation paused',
    bodyPrefix: 'A conversation was paused',
  });

  return chat.toObject();
}

async function resumeChat(requesterIdRaw, chatIdRaw) {
  const requesterId = toObjectId(requesterIdRaw);
  const chatId = toObjectId(chatIdRaw);
  if (!requesterId || !chatId) {
    const err = new Error('Invalid chat or user ID');
    err.status = 400;
    throw err;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }
  if (!chat.participants.map(String).includes(String(requesterId))) {
    throw buildForbidden('Not a participant');
  }
  if (chat.status !== 'paused') {
    const err = new Error(`Chat cannot be resumed from status "${chat.status}"`);
    err.status = 409;
    err.chatStatus = chat.status;
    throw err;
  }

  await assertActiveConversationCapacity(chat.participants);

  chat.status = 'active';
  chat.pausedBy = null;
  chat.pausedAt = null;
  chat.lastActive = new Date();
  await chat.save();

  await syncUsersActiveConversationCounts(chat.participants);
  publishConversationStatus(chat);
  await notifyParticipants(chat, requesterId, {
    title: 'Conversation resumed',
    bodyPrefix: 'A conversation was resumed',
  });

  return chat.toObject();
}

async function appendMessage(senderIdRaw, chatIdRaw, text, attachments = []) {
  const senderId = toObjectId(senderIdRaw);
  const chatId = toObjectId(chatIdRaw);
  if (!senderId || !chatId) {
    const err = new Error('Invalid chat or sender ID');
    err.status = 400;
    throw err;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }
  if (!chat.participants.map(String).includes(String(senderId))) {
    throw buildForbidden('Not a participant');
  }
  if (chat.status !== 'active') {
    const err = new Error('Chat is not active');
    err.status = 409;
    err.chatStatus = chat.status;
    throw err;
  }

  chat.messages.push({
    sender: senderId,
    text,
    attachments,
    timestamp: new Date(),
  });
  chat.lastActive = new Date();
  await chat.save();

  await chat.populate({ path: 'messages.sender', select: 'name displayName' });
  const message = chat.messages[chat.messages.length - 1];
  const payload = { chatId: String(chat._id), message };

  try {
    stompBroker.publish(`/topic/chat/${chat._id}/messages`, payload);
    for (const participant of chat.participants) {
      stompBroker.publish(`/user/${participant}/queue/messages`, payload);
    }
  } catch (err) {
    logger.error({ err, chatId: String(chat._id) }, 'chat.publish_message_failed');
  }

  try {
    for (const participant of chat.participants) {
      if (String(participant) === String(senderId)) continue;
      await notificationService.createAndSend({
        userId: participant,
        type: 'message',
        title: 'New message',
        body: (text || '').slice(0, 200),
        data: { chatId: chat._id },
      });
    }
  } catch (err) {
    logger.error({ err, chatId: String(chat._id) }, 'chat.message_notify_failed');
  }

  return chat.toObject();
}

async function getChatForUser(userIdRaw, chatIdRaw) {
  const userId = toObjectId(userIdRaw);
  const chatId = toObjectId(chatIdRaw);
  if (!userId || !chatId) {
    const err = new Error('Invalid chat or user ID');
    err.status = 400;
    throw err;
  }

  const chat = await Chat.findById(chatId)
    .populate('participants', 'name displayName profilePhotos')
    .populate('messages.sender', 'name displayName');
  if (!chat) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }
  if (!chat.participants.map((p) => toUserIdText(p)).includes(String(userId))) {
    throw buildForbidden('Not a participant');
  }

  const otherParticipant = chat.participants.find((p) => String(p._id) !== String(userId)) || null;
  const fallbackName = otherParticipant
    ? (otherParticipant.displayName || otherParticipant.name || 'User')
    : 'Conversation';

  return {
    messages: chat.messages || [],
    status: chat.status,
    pausedBy: chat.pausedBy,
    pausedAt: chat.pausedAt,
    participants: chat.participants,
    name: chat.name || `Chat with ${fallbackName}`,
    otherParticipant,
  };
}

module.exports = {
  createChatBetween,
  listChatsForUser,
  pauseChat,
  resumeChat,
  appendMessage,
  getChatForUser,
};
