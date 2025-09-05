const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to make authenticated requests
const makeAuthRequest = async (url, options = {}) => {
  const token = getAuthToken();
  const config = {
    ...options,
    credentials: 'include', // send cookies
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  };
  
  const response = await fetch(`${API_URL}${url}`, config);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

// Get all active challenges
export const getChallenges = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await fetch(`${API_URL}/challenges?${params.toString()}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch challenges');
    }
    return response.json();
  } catch (error) {
    throw error.message || 'Failed to fetch challenges';
  }
};

// Get challenge by ID
export const getChallengeById = async (challengeId) => {
  try {
    const response = await fetch(`${API_URL}/challenges/${challengeId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch challenge');
    }
    return response.json();
  } catch (error) {
    throw error.message || 'Failed to fetch challenge';
  }
};

// Join a challenge
export const joinChallenge = async (challengeId) => {
  try {
    return await makeAuthRequest(`/challenges/${challengeId}/join`, {
      method: 'POST'
    });
  } catch (error) {
    throw error.message || 'Failed to join challenge';
  }
};

// Leave a challenge
export const leaveChallenge = async (challengeId) => {
  try {
    return await makeAuthRequest(`/challenges/${challengeId}/leave`, {
      method: 'DELETE'
    });
  } catch (error) {
    throw error.message || 'Failed to leave challenge';
  }
};

// Update challenge progress
export const updateChallengeProgress = async (challengeId, progressData) => {
  try {
    return await makeAuthRequest(`/challenges/${challengeId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progressData)
    });
  } catch (error) {
    throw error.message || 'Failed to update progress';
  }
};

// Get challenge leaderboard
export const getChallengeLeaderboard = async (challengeId) => {
  try {
    const response = await fetch(`${API_URL}/challenges/${challengeId}/leaderboard`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch leaderboard');
    }
    return response.json();
  } catch (error) {
    throw error.message || 'Failed to fetch leaderboard';
  }
};

// Get user's challenges
export const getUserChallenges = async () => {
  try {
    return await makeAuthRequest('/challenges/user/me');
  } catch (error) {
    throw error.message || 'Failed to fetch user challenges';
  }
};

// Get user's achievements
export const getUserAchievements = async (page = 1, limit = 20) => {
  try {
    return await makeAuthRequest(`/challenges/achievements?page=${page}&limit=${limit}`);
  } catch (error) {
    throw error.message || 'Failed to fetch achievements';
  }
};

// Mark achievement as read
export const markAchievementRead = async (achievementId) => {
  try {
    return await makeAuthRequest(`/challenges/achievements/${achievementId}/read`, {
      method: 'PUT'
    });
  } catch (error) {
    throw error.message || 'Failed to mark achievement as read';
  }
};

// Get global leaderboard
export const getGlobalLeaderboard = async (period = 'all') => {
  try {
    const response = await fetch(`${API_URL}/challenges/leaderboard/global?period=${period}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch global leaderboard');
    }
    return response.json();
  } catch (error) {
    throw error.message || 'Failed to fetch global leaderboard';
  }
};

// Create challenge (admin only)
export const createChallenge = async (challengeData) => {
  try {
    return await makeAuthRequest('/challenges', {
      method: 'POST',
      body: JSON.stringify(challengeData)
    });
  } catch (error) {
    throw error.message || 'Failed to create challenge';
  }
};
