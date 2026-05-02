import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { END_SCENE_ID } from '../src/features/quests/quests.service.js';
import { prisma } from '../src/lib/prisma.js';
import { buildTestApp, type TestApp } from './helpers/app.js';
import { createTestUser } from './helpers/auth.js';
import { disconnectDb, resetDb } from './helpers/db.js';

async function makeSubmittedQuest(authorId: string) {
  const quest = await prisma.quest.create({
    data: { title: 'Submitted', authorId, submissionStatus: 'pending' },
  });
  const waypoint = await prisma.waypoint.create({
    data: { questId: quest.id, name: 'WP', lat: 1, lng: 2, orderIndex: 1 },
  });
  const scene = await prisma.scene.create({
    data: {
      questId: quest.id, waypointId: waypoint.id,
      script: 'A', question: 'Q', orderIndex: 1,
      choices: JSON.stringify([{ text: 'End', sceneId: END_SCENE_ID }]),
      mediaUrl: '/api/media/fake.mp3', mediaType: 'audio', mediaStatus: 'pending',
    },
  });
  return { quest, scene };
}

describe('Admin: submissions feed', () => {
  let app: TestApp;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); await disconnectDb(); });
  beforeEach(async () => { await resetDb(); });

  it('lists quests with a submissionStatus', async () => {
    const { user } = await createTestUser(app);
    await makeSubmittedQuest(user.id);

    const res = await app.inject({ method: 'GET', url: '/api/admin/submissions' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.questSubmissions).toHaveLength(1);
    expect(body.questSubmissions[0].submissionStatus).toBe('pending');
    expect(body.total).toBe(1);
  });

  it('omits quests with no submissionStatus (pure drafts)', async () => {
    const { user } = await createTestUser(app);
    // Draft quest with no submissionStatus → should NOT appear
    await prisma.quest.create({ data: { title: 'Pure draft', authorId: user.id } });

    const res = await app.inject({ method: 'GET', url: '/api/admin/submissions' });
    expect(JSON.parse(res.body).questSubmissions).toHaveLength(0);
  });

  it('filters by submissionStatus query param', async () => {
    const { user } = await createTestUser(app);
    const { quest: pending } = await makeSubmittedQuest(user.id);
    await prisma.quest.update({ where: { id: pending.id }, data: { submissionStatus: 'approved' } });
    await makeSubmittedQuest(user.id); // a second one, still pending

    const res = await app.inject({ method: 'GET', url: '/api/admin/submissions?status=pending' });
    const body = JSON.parse(res.body);
    expect(body.questSubmissions).toHaveLength(1);
    expect(body.questSubmissions[0].submissionStatus).toBe('pending');
  });
});

describe('Admin: quest-level review', () => {
  let app: TestApp;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); await disconnectDb(); });
  beforeEach(async () => { await resetDb(); });

  it('approves the quest and cascades approved status + notes to every scene', async () => {
    const { user } = await createTestUser(app);
    const { quest, scene } = await makeSubmittedQuest(user.id);

    const res = await app.inject({
      method: 'PATCH', url: `/api/admin/submissions/quest/${quest.id}`,
      payload: { status: 'approved', notes: 'Looks great' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).submissionStatus).toBe('approved');

    const updatedScene = await prisma.scene.findUnique({ where: { id: scene.id } });
    expect(updatedScene?.mediaStatus).toBe('approved');
    expect(updatedScene?.reviewNotes).toBe('Looks great');
  });

  it('rejects the quest and stamps the rejection note on every scene', async () => {
    const { user } = await createTestUser(app);
    const { quest, scene } = await makeSubmittedQuest(user.id);

    const res = await app.inject({
      method: 'PATCH', url: `/api/admin/submissions/quest/${quest.id}`,
      payload: { status: 'rejected', notes: 'Audio quality issue' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).submissionStatus).toBe('rejected');

    const updatedScene = await prisma.scene.findUnique({ where: { id: scene.id } });
    expect(updatedScene?.mediaStatus).toBe('rejected');
    expect(updatedScene?.reviewNotes).toBe('Audio quality issue');
  });

  it('returns 404 when reviewing a non-existent quest', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/api/admin/submissions/quest/no-such-quest',
      payload: { status: 'approved' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects a payload with an invalid status enum', async () => {
    const { user } = await createTestUser(app);
    const { quest } = await makeSubmittedQuest(user.id);

    const res = await app.inject({
      method: 'PATCH', url: `/api/admin/submissions/quest/${quest.id}`,
      payload: { status: 'maybe' },
    });
    expect(res.statusCode).toBe(400);
  });
});
