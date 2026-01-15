import { Quest, QuestStatus, User, UserRole } from '../types';

export const MOCK_USER: User = {
  id: 'u1',
  username: 'QuestMaster42',
  avatarUrl: 'https://example.com/avatar.jpg',
  role: UserRole.PLAYER,
  totalXP: 1250,
  createdQuests: [],
};

export const MOCK_QUEST: Quest = {
  id: 'q_neon_detective',
  title: 'The Neon Shadow',
  tagline: 'Trust no one in the rain.',
  description: 'A noir mystery set in the cyber-district. Investigate the glitch at the clock tower.',
  authorId: 'writer_01',
  status: QuestStatus.PUBLISHED,
  coverImageUrl: 'https://example.com/neon-city.jpg',
  estimatedDurationMinutes: 45,
  difficultyLevel: 3,
  playerCount: 842,
  createdAt: new Date('2023-10-01'),

  characters: [
    {
      id: 'c1',
      name: 'Detective X',
      avatarUrl: 'https://example.com/detective.png',
      bio: 'A rogue AI hunter.',
      roleInStory: 'Protagonist',
    },
    {
      id: 'c2',
      name: 'The Glitch',
      avatarUrl: 'https://example.com/glitch.png',
      bio: 'A digital ghost haunting the mainframe.',
      roleInStory: 'Antagonist',
    },
  ],

  waypoints: [
    {
      id: 'wp_1',
      questId: 'q_neon_detective',
      title: 'The Crime Scene',
      description: 'Go to the Old Square. Look for the flickering neon sign.',
      order: 1,
      location: { latitude: 40.7128, longitude: -74.006 },
      radius: 50,
      photoUrl: 'https://example.com/alleyway.jpg',
      note: 'Make sure the player stands near the bench to trigger.',
    },
    {
      id: 'wp_2',
      questId: 'q_neon_detective',
      title: 'The Informant',
      description: 'Meet the contact behind the subway station.',
      order: 2,
      location: { latitude: 40.7138, longitude: -74.007 },
      radius: 30,
    },
  ],
};
