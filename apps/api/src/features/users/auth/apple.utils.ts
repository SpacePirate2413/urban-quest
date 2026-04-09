import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from 'jose';
import { env } from '../../../config/env.js';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

export async function createAppleClientSecret(): Promise<string> {
  const privateKey = await importPKCS8(env.APPLE_PRIVATE_KEY, 'ES256');

  const clientSecret = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setSubject(env.APPLE_CLIENT_ID)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);

  return clientSecret;
}

export interface AppleIdTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: string;
  is_private_email?: string;
  auth_time: number;
  nonce_supported: boolean;
}

export async function verifyAppleIdToken(idToken: string): Promise<AppleIdTokenPayload> {
  const JWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: env.APPLE_CLIENT_ID,
  });

  return payload as unknown as AppleIdTokenPayload;
}
