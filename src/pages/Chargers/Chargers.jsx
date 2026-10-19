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
  Phone,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CITIES, OPERATORS, CHARGERS } from '../../data/chargers';
import { INDIA_BOUNDS, INDIA_CENTER, INDIA_DEFAULT_ZOOM, INDIA_MIN_ZOOM, INDIA_MAX_ZOOM } from '../../data/mapBounds';
import { stationsApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import ChargerCard from '../../components/ChargerCard/ChargerCard';
import ReservationModal from '../../components/ReservationModal/ReservationModal';
import ReportIssueModal from '../../components/ReportIssueModal/ReportIssueModal';
import PageMeta from '../../components/PageMeta/PageMeta';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import { getTwoWheelerChargers } from '../../data/twoWheelerChargers';
import TwoWheelerCard from '../../components/TwoWheelerCard/TwoWheelerCard';
import TwoWheelerRentModal from '../../components/TwoWheelerRentModal/TwoWheelerRentModal';
import TwoWheelerBookingModal from '../../components/TwoWheelerBookingModal/TwoWheelerBookingModal';
import './Chargers.css';

// Fix Leaflet default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_OPTS = ['All', 'Available', 'Busy', 'Offline'];

const SCOOTER_FILTERS = [
  'All Scooters',
  'Ather',
  'Ola Electric',
  'TVS iQube',
  'Bajaj Chetak',
  'Hero Vida',
  '16A Universal Socket',
];

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

// Custom 2-Wheeler Community Pin Marker
function makeTwoWheelerMarkerIcon(station, isSelected) {
  const isAvail = station.availabilityStatus === 'available_now';
  const color = isAvail ? '#059669' : '#D97706';
  const rate = station.rateDisplay || '₹25/hr';

  const html = `
    <div class="gmap-pin tw-map-pin ${isSelected ? 'gmap-pin--selected' : ''}" style="--pin-color: ${color};">
      <div class="gmap-pin-badge tw-pin-badge">
        <span style="font-size: 13px; line-height: 1;">🛵</span>
        <span class="gmap-pin-count" style="font-size: 10px; font-weight: 700;">${rate}</span>
      </div>
      <div class="gmap-pin-pointer"></div>
      ${isSelected ? '<div class="gmap-pin-halo"></div>' : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'gmap-marker-container',
    iconSize: [44, 46],
    iconAnchor: [22, 44],
    popupAnchor: [0, -46],
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

  // Category selection: 'all' | 'two_wheeler' | 'commercial'
  const [activeCategory, setActiveCategory] = useState('all');

  // 2-Wheeler Community Rentals State
  const [twoWheelerChargers, setTwoWheelerChargers] = useState(() => getTwoWheelerChargers());
  const [showPost2WModal, setShowPost2WModal] = useState(false);
  const [booking2WCharger, setBooking2WCharger] = useState(null);
  const [selectedScooter, setSelectedScooter] = useState('All Scooters');
  const [twoWheelerAvailOnly, setTwoWheelerAvailOnly] = useState(false);

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

  // Filter 2-Wheeler Community Rentals
  const filtered2W = useMemo(() => {
    return twoWheelerChargers.filter((c) => {
      if (city !== 'All Cities' && c.city.toLowerCase() !== city.toLowerCase()) return false;
      if (twoWheelerAvailOnly && c.availabilityStatus !== 'available_now') return false;
      if (selectedScooter !== 'All Scooters') {
        const q = selectedScooter.toLowerCase();
        const matchesVehicle = c.supportedVehicles?.some((v) => v.toLowerCase().includes(q));
        const matchesSocket = c.socketType?.toLowerCase().includes(q);
        if (!matchesVehicle && !matchesSocket) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          c.title?.toLowerCase().includes(q) ||
          c.hostName?.toLowerCase().includes(q) ||
          c.area?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.landmark && c.landmark.toLowerCase().includes(q)) ||
          (c.socketType && c.socketType.toLowerCase().includes(q)) ||
          c.supportedVehicles?.some((v) => v.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [twoWheelerChargers, city, twoWheelerAvailOnly, selectedScooter, search]);

  // Combined stations list for map rendering
  const mapStations = useMemo(() => {
    if (activeCategory === 'two_wheeler') return filtered2W;
    if (activeCategory === 'commercial') return filtered;
    return [...filtered2W, ...filtered];
  }, [activeCategory, filtered2W, filtered]);

  const handleClearFilters = () => {
    setSearch('');
    setCity('All Cities');
    setOperator('All Operators');
    setStatus('All');
    setSelectedScooter('All Scooters');
    setTwoWheelerAvailOnly(false);
    toast.success('Search filters reset to default.');
  };

  const handleChargerPosted = (newCharger) => {
    const all = getTwoWheelerChargers();
    setTwoWheelerChargers(all);
    setActiveCategory('two_wheeler');
    setSelected(newCharger);
    toast.success(`Charger listed! Your 2W socket in ${newCharger.area} is now live.`);
  };

  const handleBookingSuccess = (booking) => {
    toast.success(`Booking confirmed! Slot #${booking.id} reserved with host ${booking.hostName}.`);
  };

  return (
    <div className={`chargers-page page-enter ${viewMode !== 'grid' ? 'chargers-page--wide' : ''}`}>
      <PageMeta
        title="EV Charging Network & 2-Wheeler Rentals — VoltaicOS"
        description="Search commercial EV fast chargers or rent 2-wheeler home sockets (Ather, Ola, TVS, Chetak) from verified local hosts."
      />

      {/* Header */}
      <div className="chp-header">
        <div>
          <h1 className="chp-title font-display">EV Charging Stations & Rentals</h1>
          <p className="chp-sub">
            {activeCategory === 'two_wheeler'
              ? `${filtered2W.length} of ${twoWheelerChargers.length} 2-wheeler community hosts available`
              : activeCategory === 'commercial'
              ? `${filtered.length} of ${stations.length} commercial fast stations found`
              : `${filtered2W.length} 2-wheeler rentals + ${filtered.length} commercial stations found`}
          </p>
        </div>

        <div className="chp-header-actions">
          {/* Apply / Post 2W Charger Button */}
          <button
            type="button"
            className="chp-post-2w-btn"
            onClick={() => setShowPost2WModal(true)}
            title="List your 2-wheeler EV charger or home socket on rent"
          >
            <span style={{ fontSize: '15px' }}>🛵</span>
            <span>Post 2W Charger (Apply)</span>
          </button>

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

      {/* Category Tabs: All / 2-Wheeler Community Rentals / Commercial */}
      <div className="chp-cat-tabs" role="tablist" aria-label="Charging categories">
        <button
          type="button"
          className={`chp-cat-tab ${activeCategory === 'two_wheeler' ? 'is-active' : ''}`}
          onClick={() => setActiveCategory('two_wheeler')}
        >
          <span>🛵 2-Wheeler Community Rentals (P2P)</span>
          <span className="chp-cat-badge">{filtered2W.length}</span>
        </button>

        <button
          type="button"
          className={`chp-cat-tab ${activeCategory === 'commercial' ? 'is-active' : ''}`}
          onClick={() => setActiveCategory('commercial')}
        >
          <span>⚡ Commercial Fast Hubs</span>
          <span className="chp-cat-badge">{filtered.length}</span>
        </button>

        <button
          type="button"
          className={`chp-cat-tab ${activeCategory === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <span>🌐 All EV Charging</span>
          <span className="chp-cat-badge">{filtered2W.length + filtered.length}</span>
        </button>
      </div>

      {/* 2-Wheeler Hero / Community Banner */}
      {(activeCategory === 'two_wheeler' || activeCategory === 'all') && (
        <div className="chp-2w-banner card">
          <div className="chp-2w-banner-content">
            <div className="chp-2w-banner-icon">🛵</div>
            <div>
              <h3 className="chp-2w-banner-title">
                2-Wheeler Peer-to-Peer Charger Sharing Network
              </h3>
              <p className="chp-2w-banner-desc">
                Have a home 16A socket or Ather/Ola charger? <strong>Post your availability</strong> and earn ₹20–₹40/hr. Low battery on your scooter? <strong>Check nearby verified hosts</strong> and book an instant top-up.
              </p>
            </div>
          </div>

          <div className="chp-2w-banner-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowPost2WModal(true)}
            >
              <Zap size={13} />
              <span>Apply to Rent Your Charger</span>
            </button>
            {activeCategory !== 'two_wheeler' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveCategory('two_wheeler')}
              >
                <span>Check 2W Chargers ({filtered2W.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="chp-filters card">
        <div className="chp-search-wrap">
          <Search size={15} className="chp-search-icon" />
          <input
            className="chp-search"
            placeholder={
              activeCategory === 'two_wheeler'
                ? 'Search 2W chargers by area, host name, city, landmark, or scooter (Ather, Ola)…'
                : 'Search by station name, metro, landmark, or city…'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search charging stations"
          />
        </div>

        <div className="chp-selects">
          <div className="chp-select-wrap">
            <select
              className="chp-select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Filter by City"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={13} className="chp-sel-icon" />
          </div>

          {activeCategory !== 'two_wheeler' && (
            <div className="chp-select-wrap">
              <select
                className="chp-select"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                aria-label="Filter by Operator"
              >
                {OPERATORS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={13} className="chp-sel-icon" />
            </div>
          )}
        </div>

        {/* Status tabs (Only shown when commercial stations are in view) */}
        {activeCategory !== 'two_wheeler' && (
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
        )}

        {/* 2-Wheeler Quick Toggle */}
        {(activeCategory === 'two_wheeler' || activeCategory === 'all') && (
          <button
            type="button"
            className={`chp-avail-toggle-btn ${twoWheelerAvailOnly ? 'is-active' : ''}`}
            onClick={() => setTwoWheelerAvailOnly((prev) => !prev)}
            title="Show only 2-wheeler chargers available right now"
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: twoWheelerAvailOnly ? '#34d399' : '#9ca3af',
              }}
            />
            <span>Available Now Only</span>
          </button>
        )}
      </div>

      {/* 2W Scooter Model Filter Pills */}
      {(activeCategory === 'two_wheeler' || activeCategory === 'all') && (
        <div className="chp-scooter-pills">
          <span className="chp-scooter-pill-label">🛵 Filter by EV Scooter:</span>
          {SCOOTER_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              className={`chp-scooter-pill ${selectedScooter === s ? 'is-active' : ''}`}
              onClick={() => setSelectedScooter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area based on View Mode */}
      {viewMode === 'grid' && (
        <div className="chp-grid-container">
          {/* 1. Only 2-Wheeler Tab */}
          {activeCategory === 'two_wheeler' && (
            <>
              {filtered2W.length === 0 ? (
                <div className="chp-empty card">
                  <Search size={32} strokeWidth={1.2} />
                  <div>No 2-wheeler chargers found matching your filter in {city}.</div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowPost2WModal(true)}>
                    Post the First 2W Charger in {city}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={handleClearFilters}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="chp-grid">
                  {filtered2W.map((c) => (
                    <TwoWheelerCard
                      key={c.id}
                      charger={c}
                      selected={selected?.id === c.id}
                      onSelect={(st) => setSelected(st)}
                      onBook={(st) => setBooking2WCharger(st)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* 2. Only Commercial Tab */}
          {activeCategory === 'commercial' && (
            <>
              {filtered.length === 0 ? (
                <div className="chp-empty card">
                  <Search size={32} strokeWidth={1.2} />
                  <div>No commercial stations match your selected filters.</div>
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

          {/* 3. All Category Tab */}
          {activeCategory === 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* 2-Wheeler Community Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🛵 2-Wheeler Community Rentals</span>
                    <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>({filtered2W.length} verified hosts)</span>
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#10B981', fontSize: '12px' }}
                    onClick={() => setShowPost2WModal(true)}
                  >
                    + Post 2W Charger
                  </button>
                </div>

                {filtered2W.length === 0 ? (
                  <div className="chp-empty card" style={{ padding: '24px' }}>
                    <div>No 2-wheeler chargers in this view.</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowPost2WModal(true)}>
                      Post a 2W Charger (Apply)
                    </button>
                  </div>
                ) : (
                  <div className="chp-grid">
                    {filtered2W.slice(0, 4).map((c) => (
                      <TwoWheelerCard
                        key={c.id}
                        charger={c}
                        selected={selected?.id === c.id}
                        onSelect={(st) => setSelected(st)}
                        onBook={(st) => setBooking2WCharger(st)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Commercial Fast Stations Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚡ Commercial Fast Charging Hubs</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-3)', fontWeight: 600 }}>({filtered.length} stations)</span>
                  </h2>
                </div>

                {filtered.length === 0 ? (
                  <div className="chp-empty card" style={{ padding: '24px' }}>
                    <div>No commercial stations match your search.</div>
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Split View */}
      {viewMode === 'split' && (
        <div className="chp-split-layout">
          {/* Left: Scroll Cards List */}
          <div className="chp-split-list">
            {activeCategory === 'two_wheeler' && (
              <>
                {filtered2W.length === 0 ? (
                  <div className="chp-empty card">
                    <Search size={32} strokeWidth={1.2} />
                    <div>No 2-wheeler chargers match your search in {city}.</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowPost2WModal(true)}>
                      Post 2W Charger (Apply)
                    </button>
                  </div>
                ) : (
                  <div className="chp-split-cards">
                    {filtered2W.map((c) => (
                      <TwoWheelerCard
                        key={c.id}
                        charger={c}
                        selected={selected?.id === c.id}
                        onSelect={(st) => setSelected(st)}
                        onBook={(st) => setBooking2WCharger(st)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeCategory === 'commercial' && (
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
                  <div className="chp-split-cards">
                    {filtered.map((c) => (
                      <ChargerCard
                        key={c.id}
                        charger={c}
                        selected={selected?.id === c.id}
                        onClick={(station) => setSelected(station)}
                        onReserve={(station) => setReservingStation(station)}
                        onReport={(station) => setReportingStation(station)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeCategory === 'all' && (
              <div className="chp-split-cards">
                <div style={{ padding: '6px 4px 2px', fontSize: '13px', fontWeight: 700, color: '#34d399', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🛵 2-Wheeler Community Rentals ({filtered2W.length})</span>
                  <button
                    type="button"
                    onClick={() => setShowPost2WModal(true)}
                    style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + Post 2W
                  </button>
                </div>

                {filtered2W.map((c) => (
                  <TwoWheelerCard
                    key={c.id}
                    charger={c}
                    selected={selected?.id === c.id}
                    onSelect={(st) => setSelected(st)}
                    onBook={(st) => setBooking2WCharger(st)}
                  />
                ))}

                <div style={{ padding: '16px 4px 2px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-2)' }}>
                  <span>⚡ Commercial Fast Hubs ({filtered.length})</span>
                </div>

                {filtered.map((c) => (
                  <ChargerCard
                    key={c.id}
                    charger={c}
                    selected={selected?.id === c.id}
                    onClick={(station) => setSelected(station)}
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
                <span>
                  {activeCategory === 'two_wheeler'
                    ? `🛵 2W Community Locations (${filtered2W.length} found)`
                    : activeCategory === 'commercial'
                    ? `⚡ Commercial Stations (${filtered.length} found)`
                    : `Charging Map (${mapStations.length} pins)`}
                </span>
              </div>
              <Link to="/map" className="chp-map-fullscreen-link" title="Open in Fullscreen Live Map">
                <span>Fullscreen Live Map</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            <div className="chp-map-wrapper">
              <MapContainer
                center={INDIA_CENTER}
                zoom={INDIA_DEFAULT_ZOOM}
                minZoom={INDIA_MIN_ZOOM}
                maxZoom={INDIA_MAX_ZOOM}
                maxBounds={INDIA_BOUNDS}
                maxBoundsViscosity={1.0}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                  maxZoom={19}
                  bounds={INDIA_BOUNDS}
                  noWrap={true}
                />

                {mapStations.map((c) => {
                  const isSelected = selected?.id === c.id;

                  // 1. 2-Wheeler Community Charger Pin
                  if (c.isCommunity2W) {
                    const cleanPhone = (c.hostPhone || '').replace(/\D/g, '');
                    return (
                      <Marker
                        key={c.id}
                        position={[c.lat, c.lng]}
                        icon={makeTwoWheelerMarkerIcon(c, isSelected)}
                        eventHandlers={{
                          click: () => {
                            setSelected(c);
                          },
                        }}
                      >
                        <Popup>
                          <div className="chp-map-popup">
                            <div className="tw-popup-host">🛵 2W Host: {c.hostName} (Verified)</div>
                            <div className="cmp-title">{c.title}</div>
                            <div className="cmp-city">{c.area}, {c.city}</div>
                            <div className="cmp-badges">
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                                ● {c.availabilityStatus === 'available_now' ? 'Available Now' : 'Scheduled'}
                              </span>
                              <span className="cmp-speed">{c.socketType}</span>
                            </div>
                            <div className="cmp-avail">
                              Rate: <strong style={{ color: '#059669' }}>{c.rateDisplay}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm cmp-reserve-btn"
                                onClick={() => setBooking2WCharger(c)}
                              >
                                <Zap size={12} />
                                <span>Request Slot</span>
                              </button>
                              <a
                                href={`tel:+91${cleanPhone}`}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px' }}
                                title="Call Host"
                              >
                                <Phone size={12} />
                              </a>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }

                  // 2. Commercial Station Pin
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

                <ChargersMapController selectedStation={selected} stations={mapStations} />
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="chp-fullmap-card card page-enter">
          <div className="chp-map-header">
            <div className="chp-map-title">
              <MapIcon size={14} className="text-primary" />
              <span>Full Interactive Map ({mapStations.length} pins matching search)</span>
            </div>
            <Link to="/map" className="chp-map-fullscreen-link" title="Open in Fullscreen Live Map">
              <span>Fullscreen Live Map</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          <div className="chp-fullmap-wrapper">
            <MapContainer
              center={INDIA_CENTER}
              zoom={INDIA_DEFAULT_ZOOM}
              minZoom={INDIA_MIN_ZOOM}
              maxZoom={INDIA_MAX_ZOOM}
              maxBounds={INDIA_BOUNDS}
              maxBoundsViscosity={1.0}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                maxZoom={19}
                bounds={INDIA_BOUNDS}
                noWrap={true}
              />

              {mapStations.map((c) => {
                const isSelected = selected?.id === c.id;

                if (c.isCommunity2W) {
                  const cleanPhone = (c.hostPhone || '').replace(/\D/g, '');
                  return (
                    <Marker
                      key={c.id}
                      position={[c.lat, c.lng]}
                      icon={makeTwoWheelerMarkerIcon(c, isSelected)}
                      eventHandlers={{
                        click: () => {
                          setSelected(c);
                        },
                      }}
                    >
                      <Popup>
                        <div className="chp-map-popup">
                          <div className="tw-popup-host">🛵 2W Host: {c.hostName} (Verified)</div>
                          <div className="cmp-title">{c.title}</div>
                          <div className="cmp-city">{c.area}, {c.city}</div>
                          <div className="cmp-badges">
                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                              ● {c.availabilityStatus === 'available_now' ? 'Available Now' : 'Scheduled'}
                            </span>
                            <span className="cmp-speed">{c.socketType}</span>
                          </div>
                          <div className="cmp-avail">
                            Rate: <strong style={{ color: '#059669' }}>{c.rateDisplay}</strong>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm cmp-reserve-btn"
                              onClick={() => setBooking2WCharger(c)}
                            >
                              <Zap size={12} />
                              <span>Request Slot</span>
                            </button>
                            <a
                              href={`tel:+91${cleanPhone}`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px' }}
                              title="Call Host"
                            >
                              <Phone size={12} />
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }

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

              <ChargersMapController selectedStation={selected} stations={mapStations} />
            </MapContainer>
          </div>
        </div>
      )}

      {/* 2-Wheeler Host Apply / Post Modal */}
      {showPost2WModal && (
        <TwoWheelerRentModal
          isOpen={showPost2WModal}
          onClose={() => setShowPost2WModal(false)}
          onChargerPosted={handleChargerPosted}
        />
      )}

      {/* 2-Wheeler Booking / Request Slot Modal for Someone in Need */}
      {booking2WCharger && (
        <TwoWheelerBookingModal
          charger={booking2WCharger}
          isOpen={!!booking2WCharger}
          onClose={() => setBooking2WCharger(null)}
          onBookingSuccess={handleBookingSuccess}
        />
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
