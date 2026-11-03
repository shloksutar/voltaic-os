import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import { apiRouter } from './server/apiRouter.js';
import { configureHttpSecurity, installErrorHandler } from './server/httpSecurity.js';

function apiBackendPlugin() {
  const app = express();
  configureHttpSecurity(app);
  app.use('/api', apiRouter);
  installErrorHandler(app);

  return {
    name: 'api-backend-plugin',
    configureServer(server) {
      server.middlewares.use(app);
    },
    configurePreviewServer(server) {
      server.middlewares.use(app);
    },
  };
}

export default defineConfig({
  plugins: [react(), apiBackendPlugin()],
});
