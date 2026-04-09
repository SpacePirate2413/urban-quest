import { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { appleAuthHandler, appleCallbackHandler } from './auth/apple.handler.js';
import { devAuthHandler, devLogoutHandler } from './auth/dev.handler.js';
import { googleAuthHandler, googleCallbackHandler } from './auth/google.handler.js';
import { mobileTokenHandler } from './auth/mobile.handler.js';
import { usersService } from './users.service.js';

export async function usersRoutes(app: FastifyInstance) {
  // OAuth web flows (for creator-station)
  app.get('/auth/google', googleAuthHandler);
  app.get('/auth/google/callback', googleCallbackHandler);
  
  app.get('/auth/apple', appleAuthHandler);
  app.post('/auth/apple/callback', appleCallbackHandler);
  
  // Mobile OAuth token exchange (for React Native)
  app.post('/auth/mobile/token', mobileTokenHandler);
  
  // Dev auth bypass (only available when DEV_AUTH_BYPASS=true in development)
  if (env.DEV_AUTH_BYPASS && env.NODE_ENV === 'development') {
    app.get('/auth/dev', devAuthHandler);
    app.post('/auth/logout', devLogoutHandler);
  }
  
  // Protected routes
  app.get('/me', {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const userId = (request.user as { id: string }).id;
      return usersService.findById(userId);
    },
  });
  
  app.patch('/me', {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const userId = (request.user as { id: string }).id;
      const updates = request.body as { name?: string; avatarUrl?: string };
      return usersService.update(userId, updates);
    },
  });
  
  app.delete('/me', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = (request.user as { id: string }).id;
      await usersService.delete(userId);
      return reply.status(204).send();
    },
  });
}
