# VoltaicOS — EV Charging Intelligence Platform

[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![React Router](https://img.shields.io/badge/React_Router-7.18-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Recharts](https://img.shields.io/badge/Recharts-3.10-22B5BF)](https://recharts.org/)

**VoltaicOS** bridges fragmented Charge Point Operators (CPOs) into a unified real-time intelligence layer — eliminating EV range anxiety with deterministic journey planning, live hardware telemetry, and predictive machine-learning queue forecasts.

---

## ⚡ Key Features

- **🌐 Live Interactive Map:** Real-time geospatial charge station tracking across metro hubs (Mumbai, Delhi, Bengaluru, Hyderabad, Pune, Chennai) powered by Leaflet OSM with custom SVG status pins and fly-to zoom.
- **📈 Predictive Queue Analytics:** 8-hour forward-looking arrival forecasts and capacity comparisons using Recharts.
- **⚡ Multi-Operator Aggregation:** Seamlessly aggregates stations from **Tata Power EV, ChargeZone, Ather Grid, Statiq, BPCL EV, HPCL EV, and EVCS India**.
- **🚨 Incident & ICE Bay Detection:** Active triage feed for ICE vehicle blockages, sudden offline hardware faults, and power fluctuations with resolution toggles.
- **📊 Real-Time Network KPIs:** Sub-second metric tracking for online stations, active ports, current utilization, and power delivery throughput.

---

## 🏗️ Project Architecture & Design

For in-depth specifications, architectural diagrams, data schemas, design tokens, and component breakdown, see **[DESIGN.md](./DESIGN.md)**.

```
voltaic-os/
├── DESIGN.md                        # Complete System Architecture & Design Spec
├── index.html                       # HTML Entry point
├── package.json                     # Project manifest and dependencies
├── vite.config.js                   # Vite configuration
└── src/
    ├── App.jsx                      # Router & Application Root
    ├── main.jsx                     # React DOM Entry point
    ├── index.css                    # Design System Tokens, CSS Variables & Global Classes
    ├── assets/                      # Static brand assets and icons
    ├── components/
    │   ├── Navbar/                  # Top navigation with live status badge & avatar
    │   ├── ChargerCard/             # Modular station display card
    │   └── StatCard/                # Network KPI highlight card
    ├── data/
    │   └── chargers.js              # Station datasets, queue heuristics, and CPO metadata
    └── pages/
        ├── Overview/                # Dashboard hero, architecture flow, and live highlights
        ├── LiveMap/                 # Interactive geospatial map with slide-over drawer
        ├── Chargers/                # Searchable and filterable station catalog
        ├── Analytics/               # Network utilization, operator share & city distribution
        └── Alerts/                  # Incident triage log with severity filtering
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`

### 1. Clone & Install
```bash
git clone https://github.com/shloksutar/voltaic-os.git
cd voltaic-os
npm install
```

### 2. Run Locally in Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 🎨 Design System

VoltaicOS utilizes an **Off-white / Electric Indigo / Cool Gray** visual identity:
- **Typography:** Display headings in `Syne`, Data & UI in `Inter`.
- **Palette:**
  - Available: Emerald (`#059669`)
  - In-Use / Busy: Amber (`#D97706`)
  - Offline / Fault: Crimson (`#DC2626`)
  - Primary Brand: Electric Indigo (`#3730A3` / `#6366F1`)
