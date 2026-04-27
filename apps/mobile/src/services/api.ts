import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  async init() {
    this.token = await AsyncStorage.getItem('auth_token');
  }

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('auth_token', token);
    } else {
      await AsyncStorage.removeItem('auth_token');
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async devLogin(email: string, name: string) {
    const data = await this.request<{ token: string; user: any }>('/users/auth/dev', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
    await this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request<any>('/users/me');
  }

  async logout() {
    await this.setToken(null);
  }

  async deleteAccount() {
    if (!this.token) {
      throw new Error('Not signed in');
    }
    const response = await fetch(`${API_BASE}/users/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(error.error || 'Delete failed');
    }
    await this.setToken(null);
  }

  // Moderation — Apple Guideline 1.2 + Google Play UGC policy
  async reportContent(input: {
    entityType: 'quest' | 'scene' | 'review' | 'user';
    entityId: string;
    reason:
      | 'spam'
      | 'harassment'
      | 'sexual_minors'
      | 'hate'
      | 'violence'
      | 'illegal'
      | 'ip'
      | 'scam'
      | 'impersonation'
      | 'other';
    details?: string;
  }) {
    return this.request<any>('/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async blockUser(userId: string) {
    return this.request<any>(`/users/${userId}/block`, { method: 'POST' });
  }

  async unblockUser(userId: string) {
    return this.request<any>(`/users/${userId}/block`, { method: 'DELETE' });
  }

  async getMyBlocks() {
    return this.request<any[]>('/me/blocks');
  }

  // Quests
  async getPublishedQuests(filters: {
    genre?: string;
    difficulty?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    return this.request<{ quests: any[]; total: number }>(`/quests/public?${params}`);
  }

  async getQuest(id: string) {
    return this.request<any>(`/quests/${id}`);
  }

  // Purchases
  async getMyPurchases() {
    return this.request<any[]>('/purchases');
  }

  async checkOwnership(questId: string) {
    return this.request<{ owned: boolean; purchase?: any }>(`/purchases/check/${questId}`);
  }

  async purchaseQuest(questId: string, revenueCatTransactionId?: string) {
    return this.request<any>('/purchases', {
      method: 'POST',
      body: JSON.stringify({ questId, revenueCatTransactionId }),
    });
  }

  async updateProgress(questId: string, data: { currentSceneId?: string; completed?: boolean }) {
    return this.request<any>(`/purchases/${questId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Reviews
  async getQuestReviews(questId: string) {
    return this.request<{ reviews: any[]; averageRating: number; totalReviews: number }>(
      `/reviews/quest/${questId}`
    );
  }

  async submitReview(questId: string, rating: number, comment?: string) {
    return this.request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify({ questId, rating, comment }),
    });
  }

  // Scouted Waypoints
  async getMyScoutedWaypoints() {
    return this.request<any[]>('/users/scouted-waypoints');
  }

  async addScoutedWaypoint(data: {
    name: string;
    notes?: string;
    lat: number;
    lng: number;
    photos?: string[];
    videos?: string[];
    audioRecordings?: string[];
  }) {
    return this.request<any>('/users/scouted-waypoints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteScoutedWaypoint(id: string) {
    return this.request<{ success: boolean }>(`/users/scouted-waypoints/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadScoutedMedia(waypointId: string, fileUri: string, mimeType: string, fileName: string) {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    } as any);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/users/scouted-waypoints/${waypointId}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json() as Promise<{ mediaUrl: string; field: string; waypoint: any }>;
  }
}

export const api = new ApiClient();
export default api;
