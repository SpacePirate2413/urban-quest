import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { blocksService } from './blocks.service.js';
import { reportsService } from './reports.service.js';

const reportSchema = z.object({
  entityType: z.enum(['quest', 'scene', 'review', 'user']),
  entityId: z.string().min(1),
  reason: z.enum([
    'spam',
    'harassment',
    'sexual_minors',
    'hate',
    'violence',
    'illegal',
    'ip',
    'scam',
    'impersonation',
    'other',
  ]),
  details: z.string().max(1000).optional(),
});

const resolveSchema = z.object({
  action: z.enum(['dismiss', 'remove_content', 'suspend_user', 'ban_user']),
  notes: z.string().max(1000).optional(),
});

// Require an authenticated admin user. We need this because the existing /admin namespace
// has no auth at all (pre-existing gap), and report-resolution actions (especially ban)
// are far too dangerous to leave unprotected. New work goes behind this hook.
async function requireAdmin(
  request: { jwtVerify: () => Promise<void>; user?: unknown },
  reply: { status: (code: number) => { send: (body: unknown) => void } },
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const userId = (request.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== 'admin') {
    return reply.status(403).send({ error: 'Admin role required' });
  }
}

export async function moderationRoutes(app: FastifyInstance) {
  // -------- User-facing endpoints (any signed-in user) --------
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    });

    // POST /reports — file a report
    protectedRoutes.post('/reports', async (request, reply) => {
      const reporterId = (request.user as { id: string }).id;
      const parsed = reportSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }
      const result = await reportsService.create({ reporterId, ...parsed.data });
      if ('error' in result) return reply.status(400).send(result);
      return reply.status(201).send(result);
    });

    // POST /users/:id/block — block another user
    protectedRoutes.post('/users/:id/block', async (request, reply) => {
      const blockerId = (request.user as { id: string }).id;
      const { id } = request.params as { id: string };
      const result = await blocksService.block(blockerId, id);
      if ('error' in result) return reply.status(400).send(result);
      return reply.status(201).send(result);
    });

    // DELETE /users/:id/block — unblock a user
    protectedRoutes.delete('/users/:id/block', async (request) => {
      const blockerId = (request.user as { id: string }).id;
      const { id } = request.params as { id: string };
      return blocksService.unblock(blockerId, id);
    });

    // GET /me/blocks — list users I've blocked
    protectedRoutes.get('/me/blocks', async (request) => {
      const blockerId = (request.user as { id: string }).id;
      return blocksService.list(blockerId);
    });
  });

  // -------- Admin endpoints --------
  app.register(async (adminRoutes) => {
    adminRoutes.addHook('onRequest', requireAdmin);

    // GET /admin/reports — pending moderation queue
    adminRoutes.get('/admin/reports', async (request) => {
      const { limit, offset } = request.query as { limit?: string; offset?: string };
      return reportsService.listPending(
        limit ? Number(limit) : 50,
        offset ? Number(offset) : 0,
      );
    });

    // GET /admin/reports/:id — single report detail
    adminRoutes.get('/admin/reports/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const report = await reportsService.getById(id);
      if (!report) return reply.status(404).send({ error: 'Report not found' });
      return report;
    });

    // POST /admin/reports/:id/resolve — apply moderation action
    adminRoutes.post('/admin/reports/:id/resolve', async (request, reply) => {
      const resolverId = (request.user as { id: string }).id;
      const { id } = request.params as { id: string };
      const parsed = resolveSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }
      const result = await reportsService.resolve(
        id,
        resolverId,
        parsed.data.action,
        parsed.data.notes,
      );
      if (result && 'error' in result) return reply.status(400).send(result);
      return result;
    });
  });
}
