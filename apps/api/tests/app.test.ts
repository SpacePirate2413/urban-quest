import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { App } from '../src/app.js';

describe('API Application', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('App Bootstrap', () => {
    it('should have CORS configured', () => {
      expect(app.hasPlugin('@fastify/cors')).toBe(true);
    });

    it('should have JWT configured', () => {
      expect(app.hasPlugin('@fastify/jwt')).toBe(true);
    });

    it('should have cookie support', () => {
      expect(app.hasPlugin('@fastify/cookie')).toBe(true);
    });
  });

  describe('Users Routes', () => {
    it('should have users routes registered', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me',
      });
      // Should return 401 without auth, not 404
      expect(response.statusCode).not.toBe(404);
    });
  });
});
