import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { usersService } from '../users.service.js';
import { verifyAppleIdToken } from './apple.utils.js';

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

const mobileTokenSchema = z.object({
  provider: z.enum(['google', 'apple']),
  idToken: z.string(),
});

export async function mobileTokenHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = mobileTokenSchema.safeParse(request.body);

  if (!parseResult.success) {
    return reply.status(400).send({ error: 'Invalid request body', details: parseResult.error.flatten() });
  }

  const { provider, idToken } = parseResult.data;

  try {
    let email: string;
    let providerId: string;
    let name: string | undefined;
    let avatarUrl: string | undefined;

    if (provider === 'google') {
      const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${idToken}`);
      const data = await response.json() as {
        sub: string;
        email: string;
        name?: string;
        picture?: string;
        aud: string;
        error?: string;
      };

      if (data.error) {
        return reply.status(401).send({ error: 'Invalid Google token' });
      }

      if (data.aud !== env.GOOGLE_CLIENT_ID) {
        return reply.status(401).send({ error: 'Token not issued for this app' });
      }

      email = data.email;
      providerId = data.sub;
      name = data.name;
      avatarUrl = data.picture;
    } else {
      const applePayload = await verifyAppleIdToken(idToken);

      if (!applePayload.email) {
        return reply.status(400).send({ error: 'Email not provided by Apple' });
      }

      email = applePayload.email;
      providerId = applePayload.sub;
    }

    const user = await usersService.findOrCreate({
      email,
      name,
      avatarUrl,
      provider: provider.toUpperCase() as 'GOOGLE' | 'APPLE',
      providerId,
    });

    const token = await reply.jwtSign({ id: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  } catch (err) {
    request.log.error(err, 'Mobile token exchange error');
    return reply.status(500).send({ error: 'Authentication failed' });
  }
}
