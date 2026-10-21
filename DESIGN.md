# VoltaicOS — System Design & Architecture Specification

> **EV Charging Intelligence Platform**  
> Unifying fragmented Charge Point Operators (CPOs) into a real-time intelligence layer with live hardware telemetry, multi-network discovery, and advance bay reservations.

---

## 1. Executive Summary & Vision

Electric Vehicle (EV) adoption faces a critical bottleneck: **fragmentation and unreliability of charging infrastructure**. Drivers encounter out-of-order charge points, ICE (Internal Combustion Engine) vehicle spot blocking, inaccurate operator telemetry, and unpredictable queue wait times.

**VoltaicOS** solves this by acting as an intelligent aggregation and forecasting middleware layer:
- **OCPI Aggregation:** Ingests live telemetry from multiple independent CPOs (Tata Power EV, ChargeZone, Ather Grid, Statiq, BPCL EV, HPCL EV, EVCS India).
- **Live Port Availability & Telemetry:** Monitors real-time port states (Available / In Use / Offline), kW delivery tiers, and per-kWh tariffs across verified CPO hubs.
- **Unified Telemetry & Incident Management:** Dispatches alerts for ICE bay blocking, sudden hardware faults, and power anomalies.
- **Deterministic Journey Guidance:** Gives drivers transparent status (Available / In Use / Offline), charging speeds (7 kW AC up to 240 kW DC Ultra-Fast), and dynamic routing.

---

## 2. High-Level Architecture (HLD)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│  React 19 + Vite 8 SPA · React Router v7 · React Leaflet · Recharts   │
│                                                                        │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│   │   Overview   │ │   Live Map   │ │   Chargers   │ │  Analytics   │  │
│   │  (Dashboard) │ │ (Leaflet OSM)│ │ (Search/Grid)│ │ (Charts/BI)  │  │
│   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │             Alerts & Incident Resolution Feed                  │  │
│   └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│                       STATE & DATA LAYER (CLIENT)                      │
│   • Live Telemetry Poller (5s Heartbeat interval)                      │
│   • Verified Stations Registry (20 Stations across 6 metros)           │
│   • Real-Time CPO Network Aggregation & Telemetry Helpers              │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ (Simulated / Future Backend)
┌───────────────────────────────────┴────────────────────────────────────┐
│                    UPSTREAM CPO INTEGRATIONS (OCPI)                    │
│   Tata Power · ChargeZone · Ather Grid · Statiq · BPCL · HPCL · EVCS   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack & Dependencies

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | React | `^19.2.8` | Core UI library with component composition |
| **DOM Engine** | React DOM | `^19.2.8` | Rendering engine for the browser DOM |
| **Bundler & Dev Server**| Vite | `^8.3.0` | Ultra-fast HMR and Rollup/Rolldown production builds |
| **Routing** | React Router DOM | `^7.18.4` | Declarative client-side routing & page navigation |
| **Mapping Engine** | Leaflet | `^1.9.4` | Interactive tile-based mapping engine |
| **React Map Wrapper** | React Leaflet | `^5.0.0` | Declarative React bindings for Leaflet elements |
| **Data Visualization**| Recharts | `^3.10.1` | SVG charts for port availability & network metrics |
| **Iconography** | Lucide React | `^1.55.0` | Crisp, modern vector icon set |
| **Linter** | Oxlint | `^1.81.0` | High-performance Rust-based JavaScript linter |

---

## 4. UI/UX Design System Tokens

### 4.1 Typography
- **Headings & Brand:** `Syne` (Weights: 600, 700, 800) – Geometric, modern, industrial appeal.
- **Body & Telemetry UI:** `Inter` (Weights: 300, 400, 500, 600, 700) – High legibility for dashboards and data tables.

### 4.2 Color System
```css
/* Core Surfaces */
--color-bg:            #F7F8FA;  /* Off-white canvas */
--color-surface:       #FFFFFF;  /* Primary card surface */
--color-surface-2:     #F0F2F6;  /* Secondary background / subtle inputs */
--color-border:        #E2E6EE;  /* Crisp structural dividers */
--color-border-soft:   #ECEEF3;  /* Subdued boundaries */

/* Brand Accent (Electric Indigo) */
--color-primary:       #3730A3;  /* Indigo-800 */
--color-primary-mid:   #4338CA;  /* Indigo-700 */
--color-primary-light: #6366F1;  /* Indigo-500 */
--color-primary-pale:  #EEF2FF;  /* Indigo-50 */

/* Status Indicators */
--color-available:     #059669;  /* Emerald (Live / Ready) */
--color-available-bg:  #ECFDF5;
--color-busy:          #D97706;  /* Amber (Queue / In Session) */
--color-busy-bg:       #FFFBEB;
--color-offline:       #DC2626;  /* Crimson (Fault / Down) */
--color-offline-bg:    #FEF2F2;

/* Typography Scale */
--color-text:          #111827;  /* Deep neutral text */
--color-text-2:        #374151;  /* Paragraph text */
--color-text-3:        #6B7280;  /* Secondary / Labels */
--color-text-4:        #9CA3AF;  /* Muted placeholder text */
```

