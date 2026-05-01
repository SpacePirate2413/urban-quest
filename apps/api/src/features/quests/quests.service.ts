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
  mediaType?: 'audio' | 'video';
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
  /** When set, excludes quests authored by users this viewer has blocked. */
  viewerId?: string;
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

  // Hide content authored by banned/deleted users (defense in depth — ban also
  // unpublishes their quests, but a stale row shouldn't slip through). Hide
  // anything authored by users this viewer has explicitly blocked.
  const authorWhere: Prisma.UserWhereInput = {
    bannedAt: null,
    deletedAt: null,
  };
  if (filters.viewerId) {
    const blocked = await prisma.userBlock.findMany({
      where: { blockerId: filters.viewerId },
      select: { blockedId: true },
    });
    if (blocked.length) {
      authorWhere.id = { notIn: blocked.map((b) => b.blockedId) };
    }
  }
  where.author = authorWhere;

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

export async function getPublishedQuests(
  filters: Omit<QuestFilters, 'status'> = {},
  limit = 50,
  offset = 0,
) {
  const result = await getQuests({ ...filters, status: 'published' }, limit, offset);

  // Hide quests that the mobile player can't actually finish — missing scenes,
  // missing media, or choices that don't route anywhere. The creator's own
  // `getMyQuests` skips this filter so they can still see their drafts.
  const playable = result.quests.filter(isQuestPlayable);

  return { ...result, quests: playable, total: playable.length };
}

/** End-sentinel value stored in `choice.sceneId` to mark a quest-ending choice. */
export const END_SCENE_ID = '__END__';

/**
 * A quest is playable when every scene has a script, question, choices, and
 * media, and every choice routes to either a real scene in this quest or the
 * END sentinel. Mobile filters its public feed by this; the creator's own
 * list does not.
 *
 * Choices are stored as `{ text, sceneId }`. Legacy data may still have
 * `{ text, waypointId }` shape; we accept those too as long as the waypointId
 * matches one of the quest's waypoints (the read path migrates them on the fly).
 */
export function isQuestPlayable(quest: {
  waypoints: { id: string }[];
  scenes: { id: string; script: string | null; question: string | null; choices: string | null; mediaUrl: string | null }[];
}): boolean {
  if (!quest.waypoints?.length || !quest.scenes?.length) return false;
  const waypointIds = new Set(quest.waypoints.map((w) => w.id));
  const sceneIds = new Set(quest.scenes.map((s) => s.id));

  for (const scene of quest.scenes) {
    // Script is optional — when media is attached, the audio/video is the
    // scene's content. Question + choices + media remain required.
    if (!scene.question?.trim()) return false;
    if (!scene.mediaUrl) return false;
    let parsed: { text?: string; sceneId?: string; waypointId?: string }[];
    try {
      parsed = JSON.parse(scene.choices ?? '[]');
    } catch {
      return false;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    for (const c of parsed) {
      if (!c?.text?.trim()) return false;
      const target = c.sceneId ?? c.waypointId ?? '';
      if (target === END_SCENE_ID) continue;
      // New shape: must point at a known scene. Legacy shape: must point at a
      // known waypoint (still routable because at least one scene lives there
      // — read paths fall back to the first scene at that waypoint).
      if (!(sceneIds.has(target) || waypointIds.has(target))) return false;
    }
  }
  return true;
}

// Fields that are considered "content" — editing any of these on a published
// quest means the changes must be re-reviewed before they go live.
const CONTENT_FIELDS = new Set([
  'title', 'description', 'tagline', 'genre', 'difficulty', 'ageRating',
  'price', 'coverImage', 'usesAI', 'narratorVoiceId', 'mediaType',
  'estimatedDuration',
]);

export async function updateQuest(id: string, authorId: string, input: UpdateQuestInput) {
  // Verify ownership
  const quest = await prisma.quest.findFirst({ where: { id, authorId } });
  if (!quest) return null;

  // If the quest is published (or approved and awaiting publish) and a content
  // field changed, flag it so the creator is prompted to resubmit for review.
  const isLive = quest.status === 'published' || quest.submissionStatus === 'approved';
  const touchesContent = Object.keys(input).some((k) => CONTENT_FIELDS.has(k));
  const alreadyFlagged = quest.submissionStatus === 'needs_re_review' || quest.submissionStatus === 'pending';

  const data: Record<string, unknown> = { ...input };
  if (isLive && touchesContent && !alreadyFlagged) {
    data.submissionStatus = 'needs_re_review';
  }

  return prisma.quest.update({
    where: { id },
    data,
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

const SCENE_CONTENT_FIELDS = new Set([
  'script', 'question', 'choices', 'mediaUrl', 'mediaType',
]);

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
    include: { quest: { select: { status: true, submissionStatus: true } } },
  });
  if (!scene) return null;

  const quest = scene.quest;
  const isLive = quest.status === 'published' || quest.submissionStatus === 'approved';
  const touchesContent = Object.keys(data).some((k) => SCENE_CONTENT_FIELDS.has(k));
  const alreadyFlagged = quest.submissionStatus === 'needs_re_review' || quest.submissionStatus === 'pending';

  if (isLive && touchesContent && !alreadyFlagged) {
    await prisma.quest.update({
      where: { id: scene.questId },
      data: { submissionStatus: 'needs_re_review' },
    });
  }

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
