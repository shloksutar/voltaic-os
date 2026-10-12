import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Activity,
  CheckCircle,
  WifiOff,
  TrendingUp,
  Globe,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { getNetworkStats, CHARGERS } from '../../data/chargers';
import { stationsApi } from '../../api/client';
import StatCard from '../../components/StatCard/StatCard';
import ReservationModal from '../../components/ReservationModal/ReservationModal';
import PageMeta from '../../components/PageMeta/PageMeta';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import './Overview.css';

const FEATURES = [
  {
    icon: Activity,
    title: 'Real-Time Telemetry',
    desc: 'Sub-second hardware status streaming via OCPI 2.2.1 across all connected Charge Point Operators.',
  },
  {
    icon: Lock,
    title: 'Guaranteed Slot Reservation',
    desc: 'Reserve charging ports and connectors directly in advance. Real-time hold with digital QR passes.',
  },
  {
    icon: Globe,
    title: 'Multi-Operator Bridge',
    desc: 'Unified aggregation layer normalizing Tata Power, ChargeZone, Statiq, Ather Grid, BPCL, and HPCL into one schema.',
  },
  {
    icon: TrendingUp,
    title: 'Predictive Queue Modeling',
    desc: 'Historical demand models and live arrival trajectories forecast queues and wait times hours in advance.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect CPOs',
    desc: 'Hardware operators connect via OCPI REST endpoints and real-time WebSocket telemetry streams.',
  },
  {
    step: '02',
    title: 'Aggregate & Normalize',
    desc: 'Our backend layer normalizes telemetry — bays, power kW, health, pricing — into a unified real-time database.',
  },
  {
    step: '03',
    title: 'Reserve & Dispatch',
    desc: 'Drivers reserve charging bays in advance with Google, Email, or Phone auth, securing guaranteed charging slots.',
  },
  {
    step: '04',
    title: 'Deterministic Charging',
    desc: 'Arrive at the charging hub, verify via digital pass or camera, and begin high-speed charging without queues.',
  },
];

export default function Overview() {
  const [stations, setStations] = useState(CHARGERS);
  const [stats, setStats] = useState(getNetworkStats(CHARGERS));
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedForReservation, setSelectedForReservation] = useState(null);

  const syncData = useCallback(async () => {
    try {
      const res = await stationsApi.getAll();
      if (res?.stations) {
        setStations(res.stations);
        setStats(getNetworkStats(res.stations));
        setLastUpdate(new Date());
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    syncData();
    const id = setInterval(syncData, 10000);
    return () => clearInterval(id);
  }, [syncData]);

  const recentChargers = stations.slice(0, 5);

  return (
    <div className="overview page-enter">
      <PageMeta
        title="Overview"
        description="VoltaicOS live network overview: charger availability, slot reservations, and multi-operator EV charging intelligence."
      />
      {/* Hero */}
      <section className="overview-hero">
        <div className="hero-eyebrow">
          <span className="dot dot-available dot-pulse" />
          Live Network · {stats.stations} Verified Hubs Synced
        </div>
        <h1 className="hero-title font-display">
          EV Charging Infrastructure,<br />
          <span className="hero-accent">Unified & Predictable</span>
        </h1>
        <p className="hero-desc">
          VoltaicOS bridges fragmented Charge Point Operators into a single real-time intelligence layer —
          eliminating range anxiety with instant slot reservations and deterministic journey planning.
        </p>
        <div className="hero-cta">
          <Link to="/map" className="btn btn-primary">
            Open Live Map <ArrowRight size={15} />
          </Link>
          <Link to="/chargers" className="btn btn-ghost">
            Browse All Chargers
          </Link>
        </div>
        <div className="hero-update">
          Last telemetry sync: {lastUpdate.toLocaleTimeString()}
        </div>
      </section>

      {/* Stats */}
      <section className="overview-stats">
        <StatCard
          icon={Zap}
          label="Total Ports"
          value={stats.total}
          sub="Across all connected operators"
          accent="primary"
          trend={4}
        />
        <StatCard
          icon={CheckCircle}
          label="Available Now"
          value={stats.available}
          sub={`${Math.round((stats.available / (stats.total || 1)) * 100)}% of capacity`}
          accent="available"
          trend={12}
        />
        <StatCard
          icon={Activity}
          label="In Use / Reserved"
          value={stats.busy}
          sub="Active charging sessions"
          accent="busy"
        />
        <StatCard
          icon={WifiOff}
          label="Offline / Maint."
          value={stats.offline}
          sub="Under maintenance"
          accent="offline"
          trend={-5}
        />
      </section>

      {/* Features */}
      <section className="overview-section">
        <div className="section-header">
          <h2 className="section-title font-display">Platform Capabilities</h2>
          <p className="section-sub">Built for scale across every metro, operator, and EV model.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card card">
              <div className="feature-icon">
                <f.icon size={20} strokeWidth={1.7} />
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="overview-section">
        <div className="section-header">
          <h2 className="section-title font-display">How It Works</h2>
          <p className="section-sub">Four steps from fragmented hardware to guaranteed charging slots.</p>
        </div>
        <div className="steps-grid">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="step-card">
              <div className="step-number">{s.step}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
              {i < HOW_IT_WORKS.length - 1 && <div className="step-connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="overview-section">
        <div className="section-header">
          <h2 className="section-title font-display">Real-Time Hub Telemetry</h2>
          <Link to="/chargers" className="section-link">
            View all {stations.length} stations <ArrowRight size={13} />
          </Link>
        </div>
        <div className="recent-list card">
          {recentChargers.map((c, i) => (
            <div
              key={c.id}
              className={`recent-row ${i < recentChargers.length - 1 ? 'recent-row-border' : ''}`}
            >
              <div className="recent-info">
                <div className="recent-name">{c.name}</div>
                <div className="recent-city">
                  {c.city} · {c.operator} {c.tariffPerKwh ? `· ₹${c.tariffPerKwh}/kWh` : ''}
                </div>
              </div>
              <div className="recent-ports">
                <span className="rp-avail">{c.available} available</span>
                <span className="rp-sep">·</span>
                <span className="rp-busy">{c.busy} in use</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge badge-${c.status}`}>
                  <span className={`dot dot-${c.status}`} />
                  {c.status === 'available' ? 'Available' : c.status === 'busy' ? 'Busy' : 'Offline'}
                </span>
                {c.available > 0 && c.status !== 'offline' && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => setSelectedForReservation(c)}
                  >
                    <Zap size={11} /> Reserve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reservation Modal */}
      {selectedForReservation && (
        <ReservationModal
          station={selectedForReservation}
          isOpen={!!selectedForReservation}
          onClose={() => setSelectedForReservation(null)}
          onBookingComplete={() => syncData()}
        />
      )}

      <SiteFooter />
    </div>
  );
}
