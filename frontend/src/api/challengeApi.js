import { apiJson } from './httpClient';

const requestJson = async (path, options = {}) => apiJson(path, options);

export const getChallenges = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.category) params.append('category', filters.category);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  return requestJson(params.toString() ? `/challenges?${params.toString()}` : '/challenges');
};

export const getChallengeById = async (challengeId) =>
  requestJson(`/challenges/${challengeId}`);

export const joinChallenge = async (challengeId) =>
  requestJson(`/challenges/${challengeId}/join`, { method: 'POST' });

export const leaveChallenge = async (challengeId) =>
  requestJson(`/challenges/${challengeId}/leave`, { method: 'DELETE' });

export const updateChallengeProgress = async (challengeId, progressData) =>
  requestJson(`/challenges/${challengeId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(progressData),
  });

export const getChallengeLeaderboard = async (challengeId) =>
  requestJson(`/challenges/${challengeId}/leaderboard`);

export const getUserChallenges = async () => requestJson('/challenges/user/me');

export const getUserAchievements = async (page = 1, limit = 20) =>
  requestJson(`/challenges/achievements?page=${page}&limit=${limit}`);

export const markAchievementRead = async (achievementId) =>
  requestJson(`/challenges/achievements/${achievementId}/read`, {
    method: 'PUT',
  });

export const getGlobalLeaderboard = async (period = 'all') =>
  requestJson(`/challenges/leaderboard/global?period=${period}`);

export const createChallenge = async (challengeData) =>
  requestJson('/challenges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(challengeData),
  });
