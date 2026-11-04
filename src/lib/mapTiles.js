const cartoBasemapsKey = String(import.meta.env.VITE_CARTO_BASEMAPS_KEY || '').trim();

// CARTO supports public browser keys for basemap tiles. Use Esri as the
// production-safe fallback because CARTO may return an API-key error when the
// Vite environment variable is missing from a deployment provider.
const cartoVoyagerUrl = cartoBasemapsKey
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoBasemapsKey)}`
  : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

export const defaultMapTile = {
  url: cartoVoyagerUrl,
  attribution: cartoBasemapsKey
    ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
    : 'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a>, DeLorme, NAVTEQ',
  maxZoom: cartoBasemapsKey ? 20 : 19,
  subdomains: cartoBasemapsKey ? 'abcd' : 'abc',
};
