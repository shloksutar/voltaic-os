import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Activity, CheckCircle, AlertCircle, WifiOff, TrendingUp, Globe, Lock, ArrowRight } from 'lucide-react';
import { getNetworkStats, CHARGERS } from '../../data/chargers';
import StatCard from '../../components/StatCard/StatCard';
import './Overview.css';

const FEATURES = [
  {
    icon: Activity,
    title: 'Real-Time Telemetry',
    desc: 'Sub-second hardware status streaming via OCPI integration across all connected Charge Point Operators.',
  },
  {
    icon: TrendingUp,
    title: 'Predictive Queue ML',
    desc: 'Machine learning models trained on historical usage and live GPS trajectories forecast arrival queues 2 hours ahead.',
  },
  {
    icon: Globe,
    title: 'Multi-Operator Bridge',
    desc: 'A unified aggregation layer syncing 50+ CPO APIs into a single normalized data schema in real time.',
  },
  {
    icon: Lock,
    title: 'Slot Reservation',
    desc: 'Reserve charging ports directly through the app before your trip. Guaranteed hardware availability on arrival.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Connect CPOs', desc: 'Hardware operators connect via OCPI REST endpoints, WebSocket streams, or our universal SDK.' },
  { step: '02', title: 'Aggregate & Normalize', desc: 'Our cloud layer ingests and normalizes all telemetry — availability, power, health — into a unified schema.' },
  { step: '03', title: 'Predict & Alert', desc: 'ML models compute queue forecasts. ICE parking violations trigger automated camera alerts.' },
  { step: '04', title: 'Driver-Facing API', desc: 'Drivers query live status, get turn-by-turn routing to available ports, and reserve slots via the app.' },
];

export default function Overview() {
  const [stats, setStats] = useState(getNetworkStats());
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setStats(getNetworkStats());
      setLastUpdate(new Date());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const recentChargers = CHARGERS.slice(0, 5);

  return (
    <div className="overview page-enter">
      {/* Hero */}
      <section className="overview-hero">
        <div className="hero-eyebrow">
          <span className="dot dot-available dot-pulse" />
          Live Network · {stats.stations} stations online
        </div>
        <h1 className="hero-title font-display">
          EV Charging Infrastructure,<br />
          <span className="hero-accent">Unified & Predictable</span>
        </h1>
        <p className="hero-desc">
          VoltaicOS bridges fragmented Charge Point Operators into a single real-time intelligence layer —
          eliminating range anxiety with deterministic journey planning.
        </p>
        <div className="hero-cta">
          <Link to="/map" className="btn btn-primary">
            Open Live Map <ArrowRight size={15} />
          </Link>
          <Link to="/chargers" className="btn btn-ghost">
            Browse Chargers
          </Link>
        </div>
        <div className="hero-update">
          Last sync: {lastUpdate.toLocaleTimeString()}
        </div>
      </section>

      {/* Stats */}
      <section className="overview-stats">
        <StatCard icon={Zap}         label="Total Ports"       value={stats.total}     sub="Across all operators"       accent="primary"   trend={4} />
        <StatCard icon={CheckCircle} label="Available Now"     value={stats.available} sub={`${Math.round((stats.available/stats.total)*100)}% of capacity`} accent="available" trend={12} />
        <StatCard icon={Activity}    label="In Use"            value={stats.busy}      sub="Active sessions"            accent="busy"      />
        <StatCard icon={WifiOff}     label="Offline / Maint."  value={stats.offline}   sub="Under maintenance"          accent="offline"   trend={-5} />
      </section>

      {/* Features */}
      <section className="overview-section">
        <div className="section-header">
          <h2 className="section-title font-display">Platform Capabilities</h2>
          <p className="section-sub">Built for scale across every city, every operator, every vehicle class.</p>
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
          <p className="section-sub">Four steps from fragmented hardware to deterministic routing.</p>
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
          <h2 className="section-title font-display">Recent Station Activity</h2>
          <Link to="/chargers" className="section-link">View all <ArrowRight size={13} /></Link>
        </div>
        <div className="recent-list card">
          {recentChargers.map((c, i) => (
            <div key={c.id} className={`recent-row ${i < recentChargers.length - 1 ? 'recent-row-border' : ''}`}>
              <div className="recent-info">
                <div className="recent-name">{c.name}</div>
                <div className="recent-city">{c.city} · {c.operator}</div>
              </div>
              <div className="recent-ports">
                <span className="rp-avail">{c.available} avail</span>
                <span className="rp-sep">·</span>
                <span className="rp-busy">{c.busy} busy</span>
              </div>
              <span className={`badge badge-${c.status}`}>
                <span className={`dot dot-${c.status}`} />
                {c.status === 'available' ? 'Available' : c.status === 'busy' ? 'Busy' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="overview-section" id="pricing">
        <div className="section-header">
          <h2 className="section-title font-display">Pricing</h2>
          <p className="section-sub">Transparent plans for operators, fleets, and enterprise networks.</p>
        </div>
        <div className="pricing-grid">
          {[
            { name: 'Starter', price: '₹0', period: 'Free forever', desc: 'For individual EV drivers. Access live map, charger status, and basic routing.', features: ['Live charger status', 'Map navigation', '5 station bookmarks', 'Basic notifications'], cta: 'Get Started', highlight: false },
            { name: 'Fleet',   price: '₹2,499', period: '/month', desc: 'For fleet managers overseeing multiple EVs. Real-time queue predictions and slot reservation.', features: ['Everything in Starter', 'Queue predictions (2h horizon)', 'Slot reservation', 'Fleet dashboard', 'API access (5k calls/day)'], cta: 'Start Free Trial', highlight: true },
            { name: 'Enterprise', price: 'Custom', period: 'Contact us', desc: 'For CPOs and municipalities. Full OCPI integration, white-label SDK, and SLA guarantees.', features: ['Everything in Fleet', 'OCPI integration', 'Unlimited API calls', 'White-label SDK', 'ICE detection alerts', 'Dedicated SLA'], cta: 'Contact Sales', highlight: false },
          ].map((plan) => (
            <div key={plan.name} className={`pricing-card card ${plan.highlight ? 'pricing-card--highlight' : ''}`}>
              {plan.highlight && <div className="pricing-popular">Most Popular</div>}
              <div className="pricing-name">{plan.name}</div>
              <div className="pricing-price">
                {plan.price}
                <span className="pricing-period">{plan.period}</span>
              </div>
              <p className="pricing-desc">{plan.desc}</p>
              <ul className="pricing-features">
                {plan.features.map(f => (
                  <li key={f}><CheckCircle size={14} className="pf-check" />{f}</li>
                ))}
              </ul>
              <button className={`btn ${plan.highlight ? 'btn-primary' : 'btn-ghost'} pricing-btn`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="overview-footer">
        <div className="footer-brand">
          <Zap size={16} />
          <span className="font-display">VoltaicOS</span>
        </div>
        <p className="footer-copy">© 2026 VoltaicOS. Accelerating the electric transition.</p>
      </footer>
    </div>
  );
}
