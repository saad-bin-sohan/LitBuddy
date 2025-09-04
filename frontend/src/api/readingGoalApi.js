const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

export const readingGoalApi = {
  // Set reading goals
  setReadingGoals: async (goalsData) => {
    const res = await fetch(`${API_URL}/reading-goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalsData),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to set reading goals');
    return data;
  },

  // Get reading goals
  getReadingGoals: async (year) => {
    const params = year ? { year } : {};
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/reading-goals?${queryString}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get reading goals');
    return data;
  },

  // Get achievements
  getAchievements: async () => {
    const res = await fetch(`${API_URL}/reading-goals/achievements`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get achievements');
    return data;
  },

  // Update progress manually
  updateProgress: async (progressData) => {
    const res = await fetch(`${API_URL}/reading-goals/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressData),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update progress');
    return data;
  }
};
