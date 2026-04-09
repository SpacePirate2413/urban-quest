import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../../config/env.js';
import { usersService } from '../users.service.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export async function googleAuthHandler(request: FastifyRequest, reply: FastifyReply) {
  const redirectUri = `${env.API_BASE_URL}/api/users/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return reply.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}

export async function googleCallbackHandler(
  request: FastifyRequest<{ Querystring: { code?: string; error?: string } }>,
  reply: FastifyReply
) {
  const { code, error } = request.query;

  if (error || !code) {
    return reply.status(400).send({ error: error || 'No authorization code provided' });
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${env.API_BASE_URL}/api/users/auth/google/callback`,
      }),
    });

    const tokens = await tokenResponse.json() as { access_token: string; error?: string };

    if (tokens.error) {
      return reply.status(400).send({ error: tokens.error });
    }

    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const googleUser = await userInfoResponse.json() as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };

    const user = await usersService.findOrCreate({
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
      provider: 'GOOGLE',
      providerId: googleUser.id,
    });

    const token = await reply.jwtSign({ id: user.id, email: user.email });

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return reply.redirect(`${env.CORS_ORIGINS[0]}/auth/callback?success=true`);
  } catch (err) {
    request.log.error(err, 'Google OAuth error');
    return reply.status(500).send({ error: 'Authentication failed' });
  }
}
