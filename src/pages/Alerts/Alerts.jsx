import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Car, Clock, CheckCircle, PlusCircle, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { alertsApi } from '../../api/client';
import './Alerts.css';

const TYPE_META = {
  ice: { icon: Car, label: 'ICE Violation', colorClass: 'al-ice' },
  offline: { icon: WifiOff, label: 'Station Fault', colorClass: 'al-offline' },
  queue: { icon: Clock, label: 'Queue Surge', colorClass: 'al-queue' },
  reservation: { icon: ShieldCheck, label: 'Slot Pass', colorClass: 'al-ice' },
};

const SEV_CLASS = { high: 'sev-high', medium: 'sev-medium', low: 'sev-low' };

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await alertsApi.getAll();
      if (res?.alerts) {
        setAlerts(res.alerts);
      }
    } catch (err) {
      console.warn('Failed to load alerts from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = async (id) => {
    try {
      await alertsApi.resolve(id);
      fetchAlerts();
    } catch (err) {
      alert(err.message || 'Failed to resolve alert');
    }
  };

  const handleDismiss = async (id) => {
    try {
      await alertsApi.dismiss(id);
      fetchAlerts();
    } catch (err) {
      alert(err.message || 'Failed to dismiss alert');
    }
  };

  const filtered = alerts.filter((a) => {
    if (!showResolved && a.resolved) return false;
    if (filter !== 'all' && a.type !== filter) return false;
    return true;
  });

  const activeCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="alerts-page page-enter">
      <div className="al-header">
        <div>
          <h1 className="al-title font-display">Network Incident & Activity Feed</h1>
          <p className="al-sub">
            {activeCount} active incident events across connected charging hubs
          </p>
        </div>
        <div className="al-header-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchAlerts}
            disabled={loading}
            title="Refresh alerts"
          >
            <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
            <span>Sync</span>
          </button>

          <label className="al-toggle">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
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
          { key: 'all', label: 'All Alerts' },
          { key: 'ice', label: 'ICE Violations' },
          { key: 'offline', label: 'Station Faults' },
          { key: 'queue', label: 'Queue Surges' },
          { key: 'reservation', label: 'Reservations' },
        ].map((f) => (
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
        {filtered.length === 0 ? (
          <div className="al-empty">
            <CheckCircle size={32} strokeWidth={1.2} />
            <div>No alerts match this filter.</div>
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
              Incidents reported by drivers and slot reservations will appear here in real time.
            </p>
          </div>
        ) : (
          filtered.map((alert) => {
            const meta = TYPE_META[alert.type] || TYPE_META.offline;
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
                    <span className={`al-sev ${SEV_CLASS[alert.severity] || 'sev-low'}`}>
                      {alert.severity}
                    </span>
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
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleResolve(alert.id)}
                      title="Mark as resolved"
                    >
                      Resolve
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDismiss(alert.id)}
                      title="Dismiss alert"
                      style={{ color: '#9CA3AF' }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
