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

// Club CRUD operations
export const getClubs = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/clubs`, {
    ...getAuthHeaders(),
    params,
  });
  return response.data;
};

export const getClub = async (clubId) => {
  const response = await axios.get(`${API_BASE_URL}/clubs/${clubId}`, getAuthHeaders());
  return response.data;
};

export const createClub = async (clubData) => {
  const response = await axios.post(`${API_BASE_URL}/clubs`, clubData, getAuthHeaders());
  return response.data;
};

export const updateClub = async (clubId, clubData) => {
  const response = await axios.put(`${API_BASE_URL}/clubs/${clubId}`, clubData, getAuthHeaders());
  return response.data;
};

export const deleteClub = async (clubId) => {
  const response = await axios.delete(`${API_BASE_URL}/clubs/${clubId}`, getAuthHeaders());
  return response.data;
};

// Membership operations
export const joinClub = async (clubId) => {
  const response = await axios.post(`${API_BASE_URL}/clubs/${clubId}/join`, {}, getAuthHeaders());
  return response.data;
};

export const leaveClub = async (clubId) => {
  const response = await axios.post(`${API_BASE_URL}/clubs/${clubId}/leave`, {}, getAuthHeaders());
  return response.data;
};

export const inviteToClub = async (clubId, userId) => {
  const response = await axios.post(
    `${API_BASE_URL}/clubs/${clubId}/invite`,
    { userId },
    getAuthHeaders()
  );
  return response.data;
};

// Member management
export const promoteMember = async (clubId, memberId) => {
  const response = await axios.post(
    `${API_BASE_URL}/clubs/${clubId}/members/${memberId}/promote`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

export const demoteMember = async (clubId, memberId) => {
  const response = await axios.post(
    `${API_BASE_URL}/clubs/${clubId}/members/${memberId}/demote`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

export const removeMember = async (clubId, memberId) => {
  const response = await axios.delete(
    `${API_BASE_URL}/clubs/${clubId}/members/${memberId}`,
    getAuthHeaders()
  );
  return response.data;
};
