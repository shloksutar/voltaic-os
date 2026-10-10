import { Zap, Clock, Wifi, WifiOff, ChevronRight } from 'lucide-react';
import './ChargerCard.css';

function SpeedBadge({ speed }) {
  const label = speed >= 100 ? 'DC Fast' : speed >= 50 ? 'Level 2' : 'Level 1';
  const cls   = speed >= 100 ? 'speed-fast' : speed >= 50 ? 'speed-mid' : 'speed-slow';
  return <span className={`speed-badge ${cls}`}>{speed} kW · {label}</span>;
}

export default function ChargerCard({ charger, onClick, selected }) {
  const { name, city, operator, ports, available, busy, offline, status, waitMin, speed } = charger;
  const pct = Math.round((available / ports) * 100);

  return (
    <div
      className={`charger-card ${selected ? 'charger-card--selected' : ''}`}
      onClick={() => onClick(charger)}
    >
      <div className="cc-top">
        <div className="cc-info">
          <div className="cc-name">{name}</div>
          <div className="cc-city">{city} · {operator}</div>
        </div>
        <span className={`badge badge-${status}`}>
          <span className={`dot dot-${status} ${status === 'available' ? 'dot-pulse' : ''}`} />
          {status === 'available' ? 'Available' : status === 'busy' ? 'Busy' : 'Offline'}
        </span>
      </div>

      <div className="cc-ports">
        <div className="cc-port-bar">
          <div className="cc-bar-fill cc-bar-available" style={{ width: `${(available/ports)*100}%` }} />
          <div className="cc-bar-fill cc-bar-busy"      style={{ width: `${(busy/ports)*100}%` }} />
        </div>
        <div className="cc-port-legend">
          <span className="port-chip port-avail">{available} Available</span>
          <span className="port-chip port-busy">{busy} In Use</span>
          {offline > 0 && <span className="port-chip port-off">{offline} Offline</span>}
          <span className="cc-total">{ports} total</span>
        </div>
      </div>

      <div className="cc-bottom">
        <SpeedBadge speed={speed} />
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
        <ChevronRight size={15} className="cc-arrow" />
      </div>
    </div>
  );
}
