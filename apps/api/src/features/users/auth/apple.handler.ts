import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../../config/env.js';
import { usersService } from '../users.service.js';
import { createAppleClientSecret, verifyAppleIdToken } from './apple.utils.js';

const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';

export async function appleAuthHandler(request: FastifyRequest, reply: FastifyReply) {
  const redirectUri = `${env.API_BASE_URL}/api/users/auth/apple/callback`;

  const params = new URLSearchParams({
    client_id: env.APPLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
  });

  return reply.redirect(`${APPLE_AUTH_URL}?${params.toString()}`);
}

export async function appleCallbackHandler(
  request: FastifyRequest<{
    Body: {
      code?: string;
      id_token?: string;
      user?: string;
      error?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { code, id_token, user: userJson, error } = request.body;

  if (error || !code) {
    return reply.status(400).send({ error: error || 'No authorization code provided' });
  }

  try {
    const clientSecret = await createAppleClientSecret();

    const tokenResponse = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${env.API_BASE_URL}/api/users/auth/apple/callback`,
      }),
    });

    const tokens = await tokenResponse.json() as { id_token: string; error?: string };

    if (tokens.error) {
      return reply.status(400).send({ error: tokens.error });
    }

    const appleUser = await verifyAppleIdToken(tokens.id_token || id_token!);

    let name: string | undefined;
    let email = appleUser.email;

    if (userJson) {
      try {
        const userData = JSON.parse(userJson) as { name?: { firstName?: string; lastName?: string }; email?: string };
        if (userData.name) {
          name = [userData.name.firstName, userData.name.lastName].filter(Boolean).join(' ');
        }
        if (userData.email) {
          email = userData.email;
        }
      } catch {
        // User data parsing failed, continue with token data
      }
    }

    const user = await usersService.findOrCreate({
      email: email!,
      name,
      provider: 'APPLE',
      providerId: appleUser.sub,
    });

    const token = await reply.jwtSign({ id: user.id, email: user.email });

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.redirect(`${env.CORS_ORIGINS[0]}/auth/callback?success=true`);
  } catch (err) {
    request.log.error(err, 'Apple OAuth error');
    return reply.status(500).send({ error: 'Authentication failed' });
  }
}
