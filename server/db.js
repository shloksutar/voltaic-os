import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REAL_STATIONS } from './data/realStations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'database.json');

// Ensure directory exists
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function getInitialData() {
  return {
    stations: JSON.parse(JSON.stringify(REAL_STATIONS)),
    users: [
      {
        id: 'usr_demo_01',
        name: 'Demo Driver',
        email: 'driver@voltaicos.io',
        phone: '+91 98765 43210',
        authProvider: 'email',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        vehicleModel: 'Tata Nexon EV Max',
        licensePlate: 'MH 02 EK 9912',
        createdAt: new Date().toISOString(),
      },
    ],
    bookings: [
      {
        id: 'VOLT-8921',
        userId: 'usr_demo_01',
        userName: 'Demo Driver',
        userEmail: 'driver@voltaicos.io',
        userPhone: '+91 98765 43210',
        stationId: 'MUM-EZ-01',
        stationName: 'Tata Power EZ Charge — Jio World Convention Centre',
        city: 'Mumbai',
        bayNumber: 2,
        portType: 'CCS2 (150 kW DC Fast)',
        date: new Date().toISOString().split('T')[0],
        startTime: '16:00',
        durationMinutes: 45,
        vehicleNumber: 'MH 02 EK 9912',
        vehicleModel: 'Tata Nexon EV Max',
        tariffPerKwh: 19.5,
        reservationFee: 50,
        estimatedCost: 650,
        status: 'active',
        qrCodeData: 'VOLT-8921-MUM-EZ-01-BAY2',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
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
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing db.json:', err);
    }
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
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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

  // OTP store
  saveOtp(phone, code) {
    if (!this.data.otps) this.data.otps = {};
    this.data.otps[phone] = {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };
    this.write();
  }

  verifyOtp(phone, code) {
    if (!this.data.otps || !this.data.otps[phone]) {
      // Allow test code 123456 or 654321
      return code === '123456' || code === '654321';
    }
    const entry = this.data.otps[phone];
    if (Date.now() > entry.expiresAt) {
      delete this.data.otps[phone];
      this.write();
      return false;
    }
    const isValid = entry.code === code || code === '123456';
    if (isValid) {
      delete this.data.otps[phone];
      this.write();
    }
    return isValid;
  }
}

export const db = new Database();
