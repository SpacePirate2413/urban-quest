import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestApp } from './helpers/app.js';
import { createTestUser } from './helpers/auth.js';
import { disconnectDb, resetDb } from './helpers/db.js';

describe('Quests CRUD', () => {
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

  it('creates a quest with the authenticated user as author', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/quests',
      headers: authHeaders,
      payload: { title: 'My First Quest', description: 'A test quest' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.title).toBe('My First Quest');
    expect(body.authorId).toBe(user.id);
    expect(body.status).toBe('draft');
  });

  it('rejects quest creation without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quests',
      payload: { title: 'Anon Quest' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects quest creation with empty title', async () => {
    const { authHeaders } = await createTestUser(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/quests',
      headers: authHeaders,
      payload: { title: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns only my quests from /api/quests/my', async () => {
    const me = await createTestUser(app, { email: 'me@test.dev' });
    const other = await createTestUser(app, { email: 'other@test.dev' });

    await app.inject({ method: 'POST', url: '/api/quests', headers: me.authHeaders, payload: { title: 'Mine' } });
    await app.inject({ method: 'POST', url: '/api/quests', headers: other.authHeaders, payload: { title: 'Theirs' } });

    const res = await app.inject({ method: 'GET', url: '/api/quests/my', headers: me.authHeaders });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.quests).toHaveLength(1);
    expect(body.quests[0].title).toBe('Mine');
  });

  it('updates a quest the user owns', async () => {
    const { authHeaders } = await createTestUser(app);
    const create = await app.inject({
      method: 'POST', url: '/api/quests', headers: authHeaders,
      payload: { title: 'Original' },
    });
    const id = JSON.parse(create.body).id;

    const update = await app.inject({
      method: 'PATCH', url: `/api/quests/${id}`, headers: authHeaders,
      payload: { title: 'Updated' },
    });
    expect(update.statusCode).toBe(200);
    expect(JSON.parse(update.body).title).toBe('Updated');
  });

  it('refuses to update a quest the user does not own', async () => {
    const owner = await createTestUser(app, { email: 'owner@test.dev' });
    const intruder = await createTestUser(app, { email: 'intruder@test.dev' });

    const create = await app.inject({
      method: 'POST', url: '/api/quests', headers: owner.authHeaders,
      payload: { title: 'Owner Quest' },
    });
    const id = JSON.parse(create.body).id;

    const res = await app.inject({
      method: 'PATCH', url: `/api/quests/${id}`, headers: intruder.authHeaders,
      payload: { title: 'Hacked' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('deletes a quest the user owns', async () => {
    const { authHeaders } = await createTestUser(app);
    const create = await app.inject({
      method: 'POST', url: '/api/quests', headers: authHeaders,
      payload: { title: 'To Delete' },
    });
    const id = JSON.parse(create.body).id;

    const del = await app.inject({ method: 'DELETE', url: `/api/quests/${id}`, headers: authHeaders });
    expect(del.statusCode).toBe(200);

    const after = await app.inject({ method: 'GET', url: '/api/quests/my', headers: authHeaders });
    expect(JSON.parse(after.body).quests).toHaveLength(0);
  });

  it('accepts ageRating E10+ (the value the creator-station UI offers)', async () => {
    const { authHeaders } = await createTestUser(app);
    const res = await app.inject({
      method: 'POST', url: '/api/quests', headers: authHeaders,
      payload: { title: 'Family Quest', ageRating: 'E10+' },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).ageRating).toBe('E10+');
  });

  it('accepts mediaType=both for mixed-format quests', async () => {
    const { authHeaders } = await createTestUser(app);
    const res = await app.inject({
      method: 'POST', url: '/api/quests', headers: authHeaders,
      payload: { title: 'Mixed Quest', mediaType: 'both' },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).mediaType).toBe('both');
  });

  it('rejects an unknown mediaType value', async () => {
    const { authHeaders } = await createTestUser(app);
    const res = await app.inject({
      method: 'POST', url: '/api/quests', headers: authHeaders,
      payload: { title: 'Bad', mediaType: 'hologram' },
    });
    expect(res.statusCode).toBe(400);
  });
});
