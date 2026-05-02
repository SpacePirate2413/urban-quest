import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { buildTestApp, type TestApp } from './helpers/app.js';
import { createTestUser } from './helpers/auth.js';
import { disconnectDb, resetDb } from './helpers/db.js';

describe('Waypoint CRUD', () => {
  let app: TestApp;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); await disconnectDb(); });
  beforeEach(async () => { await resetDb(); });

  async function makeQuest(authorId: string) {
    return prisma.quest.create({ data: { title: 'Q', authorId } });
  }

  it('creates a waypoint under a quest the user owns', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await makeQuest(user.id);

    const res = await app.inject({
      method: 'POST', url: `/api/quests/${quest.id}/waypoints`, headers: authHeaders,
      payload: { name: 'Coffee shop', lat: 40.7, lng: -74.0 },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).name).toBe('Coffee shop');
  });

  it('rejects creating a waypoint under another user\'s quest', async () => {
    const owner = await createTestUser(app, { email: 'owner@test.dev' });
    const intruder = await createTestUser(app, { email: 'intruder@test.dev' });
    const quest = await makeQuest(owner.user.id);

    const res = await app.inject({
      method: 'POST', url: `/api/quests/${quest.id}/waypoints`, headers: intruder.authHeaders,
      payload: { name: 'Stolen', lat: 0, lng: 0 },
    });
    expect(res.statusCode).toBe(404);
  });

  // Regression test for the autosave data-loss bug. Before the fix,
  // useWriterStore.updateWaypoint only mutated local state and never PATCHed
  // the server, so renamed waypoints reverted to "New Waypoint" on reload.
  // The store now mirrors updateScene's debounced PATCH pattern; this test
  // proves the underlying API still persists what the store sends.
  it('PATCHes a waypoint name and the new name persists across reads', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await makeQuest(user.id);
    const wp = await prisma.waypoint.create({
      data: { questId: quest.id, name: 'New Waypoint', lat: 1, lng: 2, orderIndex: 1 },
    });

    const update = await app.inject({
      method: 'PATCH', url: `/api/quests/waypoints/${wp.id}`, headers: authHeaders,
      payload: { name: 'Pier 17', lat: 1, lng: 2 },
    });
    expect(update.statusCode).toBe(200);

    const fresh = await prisma.waypoint.findUnique({ where: { id: wp.id } });
    expect(fresh?.name).toBe('Pier 17');
  });

  it('rejects PATCH from a non-owner with 404', async () => {
    const owner = await createTestUser(app, { email: 'owner@test.dev' });
    const intruder = await createTestUser(app, { email: 'intruder@test.dev' });
    const quest = await makeQuest(owner.user.id);
    const wp = await prisma.waypoint.create({
      data: { questId: quest.id, name: 'WP', lat: 1, lng: 2, orderIndex: 1 },
    });

    const res = await app.inject({
      method: 'PATCH', url: `/api/quests/waypoints/${wp.id}`, headers: intruder.authHeaders,
      payload: { name: 'Hacked', lat: 1, lng: 2 },
    });
    expect(res.statusCode).toBe(404);
  });

  it('deletes a waypoint the user owns', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await makeQuest(user.id);
    const wp = await prisma.waypoint.create({
      data: { questId: quest.id, name: 'WP', lat: 1, lng: 2, orderIndex: 1 },
    });

    const res = await app.inject({
      method: 'DELETE', url: `/api/quests/waypoints/${wp.id}`, headers: authHeaders,
    });
    expect(res.statusCode).toBe(200);
    expect(await prisma.waypoint.findUnique({ where: { id: wp.id } })).toBeNull();
  });
});
