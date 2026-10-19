// 2-Wheeler Community EV Charger Network Data & Storage Helpers
// Tailored specifically for electric two-wheelers (Ather, Ola, TVS iQube, Chetak, Vida, etc.)

export const DEFAULT_2W_CHARGERS = [
  {
    id: '2w_blr_01',
    isCommunity2W: true,
    hostName: 'Vikram Sundaram',
    hostPhone: '9845123980',
    hostEmail: 'vikram.sundaram@gmail.com',
    hostVerified: true,
    idType: 'Aadhaar Verified',
    title: 'Indiranagar 100ft Rd — Covered 16A Socket & Ather Dot',
    city: 'Bengaluru',
    area: 'Indiranagar',
    address: '#412, 12th Main Road, Indiranagar 2nd Stage',
    landmark: "Opposite Glen's Bakehouse, green gate with EV sign",
    lat: 12.9784,
    lng: 77.6408,
    socketType: '16A 3-Pin + Ather Dot',
    powerOutput: '3.3 kW Fast AC',
    supportedVehicles: ['Ather 450X / Apex', 'Ola S1 / Pro / Air', 'TVS iQube', 'Bajaj Chetak', 'Hero Vida'],
    tariffMode: 'hourly',
    rateDisplay: '₹25/hr',
    rateAmount: 25,
    availabilityStatus: 'available_now',
    availableTiming: '07:00 AM – 11:00 PM Daily',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    amenities: ['Covered Parking', 'CCTV Monitored', 'Drinking Water', 'Ground Floor Access'],
    notes: 'Plug point is located on portico pillar right next to gate. Ring bell #4 if gate is closed.',
    rating: 4.9,
    reviewsCount: 42,
    totalSessionsCompleted: 156,
    createdAt: '2026-09-12T08:00:00Z',
  },
  {
    id: '2w_mum_01',
    isCommunity2W: true,
    hostName: 'Priya Deshmukh',
    hostPhone: '9820154321',
    hostEmail: 'priya.deshmukh@yahoo.com',
    hostVerified: true,
    idType: 'Driving Licence Verified',
    title: 'Bandra West — Dedicated Ola Companion & 16A Point',
    city: 'Mumbai',
    area: 'Bandra West',
    address: 'Flat 3B, Silver Beach Apts, Perry Cross Road, Bandra West',
    landmark: 'Behind St. Andrew Church, security guard at stilt parking',
    lat: 19.0553,
    lng: 72.8296,
    socketType: 'Ola Portable + 16A Socket',
    powerOutput: '3.3 kW AC',
    supportedVehicles: ['Ola S1 / Pro / Air', 'Ather 450X', 'TVS iQube', 'Bajaj Chetak', 'River Indie'],
    tariffMode: 'hourly',
    rateDisplay: '₹30/hr',
    rateAmount: 30,
    availabilityStatus: 'available_now',
    availableTiming: '08:00 AM – 10:30 PM Daily',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    amenities: ['Stilt Parking', 'Security Guard on Duty', 'Tire Inflator available'],
    notes: 'Tell society guard you are here for Priya EV charging in Bay #6.',
    rating: 4.8,
    reviewsCount: 31,
    totalSessionsCompleted: 114,
    createdAt: '2026-09-18T10:00:00Z',
  },
  {
    id: '2w_del_01',
    isCommunity2W: true,
    hostName: 'Amanpreet Singh',
    hostPhone: '9811098765',
    hostEmail: 'amanpreet.singh@outlook.com',
    hostVerified: true,
    idType: 'Aadhaar Verified',
    title: 'Hauz Khas Enclave — High Amp 16A Fast Socket',
    city: 'Delhi',
    area: 'Hauz Khas',
    address: 'C-14, Hauz Khas Enclave, Main Outer Ring Road Service Lane',
    landmark: 'Near Hauz Khas Metro Gate 2, driveway with EV logo',
    lat: 28.5494,
    lng: 77.2001,
    socketType: '16A Industrial Weatherproof Socket',
    powerOutput: '3.3 kW AC',
    supportedVehicles: ['All 2-Wheeler EVs (Universal 16A 3-Pin)'],
    tariffMode: 'hourly',
    rateDisplay: '₹20/hr',
    rateAmount: 20,
    availabilityStatus: 'available_now',
    availableTiming: '06:30 AM – 11:30 PM Daily',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    amenities: ['Wide Driveway', '24/7 CCTV', 'Shaded Canopy', 'Emergency Tool Kit'],
    notes: 'Heavy duty MCB breaker installed. Extension cord available on request.',
    rating: 5.0,
    reviewsCount: 56,
    totalSessionsCompleted: 210,
    createdAt: '2026-08-30T14:00:00Z',
  },
  {
    id: '2w_pun_01',
    isCommunity2W: true,
    hostName: 'Rohan Kulkarni',
    hostPhone: '9860432190',
    hostEmail: 'rohan.kulkarni@gmail.com',
    hostVerified: true,
    idType: 'PAN Verified',
    title: 'Kothrud Paud Road — Ather & TVS iQube Ready Socket',
    city: 'Pune',
    area: 'Kothrud',
    address: 'Bunglow 12, Mayur Colony, Paud Road, Kothrud',
    landmark: 'Behind McDonald’s Kothrud, blue bungalow gate',
    lat: 18.5074,
    lng: 73.8077,
    socketType: 'Ather Dot + 16A Universal',
    powerOutput: '3.3 kW AC',
    supportedVehicles: ['Ather 450X', 'TVS iQube', 'Bajaj Chetak', 'Ola S1', 'Hero Vida'],
    tariffMode: 'hourly',
    rateDisplay: '₹20/hr',
    rateAmount: 20,
    availabilityStatus: 'available_now',
    availableTiming: '07:30 AM – 10:00 PM Daily',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    amenities: ['Peaceful Residential Lane', 'Drinking Water', 'Wi-Fi Guest Access'],
    notes: 'Feel free to sit on the porch bench while your scooter charges.',
    rating: 4.9,
    reviewsCount: 39,
    totalSessionsCompleted: 130,
    createdAt: '2026-09-05T09:00:00Z',
  },
  {
    id: '2w_hyd_01',
    isCommunity2W: true,
    hostName: 'Suresh Reddy',
    hostPhone: '9848011223',
    hostEmail: 'suresh.reddy@techhyd.com',
    hostVerified: true,
    idType: 'Aadhaar Verified',
    title: 'Hitec City Phase 2 — 24/7 Accessible 16A Stilt Point',
    city: 'Hyderabad',
    area: 'Hitec City',
    address: 'Villa 44, Silicon County, Behind Cyber Towers, Hitec City',
    landmark: 'Gated community, inform guard you have an EV charging booking',
    lat: 17.4474,
    lng: 78.3762,
    socketType: '16A 3-Pin Weatherproof Socket',
    powerOutput: '3.3 kW AC',
    supportedVehicles: ['Ola S1 / Pro / Air', 'Ather 450X', 'TVS iQube', 'Simple One', 'Vida'],
    tariffMode: 'hourly',
    rateDisplay: '₹25/hr',
    rateAmount: 25,
    availabilityStatus: 'available_now',
    availableTiming: '24/7 Round the Clock',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    amenities: ['24/7 Gated Security', 'Automatic Motion Lights', 'Free Wi-Fi'],
    notes: 'Socket switch is illuminated at night. Instant booking enabled.',
    rating: 4.9,
    reviewsCount: 64,
    totalSessionsCompleted: 245,
    createdAt: '2026-08-15T11:00:00Z',
  },
  {
    id: '2w_chn_01',
    isCommunity2W: true,
    hostName: 'Karthik Subramanian',
    hostPhone: '9840198765',
    hostEmail: 'karthik.subbu@gmail.com',
    hostVerified: true,
    idType: 'Passport Verified',
    title: 'Adyar Besant Nagar — Sea Breeze 16A Charging Spot',
    city: 'Chennai',
    area: 'Besant Nagar',
    address: '14/2, 4th Main Road, Besant Nagar (near Elliot’s Beach)',
    landmark: 'Opposite Cozee Restaurant lane, house with red brick facade',
    lat: 13.0001,
    lng: 78.2671,
    socketType: '16A 3-Pin + Bajaj Chetak Charger',
    powerOutput: '3.3 kW AC',
    supportedVehicles: ['Bajaj Chetak', 'TVS iQube', 'Ather 450X', 'Ola S1', 'Hero Vida'],
    tariffMode: 'hourly',
    rateDisplay: '₹22/hr',
    rateAmount: 22,
    availabilityStatus: 'available_now',
    availableTiming: '06:00 AM – 10:00 PM Daily',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    amenities: ['Beachside Air', 'Covered Driveway', 'Chairs to relax', 'Drinking Water'],
    notes: 'Plug in and take a 3-minute walk to Elliot’s beach while your scooter charges!',
    rating: 4.8,
    reviewsCount: 28,
    totalSessionsCompleted: 98,
    createdAt: '2026-09-22T16:00:00Z',
  },
  {
    id: '2w_blr_02',
    isCommunity2W: true,
    hostName: 'Deepa Nair',
    hostPhone: '9886055443',
    hostEmail: 'deepa.nair@startup.in',
    hostVerified: true,
    idType: 'Aadhaar Verified',
    title: 'HSR Layout Sector 3 — Ola & Universal Fast AC Socket',
    city: 'Bengaluru',
    area: 'HSR Layout',
    address: '#789, 14th Main, Sector 3, HSR Layout',
    landmark: 'Near BDA Complex HSR, yellow boundary wall',
    lat: 12.9116,
    lng: 77.6389,
    socketType: '16A Weatherproof + Type 6',
    powerOutput: '3.3 kW AC',
    supportedVehicles: ['Ola S1 / Pro / Air', 'Ather 450X', 'TVS iQube', 'Hero Vida', 'Chetak'],
    tariffMode: 'hourly',
    rateDisplay: '₹25/hr',
    rateAmount: 25,
    availabilityStatus: 'available_now',
    availableTiming: '07:00 AM – 11:00 PM Daily',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    amenities: ['Covered Portico', 'CCTV Protected', 'Pressure Pump for Tires'],
    notes: 'Very friendly host! Socket is 1 meter above ground level with a hook for your cable.',
    rating: 4.9,
    reviewsCount: 45,
    totalSessionsCompleted: 178,
    createdAt: '2026-09-25T12:00:00Z',
  },
];

