import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  DATABASE_URL: z.string().default('file:./dev.db'),
  
  JWT_SECRET: z.string().min(32).default('dev-secret-key-minimum-32-characters-long'),
  
  // OAuth credentials (optional in development with DEV_AUTH_BYPASS)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  
  CORS_ORIGINS: z.string().transform((val) => val.split(',')).default('http://localhost:5173,http://localhost:8081'),
  
  API_BASE_URL: z.string().default('http://localhost:3001'),
  
  DEV_AUTH_BYPASS: z.enum(['true', 'false']).default('false').transform((val) => val === 'true'),
  DEV_AUTH_EMAIL: z.string().email().optional(),
}).refine(
  (data) => {
    if (data.DEV_AUTH_BYPASS && data.NODE_ENV !== 'development') {
      return false;
    }
    return true;
  },
  { message: 'DEV_AUTH_BYPASS can only be enabled in development mode' }
).refine(
  (data) => {
    if (data.DEV_AUTH_BYPASS && !data.DEV_AUTH_EMAIL) {
      return false;
    }
    return true;
  },
  { message: 'DEV_AUTH_EMAIL is required when DEV_AUTH_BYPASS is enabled' }
);

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
