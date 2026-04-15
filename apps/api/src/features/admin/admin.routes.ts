import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as adminService from './admin.service.js';

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // Get all submissions (scenes with media)
  app.get('/submissions', async (request) => {
    const { status, mediaType, limit, offset } = request.query as any;

    return adminService.getSubmissions(
      { status, mediaType },
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  });

  // Review a submission (approve/reject)
  app.patch('/submissions/:sceneId', async (request, reply) => {
    const { sceneId } = request.params as { sceneId: string };
    const parsed = reviewSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
    }

    const result = await adminService.reviewSubmission(sceneId, parsed.data.status, parsed.data.notes);
    if (!result) {
      return reply.status(404).send({ error: 'Scene not found' });
    }

    return {
      id: result.id,
      mediaStatus: result.mediaStatus,
      questTitle: result.quest.title,
      writerName: result.quest.author.name,
    };
  });
}

export default adminRoutes;
