import { prisma } from '../../lib/prisma.js';

export type AuthProvider = 'GOOGLE' | 'APPLE' | 'DEV';

export interface CreateUserInput {
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  providerId: string;
}

export interface UpdateUserInput {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  genres?: string;
}

export const usersService = {
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    // Treat anonymized/banned accounts as non-existent so a stale token does not see
    // ghost data. Suspended accounts are still returned — the caller can show a
    // suspension screen.
    if (!user || user.deletedAt || user.bannedAt) return null;
    return user;
  },

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user || user.deletedAt || user.bannedAt) return null;
    return user;
  },

  async findByProvider(provider: AuthProvider, providerId: string) {
    const user = await prisma.user.findUnique({
      where: {
        provider_providerId: { provider, providerId },
      },
    });
    if (!user || user.deletedAt || user.bannedAt) return null;
    return user;
  },

  async findOrCreate(input: CreateUserInput) {
    const existing = await this.findByProvider(input.provider, input.providerId);

    if (existing) {
      return existing;
    }

    return prisma.user.create({
      data: input,
    });
  },

  async update(id: string, data: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  // Apple Guideline 5.1.1(v) and Google Play data-deletion policy require an in-app
  // account-deletion flow. Per docs/account-deletion.md the user record is anonymized
  // (not hard-deleted) so foreign keys to published Quests remain valid while all PII
  // is cleared. Draft Quests, Reviews, Purchases, and ScoutedWaypoints are deleted.
  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      // Drop personal data tied to the account.
      await tx.scoutedWaypoint.deleteMany({ where: { userId: id } });
      await tx.review.deleteMany({ where: { userId: id } });
      await tx.purchase.deleteMany({ where: { userId: id } });

      // Drop unpublished quests; cascade removes their waypoints/scenes via the schema.
      await tx.quest.deleteMany({
        where: { authorId: id, status: { in: ['draft', 'archived'] } },
      });

      // Anonymize PII while preserving the row so published Quests keep a valid author FK.
      await tx.user.update({
        where: { id },
        data: {
          email: `deleted-${id}@anonymous.urbanquest.invalid`,
          name: 'Deleted User',
          avatarUrl: null,
          bio: null,
          genres: null,
          birthdate: null,
          providerId: `deleted-${id}`,
          deletedAt: new Date(),
        },
      });
    });
  },
};
