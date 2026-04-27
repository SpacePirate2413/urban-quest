import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

const ALLOWED_PRICE_TIERS = [0, 0.99, 1.99, 2.99, 4.99, 9.99] as const;

const purchaseSchema = z.object({
  questId: z.string(),
  // Set when the purchase went through Apple/Google IAP via RevenueCat.
  // Recorded for reconciliation against the RevenueCat webhook (follow-up).
  revenueCatTransactionId: z.string().optional(),
});

const progressSchema = z.object({
  currentSceneId: z.string().optional(),
  completed: z.boolean().optional(),
});

export async function purchaseRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Get user's purchases
  app.get('/', async (request) => {
    const userId = (request.user as any).id;
    
    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: {
        quest: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
            waypoints: { orderBy: { orderIndex: 'asc' } },
            scenes: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return purchases;
  });

  // Check if user owns a quest
  app.get('/check/:questId', async (request, reply) => {
    const userId = (request.user as any).id;
    const { questId } = request.params as { questId: string };

    const purchase = await prisma.purchase.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    return { owned: !!purchase, purchase };
  });

  // Purchase a quest (or start free quest)
  app.post('/', async (request, reply) => {
    const userId = (request.user as any).id;
    const parsed = purchaseSchema.safeParse(request.body);
    
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { questId, revenueCatTransactionId } = parsed.data;

    // Check if already purchased
    const existing = await prisma.purchase.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (existing) {
      return reply.status(400).send({ error: 'Quest already purchased' });
    }

    // Get quest to check price
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
      return reply.status(404).send({ error: 'Quest not found' });
    }

    if (quest.status !== 'published') {
      return reply.status(400).send({ error: 'Quest is not available for purchase' });
    }

    // Paid quests must come with a RevenueCat transaction id (proof the IAP
    // actually completed). The webhook (follow-up task) is the canonical source
    // of truth for refunds/revocations; this row is created up front for fast
    // ownership checks on the next screen.
    if (quest.price > 0 && !revenueCatTransactionId) {
      return reply
        .status(402)
        .send({ error: 'Purchase requires an in-app payment.' });
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        questId,
        amount: quest.price,
        paymentMethod: quest.price > 0 ? 'apple_pay' : null,
        status: 'completed',
      },
      include: {
        quest: {
          include: {
            waypoints: { orderBy: { orderIndex: 'asc' } },
            scenes: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    // Increment play count
    await prisma.quest.update({
      where: { id: questId },
      data: { playCount: { increment: 1 } },
    });

    return reply.status(201).send(purchase);
  });

  // Update progress
  app.patch('/:questId/progress', async (request, reply) => {
    const userId = (request.user as any).id;
    const { questId } = request.params as { questId: string };
    const parsed = progressSchema.safeParse(request.body);
    
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (!purchase) {
      return reply.status(404).send({ error: 'Purchase not found' });
    }

    const updateData: any = {};
    if (parsed.data.currentSceneId) {
      updateData.currentSceneId = parsed.data.currentSceneId;
    }
    if (parsed.data.completed) {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.purchase.update({
      where: { userId_questId: { userId, questId } },
      data: updateData,
    });

    return updated;
  });
}

export default purchaseRoutes;