const STORAGE_KEY = 'voltaic_2w_community_chargers';
const BOOKINGS_KEY = 'voltaic_2w_rental_bookings';

export function getTwoWheelerChargers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_2W_CHARGERS));
      return DEFAULT_2W_CHARGERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_2W_CHARGERS;
  } catch {
    return DEFAULT_2W_CHARGERS;
  }
}

export function saveTwoWheelerCharger(chargerData) {
  try {
    const current = getTwoWheelerChargers();
    const newCharger = {
      id: `2w_host_${Date.now()}`,
      isCommunity2W: true,
      hostVerified: true,
      rating: 5.0,
      reviewsCount: 1,
      totalSessionsCompleted: 0,
      createdAt: new Date().toISOString(),
      ...chargerData,
    };
    const updated = [newCharger, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newCharger;
  } catch (e) {
    console.error('Error saving 2W charger:', e);
    return null;
  }
}

export function getTwoWheelerBookings() {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTwoWheelerBooking(bookingData) {
  try {
    const current = getTwoWheelerBookings();
    const newBooking = {
      id: `2W-VOLT-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
      ...bookingData,
    };
    const updated = [newBooking, ...current];
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updated));
    return newBooking;
  } catch (e) {
    console.error('Error saving 2W booking:', e);
    return null;
  }
}

export const TWO_WHEELER_SOCKET_TYPES = [
  '16A 3-Pin Universal Socket (Standard for all EV scooters)',
  'Ather Dot Home Fast Charger (3.3 kW)',
  'Ola Portable Companion Charger (15A/16A)',
  '15A Industrial Weatherproof Socket',
  'Type 6 / IEC 60309 (Indian 2W/3W standard)',
];

export const POPULAR_EV_SCOOTERS = [
  'Ather 450X / Apex / 450S',
  'Ola S1 / S1 Pro / S1 Air / S1 X',
  'TVS iQube / iQube ST',
  'Bajaj Chetak (Premium/Urbane)',
  'Hero Vida V1 Pro / Plus',
  'Simple One',
  'River Indie',
  'Universal 16A Plug (Any 2W EV)',
];
