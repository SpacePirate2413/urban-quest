import { create } from 'zustand';
import {
    FilterOptions,
    LocationCoords,
    PurchasedQuest,
    Quest,
    ScoutedWaypoint,
    User,
    ViewMode,
} from '../types';

interface AuthState {
  isAuthenticated: boolean;
  isOnboarding: boolean;
  isLoading: boolean;
  onboardingStep: 'login' | 'birthdate' | 'username' | 'avatar' | 'location' | 'complete';
  user: User | null;
  initAuth: () => Promise<void>;
  devLogin: (email: string, name: string) => Promise<void>;
  login: (provider: 'apple' | 'google') => void;
  setBirthdate: (date: Date) => void;
  setUsername: (username: string) => void;
  setAvatar: (url: string, type: 'custom' | 'preset' | 'google' | 'apple') => void;
  completeOnboarding: () => void;
  logout: () => void;
}

interface QuestState {
  quests: Quest[];
  selectedQuest: Quest | null;
  activeQuest: PurchasedQuest | null;
  viewMode: ViewMode;
  filters: FilterOptions;
  searchLocation: LocationCoords | null;
  searchQuery: string;
  isLoading: boolean;
  loadQuests: (filters?: FilterOptions) => Promise<void>;
  setQuests: (quests: Quest[]) => void;
  selectQuest: (quest: Quest | null) => void;
  setActiveQuest: (quest: PurchasedQuest | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: FilterOptions) => void;
  setSearchLocation: (location: LocationCoords | null) => void;
  setSearchQuery: (query: string) => void;
  purchaseQuest: (questId: string) => Promise<void>;
}

interface LocationState {
  currentLocation: LocationCoords | null;
  locationPermission: 'granted' | 'denied' | 'undetermined';
  setCurrentLocation: (location: LocationCoords | null) => void;
  setLocationPermission: (permission: 'granted' | 'denied' | 'undetermined') => void;
}

interface WriteState {
  scoutedWaypoints: ScoutedWaypoint[];
  isRecording: boolean;
  addScoutedWaypoint: (waypoint: ScoutedWaypoint) => void;
  updateScoutedWaypoint: (id: string, updates: Partial<ScoutedWaypoint>) => void;
  deleteScoutedWaypoint: (id: string) => void;
  setIsRecording: (recording: boolean) => void;
}

interface PlaybackState {
  currentWaypointIndex: number;
  isPlaying: boolean;
  hasArrived: boolean;
  showQuestions: boolean;
  setCurrentWaypointIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setHasArrived: (arrived: boolean) => void;
  setShowQuestions: (show: boolean) => void;
  resetPlayback: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isOnboarding: false,
  isLoading: true,
  onboardingStep: 'login',
  user: null,
  initAuth: async () => {
    try {
      await api.init();
      const user = await api.getMe();
      set({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: user.id,
          email: user.email,
          username: user.name || user.email,
          avatarUrl: user.avatarUrl,
          avatarType: 'custom',
          birthdate: user.birthdate ? new Date(user.birthdate) : undefined,
          role: user.role,
          createdAt: new Date(user.createdAt),
          completedQuestsCount: 0,
          totalXP: 0,
          reviewsWritten: [],
        },
      });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },
  devLogin: async (email: string, name: string) => {
    try {
      const { user } = await api.devLogin(email, name);
      set({
        isAuthenticated: true,
        isOnboarding: false,
        onboardingStep: 'complete',
        user: {
          id: user.id,
          email: user.email,
          username: user.name || user.email,
          avatarUrl: user.avatarUrl,
          avatarType: 'custom',
          role: user.role,
          createdAt: new Date(),
          completedQuestsCount: 0,
          totalXP: 0,
          reviewsWritten: [],
        },
      });
    } catch (err) {
      console.error('Dev login failed:', err);
    }
  },
  login: (provider) =>
    set({
      isOnboarding: true,
      onboardingStep: 'birthdate',
    }),
  setBirthdate: (date) =>
    set((state) => ({
      user: state.user ? { ...state.user, birthdate: date } : null,
      onboardingStep: 'username',
    })),
  setUsername: (username) =>
    set((state) => ({
      user: state.user ? { ...state.user, username } : null,
      onboardingStep: 'avatar',
    })),
  setAvatar: (url, type) =>
    set((state) => ({
      user: state.user ? { ...state.user, avatarUrl: url, avatarType: type } : null,
      onboardingStep: 'location',
    })),
  completeOnboarding: () =>
    set({
      isAuthenticated: true,
      isOnboarding: false,
      onboardingStep: 'complete',
    }),
  logout: async () => {
    await api.logout();
    set({
      isAuthenticated: false,
      isOnboarding: false,
      onboardingStep: 'login',
      user: null,
    });
  },
}));

