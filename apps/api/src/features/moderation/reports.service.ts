import { prisma } from '../../lib/prisma.js';

export type ReportEntityType = 'quest' | 'scene' | 'review' | 'user';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'sexual_minors'
  | 'hate'
  | 'violence'
  | 'illegal'
  | 'ip'
  | 'scam'
  | 'impersonation'
  | 'other';

export type ReportAction = 'dismiss' | 'remove_content' | 'suspend_user' | 'ban_user';

interface CreateReportInput {
  reporterId: string;
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
  details?: string;
}

// Resolve target entity to the user who authored/owns it. Used by suspend_user / ban_user
// actions which need to know the offender's user ID even when the report is filed against
// a quest/scene/review.
async function resolveTargetUserId(entityType: ReportEntityType, entityId: string) {
  switch (entityType) {
    case 'user':
      return entityId;
    case 'quest': {
      const quest = await prisma.quest.findUnique({
        where: { id: entityId },
        select: { authorId: true },
      });
      return quest?.authorId ?? null;
    }
    case 'scene': {
      const scene = await prisma.scene.findUnique({
        where: { id: entityId },
        select: { quest: { select: { authorId: true } } },
      });
      return scene?.quest.authorId ?? null;
    }
    case 'review': {
      const review = await prisma.review.findUnique({
        where: { id: entityId },
        select: { userId: true },
      });
      return review?.userId ?? null;
    }
  }
}

async function entityExists(entityType: ReportEntityType, entityId: string) {
  switch (entityType) {
    case 'user':
      return !!(await prisma.user.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'quest':
      return !!(await prisma.quest.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'scene':
      return !!(await prisma.scene.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'review':
      return !!(await prisma.review.findUnique({ where: { id: entityId }, select: { id: true } }));
  }
}

export const reportsService = {
  async create(input: CreateReportInput) {
    if (!(await entityExists(input.entityType, input.entityId))) {
      return { error: 'Reported entity does not exist' as const };
    }

    // De-dupe: a single user reporting the same entity for the same reason within the
    // last 24h returns the existing pending report instead of creating a duplicate.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: input.reporterId,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        status: 'pending',
        createdAt: { gte: dayAgo },
      },
    });
    if (existing) return existing;

    return prisma.report.create({ data: input });
  },

  async listPending(limit = 50, offset = 0) {
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { status: 'pending' },
        include: {
          reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' }, // oldest first → 24h SLA fairness
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where: { status: 'pending' } }),
    ]);
    return { reports, total };
  },

  async getById(id: string) {
    return prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  },

  async resolve(
    reportId: string,
    resolverId: string,
    action: ReportAction,
    notes?: string,
  ) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) return { error: 'Report not found' as const };
    if (report.status !== 'pending') return { error: 'Report already resolved' as const };

    const targetUserId =
      action === 'suspend_user' || action === 'ban_user'
        ? await resolveTargetUserId(report.entityType as ReportEntityType, report.entityId)
        : null;

    if ((action === 'suspend_user' || action === 'ban_user') && !targetUserId) {
      return { error: 'Could not resolve target user for this action' as const };
    }

    await prisma.$transaction(async (tx) => {
      // Apply the action.
      if (action === 'remove_content') {
        await applyRemoveContent(tx, report.entityType as ReportEntityType, report.entityId);
      } else if (action === 'suspend_user' && targetUserId) {
        await tx.user.update({
          where: { id: targetUserId },
          data: { suspendedAt: new Date() },
        });
      } else if (action === 'ban_user' && targetUserId) {
        // Ban = unpublish all their quests + anonymize the account (similar to A19 deletion).
        await tx.quest.updateMany({
          where: { authorId: targetUserId, status: 'published' },
          data: { status: 'archived' },
        });
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            bannedAt: new Date(),
            email: `banned-${targetUserId}@anonymous.urbanquest.invalid`,
            name: 'Removed User',
            avatarUrl: null,
            bio: null,
            genres: null,
            birthdate: null,
            providerId: `banned-${targetUserId}`,
          },
        });
      }
      // 'dismiss' has no side effects; just records the resolution.

      // Mark this report resolved.
      await tx.report.update({
        where: { id: reportId },
        data: {
          status: action === 'dismiss' ? 'dismissed' : 'resolved',
          resolvedAt: new Date(),
          resolvedById: resolverId,
          action,
          notes,
        },
      });

      // If we acted on a user (suspend/ban), auto-resolve all other pending reports against
      // that same user so we don't have to click through each one.
      if (targetUserId && (action === 'suspend_user' || action === 'ban_user')) {
        await tx.report.updateMany({
          where: {
            status: 'pending',
            id: { not: reportId },
            OR: [
              { entityType: 'user', entityId: targetUserId },
              // Reports against quests/scenes/reviews authored by this user
              // would require a join we can't express in updateMany — admin can
              // dismiss them manually if they want a clean queue.
            ],
          },
          data: {
            status: 'resolved',
            resolvedAt: new Date(),
            resolvedById: resolverId,
            action,
            notes: 'Auto-resolved alongside companion report.',
          },
        });
      }
    });

    return prisma.report.findUnique({ where: { id: reportId } });
  },
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function applyRemoveContent(tx: Tx, entityType: ReportEntityType, entityId: string) {
  switch (entityType) {
    case 'quest':
      await tx.quest.update({ where: { id: entityId }, data: { status: 'archived' } });
      return;
    case 'scene':
      // Clear the media; scene script stays so the quest order isn't broken.
      await tx.scene.update({
        where: { id: entityId },
        data: { mediaStatus: 'rejected', mediaUrl: null, mediaType: null },
      });
      return;
    case 'review':
      await tx.review.delete({ where: { id: entityId } });
      return;
    case 'user':
      // For a content-removal action against a user entity, we can't really "remove
      // the user" without banning. Treat as dismiss + ask admin to use suspend/ban.
      return;
  }
}
