import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { buildTestApp, type TestApp } from './helpers/app.js';
import { createTestUser } from './helpers/auth.js';
import { disconnectDb, resetDb } from './helpers/db.js';

describe('Scouted Waypoints — edit flow', () => {
  let app: TestApp;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); await disconnectDb(); });
  beforeEach(async () => { await resetDb(); });

  async function makeScoutedFor(userId: string) {
    return prisma.scoutedWaypoint.create({
      data: { userId, name: 'Untitled spot', notes: 'old notes', lat: 40.7, lng: -74.0 },
    });
  }

  it('PATCHes name + notes and persists across reads', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const wp = await makeScoutedFor(user.id);

    const res = await app.inject({
      method: 'PATCH', url: `/api/users/scouted-waypoints/${wp.id}`,
      headers: authHeaders,
      payload: { name: 'Empire State Building', notes: 'great photo spot' },
    });
    expect(res.statusCode).toBe(200);

    const fresh = await prisma.scoutedWaypoint.findUnique({ where: { id: wp.id } });
    expect(fresh?.name).toBe('Empire State Building');
    expect(fresh?.notes).toBe('great photo spot');
    // lat/lng untouched when not in payload — partial update.
    expect(fresh?.lat).toBe(40.7);
    expect(fresh?.lng).toBe(-74.0);
  });

  it('PATCHes lat/lng (move-pin flow)', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const wp = await makeScoutedFor(user.id);

    const res = await app.inject({
      method: 'PATCH', url: `/api/users/scouted-waypoints/${wp.id}`,
      headers: authHeaders,
      payload: { lat: 51.5074, lng: -0.1278 },
    });
    expect(res.statusCode).toBe(200);

    const fresh = await prisma.scoutedWaypoint.findUnique({ where: { id: wp.id } });
    expect(fresh?.lat).toBeCloseTo(51.5074);
    expect(fresh?.lng).toBeCloseTo(-0.1278);
  });

  it('rejects PATCH from a different user with 404', async () => {
    const owner = await createTestUser(app, { email: 'owner@test.dev' });
    const intruder = await createTestUser(app, { email: 'intruder@test.dev' });
    const wp = await makeScoutedFor(owner.user.id);

    const res = await app.inject({
      method: 'PATCH', url: `/api/users/scouted-waypoints/${wp.id}`,
      headers: intruder.authHeaders,
      payload: { name: 'hacked' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects an empty name (validation)', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const wp = await makeScoutedFor(user.id);

    const res = await app.inject({
      method: 'PATCH', url: `/api/users/scouted-waypoints/${wp.id}`,
      headers: authHeaders,
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects unauthenticated PATCH with 401', async () => {
    const { user } = await createTestUser(app);
    const wp = await makeScoutedFor(user.id);

    const res = await app.inject({
      method: 'PATCH', url: `/api/users/scouted-waypoints/${wp.id}`,
      payload: { name: 'should fail' },
    });
    expect(res.statusCode).toBe(401);
  });
});
