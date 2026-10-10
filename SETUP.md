# VoltaicOS — Setup & Recreation Guide

This guide contains everything required to recreate **VoltaicOS** completely from scratch in any clean environment.

---

## 1. Quick Bootstrap (Automated)

Run these commands in an empty directory:

```bash
# 1. Initialize Vite + React project
npm create vite@latest voltaic-os -- --template react

# 2. Navigate into directory
cd voltaic-os

# 3. Install production dependencies
npm install react-router-dom recharts lucide-react leaflet react-leaflet

# 4. Install dev dependencies
npm install -D oxlint

# 5. Start development server
npm run dev
```

---

## 2. Directory Tree Blueprint

Replicate this exact folder and file structure inside the project root:

```text
voltaic-os/
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── DESIGN.md
├── SETUP.md
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    ├── assets/
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    ├── components/
    │   ├── Navbar/
    │   │   ├── Navbar.jsx
    │   │   └── Navbar.css
    │   ├── ChargerCard/
    │   │   ├── ChargerCard.jsx
    │   │   └── ChargerCard.css
    │   └── StatCard/
    │       ├── StatCard.jsx
    │       └── StatCard.css
    ├── data/
    │   └── chargers.js
    └── pages/
        ├── Overview/
        │   ├── Overview.jsx
        │   └── Overview.css
        ├── LiveMap/
        │   ├── LiveMap.jsx
        │   └── LiveMap.css
        ├── Chargers/
        │   ├── Chargers.jsx
        │   └── Chargers.css
        ├── Analytics/
        │   ├── Analytics.jsx
        │   └── Analytics.css
        └── Alerts/
            ├── Alerts.jsx
            └── Alerts.css
```

---

## 3. Configuration Files

### `package.json`
```json
{
  "name": "voltaicos",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "leaflet": "^1.9.4",
    "lucide-react": "^1.55.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-leaflet": "^5.0.0",
    "react-router-dom": "^7.18.4",
    "recharts": "^3.10.1"
  },
  "devDependencies": {
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "oxlint": "^1.81.0",
    "vite": "^8.3.0"
  }
}
```

### `vite.config.js`
```javascript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
```

### `index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VoltaicOS — EV Charging Intelligence Platform</title>
    <meta name="description" content="VoltaicOS bridges fragmented EV Charge Point Operators into a unified real-time intelligence layer — eliminating range anxiety with deterministic journey planning." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## 4. Critical Implementation Quirks & Gotchas

### 1. Leaflet Default Icons with Vite
Leaflet assumes static icons in its relative directory, which breaks when bundled in Vite. Always insert this snippet in `LiveMap.jsx`:
```javascript
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
```

### 2. Google Fonts Loading
Import the typography at the top of `src/index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Syne:wght@600;700;800&display=swap');
```

### 3. Dynamic Map Centering (`useMap` hook)
When a user selects a charger in the map sidebar or table, pan the map using a child hook component:
```javascript
import { useMap } from 'react-leaflet';

function FlyTo({ charger }) {
  const map = useMap();
  useEffect(() => {
    if (charger) map.flyTo([charger.lat, charger.lng], 14, { duration: 1.2 });
  }, [charger, map]);
  return null;
}
```

---

## 5. Verification Checklist

- [ ] Run `npm run build` — confirm build succeeds with 0 errors.
- [ ] Run `npm run dev` — open `http://localhost:5173`.
- [ ] Verify **Overview page**: live network stats polling every 5s.
- [ ] Verify **Live Map page**: Leaflet map tiles render, markers show with custom colored pins (Green, Amber, Red).
- [ ] Verify **Chargers page**: Search input filters stations; city & operator selects work.
- [ ] Verify **Analytics page**: Recharts bars, area charts, and status pie charts render smoothly.
- [ ] Verify **Alerts page**: Filter between All, ICE vehicles, Station Faults, and Queue surges.
