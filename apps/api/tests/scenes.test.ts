import FormData from 'form-data';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { buildTestApp, type TestApp } from './helpers/app.js';
import { createTestUser } from './helpers/auth.js';
import { disconnectDb, resetDb } from './helpers/db.js';

async function makeQuestAndWaypoint(authorId: string) {
  const quest = await prisma.quest.create({ data: { title: 'Q', authorId } });
  const waypoint = await prisma.waypoint.create({
    data: { questId: quest.id, name: 'WP', lat: 1, lng: 2, orderIndex: 1 },
  });
  return { quest, waypoint };
}

describe('Scene CRUD', () => {
  let app: TestApp;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); await disconnectDb(); });
  beforeEach(async () => { await resetDb(); });

  it('creates a scene under a quest the user owns', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const { quest, waypoint } = await makeQuestAndWaypoint(user.id);

    const res = await app.inject({
      method: 'POST', url: `/api/quests/${quest.id}/scenes`, headers: authHeaders,
      payload: { script: 'Once upon a time...', waypointId: waypoint.id },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).script).toBe('Once upon a time...');
  });

  it('refuses to create a scene under a quest the user does not own', async () => {
    const owner = await createTestUser(app, { email: 'owner@test.dev' });
    const intruder = await createTestUser(app, { email: 'intruder@test.dev' });
    const { quest } = await makeQuestAndWaypoint(owner.user.id);

    const res = await app.inject({
      method: 'POST', url: `/api/quests/${quest.id}/scenes`, headers: intruder.authHeaders,
      payload: { script: 'Stolen scene' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('updates and deletes a scene', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const { quest } = await makeQuestAndWaypoint(user.id);
    const scene = await prisma.scene.create({
      data: { questId: quest.id, script: 'orig', orderIndex: 1 },
    });

    const upd = await app.inject({
      method: 'PATCH', url: `/api/quests/scenes/${scene.id}`, headers: authHeaders,
      payload: { script: 'edited' },
    });
    expect(upd.statusCode).toBe(200);
    expect(JSON.parse(upd.body).script).toBe('edited');

    const del = await app.inject({
      method: 'DELETE', url: `/api/quests/scenes/${scene.id}`, headers: authHeaders,
    });
    expect(del.statusCode).toBe(200);
  });
});

describe('Scene media upload', () => {
  let app: TestApp;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); await disconnectDb(); });
  beforeEach(async () => { await resetDb(); });

  /**
   * Helper: build a multipart request body using `form-data` so we can drive
   * the upload route via app.inject() without spinning up a real HTTP socket.
   */
  function buildUploadPayload(filename: string, mime: string, body: Buffer | string) {
    const form = new FormData();
    form.append('file', body, { filename, contentType: mime });
    return { payload: form.getBuffer(), headers: form.getHeaders() };
  }

  it('rejects upload to an unknown sceneId with 404 (not "Load failed")', async () => {
    const { authHeaders } = await createTestUser(app);
    const { payload, headers } = buildUploadPayload('clip.mp3', 'audio/mpeg', Buffer.from('fake-audio'));

    const res = await app.inject({
      method: 'POST', url: '/api/quests/scenes/no-such-scene/upload',
      headers: { ...authHeaders, ...headers }, payload,
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toMatch(/scene/i);
  });

  it('rejects upload of a disallowed mime type', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const { quest } = await makeQuestAndWaypoint(user.id);
    const scene = await prisma.scene.create({
      data: { questId: quest.id, script: 'x', orderIndex: 1 },
    });

    const { payload, headers } = buildUploadPayload('exec.exe', 'application/octet-stream', Buffer.from('bad'));
    const res = await app.inject({
      method: 'POST', url: `/api/quests/scenes/${scene.id}/upload`,
      headers: { ...authHeaders, ...headers }, payload,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/file type/i);
  });

  it('accepts an audio upload and attaches mediaUrl to the scene', async () => {
    const { user, authHeaders } = await createTestUser(app);
    const { quest } = await makeQuestAndWaypoint(user.id);
    const scene = await prisma.scene.create({
      data: { questId: quest.id, script: 'x', orderIndex: 1 },
    });

    const { payload, headers } = buildUploadPayload('clip.mp3', 'audio/mpeg', Buffer.from('id3-fake-mp3-bytes'));
    const res = await app.inject({
      method: 'POST', url: `/api/quests/scenes/${scene.id}/upload`,
      headers: { ...authHeaders, ...headers }, payload,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.mediaType).toBe('audio');
    expect(body.mediaUrl).toMatch(/^\/api\/media\//);
    expect(body.fileName).toBe('clip.mp3');

    // Persisted on the scene row
    const updated = await prisma.scene.findUnique({ where: { id: scene.id } });
    expect(updated?.mediaUrl).toBe(body.mediaUrl);
    expect(updated?.mediaType).toBe('audio');
  });
});
