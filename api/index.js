import express from 'express';
import { apiRouter } from '../server/apiRouter.js';
import { applyRateLimiters } from '../server/rateLimit.js';
import { configureHttpSecurity, installErrorHandler } from '../server/httpSecurity.js';
import { isSupabaseServerConfigured, isSupabaseServiceRoleConfigured } from '../server/supabase.js';

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.warn('[SECURITY NOTICE] SESSION_SECRET not explicitly defined in Vercel. Using fallback secret.');
}
if (process.env.NODE_ENV === 'production' && (!isSupabaseServerConfigured || !isSupabaseServiceRoleConfigured) && process.env.ALLOW_JSON_DB !== 'true') {
  console.warn('[STORAGE NOTICE] Supabase server credentials not configured. Running in fallback mode.');
}

const app = express();

configureHttpSecurity(app);

// Health check (not rate limited, used by monitors)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'VoltaicOS Vercel Serverless API', release: process.env.RELEASE_ID || 'serverless', time: new Date().toISOString() });
});

app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready', release: process.env.RELEASE_ID || 'serverless' });
});

// Rate limiting for API routes (both /api-prefixed and root-mounted routes)
applyRateLimiters(app);

// Support both /api prefixed routes and root-mounted routes from Vercel rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);
installErrorHandler(app);

export default app;
