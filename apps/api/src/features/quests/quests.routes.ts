import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import * as questService from './quests.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');

const ALLOWED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_TYPES = [...ALLOWED_AUDIO, ...ALLOWED_VIDEO];

// Apple/Google IAP prices must come from a fixed tier list. Creators can pick
// any of these, but cannot set arbitrary amounts. (See Q8b in docs/Questions-Left.md.)
const ALLOWED_PRICE_TIERS = [0, 0.99, 1.99, 2.99, 4.99, 9.99] as const;
const priceTierSchema = z
  .number()
  .refine((p) => ALLOWED_PRICE_TIERS.some((t) => Math.abs(t - p) < 0.001), {
    message: `Price must be one of: ${ALLOWED_PRICE_TIERS.join(', ')}`,
  });

const createQuestSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  tagline: z.string().max(200).optional(),
  genre: z.string().optional(),
  ageRating: z.enum(['E', 'E10+', 'T', 'M']).optional(),
  price: priceTierSchema.optional(),
  coverImage: z.string().refine(
    (val) => /^https?:\/\//.test(val) || /^data:image\//.test(val),
    { message: 'Must be an http(s) URL or a data:image/* URI' },
  ).optional(),
  usesAI: z.boolean().optional(),
  narratorVoiceId: z.string().optional(),
  // 'both' = mixed-format quest where individual scenes can be audio or video.
  // 'audio' / 'video' = every scene must be that single format. Players can
  // filter by exact match in the mobile explore feed.
  mediaType: z.enum(['audio', 'video', 'both']).optional(),
  estimatedDuration: z.number().int().positive().optional(),
  startLat: z.number().optional(),
  startLng: z.number().optional(),
  city: z.string().optional(),
});

const updateQuestSchema = createQuestSchema.partial().extend({
  status: z.enum(['draft', 'review', 'published', 'archived']).optional(),
});

const waypointSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().optional(),
  photoUrl: z.string().url().optional(),
  lat: z.number(),
  lng: z.number(),
});

const sceneSchema = z.object({
  script: z.string().min(1),
  question: z.string().optional(),
  choices: z.string().optional(), // JSON string
  waypointId: z.string().optional(),
  narratorVoiceId: z.string().optional(),
});

