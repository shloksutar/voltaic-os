import { Zap, Clock, WifiOff, AlertTriangle, MapPin } from 'lucide-react';
import './ChargerCard.css';

function SpeedBadge({ speed }) {
  const label = speed >= 120 ? 'DC Ultra' : speed >= 50 ? 'DC Fast' : 'AC Standard';
  const cls = speed >= 120 ? 'speed-fast' : speed >= 50 ? 'speed-mid' : 'speed-slow';
  return <span className={`speed-badge ${cls}`}>{speed} kW · {label}</span>;
}

export default function ChargerCard({ charger, onClick, selected, onReserve, onReport }) {
  const { name, city, operator, ports, available, busy, offline, status, waitMin, speed, tariffPerKwh, address } = charger;

  return (
    <div
      className={`charger-card ${selected ? 'charger-card--selected' : ''}`}
      onClick={() => onClick && onClick(charger)}
    >
      <div className="cc-top">
        <div className="cc-info">
          <div className="cc-name">{name}</div>
          <div className="cc-city">{city} · {operator}</div>
          {address && (
            <div className="cc-address">
              <MapPin size={11} />
              <span>{address}</span>
            </div>
          )}
        </div>
        <span className={`badge badge-${status}`}>
          <span className={`dot dot-${status} ${status === 'available' ? 'dot-pulse' : ''}`} />
          {status === 'available' ? 'Available' : status === 'busy' ? 'Busy' : 'Offline'}
        </span>
      </div>

      <div className="cc-ports">
        <div className="cc-port-bar">
          <div className="cc-bar-fill cc-bar-available" style={{ width: `${(available / ports) * 100}%` }} />
          <div className="cc-bar-fill cc-bar-busy" style={{ width: `${(busy / ports) * 100}%` }} />
        </div>
        <div className="cc-port-legend">
          <span className="port-chip port-avail">{available} Available</span>
          <span className="port-chip port-busy">{busy} In Use</span>
          {offline > 0 && <span className="port-chip port-off">{offline} Offline</span>}
          <span className="cc-total">{ports} total</span>
        </div>
      </div>

      <div className="cc-bottom">
        <div className="cc-bottom-left">
          <SpeedBadge speed={speed} />
          {tariffPerKwh && <span className="cc-tariff">₹{tariffPerKwh}/kWh</span>}
          {status === 'busy' && waitMin > 0 && (
            <span className="cc-wait">
              <Clock size={12} /> ~{waitMin} min wait
            </span>
          )}
          {status === 'offline' && (
            <span className="cc-wait cc-wait-off">
              <WifiOff size={12} /> Maintenance
            </span>
          )}
        </div>

        <div className="cc-actions">
          {onReport && (
            <button
              className="cc-action-report-btn"
              title="Report incident (ICE blocking, faulty port)"
              onClick={(e) => {
                e.stopPropagation();
                onReport(charger);
              }}
            >
              <AlertTriangle size={13} />
            </button>
          )}

          {onReserve && status !== 'offline' && available > 0 && (
            <button
              className="btn btn-primary btn-sm cc-reserve-btn"
              onClick={(e) => {
                e.stopPropagation();
                onReserve(charger);
              }}
            >
              <Zap size={13} />
              <span>Reserve</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
