import { REAL_STATIONS } from '../../server/data/realStations.js';

const API_BASE = '/api';

const INITIAL_ALERTS = [
  {
    id: 'alt_001',
    type: 'reservation',
    severity: 'low',
    station: 'Tata Power EZ Charge — Jio World Convention Centre',
    city: 'Mumbai',
    msg: 'Active slot reservation confirmed for Bay #2 (CCS2 150 kW). Vehicle MH 02 EK 9912.',
    time: 'Just now',
    resolved: false,
    timestamp: Date.now(),
  },
  {
    id: 'alt_002',
    type: 'offline',
    severity: 'high',
    station: 'Ather Grid Fast Point — Infiniti Mall',
    city: 'Mumbai',
    msg: '3 ports offline due to upstream grid phase fluctuation. Maintenance ticket #8843 dispatched.',
    time: '18 mins ago',
    resolved: false,
    timestamp: Date.now() - 18 * 60 * 1000,
  },
  {
    id: 'alt_003',
    type: 'queue',
    severity: 'medium',
    station: 'Tata Power EV Hub — Aerocity Worldmark 1',
    city: 'Delhi',
    msg: 'High demand surge detected. 7 of 10 bays active. Average wait time ~18 mins.',
    time: '35 mins ago',
    resolved: false,
    timestamp: Date.now() - 35 * 60 * 1000,
  },
];

const INITIAL_BOOKINGS = [];

const INITIAL_USER = null;

// In-memory / localStorage helpers for offline/static resilience
function getStorageItem(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or disabled storage
  }
}

function getLocalStations() {
  return getStorageItem('voltaic_mock_stations', REAL_STATIONS);
}

function getLocalBookings() {
  const bookings = getStorageItem('voltaic_mock_bookings', INITIAL_BOOKINGS);
  const nonCancelled = bookings.filter((b) => b.status !== 'cancelled');
  if (nonCancelled.length !== bookings.length) {
    setStorageItem('voltaic_mock_bookings', nonCancelled);
  }
  return nonCancelled;
}

function getLocalAlerts() {
  return getStorageItem('voltaic_mock_alerts', INITIAL_ALERTS);
}

function getLocalUser() {
  return getStorageItem('voltaic_user', INITIAL_USER);
}

function getLocalChargerListings() {
  return getStorageItem('voltaic_charger_listings', []);
}

