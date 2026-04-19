import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as adminService from './admin.service.js';

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // Get all submissions grouped by quest
  app.get('/submissions', async (request) => {
    const { status, mediaType, limit, offset } = request.query as any;

    return adminService.getSubmissions(
      { status, mediaType },
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  });

  // Review an entire quest (approve/reject all scenes at once)
  app.patch('/submissions/quest/:questId', async (request, reply) => {
    const { questId } = request.params as { questId: string };
    const parsed = reviewSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
    }

    const result = await adminService.reviewQuestSubmission(questId, parsed.data.status, parsed.data.notes);
    if (!result) {
      return reply.status(404).send({ error: 'Quest not found' });
    }

    return result;
  });

  // Review a single scene (reject cascades to quest, approve auto-promotes quest if all scenes approved)
  app.patch('/submissions/:sceneId', async (request, reply) => {
    const { sceneId } = request.params as { sceneId: string };
    const parsed = reviewSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
    }

    const result = await adminService.reviewScene(sceneId, parsed.data.status, parsed.data.notes);
    if (!result) {
      return reply.status(404).send({ error: 'Scene not found' });
    }

    return result;
  });
}

export default adminRoutes;
