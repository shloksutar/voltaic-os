-- ============================================================
-- Migration: RLS lockdown (idempotent, safe to re-run)
-- Run this in the Supabase SQL Editor on EXISTING deployments.
-- It replaces the permissive anon-key policies from schema.sql/deploy.sql.
-- ============================================================

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

-- Remove broad table privileges before adding the minimum browser privileges.
-- The API service-role key bypasses RLS and does not need these grants.
revoke all on public.users, public.bookings, public.two_wheeler_chargers,
  public.two_wheeler_bookings, public.host_chargers from anon;
revoke all on public.users, public.bookings, public.two_wheeler_chargers,
  public.two_wheeler_bookings, public.host_chargers from authenticated;
grant select on public.stations, public.alerts to anon, authenticated;
grant select, insert, update on public.users to authenticated;
grant select on public.bookings to authenticated;

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

-- High-traffic lookup indexes. These are idempotent and avoid sequential scans
-- for ownership, admin review, and newest-first feeds.
create index if not exists idx_bookings_user_email_lower on public.bookings (lower(user_email));
create index if not exists idx_bookings_created_at_desc on public.bookings (created_at desc);
create index if not exists idx_alerts_timestamp_desc on public.alerts (timestamp desc);
create index if not exists idx_users_email_lower on public.users (lower(email));
create index if not exists idx_host_chargers_user_id on public.host_chargers (user_id);
create index if not exists idx_host_chargers_status on public.host_chargers (status);