// Fallback execution when API endpoint returns 404 or server is unreachable
async function handleFallback(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const [pathOnly, qs] = endpoint.split('?');
  const params = new URLSearchParams(qs || '');
  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch {
      body = {};
    }
  }

  // 1. Stations
  if (pathOnly === '/stations') {
    let list = getLocalStations();
    const city = params.get('city');
    const operator = params.get('operator');
    const status = params.get('status');
    const search = params.get('search');

    if (city && city !== 'All Cities') list = list.filter((s) => s.city.toLowerCase() === city.toLowerCase());
    if (operator && operator !== 'All Operators') list = list.filter((s) => s.operator === operator);
    if (status && status !== 'All') list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          (s.address && s.address.toLowerCase().includes(q))
      );
    }
    return { stations: list, count: list.length };
  }

  // Station by id
  const stationMatch = pathOnly.match(/^\/stations\/([^/]+)$/);
  if (stationMatch && method === 'GET') {
    const id = stationMatch[1];
    const station = getLocalStations().find((s) => s.id === id);
    if (!station) throw new Error('Station not found');
    return { station };
  }

  // Station issue report
  const reportMatch = pathOnly.match(/^\/stations\/([^/]+)\/report$/);
  if (reportMatch && method === 'POST') {
    const id = reportMatch[1];
    const station = getLocalStations().find((s) => s.id === id);
    const alerts = getLocalAlerts();
    const newAlert = {
      id: `alt_${Date.now()}`,
      type: body.type || 'offline',
      severity: body.type === 'offline' ? 'high' : 'medium',
      station: station?.name || 'EV Station',
      city: station?.city || 'Mumbai',
      msg: body.msg || 'User reported issue',
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
    };
    setStorageItem('voltaic_mock_alerts', [newAlert, ...alerts]);
    return { message: 'Incident reported successfully', alert: newAlert };
  }

  // 2. Bookings
  if (pathOnly === '/bookings' && method === 'GET') {
    const userId = params.get('userId');
    const userEmail = params.get('userEmail');
    const userPhone = params.get('userPhone');
    let list = getLocalBookings();
    if (userEmail) {
      list = list.filter((b) => b.userEmail === userEmail);
    } else if (userPhone) {
      const cleanPhone = userPhone.replace(/[^0-9]/g, '').slice(-10);
      list = list.filter((b) => (b.userPhone || '').replace(/[^0-9]/g, '').includes(cleanPhone));
    } else if (userId) {
      list = list.filter((b) => b.userId === userId);
    }
    return { bookings: list, count: list.length };
  }

  if (pathOnly === '/bookings' && method === 'POST') {
    const bookings = getLocalBookings();
    const id = `VOLT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking = {
      id,
      status: 'active',
      qrCodeData: `${id}-${body.stationId || 'MUM'}-BAY${body.bayNumber || 1}`,
      createdAt: new Date().toISOString(),
      ...body,
    };
    setStorageItem('voltaic_mock_bookings', [newBooking, ...bookings]);

    // Also add reservation alert
    const alerts = getLocalAlerts();
    const resAlert = {
      id: `alt_${Date.now()}`,
      type: 'reservation',
      severity: 'low',
      station: body.stationName || 'EV Hub',
      city: 'Live Network',
      msg: `Active slot reservation confirmed for Bay #${body.bayNumber || 1} (${body.portType || 'Fast Charging'}). Vehicle ${body.vehicleNumber || 'EV'}.`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
    };
    setStorageItem('voltaic_mock_alerts', [resAlert, ...alerts]);

    return { message: 'Slot reserved successfully', booking: newBooking };
  }

  const cancelMatch = pathOnly.match(/^\/bookings\/([^/]+)\/cancel$/);
  if (cancelMatch && method === 'PATCH') {
    const id = cancelMatch[1];
    const bookings = getStorageItem('voltaic_mock_bookings', INITIAL_BOOKINGS);
    let updatedBooking = null;
    const nextBookings = bookings.filter((b) => {
      if (b.id === id) {
        updatedBooking = { ...b, status: 'cancelled' };
        return false;
      }
      return true;
    });
    setStorageItem('voltaic_mock_bookings', nextBookings);
    return { message: 'Reservation cancelled successfully', booking: updatedBooking };
  }

  // 3. Alerts
  if (pathOnly === '/alerts' && method === 'GET') {
    const alerts = getLocalAlerts();
    return { alerts, count: alerts.length };
  }

  if (pathOnly === '/alerts' && method === 'POST') {
    const alerts = getLocalAlerts();
    const newAlert = {
      id: `alt_${Date.now()}`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
      ...body,
    };
    setStorageItem('voltaic_mock_alerts', [newAlert, ...alerts]);
    return { alert: newAlert };
  }

  const resolveMatch = pathOnly.match(/^\/alerts\/([^/]+)\/resolve$/);
  if (resolveMatch && method === 'PATCH') {
    const id = resolveMatch[1];
    const alerts = getLocalAlerts();
    let resolvedAlert = null;
    const nextAlerts = alerts.map((a) => {
      if (a.id === id) {
        resolvedAlert = { ...a, resolved: true };
        return resolvedAlert;
      }
      return a;
    });
    setStorageItem('voltaic_mock_alerts', nextAlerts);
    return { message: 'Alert marked as resolved', alert: resolvedAlert };
  }

  const deleteAlertMatch = pathOnly.match(/^\/alerts\/([^/]+)$/);
  if (deleteAlertMatch && method === 'DELETE') {
    const id = deleteAlertMatch[1];
    const alerts = getLocalAlerts();
    const nextAlerts = alerts.filter((a) => a.id !== id);
    setStorageItem('voltaic_mock_alerts', nextAlerts);
    return { message: 'Alert dismissed', removed: true };
  }

  // 4. Analytics
  if (pathOnly === '/analytics' && method === 'GET') {
    const stations = getLocalStations();
    const bookings = getLocalBookings();
    const totalAvail = stations.reduce((s, c) => s + (c.available || 0), 0);
    const totalBusy = stations.reduce((s, c) => s + (c.busy || 0), 0);
    const totalOffline = stations.reduce((s, c) => s + (c.offline || 0), 0);
    const totalPorts = stations.reduce((s, c) => s + (c.ports || 0), 0);

    const cityMap = {};
    stations.forEach((c) => {
      if (!cityMap[c.city]) {
        cityMap[c.city] = { city: c.city, available: 0, busy: 0, offline: 0, total: 0 };
      }
      cityMap[c.city].available += (c.available || 0);
      cityMap[c.city].busy += (c.busy || 0);
      cityMap[c.city].offline += (c.offline || 0);
      cityMap[c.city].total += (c.ports || 0);
    });

    const opMap = {};
    stations.forEach((c) => {
      opMap[c.operator] = (opMap[c.operator] || 0) + (c.ports || 0);
    });

    const pieData = [
      { name: 'Available', value: totalAvail, color: '#059669' },
      { name: 'In Use / Reserved', value: totalBusy, color: '#D97706' },
      { name: 'Offline', value: totalOffline, color: '#DC2626' },
    ];

    return {
      stationsCount: stations.length,
      totalPorts,
      totalAvail,
      totalBusy,
      totalOffline,
      activeBookingsCount: bookings.filter((b) => b.status === 'active').length,
      cityData: Object.values(cityMap),
      operatorData: Object.entries(opMap).map(([name, value]) => ({ name, value })),
      pieData,
    };
  }

  // 5. Auth
  if (pathOnly === '/auth/login' || pathOnly === '/auth/register' || pathOnly === '/auth/google') {
    const chosenUsername = body.username || (body.name && !body.name.includes('@') ? body.name : null);
    const chosenName = chosenUsername || (body.name && !body.name.includes('@') ? body.name : 'EV Driver');
    const user = {
      id: body.id || `usr_${Date.now()}`,
      username: chosenUsername,
      name: chosenName,
      email: body.email || null,
      phone: body.phone || null,
      avatar: body.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chosenName)}`,
      vehicleModel: body.vehicleModel || 'Tata Nexon EV Max',
      licensePlate: body.licensePlate || 'MH 02 EV 1001',
    };
    try {
      localStorage.setItem('voltaic_token', `token_${user.id}`);
      localStorage.setItem('voltaic_user', JSON.stringify(user));
    } catch {}
    return { message: 'Authentication successful', user, token: `token_${user.id}` };
  }

  if (pathOnly === '/auth/phone/send-otp') {
    return { message: 'OTP sent to mobile', code: '123456' };
  }

  if (pathOnly === '/auth/phone/verify-otp') {
    const chosenUsername = body.username || (body.name && !body.name.includes('@') ? body.name : null);
    const chosenName = chosenUsername || (body.name && !body.name.includes('@') ? body.name : 'EV Driver');
    const user = {
      id: `usr_${Date.now()}`,
      username: chosenUsername,
      name: chosenName,
      email: null,
      phone: body.phone || null,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chosenName)}`,
      vehicleModel: body.vehicleModel || 'Tata Nexon EV Max',
      licensePlate: body.licensePlate || 'MH 02 EV 1001',
    };
    try {
      localStorage.setItem('voltaic_token', `token_${user.id}`);
      localStorage.setItem('voltaic_user', JSON.stringify(user));
    } catch {}
    return { message: 'OTP verified successfully', user, token: `token_${user.id}` };
  }

  if (pathOnly === '/auth/me') {
    const user = getLocalUser();
    return { user };
  }

  if (pathOnly === '/auth/profile') {
    const current = getLocalUser();
    const updated = { ...current, ...body };
    try {
      localStorage.setItem('voltaic_user', JSON.stringify(updated));
    } catch {}
    return { user: updated };
  }

  if (pathOnly === '/auth/logout') {
    try {
      localStorage.removeItem('voltaic_token');
    } catch {}
    return { message: 'Logged out successfully' };
  }

  // 6. Charger Listings (Rent My Charger applications)
  if (pathOnly === '/charger-listings' && method === 'POST') {
    const listings = getLocalChargerListings();
    const id = `HOST-${Date.now()}`;
    const newListing = {
      id,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      ...body,
    };
    setStorageItem('voltaic_charger_listings', [newListing, ...listings]);

    // Fire an alert so it's visible in the Alerts / Incident Feed
    const alerts = getLocalAlerts();
    const listingAlert = {
      id: `alt_${Date.now()}`,
      type: 'host_application',
      severity: 'low',
      station: `New Host Application — ${body.city || 'Unknown City'}`,
      city: body.city || 'India',
      msg: `${body.fullName || 'A user'} submitted a charger listing for ${body.address || 'an address'} in ${body.city || 'an unknown city'}. Connector: ${body.connectorType || '—'} · Power: ${body.powerLevel || '—'} · ₹${body.pricePerUnit || '—'}/kWh. Ref: ${id}.`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
    };
    setStorageItem('voltaic_mock_alerts', [listingAlert, ...alerts]);

    return { message: 'Charger listing application submitted', listing: newListing };
  }

  if (pathOnly === '/charger-listings' && method === 'GET') {
    const listings = getLocalChargerListings();
    const userId = params.get('userId');
    const result = userId ? listings.filter((l) => l.userId === userId) : listings;
    return { listings: result, count: result.length };
  }

  throw new Error(`Endpoint ${endpoint} not handled`);
}

