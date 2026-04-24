import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { appleAuthHandler, appleCallbackHandler } from './auth/apple.handler.js';
import { devAuthHandler, devAuthPostHandler, devLogoutHandler } from './auth/dev.handler.js';
import { googleAuthHandler, googleCallbackHandler } from './auth/google.handler.js';
import { mobileTokenHandler } from './auth/mobile.handler.js';
import { usersService } from './users.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
const ALLOWED_SCOUT_TYPES = [...ALLOWED_IMAGE, ...ALLOWED_VIDEO, ...ALLOWED_AUDIO];

const scoutedWaypointSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  photos: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  audioRecordings: z.array(z.string()).optional(),
});

export async function usersRoutes(app: FastifyInstance) {
  // OAuth web flows (for creator-station)
  app.get('/auth/google', googleAuthHandler);
  app.get('/auth/google/callback', googleCallbackHandler);
  
  app.get('/auth/apple', appleAuthHandler);
  app.post('/auth/apple/callback', appleCallbackHandler);
  
  // Mobile OAuth token exchange (for React Native)
  app.post('/auth/mobile/token', mobileTokenHandler);
  
  // Dev auth bypass (only available when DEV_AUTH_BYPASS=true in development)
  if (env.DEV_AUTH_BYPASS && env.NODE_ENV === 'development') {
    app.get('/auth/dev', devAuthHandler);
    app.post('/auth/dev', devAuthPostHandler);
    app.post('/auth/logout', devLogoutHandler);
  }
  
  // Protected routes
  app.get('/me', {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const userId = (request.user as { id: string }).id;
      return usersService.findById(userId);
    },
  });
  
  app.patch('/me', {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const userId = (request.user as { id: string }).id;
      const updates = request.body as { name?: string; avatarUrl?: string; bio?: string; genres?: string };
      return usersService.update(userId, updates);
    },
  });
  
  app.delete('/me', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = (request.user as { id: string }).id;
      await usersService.delete(userId);
      return reply.status(204).send();
    },
  });

  // Scouted Waypoints
  app.get('/scouted-waypoints', {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const userId = (request.user as { id: string }).id;
      return prisma.scoutedWaypoint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    },
  });

  app.post('/scouted-waypoints', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = (request.user as { id: string }).id;
      const parsed = scoutedWaypointSchema.safeParse(request.body);
      
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const { photos, videos, audioRecordings, ...rest } = parsed.data;
      
      const waypoint = await prisma.scoutedWaypoint.create({
        data: {
          ...rest,
          userId,
          photos: photos ? JSON.stringify(photos) : null,
          videos: videos ? JSON.stringify(videos) : null,
          audioRecordings: audioRecordings ? JSON.stringify(audioRecordings) : null,
        },
      });

      return reply.status(201).send(waypoint);
    },
  });

  app.delete('/scouted-waypoints/:id', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = (request.user as { id: string }).id;
      const { id } = request.params as { id: string };

      const waypoint = await prisma.scoutedWaypoint.findFirst({
        where: { id, userId },
      });

      if (!waypoint) {
        return reply.status(404).send({ error: 'Waypoint not found' });
      }

      await prisma.scoutedWaypoint.delete({ where: { id } });
      return { success: true };
    },
  });

  // Upload media to a scouted waypoint
  app.post('/scouted-waypoints/:id/upload', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = (request.user as { id: string }).id;
      const { id } = request.params as { id: string };

      const waypoint = await prisma.scoutedWaypoint.findFirst({ where: { id, userId } });
      if (!waypoint) {
        return reply.status(404).send({ error: 'Waypoint not found' });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      if (!ALLOWED_SCOUT_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type' });
      }

      const ext = path.extname(data.filename) || '.bin';
      const storedName = `scout-${id}-${Date.now()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, storedName);

      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      await pipeline(data.file, fs.createWriteStream(filePath));

      if (data.file.truncated) {
        fs.unlinkSync(filePath);
        return reply.status(413).send({ error: 'File too large' });
      }

      const mediaUrl = `/api/media/${storedName}`;

      // Determine which field to append to
      let field: 'photos' | 'videos' | 'audioRecordings';
      if (ALLOWED_IMAGE.includes(data.mimetype)) field = 'photos';
      else if (ALLOWED_VIDEO.includes(data.mimetype)) field = 'videos';
      else field = 'audioRecordings';

      const existing: string[] = waypoint[field] ? JSON.parse(waypoint[field] as string) : [];
      existing.push(mediaUrl);

      const updated = await prisma.scoutedWaypoint.update({
        where: { id },
        data: { [field]: JSON.stringify(existing) },
      });

      return { mediaUrl, field, waypoint: updated };
    },
  });
}
