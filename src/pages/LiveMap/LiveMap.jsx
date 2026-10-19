import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Clock,
  Zap,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Search,
  X,
  Navigation,
  Crosshair,
  SlidersHorizontal,
  ExternalLink,
  Layers,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
} from 'lucide-react';
import { CHARGERS, CITIES, getQueueForecast } from '../../data/chargers';
import { INDIA_BOUNDS, INDIA_CENTER, INDIA_DEFAULT_ZOOM, INDIA_MIN_ZOOM, INDIA_MAX_ZOOM } from '../../data/mapBounds';
import { stationsApi } from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ReservationModal from '../../components/ReservationModal/ReservationModal';
import ReportIssueModal from '../../components/ReportIssueModal/ReportIssueModal';
import PageMeta from '../../components/PageMeta/PageMeta';
import { useToast } from '../../context/ToastContext';
import './LiveMap.css';

// Fix Leaflet default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Calculate distance between two lat/lng coordinates in km (Haversine formula)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// 100% Free, reliable tile providers with NO API key required and NO watermarks
const MAP_TILES = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    label: 'Street',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  esriStreet: {
    id: 'esriStreet',
    name: 'Esri World Street',
    label: 'Clean Street',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a>, DeLorme, NAVTEQ',
    maxZoom: 19,
  },
  satellite: {
    id: 'satellite',
    name: 'Esri Satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      '&copy; <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
};

