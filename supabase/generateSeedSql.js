import fs from 'fs';
import { REAL_STATIONS } from '../server/data/realStations.js';
import { DEFAULT_2W_CHARGERS } from '../src/data/twoWheelerChargers.js';

let sql = '-- ============================================================\n';
sql += '-- VoltaicOS Supabase Initial Seed Data\n';
sql += '-- Run this in Supabase SQL Editor after running schema.sql\n';
sql += '-- ============================================================\n\n';

const esc = (str) => (str ? "'" + String(str).replace(/'/g, "''") + "'" : 'NULL');
const json = (obj) => "'" + JSON.stringify(obj || []).replace(/'/g, "''") + "'::jsonb";

// 1. Stations
sql += '-- 1. Verified CPO Stations\n';
sql += 'INSERT INTO public.stations (id, name, city, address, lat, lng, operator, ports, available, busy, offline, speed, status, wait_min, tariff_per_kwh, reservation_fee, connectors, amenities, hours) VALUES\n';
const stationRows = REAL_STATIONS.map((s) => {
  return `(${esc(s.id)}, ${esc(s.name)}, ${esc(s.city)}, ${esc(s.address)}, ${s.lat}, ${s.lng}, ${esc(s.operator)}, ${s.ports}, ${s.available}, ${s.busy}, ${s.offline}, ${s.speed}, ${esc(s.status)}, ${s.waitMin}, ${s.tariffPerKwh}, ${s.reservationFee}, ${json(s.connectors)}, ${json(s.amenities)}, ${esc(s.hours)})`;
}).join(',\n');
sql += stationRows + '\nON CONFLICT (id) DO NOTHING;\n\n';

// 2. 2W Community Chargers
sql += '-- 2. Two-Wheeler Community Chargers\n';
sql += 'INSERT INTO public.two_wheeler_chargers (id, is_community_2w, host_name, host_phone, host_email, host_verified, id_type, title, city, area, address, landmark, lat, lng, socket_type, power_output, supported_vehicles, tariff_mode, rate_display, rate_amount, availability_status, available_timing, days, amenities, notes, rating, reviews_count, total_sessions_completed) VALUES\n';
const twRows = DEFAULT_2W_CHARGERS.map((c) => {
  return `(${esc(c.id)}, true, ${esc(c.hostName)}, ${esc(c.hostPhone)}, ${esc(c.hostEmail)}, ${c.hostVerified}, ${esc(c.idType)}, ${esc(c.title)}, ${esc(c.city)}, ${esc(c.area)}, ${esc(c.address)}, ${esc(c.landmark)}, ${c.lat}, ${c.lng}, ${esc(c.socketType)}, ${esc(c.powerOutput)}, ${json(c.supportedVehicles)}, ${esc(c.tariffMode)}, ${esc(c.rateDisplay)}, ${c.rateAmount}, ${esc(c.availabilityStatus)}, ${esc(c.availableTiming)}, ${json(c.days)}, ${json(c.amenities)}, ${esc(c.notes)}, ${c.rating}, ${c.reviewsCount}, ${c.totalSessionsCompleted})`;
}).join(',\n');
sql += twRows + '\nON CONFLICT (id) DO NOTHING;\n\n';

// 3. Demo User
sql += '-- 3. Demo Driver User\n';
sql += `INSERT INTO public.users (id, name, email, phone, auth_provider, avatar, vehicle_model, license_plate) VALUES
('usr_demo_01', 'Demo Driver', 'driver@voltaicos.io', '+91 98765 43210', 'email', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', 'Tata Nexon EV Max', 'MH 02 EK 9912')
ON CONFLICT (id) DO NOTHING;\n\n`;

// 4. Initial Alerts
sql += '-- 4. Initial Incident Alerts\n';
sql += `INSERT INTO public.alerts (id, type, severity, station, city, msg, time, resolved) VALUES
('alt_001', 'reservation', 'low', 'Tata Power EZ Charge — Jio World Convention Centre', 'Mumbai', 'Active slot reservation confirmed for Bay #2 (CCS2 150 kW). Vehicle MH 02 EK 9912.', 'Just now', false),
('alt_002', 'offline', 'high', 'Ather Grid Fast Point — Infiniti Mall', 'Mumbai', '3 ports offline due to upstream grid phase fluctuation. Maintenance ticket #8843 dispatched.', '18 mins ago', false),
('alt_003', 'queue', 'medium', 'Tata Power EV Hub — Aerocity Worldmark 1', 'Delhi', 'High demand surge detected. 7 of 10 bays active. Average wait time ~18 mins.', '35 mins ago', false)
ON CONFLICT (id) DO NOTHING;\n`;

fs.writeFileSync('./supabase/seed.sql', sql, 'utf-8');
console.log('✅ Generated ./supabase/seed.sql successfully');
