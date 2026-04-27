import { prisma } from '../../lib/prisma.js';

export const blocksService = {
  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      return { error: 'You cannot block yourself' as const };
    }
    const target = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) return { error: 'User not found' as const };

    return prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  },

  async unblock(blockerId: string, blockedId: string) {
    await prisma.userBlock
      .delete({ where: { blockerId_blockedId: { blockerId, blockedId } } })
      .catch(() => null); // no-op if the block didn't exist
    return { success: true };
  },

  async listBlockedIds(blockerId: string) {
    const rows = await prisma.userBlock.findMany({
      where: { blockerId },
      select: { blockedId: true },
    });
    return rows.map((r) => r.blockedId);
  },

  async list(blockerId: string) {
    return prisma.userBlock.findMany({
      where: { blockerId },
      include: {
        blocked: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