// Google Maps-style Rich Pin Marker
function makeMarkerIcon(charger, isSelected) {
  const statusColors = {
    available: '#059669', // Emerald green
    busy: '#D97706',      // Warm amber
    offline: '#DC2626',   // Coral red
  };
  const color = statusColors[charger.status] || '#6B7280';
  const label = charger.status === 'offline' ? '!' : `${charger.available}`;

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

// Google Maps-style Blue GPS dot
function makeUserDotIcon() {
  const html = `
    <div class="gmap-user-dot">
      <div class="gmap-user-dot-pulse"></div>
      <div class="gmap-user-dot-core"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gmap-user-container',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// Floating Action Controls inside Leaflet Container (Access to useMap for Zoom In / Zoom Out)
function MapActionControls({
  locating,
  onLocate,
  onFitAll,
  onRefresh,
  loading,
  onResetCountry,
  activeLayerKey,
  onToggleLayer,
}) {
  const map = useMap();

  return (
    <div
      className="gmap-action-controls"
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Zoom In & Zoom Out Controls */}
      <div className="gmap-zoom-group">
        <button
          type="button"
          className="gmap-control-btn gmap-zoom-btn"
          onClick={() => map.zoomIn()}
          title="Zoom In (+)"
          aria-label="Zoom in"
        >
          <Plus size={18} strokeWidth={2.4} />
        </button>
        <div className="gmap-zoom-divider" />
        <button
          type="button"
          className="gmap-control-btn gmap-zoom-btn"
          onClick={() => map.zoomOut()}
          title="Zoom Out (-)"
          aria-label="Zoom out"
        >
          <Minus size={18} strokeWidth={2.4} />
        </button>
      </div>

      {/* Switch Map Style Layer (OpenStreetMap / Clean Street / Satellite) */}
      <button
        type="button"
        className="gmap-control-btn"
        onClick={onToggleLayer}
        title={`Map layer: ${MAP_TILES[activeLayerKey]?.name || 'OpenStreetMap'}. Click to toggle style.`}
        aria-label="Toggle map layer style"
      >
        <Layers size={18} />
      </button>

      {/* Reset to Full Country View */}
      <button
        type="button"
        className="gmap-control-btn"
        onClick={() => {
          map.setView(INDIA_CENTER, INDIA_DEFAULT_ZOOM, { duration: 1.2 });
          if (onResetCountry) onResetCountry();
        }}
        title="Zoom Out to Whole Country (India)"
        aria-label="Zoom out to whole country"
      >
        <RotateCcw size={16} />
      </button>

      {/* GPS Locate Me Button */}
      <button
        type="button"
        className={`gmap-control-btn ${locating ? 'gmap-control-btn--active' : ''}`}
        onClick={onLocate}
        title="Find chargers near my location"
        aria-label="Locate me"
      >
        <Crosshair size={18} className={locating ? 'spin' : ''} />
      </button>

      {/* Fit All Stations */}
      <button
        type="button"
        className="gmap-control-btn"
        onClick={onFitAll}
        title="Fit all matching stations in view"
        aria-label="Fit all stations"
      >
        <Maximize2 size={18} />
      </button>

      {/* Refresh Status */}
      <button
        type="button"
        className="gmap-control-btn"
        onClick={onRefresh}
        title="Refresh live charger status"
        aria-label="Refresh status"
      >
        <RefreshCw size={17} className={loading ? 'spin' : ''} />
      </button>
    </div>
  );
}

// Smooth Camera Controller with Auto Resize Invalidation
function MapController({ selectedCharger, userLocation, fitBoundsTrigger }) {
  const map = useMap();

  // Ensure map fills container and re-renders tiles without grey blank areas
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
    if (selectedCharger) {
      map.flyTo([selectedCharger.lat, selectedCharger.lng], 15, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [selectedCharger, map]);

  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    }
  }, [userLocation, map]);

  useEffect(() => {
    if (fitBoundsTrigger && fitBoundsTrigger.length > 0) {
      try {
        if (fitBoundsTrigger.length === 1) {
          map.flyTo(fitBoundsTrigger[0], 14, { duration: 1.2 });
        } else {
          map.fitBounds(fitBoundsTrigger, {
            padding: [60, 60],
            maxZoom: 14,
            duration: 1.2,
          });
        }
      } catch {
        // ignore bounds calculation edge cases
      }
    }
  }, [fitBoundsTrigger, map]);

  return null;
}

export default function LiveMap() {
  const [stations, setStations] = useState(CHARGERS);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);
  const [filterFastOnly, setFilterFastOnly] = useState(false);
  const [activeTileLayer, setActiveTileLayer] = useState('osm');

  const [selectedCharger, setSelectedCharger] = useState(null);
  const [showDrawerList, setShowDrawerList] = useState(false);
  const [showForecastChart, setShowForecastChart] = useState(false);
  const [forecastData, setForecastData] = useState([]);

  // User Geolocation
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(null);
  const toast = useToast();

  const handleToggleTileLayer = () => {
    const keys = Object.keys(MAP_TILES);
    const nextIdx = (keys.indexOf(activeTileLayer) + 1) % keys.length;
    const nextKey = keys[nextIdx];
    setActiveTileLayer(nextKey);
    toast.info(`Map layer switched to ${MAP_TILES[nextKey].name}`);
  };

  // Modals
  const [isReserving, setIsReserving] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  // Check if location prompt should show on initial page load
  useEffect(() => {
    const prompted = sessionStorage.getItem('voltaic_loc_prompted');
    if (!userLocation && !prompted) {
      const timer = setTimeout(() => {
        setShowLocationPrompt(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [userLocation]);

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
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedCharger]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Handle GPS "Near Me" Locate action
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocating(false);
        toast.success('Location found! Showing nearest charging stations.');
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation error:', err);
        // Fallback to central Mumbai BKC for demo if permission denied
        const demoCoords = { lat: 19.0633, lng: 72.8687 };
        setUserLocation(demoCoords);
        toast.info('Using simulated GPS position near Mumbai BKC.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Filter and sort stations
  const filtered = useMemo(() => {
    let result = stations;

    // City filter
    if (selectedCity !== 'All Cities') {
      result = result.filter((c) => c.city === selectedCity);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.operator.toLowerCase().includes(q) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }

    // Available only filter
    if (filterAvailableOnly) {
      result = result.filter((c) => c.status === 'available' && c.available > 0);
    }

    // Fast chargers only filter (speed >= 60 kW)
    if (filterFastOnly) {
      result = result.filter((c) => c.speed >= 60);
    }

    // If userLocation is set, sort by distance
    if (userLocation) {
      return [...result].sort((a, b) => {
        const distA = calculateDistanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng) || 9999;
        const distB = calculateDistanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng) || 9999;
        return distA - distB;
      });
    }

    return result;
  }, [stations, selectedCity, searchQuery, filterAvailableOnly, filterFastOnly, userLocation]);

  // Recenter / Fit All Bounds
  const handleFitAll = () => {
    if (filtered.length > 0) {
      const bounds = filtered.map((c) => [c.lat, c.lng]);
      setFitBoundsTrigger(bounds);
    }
  };

  // Trigger fit bounds when city changes OR search query changes
  useEffect(() => {
    if (searchQuery.trim() && filtered.length > 0) {
      const bounds = filtered.map((c) => [c.lat, c.lng]);
      setFitBoundsTrigger(bounds);
      if (filtered.length === 1) {
        setSelectedCharger(filtered[0]);
      }
    } else if (!searchQuery.trim() && selectedCity !== 'All Cities' && filtered.length > 0) {
      const bounds = filtered.map((c) => [c.lat, c.lng]);
      setFitBoundsTrigger(bounds);
    }
  }, [searchQuery, selectedCity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load forecast when charger selected
  useEffect(() => {
    if (selectedCharger) {
      setForecastData(getQueueForecast(selectedCharger.id, selectedCharger.busy));
    }
  }, [selectedCharger]);

  // Turn-by-turn navigation URL
  const getDirectionsUrl = (charger) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${charger.lat},${charger.lng}`;
  };

  return (
    <div className="livemap gmap-fullscreen page-enter">
      <PageMeta
        title="Live Charging Map"
        description="Find EV chargers on a smooth Google Maps experience with real-time port availability, GPS location, and 1-tap navigation."
      />

      {/* ─── 1. GOOGLE MAPS FLOATING SEARCH & FILTER BAR ─── */}
      <div className="gmap-floating-overlay">
        <div className="gmap-search-bar card">
          <div className="gmap-search-input-wrap">
            <Search size={16} className="gmap-search-icon" />
            <input
              type="text"
              className="gmap-search-input"
              placeholder="Search stations, areas, or landmarks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="gmap-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="gmap-city-picker">
            <select
              aria-label="Filter stations by city"
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedCharger(null);
              }}
              className="gmap-city-select"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="gmap-city-icon" />
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="gmap-filter-chips">
          <button
            type="button"
            className={`gmap-chip ${filterAvailableOnly ? 'gmap-chip--active' : ''}`}
            onClick={() => setFilterAvailableOnly(!filterAvailableOnly)}
          >
            <span className="gmap-chip-dot dot-available" />
            <span>Open Now</span>
          </button>

          <button
            type="button"
            className={`gmap-chip ${filterFastOnly ? 'gmap-chip--active' : ''}`}
            onClick={() => setFilterFastOnly(!filterFastOnly)}
          >
            <Zap size={13} />
            <span>Fast (≥60 kW)</span>
          </button>

          <button
            type="button"
            className={`gmap-chip ${showDrawerList ? 'gmap-chip--active' : ''}`}
            onClick={() => setShowDrawerList(!showDrawerList)}
            title="Toggle list view"
          >
            <SlidersHorizontal size={13} />
            <span>{filtered.length} Stations</span>
          </button>

          {/* Quick Map Style Layer Switcher Chip */}
          <button
            type="button"
            className="gmap-chip"
            onClick={handleToggleTileLayer}
            title="Switch map layer (OpenStreetMap / Clean Street / Satellite)"
          >
            <Layers size={13} />
            <span>Map: {MAP_TILES[activeTileLayer]?.label || 'Street'}</span>
          </button>

          {(searchQuery || filterAvailableOnly || filterFastOnly || selectedCity !== 'All Cities') && (
            <button
              type="button"
              className="gmap-chip gmap-chip--reset"
              onClick={() => {
                setSearchQuery('');
                setSelectedCity('All Cities');
                setFilterAvailableOnly(false);
                setFilterFastOnly(false);
                toast.info('All filters reset.');
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Floating No Stations Found Banner */}
        {filtered.length === 0 && searchQuery && (
          <div className="gmap-empty-alert card page-enter">
            <span>No charging stations found matching &ldquo;{searchQuery}&rdquo;</span>
            <button
              type="button"
              className="gmap-empty-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* ─── 2. FULL-BLEED INTERACTIVE MAP CONTAINER ─── */}
      <div className="gmap-canvas-container">
        <MapContainer
          center={INDIA_CENTER}
          zoom={INDIA_DEFAULT_ZOOM}
          minZoom={INDIA_MIN_ZOOM}
          maxZoom={INDIA_MAX_ZOOM}
          maxBounds={INDIA_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          {/* 100% Free, reliable tile provider (restricted strictly to India bounds) */}
          <TileLayer
            key={activeTileLayer}
            url={MAP_TILES[activeTileLayer].url}
            attribution={MAP_TILES[activeTileLayer].attribution}
            maxZoom={MAP_TILES[activeTileLayer].maxZoom}
            bounds={INDIA_BOUNDS}
            noWrap={true}
          />

          {/* User GPS location dot */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={makeUserDotIcon()}>
              <Popup>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>📍 Your Location</div>
              </Popup>
            </Marker>
          )}

          {/* Charging Station Pins */}
          {filtered.map((c) => {
            const isSelected = selectedCharger?.id === c.id;
            return (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={makeMarkerIcon(c, isSelected)}
                eventHandlers={{
                  click: () => {
                    setSelectedCharger(c);
                    setShowDrawerList(false);
                  },
                }}
              >
                <Popup>
                  <div className="gmap-mini-popup">
                    <div className="gmp-name">{c.name}</div>
                    <div className="gmp-city">{c.city} · {c.operator}</div>
                    <div className="gmp-row">
                      <span className={`badge badge-${c.status}`}>
                        <span className={`dot dot-${c.status}`} />
                        {c.status === 'available' ? 'Available' : c.status === 'busy' ? 'Busy' : 'Offline'}
                      </span>
                      <span className="gmp-speed">{c.speed} kW DC</span>
                    </div>
                    <div className="gmp-ports">
                      <strong style={{ color: '#059669' }}>{c.available} free</strong> / {c.ports} total
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <MapController
            selectedCharger={selectedCharger}
            userLocation={userLocation}
            fitBoundsTrigger={fitBoundsTrigger}
          />

          {/* Dedicated Zoom and Action Controls with useMap access */}
          <MapActionControls
            locating={locating}
            onLocate={handleLocateMe}
            onFitAll={handleFitAll}
            onRefresh={async () => {
              await fetchStations();
              toast.success('Live station availability updated.');
            }}
            loading={loading}
            onResetCountry={() => {
              setSelectedCity('All Cities');
              setSelectedCharger(null);
            }}
            activeLayerKey={activeTileLayer}
            onToggleLayer={handleToggleTileLayer}
          />
        </MapContainer>
      </div>

      {/* ─── 3. GOOGLE MAPS FLOATING PLACE CARD ─── */}
      {selectedCharger && (
        <div className="gmap-place-card card page-enter">
          <div className="gpc-header">
            <div className="gpc-meta">
              <span className="gpc-operator-badge">{selectedCharger.operator}</span>
              <h2 className="gpc-title font-display">{selectedCharger.name}</h2>
              <div className="gpc-address">{selectedCharger.address || `${selectedCharger.city}, India`}</div>
            </div>
            <button
              type="button"
              className="gpc-close-btn"
              onClick={() => setSelectedCharger(null)}
              aria-label="Close place details"
            >
              <X size={16} />
            </button>
          </div>

          {/* Distance & Hours Pill */}
          <div className="gpc-tags-row">
            {userLocation && (
              <span className="gpc-tag gpc-tag--dist">
                <Navigation size={12} />
                {calculateDistanceKm(userLocation.lat, userLocation.lng, selectedCharger.lat, selectedCharger.lng)} km away
              </span>
            )}
            <span className="gpc-tag gpc-tag--hours">
              <Clock size={12} /> {selectedCharger.hours || '24 Hours Open'}
            </span>
            <span className={`badge badge-${selectedCharger.status}`}>
              <span className={`dot dot-${selectedCharger.status}`} />
              {selectedCharger.status === 'available'
                ? 'Open Now'
                : selectedCharger.status === 'busy'
                ? 'Busy'
                : 'Offline'}
            </span>
          </div>

          {/* Stats Bar */}
          <div className="gpc-stats-grid">
            <div className="gpc-stat-item">
              <span className="gpc-stat-val gpc-stat--avail">{selectedCharger.available}</span>
              <span className="gpc-stat-lbl">Open Plugs</span>
            </div>
            <div className="gpc-stat-item">
              <span className="gpc-stat-val gpc-stat--busy">{selectedCharger.busy}</span>
              <span className="gpc-stat-lbl">In Use</span>
            </div>
            <div className="gpc-stat-item">
              <span className="gpc-stat-val">{selectedCharger.speed} kW</span>
              <span className="gpc-stat-lbl">Max Power</span>
            </div>
            <div className="gpc-stat-item">
              <span className="gpc-stat-val">₹{selectedCharger.tariffPerKwh || 19.5}</span>
              <span className="gpc-stat-lbl">Per kWh</span>
            </div>
          </div>

          {/* Wait banner if station is busy */}
          {selectedCharger.status === 'busy' && selectedCharger.waitMin > 0 && (
            <div className="gpc-wait-alert">
              <Clock size={14} />
              <span>Estimated wait time: <strong>~{selectedCharger.waitMin} minutes</strong></span>
            </div>
          )}

          {/* Station Amenities */}
          {Array.isArray(selectedCharger.amenities) && selectedCharger.amenities.length > 0 && (
            <div className="gpc-amenities-wrap">
              <span className="gpc-section-label">Nearby Amenities:</span>
              <div className="gpc-amenities-list">
                {selectedCharger.amenities.map((item) => (
                  <span key={item} className="gpc-amenity-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* PRIMARY ACTIONS: Directions & Reserve */}
          <div className="gpc-actions-row">
            <a
              href={getDirectionsUrl(selectedCharger)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary gpc-directions-btn"
              title="Open turn-by-turn navigation in Google Maps"
            >
              <Navigation size={15} />
              <span>Directions</span>
              <ExternalLink size={12} />
            </a>

            <button
              type="button"
              className="btn btn-primary gpc-reserve-btn"
              disabled={selectedCharger.status === 'offline' || selectedCharger.available === 0}
              onClick={() => {
                if (selectedCharger.status === 'offline' || selectedCharger.available === 0) {
                  toast.error('No charging spots are available at this station right now.');
                  return;
                }
                setIsReserving(true);
              }}
            >
              <Zap size={15} />
              <span>Reserve a Spot</span>
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="gpc-sub-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowForecastChart(!showForecastChart)}
            >
              <Clock size={13} />
              <span>{showForecastChart ? 'Hide Rush Hours' : 'Check Rush Hours'}</span>
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setIsReporting(true)}
              style={{ color: '#9CA3AF' }}
            >
              <AlertTriangle size={13} />
              <span>Report Issue</span>
            </button>
          </div>

          {/* Collapsible Rush Hours Forecast Chart */}
          {showForecastChart && (
            <div className="gpc-forecast-chart-wrap page-enter">
              <div className="gpc-chart-title">Estimated Wait Load (Next 8 Hours)</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={forecastData} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E6EE' }}
                    cursor={{ fill: '#F0F2F6' }}
                  />
                  <ReferenceLine y={selectedCharger.ports} stroke="#E2E6EE" strokeDasharray="3 3" />
                  <Bar dataKey="vehicles" fill="#6366F1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ─── 4. FLOATING STATION LIST DRAWER (When Toggled) ─── */}
      {showDrawerList && (
        <div className="gmap-list-drawer card page-enter">
          <div className="gld-header">
            <div>
              <div className="gld-title font-display">Charging Stations ({filtered.length})</div>
              <div className="gld-sub">{userLocation ? 'Sorted by closest distance' : 'Live network availability'}</div>
            </div>
            <button type="button" className="gpc-close-btn" onClick={() => setShowDrawerList(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="gld-body">
            {filtered.map((c) => {
              const dist = userLocation ? calculateDistanceKm(userLocation.lat, userLocation.lng, c.lat, c.lng) : null;
              return (
                <div
                  key={c.id}
                  className="gld-item"
                  onClick={() => {
                    setSelectedCharger(c);
                    setShowDrawerList(false);
                  }}
                >
                  <div className={`gld-status-bar gld-status-bar--${c.status}`} />
                  <div className="gld-item-info">
                    <div className="gld-item-name">{c.name}</div>
                    <div className="gld-item-meta">
                      {c.city} · {c.operator}
                      {dist && <span className="gld-dist"> · {dist} km</span>}
                    </div>
                  </div>
                  <div className="gld-item-badge">
                    <span className="gld-item-avail">{c.available}</span>
                    <span className="gld-item-total">/{c.ports} free</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 5. POPUP ASKING USER FOR LOCATION ACCESS ─── */}
      {showLocationPrompt && (
        <div className="gmap-loc-modal-overlay page-enter">
          <div className="gmap-loc-modal-card card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="glp-modal-close"
              onClick={() => {
                setShowLocationPrompt(false);
                sessionStorage.setItem('voltaic_loc_prompted', 'true');
              }}
              aria-label="Dismiss location request"
            >
              <X size={16} />
            </button>

            <div className="glp-beacon-wrap">
              <div className="glp-beacon-icon-circle">
                <Navigation size={24} className="glp-beacon-svg" />
              </div>
              <div className="glp-beacon-ring" />
            </div>

            <div className="glp-content-block">
              <h3 className="glp-heading font-display">Find Nearest Charging Stations?</h3>
              <p className="glp-subheading">
                Allow location access so VoltaicOS can detect where your electric car is, calculate driving distances, and guide you to the closest available charging plugs.
              </p>
            </div>

            <div className="glp-btn-stack">
              <button
                type="button"
                className="btn btn-primary glp-btn-primary"
                onClick={() => {
                  setShowLocationPrompt(false);
                  sessionStorage.setItem('voltaic_loc_prompted', 'true');
                  handleLocateMe();
                }}
              >
                <Crosshair size={16} />
                <span>Allow Location Access</span>
              </button>

              <button
                type="button"
                className="btn btn-ghost glp-btn-secondary"
                onClick={() => {
                  setShowLocationPrompt(false);
                  sessionStorage.setItem('voltaic_loc_prompted', 'true');
                }}
              >
                Browse Stations Manually
              </button>
            </div>
          </div>
        </div>
      )}

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
