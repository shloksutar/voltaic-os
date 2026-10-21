import { Router } from 'express';
import { db } from './db.js';
import { supabaseServer, isSupabaseServerConfigured } from './supabase.js';

export const apiRouter = Router();

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
  const { email, password, name, phone, vehicleModel, licensePlate } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (isSupabaseServerConfigured) {
    const { data: existing } = await supabaseServer
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      phone: phone || '',
      auth_provider: 'email',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
      vehicle_model: vehicleModel || 'Tata Nexon EV Max',
      license_plate: licensePlate || 'MH 02 EV 1001',
    };

    const { data, error } = await supabaseServer.from('users').insert([newUser]).select().single();
    if (error) return res.status(500).json({ error: error.message });

    const user = mapUser(data);
    return res.status(201).json({ message: 'Account created successfully', user, token: `token_${user.id}` });
  }

  // Fallback: JSON db
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
  });

  return res.status(201).json({ message: 'Account created successfully', user, token: `token_${user.id}` });
});

// Login with Email
apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  if (isSupabaseServerConfigured) {
    let { data: row } = await supabaseServer
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!row) {
      // Auto-create for demo onboarding
      const newUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: email.split('@')[0],
        email: email.toLowerCase(),
        auth_provider: 'email',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
        vehicle_model: 'Tata Nexon EV Max',
        license_plate: 'MH 02 EV 1001',
      };
      const { data: created } = await supabaseServer.from('users').insert([newUser]).select().single();
      row = created;
    }

    const user = mapUser(row);
    return res.json({ message: 'Logged in successfully', user, token: `token_${user.id}` });
  }

  let user = db.getUserByEmail(email);
  if (!user) {
    user = db.createUser({
      name: email.split('@')[0],
      email,
      authProvider: 'email',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
      vehicleModel: 'Tata Nexon EV Max',
      licensePlate: 'MH 02 EV 1001',
    });
  }
  return res.json({ message: 'Logged in successfully', user, token: `token_${user.id}` });
});

// Google Sign-In / Sign-Up
apiRouter.post('/auth/google', async (req, res) => {
  const { email, name, avatar, googleId } = req.body;
  if (!email) return res.status(400).json({ error: 'Google email is required' });

  if (isSupabaseServerConfigured) {
    let { data: row } = await supabaseServer
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!row) {
      const newUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: name || 'Google User',
        email: email.toLowerCase(),
        auth_provider: 'google',
        avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
        vehicle_model: 'MG ZS EV',
        license_plate: 'DL 01 EV 4421',
      };
      const { data: created } = await supabaseServer.from('users').insert([newUser]).select().single();
      row = created;
    }

    const user = mapUser(row);
    return res.json({ message: 'Google Sign-In successful', user, token: `token_${user.id}` });
  }

  let user = db.getUserByEmail(email);
  if (!user) {
    user = db.createUser({
      name: name || 'Google User',
      email,
      googleId: googleId || `g_${Date.now()}`,
      authProvider: 'google',
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
      vehicleModel: 'MG ZS EV',
      licensePlate: 'DL 01 EV 4421',
    });
  }
  return res.json({ message: 'Google Sign-In successful', user, token: `token_${user.id}` });
});

// Phone Send OTP
apiRouter.post('/auth/phone/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.trim().length < 8) {
    return res.status(400).json({ error: 'Valid phone number is required' });
  }

  const code = '654321';
  db.saveOtp(phone, code);

  return res.json({
    success: true,
    message: `Verification code sent to ${phone}`,
    testOtp: code,
    expiresInSeconds: 300,
  });
});

