import { useState } from 'react';
import { AlertTriangle, WifiOff, Car, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import './Alerts.css';

const ALERT_DATA = [
  { id: 1, type: 'ice',       severity: 'high',   station: 'BKC Charging Hub',       city: 'Mumbai',    msg: 'ICE vehicle detected in EV bay #3. License plate recognition triggered.', time: '2 min ago',  resolved: false },
  { id: 2, type: 'offline',   severity: 'high',   station: 'Andheri Subway Station',  city: 'Mumbai',    msg: '2 ports went offline unexpectedly. Hardware fault detected — maintenance dispatched.', time: '8 min ago',  resolved: false },
  { id: 3, type: 'queue',     severity: 'medium', station: 'Powai Tech Park',         city: 'Mumbai',    msg: 'Predicted queue surge to 10+ vehicles by 17:00. Recommend rerouting nearby drivers.', time: '12 min ago', resolved: false },
  { id: 4, type: 'offline',   severity: 'high',   station: 'Lajpat Nagar Market',     city: 'Delhi',     msg: 'All 4 ports offline. EVSE firmware crash logged. Remote reset attempted — pending.', time: '21 min ago', resolved: false },
  { id: 5, type: 'queue',     severity: 'medium', station: 'Dwarka Sector 21 Hub',    city: 'Delhi',     msg: 'All ports occupied. Average wait time forecasted at 22 minutes for next 2 hours.', time: '35 min ago', resolved: false },
  { id: 6, type: 'ice',       severity: 'medium', station: 'Saket Mall Complex',      city: 'Delhi',     msg: 'ICE vehicle occupying EV-only zone for >45 mins. Automated alert sent to venue security.', time: '58 min ago', resolved: true },
  { id: 7, type: 'offline',   severity: 'low',    station: 'HSR Layout Sector 1',     city: 'Bengaluru', msg: 'Scheduled maintenance window active. Ports restored expected by 18:30 today.', time: '1h 12m ago', resolved: true },
  { id: 8, type: 'queue',     severity: 'low',    station: 'Hitech City Metro',       city: 'Hyderabad', msg: 'Session duration anomaly: vehicle at port #2 has been charging for 4h 22m. Alert sent.', time: '1h 45m ago', resolved: true },
  { id: 9, type: 'ice',       severity: 'high',   station: 'Electronic City Phase 2', city: 'Bengaluru', msg: 'ICE vehicle in EV-only space for >30 min. No response from venue. Escalated to towing authority.', time: '2h 5m ago', resolved: false },
  { id: 10, type: 'offline',  severity: 'medium', station: 'Camp Area Charging Point', city: 'Pune',     msg: 'Power fluctuation detected. 1 port in fault state. OCPI upstream error code 503.', time: '3h 18m ago', resolved: true },
];

const TYPE_META = {
  ice:     { icon: Car,           label: 'ICE Vehicle',   colorClass: 'al-ice' },
  offline: { icon: WifiOff,       label: 'Station Fault', colorClass: 'al-offline' },
  queue:   { icon: Clock,         label: 'Queue Surge',   colorClass: 'al-queue' },
};
const SEV_CLASS = { high: 'sev-high', medium: 'sev-medium', low: 'sev-low' };

export default function Alerts() {
  const [filter, setFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);

  const filtered = ALERT_DATA.filter(a => {
    if (!showResolved && a.resolved) return false;
    if (filter !== 'all' && a.type !== filter) return false;
    return true;
  });

  const active = ALERT_DATA.filter(a => !a.resolved).length;

  return (
    <div className="alerts-page page-enter">
      <div className="al-header">
        <div>
          <h1 className="al-title font-display">Alerts</h1>
          <p className="al-sub">{active} active alerts across the network</p>
        </div>
        <div className="al-header-actions">
          <label className="al-toggle">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={e => setShowResolved(e.target.checked)}
            />
            <span className="al-toggle-track">
              <span className="al-toggle-thumb" />
            </span>
            <span className="al-toggle-label">Show resolved</span>
          </label>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="al-filters">
        {[
          { key: 'all',     label: 'All Alerts' },
          { key: 'ice',     label: 'ICE Violations' },
          { key: 'offline', label: 'Station Faults' },
          { key: 'queue',   label: 'Queue Surges' },
        ].map(f => (
          <button
            key={f.key}
            className={`al-filter-btn ${filter === f.key ? 'al-filter-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="al-list">
        {filtered.length === 0 && (
          <div className="al-empty">
            <CheckCircle size={32} strokeWidth={1.2} />
            <div>No alerts match this filter.</div>
          </div>
        )}
        {filtered.map(alert => {
          const meta = TYPE_META[alert.type];
          const Icon = meta.icon;
          return (
            <div key={alert.id} className={`al-row card ${alert.resolved ? 'al-row-resolved' : ''}`}>
              <div className={`al-icon-wrap ${meta.colorClass}`}>
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <div className="al-body">
                <div className="al-row-header">
                  <span className="al-station">{alert.station}</span>
                  <span className="al-city">{alert.city}</span>
                  <span className={`al-sev ${SEV_CLASS[alert.severity]}`}>{alert.severity}</span>
                  <span className="al-type-label chip">{meta.label}</span>
                  {alert.resolved && (
                    <span className="al-resolved-tag">
                      <CheckCircle size={12} /> Resolved
                    </span>
                  )}
                </div>
                <p className="al-msg">{alert.msg}</p>
                <div className="al-time">{alert.time}</div>
              </div>
              {!alert.resolved && (
                <div className="al-actions">
                  <button className="btn btn-ghost btn-sm">Dismiss</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
