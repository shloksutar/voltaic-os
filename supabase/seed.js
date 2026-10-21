import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { REAL_STATIONS } from '../server/data/realStations.js';
import { DEFAULT_2W_CHARGERS } from '../src/data/twoWheelerChargers.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id')) {
  console.error('❌ Supabase credentials not found in environment.');
  console.error('Please configure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('⚡ Starting VoltaicOS Supabase Data Seeding...');

  // 1. Seed Real Stations
  console.log(`📡 Seeding ${REAL_STATIONS.length} real CPO charging stations...`);
  const stationsToInsert = REAL_STATIONS.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    operator: s.operator,
    ports: s.ports,
    available: s.available,
    busy: s.busy,
    offline: s.offline,
    speed: s.speed,
    status: s.status,
    wait_min: s.waitMin,
    tariff_per_kwh: s.tariffPerKwh,
    reservation_fee: s.reservationFee,
    connectors: s.connectors,
    amenities: s.amenities,
    hours: s.hours,
  }));

  const { error: stationsErr } = await supabase
    .from('stations')
    .upsert(stationsToInsert, { onConflict: 'id' });

  if (stationsErr) {
    console.error('❌ Failed to seed stations:', stationsErr.message);
  } else {
    console.log('✅ Stations successfully seeded.');
  }

  // 2. Seed 2-Wheeler Community Chargers
  console.log(`🛵 Seeding ${DEFAULT_2W_CHARGERS.length} 2-wheeler community chargers...`);
  const chargers2WToInsert = DEFAULT_2W_CHARGERS.map((c) => ({
    id: c.id,
    is_community_2w: true,
    host_name: c.hostName,
    host_phone: c.hostPhone,
    host_email: c.hostEmail,
    host_verified: c.hostVerified,
    id_type: c.idType,
    title: c.title,
    city: c.city,
    area: c.area,
    address: c.address,
    landmark: c.landmark,
    lat: c.lat,
    lng: c.lng,
    socket_type: c.socketType,
    power_output: c.powerOutput,
    supported_vehicles: c.supportedVehicles,
    tariff_mode: c.tariffMode,
    rate_display: c.rateDisplay,
    rate_amount: c.rateAmount,
    availability_status: c.availabilityStatus,
    available_timing: c.availableTiming,
    days: c.days,
    amenities: c.amenities,
    notes: c.notes,
    rating: c.rating,
    reviews_count: c.reviewsCount,
    total_sessions_completed: c.totalSessionsCompleted,
  }));

  const { error: chargers2WErr } = await supabase
    .from('two_wheeler_chargers')
    .upsert(chargers2WToInsert, { onConflict: 'id' });

  if (chargers2WErr) {
    console.error('❌ Failed to seed 2W chargers:', chargers2WErr.message);
  } else {
    console.log('✅ 2-Wheeler chargers successfully seeded.');
  }

  // 3. Seed Demo User
  console.log('👤 Seeding demo driver user...');
  const demoUser = {
    id: 'usr_demo_01',
    name: 'Demo Driver',
    email: 'driver@voltaicos.io',
    phone: '+91 98765 43210',
    auth_provider: 'email',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    vehicle_model: 'Tata Nexon EV Max',
    license_plate: 'MH 02 EK 9912',
  };

  const { error: userErr } = await supabase
    .from('users')
    .upsert([demoUser], { onConflict: 'id' });

  if (userErr) {
    console.error('❌ Failed to seed demo user:', userErr.message);
  } else {
    console.log('✅ Demo user seeded.');
  }

  // 4. Seed Initial Alerts
  console.log('🚨 Seeding initial incident alerts...');
  const initialAlerts = [
    {
      id: 'alt_001',
      type: 'reservation',
      severity: 'low',
      station: 'Tata Power EZ Charge — Jio World Convention Centre',
      city: 'Mumbai',
      msg: 'Active slot reservation confirmed for Bay #2 (CCS2 150 kW). Vehicle MH 02 EK 9912.',
      time: 'Just now',
      resolved: false,
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
    },
  ];

  const { error: alertsErr } = await supabase
    .from('alerts')
    .upsert(initialAlerts, { onConflict: 'id' });

  if (alertsErr) {
    console.error('❌ Failed to seed alerts:', alertsErr.message);
  } else {
    console.log('✅ Alerts successfully seeded.');
  }

  console.log('\n🎉 VoltaicOS Supabase database seeding complete!');
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
