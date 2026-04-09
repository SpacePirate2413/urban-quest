import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../../config/env.js';
import { usersService } from '../users.service.js';

export async function devAuthHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!env.DEV_AUTH_BYPASS || env.NODE_ENV !== 'development') {
    return reply.status(404).send({ error: 'Not found' });
  }

  const email = env.DEV_AUTH_EMAIL!;

  const user = await usersService.findOrCreate({
    email,
    name: `Dev User (${email})`,
    provider: 'DEV',
    providerId: `dev-${email}`,
  });

  const token = await reply.jwtSign({ id: user.id, email: user.email });

  reply.setCookie('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    message: 'Dev auth successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function devLogoutHandler(request: FastifyRequest, reply: FastifyReply) {
  reply.clearCookie('token', { path: '/' });
  return { message: 'Logged out' };
}
