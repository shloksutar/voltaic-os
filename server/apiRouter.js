import { Router } from 'express';
import { randomInt, randomUUID } from 'node:crypto';
import { db } from './db.js';
import { supabaseServer, isSupabaseServerConfigured } from './supabase.js';
import { loginLimiter, writeLimiter } from './rateLimit.js';
import { createSession, deleteSession, hashPassword, verifyPassword, requireAuth, requireAdmin, getUserByToken, isAdminUser } from './auth.js';

// ─── Sanitization & validation helpers ───────────────────────────────────────
const cleanString = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const cleanEmail = (value) => cleanString(value, 254).toLowerCase();
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// Strip characters that could break PostgREST filter syntax (.or(...))
const escapeFilterValue = (value) => String(value ?? '').replace(/[(),.%\\"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64);

export const apiRouter = Router();

const DAYS_SET = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

// Helper: map Supabase station row → app shape
function mapStation(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    operator: row.operator,
    ports: row.ports,
    available: row.available,
    busy: row.busy,
    offline: row.offline,
    speed: row.speed,
    status: row.status,
    waitMin: row.wait_min,
    tariffPerKwh: parseFloat(row.tariff_per_kwh),
    reservationFee: parseFloat(row.reservation_fee),
    connectors: row.connectors || [],
    amenities: row.amenities || [],
    hours: row.hours,
  };
}

// Helper: map Supabase booking row → app shape
function mapBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userPhone: row.user_phone,
    stationId: row.station_id,
    stationName: row.station_name,
    city: row.city,
    bayNumber: row.bay_number,
    portType: row.port_type,
    date: row.date,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    vehicleNumber: row.vehicle_number,
    vehicleModel: row.vehicle_model,
    tariffPerKwh: parseFloat(row.tariff_per_kwh),
    reservationFee: parseFloat(row.reservation_fee),
    estimatedCost: parseFloat(row.estimated_cost),
    status: row.status,
    qrCodeData: row.qr_code_data,
    createdAt: row.created_at,
  };
}

// Helper: map Supabase user row → app shape
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    authProvider: row.auth_provider,
    avatar: row.avatar,
    vehicleModel: row.vehicle_model,
    licensePlate: row.license_plate,
    createdAt: row.created_at,
  };
}

// Never leak credential material back to clients
function publicUser(user) {
  if (!user) return null;
  const safe = { ...user };
  delete safe.passwordHash;
  delete safe.otpCode;
  return safe;
}

function withRole(user) {
  const safe = publicUser(user) || {};
  const admin = isAdminUser(user);
  return { ...safe, role: admin ? 'admin' : 'user', isAdmin: admin };
}

// A booking belongs to a caller when any identifier matches. Used to keep
// users strictly scoped to their own reservations.
function ownsBooking(caller, booking) {
  if (!caller || !booking) return false;
  if (booking.userId && caller.id && booking.userId === caller.id) return true;
  const callerEmail = (caller.email || '').toLowerCase();
  const bookingEmail = (booking.userEmail || '').toLowerCase();
  if (callerEmail && bookingEmail && callerEmail === bookingEmail) return true;
  const callerPhone = String(caller.phone || '').replace(/\D/g, '').slice(-10);
  const bookingPhone = String(booking.userPhone || '').replace(/\D/g, '').slice(-10);
  if (callerPhone && bookingPhone && callerPhone === bookingPhone) return true;
  return false;
}

