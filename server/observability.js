import { randomUUID } from 'node:crypto';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'password',
  'passwordHash',
  'access_token',
  'refresh_token',
  'service_role',
  'SUPABASE_SERVICE_ROLE_KEY',
  'otp',
  'testOtp',
  'idNumber',
]);

function safeContext(value) {
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.has(key) || /password|token|secret|key/i.test(key) ? '[REDACTED]' : entry,
    ])
  );
}

export function log(level, message, context = {}) {
  const record = {
    time: new Date().toISOString(),
    level,
    message,
    ...safeContext(context),
  };
  const output = JSON.stringify(record);
  if (level === 'error' || level === 'critical') console.error(output);
  else console.log(output);
}

const criticalDedupe = new Map();

export async function reportCritical(message, context = {}) {
  log('critical', message, context);

  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (!webhook) return;

  const dedupeKey = `${message}:${context.path || ''}`;
  const lastSent = criticalDedupe.get(dedupeKey) || 0;
  if (Date.now() - lastSent < 60_000) return;
  criticalDedupe.set(dedupeKey, Date.now());

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `[VoltaicOS critical failure] ${message}`,
        context: safeContext(context),
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    log('error', 'Critical alert webhook failed', { error: err?.message });
  }
}

export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id']?.toString().slice(0, 100) || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  const startedAt = Date.now();

  res.on('finish', () => {
    const level = res.statusCode >= 500 ? 'error' : 'info';
    log(level, 'HTTP request', {
      requestId,
      method: req.method,
      path: req.originalUrl?.split('?')[0],
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
}

export function installProcessHandlers() {
  process.on('uncaughtException', (error) => {
    void reportCritical('Uncaught exception', { error: error?.message });
    // Do not continue in an unknown state; the process manager should restart it.
    process.exit(1);
  });
  process.on('unhandledRejection', (error) => {
    void reportCritical('Unhandled promise rejection', { error: error?.message || String(error) });
  });
}
