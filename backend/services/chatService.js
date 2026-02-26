// backend/services/chatService.js

const mongoose = require('mongoose');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');
const stompBroker = require('../utils/stompBroker');
const notificationService = require('./notificationService');
const { logger } = require('../utils/logger');

/**
 * Convert input to ObjectId (safe)
 */
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  const s = String(id);
  if (mongoose.Types.ObjectId.isValid(s)) return new mongoose.Types.ObjectId(s);
  return null;
}

/**
 * Helper: publish conversation status updates via STOMP
 */
function publishConversationStatus(chat) {
  const payload = {
    chatId: String(chat._id),
    status: chat.status,
    pausedBy: chat.pausedBy ? String(chat.pausedBy) : null,
    pausedAt: chat.pausedAt ? chat.pausedAt.toISOString() : null,
    lastActive: chat.lastActive ? chat.lastActive.toISOString() : null,
  };
  
  try {
    // Publish to chat status topic
    stompBroker.publish(`/topic/chat/${chat._id}/status`, payload);
    
    // Publish to personal queues for each participant
    for (const p of chat.participants) {
      stompBroker.publish(`/user/${p}/queue/conversation-status`, payload);
    }
    
    logger.debug(
      {
        chatId: String(chat._id),
        participantCount: chat.participants.length,
      },
      'chat.status_published'
    );
  } catch (err) {
    logger.error({ err, chatId: String(chat._id) }, 'chat.publish_status_failed');
  }
}

/**
 * Create a new chat between two matched users
 */
async function createChatBetween(requesterId, otherUserId) {
  // Validate inputs
  const userA = await User.findById(requesterId);
  const userB = await User.findById(otherUserId);
  
  if (!userA || !userB) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  // Check if chat already exists
  const existingChat = await Chat.findOne({
    participants: { $all: [requesterId, otherUserId] }
  });

  if (existingChat) {
    return existingChat.toObject();
  }

  // Create new chat
  const chatDoc = new Chat({
    participants: [requesterId, otherUserId],
    status: 'active',
    lastActive: new Date(),
    messages: []
  });

  await chatDoc.save();

  // Emit STOMP events
  publishConversationStatus(chatDoc);

  // Persist notification
  try {
    await notificationService.createAndSend({
      userId: userB._id,
      type: 'message',
      title: 'New conversation started',
      body: `You have a new conversation with ${userA.displayName || userA.name || 'Someone'}`,
      data: { chatId: chatDoc._id },
    });
  } catch (e) {
    // ignore
  }

  return chatDoc.toObject();
}

/**
 * List chats for a user
 */
async function listChatsForUser(userIdRaw) {
  const userId = toObjectId(userIdRaw);
  if (!userId) {
    const err = new Error('Invalid user ID');
    err.status = 400;
    throw err;
  }

  // Validate that the user exists
  try {
    const userExists = await require('../models/userModel').findById(userId).select('_id');
    if (!userExists) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
  } catch (userError) {
    logger.error({ err: userError, userId: String(userIdRaw) }, 'chat.user_validation_failed');
    const err = new Error('Failed to validate user');
    err.status = 500;
    throw err;
  }

  try {
    logger.debug({ userId: String(userId) }, 'chat.list_fetch_started');
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      const err = new Error('Database connection not ready');
      err.status = 503;
      throw err;
    }
    
    // Find all chats where the user is a participant
    const chats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'name displayName profilePhoto location')
    .populate('messages.sender', 'name displayName')
    .sort({ lastActive: -1, updatedAt: -1 })
    .lean();

    logger.debug({ userId: String(userId), chatCount: chats.length }, 'chat.list_fetch_completed');

    // Process each chat to add computed fields
    const processedChats = chats.map(chat => {
      try {
        const otherParticipant = chat.participants.find(p => String(p._id) !== String(userId));
        const lastMessage = chat.messages && chat.messages.length > 0 
          ? chat.messages[chat.messages.length - 1] 
          : null;
        
        // Calculate unread count (messages not from current user)
        const unreadCount = chat.messages ? chat.messages.filter(msg => 
          msg.sender && msg.sender._id && String(msg.sender._id) !== String(userId)
        ).length : 0;

        return {
          ...chat,
          otherParticipant,
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            timestamp: lastMessage.timestamp,
            sender: lastMessage.sender
          } : null,
          unreadCount,
          // Ensure we have the last activity timestamp
          lastActivity: lastMessage ? lastMessage.timestamp : chat.lastActive || chat.updatedAt
        };
      } catch (chatError) {
        logger.error(
          {
            err: chatError,
            chatId: String(chat._id),
            userId: String(userId),
          },
          'chat.list_item_processing_failed'
        );
        // Return a minimal chat object if processing fails
        return {
          ...chat,
          otherParticipant: null,
          lastMessage: null,
          unreadCount: 0,
          lastActivity: chat.updatedAt
        };
      }
    });

    logger.debug(
      {
        userId: String(userId),
        processedCount: processedChats.length,
      },
      'chat.list_processing_completed'
    );
    return processedChats;
  } catch (error) {
    logger.error({ err: error, userId: String(userId) }, 'chat.list_failed');
    const err = new Error('Failed to fetch chats');
    err.status = 500;
    throw err;
  }
}

