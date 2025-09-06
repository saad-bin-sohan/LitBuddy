import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Group chat operations
export const getGroupChats = async (clubId) => {
  const response = await axios.get(`${API_BASE_URL}/group-chats/${clubId}`, getAuthHeaders());
  return response.data;
};

export const getGroupChat = async (chatId) => {
  const response = await axios.get(`${API_BASE_URL}/group-chats/chat/${chatId}`, getAuthHeaders());
  return response.data;
};

export const createGroupChat = async (clubId, chatData) => {
  const response = await axios.post(
    `${API_BASE_URL}/group-chats/${clubId}`,
    chatData,
    getAuthHeaders()
  );
  return response.data;
};

export const updateGroupChat = async (chatId, chatData) => {
  const response = await axios.put(
    `${API_BASE_URL}/group-chats/chat/${chatId}`,
    chatData,
    getAuthHeaders()
  );
  return response.data;
};

export const deleteGroupChat = async (chatId) => {
  const response = await axios.delete(
    `${API_BASE_URL}/group-chats/chat/${chatId}`,
    getAuthHeaders()
  );
  return response.data;
};

// Message operations
export const sendGroupMessage = async (chatId, messageData) => {
  const formData = new FormData();

  if (messageData.text) {
    formData.append('text', messageData.text);
  }

  if (messageData.attachments && messageData.attachments.length > 0) {
    messageData.attachments.forEach((file, index) => {
      formData.append('attachments', file);
    });
  }

  const response = await axios.post(
    `${API_BASE_URL}/group-chats/message/${chatId}`,
    formData,
    {
      ...getAuthHeaders(),
      headers: {
        ...getAuthHeaders().headers,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

// Participant management
export const addParticipant = async (chatId, userId) => {
  const response = await axios.post(
    `${API_BASE_URL}/group-chats/chat/${chatId}/participants`,
    { userId },
    getAuthHeaders()
  );
  return response.data;
};

export const removeParticipant = async (chatId, userId) => {
  const response = await axios.delete(
    `${API_BASE_URL}/group-chats/chat/${chatId}/participants/${userId}`,
    getAuthHeaders()
  );
  return response.data;
};
