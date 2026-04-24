const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async devLogin(email, name) {
    const data = await this.request('/users/auth/dev', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request('/users/me');
  }

  logout() {
    this.setToken(null);
  }

  async updateProfile(data) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Quests
  async getMyQuests() {
    return this.request('/quests/my');
  }

  async getQuest(id) {
    return this.request(`/quests/${id}`);
  }

  async createQuest(data) {
    return this.request('/quests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuest(id, data) {
    return this.request(`/quests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async publishQuest(id) {
    return this.request(`/quests/${id}/publish`, {
      method: 'POST',
    });
  }

  async deleteQuest(id) {
    return this.request(`/quests/${id}`, {
      method: 'DELETE',
    });
  }

  // Reviews
  async getQuestReviews(questId) {
    return this.request(`/reviews/quest/${questId}`);
  }

  // Waypoints
  async addWaypoint(questId, data) {
    return this.request(`/quests/${questId}/waypoints`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWaypoint(waypointId, data) {
    return this.request(`/quests/waypoints/${waypointId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteWaypoint(waypointId) {
    return this.request(`/quests/waypoints/${waypointId}`, {
      method: 'DELETE',
    });
  }

  // Scenes
  async addScene(questId, data) {
    return this.request(`/quests/${questId}/scenes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateScene(sceneId, data) {
    return this.request(`/quests/scenes/${sceneId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteScene(sceneId) {
    return this.request(`/quests/scenes/${sceneId}`, {
      method: 'DELETE',
    });
  }

  // Submit entire quest for review (batch)
  async submitQuest(questId) {
    return this.request(`/quests/${questId}/submit`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Media upload (multipart - bypasses JSON content-type)
  async uploadSceneMedia(sceneId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/quests/scenes/${sceneId}/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  // Scouted Waypoints
  async getMyScoutedWaypoints() {
    return this.request('/users/scouted-waypoints');
  }

  async deleteScoutedWaypoint(id) {
    return this.request(`/users/scouted-waypoints/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin
  async getSubmissions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') params.append(key, String(value));
    });
    return this.request(`/admin/submissions?${params}`);
  }

  async reviewQuestSubmission(questId, status, notes) {
    return this.request(`/admin/submissions/quest/${questId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async reviewSceneSubmission(sceneId, status, notes) {
    return this.request(`/admin/submissions/${sceneId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }
}

export const api = new ApiClient();
export default api;
