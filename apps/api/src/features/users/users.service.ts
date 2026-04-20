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
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  async findByProvider(provider: AuthProvider, providerId: string) {
    return prisma.user.findUnique({
      where: {
        provider_providerId: { provider, providerId },
      },
    });
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

  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
};