// Helper: map Supabase alert row → app shape
function mapAlert(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    station: row.station,
    city: row.city,
    msg: row.msg,
    time: row.time,
    resolved: row.resolved,
    timestamp: row.timestamp,
  };
}

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Register with Email
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    const password = String(req.body?.password ?? '');
    const name = cleanString(req.body?.name, 60);
    const phone = cleanString(req.body?.phone, 16).replace(/\D/g, '').slice(-10);
    const vehicleModel = cleanString(req.body?.vehicleModel, 60);
    const licensePlate = cleanString(req.body?.licensePlate, 20).toUpperCase();

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
    }

    if (isSupabaseServerConfigured) {
      const { data: existing } = await supabaseServer
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const displayName = name || email.split('@')[0];

      // Try to create a real Supabase Auth user too (requires the service-role key).
      // If it isn't available, still create the profile row — login falls back to it.
      let authUserId = null;
      try {
        const { data: authData, error: authErr } = await supabaseServer.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: displayName },
        });
        if (!authErr && authData?.user) authUserId = authData.user.id;
      } catch {
        // Service role not configured or Auth admin unavailable — continue with profile-only account
      }

      const newUser = {
        id: authUserId || randomUUID(),
        name: displayName,
        email,
        phone: phone || '',
        auth_provider: 'email',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
        vehicle_model: vehicleModel || 'Tata Nexon EV Max',
        license_plate: licensePlate || 'MH 02 EV 1001',
      };

      const { data, error } = await supabaseServer.from('users').insert([newUser]).select().single();
      if (error) return res.status(500).json({ error: 'Could not create the account. Please try again.' });

      const user = mapUser(data);
      return res.status(201).json({ message: 'Account created successfully', user, token: createSession(user) });
    }

    // Fallback: JSON db — password hashed with scrypt
    const existing = db.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const user = db.createUser({
      name: name || email.split('@')[0],
      email,
      phone: phone || '',
      authProvider: 'email',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
      vehicleModel: vehicleModel || 'Tata Nexon EV Max',
      licensePlate: licensePlate || 'MH 02 EV 1001',
      passwordHash: hashPassword(password),
    });

    return res.status(201).json({ message: 'Account created successfully', user: withRole(user), token: createSession(user) });
  } catch (err) {
    console.error('POST /auth/register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login with Email
apiRouter.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    const password = String(req.body?.password ?? '');
    const requestedRole = req.body?.role === 'admin' ? 'admin' : 'user';
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email address is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });

    if (isSupabaseServerConfigured) {
      // Actually verify the password against Supabase Auth
      const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Do not reveal whether an email is registered.
        return res.status(401).json({ error: 'Email or password is incorrect.' });
      }

      const { data: row } = await supabaseServer
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      let user;
      if (row) {
        user = mapUser(row);
      } else {
        // Self-heal: Supabase Auth account exists but profile row is missing.
        // Create it so downstream foreign keys (e.g. bookings.user_id) hold.
        const authUserId = authData?.user?.id || null;
        const healed = {
          id: authUserId || randomUUID(),
          name: authData?.user?.user_metadata?.name || email.split('@')[0],
          email,
          phone: '',
          auth_provider: 'email',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
          vehicle_model: 'Tata Nexon EV Max',
          license_plate: 'MH 02 EV 1001',
        };
        const { data: created } = await supabaseServer.from('users').insert([healed]).select().single();
        user = created ? mapUser(created) : { ...healed, createdAt: new Date().toISOString() };
      }
      if (requestedRole === 'admin' && !isAdminUser(user)) {
        return res.status(403).json({ error: 'This account is not authorized for admin access.' });
      }
      return res.json({ message: 'Logged in successfully', user: withRole(user), token: createSession(user) });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Incorrect password. Please check your password and try again.' });
    }
    if (requestedRole === 'admin' && !isAdminUser(user)) {
      return res.status(403).json({ error: 'This account is not authorized for admin access.' });
    }
    return res.json({ message: 'Logged in successfully', user: withRole(user), token: createSession(user) });
  } catch (err) {
    console.error('POST /auth/login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Google Sign-In / Sign-Up
// Fails closed: the client must send a real Google ID token (idToken). The server
// verifies it against Google's tokeninfo endpoint and requires email_verified=true,
// and — when GOOGLE_CLIENT_ID is configured — that the audience matches. Without a
// configured GOOGLE_CLIENT_ID the endpoint is disabled entirely.
apiRouter.post('/auth/google', async (req, res) => {
  try {
    const idToken = cleanString(req.body?.idToken, 4096);
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return res.status(503).json({ error: 'Google Sign-In is not configured on the server.' });
    }
    if (!idToken) {
      return res.status(400).json({ error: 'A Google ID token (idToken) is required.' });
    }

    const verifyResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyResp.ok) {
      return res.status(401).json({ error: 'Google token verification failed.' });
    }
    const info = await verifyResp.json();
    if (info.aud !== clientId) {
      return res.status(401).json({ error: 'Google token audience mismatch.' });
    }
    if (String(info.email_verified) !== 'true' || !info.email) {
      return res.status(401).json({ error: 'Google account email is not verified.' });
    }

    const email = cleanEmail(info.email);
    const name = cleanString(info.name, 60) || email.split('@')[0];
    const avatar = cleanString(info.picture, 300);
    const googleId = cleanString(info.sub, 100);

    if (isSupabaseServerConfigured) {
      let { data: row } = await supabaseServer
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (!row) {
        const newUser = {
          id: randomUUID(),
          name,
          email,
          auth_provider: 'google',
          avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          vehicle_model: 'MG ZS EV',
          license_plate: 'DL 01 EV 4421',
        };
        const { data: created, error: insertError } = await supabaseServer.from('users').insert([newUser]).select().single();
        if (insertError) return res.status(500).json({ error: 'Could not create the account. Please try again.' });
        row = created;
      }

      const user = mapUser(row);
      return res.json({ message: 'Google Sign-In successful', user, token: createSession(user) });
    }

    let user = db.getUserByEmail(email);
    if (!user) {
      user = db.createUser({
        name,
        email,
        googleId: googleId || `g_${Date.now()}`,
        authProvider: 'google',
        avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        vehicleModel: 'MG ZS EV',
        licensePlate: 'DL 01 EV 4421',
      });
    }
    return res.json({ message: 'Google Sign-In successful', user: withRole(user), token: createSession(user) });
  } catch (err) {
    console.error('POST /auth/google error:', err);
    return res.status(500).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

// Phone Send OTP
apiRouter.post('/auth/phone/send-otp', (req, res) => {
  const phone = cleanString(req.body?.phone, 16).replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: 'A valid 10-digit Indian mobile number is required' });
  }

  // Cryptographically random 6-digit code, valid for 5 minutes, single use
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  db.saveOtp(phone, code);

  // The code is only returned in non-production environments (no SMS gateway wired yet).
  // In production, wire an SMS provider (e.g. MSG91 / Twilio) and never return the code.
  const isProd = process.env.NODE_ENV === 'production';
  const body = {
    success: true,
    message: `Verification code sent to +91 ${phone}`,
    expiresInSeconds: 300,
  };
  if (!isProd) body.testOtp = code;
  return res.json(body);
});