### 4.3 Component Elevation & Radii
- **Border Radii:** Card: `16px` (`--radius-lg`), Button/Input: `10px` (`--radius-md`), Badges: `99px` (Pill).
- **Shadows:** Smooth multilayer soft shadows (`--shadow-sm`, `--shadow-md`, `--shadow-lg`) avoiding harsh black drops.

---

## 5. Domain Data Schema

### 5.1 Station Entity (`Station`)
```typescript
interface Station {
  id: string;               // e.g. "MUM-001"
  name: string;             // Station display name
  city: string;             // "Mumbai" | "Delhi" | "Bengaluru" | "Hyderabad" | "Pune" | "Chennai"
  lat: number;              // Latitude
  lng: number;              // Longitude
  operator: string;         // "Tata Power EV" | "ChargeZone" | "Ather Grid" | "Statiq" | ...
  ports: number;            // Total port count
  available: number;        // Idle & ready ports
  busy: number;             // Active charging sessions
  offline: number;          // Out-of-service / hardware error
  speed: number;            // Peak power delivery in kW (e.g. 7, 50, 60, 100, 150, 240)
  status: 'available' | 'busy' | 'offline'; // Dominant aggregate status
  waitMin: number;          // Estimated queue delay (-1 if offline)
}
```

### 5.2 Reservation Entity (`Booking`)
```typescript
interface Booking {
  id: string;               // e.g. "VOLT-8921"
  stationId: string;        // ID of target station
  bayNumber: number;        // Reserved charging bay
  portType: string;         // Connector type (e.g. CCS2 150 kW)
  date: string;             // YYYY-MM-DD
  startTime: string;        // HH:mm
  durationMinutes: number;  // 15 - 120 mins
  vehicleNumber: string;    // License plate
  status: 'active' | 'completed' | 'cancelled';
}
```

### 5.3 Incident Alert Entity (`Alert`)
```typescript
interface Alert {
  id: number;
  type: 'ice' | 'offline' | 'queue';
  severity: 'high' | 'medium' | 'low';
  station: string;
  city: string;
  msg: string;
  time: string;
  resolved: boolean;
}
```

---

## 6. Page & Component Structure

```
src/
├── assets/                  # SVG and image assets (vite.svg, react.svg, hero.png)
├── components/
│   ├── Navbar/              # Sticky global nav with brand, links, status badge & avatar
│   │   ├── Navbar.jsx
│   │   └── Navbar.css
│   ├── ChargerCard/         # Modular station card with stats, speed tag, & wait badge
│   │   ├── ChargerCard.jsx
│   │   └── ChargerCard.css
│   └── StatCard/            # Top-level KPI metric card with icon & delta indicators
│       ├── StatCard.jsx
│       └── StatCard.css
├── data/
│   └── chargers.js          # In-memory station registry, CPO lists, and queue generator
├── pages/
│   ├── Overview/            # Hero headline, network KPI banner, feature cards, live list
│   │   ├── Overview.jsx
│   │   └── Overview.css
│   ├── LiveMap/             # Leaflet OSM integration, custom SVG pins, slide-out details
│   │   ├── LiveMap.jsx
│   │   └── LiveMap.css
│   ├── Chargers/            # Full directory with live search, city & operator dropdowns
│   │   ├── Chargers.jsx
│   │   └── Chargers.css
│   ├── Analytics/           # Recharts BI dashboard (city distribution, operator shares)
│   │   ├── Analytics.jsx
│   │   └── Analytics.css
│   └── Alerts/              # Real-time incident triage feed with filter tags & resolution
│       ├── Alerts.jsx
│       └── Alerts.css
├── App.jsx                  # React Router root configuration
├── main.jsx                 # React root injection
└── index.css                # Global design system tokens and utilities
```

---

## 7. How to Recreate This Project From Scratch

### Step 1: Project Initialization
Run the following in your terminal:
```bash
# 1. Create a fresh React + Vite project
npm create vite@latest voltaic-os -- --template react

# 2. Enter directory
cd voltaic-os

# 3. Install core dependencies
npm install react-router-dom recharts lucide-react leaflet react-leaflet

# 4. Install dev dependencies (optional linter)
npm install -D oxlint
```

### Step 2: Configure `vite.config.js`
```javascript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
```

### Step 3: Configure `index.html`
Ensure Google Fonts (`Inter` & `Syne`) and Leaflet base styles or icons are supported:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VoltaicOS — EV Charging Intelligence Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### Step 4: Add Leaflet Marker Asset Fix
In `src/pages/LiveMap/LiveMap.jsx`:
```javascript
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
```

### Step 5: Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:5173`.
