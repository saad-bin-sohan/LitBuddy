const mongoose = require('mongoose');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');
const stompBroker = require('../utils/stompBroker');
const notificationService = require('./notificationService');
const { logger } = require('../utils/logger');
const Message = require('../models/messageModel');

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

  // Load chats WITHOUT populating messages (they live in separate collection now)
  const chats = await Chat.find({ participants: userId })
    .populate('participants', 'name displayName profilePhotos location')
    .sort({ lastActive: -1, updatedAt: -1 })
    .lean();

  if (chats.length === 0) return [];

  // Compute unread counts for all chats in parallel.
  // Unread = messages in this chat, NOT sent by this user,
  // timestamped AFTER this user's lastReadAt for this chat.
  const unreadCounts = await Promise.all(
    chats.map((chat) => {
      // lastReadAt is a Mongoose Map serialized to a plain object in lean()
      const lastReadRaw = chat.lastReadAt;
      const lastRead =
        (lastReadRaw instanceof Map
          ? lastReadRaw.get(String(userId))
          : lastReadRaw?.[String(userId)]) || new Date(0);

      return Message.countDocuments({
        chatId: chat._id,
        sender: { $ne: userId },
        timestamp: { $gt: lastRead },
      });
    })
  );

  return chats.map((chat, i) => {
    const otherParticipant = Array.isArray(chat.participants)
      ? chat.participants.find((p) => String(p._id) !== String(userId))
      : null;

    return {
      ...chat,
      otherParticipant,
      lastMessage: chat.lastMessage?.timestamp ? chat.lastMessage : null,
      unreadCount: unreadCounts[i],
      lastActivity: chat.lastMessage?.timestamp || chat.lastActive || chat.updatedAt,
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

  // Create the message in the standalone Message collection
  const newMessage = await Message.create({
    chatId: chat._id,
    sender: senderId,
    text: text || undefined,
    attachments,
    timestamp: new Date(),
  });

  // Populate sender for the realtime payload and response
  await newMessage.populate('sender', 'name displayName');

  // Update the denormalized lastMessage on the Chat document
  chat.lastMessage = {
    text: newMessage.text || '',
    timestamp: newMessage.timestamp,
    sender: senderId,
  };
  chat.lastActive = newMessage.timestamp;
  await chat.save();

  const payload = { chatId: String(chat._id), message: newMessage.toObject() };

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

  // Return just the new message (controller will send { message: newMessage })
  return newMessage.toObject();
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
    .populate('participants', 'name displayName profilePhotos');
  if (!chat) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }
  if (!chat.participants.map((p) => toUserIdText(p)).includes(String(userId))) {
    throw buildForbidden('Not a participant');
  }

  // Fetch messages from the standalone collection, sorted oldest-first.
  // Capped at 500 messages for now; pagination can be added later.
  const messages = await Message.find({ chatId: chat._id })
    .populate('sender', 'name displayName')
    .sort({ timestamp: 1 })
    .limit(500)
    .lean();

  const otherParticipant =
    chat.participants.find((p) => String(p._id) !== String(userId)) || null;
  const fallbackName = otherParticipant
    ? otherParticipant.displayName || otherParticipant.name || 'User'
    : 'Conversation';

  return {
    messages,
    status: chat.status,
    pausedBy: chat.pausedBy,
    pausedAt: chat.pausedAt,
    participants: chat.participants,
    name: chat.name || `Chat with ${fallbackName}`,
    otherParticipant,
  };
}

async function markChatAsRead(userIdRaw, chatIdRaw) {
  const userId = toObjectId(userIdRaw);
  const chatId = toObjectId(chatIdRaw);
  if (!userId || !chatId) {
    const err = new Error('Invalid chat or user ID');
    err.status = 400;
    throw err;
  }

  const chat = await Chat.findById(chatId).select('participants lastReadAt');
  if (!chat) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }
  if (!chat.participants.map(String).includes(String(userId))) {
    throw buildForbidden('Not a participant');
  }

  // Update the per-user lastReadAt timestamp
  chat.lastReadAt.set(String(userId), new Date());
  await chat.save();
}

module.exports = {
  createChatBetween,
  listChatsForUser,
  pauseChat,
  resumeChat,
  appendMessage,
  getChatForUser,
  markChatAsRead,
};