// Phone Verify OTP
apiRouter.post('/auth/phone/verify-otp', async (req, res) => {
  const { phone, otp, name, vehicleModel, licensePlate } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP code are required' });

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
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: name || `EV Driver (${phone.slice(-4)})`,
        phone,
        email: `${cleanPhone}@phone.voltaicos.io`,
        auth_provider: 'phone',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(phone)}`,
        vehicle_model: vehicleModel || 'Hyundai Ioniq 5',
        license_plate: licensePlate || 'KA 03 EV 8899',
      };
      const { data: created } = await supabaseServer.from('users').insert([newUser]).select().single();
      row = created;
    }

    const user = mapUser(row);
    return res.json({ message: 'Phone verified successfully', user, token: `token_${user.id}` });
  }

  let user = db.getUserByPhone(phone);
  if (!user) {
    user = db.createUser({
      name: name || `EV Driver (${phone.slice(-4)})`,
      phone,
      email: `${phone.replace(/[^0-9]/g, '')}@phone.voltaicos.io`,
      authProvider: 'phone',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(phone)}`,
      vehicleModel: vehicleModel || 'Hyundai Ioniq 5',
      licensePlate: licensePlate || 'KA 03 EV 8899',
    });
  }
  return res.json({ message: 'Phone verified successfully', user, token: `token_${user.id}` });
});

// Current User
apiRouter.get('/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.json({ user: null });

  const token = authHeader.replace('Bearer ', '');
  const userId = token.replace('token_', '');

  if (isSupabaseServerConfigured) {
    const { data: row } = await supabaseServer.from('users').select('*').eq('id', userId).maybeSingle();
    return res.json({ user: row ? mapUser(row) : null });
  }

  const user = db.getUserById(userId);
  return res.json({ user: user || null });
});

// Update Profile
apiRouter.patch('/auth/profile', async (req, res) => {
  const { userId, name, vehicleModel, licensePlate, phone } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

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

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ user: mapUser(data) });
  }

  const updated = db.updateUser(userId, { name, vehicleModel, licensePlate, phone });
  return res.json({ user: updated });
});

// Logout
apiRouter.post('/auth/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out' });
});

// ==========================================
// 2. STATIONS & TELEMETRY ROUTES
// ==========================================

// Get All Stations
apiRouter.get('/stations', async (req, res) => {
  const { city, operator, status, search } = req.query;

  if (isSupabaseServerConfigured) {
    let query = supabaseServer.from('stations').select('*').order('city');

    if (city && city !== 'All Cities') query = query.ilike('city', city);
    if (operator && operator !== 'All Operators') query = query.eq('operator', operator);
    if (status && status !== 'All') query = query.eq('status', status);
    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%,operator.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

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

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Station not found' });
    return res.json({ station: mapStation(data) });
  }

  const station = db.getStation(req.params.id);
  if (!station) return res.status(404).json({ error: 'Station not found' });
  return res.json({ station });
});

