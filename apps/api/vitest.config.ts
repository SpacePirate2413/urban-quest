import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

config({ path: '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['tests/helpers/**', 'tests/global-setup.ts', 'tests/setup.ts', 'node_modules', 'dist'],
    setupFiles: ['./tests/setup.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    // SQLite is single-writer; running tests in parallel just causes lock
    // contention without speed gains. Single-fork keeps tests deterministic
    // and lets resetDb() in beforeEach behave predictably.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', 'tests/helpers/**'],
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