// Phone Verify OTP
apiRouter.post('/auth/phone/verify-otp', async (req, res) => {
  try {
    const phone = cleanString(req.body?.phone, 16).replace(/\D/g, '').slice(-10);
    const otp = cleanString(req.body?.otp, 6);
    const name = cleanString(req.body?.name, 60);
    const vehicleModel = cleanString(req.body?.vehicleModel, 60);
    const licensePlate = cleanString(req.body?.licensePlate, 20).toUpperCase();
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'A valid 10-digit mobile number is required' });
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'The verification code must be 6 digits' });

    const valid = db.verifyOtp(phone, otp);
    if (!valid) return res.status(400).json({ error: 'Invalid or expired verification code' });

  if (isSupabaseServerConfigured) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let { data: row } = await supabaseServer
      .from('users')
      .select('*')
      .ilike('phone', `%${cleanPhone}%`)
      .maybeSingle();

    if (!row) {
      const newUser = {
        id: randomUUID(),
        name: name || `EV Driver (${phone.slice(-4)})`,
        phone,
        email: null,
        auth_provider: 'phone',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(phone)}`,
        vehicle_model: vehicleModel || 'Hyundai Ioniq 5',
        license_plate: licensePlate || 'KA 03 EV 8899',
      };
      const { data: created } = await supabaseServer.from('users').insert([newUser]).select().single();
      row = created;
    }

    const user = mapUser(row);
    return res.json({ message: 'Phone verified successfully', user: withRole(user), token: createSession(user) });
  }

  let user = db.getUserByPhone(phone);
  if (!user) {
    user = db.createUser({
      name: name || `EV Driver (${phone.slice(-4)})`,
      phone,
      email: null,
      authProvider: 'phone',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(phone)}`,
      vehicleModel: vehicleModel || 'Hyundai Ioniq 5',
      licensePlate: licensePlate || 'KA 03 EV 8899',
    });
  }
    return res.json({ message: 'Phone verified successfully', user: withRole(user), token: createSession(user) });
  } catch (err) {
    console.error('POST /auth/phone/verify-otp error:', err);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// Current User — resolves Bearer token: local session, then Supabase JWT
apiRouter.get('/auth/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.json({ user: null });

    const authUser = await getUserByToken(match[1].trim());
    if (!authUser) return res.json({ user: null });

    // Enrich with the stored profile when available (Supabase mode or JSON db)
    if (isSupabaseServerConfigured) {
      const { data: row } = await supabaseServer.from('users').select('*').eq('id', authUser.id).maybeSingle();
      if (row) return res.json({ user: { ...mapUser(row), role: authUser.role, isAdmin: authUser.role === 'admin' } });
      return res.json({ user: { id: authUser.id, name: authUser.name, email: authUser.email, role: authUser.role } });
    }

    const dbUser = db.getUserById(authUser.id);
    return res.json({ user: dbUser ? withRole(dbUser) : { id: authUser.id, name: authUser.name, email: authUser.email, role: authUser.role, isAdmin: authUser.role === 'admin' } });
  } catch (err) {
    console.error('GET /auth/me error:', err);
    return res.json({ user: null });
  }
});

// Update Profile — must be authenticated and may only update your own profile
apiRouter.patch('/auth/profile', requireAuth, async (req, res) => {
  try {
    const name = cleanString(req.body?.name, 60);
    const vehicleModel = cleanString(req.body?.vehicleModel, 60);
    const licensePlate = cleanString(req.body?.licensePlate, 20).toUpperCase();
    const phone = cleanString(req.body?.phone, 16).replace(/\D/g, '').slice(-10);
    const userId = req.user.id; // identity comes from the verified token, never the body

    if (isSupabaseServerConfigured) {
      const { data, error } = await supabaseServer
        .from('users')
        .update({
          ...(name && { name }),
          ...(vehicleModel && { vehicle_model: vehicleModel }),
          ...(licensePlate && { license_plate: licensePlate }),
          ...(phone && { phone }),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) return res.status(500).json({ error: 'Could not update the profile. Please try again.' });
      return res.json({ user: mapUser(data) });
    }

    const updated = db.updateUser(userId, { name, vehicleModel, licensePlate, phone });
    return res.json({ user: publicUser(updated) });
  } catch (err) {
    console.error('PATCH /auth/profile error:', err);
    return res.status(500).json({ error: 'Could not update the profile. Please try again.' });
  }
});

// Logout — invalidates the local session (Supabase sessions expire on their own)
apiRouter.post('/auth/logout', (req, res) => {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) deleteSession(match[1].trim());
  return res.json({ success: true, message: 'Logged out' });
});

// ==========================================
// 2. STATIONS & TELEMETRY ROUTES
// ==========================================

// Get All Stations
apiRouter.get('/stations', async (req, res) => {
  const city = cleanString(req.query.city, 60);
  const operator = cleanString(req.query.operator, 80);
  const status = cleanString(req.query.status, 30);
  const search = cleanString(req.query.search, 64);

  if (isSupabaseServerConfigured) {
    let query = supabaseServer.from('stations').select('*').order('city');

    if (city && city !== 'All Cities') query = query.ilike('city', city);
    if (operator && operator !== 'All Operators') query = query.eq('operator', operator);
    if (status && status !== 'All') query = query.eq('status', status);
    if (search && search.trim()) {
      const q = escapeFilterValue(search); // strips PostgREST-breaking characters
      if (q) query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%,operator.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) { console.error('GET /stations error:', error); return res.status(500).json({ error: 'Could not load stations. Please try again.' }); }

    const stations = (data || []).map(mapStation);
    return res.json({ stations, count: stations.length });
  }

  // Fallback
  let stations = db.getStations();
  if (city && city !== 'All Cities') stations = stations.filter((s) => s.city.toLowerCase() === city.toLowerCase());
  if (operator && operator !== 'All Operators') stations = stations.filter((s) => s.operator.toLowerCase() === operator.toLowerCase());
  if (status && status !== 'All') stations = stations.filter((s) => s.status.toLowerCase() === status.toLowerCase());
  if (search && search.trim()) {
    const q = search.toLowerCase();
    stations = stations.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.operator.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  }
  return res.json({ stations, count: stations.length });
});

// Get Single Station
apiRouter.get('/stations/:id', async (req, res) => {
  if (isSupabaseServerConfigured) {
    const { data, error } = await supabaseServer
      .from('stations')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    if (!data) return res.status(404).json({ error: 'Station not found' });
    return res.json({ station: mapStation(data) });
  }

  const station = db.getStation(req.params.id);
  if (!station) return res.status(404).json({ error: 'Station not found' });
  return res.json({ station });
});

// Report Incident on Station — authenticated users only, input sanitized
apiRouter.post('/stations/:id/report', writeLimiter, requireAuth, async (req, res) => {
  const body = req.body || {};
  const type = ['ice', 'offline', 'queue'].includes(body.type) ? body.type : 'ice';
  const msg = cleanString(body.msg, 500);
  const reporterName = cleanString(req.user?.name || body.reporterName, 60);
  const bayNumber = Math.min(20, Math.max(1, parseInt(body.bayNumber, 10) || 1));

  if (isSupabaseServerConfigured) {
    const { data: stationRow } = await supabaseServer
      .from('stations')
      .select('name,city')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!stationRow) return res.status(404).json({ error: 'Station not found' });

    const newAlert = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: type || 'ice',
      severity: type === 'offline' ? 'high' : 'medium',
      station: stationRow.name,
      city: stationRow.city,
      msg: msg || `Incident reported at Bay #${bayNumber || 1} by ${reporterName || 'Driver'}.`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
    };

    const { data, error } = await supabaseServer.from('alerts').insert([newAlert]).select().single();
    if (error) return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    return res.status(201).json({ message: 'Incident reported successfully', alert: mapAlert(data) });
  }

  const station = db.getStation(req.params.id);
  if (!station) return res.status(404).json({ error: 'Station not found' });

  const alert = db.addAlert({
    type: type || 'ice',
    severity: type === 'offline' ? 'high' : 'medium',
    station: station.name,
    city: station.city,
    msg: msg || `Incident reported at Bay #${bayNumber || 1} by ${reporterName || 'Driver'}.`,
  });

  return res.status(201).json({ message: 'Incident reported successfully', alert });
});

