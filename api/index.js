import express from 'express';
import cors from 'cors';
import { apiRouter } from '../server/apiRouter.js';

const app = express();

app.use(cors());
app.use(express.json());

// Support both /api prefixed routes and root-mounted routes from Vercel rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'VoltaicOS Vercel Serverless API', time: new Date().toISOString() });
});

export default app;
