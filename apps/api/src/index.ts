import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { usersRoutes } from './features/users/users.routes.js';

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

app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

await app.register(usersRoutes, { prefix: '/api/users' });

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running at http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export type App = typeof app;