export const useQuestStore = create<QuestState>((set) => ({
  quests: [],
  selectedQuest: null,
  activeQuest: null,
  viewMode: 'map',
  filters: {},
  searchLocation: null,
  searchQuery: '',
  isLoading: false,
  loadQuests: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const { quests } = await api.getPublishedQuests({
        genre: filters.category,
        difficulty: filters.difficulty,
        minPrice: filters.priceRange === 'free' ? 0 : undefined,
        maxPrice: filters.priceRange === 'free' ? 0 : filters.priceRange === 'under5' ? 5 : filters.priceRange === 'under10' ? 10 : undefined,
      });
      // Transform API response to match local Quest type
      const transformedQuests: Quest[] = quests.map((q: any) => ({
        id: q.id,
        title: q.title,
        tagline: q.tagline || q.description?.slice(0, 100),
        description: q.description || '',
        coverImageUrl: q.coverImage || 'https://picsum.photos/400/300',
        price: q.price,
        isFree: q.price === 0,
        rating: q.averageRating || 0,
        reviewCount: q._count?.reviews || 0,
        difficulty: q.difficulty as any,
        estimatedDuration: q.estimatedDuration || 60,
        totalDistance: q.totalDistance || 2,
        category: q.genre,
        ageRating: q.ageRating,
        creator: {
          id: q.author?.id || '',
          name: q.author?.name || 'Unknown',
          avatarUrl: q.author?.avatarUrl,
        },
        startLocation: {
          lat: q.startLat || q.waypoints?.[0]?.lat || 40.7128,
          lng: q.startLng || q.waypoints?.[0]?.lng || -74.0060,
        },
        waypoints: (q.waypoints || []).map((wp: any) => ({
          id: wp.id,
          name: wp.name,
          description: wp.description,
          location: { lat: wp.lat, lng: wp.lng },
          scenes: [],
        })),
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt),
      }));
      set({ quests: transformedQuests, isLoading: false });
    } catch (err) {
      console.error('Failed to load quests:', err);
      set({ isLoading: false });
    }
  },
  setQuests: (quests) => set({ quests }),
  selectQuest: (quest) => set({ selectedQuest: quest }),
  setActiveQuest: (quest) => set({ activeQuest: quest }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilters: (filters) => set({ filters }),
  setSearchLocation: (location) => set({ searchLocation: location }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  purchaseQuest: async (questId) => {
    try {
      const purchase = await api.purchaseQuest(questId);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const newPurchase: PurchasedQuest = {
        id: purchase.id,
        questId,
        purchasedAt: new Date(purchase.createdAt),
        expiresAt,
        currentWaypointIndex: 0,
        progress: [],
      };
      set({ activeQuest: newPurchase });
    } catch (err) {
      console.error('Failed to purchase quest:', err);
      // Fallback to local purchase for free quests
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      set({
        activeQuest: {
          id: `purchase_${Date.now()}`,
          questId,
          purchasedAt: now,
          expiresAt,
          currentWaypointIndex: 0,
          progress: [],
        },
      });
    }
  },
}));

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  locationPermission: 'undetermined',
  setCurrentLocation: (location) => set({ currentLocation: location }),
  setLocationPermission: (permission) => set({ locationPermission: permission }),
}));

export const useWriteStore = create<WriteState>((set) => ({
  scoutedWaypoints: [],
  isRecording: false,
  addScoutedWaypoint: (waypoint) =>
    set((state) => ({
      scoutedWaypoints: [...state.scoutedWaypoints, waypoint],
    })),
  updateScoutedWaypoint: (id, updates) =>
    set((state) => ({
      scoutedWaypoints: state.scoutedWaypoints.map((wp) =>
        wp.id === id ? { ...wp, ...updates } : wp
      ),
    })),
  deleteScoutedWaypoint: (id) =>
    set((state) => ({
      scoutedWaypoints: state.scoutedWaypoints.filter((wp) => wp.id !== id),
    })),
  setIsRecording: (recording) => set({ isRecording: recording }),
}));

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentWaypointIndex: 0,
  isPlaying: false,
  hasArrived: false,
  showQuestions: false,
  setCurrentWaypointIndex: (index) => set({ currentWaypointIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setHasArrived: (arrived) => set({ hasArrived: arrived }),
  setShowQuestions: (show) => set({ showQuestions: show }),
  resetPlayback: () =>
    set({
      currentWaypointIndex: 0,
      isPlaying: false,
      hasArrived: false,
      showQuestions: false,
    }),
}));
