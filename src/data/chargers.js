// Simulated charger data — 20 stations across Mumbai / Delhi / Bengaluru
export const CHARGERS = [
  // Mumbai
  { id: 'MUM-001', name: 'BKC Charging Hub',          city: 'Mumbai',    lat: 19.0590, lng: 72.8650, operator: 'Tata Power EV',   ports: 8,  available: 5, busy: 2, offline: 1, speed: 150, status: 'available', waitMin: 0  },
  { id: 'MUM-002', name: 'Powai Tech Park',            city: 'Mumbai',    lat: 19.1197, lng: 72.9055, operator: 'ChargeZone',      ports: 6,  available: 1, busy: 5, offline: 0, speed: 50,  status: 'busy',      waitMin: 18 },
  { id: 'MUM-003', name: 'Andheri Subway Station',    city: 'Mumbai',    lat: 19.1136, lng: 72.8697, operator: 'Ather Grid',      ports: 4,  available: 0, busy: 2, offline: 2, speed: 7,   status: 'offline',   waitMin: -1 },
  { id: 'MUM-004', name: 'Worli Sea Link South',       city: 'Mumbai',    lat: 18.9893, lng: 72.8168, operator: 'BPCL EV',         ports: 10, available: 7, busy: 3, offline: 0, speed: 240, status: 'available', waitMin: 0  },
  { id: 'MUM-005', name: 'Goregaon Mall Basement',     city: 'Mumbai',    lat: 19.1556, lng: 72.8491, operator: 'ChargeZone',      ports: 5,  available: 2, busy: 3, offline: 0, speed: 100, status: 'busy',      waitMin: 9  },

  // Delhi
  { id: 'DEL-001', name: 'Connaught Place Station',   city: 'Delhi',     lat: 28.6329, lng: 77.2195, operator: 'EVCS India',      ports: 12, available: 8, busy: 3, offline: 1, speed: 150, status: 'available', waitMin: 0  },
  { id: 'DEL-002', name: 'Dwarka Sector 21 Hub',       city: 'Delhi',     lat: 28.5533, lng: 77.0588, operator: 'Tata Power EV',   ports: 6,  available: 0, busy: 6, offline: 0, speed: 50,  status: 'busy',      waitMin: 22 },
  { id: 'DEL-003', name: 'Saket Mall Complex',         city: 'Delhi',     lat: 28.5244, lng: 77.2167, operator: 'Statiq',          ports: 8,  available: 4, busy: 2, offline: 2, speed: 60,  status: 'available', waitMin: 0  },
  { id: 'DEL-004', name: 'IGI Airport T3',             city: 'Delhi',     lat: 28.5562, lng: 77.0999, operator: 'HPCL EV',         ports: 16, available: 11,busy: 4, offline: 1, speed: 240, status: 'available', waitMin: 0  },
  { id: 'DEL-005', name: 'Lajpat Nagar Market',        city: 'Delhi',     lat: 28.5672, lng: 77.2432, operator: 'Ather Grid',      ports: 4,  available: 0, busy: 0, offline: 4, speed: 7,   status: 'offline',   waitMin: -1 },

  // Bengaluru
  { id: 'BLR-001', name: 'Koramangala 5th Block',      city: 'Bengaluru', lat: 12.9345, lng: 77.6169, operator: 'ChargeZone',      ports: 8,  available: 6, busy: 1, offline: 1, speed: 100, status: 'available', waitMin: 0  },
  { id: 'BLR-002', name: 'Whitefield ITPL Gate',       city: 'Bengaluru', lat: 12.9791, lng: 77.7303, operator: 'Tata Power EV',   ports: 10, available: 3, busy: 7, offline: 0, speed: 150, status: 'busy',      waitMin: 14 },
  { id: 'BLR-003', name: 'Indiranagar 100ft Road',     city: 'Bengaluru', lat: 12.9784, lng: 77.6408, operator: 'Statiq',          ports: 6,  available: 5, busy: 1, offline: 0, speed: 60,  status: 'available', waitMin: 0  },
  { id: 'BLR-004', name: 'HSR Layout Sector 1',        city: 'Bengaluru', lat: 12.9121, lng: 77.6446, operator: 'EVCS India',      ports: 4,  available: 0, busy: 4, offline: 0, speed: 50,  status: 'busy',      waitMin: 31 },
  { id: 'BLR-005', name: 'Electronic City Phase 2',    city: 'Bengaluru', lat: 12.8394, lng: 77.6657, operator: 'Ather Grid',      ports: 8,  available: 7, busy: 0, offline: 1, speed: 7,   status: 'available', waitMin: 0  },

  // Hyderabad
  { id: 'HYD-001', name: 'Gachibowli Cyber Towers',   city: 'Hyderabad', lat: 17.4401, lng: 78.3489, operator: 'BPCL EV',         ports: 10, available: 6, busy: 4, offline: 0, speed: 150, status: 'available', waitMin: 0  },
  { id: 'HYD-002', name: 'Hitech City Metro',          city: 'Hyderabad', lat: 17.4486, lng: 78.3908, operator: 'ChargeZone',      ports: 6,  available: 0, busy: 5, offline: 1, speed: 60,  status: 'busy',      waitMin: 27 },

  // Pune
  { id: 'PUN-001', name: 'Hinjewadi IT Park',          city: 'Pune',      lat: 18.5893, lng: 73.7383, operator: 'Tata Power EV',   ports: 12, available: 9, busy: 2, offline: 1, speed: 240, status: 'available', waitMin: 0  },
  { id: 'PUN-002', name: 'Camp Area Charging Point',   city: 'Pune',      lat: 18.5196, lng: 73.8804, operator: 'Statiq',          ports: 4,  available: 2, busy: 2, offline: 0, speed: 50,  status: 'busy',      waitMin: 11 },

  // Chennai
  { id: 'CHE-001', name: 'OMR IT Corridor Hub',        city: 'Chennai',   lat: 12.9022, lng: 80.2246, operator: 'HPCL EV',         ports: 8,  available: 5, busy: 2, offline: 1, speed: 100, status: 'available', waitMin: 0  },
];

