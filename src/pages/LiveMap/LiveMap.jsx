import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock, Zap, WifiOff, ChevronDown, AlertTriangle } from 'lucide-react';
import { CHARGERS, CITIES, getQueueForecast } from '../../data/chargers';
import { stationsApi } from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ReservationModal from '../../components/ReservationModal/ReservationModal';
import ReportIssueModal from '../../components/ReportIssueModal/ReportIssueModal';
import './LiveMap.css';

// Fix Leaflet default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(status) {
  const colors = {
    available: '#059669',
    busy: '#D97706',
    offline: '#DC2626',
  };
  const c = colors[status] || '#6B7280';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22s14-12.667 14-22C28 6.268 21.732 0 14 0z" fill="${c}" />
    <circle cx="14" cy="14" r="7" fill="white" />
    <circle cx="14" cy="14" r="4.5" fill="${c}" />
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
  });
}

function FlyTo({ charger }) {
  const map = useMap();
  useEffect(() => {
    if (charger) map.flyTo([charger.lat, charger.lng], 14, { duration: 1.2 });
  }, [charger, map]);
  return null;
}

export default function LiveMap() {
  const [stations, setStations] = useState(CHARGERS);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isReserving, setIsReserving] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stationsApi.getAll({
        city: selectedCity !== 'All Cities' ? selectedCity : undefined,
      });
      if (res?.stations) {
        setStations(res.stations);
        if (selectedCharger) {
          const updated = res.stations.find((s) => s.id === selectedCharger.id);
          if (updated) setSelectedCharger(updated);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch stations for map:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedCharger]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const filtered = selectedCity === 'All Cities'
    ? stations
    : stations.filter((c) => c.city === selectedCity);

  useEffect(() => {
    if (selectedCharger) {
      setForecastData(getQueueForecast(selectedCharger.id, selectedCharger.busy));
    }
  }, [selectedCharger]);

  return (
    <div className="livemap page-enter">
      {/* Toolbar */}
      <div className="lm-toolbar">
        <div className="lm-title-block">
          <h1 className="lm-title font-display">Live Map</h1>
          <span className="lm-subtitle">
            {filtered.length} stations online · Real-time CPO telemetry
          </span>
        </div>
        <div className="lm-filters">
          <div className="lm-select-wrap">
            <select
              className="lm-select"
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedCharger(null);
              }}
            >
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} className="lm-select-icon" />
          </div>
          <div className="lm-legend">
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#059669' }} /> Available
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#D97706' }} /> Busy
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#DC2626' }} /> Offline
            </span>
          </div>
        </div>
      </div>

      <div className="lm-body">
        {/* Map */}
        <div className="lm-map-wrap">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {filtered.map((c) => (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={makeIcon(c.status)}
                eventHandlers={{ click: () => setSelectedCharger(c) }}
              >
                <Popup>
                  <div className="map-popup">
                    <div className="mp-name">{c.name}</div>
                    <div className="mp-city">{c.city} · {c.operator}</div>
                    <div className="mp-row">
                      <span className={`badge badge-${c.status}`}>
                        <span className={`dot dot-${c.status}`} />
                        {c.status === 'available' ? 'Available' : c.status === 'busy' ? 'Busy' : 'Offline'}
                      </span>
                      <span className="mp-speed">{c.speed} kW</span>
                    </div>
                    <div className="mp-ports">
                      <span className="mpp-avail">{c.available} avail</span> ·
                      <span className="mpp-busy"> {c.busy} busy</span> ·
                      <span className="mpp-off"> {c.offline} offline</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            <FlyTo charger={selectedCharger} />
          </MapContainer>
        </div>

        {/* Side panel */}
        <div className="lm-panel">
          {selectedCharger ? (
            <div className="lm-detail">
              <div className="lmd-header">
                <div>
                  <div className="lmd-name">{selectedCharger.name}</div>
                  <div className="lmd-city">{selectedCharger.city} · {selectedCharger.operator}</div>
                  {selectedCharger.address && (
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                      {selectedCharger.address}
                    </div>
                  )}
                </div>
                <span className={`badge badge-${selectedCharger.status}`}>
                  <span
                    className={`dot dot-${selectedCharger.status} ${
                      selectedCharger.status === 'available' ? 'dot-pulse' : ''
                    }`}
                  />
                  {selectedCharger.status === 'available'
                    ? 'Available'
                    : selectedCharger.status === 'busy'
                    ? 'Busy'
                    : 'Offline'}
                </span>
              </div>

              <div className="lmd-stats-grid">
                <div className="lmd-stat">
                  <div className="lmd-stat-val lmd-avail">{selectedCharger.available}</div>
                  <div className="lmd-stat-lbl">Available</div>
                </div>
                <div className="lmd-stat">
                  <div className="lmd-stat-val lmd-busy">{selectedCharger.busy}</div>
                  <div className="lmd-stat-lbl">In Use</div>
                </div>
                <div className="lmd-stat">
                  <div className="lmd-stat-val lmd-off">{selectedCharger.offline}</div>
                  <div className="lmd-stat-lbl">Offline</div>
                </div>
                <div className="lmd-stat">
                  <div className="lmd-stat-val">{selectedCharger.speed}kW</div>
                  <div className="lmd-stat-lbl">Max Speed</div>
                </div>
              </div>

              {selectedCharger.status === 'busy' && selectedCharger.waitMin > 0 && (
                <div className="lmd-wait-banner">
                  <Clock size={15} />
                  Estimated wait: <strong>~{selectedCharger.waitMin} minutes</strong>
                </div>
              )}
              {selectedCharger.status === 'offline' && (
                <div className="lmd-wait-banner lmd-wait-off">
                  <WifiOff size={15} />
                  Station under maintenance. No ETA available.
                </div>
              )}

              <div className="lmd-section-title">Queue Forecast (next 8h)</div>
              <div className="lmd-chart">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={forecastData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        border: '1px solid #E2E6EE',
                        borderRadius: 8,
                        boxShadow: 'var(--shadow-sm)',
                      }}
                      cursor={{ fill: '#F0F2F6' }}
                    />
                    <ReferenceLine
                      y={selectedCharger.ports}
                      stroke="#E2E6EE"
                      strokeDasharray="4 2"
                      label={{
                        value: 'capacity',
                        position: 'insideTopRight',
                        fontSize: 10,
                        fill: '#9CA3AF',
                      }}
                    />
                    <Bar dataKey="vehicles" fill="#6366F1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={selectedCharger.status === 'offline' || selectedCharger.available === 0}
                onClick={() => setIsReserving(true)}
              >
                <Zap size={14} /> Reserve a Slot
              </button>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setIsReporting(true)}
                >
                  <AlertTriangle size={13} /> Report Issue
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setSelectedCharger(null)}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="lm-station-list">
              <div className="lm-panel-title">Stations ({filtered.length})</div>
              {filtered.map((c) => (
                <div key={c.id} className="lm-station-row" onClick={() => setSelectedCharger(c)}>
                  <div className={`lm-status-bar lm-status-bar--${c.status}`} />
                  <div className="lm-sr-info">
                    <div className="lm-sr-name">{c.name}</div>
                    <div className="lm-sr-city">{c.city}</div>
                  </div>
                  <div className="lm-sr-ports">
                    <span className="lm-avail">{c.available}</span>
                    <span className="lm-sep">/</span>
                    <span className="lm-total">{c.ports}</span>
                  </div>
                  <span className={`badge badge-${c.status}`}>
                    <span className={`dot dot-${c.status}`} />
                    {c.status === 'available' ? 'Available' : c.status === 'busy' ? 'Busy' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reservation Modal */}
      {selectedCharger && (
        <ReservationModal
          station={selectedCharger}
          isOpen={isReserving}
          onClose={() => setIsReserving(false)}
          onBookingComplete={() => {
            fetchStations();
          }}
        />
      )}

      {/* Report Issue Modal */}
      {selectedCharger && (
        <ReportIssueModal
          station={selectedCharger}
          isOpen={isReporting}
          onClose={() => setIsReporting(false)}
          onReportSuccess={() => {
            fetchStations();
          }}
        />
      )}
    </div>
  );
}
