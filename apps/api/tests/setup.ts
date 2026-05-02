import { config } from 'dotenv';
import path from 'node:path';

// Load .env.test in every test worker fork. Vitest does not propagate the
// parent process's loaded env to forks, so without this each worker would
// fall back to .env (dev) and DATABASE_URL would point at dev.db.
config({ path: path.join(process.cwd(), '.env.test') });

// src/config/env.ts has a top-level `import 'dotenv/config'` which loads .env
// on import. dotenv only sets keys that aren't already in process.env, so we
// stamp the test-mode values *after* loading .env.test to guarantee they win
// over whatever .env later tries to inject. Without this, DEV_AUTH_BYPASS=true
// from .env collides with NODE_ENV=test and the env schema refuses to start.
process.env.DEV_AUTH_BYPASS = 'false';
process.env.NODE_ENV = 'test';
