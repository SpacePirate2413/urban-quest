import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface CreateQuestInput {
  title: string;
  description?: string;
  tagline?: string;
  genre?: string;
  difficulty?: string;
  ageRating?: string;
  price?: number;
  coverImage?: string;
  usesAI?: boolean;
  narratorVoiceId?: string;
  estimatedDuration?: number;
  startLat?: number;
  startLng?: number;
  city?: string;
}

export interface UpdateQuestInput extends Partial<CreateQuestInput> {
  status?: string;
}

export interface QuestFilters {
  status?: string;
  genre?: string;
  difficulty?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  authorId?: string;
}

const questInclude = {
  author: { select: { id: true, name: true, avatarUrl: true } },
  waypoints: { orderBy: { orderIndex: 'asc' as const } },
  scenes: { orderBy: { orderIndex: 'asc' as const } },
  _count: { select: { reviews: true, purchases: true } },
};

export async function createQuest(authorId: string, input: CreateQuestInput) {
  return prisma.quest.create({
    data: {
      ...input,
      authorId,
    },
    include: questInclude,
  });
}

export async function getQuestById(id: string) {
  const quest = await prisma.quest.findUnique({
    where: { id },
    include: {
      ...questInclude,
      reviews: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!quest) return null;

  // Calculate average rating
  const avgRating = await prisma.review.aggregate({
    where: { questId: id },
    _avg: { rating: true },
  });

  return { ...quest, averageRating: avgRating._avg.rating || 0 };
}

export async function getQuests(filters: QuestFilters = {}, limit = 50, offset = 0) {
  const where: Prisma.QuestWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.genre) where.genre = filters.genre;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.city) where.city = { contains: filters.city };
  if (filters.authorId) where.authorId = filters.authorId;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
  }

  const [quests, total] = await Promise.all([
    prisma.quest.findMany({
      where,
      include: questInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.quest.count({ where }),
  ]);

  // Get average ratings for all quests
  const questIds = quests.map(q => q.id);
  const ratings = await prisma.review.groupBy({
    by: ['questId'],
    where: { questId: { in: questIds } },
    _avg: { rating: true },
  });

  const ratingsMap = new Map(ratings.map(r => [r.questId, r._avg.rating || 0]));

  return {
    quests: quests.map(q => ({ ...q, averageRating: ratingsMap.get(q.id) || 0 })),
    total,
    limit,
    offset,
  };
}

export async function getPublishedQuests(filters: Omit<QuestFilters, 'status'> = {}, limit = 50, offset = 0) {
  return getQuests({ ...filters, status: 'published' }, limit, offset);
}

export async function updateQuest(id: string, authorId: string, input: UpdateQuestInput) {
  // Verify ownership
  const quest = await prisma.quest.findFirst({ where: { id, authorId } });
  if (!quest) return null;

  return prisma.quest.update({
    where: { id },
    data: input,
    include: questInclude,
  });
}

export async function publishQuest(id: string, authorId: string) {
  const quest = await prisma.quest.findFirst({
    where: { id, authorId },
    include: { waypoints: true, scenes: true },
  });

  if (!quest) return { error: 'Quest not found' };
  if (quest.waypoints.length === 0) return { error: 'Quest must have at least one waypoint' };
  if (quest.scenes.length === 0) return { error: 'Quest must have at least one scene' };

  // Auto-set starting location from first waypoint
  const firstWaypoint = quest.waypoints.sort((a, b) => a.orderIndex - b.orderIndex)[0];
  const locationData: Record<string, any> = {};
  if (firstWaypoint) {
    locationData.startLat = firstWaypoint.lat;
    locationData.startLng = firstWaypoint.lng;
  }

  return prisma.quest.update({
    where: { id },
    data: { status: 'published', publishedAt: new Date(), ...locationData },
    include: questInclude,
  });
}

export async function deleteQuest(id: string, authorId: string) {
  const quest = await prisma.quest.findFirst({ where: { id, authorId } });
  if (!quest) return false;

  await prisma.quest.delete({ where: { id } });
  return true;
}

// Waypoint operations
export async function addWaypoint(questId: string, authorId: string, data: {
  name: string;
  description?: string;
  notes?: string;
  photoUrl?: string;
  lat: number;
  lng: number;
}) {
  const quest = await prisma.quest.findFirst({ where: { id: questId, authorId } });
  if (!quest) return null;

  const maxOrder = await prisma.waypoint.aggregate({
    where: { questId },
    _max: { orderIndex: true },
  });

  return prisma.waypoint.create({
    data: {
      ...data,
      questId,
      orderIndex: (maxOrder._max.orderIndex || 0) + 1,
    },
  });
}

export async function updateWaypoint(waypointId: string, authorId: string, data: Partial<{
  name: string;
  description: string;
  notes: string;
  photoUrl: string;
  lat: number;
  lng: number;
  orderIndex: number;
}>) {
  const waypoint = await prisma.waypoint.findFirst({
    where: { id: waypointId, quest: { authorId } },
  });
  if (!waypoint) return null;

  return prisma.waypoint.update({ where: { id: waypointId }, data });
}

export async function deleteWaypoint(waypointId: string, authorId: string) {
  const waypoint = await prisma.waypoint.findFirst({
    where: { id: waypointId, quest: { authorId } },
  });
  if (!waypoint) return false;

  await prisma.waypoint.delete({ where: { id: waypointId } });
  return true;
}

// Scene operations
export async function addScene(questId: string, authorId: string, data: {
  script: string;
  question?: string;
  choices?: string;
  waypointId?: string;
}) {
  const quest = await prisma.quest.findFirst({ where: { id: questId, authorId } });
  if (!quest) return null;

  const maxOrder = await prisma.scene.aggregate({
    where: { questId },
    _max: { orderIndex: true },
  });

  return prisma.scene.create({
    data: {
      ...data,
      questId,
      orderIndex: (maxOrder._max.orderIndex || 0) + 1,
    },
  });
}

export async function updateScene(sceneId: string, authorId: string, data: Partial<{
  script: string;
  question: string;
  choices: string;
  waypointId: string;
  orderIndex: number;
  mediaUrl: string;
  mediaType: string;
  mediaStatus: string;
}>) {
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, quest: { authorId } },
  });
  if (!scene) return null;

  return prisma.scene.update({ where: { id: sceneId }, data });
}

