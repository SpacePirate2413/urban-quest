import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  DATABASE_URL: z.string().default('file:./dev.db'),
  
  JWT_SECRET: z.string().min(32),
  
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  
  APPLE_CLIENT_ID: z.string(),
  APPLE_TEAM_ID: z.string(),
  APPLE_KEY_ID: z.string(),
  APPLE_PRIVATE_KEY: z.string(),
  
  CORS_ORIGINS: z.string().transform((val) => val.split(',')).default('http://localhost:5173,http://localhost:8081'),
  
  API_BASE_URL: z.string().default('http://localhost:3001'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