// Queue forecast data for bar chart (next 8 hours from now)
export function getQueueForecast(chargerId) {
  const base = {
    'MUM-001': [2, 3, 5, 7, 6, 4, 2, 1],
    'MUM-002': [5, 6, 8, 10, 9, 7, 5, 4],
    'BLR-001': [1, 2, 3, 4, 4, 3, 2, 1],
    'DEL-001': [3, 4, 6, 8, 7, 5, 3, 2],
    'HYD-001': [2, 3, 5, 6, 5, 4, 3, 2],
    'PUN-001': [1, 2, 4, 5, 4, 3, 2, 1],
  };
  const seed = base[chargerId] || [2, 3, 4, 5, 4, 3, 2, 1];
  const now = new Date();
  return seed.map((v, i) => ({
    time: `${String((now.getHours() + i) % 24).padStart(2,'0')}:00`,
    vehicles: v + Math.floor(Math.random() * 2),
    capacity: CHARGERS.find(c => c.id === chargerId)?.ports || 8,
  }));
}

// Live summary stats
export function getNetworkStats() {
  const total     = CHARGERS.reduce((s, c) => s + c.ports, 0);
  const available = CHARGERS.reduce((s, c) => s + c.available, 0);
  const busy      = CHARGERS.reduce((s, c) => s + c.busy, 0);
  const offline   = CHARGERS.reduce((s, c) => s + c.offline, 0);
  return { total, available, busy, offline, stations: CHARGERS.length };
}

export const CITIES = ['All Cities', 'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai'];
export const OPERATORS = ['All Operators', 'Tata Power EV', 'ChargeZone', 'Ather Grid', 'Statiq', 'EVCS India', 'BPCL EV', 'HPCL EV'];
