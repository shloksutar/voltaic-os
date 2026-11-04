import { rateLimit } from 'express-rate-limit';

// Shared rate limiters for the VoltaicOS backend.
// Defaults are per client IP. Tweak via env vars if needed:
//   RATE_LIMIT_API_MAX      - general /api requests per 15 min (default 300)
//   RATE_LIMIT_AUTH_MAX     - auth endpoint requests per 15 min (default 20)
//   RATE_LIMIT_OTP_MAX      - OTP send/verify requests per 10 min (default 8)
//   RATE_LIMIT_WRITE_MAX    - write/mutation requests per 15 min (default 40)

const tooManyRequests = (message) => (req, res) => {
  res.status(429).json({ error: message });
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests('Too many requests — please slow down and try again later.'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_AUTH_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests('Too many authentication attempts — please try again later.'),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: tooManyRequests('Too many failed login attempts. Please wait 15 minutes and try again.'),
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_OTP_MAX) || 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests('Too many verification code requests — please try again later.'),
});

export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_WRITE_MAX) || 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests('Too many submissions — please try again later.'),
});

// Apply one limiter per request, regardless of whether the serverless adapter
// exposes the router as /api/* or as a root-mounted route. This avoids counting
// one Vercel request twice while keeping OTP/auth buckets more restrictive.
export function applyRateLimiters(app) {
  app.use((req, res, next) => {
    const path = req.path.replace(/^\/api(?=\/|$)/, '') || '/';
    if (path.startsWith('/auth/phone')) return otpLimiter(req, res, next);
    if (path.startsWith('/auth')) return authLimiter(req, res, next);
    return apiLimiter(req, res, next);
  });
}
