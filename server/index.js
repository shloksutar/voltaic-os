import express from 'express';
import cors from 'cors';
import { apiRouter } from './apiRouter.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'VoltaicOS Backend API', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`⚡ VoltaicOS API Server running at http://localhost:${PORT}`);
  console.log(`🔌 Endpoints active: /api/stations, /api/bookings, /api/auth, /api/alerts, /api/analytics`);
});

export default app;
