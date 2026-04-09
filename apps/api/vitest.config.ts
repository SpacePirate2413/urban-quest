import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

config({ path: '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts'],
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