// ==========================================
// 3. BOOKING & SLOT RESERVATION ROUTES
// ==========================================

// Get User Bookings
apiRouter.get('/bookings', requireAuth, async (req, res) => {
  const isAdmin = isAdminUser(req.user);
  // Callers may only see their own bookings; admins see all
  const { userId, userEmail, userPhone } = req.query;

  if (isSupabaseServerConfigured) {
    let query = supabaseServer.from('bookings').select('*').order('created_at', { ascending: false });
    if (!isAdmin) {
      const safeId = String(req.user.id).replace(/[^A-Za-z0-9_-]/g, '');
      const safeEmail = String(req.user.email || '').replace(/[^A-Za-z0-9@._+-]/g, '');
      const filters = [`user_id.eq.${safeId}`];
      if (safeEmail) filters.push(`user_email.eq.${safeEmail}`);
      query = query.or(filters.join(','));
    } else if (userEmail) {
      query = query.eq('user_email', cleanEmail(userEmail));
    } else if (userPhone) {
      const cleanPhone = String(userPhone).replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone) query = query.ilike('user_phone', `%${cleanPhone}%`);
    } else if (userId) {
      query = query.eq('user_id', cleanString(userId, 40));
    }

    const { data, error } = await query;
    if (error) { console.error('GET /bookings error:', error); return res.status(500).json({ error: 'Could not load bookings. Please try again.' }); }

    const bookings = (data || []).map(mapBooking);
    return res.json({ bookings, count: bookings.length });
  }

  // Local DB fallback: callers see only their own bookings unless admin
  let bookings = db.getBookings();
  if (!isAdmin) {
    bookings = bookings.filter((b) =>
      b.userId === req.user.id || (req.user.email && b.userEmail === req.user.email)
    );
  } else if (userEmail) {
    bookings = bookings.filter((b) => b.userEmail === cleanEmail(userEmail));
  } else if (userPhone) {
    const cleanPhone = String(userPhone).replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone) bookings = bookings.filter((b) => (b.userPhone || '').replace(/[^0-9]/g, '').includes(cleanPhone));
  } else if (userId) {
    bookings = bookings.filter((b) => b.userId === cleanString(userId, 40));
  }
  return res.json({ bookings, count: bookings.length });
});

// Get Single Booking — owner or admin only
apiRouter.get('/bookings/:id', requireAuth, async (req, res) => {
  const isAdmin = isAdminUser(req.user);
  const owns = (b) => ownsBooking(req.user, b);

  if (isSupabaseServerConfigured) {
    const { data, error } = await supabaseServer
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) { console.error('GET /bookings/:id error:', error); return res.status(500).json({ error: 'Could not load the reservation. Please try again.' }); }
    if (!data) return res.status(404).json({ error: 'Reservation not found' });
    const booking = mapBooking(data);
    if (!isAdmin && !owns(booking)) return res.status(403).json({ error: 'You do not have access to this reservation.' });
    return res.json({ booking });
  }

  const booking = db.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Reservation not found' });
  if (!isAdmin && !owns(booking)) return res.status(403).json({ error: 'You do not have access to this reservation.' });
  return res.json({ booking });
});

