import './StatCard.css';

export default function StatCard({ icon: Icon, label, value, sub, accent, trend }) {
  return (
    <div className={`stat-card ${accent ? `stat-card--${accent}` : ''}`}>
      <div className="stat-card-header">
        <div className={`stat-icon stat-icon--${accent || 'default'}`}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
        {trend !== undefined && (
          <span className={`stat-trend ${trend >= 0 ? 'stat-trend--up' : 'stat-trend--down'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
