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
    title: 'Live Charger Availability',
    desc: 'See which charging plugs are open, in use, or broken in real time before you hit the road.',
  },
  {
    icon: Lock,
    title: 'Book Before You Drive',
    desc: 'Reserve your charging bay in advance. Your spot is held and guaranteed so nobody takes it.',
  },
  {
    icon: Globe,
    title: 'All Charging Networks in One Place',
    desc: 'No need for 10 different apps. Find Tata Power, ChargeZone, Statiq, and more on a single map.',
  },
  {
    icon: TrendingUp,
    title: 'Avoid Rush Hours',
    desc: 'Check live wait times and busy hours so you can pick the fastest time to recharge your car.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Find a Station Nearby',
    desc: 'Search our live map to see all nearby EV chargers from every major brand in one place.',
  },
  {
    step: '02',
    title: 'Check Live Open Spots',
    desc: 'See how many charging spots are free right now, charging speeds, prices, and station status.',
  },
  {
    step: '03',
    title: 'Reserve Your Spot',
    desc: 'Book your charging time slot in advance so a spot is guaranteed and waiting for you.',
  },
  {
    step: '04',
    title: 'Plug In & Charge',
    desc: 'Drive up to your reserved spot, show your digital pass, plug in, and drive away fully charged.',
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
        description="Find live EV chargers near you, check open spots in real time, and reserve your charging bay before you drive."
      />
      {/* Hero */}
      <section className="overview-hero">
        <div className="hero-eyebrow">
          <span className="dot dot-available dot-pulse" />
          Live Network · {stats.stations} Charging Stations Ready
        </div>
        <h1 className="hero-title font-display">
          Charge Your EV Anywhere,<br />
          <span className="hero-accent">Without The Wait</span>
        </h1>
        <p className="hero-desc">
          VoltaicOS brings every EV charger into one simple app. Check live availability, reserve your spot ahead of time, and charge your car without long lines or range anxiety.
        </p>
        <div className="hero-cta">
          <Link to="/map" className="btn btn-primary">
            Find Open Chargers <ArrowRight size={15} />
          </Link>
          <Link to="/chargers" className="btn btn-ghost">
            Browse All Stations
          </Link>
        </div>
        <div className="hero-update">
          Updated live: {lastUpdate.toLocaleTimeString()}
        </div>
      </section>

      {/* Stats */}
      <section className="overview-stats">
        <StatCard
          icon={Zap}
          label="Total Charging Plugs"
          value={stats.total}
          sub="Across all connected networks"
          accent="primary"
          trend={4}
        />
        <StatCard
          icon={CheckCircle}
          label="Ready to Use"
          value={stats.available}
          sub={`${Math.round((stats.available / (stats.total || 1)) * 100)}% of spots free right now`}
          accent="available"
          trend={12}
        />
        <StatCard
          icon={Activity}
          label="Currently Charging"
          value={stats.busy}
          sub="Cars actively charging"
          accent="busy"
        />
        <StatCard
          icon={WifiOff}
          label="Out of Order"
          value={stats.offline}
          sub="Temporarily under service"
          accent="offline"
          trend={-5}
        />
      </section>

      {/* Features */}
      <section className="overview-section">
        <div className="section-header">
          <h2 className="section-title font-display">Built for EV Drivers</h2>
          <p className="section-sub">Everything you need for an easy, stress-free road trip.</p>
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
          <p className="section-sub">Four simple steps to find, book, and charge your electric vehicle without the wait.</p>
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
          <h2 className="section-title font-display">Live Nearby Stations</h2>
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
