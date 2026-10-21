import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { analyticsApi, stationsApi } from '../../api/client';
import { CHARGERS } from '../../data/chargers';
import { useToast } from '../../context/ToastContext';
import PageMeta from '../../components/PageMeta/PageMeta';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import './Analytics.css';

const OP_COLORS = [
  '#3730A3',
  '#6366F1',
  '#818CF8',
  '#A5B4FC',
  '#C7D2FE',
  '#059669',
  '#D97706',
  '#4F46E5',
];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [stations, setStations] = useState(CHARGERS);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [anRes, stRes] = await Promise.all([
        analyticsApi.get(),
        stationsApi.getAll(),
      ]);
      if (anRes) setData(anRes);
      if (stRes?.stations) setStations(stRes.stations);
    } catch (err) {
      console.warn('Analytics API error, falling back:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const cityData = data?.cityData || [];
  const operatorData = data?.operatorData || [];
  const pieData = data?.pieData || [
    { name: 'Available', value: 80, color: '#059669' },
    { name: 'In Use', value: 35, color: '#D97706' },
    { name: 'Offline', value: 5, color: '#DC2626' },
  ];

  return (
    <div className="analytics page-enter">
      <PageMeta
        title="Network Analytics"
        description="Aggregated real-time charging network telemetry, port availability distributions, and operator market share."
      />
      <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="analytics-title font-display">Network Analytics</h1>
          <p className="analytics-sub">
            Aggregated telemetry and reservation data across connected CPO hubs · Computed Live
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={async () => {
            await loadAnalytics();
            toast.success('Analytics metrics and CPO stats refreshed.');
          }}
          disabled={loading}
          title="Refresh analytics metrics"
        >
          <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
          <span>Sync</span>
        </button>
      </div>

      <div className="analytics-grid">

        {/* Port status distribution */}
        <div className="an-card card">
          <div className="an-card-header">
            <div className="an-card-title">Port Availability Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid #E2E6EE', borderRadius: 8 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* City breakdown */}
        <div className="an-card card an-card-wide">
          <div className="an-card-header">
            <div className="an-card-title">Metro Port Capacity</div>
            <span className="chip">All Cities</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#F0F2F6" vertical={false} />
              <XAxis
                dataKey="city"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E6EE', borderRadius: 8 }} />
              <Bar dataKey="available" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} name="Available" />
              <Bar dataKey="busy" stackId="a" fill="#D97706" name="In Use / Reserved" />
              <Bar dataKey="offline" stackId="a" fill="#DC2626" radius={[3, 3, 0, 0]} name="Offline" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Operator market share */}
        <div className="an-card card an-card-full">
          <div className="an-card-header">
            <div className="an-card-title">CPO Port Share</div>
            <span className="chip">Verified Networks</span>
          </div>
          <div className="op-share-list">
            {operatorData
              .sort((a, b) => b.value - a.value)
              .map((op, i) => {
                const total = operatorData.reduce((s, o) => s + o.value, 0) || 1;
                const pct = Math.round((op.value / total) * 100);
                return (
                  <div key={op.name} className="op-row">
                    <div className="op-name">{op.name}</div>
                    <div className="op-bar-wrap">
                      <div
                        className="op-bar"
                        style={{
                          width: `${pct}%`,
                          background: OP_COLORS[i % OP_COLORS.length],
                        }}
                      />
                    </div>
                    <div className="op-pct">{pct}%</div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* KPI table */}
        <div className="an-card card an-card-full">
          <div className="an-card-header">
            <div className="an-card-title">Station Performance Table</div>
            <span className="chip">{stations.length} Active Hubs</span>
          </div>
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>City</th>
                  <th>Operator</th>
                  <th>Total Ports</th>
                  <th>Available</th>
                  <th>In Use</th>
                  <th>Availability Rate</th>
                  <th>Max Speed</th>
                  <th>Tariff</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((c) => {
                  const rate = Math.round((c.available / c.ports) * 100);
                  return (
                    <tr key={c.id}>
                      <td className="an-td-name">{c.name}</td>
                      <td>{c.city}</td>
                      <td>{c.operator}</td>
                      <td className="an-td-center">{c.ports}</td>
                      <td className="an-td-center an-avail">{c.available}</td>
                      <td className="an-td-center an-busy">{c.busy}</td>
                      <td className="an-td-center">
                        <div className="an-rate-wrap">
                          <div className="an-rate-bar" style={{ width: `${rate}%` }} />
                          <span>{rate}%</span>
                        </div>
                      </td>
                      <td className="an-td-center">{c.speed} kW</td>
                      <td className="an-td-center">₹{c.tariffPerKwh || 19.5}/kWh</td>
                      <td>
                        <span className={`badge badge-${c.status}`}>
                          <span className={`dot dot-${c.status}`} />
                          {c.status === 'available'
                            ? 'Available'
                            : c.status === 'busy'
                            ? 'Busy'
                            : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
