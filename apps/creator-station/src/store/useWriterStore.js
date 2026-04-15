import { create } from 'zustand';
import { api } from '../services/api';

export const NARRATOR_VOICES = [
  { id: 'narrator-male-deep', name: 'Marcus', gender: 'male', age: '40s', style: 'Deep & Authoritative', color: '#00d4ff', description: 'Rich, commanding voice perfect for epic adventures and mysteries' },
  { id: 'narrator-female-warm', name: 'Elena', gender: 'female', age: '30s', style: 'Warm & Engaging', color: '#ff2d78', description: 'Inviting tone that draws listeners into intimate stories' },
  { id: 'narrator-male-energetic', name: 'Jake', gender: 'male', age: '20s', style: 'Energetic & Dynamic', color: '#39ff14', description: 'Youthful energy ideal for action-packed quests' },
  { id: 'narrator-female-bright', name: 'Lily', gender: 'female', age: '20s', style: 'Bright & Clear', color: '#ffd60a', description: 'Crystal clear delivery for family-friendly adventures' },
  { id: 'narrator-male-gravelly', name: 'Arthur', gender: 'male', age: '60s', style: 'Gravelly & Wise', color: '#ff6b2b', description: 'Weathered voice for noir and historical tales' },
  { id: 'narrator-female-wise', name: 'Margaret', gender: 'female', age: '60s', style: 'Wise & Soothing', color: '#a855f7', description: 'Calming presence for reflective journeys' },
  { id: 'narrator-male-mysterious', name: 'Draven', gender: 'male', age: '40s', style: 'Dark & Mysterious', color: '#ef4444', description: 'Haunting tone for horror and thriller quests' },
  { id: 'narrator-female-sultry', name: 'Vex', gender: 'female', age: '30s', style: 'Sultry & Intriguing', color: '#c084fc', description: 'Captivating voice for romance and intrigue' },
];

export const GENRES = [
  'Thriller', 'Mystery', 'Adventure', 'Horror', 'Romance', 'Comedy', 'Sci-Fi', 'Fantasy'
];

const mockQuests = [
  {
    id: 'quest-1',
    title: 'The Midnight Heist',
    description: 'A thrilling adventure through the city\'s underground as you plan the perfect heist.',
    genre: 'Thriller',
    price: 4.99,
    status: 'published',
    coverImage: null,
    usesAI: true,
    narratorVoiceId: 'narrator-male-deep',
    sales: 127,
    revenue: 209.55,
    waypoints: [
      { id: 'wp-1', name: 'The Abandoned Warehouse', description: 'An old warehouse on the docks, perfect for planning.', notes: 'Meet the crew here', photo: null, lat: 40.7128, lng: -74.0060 },
      { id: 'wp-2', name: 'City Bank Tower', description: 'The target. 50 floors of security systems.', notes: 'Final destination', photo: null, lat: 40.7580, lng: -73.9855 },
    ],
    scenes: [
      {
        id: 'scene-1',
        waypointId: 'wp-1',
        script: `The warehouse smells of rust and old secrets. Shadows dance across the concrete floor as a single bulb flickers overhead.

You lean over the blueprints spread across the makeshift table. The crew watches you, waiting for your lead.

"Alright team, listen up. We've got one shot at this."

The tech specialist looks up from her laptop. "Security feeds are looped. We have a 45-minute window."

"That's all we need. Remember — no heroes, no improvising. We stick to the plan."`,
        question: 'How do you want to approach the heist?',
        choices: [
          { text: 'Go in through the roof', waypointId: 'wp-2' },
          { text: 'Use the underground tunnels', waypointId: 'wp-2' },
          { text: 'Pose as maintenance workers', waypointId: 'wp-2' },
        ],
        audioTracks: [],
        mediaFile: null,
        mediaType: null,
        mediaStatus: null,
        submittedAt: null,
      },
    ],
  },
  {
    id: 'quest-2',
    title: 'Whispers in the Garden',
    description: 'A romantic mystery set in a Victorian botanical garden.',
    genre: 'Mystery',
    price: 0,
    status: 'draft',
    coverImage: null,
    usesAI: true,
    narratorVoiceId: 'narrator-female-warm',
    sales: 0,
    revenue: 0,
    waypoints: [
      { id: 'wp-3', name: 'The Rose Pavilion', description: 'A beautiful gazebo surrounded by climbing roses.', notes: 'Opening scene', photo: null, lat: 40.7829, lng: -73.9654 },
      { id: 'wp-4', name: 'The Greenhouse', description: 'Exotic plants from around the world.', notes: 'Discovery scene', photo: null, lat: 40.7831, lng: -73.9656 },
    ],
    scenes: [
      {
        id: 'scene-2',
        waypointId: 'wp-3',
        script: `Morning dew clings to the rose petals as sunlight filters through the lattice. The garden is quiet, save for the distant song of a mockingbird.

An elderly woman tends to the roses with practiced hands. She doesn't look up as you approach, but somehow she knows you're there.

"You're here about the letters, aren't you?"

You stop in your tracks, surprised. "How did you know?"

She sighs, setting down her pruning shears. "I've been waiting fifty years for someone to ask the right questions."`,
        question: 'What do you ask her?',
        choices: [
          { text: 'Tell me about the letters', waypointId: 'wp-4' },
          { text: 'Who wrote them?', waypointId: 'wp-4' },
        ],
        audioTracks: [],
        mediaFile: null,
        mediaType: null,
        mediaStatus: 'pending',
        submittedAt: '2026-03-19T14:30:00Z',
      },
    ],
  },
];

