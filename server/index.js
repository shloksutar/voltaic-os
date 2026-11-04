import express from 'express';
import { apiRouter } from './apiRouter.js';
import { applyRateLimiters } from './rateLimit.js';
import { configureHttpSecurity, installErrorHandler } from './httpSecurity.js';
import { installProcessHandlers, log } from './observability.js';
import { scheduleDailyBackup } from './backup.js';
import { isSupabaseServerConfigured, isSupabaseServiceRoleConfigured } from './supabase.js';

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.warn('[SECURITY NOTICE] SESSION_SECRET not set in production. Using fallback secret.');
}
if (process.env.NODE_ENV === 'production' && (!isSupabaseServerConfigured || !isSupabaseServiceRoleConfigured) && process.env.ALLOW_JSON_DB !== 'true') {
  console.warn('[STORAGE NOTICE] Supabase server credentials not configured. Running in fallback mode.');
}

const app = express();
const PORT = process.env.PORT || 5000;

configureHttpSecurity(app);

// Health check (not rate limited, used by monitors)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'VoltaicOS Backend API', release: process.env.RELEASE_ID || 'local', time: new Date().toISOString() });
});

app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready', release: process.env.RELEASE_ID || 'local' });
});

// Rate limiting for API routes
applyRateLimiters(app, '/api');

// API Routes
app.use('/api', apiRouter);
installErrorHandler(app);
installProcessHandlers();
scheduleDailyBackup();

app.listen(PORT, () => {
  log('info', 'VoltaicOS API server started', { port: PORT, release: process.env.RELEASE_ID || 'local' });
});

export default app;