// Create Slot Reservation — open to guests (guest bookings supported), identity
// is taken from a valid Bearer token when present; body identity fields are sanitized
apiRouter.post('/bookings', writeLimiter, async (req, res) => {
  const body = req.body || {};
  const stationId = cleanString(body.stationId, 40);
  const portType = cleanString(body.portType, 40) || 'CCS2 DC Fast';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().split('T')[0];
  const startTime = cleanString(body.startTime, 20) || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bayNumber = Math.min(20, Math.max(1, parseInt(body.bayNumber, 10) || 1));
  const durationMinutes = Math.min(480, Math.max(15, Number(body.durationMinutes) || 45));
  const vehicleNumber = cleanString(body.vehicleNumber, 20);
  const vehicleModel = cleanString(body.vehicleModel, 60);
  const userName = cleanString(body.userName, 60);
  const userEmail = cleanEmail(body.userEmail);
  const userPhone = cleanString(body.userPhone, 16).replace(/\D/g, '').slice(-10);
  if (userEmail && !EMAIL_RE.test(userEmail)) return res.status(400).json({ error: 'A valid email address is required for the reservation.' });

  // Authenticated callers book as themselves; guests get a server-generated guest id
  const authUser = await getUserByToken((req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1]);
  const userId = authUser ? authUser.id : (/^guest_[A-Za-z0-9]+$/.test(String(body.userId)) ? String(body.userId) : `guest_${Date.now()}`);
  const finalName = userName || authUser?.name || 'EV Driver';
  const finalEmail = userEmail || authUser?.email || '';

  if (!stationId) return res.status(400).json({ error: 'Station ID is required' });

  if (isSupabaseServerConfigured) {
    const { data: stationRow } = await supabaseServer
      .from('stations')
      .select('*')
      .eq('id', stationId)
      .maybeSingle();

    if (!stationRow) return res.status(404).json({ error: 'Station does not exist' });

    const station = mapStation(stationRow);
    if (station.status === 'offline' || station.available <= 0) {
      return res.status(409).json({ error: 'No available charging slots currently at this station' });
    }

    const duration = durationMinutes;
    const estimatedKwh = Math.round((station.speed * (duration / 60)) * 0.7);
    const energyCost = Math.round(estimatedKwh * (station.tariffPerKwh || 19.5));
    const reservationFee = station.reservationFee || 50;
    const estimatedCost = energyCost + reservationFee;
    const bookingId = `VOLT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking = {
      id: bookingId,
      user_id: null, // FK references Supabase auth.users; ownership is matched via email instead
      user_name: finalName,
      user_email: finalEmail,
      user_phone: userPhone || '',
      station_id: stationId,
      station_name: station.name,
      city: station.city,
      bay_number: bayNumber,
      port_type: portType,
      date,
      start_time: startTime,
      duration_minutes: duration,
      vehicle_number: vehicleNumber || 'MH 02 EV 1234',
      vehicle_model: vehicleModel || 'Tata Nexon EV Max',
      tariff_per_kwh: station.tariffPerKwh || 19.5,
      reservation_fee: reservationFee,
      estimated_cost: estimatedCost,
      status: 'active',
      qr_code_data: `${bookingId}-${stationId}-BAY${bayNumber}`,
    };

    const { data: createdBooking, error: bookingErr } = await supabaseServer
      .from('bookings')
      .insert([newBooking])
      .select()
      .single();

    if (bookingErr) return res.status(500).json({ error: 'Something went wrong. Please try again.' });

    // Update station availability
    const newAvailable = Math.max(0, station.available - 1);
    const newBusy = station.busy + 1;
    const newStatus = newAvailable === 0 ? 'busy' : station.status;
    await supabaseServer
      .from('stations')
      .update({ available: newAvailable, busy: newBusy, status: newStatus })
      .eq('id', stationId);

    // Insert reservation alert
    const alertData = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'reservation',
      severity: 'low',
      station: station.name,
      city: station.city,
      msg: `Slot reserved by ${finalName} (${vehicleNumber || 'EV'}). Bay #${bayNumber} reserved for ${duration} mins.`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
    };
    await supabaseServer.from('alerts').insert([alertData]);

    return res.status(201).json({ message: 'Slot reserved successfully', booking: mapBooking(createdBooking) });
  }

  // Fallback
  const station = db.getStation(stationId);
  if (!station) return res.status(404).json({ error: 'Station does not exist' });
  if (station.status === 'offline' || station.available <= 0) {
    return res.status(409).json({ error: 'No available charging slots currently at this station' });
  }

  const duration = durationMinutes;
  const estimatedKwh = Math.round((station.speed * (duration / 60)) * 0.7);
  const energyCost = Math.round(estimatedKwh * (station.tariffPerKwh || 19.5));
  const reservationFee = station.reservationFee || 50;
  const estimatedCost = energyCost + reservationFee;

  const booking = db.createBooking({
    stationId,
    stationName: station.name,
    city: station.city,
    address: station.address,
    bayNumber,
    portType,
    date,
    startTime,
    durationMinutes: duration,
    estimatedKwh,
    tariffPerKwh: station.tariffPerKwh || 19.5,
    reservationFee,
    estimatedCost,
    vehicleNumber: vehicleNumber || 'MH 02 EV 1234',
    vehicleModel: vehicleModel || 'Tata Nexon EV Max',
    userId,
    userName: finalName,
    userEmail: finalEmail,
    userPhone: userPhone || '',
  });

  return res.status(201).json({ message: 'Slot reserved successfully', booking });
});

// Cancel Reservation — owner or admin only
apiRouter.patch('/bookings/:id/cancel', requireAuth, async (req, res) => {
  const isAdmin = isAdminUser(req.user);

  if (isSupabaseServerConfigured) {
    const { data: existing } = await supabaseServer
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Reservation not found' });
    if (!isAdmin && !ownsBooking(req.user, { userId: existing.user_id, userEmail: existing.user_email, userPhone: existing.user_phone })) {
      return res.status(403).json({ error: 'You do not have access to this reservation.' });
    }

    const { data, error } = await supabaseServer
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Something went wrong. Please try again.' });

    // Restore station slot
    const { data: stationRow } = await supabaseServer
      .from('stations')
      .select('ports,available,busy,status')
      .eq('id', existing.station_id)
      .maybeSingle();

    if (stationRow) {
      const newAvailable = Math.min(stationRow.ports, stationRow.available + 1);
      const newBusy = Math.max(0, stationRow.busy - 1);
      const newStatus = newAvailable > 0 && stationRow.status === 'busy' ? 'available' : stationRow.status;
      await supabaseServer
        .from('stations')
        .update({ available: newAvailable, busy: newBusy, status: newStatus })
        .eq('id', existing.station_id);
    }

    const alertData = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'reservation',
      severity: 'low',
      station: existing.station_name,
      city: existing.city,
      msg: `Reservation ${existing.id} cancelled. Port returned to available pool.`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
    };
    await supabaseServer.from('alerts').insert([alertData]);

    return res.json({ message: 'Reservation cancelled successfully', booking: mapBooking(data) });
  }

  const existing = db.getBooking(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Reservation not found' });
  if (!isAdmin && !ownsBooking(req.user, existing)) {
    return res.status(403).json({ error: 'You do not have access to this reservation.' });
  }

  const booking = db.cancelBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Reservation not found' });
  return res.json({ message: 'Reservation cancelled successfully', booking });
});

// ==========================================
// 4. ALERTS & INCIDENT ROUTES
// ==========================================

apiRouter.get('/alerts', async (req, res) => {
  if (isSupabaseServerConfigured) {
    const { data, error } = await supabaseServer
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    const alerts = (data || []).map(mapAlert);
    return res.json({ alerts, count: alerts.length });
  }

  const alerts = db.getAlerts();
  return res.json({ alerts, count: alerts.length });
});