// Report Incident on Station
apiRouter.post('/stations/:id/report', async (req, res) => {
  const { type, msg, reporterName, bayNumber } = req.body;

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
    if (error) return res.status(500).json({ error: error.message });
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
apiRouter.get('/bookings', async (req, res) => {
  const { userId } = req.query;

  if (isSupabaseServerConfigured) {
    let query = supabaseServer.from('bookings').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const bookings = (data || []).map(mapBooking);
    return res.json({ bookings, count: bookings.length });
  }

  const bookings = db.getBookings(userId);
  return res.json({ bookings, count: bookings.length });
});

// Get Single Booking
apiRouter.get('/bookings/:id', async (req, res) => {
  if (isSupabaseServerConfigured) {
    const { data, error } = await supabaseServer
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Reservation not found' });
    return res.json({ booking: mapBooking(data) });
  }

  const booking = db.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Reservation not found' });
  return res.json({ booking });
});

// Create Slot Reservation
apiRouter.post('/bookings', async (req, res) => {
  const {
    stationId,
    bayNumber,
    portType,
    date,
    startTime,
    durationMinutes,
    vehicleNumber,
    vehicleModel,
    userId,
    userName,
    userEmail,
    userPhone,
  } = req.body;

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

    const duration = Number(durationMinutes) || 45;
    const estimatedKwh = Math.round((station.speed * (duration / 60)) * 0.7);
    const energyCost = Math.round(estimatedKwh * (station.tariffPerKwh || 19.5));
    const reservationFee = station.reservationFee || 50;
    const estimatedCost = energyCost + reservationFee;
    const bookingId = `VOLT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking = {
      id: bookingId,
      user_id: userId || null,
      user_name: userName || 'EV Driver',
      user_email: userEmail || '',
      user_phone: userPhone || '',
      station_id: stationId,
      station_name: station.name,
      city: station.city,
      bay_number: bayNumber || 1,
      port_type: portType || 'CCS2 DC Fast',
      date: date || new Date().toISOString().split('T')[0],
      start_time: startTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration_minutes: duration,
      vehicle_number: vehicleNumber || 'MH 02 EV 1234',
      vehicle_model: vehicleModel || 'Tata Nexon EV Max',
      tariff_per_kwh: station.tariffPerKwh || 19.5,
      reservation_fee: reservationFee,
      estimated_cost: estimatedCost,
      status: 'active',
      qr_code_data: `${bookingId}-${stationId}-BAY${bayNumber || 1}`,
    };

    const { data: createdBooking, error: bookingErr } = await supabaseServer
      .from('bookings')
      .insert([newBooking])
      .select()
      .single();

    if (bookingErr) return res.status(500).json({ error: bookingErr.message });

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
      msg: `Slot reserved by ${userName || 'Driver'} (${vehicleNumber || 'EV'}). Bay #${bayNumber || 1} reserved for ${duration} mins.`,
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

  const duration = Number(durationMinutes) || 45;
  const estimatedKwh = Math.round((station.speed * (duration / 60)) * 0.7);
  const energyCost = Math.round(estimatedKwh * (station.tariffPerKwh || 19.5));
  const reservationFee = station.reservationFee || 50;
  const estimatedCost = energyCost + reservationFee;

  const booking = db.createBooking({
    stationId,
    stationName: station.name,
    city: station.city,
    address: station.address,
    bayNumber: bayNumber || 1,
    portType: portType || 'CCS2 DC Fast',
    date: date || new Date().toISOString().split('T')[0],
    startTime: startTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    durationMinutes: duration,
    estimatedKwh,
    tariffPerKwh: station.tariffPerKwh || 19.5,
    reservationFee,
    estimatedCost,
    vehicleNumber: vehicleNumber || 'MH 02 EV 1234',
    vehicleModel: vehicleModel || 'Tata Nexon EV Max',
    userId: userId || 'guest',
    userName: userName || 'EV Driver',
    userEmail: userEmail || '',
    userPhone: userPhone || '',
  });

  return res.status(201).json({ message: 'Slot reserved successfully', booking });
});

// Cancel Reservation
apiRouter.patch('/bookings/:id/cancel', async (req, res) => {
  if (isSupabaseServerConfigured) {
    const { data: existing } = await supabaseServer
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Reservation not found' });

    const { data, error } = await supabaseServer
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

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

    if (error) return res.status(500).json({ error: error.message });
    const alerts = (data || []).map(mapAlert);
    return res.json({ alerts, count: alerts.length });
  }

  const alerts = db.getAlerts();
  return res.json({ alerts, count: alerts.length });
});

apiRouter.post('/alerts', async (req, res) => {
  if (isSupabaseServerConfigured) {
    const newAlert = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
      ...req.body,
    };
    const { data, error } = await supabaseServer.from('alerts').insert([newAlert]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ alert: mapAlert(data) });
  }

  const alert = db.addAlert(req.body);
  return res.status(201).json({ alert });
});

apiRouter.patch('/alerts/:id/resolve', async (req, res) => {
  if (isSupabaseServerConfigured) {
    const { data, error } = await supabaseServer
      .from('alerts')
      .update({ resolved: true })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Alert not found' });
    return res.json({ message: 'Alert marked as resolved', alert: mapAlert(data) });
  }

  const alert = db.resolveAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  return res.json({ message: 'Alert marked as resolved', alert });
});

apiRouter.delete('/alerts/:id', async (req, res) => {
  if (isSupabaseServerConfigured) {
    const { data, error } = await supabaseServer
      .from('alerts')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
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
    if (error) return res.status(500).json({ error: error.message });
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
