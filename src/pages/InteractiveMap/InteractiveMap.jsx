import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  RotateCcw,
  Crosshair,
  Trash2,
  Code2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Radio,
  Sparkles,
  Info,
  Move,
} from 'lucide-react';
import PageMeta from '../../components/PageMeta/PageMeta';
import { useToast } from '../../context/ToastContext';
import './InteractiveMap.css';

// Fix Leaflet default marker icon paths in Vite bundle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Tile Layer configurations (using reliable, watermark-free free tile services)
const BASE_LAYERS = {
  osm: {
    name: 'OpenStreetMap (Default)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  esriStreet: {
    name: 'Esri World Street',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a>, DeLorme, NAVTEQ',
    maxZoom: 19,
  },
  hot: {
    name: 'Humanitarian OSM',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
  satellite: {
    name: 'Esri Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      '&copy; <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
};

const LOCATION_PRESETS = [
  { name: 'London (Original)', coords: [51.505, -0.09], zoom: 13, tag: 'Snippet default' },
  { name: 'Mumbai EV Hub', coords: [19.076, 72.8777], zoom: 13, tag: 'India HQ' },
  { name: 'New York', coords: [40.7128, -74.006], zoom: 13, tag: 'USA' },
  { name: 'Tokyo', coords: [35.6762, 139.6503], zoom: 13, tag: 'Japan' },
];

export default function InteractiveMap() {
  const toast = useToast();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const initialMarkerRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const circleLayerRef = useRef(null);
  const customMarkersRef = useRef([]);

  const [activeLayerKey, setActiveLayerKey] = useState('osm');
  const [markersCount, setMarkersCount] = useState(1);
  const [cursorCoords, setCursorCoords] = useState({ lat: 51.505, lng: -0.09 });
  const [showRadiusCircle, setShowRadiusCircle] = useState(true);
  const [circleRadiusMeters, setCircleRadiusMeters] = useState(1200);
  const [isDraggableMarkers, setIsDraggableMarkers] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);

  // Raw snippet provided by user
  const rawCodeSnippet = `var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

L.marker([51.5, -0.09]).addTo(map)
    .bindPopup('A pretty CSS popup.<br> Easily customizable.')
    .openPopup();`;

  // Function to add an interactive custom marker on click
  const addCustomMarker = useCallback(
    (lat, lng, label = 'Custom Pin') => {
      if (!mapInstanceRef.current) return;

      const marker = L.marker([lat, lng], {
        draggable: isDraggableMarkers,
      }).addTo(mapInstanceRef.current);

      const markerId = `marker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      marker._customId = markerId;

      const createPopupHtml = (cLat, cLng) => `
        <div class="interactive-popup custom-pin-popup">
          <div class="popup-badge custom-badge">📍 ${label}</div>
          <div class="popup-coords">
            <span><strong>Lat:</strong> ${cLat.toFixed(5)}</span>
            <span><strong>Lng:</strong> ${cLng.toFixed(5)}</span>
          </div>
          <p class="popup-subtext">Click and drag this pin anywhere on the map.</p>
          <button id="del-${markerId}" class="popup-delete-btn">
            Delete marker
          </button>
        </div>
      `;

      marker.bindPopup(createPopupHtml(lat, lng), {
        className: 'custom-leaflet-popup',
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        marker.setPopupContent(createPopupHtml(pos.lat, pos.lng));
        marker.openPopup();
        toast.info(`Moved to ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
      });

      marker.on('popupopen', () => {
        const delBtn = document.getElementById(`del-${markerId}`);
        if (delBtn) {
          delBtn.onclick = (e) => {
            e.stopPropagation();
            if (mapInstanceRef.current) {
              mapInstanceRef.current.removeLayer(marker);
              customMarkersRef.current = customMarkersRef.current.filter((m) => m !== marker);
              setMarkersCount(1 + customMarkersRef.current.length);
              toast.info('Marker removed.');
            }
          };
        }
      });

      customMarkersRef.current.push(marker);
      setMarkersCount(1 + customMarkersRef.current.length);
      marker.openPopup();
    },
    [isDraggableMarkers, toast]
  );

  // Initialize Leaflet map matching user's exact specification
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent re-initialization error
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // 1. var map = L.map('map').setView([51.505, -0.09], 13);
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // will use custom styled controls
    }).setView([51.505, -0.09], 13);
    mapInstanceRef.current = map;

    // 2. L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: ... }).addTo(map);
    const tileLayer = L.tileLayer(BASE_LAYERS.osm.url, {
      attribution: BASE_LAYERS.osm.attribution,
      maxZoom: BASE_LAYERS.osm.maxZoom,
    }).addTo(map);
    currentTileLayerRef.current = tileLayer;

    // 3. L.marker([51.5, -0.09]).addTo(map).bindPopup('A pretty CSS popup.<br> Easily customizable.').openPopup();
    const initialMarker = L.marker([51.5, -0.09], {
      draggable: true,
      title: 'Original Leaflet Pin',
    }).addTo(map);

    const initialPopupContent = `
      <div class="interactive-popup original-popup">
        <div class="popup-badge original-badge">✨ Leaflet Snippet Active</div>
        <div class="popup-title">A pretty CSS popup.</div>
        <div class="popup-body">Easily customizable.</div>
        <div class="popup-meta">
          <span>Lat: 51.50000</span>
          <span>Lng: -0.09000</span>
        </div>
      </div>
    `;

    initialMarker
      .bindPopup(initialPopupContent, {
        className: 'custom-leaflet-popup original-style-popup',
        closeButton: true,
        autoClose: false,
      })
      .openPopup();
    initialMarkerRef.current = initialMarker;

    // 4. Radius Circle around the initial marker
    const circle = L.circle([51.5, -0.09], {
      color: '#6366f1',
      fillColor: '#818cf8',
      fillOpacity: 0.18,
      weight: 2,
      dashArray: '5, 8',
      radius: 1200,
    }).addTo(map);
    circleLayerRef.current = circle;

    // Interactivity: mouse movement coordinate tracker
    map.on('mousemove', (e) => {
      setCursorCoords({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    });

    // Interactivity: Click to add pin
    map.on('click', (e) => {
      addCustomMarker(e.latlng.lat, e.latlng.lng, `Pin #${customMarkersRef.current.length + 1}`);
      toast.success(`Dropped pin at ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch Tile Layer dynamically
  const handleLayerChange = (layerKey) => {
    if (!mapInstanceRef.current || layerKey === activeLayerKey) return;
    const config = BASE_LAYERS[layerKey];
    if (!config) return;

    if (currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
    }

    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: config.subdomains || 'abc',
      maxZoom: config.maxZoom,
    }).addTo(mapInstanceRef.current);

    currentTileLayerRef.current = newLayer;
    setActiveLayerKey(layerKey);
    toast.info(`Switched to ${config.name}`);
  };

  // Reset to original snippet view
  const handleResetSnippetView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([51.505, -0.09], 13, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
    if (initialMarkerRef.current) {
      initialMarkerRef.current.setLatLng([51.5, -0.09]);
      initialMarkerRef.current.openPopup();
    }
    toast.info('Reset view to snippet coordinates [51.505, -0.09]');
  };

  // Clear user-added markers
  const handleClearCustomMarkers = () => {
    if (!mapInstanceRef.current) return;
    customMarkersRef.current.forEach((m) => {
      mapInstanceRef.current.removeLayer(m);
    });
    customMarkersRef.current = [];
    setMarkersCount(1);
    toast.info('Cleared user markers. Kept initial snippet pin.');
  };

  // Fly to Preset Location
  const handleFlyToPreset = (coords, zoom, name) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(coords, zoom, {
      duration: 1.5,
    });
    toast.info(`Flying to ${name}`);
  };

  // Locate user with GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    toast.info('Acquiring your GPS position...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 14, { duration: 1.5 });
          addCustomMarker(latitude, longitude, 'Your GPS Location');
          toast.success('Located! Dropped GPS pin.');
        }
      },
      (err) => {
        toast.error(`Geolocation failed: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Radius circle toggle & size
  const handleToggleRadiusCircle = () => {
    const nextState = !showRadiusCircle;
    setShowRadiusCircle(nextState);
    if (!circleLayerRef.current || !mapInstanceRef.current) return;
    if (nextState) {
      circleLayerRef.current.addTo(mapInstanceRef.current);
    } else {
      mapInstanceRef.current.removeLayer(circleLayerRef.current);
    }
  };

  const handleRadiusChange = (meters) => {
    setCircleRadiusMeters(meters);
    if (circleLayerRef.current) {
      circleLayerRef.current.setRadius(meters);
    }
  };

  // Copy code snippet
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(rawCodeSnippet);
      setHasCopiedCode(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setHasCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy code.');
    }
  };

  return (
    <div className={`interactive-map-page page-enter ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <PageMeta
        title="Interactive Leaflet Map"
        description="Interactive OpenStreetMap Leaflet visualization in VoltaicOS with clickable pins, layer switcher, and custom CSS popups."
      />

      {/* ── Top Bar / Header ── */}
      <header className="imap-header">
        <div className="imap-header__left">
          <div className="imap-badge">
            <Sparkles size={13} />
            <span>Leaflet.js + OpenStreetMap</span>
          </div>
          <h1 className="imap-title font-display">Interactive Leaflet Map</h1>
          <p className="imap-desc">
            Powered by Leaflet v1.9.4 and OpenStreetMap tiles. Click anywhere on the map to drop pins,
            switch map layers, and explore custom CSS popups.
          </p>
        </div>

        <div className="imap-header__actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm imap-code-btn"
            onClick={() => setShowCodeModal(true)}
            title="Inspect Imported Leaflet Code"
          >
            <Code2 size={15} />
            <span>View Snippet</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm imap-reset-btn"
            onClick={handleResetSnippetView}
            title="Reset to snippet view [51.505, -0.09]"
          >
            <RotateCcw size={14} />
            <span>Reset View</span>
          </button>
        </div>
      </header>

      {/* ── Main Map Canvas & Overlays ── */}
      <div className="imap-stage-card card">
        {/* Floating Top-Left Controls Panel */}
        <aside className="imap-float-panel imap-panel-topleft" aria-label="Map Controls">
          {/* Tile Layer Selector */}
          <div className="imap-ctrl-group">
            <div className="imap-ctrl-label">
              <Layers size={13} />
              <span>Map Layer</span>
            </div>
            <div className="imap-layer-pills">
              {Object.entries(BASE_LAYERS).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className={`imap-layer-pill ${activeLayerKey === key ? 'is-active' : ''}`}
                  onClick={() => handleLayerChange(key)}
                >
                  {config.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="imap-ctrl-group">
            <div className="imap-ctrl-label">
              <MapPin size={13} />
              <span>Fly-To Presets</span>
            </div>
            <div className="imap-preset-pills">
              {LOCATION_PRESETS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  className="imap-preset-pill"
                  onClick={() => handleFlyToPreset(loc.coords, loc.zoom, loc.name)}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tools & Toggles */}
          <div className="imap-ctrl-group imap-tools-row">
            <button
              type="button"
              className="btn btn-ghost btn-xs imap-tool-btn"
              onClick={handleLocateMe}
              title="Locate my position via GPS"
            >
              <Crosshair size={13} />
              <span>Locate Me</span>
            </button>

            <button
              type="button"
              className={`btn btn-ghost btn-xs imap-tool-btn ${isDraggableMarkers ? 'is-active' : ''}`}
              onClick={() => {
                const next = !isDraggableMarkers;
                setIsDraggableMarkers(next);
                if (initialMarkerRef.current?.dragging) {
                  if (next) initialMarkerRef.current.dragging.enable();
                  else initialMarkerRef.current.dragging.disable();
                }
                customMarkersRef.current.forEach((m) => {
                  if (m.dragging) {
                    if (next) m.dragging.enable();
                    else m.dragging.disable();
                  }
                });
                toast.info(next ? 'Marker dragging enabled' : 'Marker positions locked');
              }}
              title="Toggle whether markers can be dragged around"
            >
              <Move size={13} />
              <span>{isDraggableMarkers ? 'Drag On' : 'Drag Off'}</span>
            </button>

            <button
              type="button"
              className={`btn btn-ghost btn-xs imap-tool-btn ${showRadiusCircle ? 'is-active' : ''}`}
              onClick={handleToggleRadiusCircle}
              title="Toggle radar geo-fence radius circle"
            >
              <Radio size={13} />
              <span>{showRadiusCircle ? 'Hide Radius' : 'Show Radius'}</span>
            </button>

            {markersCount > 1 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs imap-tool-btn text-danger"
                onClick={handleClearCustomMarkers}
                title="Clear all user-added markers"
              >
                <Trash2 size={13} />
                <span>Clear Added</span>
              </button>
            )}
          </div>

          {/* Radius range slider if active */}
          {showRadiusCircle && (
            <div className="imap-radius-slider-wrap">
              <div className="imap-radius-label">
                <span>Radius coverage:</span>
                <strong>{(circleRadiusMeters / 1000).toFixed(1)} km</strong>
              </div>
              <input
                type="range"
                min={300}
                max={5000}
                step={100}
                value={circleRadiusMeters}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="imap-slider"
              />
            </div>
          )}
        </aside>

        {/* Floating Top-Right Zoom & Fullscreen Panel */}
        <aside className="imap-float-panel imap-panel-topright" aria-label="Zoom and View">
          <button
            type="button"
            className="imap-icon-btn"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="imap-icon-btn"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Zoom out"
          >
            –
          </button>
          <div className="imap-divider-v" />
          <button
            type="button"
            className="imap-icon-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </aside>

        {/* Floating Bottom-Left Coordinate & Marker HUD */}
        <div className="imap-float-hud imap-hud-bottomleft">
          <div className="imap-hud-item">
            <span className="imap-hud-dot" />
            <span className="imap-hud-text">
              Cursor: <strong>{cursorCoords.lat.toFixed(4)}</strong>,{' '}
              <strong>{cursorCoords.lng.toFixed(4)}</strong>
            </span>
          </div>
          <div className="imap-hud-item">
            <MapPin size={12} />
            <span className="imap-hud-text">
              <strong>{markersCount}</strong> {markersCount === 1 ? 'marker' : 'markers'} active
            </span>
          </div>
        </div>

        {/* Floating Bottom-Right Click Hint */}
        <div className="imap-float-hint imap-hint-bottomright">
          <Info size={13} />
          <span>Click anywhere to drop interactive pins</span>
        </div>

        {/* The DOM Element where Leaflet attaches: id="map" */}
        <div id="map" ref={mapContainerRef} className="imap-leaflet-canvas" />
      </div>

      {/* ── View Source Snippet Modal ── */}
      {showCodeModal && (
        <div className="imap-modal-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="imap-modal-card card" onClick={(e) => e.stopPropagation()}>
            <div className="imap-modal-header">
              <div className="imap-modal-title-group">
                <Code2 size={18} className="text-primary" />
                <h3 className="imap-modal-title">Leaflet Quick Start Code Snippet</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCodeModal(false)}
              >
                Close
              </button>
            </div>

            <p className="imap-modal-sub">
              This interactive map runs the exact Leaflet snippet you imported, wrapped into a responsive,
              production-ready React container with draggable pins, custom CSS popups, and layer controls:
            </p>

            <div className="imap-code-box">
              <pre>
                <code>{rawCodeSnippet}</code>
              </pre>
              <button
                type="button"
                className="btn btn-secondary btn-sm imap-copy-snippet-btn"
                onClick={handleCopyCode}
              >
                {hasCopiedCode ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                <span>{hasCopiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="imap-modal-footer">
              <div className="imap-modal-bullet">
                ⚡ <strong>Center:</strong> <code>[51.505, -0.09]</code> with zoom level <code>13</code>
              </div>
              <div className="imap-modal-bullet">
                🗺️ <strong>TileLayer:</strong> OpenStreetMap standard tiles
              </div>
              <div className="imap-modal-bullet">
                📍 <strong>Marker:</strong> <code>[51.5, -0.09]</code> with auto-opened CSS popup
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
