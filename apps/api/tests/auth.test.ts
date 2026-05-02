import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestApp } from './helpers/app.js';
import { createTestUser } from './helpers/auth.js';
import { disconnectDb, resetDb } from './helpers/db.js';

describe('Auth: protected routes', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDb();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('rejects /api/users/me with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns the user for /api/users/me with a valid token', async () => {
    const { user, authHeaders } = await createTestUser(app, { email: 'me@test.dev' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(user.id);
    expect(body.email).toBe('me@test.dev');
  });

  it('rejects /api/users/me with a malformed token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { authorization: 'Bearer not-a-real-jwt' },
    });
    expect(res.statusCode).toBe(401);
  });
});
