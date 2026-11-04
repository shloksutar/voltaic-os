import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'url';
import { REAL_STATIONS } from './data/realStations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/voltaic' : path.join(__dirname, 'data')));
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure directory exists
try {
  const dir = DATA_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
} catch {
  // Read-only filesystem in serverless environments
}

function getInitialData() {
  return {
    stations: JSON.parse(JSON.stringify(REAL_STATIONS)),
    users: [],
    bookings: [],
    charger_listings: [], // Host applications submitted via Rent My Charger
    sessions: {}, // opaque token -> { userId, expiresAt }
    alerts: [
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
    ],
    otps: {}, // phone -> { code, expiresAt }
  };
}

class Database {
  constructor() {
    this.data = this.read();
  }

  read() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('Error reading db.json, re-initializing:', err);
    }
    const init = getInitialData();
    this.write(init);
    return init;
  }

  write(data = this.data) {
    try {
      this.data = data;
      const tempFile = `${DB_FILE}.${process.pid}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tempFile, DB_FILE);
      // Best effort on Windows; enforced on POSIX deployments.
      try { fs.chmodSync(DB_FILE, 0o600); } catch { /* filesystem may not support modes */ }
    } catch (err) {
      console.error('Error writing db.json:', err);
    }
  }

  getFilePath() {
    return DB_FILE;
  }

  backupTo(destination) {
    const target = path.resolve(destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(DB_FILE, target);
    try { fs.chmodSync(target, 0o600); } catch { /* best effort on Windows */ }
    return target;
  }

  getStations() {
    return this.data.stations;
  }

  getStation(id) {
    return this.data.stations.find((s) => s.id === id);
  }

  updateStation(id, updates) {
    const idx = this.data.stations.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.data.stations[idx] = { ...this.data.stations[idx], ...updates };
      this.write();
      return this.data.stations[idx];
    }
    return null;
  }

  getUsers() {
    return this.data.users;
  }

  getUserById(id) {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email) {
    return this.data.users.find(
      (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
    );
  }

  getUserByPhone(phone) {
    const clean = phone.replace(/[^0-9]/g, '');
    return this.data.users.find(
      (u) => u.phone && u.phone.replace(/[^0-9]/g, '') === clean
    );
  }

  createUser(user) {
    const newUser = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...user,
    };
    this.data.users.push(newUser);
    this.write();
    return newUser;
  }

  updateUser(id, updates) {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      this.write();
      return this.data.users[idx];
    }
    return null;
  }

  getBookings(userId) {
    if (userId) {
      return this.data.bookings.filter((b) => b.userId === userId);
    }
    return this.data.bookings;
  }

  getBooking(id) {
    return this.data.bookings.find((b) => b.id === id);
  }

  createBooking(bookingData) {
    const id = `VOLT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking = {
      id,
      status: 'active',
      qrCodeData: `${id}-${bookingData.stationId}-BAY${bookingData.bayNumber || 1}`,
      createdAt: new Date().toISOString(),
      ...bookingData,
    };

    // Update station ports
    const station = this.getStation(bookingData.stationId);
    if (station && station.available > 0) {
      station.available = Math.max(0, station.available - 1);
      station.busy += 1;
      if (station.available === 0) {
        station.status = 'busy';
      }
      // Update specific bay connector if applicable
      if (bookingData.bayNumber && Array.isArray(station.connectors)) {
        const bay = station.connectors.find((c) => c.bay === Number(bookingData.bayNumber));
        if (bay) bay.status = 'busy';
      }
      this.updateStation(station.id, station);
    }

    this.data.bookings.unshift(newBooking);

    // Create a real alert
    this.addAlert({
      type: 'reservation',
      severity: 'low',
      station: station ? station.name : bookingData.stationName,
      city: station ? station.city : 'Mumbai',
      msg: `Slot reserved by ${bookingData.userName || 'Driver'} (${bookingData.vehicleNumber || 'EV'}). Bay #${bookingData.bayNumber || 1} reserved for ${bookingData.durationMinutes || 45} mins.`,
    });

    this.write();
    return newBooking;
  }

  cancelBooking(bookingId) {
    const booking = this.getBooking(bookingId);
    if (!booking) return null;

    booking.status = 'cancelled';
    booking.cancelledAt = new Date().toISOString();

    // Release slot on station
    const station = this.getStation(booking.stationId);
    if (station) {
      station.available = Math.min(station.ports, station.available + 1);
      station.busy = Math.max(0, station.busy - 1);
      if (station.available > 0 && station.status === 'busy') {
        station.status = 'available';
      }
      if (booking.bayNumber && Array.isArray(station.connectors)) {
        const bay = station.connectors.find((c) => c.bay === Number(booking.bayNumber));
        if (bay) bay.status = 'available';
      }
      this.updateStation(station.id, station);
    }

    this.addAlert({
      type: 'reservation',
      severity: 'low',
      station: station ? station.name : booking.stationName,
      city: station ? station.city : 'Mumbai',
      msg: `Reservation ${booking.id} cancelled. Port has been returned to available pool.`,
    });

    this.write();
    return booking;
  }

  getAlerts() {
    return this.data.alerts;
  }

  addAlert(alertData) {
    const newAlert = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      time: 'Just now',
      resolved: false,
      timestamp: Date.now(),
      ...alertData,
    };
    this.data.alerts.unshift(newAlert);
    if (this.data.alerts.length > 50) {
      this.data.alerts = this.data.alerts.slice(0, 50);
    }
    this.write();
    return newAlert;
  }

  resolveAlert(id) {
    const alert = this.data.alerts.find((a) => a.id === id);
    if (alert) {
      alert.resolved = true;
      this.write();
      return alert;
    }
    return null;
  }

  dismissAlert(id) {
    const idx = this.data.alerts.findIndex((a) => a.id === id);
    if (idx !== -1) {
      const removed = this.data.alerts.splice(idx, 1)[0];
      this.write();
      return removed;
    }
    return null;
  }

  // OTP store — codes are stored server-side only and expire after 5 minutes
  saveOtp(phone, code) {
    if (!this.data.otps) this.data.otps = {};
    this.data.otps[phone] = {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };
    this.write();
  }

  verifyOtp(phone, code) {
    if (!this.data.otps || !this.data.otps[phone]) return false;
    const entry = this.data.otps[phone];
    if (Date.now() > entry.expiresAt) {
      delete this.data.otps[phone];
      this.write();
      return false;
    }
    const isValid = typeof code === 'string' && entry.code === code;
    if (isValid) {
      delete this.data.otps[phone];
      this.write();
    }
    return isValid;
  }

  // Sessions (opaque token auth) — stores a minimal user snapshot
  createSession(token, user, expiresAt) {
    if (!this.data.sessions) this.data.sessions = {};
    // Opportunistically purge expired sessions
    const now = Date.now();
    for (const [t, s] of Object.entries(this.data.sessions)) {
      if (s.expiresAt <= now) delete this.data.sessions[t];
    }
    this.data.sessions[token] = { user, expiresAt };
    this.write();
  }

  getSession(token) {
    return (this.data.sessions || {})[token] || null;
  }

  deleteSession(token) {
    if (this.data.sessions && this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.write();
      return true;
    }
    return false;
  }

  // Charger Listings (host applications)
  getChargerListings(userId) {
    const all = this.data.charger_listings || [];
    return userId ? all.filter((l) => l.userId === userId) : all;
  }

  addChargerListing(listingData) {
    if (!this.data.charger_listings) this.data.charger_listings = [];
    const newListing = {
      submittedAt: new Date().toISOString(),
      status: 'pending_review',
      ...listingData,
    };
    this.data.charger_listings.unshift(newListing);
    this.write();
    return newListing;
  }

  updateChargerListingStatus(id, status, meta = {}) {
    const listing = (this.data.charger_listings || []).find((l) => l.id === id);
    if (listing) {
      listing.status = status;
      listing.reviewedAt = new Date().toISOString();
      if (meta.reviewedBy) listing.reviewedBy = meta.reviewedBy;
      listing.statusHistory = [
        ...(listing.statusHistory || []),
        { status, at: listing.reviewedAt, by: meta.reviewedBy || 'admin' },
      ];
      this.write();
      return listing;
    }
    return null;
  }
}

export const db = new Database();
