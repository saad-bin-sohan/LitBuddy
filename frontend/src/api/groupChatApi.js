import { apiJson, apiFetch, parseJsonSafe } from './httpClient';

export const getGroupChats = async (clubId) => apiJson(`/group-chats/${clubId}`);

export const getGroupChat = async (chatId) => apiJson(`/group-chats/chat/${chatId}`);

export const createGroupChat = async (clubId, chatData) =>
  apiJson(`/group-chats/${clubId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chatData),
  });

export const updateGroupChat = async (chatId, chatData) =>
  apiJson(`/group-chats/chat/${chatId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chatData),
  });

export const deleteGroupChat = async (chatId) =>
  apiJson(`/group-chats/chat/${chatId}`, {
    method: 'DELETE',
  });

export const sendGroupMessage = async (chatId, messageData) => {
  const formData = new FormData();
  if (messageData.text) formData.append('text', messageData.text);
  if (Array.isArray(messageData.attachments)) {
    messageData.attachments.forEach((file) => formData.append('attachments', file));
  }

  const response = await apiFetch(`/group-chats/message/${chatId}`, {
    method: 'POST',
    body: formData,
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const error = new Error(data.message || 'Failed to send group message');
    error.status = response.status;
    error.body = data;
    throw error;
  }
  return data;
};

export const addParticipant = async (chatId, userId) =>
  apiJson(`/group-chats/chat/${chatId}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

export const removeParticipant = async (chatId, userId) =>
  apiJson(`/group-chats/chat/${chatId}/participants/${userId}`, {
    method: 'DELETE',
  });
