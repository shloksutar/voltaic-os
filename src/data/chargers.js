// Real EV Charging Stations Registry & Telemetry Helpers
// Connected directly to VoltaicOS Unified CPO Aggregation Engine
import { REAL_STATIONS } from '../../server/data/realStations.js';

export const CHARGERS = REAL_STATIONS;


// Live summary metrics calculated from verified network stations
export function getNetworkStats(stations = CHARGERS) {
  const total = stations.reduce((s, c) => s + (c.ports || 0), 0);
  const available = stations.reduce((s, c) => s + (c.available || 0), 0);
  const busy = stations.reduce((s, c) => s + (c.busy || 0), 0);
  const offline = stations.reduce((s, c) => s + (c.offline || 0), 0);
  return { total, available, busy, offline, stations: stations.length };
}

export const CITIES = ['All Cities', 'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai'];

export const OPERATORS = [
  'All Operators',
  'Tata Power EV',
  'ChargeZone',
  'Ather Grid',
  'Statiq',
  'BPCL EV',
  'HPCL EV',
  'EVCS India',
];
