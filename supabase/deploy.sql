/* ========================================================
   VoltaicOS — Full Supabase Database Deployment Script
   Tables + RLS Policies + Indexes + Real Indian CPO Seed Data
   ======================================================== */

-- ============================================================
-- VoltaicOS Complete Supabase Database Schema
-- Run this script in the Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste & Run
-- ============================================================

-- Enable UUID extension if needed
create extension if not exists "uuid-ossp";

-- 1. STATIONS TABLE (Primary CPO Registry)
create table if not exists public.stations (
  id text primary key,
  name text not null,
  city text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  operator text not null,
  ports integer not null default 1,
  available integer not null default 0,
  busy integer not null default 0,
  offline integer not null default 0,
  speed integer not null default 50,
  status text not null check (status in ('available', 'busy', 'offline')),
  wait_min integer not null default 0,
  tariff_per_kwh numeric(6, 2) not null default 19.50,
  reservation_fee numeric(6, 2) not null default 50.00,
  connectors jsonb default '[]'::jsonb,
  amenities jsonb default '[]'::jsonb,
  hours text default '24 Hours Open',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for lightning fast queries
create index if not exists idx_stations_city on public.stations (city);
create index if not exists idx_stations_operator on public.stations (operator);
create index if not exists idx_stations_status on public.stations (status);

-- 2. USERS TABLE (Driver Profiles)
create table if not exists public.users (
  id text primary key,
  name text not null,
  email text,
  phone text,
  auth_provider text default 'email',
  avatar text,
  vehicle_model text,
  license_plate text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_users_phone on public.users (phone);
create index if not exists idx_users_email on public.users (email);

-- 3. BOOKINGS TABLE (Station Slot Reservations)
create table if not exists public.bookings (
  id text primary key,
  user_id text references public.users(id) on delete set null,
  user_name text,
  user_email text,
  user_phone text,
  station_id text references public.stations(id) on delete cascade,
  station_name text not null,
  city text not null,
  bay_number integer not null,
  port_type text not null,
  date date not null default current_date,
  start_time text not null,
  duration_minutes integer not null default 45,
  vehicle_number text not null,
  vehicle_model text,
  tariff_per_kwh numeric(6, 2) default 19.50,
  reservation_fee numeric(6, 2) default 50.00,
  estimated_cost numeric(8, 2) default 0.00,
  status text not null check (status in ('active', 'completed', 'cancelled')) default 'active',
  qr_code_data text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_bookings_user_id on public.bookings (user_id);
create index if not exists idx_bookings_station_id on public.bookings (station_id);
create index if not exists idx_bookings_status on public.bookings (status);

-- 4. ALERTS TABLE (Live Incident Feed)
create table if not exists public.alerts (
  id text primary key,
  type text not null check (type in ('reservation', 'offline', 'queue', 'ice')),
  severity text not null check (severity in ('low', 'medium', 'high')),
  station text not null,
  city text not null,
  msg text not null,
  time text default 'Just now',
  resolved boolean default false,
  timestamp bigint default (extract(epoch from now()) * 1000)::bigint,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_alerts_resolved on public.alerts (resolved);
create index if not exists idx_alerts_type on public.alerts (type);

-- 5. TWO-WHEELER COMMUNITY CHARGERS TABLE
create table if not exists public.two_wheeler_chargers (
  id text primary key,
  is_community_2w boolean default true,
  host_name text not null,
  host_phone text not null,
  host_email text,
  host_verified boolean default true,
  id_type text,
  title text not null,
  city text not null,
  area text not null,
  address text not null,
  landmark text,
  lat double precision not null,
  lng double precision not null,
  socket_type text not null,
  power_output text default '3.3 kW AC',
  supported_vehicles jsonb default '[]'::jsonb,
  tariff_mode text default 'hourly',
  rate_display text default '₹25/hr',
  rate_amount numeric(6, 2) default 25.00,
  availability_status text not null default 'available_now' check (availability_status in ('available_now', 'busy_now', 'offline')),
  available_timing text default '07:00 AM – 11:00 PM Daily',
  days jsonb default '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb,
  amenities jsonb default '[]'::jsonb,
  notes text,
  rating numeric(3, 2) default 4.8,
  reviews_count integer default 0,
  total_sessions_completed integer default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_2w_city on public.two_wheeler_chargers (city);
create index if not exists idx_2w_availability on public.two_wheeler_chargers (availability_status);

-- 6. TWO-WHEELER BOOKINGS TABLE
create table if not exists public.two_wheeler_bookings (
  id text primary key,
  charger_id text references public.two_wheeler_chargers(id) on delete cascade,
  charger_title text not null,
  host_name text not null,
  host_phone text not null,
  address text not null,
  rider_name text not null,
  rider_phone text not null,
  scooter_model text not null,
  scooter_number text not null,
  arrival_time text not null,
  duration_hours numeric(4, 2) not null default 1.0,
  estimated_cost numeric(6, 2) not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 7. HOST CHARGER APPLICATIONS (Rent My Charger Form)
create table if not exists public.host_chargers (
  id text primary key default ('host_' || substring(md5(random()::text) from 1 for 10)),
  user_id text,
  full_name text not null,
  phone text not null,
  email text not null,
  address text not null,
  city text not null,
  pincode text,
  charger_brand text,
  power_level text not null,
  connector_type text not null,
  price_per_unit numeric(6, 2) not null,
  max_sessions integer default 4,
  description text,
  available_days jsonb default '[]'::jsonb,
  time_from text,
  time_to text,
  min_booking_hours integer default 1,
  advance_notice_hours integer default 0,
  id_type text,
  id_number text,
  status text default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
alter table public.stations enable row level security;
alter table public.users enable row level security;
alter table public.bookings enable row level security;
alter table public.alerts enable row level security;
alter table public.two_wheeler_chargers enable row level security;
alter table public.two_wheeler_bookings enable row level security;
alter table public.host_chargers enable row level security;

-- Public read access for stations, alerts, and 2-wheeler chargers
create policy "Allow public read on stations" on public.stations
  for select using (true);

create policy "Allow public read on alerts" on public.alerts
  for select using (true);

create policy "Allow public read on two_wheeler_chargers" on public.two_wheeler_chargers
  for select using (true);

-- Allow public insert/read on bookings (drivers can book and read their reservations)
create policy "Allow public insert on bookings" on public.bookings
  for insert with check (true);

create policy "Allow public read on bookings" on public.bookings
  for select using (true);

create policy "Allow public update on bookings" on public.bookings
  for update using (true);

-- Allow public insert/read on 2W bookings
create policy "Allow public insert on two_wheeler_bookings" on public.two_wheeler_bookings
  for insert with check (true);

create policy "Allow public read on two_wheeler_bookings" on public.two_wheeler_bookings
  for select using (true);

-- Allow public insert on host applications
create policy "Allow public insert on host_chargers" on public.host_chargers
  for insert with check (true);

create policy "Allow public read on host_chargers" on public.host_chargers
  for select using (true);

-- Users policies
create policy "Allow public insert on users" on public.users
  for insert with check (true);

create policy "Allow public read on users" on public.users
  for select using (true);

create policy "Allow public update on users" on public.users
  for update using (true);

-- Allow public resolve / dismiss on alerts
create policy "Allow public update on alerts" on public.alerts
  for update using (true);

create policy "Allow public insert on alerts" on public.alerts
  for insert with check (true);


-- ============================================================
-- VoltaicOS Supabase Initial Seed Data
-- Run this in Supabase SQL Editor after running schema.sql
-- ============================================================

-- 1. Verified CPO Stations
INSERT INTO public.stations (id, name, city, address, lat, lng, operator, ports, available, busy, offline, speed, status, wait_min, tariff_per_kwh, reservation_fee, connectors, amenities, hours) VALUES
('MUM-EZ-01', 'Tata Power EZ Charge — Jio World Convention Centre', 'Mumbai', 'G Block BKC, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400098', 19.0633, 72.8687, 'Tata Power EV', 8, 5, 3, 0, 150, 'available', 0, 19.5, 50, '[{"bay":1,"type":"CCS2 (150 kW DC Fast)","status":"available"},{"bay":2,"type":"CCS2 (150 kW DC Fast)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW DC Fast)","status":"available"},{"bay":4,"type":"CCS2 (60 kW DC Fast)","status":"busy"},{"bay":5,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":7,"type":"Bharat DC001 (15 kW)","status":"available"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["24/7 Security","Jio World Food Court","Covered Parking","Restrooms","Free Wi-Fi"]'::jsonb, '24 Hours Open'),
('MUM-CZ-02', 'ChargeZone Supercharging Hub — Phoenix Marketcity', 'Mumbai', 'LBS Marg, Kurla West, Mumbai, Maharashtra 400070', 19.0864, 72.889, 'ChargeZone', 6, 2, 4, 0, 120, 'busy', 15, 21, 40, '[{"bay":1,"type":"CCS2 (120 kW Dual)","status":"busy"},{"bay":2,"type":"CCS2 (120 kW Dual)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW)","status":"available"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Mall Parking Basement P2","Food Court","Cinema","Wheelchair Access"]'::jsonb, '10:00 AM - 11:00 PM'),
('MUM-JIO-03', 'Jio-bp pulse Fast Charging — Airport T2 Hub', 'Mumbai', 'Terminal 2 Multi-Level Car Park, Chhatrapati Shivaji Maharaj International Airport, Sahar, Mumbai 400099', 19.0968, 72.8745, 'BPCL EV', 10, 7, 3, 0, 240, 'available', 0, 22.5, 60, '[{"bay":1,"type":"CCS2 Ultra (240 kW)","status":"available"},{"bay":2,"type":"CCS2 Ultra (240 kW)","status":"available"},{"bay":3,"type":"CCS2 (120 kW)","status":"available"},{"bay":4,"type":"CCS2 (120 kW)","status":"busy"},{"bay":5,"type":"CCS2 (60 kW)","status":"available"},{"bay":6,"type":"CCS2 (60 kW)","status":"available"},{"bay":7,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"busy"},{"bay":9,"type":"CHAdeMO (50 kW)","status":"available"},{"bay":10,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Valet Assistance","Airport Lounge","24/7 Security","Coffee Shop"]'::jsonb, '24 Hours Open'),
('MUM-ST-04', 'Statiq EV Station — R City Mall', 'Mumbai', 'Amrut Nagar, LBS Marg, Ghatkopar West, Mumbai, Maharashtra 400086', 19.0997, 72.9168, 'Statiq', 6, 3, 3, 0, 60, 'available', 0, 18, 30, '[{"bay":1,"type":"CCS2 (60 kW)","status":"available"},{"bay":2,"type":"CCS2 (60 kW)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW)","status":"available"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Mall Parking Level -1","Restrooms","Shopping","Dining"]'::jsonb, '10:00 AM - 11:00 PM'),
('MUM-ATH-05', 'Ather Grid Fast Point — Infiniti Mall', 'Mumbai', 'New Link Road, Mindspace, Malad West, Mumbai, Maharashtra 400064', 19.1834, 72.8344, 'Ather Grid', 4, 0, 1, 3, 7, 'offline', -1, 15, 20, '[{"bay":1,"type":"Ather Grid Dot (7.4 kW)","status":"busy"},{"bay":2,"type":"Ather Grid Dot (7.4 kW)","status":"offline"},{"bay":3,"type":"Type 2 AC (7.4 kW)","status":"offline"},{"bay":4,"type":"Type 2 AC (7.4 kW)","status":"offline"}]'::jsonb, '["Covered Two-Wheeler Bay","Mall Food Court"]'::jsonb, '10:30 AM - 10:30 PM'),
('DEL-ST-01', 'Statiq Supercharging Hub — Connaught Place Outer Circle', 'Delhi', 'Block P, Outer Circle, Connaught Place, New Delhi, Delhi 110001', 28.6315, 77.2167, 'Statiq', 12, 8, 4, 0, 150, 'available', 0, 19, 50, '[{"bay":1,"type":"CCS2 (150 kW DC Fast)","status":"available"},{"bay":2,"type":"CCS2 (150 kW DC Fast)","status":"available"},{"bay":3,"type":"CCS2 (120 kW)","status":"available"},{"bay":4,"type":"CCS2 (120 kW)","status":"busy"},{"bay":5,"type":"CCS2 (60 kW)","status":"available"},{"bay":6,"type":"CCS2 (60 kW)","status":"busy"},{"bay":7,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":9,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":10,"type":"Type 2 AC (22 kW)","status":"busy"},{"bay":11,"type":"Bharat DC001 (15 kW)","status":"available"},{"bay":12,"type":"Bharat DC001 (15 kW)","status":"busy"}]'::jsonb, '["NDMC Dedicated EV Bays","Metro Connectivity (Barakhamba)","Cafes & ATM"]'::jsonb, '24 Hours Open'),
('DEL-TP-02', 'Tata Power EV Hub — Aerocity Worldmark 1', 'Delhi', 'Asset Area 8, Hospitality District, Delhi Aerocity, Indira Gandhi International Airport, New Delhi 110037', 28.5492, 77.1215, 'Tata Power EV', 10, 3, 7, 0, 120, 'busy', 18, 20.5, 45, '[{"bay":1,"type":"CCS2 (120 kW)","status":"busy"},{"bay":2,"type":"CCS2 (120 kW)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW)","status":"available"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"CCS2 (60 kW)","status":"available"},{"bay":6,"type":"CCS2 (60 kW)","status":"busy"},{"bay":7,"type":"Type 2 AC (22 kW)","status":"busy"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":9,"type":"Type 2 AC (22 kW)","status":"busy"},{"bay":10,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Worldmark Food Capital","Basement Valet","24/7 CCTV","Lounge"]'::jsonb, '24 Hours Open'),
('DEL-EV-03', 'EVCS India — Select Citywalk Mall', 'Delhi', 'A-3, District Centre, Saket, New Delhi, Delhi 110017', 28.5284, 77.2195, 'EVCS India', 8, 4, 3, 1, 60, 'available', 0, 18.5, 35, '[{"bay":1,"type":"CCS2 (60 kW)","status":"available"},{"bay":2,"type":"CCS2 (60 kW)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW)","status":"available"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":7,"type":"Type 2 AC (22 kW)","status":"busy"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"offline"}]'::jsonb, '["P1 Level Charging Zone","Cinema","Starbucks","Valet"]'::jsonb, '10:00 AM - 11:30 PM'),
('DEL-HP-04', 'HPCL EV Power Hub — IGI Airport T3 Cargo', 'Delhi', 'Near Cargo Gate 6, Indira Gandhi International Airport T3, New Delhi 110037', 28.5562, 77.0999, 'HPCL EV', 14, 9, 5, 0, 240, 'available', 0, 22, 50, '[{"bay":1,"type":"CCS2 Ultra (240 kW)","status":"available"},{"bay":2,"type":"CCS2 Ultra (240 kW)","status":"available"},{"bay":3,"type":"CCS2 (150 kW)","status":"available"},{"bay":4,"type":"CCS2 (150 kW)","status":"busy"},{"bay":5,"type":"CCS2 (60 kW)","status":"available"},{"bay":6,"type":"CCS2 (60 kW)","status":"busy"},{"bay":7,"type":"CCS2 (60 kW)","status":"available"},{"bay":8,"type":"CCS2 (60 kW)","status":"busy"},{"bay":9,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":10,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":11,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":12,"type":"Type 2 AC (22 kW)","status":"busy"},{"bay":13,"type":"Bharat DC001 (15 kW)","status":"available"},{"bay":14,"type":"Bharat DC001 (15 kW)","status":"busy"}]'::jsonb, '["Commercial Fleet Priority","Driver Rest Area","Convenience Store","Air Pump"]'::jsonb, '24 Hours Open'),
('BLR-ZN-01', 'Zeon Charging Superhub — Forum South Bangalore', 'Bengaluru', 'Kanakapura Road, Konanakunte, Bengaluru, Karnataka 560062', 12.8885, 77.5684, 'ChargeZone', 8, 6, 2, 0, 120, 'available', 0, 20, 40, '[{"bay":1,"type":"CCS2 (120 kW Dual)","status":"available"},{"bay":2,"type":"CCS2 (120 kW Dual)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW)","status":"available"},{"bay":4,"type":"CCS2 (60 kW)","status":"available"},{"bay":5,"type":"CCS2 (60 kW)","status":"busy"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":7,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"available"}]'::jsonb, '["Metro Station Link","Mall Dining","Security","Restrooms"]'::jsonb, '24 Hours Open'),
('BLR-TP-02', 'Tata Power EZ Charge — ITPL Main Gate Whitefield', 'Bengaluru', 'International Tech Park Bangalore, Pattandur Agrahara, Whitefield, Bengaluru 560066', 12.9856, 77.7347, 'Tata Power EV', 10, 2, 8, 0, 150, 'busy', 22, 19.5, 50, '[{"bay":1,"type":"CCS2 (150 kW)","status":"busy"},{"bay":2,"type":"CCS2 (150 kW)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW)","status":"busy"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"CCS2 (60 kW)","status":"busy"},{"bay":6,"type":"CCS2 (60 kW)","status":"busy"},{"bay":7,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"busy"},{"bay":9,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":10,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Tech Park Visitors Parking","Cafeteria","Wi-Fi","24/7 Security"]'::jsonb, '24 Hours Open'),
('BLR-ATH-03', 'Ather Grid Fast Point — 100ft Road Indiranagar', 'Bengaluru', '777/A, 100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038', 12.9719, 77.6412, 'Ather Grid', 6, 5, 1, 0, 22, 'available', 0, 16, 25, '[{"bay":1,"type":"Ather Grid Fast Point (22 kW)","status":"available"},{"bay":2,"type":"Ather Grid Fast Point (22 kW)","status":"busy"},{"bay":3,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":4,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":5,"type":"Type 2 AC (7.4 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (7.4 kW)","status":"available"}]'::jsonb, '["Kerbside High Street","Coffee Shops","Boutique Stores"]'::jsonb, '24 Hours Open'),
('BLR-BP-04', 'BPCL e-Drive — Electronic City Phase 1', 'Bengaluru', 'Hosur Main Road, Electronic City Phase 1, Bengaluru, Karnataka 560100', 12.8452, 77.6602, 'BPCL EV', 8, 6, 2, 0, 60, 'available', 0, 18, 30, '[{"bay":1,"type":"CCS2 (60 kW)","status":"available"},{"bay":2,"type":"CCS2 (60 kW)","status":"available"},{"bay":3,"type":"CCS2 (60 kW)","status":"busy"},{"bay":4,"type":"CCS2 (60 kW)","status":"available"},{"bay":5,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"busy"},{"bay":7,"type":"Bharat DC001 (15 kW)","status":"available"},{"bay":8,"type":"Bharat DC001 (15 kW)","status":"available"}]'::jsonb, '["Highway In & Out","BPCL Ghar In&Out Store","Tyre Pressure Check"]'::jsonb, '24 Hours Open'),
('HYD-TP-01', 'Tata Power EZ Charge — Cyber Towers Hitec City', 'Hyderabad', 'Hitec City Main Road, Madhapur, Hyderabad, Telangana 500081', 17.4504, 78.3808, 'Tata Power EV', 10, 7, 3, 0, 150, 'available', 0, 19.5, 50, '[{"bay":1,"type":"CCS2 (150 kW)","status":"available"},{"bay":2,"type":"CCS2 (150 kW)","status":"available"},{"bay":3,"type":"CCS2 (60 kW)","status":"available"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"CCS2 (60 kW)","status":"available"},{"bay":6,"type":"CCS2 (60 kW)","status":"busy"},{"bay":7,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":9,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":10,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Cyber Gateway Metro Link","IT Corridor Access","Food Outlets","ATM"]'::jsonb, '24 Hours Open'),
('HYD-CZ-02', 'ChargeZone Fast Hub — Inorbit Mall Raidurg', 'Hyderabad', 'Inorbit Mall Road, Mindspace, APIIC Software Layout, Madhapur, Hyderabad 500081', 17.4343, 78.3867, 'ChargeZone', 6, 1, 5, 0, 60, 'busy', 25, 20, 40, '[{"bay":1,"type":"CCS2 (60 kW)","status":"busy"},{"bay":2,"type":"CCS2 (60 kW)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW)","status":"busy"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Lake View Food Court","Basement Parking","Cinemas"]'::jsonb, '10:00 AM - 11:00 PM'),
('PUN-TP-01', 'Tata Power EZ Charge — Quadron Business Park Hinjawadi', 'Pune', 'Plot No. 28, Rajiv Gandhi Infotech Park, Hinjawadi Phase 2, Pune, Maharashtra 411057', 18.5913, 73.7389, 'Tata Power EV', 12, 9, 3, 0, 120, 'available', 0, 19, 45, '[{"bay":1,"type":"CCS2 (120 kW Dual)","status":"available"},{"bay":2,"type":"CCS2 (120 kW Dual)","status":"available"},{"bay":3,"type":"CCS2 (60 kW)","status":"available"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"CCS2 (60 kW)","status":"available"},{"bay":6,"type":"CCS2 (60 kW)","status":"busy"},{"bay":7,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":9,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":10,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":11,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":12,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Business Park Campus","Security Checkpoint","Food Plaza"]'::jsonb, '24 Hours Open'),
('PUN-ST-02', 'Statiq Hub — Phoenix Marketcity Viman Nagar', 'Pune', 'S. No. 207, Viman Nagar Road, Clover Park, Viman Nagar, Pune, Maharashtra 411014', 18.5621, 73.9168, 'Statiq', 6, 2, 4, 0, 60, 'busy', 12, 18.5, 35, '[{"bay":1,"type":"CCS2 (60 kW)","status":"busy"},{"bay":2,"type":"CCS2 (60 kW)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW)","status":"available"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Airport Road Access","Mall P1 Basement","Cafes"]'::jsonb, '10:00 AM - 11:00 PM'),
('CHE-ZN-01', 'Zeon Charging Hub — Phoenix Marketcity Velachery', 'Chennai', '142, Velachery Road, Indira Gandhi Nagar, Velachery, Chennai, Tamil Nadu 600042', 12.9918, 80.2173, 'EVCS India', 8, 5, 3, 0, 120, 'available', 0, 20, 45, '[{"bay":1,"type":"CCS2 (120 kW Dual)","status":"available"},{"bay":2,"type":"CCS2 (120 kW Dual)","status":"busy"},{"bay":3,"type":"CCS2 (60 kW)","status":"available"},{"bay":4,"type":"CCS2 (60 kW)","status":"busy"},{"bay":5,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":7,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":8,"type":"Type 2 AC (22 kW)","status":"busy"}]'::jsonb, '["Underground Charging Bays","Shopping","Restrooms","Security"]'::jsonb, '10:00 AM - 11:00 PM'),
('CHE-HP-02', 'HPCL EV Power Station — OMR Thoraipakkam', 'Chennai', 'Rajiv Gandhi Salai (OMR), Anand Nagar, Thoraipakkam, Chennai, Tamil Nadu 600097', 12.9416, 80.2355, 'HPCL EV', 8, 6, 2, 0, 100, 'available', 0, 18, 30, '[{"bay":1,"type":"CCS2 (100 kW)","status":"available"},{"bay":2,"type":"CCS2 (100 kW)","status":"available"},{"bay":3,"type":"CCS2 (50 kW)","status":"available"},{"bay":4,"type":"CCS2 (50 kW)","status":"busy"},{"bay":5,"type":"Type 2 AC (22 kW)","status":"available"},{"bay":6,"type":"Type 2 AC (22 kW)","status":"busy"},{"bay":7,"type":"Bharat DC001 (15 kW)","status":"available"},{"bay":8,"type":"Bharat DC001 (15 kW)","status":"available"}]'::jsonb, '["OMR Express Highway Frontage","24/7 Canopy","Convenience Store"]'::jsonb, '24 Hours Open')
ON CONFLICT (id) DO NOTHING;

-- 2. Two-Wheeler Community Chargers
INSERT INTO public.two_wheeler_chargers (id, is_community_2w, host_name, host_phone, host_email, host_verified, id_type, title, city, area, address, landmark, lat, lng, socket_type, power_output, supported_vehicles, tariff_mode, rate_display, rate_amount, availability_status, available_timing, days, amenities, notes, rating, reviews_count, total_sessions_completed) VALUES
('2w_blr_01', true, 'Vikram Sundaram', '9845123980', 'vikram.sundaram@gmail.com', true, 'Aadhaar Verified', 'Indiranagar 100ft Rd — Covered 16A Socket & Ather Dot', 'Bengaluru', 'Indiranagar', '#412, 12th Main Road, Indiranagar 2nd Stage', 'Opposite Glen''s Bakehouse, green gate with EV sign', 12.9784, 77.6408, '16A 3-Pin + Ather Dot', '3.3 kW Fast AC', '["Ather 450X / Apex","Ola S1 / Pro / Air","TVS iQube","Bajaj Chetak","Hero Vida"]'::jsonb, 'hourly', '₹25/hr', 25, 'available_now', '07:00 AM – 11:00 PM Daily', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb, '["Covered Parking","CCTV Monitored","Drinking Water","Ground Floor Access"]'::jsonb, 'Plug point is located on portico pillar right next to gate. Ring bell #4 if gate is closed.', 4.9, 42, 156),
('2w_mum_01', true, 'Priya Deshmukh', '9820154321', 'priya.deshmukh@yahoo.com', true, 'Driving Licence Verified', 'Bandra West — Dedicated Ola Companion & 16A Point', 'Mumbai', 'Bandra West', 'Flat 3B, Silver Beach Apts, Perry Cross Road, Bandra West', 'Behind St. Andrew Church, security guard at stilt parking', 19.0553, 72.8296, 'Ola Portable + 16A Socket', '3.3 kW AC', '["Ola S1 / Pro / Air","Ather 450X","TVS iQube","Bajaj Chetak","River Indie"]'::jsonb, 'hourly', '₹30/hr', 30, 'available_now', '08:00 AM – 10:30 PM Daily', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb, '["Stilt Parking","Security Guard on Duty","Tire Inflator available"]'::jsonb, 'Tell society guard you are here for Priya EV charging in Bay #6.', 4.8, 31, 114),
('2w_del_01', true, 'Amanpreet Singh', '9811098765', 'amanpreet.singh@outlook.com', true, 'Aadhaar Verified', 'Hauz Khas Enclave — High Amp 16A Fast Socket', 'Delhi', 'Hauz Khas', 'C-14, Hauz Khas Enclave, Main Outer Ring Road Service Lane', 'Near Hauz Khas Metro Gate 2, driveway with EV logo', 28.5494, 77.2001, '16A Industrial Weatherproof Socket', '3.3 kW AC', '["All 2-Wheeler EVs (Universal 16A 3-Pin)"]'::jsonb, 'hourly', '₹20/hr', 20, 'available_now', '06:30 AM – 11:30 PM Daily', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb, '["Wide Driveway","24/7 CCTV","Shaded Canopy","Emergency Tool Kit"]'::jsonb, 'Heavy duty MCB breaker installed. Extension cord available on request.', 5, 56, 210),
('2w_pun_01', true, 'Rohan Kulkarni', '9860432190', 'rohan.kulkarni@gmail.com', true, 'PAN Verified', 'Kothrud Paud Road — Ather & TVS iQube Ready Socket', 'Pune', 'Kothrud', 'Bunglow 12, Mayur Colony, Paud Road, Kothrud', 'Behind McDonald’s Kothrud, blue bungalow gate', 18.5074, 73.8077, 'Ather Dot + 16A Universal', '3.3 kW AC', '["Ather 450X","TVS iQube","Bajaj Chetak","Ola S1","Hero Vida"]'::jsonb, 'hourly', '₹20/hr', 20, 'available_now', '07:30 AM – 10:00 PM Daily', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb, '["Peaceful Residential Lane","Drinking Water","Wi-Fi Guest Access"]'::jsonb, 'Feel free to sit on the porch bench while your scooter charges.', 4.9, 39, 130),
('2w_hyd_01', true, 'Suresh Reddy', '9848011223', 'suresh.reddy@techhyd.com', true, 'Aadhaar Verified', 'Hitec City Phase 2 — 24/7 Accessible 16A Stilt Point', 'Hyderabad', 'Hitec City', 'Villa 44, Silicon County, Behind Cyber Towers, Hitec City', 'Gated community, inform guard you have an EV charging booking', 17.4474, 78.3762, '16A 3-Pin Weatherproof Socket', '3.3 kW AC', '["Ola S1 / Pro / Air","Ather 450X","TVS iQube","Simple One","Vida"]'::jsonb, 'hourly', '₹25/hr', 25, 'available_now', '24/7 Round the Clock', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb, '["24/7 Gated Security","Automatic Motion Lights","Free Wi-Fi"]'::jsonb, 'Socket switch is illuminated at night. Instant booking enabled.', 4.9, 64, 245),
('2w_chn_01', true, 'Karthik Subramanian', '9840198765', 'karthik.subbu@gmail.com', true, 'Passport Verified', 'Adyar Besant Nagar — Sea Breeze 16A Charging Spot', 'Chennai', 'Besant Nagar', '14/2, 4th Main Road, Besant Nagar (near Elliot’s Beach)', 'Opposite Cozee Restaurant lane, house with red brick facade', 13.0001, 78.2671, '16A 3-Pin + Bajaj Chetak Charger', '3.3 kW AC', '["Bajaj Chetak","TVS iQube","Ather 450X","Ola S1","Hero Vida"]'::jsonb, 'hourly', '₹22/hr', 22, 'available_now', '06:00 AM – 10:00 PM Daily', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb, '["Beachside Air","Covered Driveway","Chairs to relax","Drinking Water"]'::jsonb, 'Plug in and take a 3-minute walk to Elliot’s beach while your scooter charges!', 4.8, 28, 98),
('2w_blr_02', true, 'Deepa Nair', '9886055443', 'deepa.nair@startup.in', true, 'Aadhaar Verified', 'HSR Layout Sector 3 — Ola & Universal Fast AC Socket', 'Bengaluru', 'HSR Layout', '#789, 14th Main, Sector 3, HSR Layout', 'Near BDA Complex HSR, yellow boundary wall', 12.9116, 77.6389, '16A Weatherproof + Type 6', '3.3 kW AC', '["Ola S1 / Pro / Air","Ather 450X","TVS iQube","Hero Vida","Chetak"]'::jsonb, 'hourly', '₹25/hr', 25, 'available_now', '07:00 AM – 11:00 PM Daily', '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb, '["Covered Portico","CCTV Protected","Pressure Pump for Tires"]'::jsonb, 'Very friendly host! Socket is 1 meter above ground level with a hook for your cable.', 4.9, 45, 178)
ON CONFLICT (id) DO NOTHING;

-- 3. Demo Driver User
INSERT INTO public.users (id, name, email, phone, auth_provider, avatar, vehicle_model, license_plate) VALUES
('usr_demo_01', 'Demo Driver', 'driver@voltaicos.io', '+91 98765 43210', 'email', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', 'Tata Nexon EV Max', 'MH 02 EK 9912')
ON CONFLICT (id) DO NOTHING;

-- 4. Initial Incident Alerts
INSERT INTO public.alerts (id, type, severity, station, city, msg, time, resolved) VALUES
('alt_001', 'reservation', 'low', 'Tata Power EZ Charge — Jio World Convention Centre', 'Mumbai', 'Active slot reservation confirmed for Bay #2 (CCS2 150 kW). Vehicle MH 02 EK 9912.', 'Just now', false),
('alt_002', 'offline', 'high', 'Ather Grid Fast Point — Infiniti Mall', 'Mumbai', '3 ports offline due to upstream grid phase fluctuation. Maintenance ticket #8843 dispatched.', '18 mins ago', false),
('alt_003', 'queue', 'medium', 'Tata Power EV Hub — Aerocity Worldmark 1', 'Delhi', 'High demand surge detected. 7 of 10 bays active. Average wait time ~18 mins.', '35 mins ago', false)
ON CONFLICT (id) DO NOTHING;
