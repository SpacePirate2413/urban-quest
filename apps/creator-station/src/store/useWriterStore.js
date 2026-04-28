import { create } from 'zustand';
import { api } from '../services/api';

// Metadata catalog for narrators. Keyed by the voice ID used in Chatterbox's
// voice library (the `voice` field of /v1/audio/speech requests). Entries are
// matched against the live list returned by Chatterbox at runtime — voices in
// the library that don't have a catalog entry still show up in the picker
// using their voice ID as the display name.
//
// To onboard a new narrator: pick an unused id below, find a public-domain
// LibriVox sample matching the personality, trim to 15–30 seconds of clean
// speech, and POST it to chatterbox /v1/voices with `name=<id>`.
export const NARRATOR_VOICES = [
  { id: 'marcus', name: 'Marcus', gender: 'male', age: '40s', style: 'Deep & Authoritative', color: '#00d4ff', description: 'Rich, commanding voice perfect for epic adventures and mysteries' },
  { id: 'elena', name: 'Elena', gender: 'female', age: '30s', style: 'Warm & Engaging', color: '#ff2d78', description: 'Inviting tone that draws listeners into intimate stories' },
  { id: 'jake', name: 'Jake', gender: 'male', age: '20s', style: 'Energetic & Dynamic', color: '#39ff14', description: 'Youthful energy ideal for action-packed quests' },
  { id: 'lily', name: 'Lily', gender: 'female', age: '20s', style: 'Bright & Clear', color: '#ffd60a', description: 'Crystal clear delivery for family-friendly adventures' },
  { id: 'arthur', name: 'Arthur', gender: 'male', age: '60s', style: 'Gravelly & Wise', color: '#ff6b2b', description: 'Weathered voice for noir and historical tales' },
  { id: 'margaret', name: 'Margaret', gender: 'female', age: '60s', style: 'Wise & Soothing', color: '#a855f7', description: 'Calming presence for reflective journeys' },
  { id: 'draven', name: 'Draven', gender: 'male', age: '40s', style: 'Dark & Mysterious', color: '#ef4444', description: 'Haunting tone for horror and thriller quests' },
  { id: 'vex', name: 'Vex', gender: 'female', age: '30s', style: 'Sultry & Intriguing', color: '#c084fc', description: 'Captivating voice for romance and intrigue' },
];

export const GENRES = [
  'Thriller', 'Mystery', 'Adventure', 'Horror', 'Romance', 'Comedy', 'Sci-Fi', 'Fantasy'
];


// Module-scoped debounce timers for `updateScene`. Keyed by sceneId, holds
// `{ timer: <setTimeout id>, pending: <coalesced payload> }`. Lives outside
// the store so timers survive across set() calls.
const sceneSaveTimers = {};

// Load persisted data from localStorage
const loadPersistedState = () => {
  try {
    const saved = localStorage.getItem('urban-quest-store');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        submissions: parsed.submissions || [],
        quests: parsed.quests || [],
      };
    }
  } catch (e) {
    console.warn('Failed to load persisted state:', e);
  }
  return { submissions: [], quests: [] };
};

const persistedState = loadPersistedState();

