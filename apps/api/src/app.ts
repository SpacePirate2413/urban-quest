import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { env } from './config/env.js';
import { usersRoutes } from './features/users/users.routes.js';

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

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