async function request(endpoint, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('voltaic_token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // If endpoint returned 404 (route missing on static host / CDN), fallback seamlessly
    if (response.status === 404) {
      return await handleFallback(endpoint, options);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    // If backend is unreachable (network error or offline), execute client-side fallback
    if (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('404')) {
      return await handleFallback(endpoint, options);
    }
    throw err;
  }
}

// Stations API
export const stationsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.city && params.city !== 'All Cities') query.set('city', params.city);
    if (params.operator && params.operator !== 'All Operators') query.set('operator', params.operator);
    if (params.status && params.status !== 'All') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const qs = query.toString();
    return request(`/stations${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/stations/${id}`),
  reportIssue: (id, payload) =>
    request(`/stations/${id}/report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// Bookings API
export const bookingsApi = {
  getAll: (user) => {
    const query = new URLSearchParams();
    if (user?.id) query.set('userId', user.id);
    if (user?.email) query.set('userEmail', user.email);
    if (user?.phone) query.set('userPhone', user.phone);
    const qs = query.toString();
    return request(`/bookings${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/bookings/${id}`),
  create: (bookingData) =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),
  cancel: (id) =>
    request(`/bookings/${id}/cancel`, {
      method: 'PATCH',
    }),
};

// Auth API
export const authApi = {
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  google: (payload) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendPhoneOtp: (phone) =>
    request('/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  verifyPhoneOtp: (payload) =>
    request('/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => request('/auth/me'),
  updateProfile: (payload) =>
    request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
};

// Alerts API
export const alertsApi = {
  getAll: () => request('/alerts'),
  create: (alertData) =>
    request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    }),
  resolve: (id) =>
    request(`/alerts/${id}/resolve`, {
      method: 'PATCH',
    }),
  dismiss: (id) =>
    request(`/alerts/${id}`, {
      method: 'DELETE',
    }),
};

// Charger Listings API (Rent My Charger host applications)
export const chargerListingsApi = {
  create: (payload) =>
    request('/charger-listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAll: (userId) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request(`/charger-listings${qs}`);
  },
};

// Analytics API
export const analyticsApi = {
  get: () => request('/analytics'),
};
