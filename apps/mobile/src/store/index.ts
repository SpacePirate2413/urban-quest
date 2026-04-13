import { create } from 'zustand';
import {
  User,
  Quest,
  ScoutedWaypoint,
  FilterOptions,
  ViewMode,
  LocationCoords,
  PurchasedQuest,
} from '../types';

interface AuthState {
  isAuthenticated: boolean;
  isOnboarding: boolean;
  onboardingStep: 'login' | 'birthdate' | 'username' | 'avatar' | 'location' | 'complete';
  user: User | null;
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
  setQuests: (quests: Quest[]) => void;
  selectQuest: (quest: Quest | null) => void;
  setActiveQuest: (quest: PurchasedQuest | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: FilterOptions) => void;
  setSearchLocation: (location: LocationCoords | null) => void;
  setSearchQuery: (query: string) => void;
  purchaseQuest: (questId: string) => void;
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
  onboardingStep: 'login',
  user: null,
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
  logout: () =>
    set({
      isAuthenticated: false,
      isOnboarding: false,
      onboardingStep: 'login',
      user: null,
    }),
}));

export const useQuestStore = create<QuestState>((set) => ({
  quests: [],
  selectedQuest: null,
  activeQuest: null,
  viewMode: 'map',
  filters: {},
  searchLocation: null,
  searchQuery: '',
  setQuests: (quests) => set({ quests }),
  selectQuest: (quest) => set({ selectedQuest: quest }),
  setActiveQuest: (quest) => set({ activeQuest: quest }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilters: (filters) => set({ filters }),
  setSearchLocation: (location) => set({ searchLocation: location }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  purchaseQuest: (questId) =>
    set((state) => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const newPurchase: PurchasedQuest = {
        id: `purchase_${Date.now()}`,
        questId,
        purchasedAt: now,
        expiresAt,
        currentWaypointIndex: 0,
        progress: [],
      };
      return {
        activeQuest: newPurchase,
      };
    }),
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
