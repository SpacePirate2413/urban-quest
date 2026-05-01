import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notifyUser } from '../../lib/ws.js';

export interface SubmissionFilters {
  status?: string;
  mediaType?: string;
}

export async function getSubmissions(filters: SubmissionFilters = {}, limit = 50, offset = 0) {
  // Build quest-level filter
  const questWhere: Prisma.QuestWhereInput = {
    submissionStatus: { not: null },
    scenes: { some: { mediaUrl: { not: null } } },
  };

  if (filters.status) {
    questWhere.submissionStatus = filters.status;
  }

  // Build scene-level filter for mediaType
  const sceneWhere: Prisma.SceneWhereInput = { mediaUrl: { not: null } };
  if (filters.mediaType) {
    sceneWhere.mediaType = filters.mediaType;
  }

  const [quests, total] = await Promise.all([
    prisma.quest.findMany({
      where: questWhere,
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
        scenes: {
          where: sceneWhere,
          orderBy: { orderIndex: 'asc' },
          include: {
            waypoint: { select: { id: true, name: true } },
          },
        },
        // Pull the first waypoint by orderIndex so the admin panel can
        // derive a city label via reverse geocoding when `quest.city`
        // hasn't been set explicitly.
        waypoints: {
          orderBy: { orderIndex: 'asc' },
          take: 1,
          select: { id: true, name: true, lat: true, lng: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.quest.count({ where: questWhere }),
  ]);

  return {
    questSubmissions: quests.map(quest => ({
      questId: quest.id,
      questTitle: quest.title,
      questDescription: quest.description,
      tagline: quest.tagline,
      genre: quest.genre,
      difficulty: quest.difficulty,
      ageRating: quest.ageRating,
      price: quest.price,
      status: quest.status,
      usesAI: quest.usesAI,
      narratorVoiceId: quest.narratorVoiceId,
      mediaType: quest.mediaType,
      coverImage: quest.coverImage,
      city: quest.city,
      // Pre-included first waypoint so the admin client can reverse-geocode
      // it into a city label when `city` itself is empty.
      firstWaypoint: quest.waypoints[0]
        ? { lat: quest.waypoints[0].lat, lng: quest.waypoints[0].lng, name: quest.waypoints[0].name }
        : null,
      estimatedDuration: quest.estimatedDuration,
      submissionStatus: quest.submissionStatus,
      createdAt: quest.createdAt.toISOString(),
      writerId: quest.author.id,
      writerName: quest.author.name,
      writerEmail: quest.author.email,
      writerAvatar: quest.author.avatarUrl,
      sceneCount: quest.scenes.length,
      updatedAt: quest.updatedAt.toISOString(),
      // sceneIndex is the *display* index (0-based). The legacy `orderIndex`
      // column starts at 1 because of an off-by-one in addScene; using the
      // array position here keeps the admin UI's "Scene {sceneIndex + 1}"
      // numbering aligned with the creator's "Scene 1, 2, 3" expectation.
      scenes: quest.scenes.map((scene, i) => ({
        id: scene.id,
        sceneIndex: i,
        waypointName: scene.waypoint?.name || null,
        mediaType: scene.mediaType,
        mediaUrl: scene.mediaUrl,
        mediaStatus: scene.mediaStatus,
        script: scene.script,
        updatedAt: scene.updatedAt.toISOString(),
      })),
    })),
    total,
  };
}

// Review an entire quest (approve or reject all scenes)
export async function reviewQuestSubmission(
  questId: string,
  status: 'approved' | 'rejected',
  notes?: string,
) {
  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    include: { scenes: true },
  });
  if (!quest) return null;

  // Quest-level review applies the same status + notes to every scene so the
  // creator sees the feedback on each scene card in the Create tab.
  const sceneUpdate: { mediaStatus: 'approved' | 'rejected'; reviewNotes?: string | null } = {
    mediaStatus: status,
  };
  // Empty/whitespace notes clear any prior feedback rather than appending a
  // blank string.
  sceneUpdate.reviewNotes = notes && notes.trim() ? notes.trim() : null;

  const [updatedQuest] = await prisma.$transaction([
    prisma.quest.update({
      where: { id: questId },
      data: { submissionStatus: status },
      include: {
        author: { select: { id: true, name: true, email: true } },
        scenes: { orderBy: { orderIndex: 'asc' } },
      },
    }),
    prisma.scene.updateMany({
      where: { questId },
      data: sceneUpdate,
    }),
  ]);

  if (status === 'approved') {
    notifyUser(updatedQuest.authorId, 'quest:approved', {
      questId: updatedQuest.id,
      questTitle: updatedQuest.title,
    });
  }

  return updatedQuest;
}

// Review a single scene — rejecting cascades to quest-level rejection
export async function reviewScene(
  sceneId: string,
  status: 'approved' | 'rejected',
  notes?: string,
) {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    include: { quest: { include: { scenes: true } } },
  });
  if (!scene) return null;

  // Update the individual scene + persist any reviewer notes so the creator
  // sees them in the Create tab. Empty/whitespace clears any prior note.
  await prisma.scene.update({
    where: { id: sceneId },
    data: {
      mediaStatus: status,
      reviewNotes: notes && notes.trim() ? notes.trim() : null,
    },
  });

  if (status === 'rejected') {
    // Rejecting any scene rejects the whole quest
    await prisma.quest.update({
      where: { id: scene.questId },
      data: { submissionStatus: 'rejected' },
    });
  } else if (status === 'approved') {
    // Check if ALL scenes in the quest are now approved
    const otherScenes = scene.quest.scenes.filter(s => s.id !== sceneId);
    const allApproved = otherScenes.every(s => s.mediaStatus === 'approved');
    if (allApproved) {
      const approvedQuest = await prisma.quest.update({
        where: { id: scene.questId },
        data: { submissionStatus: 'approved' },
      });
      notifyUser(approvedQuest.authorId, 'quest:approved', {
        questId: approvedQuest.id,
        questTitle: approvedQuest.title,
      });
    }
  }

  // Return updated quest with scenes
  return prisma.quest.findUnique({
    where: { id: scene.questId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      scenes: { orderBy: { orderIndex: 'asc' } },
    },
  });
}