/**
 * Pause a chat
 */
async function pauseChat(requesterId, chatId) {
  // ... [unchanged business logic]

  // publish STOMP status
  publishConversationStatus(chat);

  // notify other participant
  try {
    for (const p of chat.participants) {
      if (String(p) === String(requesterId)) continue;
      await notificationService.createAndSend({
        userId: p,
        type: 'system',
        title: 'Conversation paused',
        body: `A conversation was paused by ${String(requesterId)}`,
        data: { chatId: chat._id },
      });
    }
  } catch (e) {
    // ignore
  }

  return chat.toObject();
}

/**
 * Resume a paused chat
 */
async function resumeChat(requesterId, chatId) {
  // ... [unchanged business logic]

  // publish STOMP status
  publishConversationStatus(chat);

  // notify other participant
  try {
    for (const p of chat.participants) {
      if (String(p) === String(requesterId)) continue;
      await notificationService.createAndSend({
        userId: p,
        type: 'system',
        title: 'Conversation resumed',
        body: `A conversation was resumed by ${String(requesterId)}`,
        data: { chatId: chat._id },
      });
    }
  } catch (e) {
    // ignore
  }

  return chat.toObject();
}

/**
 * Append a message to a chat
 */
async function appendMessage(senderId, chatId, text, attachments = []) {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }

  if (!chat.participants.map(String).includes(String(senderId))) {
    const err = new Error('Not a participant');
    err.status = 403;
    throw err;
  }

  if (chat.status !== 'active') {
    const err = new Error('Chat is not active');
    err.status = 409;
    err.chatStatus = chat.status;
    throw err;
  }

  const message = { sender: toObjectId(senderId), text, attachments, timestamp: new Date() };
  chat.messages.push(message);
  chat.lastActive = new Date();
  await chat.save();

  // populate message sender for returned payload
  await chat.populate({ path: 'messages.sender', select: 'name displayName' });

  // Publish STOMP message event
  const msg = chat.messages[chat.messages.length - 1];
  const payload = { chatId: String(chat._id), message: msg };

  try {
    // Publish to chat messages topic
    stompBroker.publish(`/topic/chat/${chat._id}/messages`, payload);
    
    // Publish to personal queues for each participant
    for (const p of chat.participants) {
      stompBroker.publish(`/user/${p}/queue/messages`, payload);
    }
    
    logger.debug(
      {
        chatId: String(chat._id),
        participantCount: chat.participants.length,
      },
      'chat.message_published'
    );
  } catch (err) {
    logger.error({ err, chatId: String(chat._id) }, 'chat.publish_message_failed');
  }

  // Persist notification
  try {
    for (const p of chat.participants) {
      if (String(p) === String(senderId)) continue;
      await notificationService.createAndSend({
        userId: p,
        type: 'message',
        title: 'New message',
        body: (text || '').slice(0, 200),
        data: { chatId: chat._id },
      });
    }
  } catch (e) {
    // ignore
  }

  return chat.toObject();
}

/**
 * Get messages ensuring requester is a participant
 */
async function getChatForUser(userId, chatId) {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }

  if (!chat.participants.map(String).includes(String(userId))) {
    const err = new Error('Not a participant');
    err.status = 403;
    throw err;
  }

  // Populate sender information for messages
  await chat.populate({ path: 'messages.sender', select: 'name displayName' });

  // Return both messages and chat metadata
  return {
    messages: chat.messages || [],
    chatMeta: {
      status: chat.status,
      pausedBy: chat.pausedBy,
      pausedAt: chat.pausedAt,
      participants: chat.participants,
      name: chat.name || 'Conversation'
    }
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
