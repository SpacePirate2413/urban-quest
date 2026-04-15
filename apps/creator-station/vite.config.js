import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Custom plugin to serve quests from localStorage via API endpoint
function questsApiPlugin() {
  return {
    name: 'quests-api',
    configureServer(server) {
      server.middlewares.use('/api/local-quests', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }
        
        // Return instructions - actual data comes from client-side
        res.end(JSON.stringify({ 
          message: 'Use window.getLocalQuests() in browser console to get quests',
          endpoint: '/api/local-quests'
        }));
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), questsApiPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.{js,jsx}'],
    },
  },
})
