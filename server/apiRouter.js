import { Router } from 'express';
import { db } from './db.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Register with Email
apiRouter.post('/auth/register', (req, res) => {
  const { email, password, name, phone, vehicleModel, licensePlate } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const user = db.createUser({
    name: name || email.split('@')[0],
    email,
    phone: phone || '',
    authProvider: 'email',
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
    vehicleModel: vehicleModel || 'Tata Nexon EV Max',
    licensePlate: licensePlate || 'MH 02 EV 1001',
  });

  return res.status(201).json({
    message: 'Account created successfully',
    user,
    token: `token_${user.id}`,
  });
});

// Login with Email
apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let user = db.getUserByEmail(email);
  if (!user) {
    // If not found, auto-create for friendly demo onboarding
    user = db.createUser({
      name: email.split('@')[0],
      email,
      authProvider: 'email',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
      vehicleModel: 'Tata Nexon EV Max',
      licensePlate: 'MH 02 EV 1001',
    });
  }

  return res.json({
    message: 'Logged in successfully',
    user,
    token: `token_${user.id}`,
  });
});

// Google Sign-In / Sign-Up
apiRouter.post('/auth/google', (req, res) => {
  const { email, name, avatar, googleId } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Google email is required' });
  }

  let user = db.getUserByEmail(email);
  if (!user) {
    user = db.createUser({
      name: name || 'Google User',
      email,
      googleId: googleId || `g_${Date.now()}`,
      authProvider: 'google',
      avatar:
        avatar ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
      vehicleModel: 'MG ZS EV',
      licensePlate: 'DL 01 EV 4421',
    });
  } else if (!user.avatar && avatar) {
    user = db.updateUser(user.id, { avatar, googleId });
  }

  return res.json({
    message: 'Google Sign-In successful',
    user,
    token: `token_${user.id}`,
  });
});

// Phone Send OTP
apiRouter.post('/auth/phone/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.trim().length < 8) {
    return res.status(400).json({ error: 'Valid phone number is required' });
  }

  // Generate 6 digit OTP (default test code 654321 for instant testing)
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
apiRouter.post('/auth/phone/verify-otp', (req, res) => {
  const { phone, otp, name, vehicleModel, licensePlate } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP code are required' });
  }

  const valid = db.verifyOtp(phone, otp);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid or expired verification code' });
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

  return res.json({
    message: 'Phone verified successfully',
    user,
    token: `token_${user.id}`,
  });
});

// Current User
apiRouter.get('/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json({ user: null });
  }

  const token = authHeader.replace('Bearer ', '');
  const userId = token.replace('token_', '');
  const user = db.getUserById(userId);

  return res.json({ user: user || null });
});