apiRouter.post('/alerts', writeLimiter, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const sanitized = {
    type: cleanString(body.type, 30) || 'general',
    severity: ['low', 'medium', 'high'].includes(body.severity) ? body.severity : 'low',
    station: cleanString(body.station, 120),
    city: cleanString(body.city, 60),
    msg: cleanString(body.msg, 500),
  };
  if (isSupabaseServerConfigured) {
    const newAlert = {
      id: `alt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
      ...sanitized,
    };
    const { data, error } = await supabaseServer.from('alerts').insert([newAlert]).select().single();
    if (error) { console.error('POST /alerts error:', error); return res.status(500).json({ error: 'Could not create the alert. Please try again.' }); }
    return res.status(201).json({ alert: mapAlert(data) });
  }

  const alert = db.addAlert(sanitized);
  return res.status(201).json({ alert });
});

apiRouter.patch('/alerts/:id/resolve', writeLimiter, requireAdmin, async (req, res) => {
  if (isSupabaseServerConfigured) {
    const { data, error } = await supabaseServer
      .from('alerts')
      .update({ resolved: true })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    if (!data) return res.status(404).json({ error: 'Alert not found' });
    return res.json({ message: 'Alert marked as resolved', alert: mapAlert(data) });
  }

  const alert = db.resolveAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  return res.json({ message: 'Alert marked as resolved', alert });
});

apiRouter.delete('/alerts/:id', writeLimiter, requireAdmin, async (req, res) => {
  if (isSupabaseServerConfigured) {
    const { data, error } = await supabaseServer
      .from('alerts')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    return res.json({ message: 'Alert dismissed', removed: data ? mapAlert(data) : null });
  }

  const removed = db.dismissAlert(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Alert not found' });
  return res.json({ message: 'Alert dismissed', removed });
});

// ==========================================
// 5. NETWORK ANALYTICS ROUTE
// ==========================================

apiRouter.get('/analytics', async (req, res) => {
  let stations;

  if (isSupabaseServerConfigured) {
    const { data, error } = await supabaseServer.from('stations').select('*');
    if (error) return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    stations = (data || []).map(mapStation);
  } else {
    stations = db.getStations();
  }

  // City breakdown
  const cityMap = {};
  stations.forEach((s) => {
    if (!cityMap[s.city]) {
      cityMap[s.city] = { city: s.city, available: 0, busy: 0, offline: 0, total: 0 };
    }
    cityMap[s.city].available += s.available;
    cityMap[s.city].busy += s.busy;
    cityMap[s.city].offline += s.offline;
    cityMap[s.city].total += s.ports;
  });
  const cityData = Object.values(cityMap);

  // Operator share
  const opMap = {};
  stations.forEach((s) => {
    opMap[s.operator] = (opMap[s.operator] || 0) + s.ports;
  });
  const operatorData = Object.entries(opMap).map(([name, value]) => ({ name, value }));

  // Status totals
  const totalAvail = stations.reduce((sum, s) => sum + s.available, 0);
  const totalBusy = stations.reduce((sum, s) => sum + s.busy, 0);
  const totalOffline = stations.reduce((sum, s) => sum + s.offline, 0);
  const totalPorts = stations.reduce((sum, s) => sum + s.ports, 0);

  // Active bookings count
  let activeBookingsCount = 0;
  if (isSupabaseServerConfigured) {
    const { count } = await supabaseServer
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    activeBookingsCount = count || 0;
  } else {
    activeBookingsCount = db.getBookings().filter((b) => b.status === 'active').length;
  }

  const pieData = [
    { name: 'Available', value: totalAvail, color: '#059669' },
    { name: 'In Use / Reserved', value: totalBusy, color: '#D97706' },
    { name: 'Offline', value: totalOffline, color: '#DC2626' },
  ];

  return res.json({
    stationsCount: stations.length,
    totalPorts,
    totalAvail,
    totalBusy,
    totalOffline,
    activeBookingsCount,
    cityData,
    operatorData,
    pieData,
  });
});

// ─── Charger Listings (Rent My Charger / Host Applications) ──────────────────

const CAR_KEYWORDS_RE = /\b(nexon|tiago|tigor|curvv|punch\s*ev|zs\s*ev|mg\s*zs|comet|windsor|ioniq|kona|creta\s*ev|byd|atto|seal|tesla|model\s*[3ysx]|xuv\s*400|xuv400|bmw\s*i[x347]|audi\s*e-?tron|taycan|polestar|mercedes\s*eq|volvo\s*xc40|c40|kia\s*ev[69]|four\s*wheeler|4\s*wheeler|4w|car|sedan|suv|hatchback|ccs2|ccs-2|chademo)\b/i;

function mapHostChargerRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status === 'rejected' ? 'denied' : row.status || 'pending_review',
    submittedAt: row.created_at,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    pincode: row.pincode,
    chargerBrand: row.charger_brand,
    powerLevel: row.power_level,
    connectorType: row.connector_type,
    pricePerUnit: row.price_per_unit,
    maxSessions: row.max_sessions,
    chargerDescription: row.description,
    supportedVehicles: row.supported_vehicles || [],
    selectedDays: row.available_days || [],
    timeFrom: row.time_from,
    timeTo: row.time_to,
    minBookingHours: row.min_booking_hours,
    advanceNoticeHours: row.advance_notice_hours,
    idType: row.id_type,
    idNumber: row.id_number,
  };
}

const CITY_COORDINATES = {
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  Bengaluru: [12.9716, 77.5946],
  Hyderabad: [17.385, 78.4867],
  Pune: [18.5204, 73.8567],
  Chennai: [13.0827, 80.2707],
};

function getCityCoordinates(cityName, seed = '') {
  const match = Object.keys(CITY_COORDINATES).find(
    (c) => c.toLowerCase() === String(cityName || '').trim().toLowerCase()
  );
  const base = match ? CITY_COORDINATES[match] : [19.076, 72.8777];
  let hash = 0;
  const str = String(seed || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 100) / 100 - 0.5) * 0.05;
  const offsetLng = ((Math.abs(hash >> 3) % 100) / 100 - 0.5) * 0.05;
  return {
    lat: Number((base[0] + offsetLat).toFixed(4)),
    lng: Number((base[1] + offsetLng).toFixed(4)),
  };
}

function mapPublicHostChargerRow(row) {
  const isApproved = row.status !== 'rejected';
  const city = row.city || 'India';
  const rate = Number(row.price_per_unit);
  const coords = (Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng)))
    ? { lat: Number(row.lat), lng: Number(row.lng) }
    : getCityCoordinates(city, String(row.id || row.full_name || ''));
  return {
    id: `host_public_${row.id}`,
    requestId: row.id,
    isCommunity2W: true,
    lat: coords.lat,
    lng: coords.lng,
    listingStatus: isApproved ? 'approved' : 'denied',
    hostName: row.full_name || 'Community charger host',
    hostPhone: isApproved ? row.phone : '',
    hostEmail: isApproved ? row.email : '',
    hostVerified: isApproved,
    idType: isApproved ? row.id_type : 'Verification Pending',
    title: isApproved ? `${city} — Community 2W Charger` : `New 2W Charger Request — ${city}`,
    city,
    area: city,
    landmark: isApproved ? (row.address || 'Verified community charging host') : 'Application submitted — pending admin review',
    socketType: row.connector_type || '2W charger / 16A socket',
    powerOutput: row.power_level || '3.3 kW AC',
    supportedVehicles: [],
    rateDisplay: Number.isFinite(rate) ? `₹${rate}/hr` : 'Rate under review',
    rateAmount: Number.isFinite(rate) ? rate : 0,
    availabilityStatus: isApproved ? 'available_now' : 'scheduled',
    availableTiming: isApproved ? `${row.time_from || '07:00'} – ${row.time_to || '22:00'}` : 'Available after approval',
    days: row.available_days || [],
    amenities: isApproved ? ['Verified Host'] : ['Admin Review Pending'],
    notes: isApproved
      ? (row.description || 'Two-wheeler charging spot available.')
      : 'This charger rental request is visible while it is reviewed by the VoltaicOS team.',
    rating: isApproved ? 5 : 0,
    reviewsCount: 0,
    totalSessionsCompleted: 0,
  };
}

apiRouter.get('/charger-listings/public', async (req, res) => {
  try {
    let listings = db.getChargerListings ? db.getChargerListings() : [];
    if (isSupabaseServerConfigured) {
      const { data, error } = await supabaseServer
        .from('host_chargers')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const remoteIds = new Set(data.map((row) => row.id));
        const remoteListings = data.map(mapPublicHostChargerRow);
        const localOnly = listings
          .filter((listing) => !remoteIds.has(listing.id))
          .map((listing) => {
            const coords = (Number.isFinite(Number(listing.lat)) && Number.isFinite(Number(listing.lng)))
              ? { lat: Number(listing.lat), lng: Number(listing.lng) }
              : getCityCoordinates(listing.city, String(listing.id || ''));
            return {
              ...listing,
              lat: coords.lat,
              lng: coords.lng,
              listingStatus: listing.listingStatus || 'pending_review',
            };
          });
        listings = [...remoteListings, ...localOnly];
      }
    } else {
      listings = listings.map((listing) => {
        const coords = (Number.isFinite(Number(listing.lat)) && Number.isFinite(Number(listing.lng)))
          ? { lat: Number(listing.lat), lng: Number(listing.lng) }
          : getCityCoordinates(listing.city, String(listing.id || ''));
        return {
          ...listing,
          lat: coords.lat,
          lng: coords.lng,
          listingStatus: listing.listingStatus || 'pending_review',
        };
      });
    }
    return res.json({ listings, count: listings.length });
  } catch (err) {
    console.error('GET /charger-listings/public error:', err);
    return res.status(500).json({ error: 'Failed to fetch public charger listings' });
  }
});

apiRouter.post('/charger-listings', writeLimiter, requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const id = `HOST-${Date.now()}`;
    const listingUserId = req.user?.id || null;
    const str = (v, max) => String(v ?? '').trim().slice(0, max);
    const cleanPhone = String(body.phone ?? '').replace(/\D/g, '').slice(0, 10);
    const cleanEmail = str(body.email, 80).toLowerCase();

    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Contact number must be a valid 10-digit Indian mobile number.' });
    }
    if (cleanEmail && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Strict 2-Wheeler validation: reject car models, car chargers, and 4-wheeler references
    if (
      CAR_KEYWORDS_RE.test(body.chargerBrand || '') ||
      CAR_KEYWORDS_RE.test(body.chargerDescription || '') ||
      CAR_KEYWORDS_RE.test(body.connectorType || '')
    ) {
      return res.status(400).json({
        error: 'VoltaicOS Rent My Charger strictly hosts EV 2-wheeler (bike/scooter) chargers. EV car chargers and 4-wheeler models are not permitted.'
      });
    }

    const coords = (Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lng)))
      ? { lat: Number(body.lat), lng: Number(body.lng) }
      : getCityCoordinates(body.city, id);

    const newListing = {
      id,
      status: 'approved',
      submittedAt: new Date().toISOString(),
      userId: listingUserId, // from verified token — never trust the client-supplied id
      lat: coords.lat,
      lng: coords.lng,
      fullName: str(body.fullName, 60),
      email: cleanEmail,
      phone: cleanPhone,
      address: str(body.address, 120),
      city: str(body.city, 50),
      pincode: String(body.pincode ?? '').replace(/\D/g, '').slice(0, 6),
      chargerBrand: str(body.chargerBrand, 60),
      connectorType: str(body.connectorType, 40),
      powerLevel: str(body.powerLevel, 40),
      pricePerUnit: str(body.pricePerUnit, 8),
      maxSessions: str(body.maxSessions, 3),
      chargerDescription: str(body.chargerDescription, 300),
      supportedVehicles: Array.isArray(body.supportedVehicles) ? body.supportedVehicles.map((v) => str(v, 80)) : [],
      selectedDays: Array.isArray(body.selectedDays) ? body.selectedDays.filter((d) => DAYS_SET.has(d)).slice(0, 7) : [],
      timeFrom: /^\d{2}:\d{2}$/.test(body.timeFrom) ? body.timeFrom : '',
      timeTo: /^\d{2}:\d{2}$/.test(body.timeTo) ? body.timeTo : '',
      minBookingHours: str(body.minBookingHours, 4),
      advanceNoticeHours: str(body.advanceNoticeHours, 4),
      idType: str(body.idType, 30),
      idNumber: str(body.idNumber, 20).toUpperCase(),
    };

    // Save to in-memory DB
    if (db.addChargerListing) {
      db.addChargerListing(newListing);
    }

    if (isSupabaseServerConfigured) {
      try {
        await supabaseServer.from('host_chargers').insert([{
          id,
          user_id: listingUserId,
          full_name: newListing.fullName,
          phone: newListing.phone,
          email: newListing.email,
          address: newListing.address,
          city: newListing.city,
          pincode: newListing.pincode,
          charger_brand: newListing.chargerBrand,
          power_level: newListing.powerLevel,
          connector_type: newListing.connectorType,
          price_per_unit: parseFloat(newListing.pricePerUnit) || 15.0,
          max_sessions: parseInt(newListing.maxSessions, 10) || 4,
          description: newListing.chargerDescription,
          available_days: newListing.selectedDays,
          time_from: newListing.timeFrom,
          time_to: newListing.timeTo,
          min_booking_hours: parseInt(newListing.minBookingHours, 10) || 1,
          advance_notice_hours: parseInt(newListing.advanceNoticeHours, 10) || 0,
          id_type: newListing.idType,
          id_number: newListing.idNumber,
           status: 'approved',
        }]);
      } catch (sbErr) {
        console.warn('Could not mirror host listing to Supabase host_chargers:', sbErr);
      }
    }

    // Create a corresponding alert so it surfaces in Incident Feed
    const listingAlert = {
      id: `alt_${Date.now()}`,
      type: 'host_application',
      severity: 'low',
      station: `New Host Application — ${newListing.city || 'Unknown City'}`,
      city: newListing.city || 'India',
      msg: `${newListing.fullName || 'A user'} submitted a charger listing for ${newListing.address || 'an address'} in ${newListing.city || 'an unknown city'}. Connector: ${newListing.connectorType || '—'} · Power: ${newListing.powerLevel || '—'} · ₹${newListing.pricePerUnit || '—'}/kWh. Ref: ${id}.`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
    };
    if (db.addAlert) db.addAlert(listingAlert);

    return res.status(201).json({ message: 'Charger listing application submitted', listing: newListing });
  } catch (err) {
    console.error('POST /charger-listings error:', err);
    return res.status(500).json({ error: 'Failed to save charger listing' });
  }
});

apiRouter.get('/charger-listings', requireAuth, async (req, res) => {
  try {
    const caller = req.user;
    const admin = isAdminUser(caller);
    let listings = db.getChargerListings ? db.getChargerListings() : [];

    // The file-backed store is ephemeral on serverless deployments. Read the
    // persistent Supabase copy as well so every new host request is visible in
    // Admin, regardless of which function instance handles the request.
    if (isSupabaseServerConfigured) {
      const { data, error } = await supabaseServer
        .from('host_chargers')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const remoteIds = new Set(data.map((row) => row.id));
        listings = [...data.map(mapHostChargerRow), ...listings.filter((listing) => !remoteIds.has(listing.id))];
      }
    }

    if (!admin) {
      // Host applications contain PII — users may only see their own
      listings = listings.filter((l) => l.userId && l.userId === caller.id);
    } else {
      const userId = cleanString(req.query.userId ?? '', 80);
      if (userId) listings = listings.filter((l) => l.userId === userId);
    }
    return res.json({ listings, count: listings.length });
  } catch (err) {
    console.error('GET /charger-listings error:', err);
    return res.status(500).json({ error: 'Failed to fetch charger listings' });
  }
});

const REVIEW_STATUSES = new Set(['approved', 'on_hold', 'denied', 'pending_review']);
const REVIEW_LABELS = {
  approved: 'approved',
  on_hold: 'put on hold',
  denied: 'denied',
  pending_review: 'moved back to pending review',
};

// Admin approve / hold / deny a charger hosting application — admin role required
apiRouter.patch('/charger-listings/:id/status', writeLimiter, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    const reviewerEmail = req.user?.email || 'admin';
    const cleanStatus = String(status || '').trim().toLowerCase();

    if (!REVIEW_STATUSES.has(cleanStatus)) {
      return res.status(400).json({ error: 'Invalid status. Use one of: approved, on_hold, denied, pending_review.' });
    }

    const listing = db.updateChargerListingStatus(req.params.id, cleanStatus, {
      reviewedBy: reviewerEmail,
    });

    if (!listing) {
      if (!isSupabaseServerConfigured) {
        return res.status(404).json({ error: 'Charger listing not found' });
      }
    }

    if (isSupabaseServerConfigured) {
      const supabaseStatus = cleanStatus === 'denied' ? 'rejected' : cleanStatus;
      const { error } = await supabaseServer
        .from('host_chargers')
        .update({ status: supabaseStatus })
        .eq('id', req.params.id);
      if (error && !listing) {
        return res.status(404).json({ error: 'Charger listing not found' });
      }
    }

    // Surface the decision in the Incident Feed / alerts
    if (cleanStatus !== 'pending_review' && listing) {
      const actionLabel = REVIEW_LABELS[cleanStatus];
      const alertType = cleanStatus === 'approved' ? 'host_approved' : cleanStatus === 'denied' ? 'host_denied' : 'host_hold';
      const severity = cleanStatus === 'denied' ? 'medium' : 'low';
      const statusWord = cleanStatus === 'approved' ? 'Approved' : cleanStatus === 'denied' ? 'Denied' : 'On Hold';
      db.addAlert({
        type: alertType,
        severity,
        station: `Host Application ${statusWord} — ${listing.city || 'Unknown City'}`,
        city: listing.city || 'India',
        msg: `Charger listing ${listing.id} (${listing.chargerBrand || 'charger'} in ${listing.city || 'unknown city'}) was ${actionLabel} by an admin. Ref: ${listing.id}.`,
      });
    }

    return res.json({ message: `Listing ${REVIEW_LABELS[cleanStatus]}`, listing });
  } catch (err) {
    console.error('PATCH /charger-listings/:id/status error:', err);
    return res.status(500).json({ error: 'Failed to update charger listing status' });
  }
});
