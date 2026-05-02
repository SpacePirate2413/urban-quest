import { prisma } from '../../src/lib/prisma.js';
import type { TestApp } from './app.js';

interface CreateUserOpts {
  email?: string;
  name?: string;
  role?: 'player' | 'writer' | 'admin';
}

/**
 * Insert a user directly via Prisma and mint a JWT for them using the same
 * @fastify/jwt plugin the live routes use. Bypasses the OAuth/dev-auth
 * handlers entirely so tests don't depend on DEV_AUTH_BYPASS being set.
 */
export async function createTestUser(app: TestApp, opts: CreateUserOpts = {}) {
  const email = opts.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.dev`;
  const user = await prisma.user.create({
    data: {
      email,
      name: opts.name ?? 'Test User',
      provider: 'DEV',
      providerId: `dev-${email}`,
      role: opts.role ?? 'writer',
    },
  });

  const token = app.jwt.sign({ id: user.id, email: user.email });

  return {
    user,
    token,
    authHeaders: { authorization: `Bearer ${token}` },
  };
}
