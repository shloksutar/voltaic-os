import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { CHARGERS, CITIES, OPERATORS } from '../../data/chargers';
import ChargerCard from '../../components/ChargerCard/ChargerCard';
import './Chargers.css';

const STATUS_OPTS = ['All', 'Available', 'Busy', 'Offline'];

export default function Chargers() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [operator, setOperator] = useState('All Operators');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => CHARGERS.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.city.toLowerCase().includes(search.toLowerCase())) return false;
    if (city !== 'All Cities' && c.city !== city) return false;
    if (operator !== 'All Operators' && c.operator !== operator) return false;
    if (status !== 'All' && c.status !== status.toLowerCase()) return false;
    return true;
  }), [search, city, operator, status]);

  return (
    <div className="chargers-page page-enter">
      <div className="chp-header">
        <div>
          <h1 className="chp-title font-display">Charging Stations</h1>
          <p className="chp-sub">{filtered.length} of {CHARGERS.length} stations shown</p>
        </div>
      </div>

      {/* Filters */}
      <div className="chp-filters card">
        <div className="chp-search-wrap">
          <Search size={15} className="chp-search-icon" />
          <input
            className="chp-search"
            placeholder="Search by station name or city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="chp-selects">
          {[
            { label: 'City', value: city, setter: setCity, opts: CITIES },
            { label: 'Operator', value: operator, setter: setOperator, opts: OPERATORS },
          ].map(({ label, value, setter, opts }) => (
            <div key={label} className="chp-select-wrap">
              <select className="chp-select" value={value} onChange={e => setter(e.target.value)}>
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={13} className="chp-sel-icon" />
            </div>
          ))}
        </div>

        <div className="chp-status-tabs">
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              className={`status-tab ${status === s ? 'status-tab-active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s !== 'All' && (
                <span className={`dot dot-${s.toLowerCase()} ${s === 'Available' ? 'dot-pulse' : ''}`} />
              )}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="chp-empty">
          <Search size={32} strokeWidth={1.2} />
          <div>No stations match your filters.</div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setCity('All Cities'); setOperator('All Operators'); setStatus('All'); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="chp-grid">
          {filtered.map(c => (
            <ChargerCard
              key={c.id}
              charger={c}
              selected={selected?.id === c.id}
              onClick={setSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}
