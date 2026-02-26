import { apiJson } from './httpClient';

export const getClubs = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const path = query ? `/clubs?${query}` : '/clubs';
  return apiJson(path);
};

export const getClub = async (clubId) => apiJson(`/clubs/${clubId}`);

export const createClub = async (clubData) =>
  apiJson('/clubs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clubData),
  });

export const updateClub = async (clubId, clubData) =>
  apiJson(`/clubs/${clubId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clubData),
  });

export const deleteClub = async (clubId) =>
  apiJson(`/clubs/${clubId}`, {
    method: 'DELETE',
  });

export const joinClub = async (clubId) =>
  apiJson(`/clubs/${clubId}/join`, {
    method: 'POST',
  });

export const leaveClub = async (clubId) =>
  apiJson(`/clubs/${clubId}/leave`, {
    method: 'POST',
  });

export const inviteToClub = async (clubId, userId) =>
  apiJson(`/clubs/${clubId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

export const promoteMember = async (clubId, memberId) =>
  apiJson(`/clubs/${clubId}/members/${memberId}/promote`, {
    method: 'POST',
  });

export const demoteMember = async (clubId, memberId) =>
  apiJson(`/clubs/${clubId}/members/${memberId}/demote`, {
    method: 'POST',
  });

export const removeMember = async (clubId, memberId) =>
  apiJson(`/clubs/${clubId}/members/${memberId}`, {
    method: 'DELETE',
  });
