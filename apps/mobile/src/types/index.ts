export enum UserRole {
  PLAYER = 'PLAYER',
  WRITER = 'WRITER',
}

export enum QuestStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

export enum Difficulty {
  EASY = 'Easy',
  MODERATE = 'Moderate',
  DIFFICULT = 'Difficult',
}

export enum AgeRating {
  FOUR_PLUS = '4+',
  NINE_PLUS = '9+',
  TWELVE_PLUS = '12+',
  SEVENTEEN_PLUS = '17+',
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  avatarType: 'custom' | 'preset' | 'google' | 'apple';
  role: UserRole;
  birthdate?: Date;
  // Editable creator-side profile fields. Mirrors what creator-station shows
  // and writes via PATCH /users/me, so the same Brent who edits in the web
  // editor sees consistent data on the phone.
  bio?: string;
  genres?: string; // comma-separated list — same shape the API stores
  createdQuests: string[];
  purchasedQuests: PurchasedQuest[];
  completedQuestsCount: number;
  reviewsWritten: Review[];
  createdAt: Date;
}

export interface PurchasedQuest {
  id: string;
  questId: string;
  purchasedAt: Date;
  expiresAt: Date;
  currentWaypointIndex: number;
  completedAt?: Date;
  progress: WaypointProgress[];
}

export interface WaypointProgress {
  waypointId: string;
  arrivedAt?: Date;
  scenePlayedAt?: Date;
  answeredAt?: Date;
  selectedChoiceId?: string;
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
  scenes: Scene[];
}

export interface Scene {
  id: string;
  waypointId: string;
  scriptText: string;
  speaker?: string;
  videoUrl?: string;
  audioUrl?: string;
  questions: Question[];
}

export interface Question {
  id: string;
  sceneId: string;
  text: string;
  choices: Choice[];
}

export interface Choice {
  id: string;
  questionId: string;
  text: string;
  nextWaypointId?: string;
  isCorrect?: boolean;
}

export interface Character {
  id: string;
  name: string;
  avatarUrl?: string;
  bio: string;
  roleInStory: string;
}

export interface Review {
  id: string;
  questId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text?: string;
  createdAt: Date;
}

export interface Quest {
  id: string;
  title: string;
  tagline: string;
  description: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  status: QuestStatus;
  coverImageUrl: string;
  previewMediaUrl?: string;
  estimatedDurationMinutes: number;
  estimatedDistanceMeters: number;
  difficulty: Difficulty;
  playerDifficultyRating?: number;
  playerDifficultyCount?: number;
  price: number;
  isFree: boolean;
  ageRating: AgeRating;
  category: string;
  playerCount: number;
  minPlayers: number;
  maxPlayers: number;
  waypoints: Waypoint[];
  characters: Character[];
  reviews: Review[];
  averageRating?: number;
  reviewCount: number;
  createdAt: Date;
  firstWaypointLocation: LocationCoords;
  /** Creator-declared format for the whole quest. Set in the creator
   *  station Quest Info tab; required for submission. */
  mediaType?: 'audio' | 'video';
}

export interface ScoutedWaypoint {
  id: string;
  userId: string;
  name: string;
  notes?: string;
  location: LocationCoords;
  photos: string[];
  videos: string[];
  audioRecordings: string[];
  createdAt: Date;
}

export interface FilterOptions {
  priceRange?: 'free' | 'under5' | 'under10' | 'over10';
  difficulty?: Difficulty;
  maxDuration?: number;
  category?: string;
  minRating?: number;
  maxDistance?: number;
  ageRating?: AgeRating;
  playerCount?: number;
  /** Filter by quest format — audio-only or video. Undefined = both. */
  mediaType?: 'audio' | 'video';
}

export type ViewMode = 'map' | 'list';
