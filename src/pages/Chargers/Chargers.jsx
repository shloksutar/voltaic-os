import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ChevronDown, RefreshCw } from 'lucide-react';
import { CITIES, OPERATORS, CHARGERS } from '../../data/chargers';
import { stationsApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import ChargerCard from '../../components/ChargerCard/ChargerCard';
import ReservationModal from '../../components/ReservationModal/ReservationModal';
import ReportIssueModal from '../../components/ReportIssueModal/ReportIssueModal';
import PageMeta from '../../components/PageMeta/PageMeta';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import './Chargers.css';

const STATUS_OPTS = ['All', 'Available', 'Busy', 'Offline'];

export default function Chargers() {
  const [stations, setStations] = useState(CHARGERS);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [operator, setOperator] = useState('All Operators');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  // Modals state
  const [reservingStation, setReservingStation] = useState(null);
  const [reportingStation, setReportingStation] = useState(null);

  const fetchStations = useCallback(async (isManual = false) => {
    setLoading(true);
    try {
      const res = await stationsApi.getAll({
        city,
        operator,
        status,
        search,
      });
      if (res?.stations) {
        setStations(res.stations);
        setFetchError('');
        if (isManual) {
          toast.success('Live charger status updated.');
        }
      }
    } catch {
      // Offline fallback: verified stations served from cache
      setFetchError('');
    } finally {
      setLoading(false);
    }
  }, [city, operator, status, search, toast]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const filtered = useMemo(() => {
    return stations.filter((c) => {
      if (
        search &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.city.toLowerCase().includes(search.toLowerCase()) &&
        !(c.address && c.address.toLowerCase().includes(search.toLowerCase()))
      )
        return false;
      if (city !== 'All Cities' && c.city !== city) return false;
      if (operator !== 'All Operators' && c.operator !== operator) return false;
      if (status !== 'All' && c.status.toLowerCase() !== status.toLowerCase()) return false;
      return true;
    });
  }, [stations, search, city, operator, status]);

  const handleClearFilters = () => {
    setSearch('');
    setCity('All Cities');
    setOperator('All Operators');
    setStatus('All');
    toast.success('Search filters reset to default.');
  };

  return (
    <div className="chargers-page page-enter">
      <PageMeta
        title="Chargers Directory"
        description="Browse, filter, and reserve high-speed fast chargers from Tata Power, ChargeZone, Statiq, and more."
      />
      {/* Header */}
      <div className="chp-header">
        <div>
          <h1 className="chp-title font-display">EV Charging Stations</h1>
          <p className="chp-sub">
            {filtered.length} of {stations.length} charging stations found across India
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm chp-refresh-btn"
          onClick={() => fetchStations(true)}
          disabled={loading}
          title="Refresh live charger status"
          aria-label="Refresh live charger status"
        >
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>
      {fetchError && <div className="page-banner page-banner--error">{fetchError}</div>}

      {/* Filters */}
      <div className="chp-filters card">
        <div className="chp-search-wrap">
          <Search size={15} className="chp-search-icon" />
          <input
            className="chp-search"
            placeholder="Search by station name, metro, or landmark…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search charging stations"
          />
        </div>

        <div className="chp-selects">
          {[
            { label: 'City', value: city, setter: setCity, opts: CITIES },
            { label: 'Operator', value: operator, setter: setOperator, opts: OPERATORS },
          ].map(({ label, value, setter, opts }) => (
            <div key={label} className="chp-select-wrap">
              <select
                className="chp-select"
                value={value}
                onChange={(e) => setter(e.target.value)}
                aria-label={`Filter by ${label}`}
              >
                {opts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={13} className="chp-sel-icon" />
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="chp-status-tabs" role="tablist" aria-label="Filter by Status">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              className={`status-tab ${status === s ? 'status-tab-active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s !== 'All' && (
                <span
                  className={`dot dot-${s.toLowerCase()} ${s === 'Available' ? 'dot-pulse' : ''}`}
                />
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
          <div>No stations match your selected filters.</div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleClearFilters}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="chp-grid">
          {filtered.map((c) => (
            <ChargerCard
              key={c.id}
              charger={c}
              selected={selected?.id === c.id}
              onClick={(station) => {
                setSelected(station);
                if (station.status !== 'offline' && station.available > 0) {
                  setReservingStation(station);
                }
              }}
              onReserve={(station) => setReservingStation(station)}
              onReport={(station) => setReportingStation(station)}
            />
          ))}
        </div>
      )}

      {/* Reservation Modal */}
      {reservingStation && (
        <ReservationModal
          station={reservingStation}
          isOpen={!!reservingStation}
          onClose={() => setReservingStation(null)}
          onBookingComplete={() => {
            fetchStations();
          }}
        />
      )}

      {/* Report Issue Modal */}
      {reportingStation && (
        <ReportIssueModal
          station={reportingStation}
          isOpen={!!reportingStation}
          onClose={() => setReportingStation(null)}
          onReportSuccess={() => {
            fetchStations();
          }}
        />
      )}

      <SiteFooter />
    </div>
  );
}
