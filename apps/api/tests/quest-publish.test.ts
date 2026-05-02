import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { END_SCENE_ID } from '../src/features/quests/quests.service.js';
import { buildTestApp, type TestApp } from './helpers/app.js';
import { createTestUser } from './helpers/auth.js';
import { disconnectDb, resetDb } from './helpers/db.js';

/**
 * Helpers used by every test in this file. Build a quest with one waypoint
 * and one playable scene (script + question + choices + media), the minimum
 * shape that passes the publish + submit-for-review validators.
 */
async function makePublishableQuest(authorId: string) {
  const quest = await prisma.quest.create({
    data: { title: 'Publishable', authorId },
  });
  const waypoint = await prisma.waypoint.create({
    data: { questId: quest.id, name: 'WP', lat: 1, lng: 2, orderIndex: 1 },
  });
  await prisma.scene.create({
    data: {
      questId: quest.id,
      waypointId: waypoint.id,
      script: 'A line',
      question: 'Pick one',
      choices: JSON.stringify([{ text: 'Done', sceneId: END_SCENE_ID }]),
      mediaUrl: '/api/media/fake.mp3',
      mediaType: 'audio',
      orderIndex: 1,
    },
  });
  return quest;
}

describe('Quest publish + submit-for-review', () => {
  let app: TestApp;

  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); await disconnectDb(); });
  beforeEach(async () => { await resetDb(); });

  it('refuses to publish a quest with no waypoints', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await prisma.quest.create({ data: { title: 'Empty', authorId: user.id } });

    const res = await app.inject({
      method: 'POST', url: `/api/quests/${quest.id}/publish`, headers: authHeaders,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/waypoint/i);
  });

  it('refuses to publish a quest with no scenes', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await prisma.quest.create({ data: { title: 'Just WP', authorId: user.id } });
    await prisma.waypoint.create({
      data: { questId: quest.id, name: 'WP', lat: 1, lng: 2, orderIndex: 1 },
    });

    const res = await app.inject({
      method: 'POST', url: `/api/quests/${quest.id}/publish`, headers: authHeaders,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/scene/i);
  });

  it('publishes a quest that has a waypoint and a scene', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await makePublishableQuest(user.id);

    const res = await app.inject({
      method: 'POST', url: `/api/quests/${quest.id}/publish`, headers: authHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('published');
    expect(body.publishedAt).toBeTruthy();
    // Should auto-stamp start coordinates from the first waypoint
    expect(body.startLat).toBe(1);
    expect(body.startLng).toBe(2);
  });

  it('refuses submit-for-review when any scene is missing media', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await prisma.quest.create({ data: { title: 'No media', authorId: user.id } });
    await prisma.scene.create({
      data: { questId: quest.id, script: 'x', question: 'y', orderIndex: 1 },
    });

    const res = await app.inject({
      method: 'POST', url: `/api/quests/${quest.id}/submit`, headers: authHeaders, payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/media/i);
  });

  it('marks the quest pending when all scenes have media', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await makePublishableQuest(user.id);

    const res = await app.inject({
      method: 'POST', url: `/api/quests/${quest.id}/submit`, headers: authHeaders, payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.submissionStatus).toBe('pending');
  });
});

describe('Edit-published-quest re-review trigger', () => {
  let app: TestApp;

  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); await disconnectDb(); });
  beforeEach(async () => { await resetDb(); });

  it('flags submissionStatus=needs_re_review when a published quest title changes', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await makePublishableQuest(user.id);
    await prisma.quest.update({
      where: { id: quest.id }, data: { status: 'published', publishedAt: new Date() },
    });

    const res = await app.inject({
      method: 'PATCH', url: `/api/quests/${quest.id}`, headers: authHeaders,
      payload: { title: 'New title' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).submissionStatus).toBe('needs_re_review');
    expect(JSON.parse(res.body).status).toBe('published'); // stays live for players
  });

  it('does not flag re-review when the changed field is non-content (e.g. coordinates)', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await makePublishableQuest(user.id);
    await prisma.quest.update({
      where: { id: quest.id }, data: { status: 'published', publishedAt: new Date() },
    });

    const res = await app.inject({
      method: 'PATCH', url: `/api/quests/${quest.id}`, headers: authHeaders,
      payload: { startLat: 5, startLng: 6 },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).submissionStatus).toBeNull();
  });

  it('does not re-flag a quest already pending review', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const quest = await makePublishableQuest(user.id);
    await prisma.quest.update({
      where: { id: quest.id },
      data: { status: 'published', publishedAt: new Date(), submissionStatus: 'pending' },
    });

    const res = await app.inject({
      method: 'PATCH', url: `/api/quests/${quest.id}`, headers: authHeaders,
      payload: { title: 'Another change' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).submissionStatus).toBe('pending'); // unchanged
  });
});