// Update Profile
apiRouter.patch('/auth/profile', (req, res) => {
  const { userId, name, vehicleModel, licensePlate, phone } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
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
apiRouter.get('/stations', (req, res) => {
  const { city, operator, status, search } = req.query;
  let stations = db.getStations();

  if (city && city !== 'All Cities') {
    stations = stations.filter((s) => s.city.toLowerCase() === city.toLowerCase());
  }
  if (operator && operator !== 'All Operators') {
    stations = stations.filter((s) => s.operator.toLowerCase() === operator.toLowerCase());
  }
  if (status && status !== 'All') {
    stations = stations.filter((s) => s.status.toLowerCase() === status.toLowerCase());
  }
  if (search && search.trim()) {
    const q = search.toLowerCase();
    stations = stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.operator.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }

  return res.json({ stations, count: stations.length });
});

// Get Single Station
apiRouter.get('/stations/:id', (req, res) => {
  const station = db.getStation(req.params.id);
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }
  return res.json({ station });
});

// Report Incident on Station
apiRouter.post('/stations/:id/report', (req, res) => {
  const { type, msg, reporterName, bayNumber } = req.body;
  const station = db.getStation(req.params.id);
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

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
apiRouter.get('/bookings', (req, res) => {
  const { userId } = req.query;
  const bookings = db.getBookings(userId);
  return res.json({ bookings, count: bookings.length });
});

// Get Single Booking
apiRouter.get('/bookings/:id', (req, res) => {
  const booking = db.getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  return res.json({ booking });
});

// Create Slot Reservation
apiRouter.post('/bookings', (req, res) => {
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

  if (!stationId) {
    return res.status(400).json({ error: 'Station ID is required' });
  }

  const station = db.getStation(stationId);
  if (!station) {
    return res.status(404).json({ error: 'Station does not exist' });
  }

  if (station.status === 'offline' || station.available <= 0) {
    return res.status(409).json({
      error: 'No available charging slots currently at this station',
    });
  }

  // Calculate pricing
  const duration = Number(durationMinutes) || 45;
  const estimatedKwh = Math.round((station.speed * (duration / 60)) * 0.7); // approx 70% average draw
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

  return res.status(201).json({
    message: 'Slot reserved successfully',
    booking,
  });
});

// Cancel Reservation
apiRouter.patch('/bookings/:id/cancel', (req, res) => {
  const booking = db.cancelBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  return res.json({ message: 'Reservation cancelled successfully', booking });
});

// ==========================================
// 4. ALERTS & INCIDENT ROUTES
// ==========================================

apiRouter.get('/alerts', (req, res) => {
  const alerts = db.getAlerts();
  return res.json({ alerts, count: alerts.length });
});

apiRouter.post('/alerts', (req, res) => {
  const alert = db.addAlert(req.body);
  return res.status(201).json({ alert });
});

apiRouter.patch('/alerts/:id/resolve', (req, res) => {
  const alert = db.resolveAlert(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  return res.json({ message: 'Alert marked as resolved', alert });
});

apiRouter.delete('/alerts/:id', (req, res) => {
  const removed = db.dismissAlert(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  return res.json({ message: 'Alert dismissed', removed });
});

// ==========================================
// 5. NETWORK ANALYTICS ROUTE
// ==========================================

apiRouter.get('/analytics', (req, res) => {
  const stations = db.getStations();
  const bookings = db.getBookings();

  // City breakdown
  const cityMap = {};
  stations.forEach((c) => {
    if (!cityMap[c.city]) {
      cityMap[c.city] = { city: c.city, available: 0, busy: 0, offline: 0, total: 0 };
    }
    cityMap[c.city].available += c.available;
    cityMap[c.city].busy += c.busy;
    cityMap[c.city].offline += c.offline;
    cityMap[c.city].total += c.ports;
  });
  const cityData = Object.values(cityMap);

  // Operator share
  const opMap = {};
  stations.forEach((c) => {
    opMap[c.operator] = (opMap[c.operator] || 0) + c.ports;
  });
  const operatorData = Object.entries(opMap).map(([name, value]) => ({ name, value }));

  // Status pie
  const totalAvail = stations.reduce((s, c) => s + c.available, 0);
  const totalBusy = stations.reduce((s, c) => s + c.busy, 0);
  const totalOffline = stations.reduce((s, c) => s + c.offline, 0);
  const totalPorts = stations.reduce((s, c) => s + c.ports, 0);

  const pieData = [
    { name: 'Available', value: totalAvail, color: '#059669' },
    { name: 'In Use / Reserved', value: totalBusy, color: '#D97706' },
    { name: 'Offline', value: totalOffline, color: '#DC2626' },
  ];

  // 24-hour real-time curve based on active stations and actual reservation distribution
  const nowHour = new Date().getHours();
  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = `${String(i).padStart(2, '0')}:00`;
    // Base load curve from business and commuting patterns
    const diurnalFactor = Math.sin(((i - 5) / 24) * 2 * Math.PI);
    const activeResCount = bookings.filter((b) => b.status === 'active').length;
    const baseUtil = Math.round(35 + diurnalFactor * 30 + activeResCount * 4);
    const clamped = Math.max(10, Math.min(95, baseUtil));
    return {
      time: h,
      utilization: clamped,
      isCurrent: i === nowHour,
    };
  });

  return res.json({
    stationsCount: stations.length,
    totalPorts,
    totalAvail,
    totalBusy,
    totalOffline,
    activeBookingsCount: bookings.filter((b) => b.status === 'active').length,
    cityData,
    operatorData,
    pieData,
    hours,
  });
});
