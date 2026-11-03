import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { supabaseServer, isSupabaseServerConfigured } from './supabase.js';
import { isAdminEmail, ADMIN_EMAILS } from '../src/constants/admin.js';

// Admin emails can also be provided (comma-separated) via env — never via client-exposed vars
const ENV_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_SET = new Set([...ADMIN_EMAILS.map((e) => e.toLowerCase()), ...ENV_ADMIN_EMAILS]);

export function isAdminUser(user) {
  return Boolean(user && user.email && (ADMIN_SET.has(String(user.email).toLowerCase()) || isAdminEmail(user.email)));
}

// ─── Password hashing (scrypt, per-user salt) ────────────────────────────────
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  try {
    const candidate = scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// ─── Signed session tokens (local fallback / phone flows) ───────────────────
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_SECRET = process.env.SESSION_SECRET || (
  process.env.NODE_ENV === 'production' ? null : randomBytes(32).toString('hex')
);
const revokedTokens = new Set();

function sign(value) {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function encodeSession(user) {
  if (!SESSION_SECRET) throw new Error('SESSION_SECRET is required in production');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email || null,
    name: user.name || 'User',
    exp: Date.now() + SESSION_TTL_MS,
  })).toString('base64url');
  return `v1.${payload}.${sign(payload)}`;
}

function decodeSession(token) {
  if (!SESSION_SECRET || !token?.startsWith('v1.')) return null;
  const [, payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.sub || !data.exp || data.exp <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function createSession(user) {
  return encodeSession(user);
}

export function deleteSession(token) {
  if (token) revokedTokens.add(token);
  return Boolean(token);
}

// ─── Token → user resolution ─────────────────────────────────────────────────
export function bearingToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function getUserByToken(token) {
  if (!token || revokedTokens.has(token)) return null;

  // 1) Signed local session (works across serverless instances)
  const signed = decodeSession(token);
  if (signed) {
    const stored = db.getUserById(signed.sub);
    const user = {
      id: signed.sub,
      email: signed.email || stored?.email || null,
      name: signed.name || stored?.name || 'User',
      phone: stored?.phone || '',
    };
    return { ...user, role: isAdminUser(user) ? 'admin' : 'user' };
  }

  // 2) Supabase Auth JWT
  if (isSupabaseServerConfigured && supabaseServer) {
    try {
      const { data, error } = await supabaseServer.auth.getUser(token);
      if (error || !data?.user) return null;
      const authUser = data.user;
      const { data: row } = await supabaseServer
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      const email = row?.email || authUser.email || null;
      return {
        id: authUser.id,
        email,
        name: row?.name || authUser.user_metadata?.name || authUser.user_metadata?.username || 'User',
        phone: row?.phone || '',
        avatar: row?.avatar || '',
        vehicleModel: row?.vehicle_model || '',
        licensePlate: row?.license_plate || '',
        role: isAdminUser({ email }) ? 'admin' : 'user',
      };
    } catch {
      return null;
    }
  }
  return null;
}

// ─── Middleware ──────────────────────────────────────────────────────────────
export async function requireAuth(req, res, next) {
  const token = bearingToken(req);
  const user = await getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  req.user = user;
  req.authToken = token;
  return next();
}

export async function optionalAuth(req, res, next) {
  const token = bearingToken(req);
  const user = await getUserByToken(token);
  if (user) {
    req.user = user;
    req.authToken = token;
  }
  return next();
}

export async function requireAdmin(req, res, next) {
  const token = bearingToken(req);
  const user = await getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  if (!isAdminUser(user)) {
    return res.status(403).json({ error: 'Admin privileges required.' });
  }
  req.user = user;
  req.authToken = token;
  return next();
}