const mockSubmissions = [
  {
    id: 'sub-1',
    questId: 'quest-2',
    questTitle: 'Whispers in the Garden',
    sceneId: 'scene-2',
    sceneIndex: 1,
    writerId: 'writer-1',
    writerName: 'Alex Writer',
    writerEmail: 'alex@urbanquest.com',
    mediaType: 'audio',
    mediaUrl: null,
    fileName: 'scene2_narration.mp3',
    fileSize: '2.4 MB',
    duration: '1:45',
    status: 'pending',
    submittedAt: '2026-03-19T14:30:00Z',
    reviewedAt: null,
    reviewNotes: null,
  },
  {
    id: 'sub-2',
    questId: 'quest-1',
    questTitle: 'The Midnight Heist',
    sceneId: 'scene-1',
    sceneIndex: 1,
    writerId: 'writer-2',
    writerName: 'Jordan Blake',
    writerEmail: 'jordan@urbanquest.com',
    mediaType: 'video',
    mediaUrl: null,
    fileName: 'heist_intro.mp4',
    fileSize: '18.7 MB',
    duration: '2:30',
    status: 'pending',
    submittedAt: '2026-03-18T09:15:00Z',
    reviewedAt: null,
    reviewNotes: null,
  },
  {
    id: 'sub-3',
    questId: 'quest-1',
    questTitle: 'The Midnight Heist',
    sceneId: 'scene-1',
    sceneIndex: 1,
    writerId: 'writer-3',
    writerName: 'Sam Chen',
    writerEmail: 'sam@urbanquest.com',
    mediaType: 'audio',
    mediaUrl: null,
    fileName: 'warehouse_audio.wav',
    fileSize: '5.1 MB',
    duration: '2:10',
    status: 'approved',
    submittedAt: '2026-03-15T11:20:00Z',
    reviewedAt: '2026-03-16T08:00:00Z',
    reviewNotes: 'Great narration quality!',
  },
  {
    id: 'sub-4',
    questId: 'quest-2',
    questTitle: 'Whispers in the Garden',
    sceneId: 'scene-2',
    sceneIndex: 1,
    writerId: 'writer-4',
    writerName: 'Taylor Reed',
    writerEmail: 'taylor@urbanquest.com',
    mediaType: 'audio',
    mediaUrl: null,
    fileName: 'garden_scene.mp3',
    fileSize: '1.8 MB',
    duration: '1:20',
    status: 'rejected',
    submittedAt: '2026-03-14T16:45:00Z',
    reviewedAt: '2026-03-15T10:30:00Z',
    reviewNotes: 'Audio quality too low. Please re-record with better microphone.',
  },
];

// Load persisted data from localStorage
const loadPersistedState = () => {
  try {
    const saved = localStorage.getItem('urban-quest-store');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        submissions: parsed.submissions || mockSubmissions,
        quests: parsed.quests || [],
      };
    }
  } catch (e) {
    console.warn('Failed to load persisted state:', e);
  }
  return { submissions: mockSubmissions, quests: [] };
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
        quests: mockQuests,
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
      await api.updateQuest(questId, updates);
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId ? { ...q, ...updates } : q
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

  updateScene: (questId, sceneId, updates) => set((state) => ({
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
  })),

  deleteScene: (questId, sceneId) => set((state) => ({
    quests: state.quests.map((q) =>
      q.id === questId
        ? {
            ...q,
            scenes: q.scenes.filter((s) => s.id !== sceneId),
          }
        : q
    ),
  })),

  submitSceneMedia: (questId, sceneId, mediaFile, mediaType) => {
    const state = get();
    const quest = state.quests.find(q => q.id === questId);
    const scene = quest?.scenes.find(s => s.id === sceneId);
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
