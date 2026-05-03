import { create } from 'zustand';
import { api } from '../services/api';
import {
    FilterOptions,
    LocationCoords,
    PurchasedQuest,
    Quest,
    QuestStatus,
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
  signInWithProvider: (provider: 'apple' | 'google', idToken: string) => Promise<void>;
  login: (provider: 'apple' | 'google') => void;
  setBirthdate: (date: Date) => void;
  setUsername: (username: string) => void;
  setAvatar: (url: string, type: 'custom' | 'preset' | 'google' | 'apple') => void;
  completeOnboarding: () => void;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  updateProfile: (updates: { name?: string; bio?: string; genres?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  // `isLoading` is the "we're actively checking auth state" flag — it
  // should default to false because the gate in screens like Profile is
  // already covered by `isAuthenticated && user`. Leaving it true at boot
  // (the previous default) caused the Profile screen to render its
  // "Loading…" spinner forever for any user that completed the onboarding
  // path (which doesn't currently flip the flag).
  isLoading: false,
  onboardingStep: 'login',
  user: null,
  initAuth: async () => {
    set({ isLoading: true });
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
          bio: user.bio ?? undefined,
          genres: user.genres ?? undefined,
          createdAt: new Date(user.createdAt),
          createdQuests: [],
          purchasedQuests: [],
          completedQuestsCount: user.completedQuestsCount ?? 0,
          reviewsWritten: [],
        },
      });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },
  devLogin: async (email: string, name: string) => {
    // Errors propagate so the login screen can render them. Previously the
    // store swallowed failures, which meant a wrong email or an offline API
    // looked exactly like nothing happened.
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
        bio: user.bio ?? undefined,
        genres: user.genres ?? undefined,
        createdAt: new Date(user.createdAt ?? Date.now()),
        createdQuests: [],
        purchasedQuests: [],
        completedQuestsCount: user.completedQuestsCount ?? 0,
        reviewsWritten: [],
      },
    });
  },
  // Real native sign-in path. Once a provider's native UI returns an
  // idToken, the login screen calls this to exchange it for a real JWT
  // against the backend's /users/auth/mobile/token endpoint. Errors
  // propagate so the caller can render a useful Alert instead of the
  // store silently failing.
  signInWithProvider: async (provider, idToken) => {
    const { token, user } = await api.exchangeMobileToken(provider, idToken);
    await api.setToken(token);
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
        bio: user.bio ?? undefined,
        genres: user.genres ?? undefined,
        createdAt: new Date(user.createdAt ?? Date.now()),
        createdQuests: [],
        purchasedQuests: [],
        completedQuestsCount: user.completedQuestsCount ?? 0,
        reviewsWritten: [],
      },
    });
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
  deleteAccount: async () => {
    await api.deleteAccount();
    set({
      isAuthenticated: false,
      isOnboarding: false,
      onboardingStep: 'login',
      user: null,
    });
  },
  updateProfile: async (updates) => {
    const updated = await api.updateProfile(updates);
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            username: updated.name ?? state.user.username,
            bio: updated.bio ?? state.user.bio,
            genres: updated.genres ?? state.user.genres,
          }
        : null,
    }));
  },
  // Re-fetch /users/me without flipping isLoading so the spinner doesn't
  // show on every tab focus. Used by the Profile tab to pick up edits made
  // in the creator-station web app between sessions.
  refreshProfile: async () => {
    try {
      const fresh = await api.getMe();
      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              username: fresh.name ?? state.user.username,
              bio: fresh.bio ?? state.user.bio,
              genres: fresh.genres ?? state.user.genres,
              avatarUrl: fresh.avatarUrl ?? state.user.avatarUrl,
              completedQuestsCount:
                fresh.completedQuestsCount ?? state.user.completedQuestsCount,
            }
          : state.user,
      }));
    } catch {
      // Silently no-op — initAuth at app boot is the canonical "are you
      // signed in" check; this is just a freshness top-up.
    }
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
        minPrice: filters.priceRange === 'free' ? 0 : undefined,
        maxPrice: filters.priceRange === 'free' ? 0 : filters.priceRange === 'under5' ? 5 : filters.priceRange === 'under10' ? 10 : undefined,
      });
      if (!quests || quests.length === 0) {
        set({ isLoading: false });
        return;
      }
      // Transform API response to match local Quest type
      const transformedQuests: Quest[] = quests.map((q: any) => ({
        id: q.id,
        title: q.title,
        tagline: q.description?.slice(0, 100) || '',
        description: q.description || '',
        authorId: q.author?.id || q.authorId || '',
        authorUsername: q.author?.name || 'Unknown',
        authorAvatarUrl: q.author?.avatarUrl,
        status: QuestStatus.PUBLISHED,
        coverImageUrl: q.coverImage || '',
        estimatedDurationMinutes: q.estimatedDuration || 60,
        estimatedDistanceMeters: q.totalDistance || 0,
        price: q.price ?? 0,
        isFree: (q.price ?? 0) === 0,
        ageRating: (q.ageRating || '4+') as any,
        category: q.genre || 'Adventure',
        playerCount: q._count?.purchases || 0,
        minPlayers: 1,
        maxPlayers: 4,
        averageRating: q.averageRating || undefined,
        reviewCount: q._count?.reviews || 0,
        mediaType: q.mediaType === 'video' ? 'video' : q.mediaType === 'audio' ? 'audio' : undefined,
        createdAt: new Date(q.createdAt),
        firstWaypointLocation: {
          latitude: q.waypoints?.[0]?.lat || 0,
          longitude: q.waypoints?.[0]?.lng || 0,
        },
        characters: [],
        waypoints: (q.waypoints || []).map((wp: any, i: number) => ({
          id: wp.id,
          questId: q.id,
          title: wp.name || `Waypoint ${i + 1}`,
          notes: wp.notes ?? undefined,
          order: i + 1,
          location: { latitude: wp.lat || 0, longitude: wp.lng || 0 },
          radius: 15,
          scenes: [],
        })),
        reviews: [],
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
