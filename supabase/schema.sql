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
-- Threat model: the browser anon key is public knowledge. It may only:
--   * read stations (public network registry, no PII)
--   * read alerts (network ops feed, no PII)
--   * insert / read / update ONLY the caller's own row in public.users
--   * read ONLY the caller's own bookings
-- All other reads/writes (booking mutations, alert writes, host
-- applications, two-wheeler PII) happen server-side via the service role
-- key, which bypasses RLS. The API (server/apiRouter.js) additionally
-- enforces per-user authorization on every request.

alter table public.stations enable row level security;
alter table public.users enable row level security;
alter table public.bookings enable row level security;
alter table public.alerts enable row level security;
alter table public.two_wheeler_chargers enable row level security;
alter table public.two_wheeler_bookings enable row level security;
alter table public.host_chargers enable row level security;

-- Drop any legacy permissive policies (idempotent — safe to re-run)
drop policy if exists "Allow public read on stations" on public.stations;
drop policy if exists "Allow public read on alerts" on public.alerts;
drop policy if exists "Allow public read on two_wheeler_chargers" on public.two_wheeler_chargers;
drop policy if exists "Allow public insert on bookings" on public.bookings;
drop policy if exists "Allow public read on bookings" on public.bookings;
drop policy if exists "Allow public update on bookings" on public.bookings;
drop policy if exists "Allow public insert on two_wheeler_bookings" on public.two_wheeler_bookings;
drop policy if exists "Allow public read on two_wheeler_bookings" on public.two_wheeler_bookings;
drop policy if exists "Allow public insert on host_chargers" on public.host_chargers;
drop policy if exists "Allow public read on host_chargers" on public.host_chargers;
drop policy if exists "Allow public insert on users" on public.users;
drop policy if exists "Allow public read on users" on public.users;
drop policy if exists "Allow public update on users" on public.users;
drop policy if exists "Allow public resolve / dismiss on alerts" on public.alerts;
drop policy if exists "Allow public update on alerts" on public.alerts;
drop policy if exists "Allow public insert on alerts" on public.alerts;

-- Stations: public read (no PII). Writes only via service role.
create policy "stations_public_read" on public.stations
  for select using (true);

-- Alerts: public read of the network incident feed. NO public writes.
create policy "alerts_public_read" on public.alerts
  for select using (true);

-- two_wheeler_chargers: host PII (names, phones, emails) — no anon access.
-- two_wheeler_bookings: rider PII — no anon access.
-- host_chargers: applicant PII incl. ID numbers — no anon access.
-- Data is served exclusively through the API with the service role.

-- Users: each signed-in user can read/insert/update ONLY their own row.
create policy "users_insert_own" on public.users
  for insert with check (id = auth.uid()::text);
create policy "users_read_own" on public.users
  for select using (id = auth.uid()::text);
create policy "users_update_own" on public.users
  for update using (id = auth.uid()::text) with check (id = auth.uid()::text);

-- Bookings: a signed-in user may read ONLY their own reservations.
create policy "bookings_read_own" on public.bookings
  for select using (
    user_id = auth.uid()::text
    or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
-- No anonymous insert/update/delete policies on bookings:
-- reservations are created and cancelled through the API only.
