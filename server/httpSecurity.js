import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { requestLogger, reportCritical } from './observability.js';

const developmentOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

function allowedOrigins() {
  const configured = (process.env.CORS_ORIGINS || process.env.APP_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (configured.length) return new Set(configured);
  return process.env.NODE_ENV === 'production' ? new Set() : developmentOrigins;
}

export function corsOptions() {
  const allow = allowedOrigins();
  return {
    origin(origin, callback) {
      // Requests without Origin are non-browser clients (health monitors, curl).
      // They do not receive CORS permission and still need endpoint auth.
      if (!origin) return callback(null, false);
      if (allow.has(origin.replace(/\/$/, ''))) return callback(null, true);
      return callback(new Error('Origin is not allowed'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: false,
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
}

function requireHttps(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (req.secure || forwardedProto === 'https') return next();
  // Do not redirect API requests: redirecting a POST can expose data or change its method.
  return res.status(426).json({ error: 'Secure HTTPS connection required.' });
}

export function configureHttpSecurity(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestLogger);
  app.use(requireHttps);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: '100kb', strict: true }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use((req, res, next) => {
    if (!req.headers['x-request-id']) res.setHeader('X-Request-ID', randomUUID());
    next();
  });
}

export function installErrorHandler(app) {
  // Express error middleware must have four parameters.
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error?.message === 'Origin is not allowed' ? 403 : Number(error?.statusCode || error?.status) || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    if (safeStatus >= 500) {
      void reportCritical('Unhandled API error', { requestId: req.requestId, path: req.originalUrl?.split('?')[0], error: error?.message });
    }
    return res.status(safeStatus).json({
      error: safeStatus === 403 ? 'This request origin is not allowed.' : 'Something went wrong. Please try again.',
      requestId: req.requestId,
    });
  });
}
