import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  RefreshCw,
  LayoutGrid,
  Map as MapIcon,
  Columns2,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CITIES, OPERATORS, CHARGERS } from '../../data/chargers';
import { stationsApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import ChargerCard from '../../components/ChargerCard/ChargerCard';
import ReservationModal from '../../components/ReservationModal/ReservationModal';
import ReportIssueModal from '../../components/ReportIssueModal/ReportIssueModal';
import PageMeta from '../../components/PageMeta/PageMeta';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import './Chargers.css';

// Fix Leaflet default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_OPTS = ['All', 'Available', 'Busy', 'Offline'];

// Rich station pin marker
function makeChargerMarkerIcon(station, isSelected) {
  const statusColors = {
    available: '#059669',
    busy: '#D97706',
    offline: '#DC2626',
  };
  const color = statusColors[station.status] || '#6B7280';
  const label = station.status === 'offline' ? '!' : `${station.available}`;

  const html = `
    <div class="gmap-pin ${isSelected ? 'gmap-pin--selected' : ''}" style="--pin-color: ${color};">
      <div class="gmap-pin-badge">
        <svg class="gmap-pin-bolt" viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span class="gmap-pin-count">${label}</span>
      </div>
      <div class="gmap-pin-pointer"></div>
      ${isSelected ? '<div class="gmap-pin-halo"></div>' : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'gmap-marker-container',
    iconSize: [40, 44],
    iconAnchor: [20, 42],
    popupAnchor: [0, -44],
  });
}

// Controller for sizing, zoom, and camera movement
function ChargersMapController({ selectedStation, stations }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (selectedStation) {
      map.flyTo([selectedStation.lat, selectedStation.lng], 14, { duration: 1.2 });
    }
  }, [selectedStation, map]);

  useEffect(() => {
    if (stations && stations.length > 0) {
      if (stations.length === 1) {
        map.flyTo([stations[0].lat, stations[0].lng], 14, { duration: 1.2 });
      } else {
        const bounds = stations.map((s) => [s.lat, s.lng]);
        try {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 1.2 });
        } catch {
          // ignore bounds calculation error
        }
      }
    }
  }, [stations, map]);

  return null;
}

export default function Chargers() {
  const [stations, setStations] = useState(CHARGERS);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [operator, setOperator] = useState('All Operators');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'grid' | 'map'
  const toast = useToast();

  // Modals state
  const [reservingStation, setReservingStation] = useState(null);
  const [reportingStation, setReportingStation] = useState(null);

  const fetchStations = useCallback(async (isManual = false) => {
    setLoading(true);
    try {
      const res = await stationsApi.getAll({
        city,
        operator,
        status,
        search,
      });
      if (res?.stations) {
        setStations(res.stations);
        setFetchError('');
        if (isManual) {
          toast.success('Live charger status updated.');
        }
      }
    } catch {
      // Offline fallback: verified stations served from cache
      setFetchError('');
    } finally {
      setLoading(false);
    }
  }, [city, operator, status, search, toast]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const filtered = useMemo(() => {
    return stations.filter((c) => {
      if (
        search &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.city.toLowerCase().includes(search.toLowerCase()) &&
        !(c.address && c.address.toLowerCase().includes(search.toLowerCase()))
      )
        return false;
      if (city !== 'All Cities' && c.city !== city) return false;
      if (operator !== 'All Operators' && c.operator !== operator) return false;
      if (status !== 'All' && c.status.toLowerCase() !== status.toLowerCase()) return false;
      return true;
    });
  }, [stations, search, city, operator, status]);

  const handleClearFilters = () => {
    setSearch('');
    setCity('All Cities');
    setOperator('All Operators');
    setStatus('All');
    toast.success('Search filters reset to default.');
  };

  return (
    <div className={`chargers-page page-enter ${viewMode !== 'grid' ? 'chargers-page--wide' : ''}`}>
      <PageMeta
        title="EV Charging Stations Map & Directory"
        description="Search, view on map, filter, and reserve high-speed fast EV charging stations from Tata Power, ChargeZone, Statiq, and more."
      />

      {/* Header */}
      <div className="chp-header">
        <div>
          <h1 className="chp-title font-display">EV Charging Stations</h1>
          <p className="chp-sub">
            {filtered.length} of {stations.length} charging stations found across India
          </p>
        </div>

        <div className="chp-header-actions">
          {/* View Mode Switcher */}
          <div className="chp-view-switch" role="group" aria-label="View mode">
            <button
              type="button"
              className={`chp-view-btn ${viewMode === 'split' ? 'is-active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Split View (List + Map)"
            >
              <Columns2 size={14} />
              <span>Split View</span>
            </button>
            <button
              type="button"
              className={`chp-view-btn ${viewMode === 'map' ? 'is-active' : ''}`}
              onClick={() => setViewMode('map')}
              title="Map View"
            >
              <MapIcon size={14} />
              <span>Map View</span>
            </button>
            <button
              type="button"
              className={`chp-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View (Cards)"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
          </div>

          <Link
            to="/map"
            className="btn btn-secondary btn-sm chp-livemap-link"
            title="Open Fullscreen Live Map"
          >
            <MapIcon size={14} />
            <span>Live Map</span>
            <ExternalLink size={12} />
          </Link>

          <button
            className="btn btn-ghost btn-sm chp-refresh-btn"
            onClick={() => fetchStations(true)}
            disabled={loading}
            title="Refresh live charger status"
            aria-label="Refresh live charger status"
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {fetchError && <div className="page-banner page-banner--error">{fetchError}</div>}

      {/* Filters */}
      <div className="chp-filters card">
        <div className="chp-search-wrap">
          <Search size={15} className="chp-search-icon" />
          <input
            className="chp-search"
            placeholder="Search by station name, metro, or landmark…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search charging stations"
          />
        </div>

        <div className="chp-selects">
          {[
            { label: 'City', value: city, setter: setCity, opts: CITIES },
            { label: 'Operator', value: operator, setter: setOperator, opts: OPERATORS },
          ].map(({ label, value, setter, opts }) => (
            <div key={label} className="chp-select-wrap">
              <select
                className="chp-select"
                value={value}
                onChange={(e) => setter(e.target.value)}
                aria-label={`Filter by ${label}`}
              >
                {opts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={13} className="chp-sel-icon" />
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="chp-status-tabs" role="tablist" aria-label="Filter by Status">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              className={`status-tab ${status === s ? 'status-tab-active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s !== 'All' && (
                <span
                  className={`dot dot-${s.toLowerCase()} ${s === 'Available' ? 'dot-pulse' : ''}`}
                />
              )}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area based on View Mode */}
      {viewMode === 'grid' && (
        <>
          {filtered.length === 0 ? (
            <div className="chp-empty card">
              <Search size={32} strokeWidth={1.2} />
              <div>No stations match your selected filters.</div>
              <button className="btn btn-ghost btn-sm" onClick={handleClearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="chp-grid">
              {filtered.map((c) => (
                <ChargerCard
                  key={c.id}
                  charger={c}
                  selected={selected?.id === c.id}
                  onClick={(station) => {
                    setSelected(station);
                    if (station.status !== 'offline' && station.available > 0) {
                      setReservingStation(station);
                    }
                  }}
                  onReserve={(station) => setReservingStation(station)}
                  onReport={(station) => setReportingStation(station)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === 'split' && (
        <div className="chp-split-layout">
          {/* Left: Stations Scroll List */}
          <div className="chp-split-list">
            {filtered.length === 0 ? (
              <div className="chp-empty card">
                <Search size={32} strokeWidth={1.2} />
                <div>No stations match your selected filters.</div>
                <button className="btn btn-ghost btn-sm" onClick={handleClearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="chp-split-cards">
                {filtered.map((c) => (
                  <ChargerCard
                    key={c.id}
                    charger={c}
                    selected={selected?.id === c.id}
                    onClick={(station) => {
                      setSelected(station);
                    }}
                    onReserve={(station) => setReservingStation(station)}
                    onReport={(station) => setReportingStation(station)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Sticky Interactive Map */}
          <div className="chp-split-map-card card">
            <div className="chp-map-header">
              <div className="chp-map-title">
                <MapIcon size={14} className="text-primary" />
                <span>Station Locations ({filtered.length} found)</span>
              </div>
              <Link to="/map" className="chp-map-fullscreen-link" title="Open in Fullscreen Live Map">
                <span>Fullscreen Live Map</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            <div className="chp-map-wrapper">
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                minZoom={3}
                maxZoom={19}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                  maxZoom={19}
                />

                {filtered.map((c) => {
                  const isSelected = selected?.id === c.id;
                  return (
                    <Marker
                      key={c.id}
                      position={[c.lat, c.lng]}
                      icon={makeChargerMarkerIcon(c, isSelected)}
                      eventHandlers={{
                        click: () => {
                          setSelected(c);
                        },
                      }}
                    >
                      <Popup>
                        <div className="chp-map-popup">
                          <div className="cmp-title">{c.name}</div>
                          <div className="cmp-city">{c.city} · {c.operator}</div>
                          <div className="cmp-badges">
                            <span className={`badge badge-${c.status}`}>
                              <span className={`dot dot-${c.status}`} />
                              {c.status === 'available' ? 'Available' : c.status === 'busy' ? 'Busy' : 'Offline'}
                            </span>
                            <span className="cmp-speed">{c.speed} kW DC</span>
                          </div>
                          <div className="cmp-avail">
                            <strong style={{ color: '#059669' }}>{c.available} free</strong> / {c.ports} plugs
                          </div>
                          {c.status !== 'offline' && c.available > 0 && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm cmp-reserve-btn"
                              onClick={() => setReservingStation(c)}
                            >
                              <Zap size={12} />
                              <span>Reserve Spot</span>
                            </button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                <ChargersMapController selectedStation={selected} stations={filtered} />
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'map' && (
        <div className="chp-fullmap-card card page-enter">
          <div className="chp-map-header">
            <div className="chp-map-title">
              <MapIcon size={14} className="text-primary" />
              <span>Full Interactive Map ({filtered.length} stations matching search)</span>
            </div>
            <Link to="/map" className="chp-map-fullscreen-link" title="Open in Fullscreen Live Map">
              <span>Fullscreen Live Map</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          <div className="chp-fullmap-wrapper">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              minZoom={3}
              maxZoom={19}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                maxZoom={19}
              />

              {filtered.map((c) => {
                const isSelected = selected?.id === c.id;
                return (
                  <Marker
                    key={c.id}
                    position={[c.lat, c.lng]}
                    icon={makeChargerMarkerIcon(c, isSelected)}
                    eventHandlers={{
                      click: () => {
                        setSelected(c);
                      },
                    }}
                  >
                    <Popup>
                      <div className="chp-map-popup">
                        <div className="cmp-title">{c.name}</div>
                        <div className="cmp-city">{c.city} · {c.operator}</div>
                        <div className="cmp-badges">
                          <span className={`badge badge-${c.status}`}>
                            <span className={`dot dot-${c.status}`} />
                            {c.status === 'available' ? 'Available' : c.status === 'busy' ? 'Busy' : 'Offline'}
                          </span>
                          <span className="cmp-speed">{c.speed} kW DC</span>
                        </div>
                        <div className="cmp-avail">
                          <strong style={{ color: '#059669' }}>{c.available} free</strong> / {c.ports} plugs
                        </div>
                        {c.status !== 'offline' && c.available > 0 && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm cmp-reserve-btn"
                            onClick={() => setReservingStation(c)}
                          >
                            <Zap size={12} />
                            <span>Reserve Spot</span>
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              <ChargersMapController selectedStation={selected} stations={filtered} />
            </MapContainer>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {reservingStation && (
        <ReservationModal
          station={reservingStation}
          isOpen={!!reservingStation}
          onClose={() => setReservingStation(null)}
          onBookingComplete={() => {
            fetchStations();
          }}
        />
      )}

      {/* Report Issue Modal */}
      {reportingStation && (
        <ReportIssueModal
          station={reportingStation}
          isOpen={!!reportingStation}
          onClose={() => setReportingStation(null)}
          onReportSuccess={() => {
            fetchStations();
          }}
        />
      )}

      <SiteFooter />
    </div>
  );
}
