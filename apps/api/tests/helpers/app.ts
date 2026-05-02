import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

export type TestApp = FastifyInstance;

/**
 * Build a Fastify instance for tests. Use `app.inject()` for request/response —
 * no real HTTP socket is opened, no port collision with the dev server.
 */
export async function buildTestApp(): Promise<TestApp> {
  const app = await buildApp();
  await app.ready();
  return app;
}
