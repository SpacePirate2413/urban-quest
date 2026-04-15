import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

export interface SubmissionFilters {
  status?: string;
  mediaType?: string;
}

export async function getSubmissions(filters: SubmissionFilters = {}, limit = 50, offset = 0) {
  const where: Prisma.SceneWhereInput = {
    mediaUrl: { not: null },
  };

  if (filters.status) {
    where.mediaStatus = filters.status;
  }
  if (filters.mediaType) {
    where.mediaType = filters.mediaType;
  }

  const [scenes, total] = await Promise.all([
    prisma.scene.findMany({
      where,
      include: {
        quest: {
          include: {
            author: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        waypoint: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.scene.count({ where }),
  ]);

  return {
    submissions: scenes.map(scene => ({
      id: scene.id,
      questId: scene.questId,
      questTitle: scene.quest.title,
      sceneIndex: scene.orderIndex,
      waypointName: scene.waypoint?.name || null,
      writerId: scene.quest.author.id,
      writerName: scene.quest.author.name,
      writerEmail: scene.quest.author.email,
      mediaType: scene.mediaType,
      mediaUrl: scene.mediaUrl,
      mediaStatus: scene.mediaStatus,
      script: scene.script,
      createdAt: scene.createdAt.toISOString(),
      updatedAt: scene.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function reviewSubmission(sceneId: string, status: 'approved' | 'rejected', notes?: string) {
  const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
  if (!scene) return null;

  return prisma.scene.update({
    where: { id: sceneId },
    data: {
      mediaStatus: status,
    },
    include: {
      quest: {
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}
