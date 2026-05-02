import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Push the latest Prisma schema to the test SQLite database before any test
// file runs. The vitest config loads `.env.test` (DATABASE_URL=file:./test.db)
// so this targets test.db, never dev.db. Idempotent — safe to re-run.
export default async function globalSetup() {
  const cwd = process.cwd();
  // test.db lives next to schema.prisma. Wipe it first so each suite starts
  // from a clean slate. (Per-test resets in db.ts handle row-level cleanup;
  // this nukes any leftover schema-drift from previous runs.)
  const testDbPath = path.join(cwd, 'test.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  execSync('pnpm prisma db push --skip-generate --accept-data-loss', {
    cwd,
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
}