// Save state to localStorage
const saveState = (state) => {
  try {
    localStorage.setItem('urban-quest-store', JSON.stringify({
      submissions: state.submissions,
      quests: state.quests,
    }));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
};

export const useWriterStore = create((set, get) => ({
  writer: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  offlineMode: false,
  
  quests: persistedState.quests,
  activeQuestId: null,
  
  submissions: persistedState.submissions,

  scoutedWaypoints: [],
  scoutedWaypointsLoaded: false,

  // Scouted Waypoints actions
  loadScoutedWaypoints: async () => {
    try {
      const waypoints = await api.getMyScoutedWaypoints();
      // Parse JSON string fields from the API
      const parsed = waypoints.map(wp => ({
        ...wp,
        photos: wp.photos ? JSON.parse(wp.photos) : [],
        videos: wp.videos ? JSON.parse(wp.videos) : [],
        audioRecordings: wp.audioRecordings ? JSON.parse(wp.audioRecordings) : [],
      }));
      set({ scoutedWaypoints: parsed, scoutedWaypointsLoaded: true });
    } catch (err) {
      console.warn('Failed to load scouted waypoints:', err.message);
      set({ scoutedWaypointsLoaded: true });
    }
  },

  deleteScoutedWaypoint: async (waypointId) => {
    try {
      await api.deleteScoutedWaypoint(waypointId);
      set((state) => ({
        scoutedWaypoints: state.scoutedWaypoints.filter(wp => wp.id !== waypointId),
      }));
    } catch (err) {
      console.error('Failed to delete scouted waypoint:', err);
      throw err;
    }
  },

  // Auth actions
  login: async (email, name) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await api.devLogin(email, name);
      set({ writer: user, isAuthenticated: true, isLoading: false, offlineMode: false });
      // Load quests after login
      get().loadQuests();
      return user;
    } catch (err) {
      // Fallback to offline mode if API is unavailable
      console.warn('API unavailable, using offline mode:', err.message);
      const offlineUser = {
        id: `offline-${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        role: 'writer',
      };
      set({
        writer: offlineUser,
        isAuthenticated: true,
        isLoading: false,
        offlineMode: true,
        quests: [],
      });
      return offlineUser;
    }
  },

  logout: () => {
    api.logout();
    set({ writer: null, isAuthenticated: false, quests: [], activeQuestId: null, offlineMode: false });
  },

  checkAuth: async () => {
    try {
      const user = await api.getMe();
      set({ writer: user, isAuthenticated: true, offlineMode: false });
      get().loadQuests();
      return true;
    } catch {
      set({ writer: null, isAuthenticated: false });
      return false;
    }
  },

  // Re-fetch the signed-in user from /users/me. Called on profile-page focus
  // so changes made in the mobile app (or another browser tab) propagate
  // here without requiring a full page reload. Silently no-ops on error so
  // a transient network blip doesn't bounce the creator out of the editor.
  refreshProfile: async () => {
    try {
      const user = await api.getMe();
      set({ writer: user });
      return user;
    } catch {
      return null;
    }
  },

  // Single update path used by the profile editor. Writes through to
  // /users/me and mirrors the API response back into local state so the
  // displayed values reflect the save without a page reload.
  updateProfile: async (updates) => {
    const updated = await api.updateProfile(updates);
    set((state) => ({ writer: { ...state.writer, ...updated } }));
    return updated;
  },

  // Quest actions with API sync
  loadQuests: async () => {
    set({ isLoading: true });
    try {
      const { quests } = await api.getMyQuests();
      // Transform API response to match local format
      const transformedQuests = quests.map(q => ({
        ...q,
        waypoints: q.waypoints || [],
        scenes: (q.scenes || []).map(s => ({
          ...s,
          choices: s.choices ? JSON.parse(s.choices) : [],
        })),
        sales: q._count?.purchases || 0,
        revenue: (q._count?.purchases || 0) * q.price,
      }));
      set({ quests: transformedQuests, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  addQuest: async (quest) => {
    const { offlineMode } = get();
    
    // Offline mode - create locally
    if (offlineMode) {
      const newQuest = {
        id: `quest-${Date.now()}`,
        title: quest?.title || 'Untitled Quest',
        description: quest?.description || '',
        genre: quest?.genre || 'Adventure',
        price: quest?.price || 0,
        status: 'draft',
        coverImage: null,
        usesAI: false,
        narratorVoiceId: 'narrator-male-deep',
        waypoints: [],
        scenes: [],
        sales: 0,
        revenue: 0,
        ...quest,
      };
      set((state) => ({
        quests: [...state.quests, newQuest],
      }));
      return newQuest;
    }
    
    // Online mode - use API
    try {
      const newQuest = await api.createQuest({
        title: quest?.title || 'Untitled Quest',
        description: quest?.description || '',
        genre: quest?.genre || 'Adventure',
        price: quest?.price || 0,
        ...quest,
      });
      set((state) => ({
        quests: [...state.quests, {
          ...newQuest,
          waypoints: [],
          scenes: [],
          sales: 0,
          revenue: 0,
        }],
      }));
      return newQuest;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // Legacy local addQuest for fallback
  addQuestLocal: (quest) => set((state) => ({
    quests: [...state.quests, {
      id: `quest-${Date.now()}`,
      title: 'Untitled Quest',
      description: '',
      genre: 'Adventure',
      ageRating: 'E',
      price: 0,
      status: 'draft',
      coverImage: null,
      usesAI: false,
      narratorVoiceId: 'narrator-male-deep',
      sales: 0,
      revenue: 0,
      waypoints: [],
      scenes: [],
      ...quest,
    }],
  })),

  updateQuest: async (questId, updates) => {
    try {
      const response = await api.updateQuest(questId, updates);
      // Merge the API response so server-set fields (e.g. submissionStatus)
      // are reflected locally.
      const serverFields = response
        ? { submissionStatus: response.submissionStatus }
        : {};
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId ? { ...q, ...updates, ...serverFields } : q
        ),
      }));
    } catch (err) {
      // Update locally even if API fails
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId ? { ...q, ...updates } : q
        ),
        error: err.message,
      }));
    }
  },

  deleteQuest: (questId) => set((state) => ({
    quests: state.quests.filter((q) => q.id !== questId),
    activeQuestId: state.activeQuestId === questId ? null : state.activeQuestId,
  })),

  setActiveQuest: (questId) => set({ activeQuestId: questId }),

  getActiveQuest: () => {
    const state = get();
    return state.quests.find((q) => q.id === state.activeQuestId);
  },

  addWaypoint: async (questId, waypoint) => {
    try {
      const newWaypoint = await api.addWaypoint(questId, {
        name: waypoint?.name || 'New Waypoint',
        description: waypoint?.description || '',
        notes: waypoint?.notes || '',
        lat: waypoint?.lat || 40.7128 + (Math.random() - 0.5) * 0.1,
        lng: waypoint?.lng || -74.0060 + (Math.random() - 0.5) * 0.1,
        ...waypoint,
      });
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId
            ? { ...q, waypoints: [...q.waypoints, newWaypoint] }
            : q
        ),
      }));
      return newWaypoint;
    } catch (err) {
      // Fallback to local
      const localWaypoint = {
        id: `wp-${Date.now()}`,
        name: 'New Waypoint',
        description: '',
        notes: '',
        photo: null,
        lat: 40.7128 + (Math.random() - 0.5) * 0.1,
        lng: -74.0060 + (Math.random() - 0.5) * 0.1,
        ...waypoint,
      };
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId
            ? { ...q, waypoints: [...q.waypoints, localWaypoint] }
            : q
        ),
        error: err.message,
      }));
      return localWaypoint;
    }
  },

  updateWaypoint: (questId, waypointId, updates) => set((state) => ({
    quests: state.quests.map((q) =>
      q.id === questId
        ? {
            ...q,
            waypoints: q.waypoints.map((wp) =>
              wp.id === waypointId ? { ...wp, ...updates } : wp
            ),
          }
        : q
    ),
  })),

  deleteWaypoint: (questId, waypointId) => set((state) => ({
    quests: state.quests.map((q) =>
      q.id === questId
        ? {
            ...q,
            waypoints: q.waypoints.filter((wp) => wp.id !== waypointId),
          }
        : q
    ),
  })),

  addScene: async (questId, scene) => {
    const state = get();
    const quest = state.quests.find(q => q.id === questId);
    try {
      const newScene = await api.addScene(questId, {
        script: scene?.script || '',
        question: scene?.question || '',
        choices: scene?.choices ? JSON.stringify(scene.choices) : null,
        waypointId: scene?.waypointId || quest?.waypoints[0]?.id || null,
      });
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId
            ? { ...q, scenes: [...q.scenes, { ...newScene, choices: scene?.choices || [] }] }
            : q
        ),
      }));
      return newScene;
    } catch (err) {
      // Fallback to local
      const localScene = {
        id: `scene-${Date.now()}`,
        waypointId: quest?.waypoints[0]?.id || null,
        script: '',
        question: '',
        choices: [],
        audioTracks: [],
        ...scene,
      };
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId
            ? { ...q, scenes: [...q.scenes, localScene] }
            : q
        ),
        error: err.message,
      }));
      return localScene;
    }
  },

  // Scene save state, keyed by sceneId. UI reads `useWriterStore(s => s.sceneSaveState[id])`
  // to render the "Saving…" / "Saved" indicator.
  // Values: { status: 'idle' | 'saving' | 'saved' | 'error', error?: string }
  sceneSaveState: {},

  updateScene: (questId, sceneId, updates) => {
    // 1. Optimistic local update so the UI reflects keystrokes immediately.
    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === questId
          ? {
              ...q,
              scenes: q.scenes.map((s) =>
                s.id === sceneId ? { ...s, ...updates } : s
              ),
            }
          : q
      ),
    }));

    // 2. Decide which fields actually round-trip to the server. We only send
    //    columns the backend `sceneSchema` accepts, and we serialize choices
    //    to JSON because the column is a string in Prisma.
    const SERVER_FIELDS = ['script', 'question', 'choices', 'waypointId'];
    const serverUpdates = {};
    for (const k of SERVER_FIELDS) {
      if (k in updates) {
        serverUpdates[k] =
          k === 'choices' ? JSON.stringify(updates[k] || []) : updates[k];
      }
    }
    if (Object.keys(serverUpdates).length === 0) return;

    // Skip API calls for scenes that only exist locally (addScene fell back to
    // the offline path). Local IDs look like `scene-1700000000000`; server
    // IDs are CUIDs that start with `c` and are 25 chars.
    if (sceneId.startsWith('scene-')) return;

    // 3. Debounce: 500ms idle since the last keystroke before we save.
    if (!sceneSaveTimers[sceneId]) sceneSaveTimers[sceneId] = {};
    if (sceneSaveTimers[sceneId].timer) clearTimeout(sceneSaveTimers[sceneId].timer);
    // Coalesce pending updates so the latest value of every touched field
    // gets sent in one request.
    sceneSaveTimers[sceneId].pending = {
      ...(sceneSaveTimers[sceneId].pending || {}),
      ...serverUpdates,
    };

    sceneSaveTimers[sceneId].timer = setTimeout(async () => {
      const payload = sceneSaveTimers[sceneId].pending;
      sceneSaveTimers[sceneId].pending = null;
      sceneSaveTimers[sceneId].timer = null;
      set((state) => ({
        sceneSaveState: { ...state.sceneSaveState, [sceneId]: { status: 'saving' } },
      }));
      try {
        await api.updateScene(sceneId, payload);
        set((state) => ({
          sceneSaveState: {
            ...state.sceneSaveState,
            [sceneId]: { status: 'saved', savedAt: Date.now() },
          },
        }));
      } catch (err) {
        set((state) => ({
          sceneSaveState: {
            ...state.sceneSaveState,
            [sceneId]: { status: 'error', error: err.message },
          },
        }));
      }
    }, 500);
  },

  deleteScene: async (questId, sceneId) => {
    // Optimistic local removal so the UI snaps immediately.
    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === questId
          ? { ...q, scenes: q.scenes.filter((s) => s.id !== sceneId) }
          : q
      ),
    }));

    // Local-only scenes (offline-mode IDs) never hit the server; calling the
    // API would 404. Anything else needs to be deleted on the backend so it
    // doesn't reappear on the next loadQuests / submit-for-review.
    if (sceneId.startsWith('scene-')) return;

    try {
      await api.deleteScene(sceneId);
    } catch (err) {
      // The scene is already removed locally; if the server delete fails,
      // log it but don't try to "rollback" — that would be more confusing
      // for the creator than a stale row that loadQuests will eventually
      // resync.
      console.error('Server-side scene delete failed:', err);
    }
  },

  submitSceneMedia: (questId, sceneId, mediaFile, mediaType) => {
    const state = get();
    const quest = state.quests.find(q => q.id === questId);
    const sceneIndex = quest?.scenes.findIndex(s => s.id === sceneId) + 1;
    
    const submission = {
      id: `sub-${Date.now()}`,
      questId,
      questTitle: quest?.title || 'Unknown Quest',
      sceneId,
      sceneIndex,
      writerId: state.writer.id,
      writerName: state.writer.name,
      writerEmail: state.writer.email,
      mediaType,
      mediaUrl: mediaFile.url || null,
      fileName: mediaFile.name,
      fileSize: mediaFile.size,
      duration: mediaFile.duration || 'Unknown',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewNotes: null,
    };

    set((state) => {
      const newState = {
        submissions: [...state.submissions, submission],
        quests: state.quests.map((q) =>
          q.id === questId
            ? {
                ...q,
                scenes: q.scenes.map((s) =>
                  s.id === sceneId
                    ? {
                        ...s,
                        mediaFile: mediaFile.url || mediaFile.name,
                        mediaType,
                        mediaStatus: 'pending',
                        submittedAt: new Date().toISOString(),
                      }
                    : s
                ),
              }
            : q
        ),
      };
      // Persist to localStorage
      saveState({ ...state, ...newState });
      return newState;
    });

    return submission;
  },

  updateSubmission: (submissionId, updates) => set((state) => ({
    submissions: state.submissions.map((sub) =>
      sub.id === submissionId ? { ...sub, ...updates } : sub
    ),
  })),

  approveSubmission: (submissionId, notes) => {
    const state = get();
    const submission = state.submissions.find(s => s.id === submissionId);
    
    set((state) => ({
      submissions: state.submissions.map((sub) =>
        sub.id === submissionId
          ? {
              ...sub,
              status: 'approved',
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes || 'Approved',
            }
          : sub
      ),
      quests: state.quests.map((q) =>
        q.id === submission?.questId
          ? {
              ...q,
              scenes: q.scenes.map((s) =>
                s.id === submission?.sceneId
                  ? { ...s, mediaStatus: 'approved' }
                  : s
              ),
            }
          : q
      ),
    }));
  },

  rejectSubmission: (submissionId, notes) => {
    const state = get();
    const submission = state.submissions.find(s => s.id === submissionId);
    
    set((state) => ({
      submissions: state.submissions.map((sub) =>
        sub.id === submissionId
          ? {
              ...sub,
              status: 'rejected',
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes || 'Rejected',
            }
          : sub
      ),
      quests: state.quests.map((q) =>
        q.id === submission?.questId
          ? {
              ...q,
              scenes: q.scenes.map((s) =>
                s.id === submission?.sceneId
                  ? { ...s, mediaStatus: 'rejected' }
                  : s
              ),
            }
          : q
      ),
    }));
  },
}));

export default useWriterStore;