export async function submitQuestForReview(questId: string, authorId: string) {
  const quest = await prisma.quest.findFirst({
    where: { id: questId, authorId },
    include: { scenes: { orderBy: { orderIndex: 'asc' } } },
  });

  if (!quest) return { error: 'Quest not found or not authorized' };
  if (quest.scenes.length === 0) return { error: 'Quest must have at least one scene' };

  const scenesWithoutMedia = quest.scenes.filter(s => !s.mediaUrl);
  if (scenesWithoutMedia.length > 0) {
    return {
      error: `All scenes must have media uploaded. Missing: Scene${scenesWithoutMedia.length > 1 ? 's' : ''} ${scenesWithoutMedia.map(s => s.orderIndex + 1).join(', ')}`,
    };
  }

  // Atomically set quest submissionStatus and all scene mediaStatus to pending
  const [updatedQuest] = await prisma.$transaction([
    prisma.quest.update({
      where: { id: questId },
      data: { submissionStatus: 'pending' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        scenes: { orderBy: { orderIndex: 'asc' } },
      },
    }),
    prisma.scene.updateMany({
      where: { questId },
      data: { mediaStatus: 'pending' },
    }),
  ]);

  return updatedQuest;
}

export async function deleteScene(sceneId: string, authorId: string) {
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, quest: { authorId } },
  });
  if (!scene) return false;

  await prisma.scene.delete({ where: { id: sceneId } });
  return true;
}
