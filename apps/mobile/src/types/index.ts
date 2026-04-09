export enum UserRole {
  PLAYER = 'PLAYER',
  WRITER = 'WRITER',
}

export enum QuestStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  COMPLETED = 'COMPLETED',
}

export interface User {
  id: string;
  username: string;
  avatarUrl?: string;
  role: UserRole;
  totalXP: number;
  createdQuests: string[];
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface Waypoint {
  id: string;
  questId: string;
  title: string;
  description: string;
  order: number;
  location: LocationCoords;
  radius: number;
  note?: string;
  photoUrl?: string;
}

export interface Scene {
  id: string;
  waypointId: string;
  scriptText: string;
  speaker?: string;
  videoUrl?: string;
  audioUrl?: string;
}

export interface Character {
  id: string;
  name: string;
  avatarUrl?: string;
  bio: string;
  roleInStory: string;
}

export interface Quest {
  id: string;
  title: string;
  tagline: string;
  description: string;
  authorId: string;
  status: QuestStatus;
  coverImageUrl: string;
  estimatedDurationMinutes: number;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  waypoints: Waypoint[];
  characters: Character[];
  createdAt: Date;
  playerCount: number;
}
