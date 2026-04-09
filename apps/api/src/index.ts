import { buildApp } from './app.js';
import { env } from './config/env.js';

const start = async () => {
  const app = await buildApp();
  
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running at http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
