import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import cors from 'cors';
import { apiRouter } from './server/apiRouter.js';

function apiBackendPlugin() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRouter);

  return {
    name: 'api-backend-plugin',
    configureServer(server) {
      server.middlewares.use(app);
    },
  };
}

export default defineConfig({
  plugins: [react(), apiBackendPlugin()],
});
