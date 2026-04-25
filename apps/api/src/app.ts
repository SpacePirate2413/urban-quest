import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { adminRoutes } from './features/admin/admin.routes.js';
import { purchaseRoutes } from './features/purchases/purchases.routes.js';
import { questRoutes } from './features/quests/quests.routes.js';
import { reviewRoutes } from './features/reviews/reviews.routes.js';
import { usersRoutes } from './features/users/users.routes.js';
import { registerClient } from './lib/ws.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' 
        ? { target: 'pino-pretty' } 
        : undefined,
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
  });

  await app.register(cookie);

  await app.register(multipart, {
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB
    },
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  await app.register(staticPlugin, {
    root: uploadsPath,
    prefix: '/api/media/',
    decorateReply: false,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  app.decorate('authenticate', async function (request: { jwtVerify: () => Promise<void> }, reply: { status: (code: number) => { send: (body: unknown) => void } }) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(questRoutes, { prefix: '/api/quests' });
  await app.register(purchaseRoutes, { prefix: '/api/purchases' });
  await app.register(reviewRoutes, { prefix: '/api/reviews' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // WebSocket endpoint for real-time notifications
  await app.register(websocket);
  app.get('/api/ws', { websocket: true }, (socket, request) => {
    const token = (request.query as Record<string, string>).token;
    if (!token) {
      socket.close(4001, 'Missing token');
      return;
    }
    try {
      const decoded = app.jwt.verify<{ id: string }>(token);
      registerClient(decoded.id, socket);
    } catch {
      socket.close(4001, 'Invalid token');
    }
  });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