export async function questRoutes(app: FastifyInstance) {
  // Get all published quests (public). If the request carries a valid JWT we use the
  // viewer ID to filter out quests authored by users they've blocked. Anonymous requests
  // get the unfiltered public list (minus banned/deleted authors, which are filtered
  // unconditionally inside the service).
  app.get('/public', async (request) => {
    const { genre, city, minPrice, maxPrice, limit, offset } = request.query as any;

    let viewerId: string | undefined;
    try {
      await request.jwtVerify();
      viewerId = (request.user as { id: string } | undefined)?.id;
    } catch {
      // No token / invalid token — treat as anonymous viewer. Don't fail the request.
    }

    return questService.getPublishedQuests(
      {
        genre,
        city,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        viewerId,
      },
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  });

  // Get single quest (public for published, auth for drafts)
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const quest = await questService.getQuestById(id);
    
    if (!quest) {
      return reply.status(404).send({ error: 'Quest not found' });
    }

    // If not published, require auth and ownership
    if (quest.status !== 'published') {
      try {
        await request.jwtVerify();
        if ((request.user as any).id !== quest.authorId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }
      } catch {
        return reply.status(403).send({ error: 'Not authorized' });
      }
    }

    return quest;
  });

  // Protected routes below
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    });

    // Get my quests
    protectedRoutes.get('/my', async (request) => {
      const userId = (request.user as any).id;
      return questService.getQuests({ authorId: userId });
    });

    // Create quest
    protectedRoutes.post('/', async (request, reply) => {
      const userId = (request.user as any).id;
      const parsed = createQuestSchema.safeParse(request.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const quest = await questService.createQuest(userId, parsed.data);
      return reply.status(201).send(quest);
    });

    // Update quest
    protectedRoutes.patch('/:id', async (request, reply) => {
      const userId = (request.user as any).id;
      const { id } = request.params as { id: string };
      const parsed = updateQuestSchema.safeParse(request.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const quest = await questService.updateQuest(id, userId, parsed.data);
      if (!quest) {
        return reply.status(404).send({ error: 'Quest not found or not authorized' });
      }

      return quest;
    });

    // Publish quest
    protectedRoutes.post('/:id/publish', async (request, reply) => {
      const userId = (request.user as any).id;
      const { id } = request.params as { id: string };

      const result = await questService.publishQuest(id, userId);
      if ('error' in result) {
        return reply.status(400).send(result);
      }

      return result;
    });

    // Submit quest for review (batch — all scenes)
    protectedRoutes.post('/:questId/submit', async (request, reply) => {
      const userId = (request.user as any).id;
      const { questId } = request.params as { questId: string };

      const result = await questService.submitQuestForReview(questId, userId);
      if ('error' in result) {
        return reply.status(400).send(result);
      }

      return result;
    });

    // Delete quest
    protectedRoutes.delete('/:id', async (request, reply) => {
      const userId = (request.user as any).id;
      const { id } = request.params as { id: string };

      const deleted = await questService.deleteQuest(id, userId);
      if (!deleted) {
        return reply.status(404).send({ error: 'Quest not found or not authorized' });
      }

      return { success: true };
    });

    // Waypoint routes
    protectedRoutes.post('/:questId/waypoints', async (request, reply) => {
      const userId = (request.user as any).id;
      const { questId } = request.params as { questId: string };
      const parsed = waypointSchema.safeParse(request.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const waypoint = await questService.addWaypoint(questId, userId, parsed.data);
      if (!waypoint) {
        return reply.status(404).send({ error: 'Quest not found or not authorized' });
      }

      return reply.status(201).send(waypoint);
    });

    protectedRoutes.patch('/waypoints/:waypointId', async (request, reply) => {
      const userId = (request.user as any).id;
      const { waypointId } = request.params as { waypointId: string };
      const parsed = waypointSchema.partial().safeParse(request.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const waypoint = await questService.updateWaypoint(waypointId, userId, parsed.data);
      if (!waypoint) {
        return reply.status(404).send({ error: 'Waypoint not found or not authorized' });
      }

      return waypoint;
    });

    protectedRoutes.delete('/waypoints/:waypointId', async (request, reply) => {
      const userId = (request.user as any).id;
      const { waypointId } = request.params as { waypointId: string };

      const deleted = await questService.deleteWaypoint(waypointId, userId);
      if (!deleted) {
        return reply.status(404).send({ error: 'Waypoint not found or not authorized' });
      }

      return { success: true };
    });

    // Scene routes
    protectedRoutes.post('/:questId/scenes', async (request, reply) => {
      const userId = (request.user as any).id;
      const { questId } = request.params as { questId: string };
      const parsed = sceneSchema.safeParse(request.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const scene = await questService.addScene(questId, userId, parsed.data);
      if (!scene) {
        return reply.status(404).send({ error: 'Quest not found or not authorized' });
      }

      return reply.status(201).send(scene);
    });

    protectedRoutes.patch('/scenes/:sceneId', async (request, reply) => {
      const userId = (request.user as any).id;
      const { sceneId } = request.params as { sceneId: string };
      const parsed = sceneSchema.partial().safeParse(request.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const scene = await questService.updateScene(sceneId, userId, parsed.data);
      if (!scene) {
        return reply.status(404).send({ error: 'Scene not found or not authorized' });
      }

      return scene;
    });

    protectedRoutes.delete('/scenes/:sceneId', async (request, reply) => {
      const userId = (request.user as any).id;
      const { sceneId } = request.params as { sceneId: string };

      const deleted = await questService.deleteScene(sceneId, userId);
      if (!deleted) {
        return reply.status(404).send({ error: 'Scene not found or not authorized' });
      }

      return { success: true };
    });

    // Upload media for a scene.
    //
    // Failure modes worth knowing about (all surfaced as Safari "Load failed"
    // before this rewrite, because errors here aborted the response without a
    // status code):
    //   - request.file() rejects when the multipart parser sees malformed body
    //   - pipeline() rejects on disk errors or premature stream close
    //   - data.file.truncated indicates the 500MB cap tripped
    // We log + clean up the partial file in every error path so the client
    // gets a real status code and we have something to grep in logs.
    protectedRoutes.post('/scenes/:sceneId/upload', async (request, reply) => {
      const userId = (request.user as any).id;
      const { sceneId } = request.params as { sceneId: string };
      const log = request.log.child({ route: 'scene-upload', sceneId, userId });

      let data;
      try {
        data = await request.file();
      } catch (err) {
        log.error({ err }, 'multipart parse failed');
        return reply.status(400).send({ error: 'Could not parse upload' });
      }
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      if (!ALLOWED_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'Invalid file type. Allowed: MP3, WAV, M4A, MP4, MOV, WebM',
        });
      }

      const mediaType = ALLOWED_AUDIO.includes(data.mimetype) ? 'audio' : 'video';
      const ext = path.extname(data.filename) || (mediaType === 'audio' ? '.mp3' : '.mp4');
      const storedName = `${sceneId}-${Date.now()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, storedName);

      try {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      } catch (err) {
        log.error({ err, UPLOADS_DIR }, 'failed to create uploads dir');
        return reply.status(500).send({ error: 'Server storage unavailable' });
      }

      log.info(
        { mimetype: data.mimetype, filename: data.filename, storedName },
        'upload started',
      );

      try {
        await pipeline(data.file, fs.createWriteStream(filePath));
      } catch (err) {
        log.error({ err, storedName }, 'pipeline failed during upload');
        await fs.promises.unlink(filePath).catch(() => {});
        return reply.status(500).send({ error: 'Upload failed while writing file' });
      }

      if (data.file.truncated) {
        await fs.promises.unlink(filePath).catch(() => {});
        return reply.status(413).send({ error: 'File too large. Maximum 500MB.' });
      }

      const mediaUrl = `/api/media/${storedName}`;

      let scene;
      try {
        scene = await questService.updateScene(sceneId, userId, {
          mediaUrl,
          mediaType,
        });
      } catch (err) {
        log.error({ err, storedName }, 'updateScene failed after upload');
        await fs.promises.unlink(filePath).catch(() => {});
        return reply.status(500).send({ error: 'Could not attach media to scene' });
      }

      if (!scene) {
        await fs.promises.unlink(filePath).catch(() => {});
        return reply.status(404).send({ error: 'Scene not found or not authorized' });
      }

      log.info({ storedName, mediaUrl }, 'upload complete');
      return {
        mediaUrl,
        mediaType,
        fileName: data.filename,
        storedName,
      };
    });
  });
}

export default questRoutes;
