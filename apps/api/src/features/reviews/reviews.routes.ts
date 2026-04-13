import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

const reviewSchema = z.object({
  questId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function reviewRoutes(app: FastifyInstance) {
  // Get reviews for a quest (public)
  app.get('/quest/:questId', async (request) => {
    const { questId } = request.params as { questId: string };
    
    const reviews = await prisma.review.findMany({
      where: { questId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = await prisma.review.aggregate({
      where: { questId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      reviews,
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count.rating,
    };
  });

  // Protected routes
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    });

    // Get user's reviews
    protectedRoutes.get('/my', async (request) => {
      const userId = (request.user as any).id;
      
      return prisma.review.findMany({
        where: { userId },
        include: {
          quest: { select: { id: true, title: true, coverImage: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    // Create or update review
    protectedRoutes.post('/', async (request, reply) => {
      const userId = (request.user as any).id;
      const parsed = reviewSchema.safeParse(request.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const { questId, rating, comment } = parsed.data;

      // Check if user has purchased/completed the quest
      const purchase = await prisma.purchase.findUnique({
        where: { userId_questId: { userId, questId } },
      });

      if (!purchase) {
        return reply.status(400).send({ error: 'You must play the quest before reviewing' });
      }

      // Upsert review
      const review = await prisma.review.upsert({
        where: { userId_questId: { userId, questId } },
        create: { userId, questId, rating, comment },
        update: { rating, comment },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      return review;
    });

    // Delete review
    protectedRoutes.delete('/:questId', async (request, reply) => {
      const userId = (request.user as any).id;
      const { questId } = request.params as { questId: string };

      const review = await prisma.review.findUnique({
        where: { userId_questId: { userId, questId } },
      });

      if (!review) {
        return reply.status(404).send({ error: 'Review not found' });
      }

      await prisma.review.delete({
        where: { userId_questId: { userId, questId } },
      });

      return { success: true };
    });
  });
}

export default reviewRoutes;
