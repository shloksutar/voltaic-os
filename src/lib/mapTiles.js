const cartoBasemapsKey = String(import.meta.env.VITE_CARTO_BASEMAPS_KEY || '').trim();

// CARTO supports public browser keys for basemap tiles. Keep the fallback
// keyless URL so local previews do not fail when env vars are unavailable.
export const cartoVoyagerUrl = [
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  cartoBasemapsKey ? `key=${encodeURIComponent(cartoBasemapsKey)}` : '',
].filter(Boolean).join('?');
