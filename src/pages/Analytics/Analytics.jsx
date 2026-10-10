import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid,
} from 'recharts';
import { CHARGERS } from '../../data/chargers';
import './Analytics.css';

// Compute data
function useDerivedData() {
  return useMemo(() => {
    // City-level summary
    const cityMap = {};
    CHARGERS.forEach(c => {
      if (!cityMap[c.city]) cityMap[c.city] = { city: c.city, available: 0, busy: 0, offline: 0, total: 0 };
      cityMap[c.city].available += c.available;
      cityMap[c.city].busy      += c.busy;
      cityMap[c.city].offline   += c.offline;
      cityMap[c.city].total     += c.ports;
    });
    const cityData = Object.values(cityMap);

    // Operator market share
    const opMap = {};
    CHARGERS.forEach(c => {
      opMap[c.operator] = (opMap[c.operator] || 0) + c.ports;
    });
    const operatorData = Object.entries(opMap).map(([name, value]) => ({ name, value }));

    // Status distribution (pie)
    const totalAvail   = CHARGERS.reduce((s, c) => s + c.available, 0);
    const totalBusy    = CHARGERS.reduce((s, c) => s + c.busy, 0);
    const totalOffline = CHARGERS.reduce((s, c) => s + c.offline, 0);
    const pieData = [
      { name: 'Available', value: totalAvail,   color: '#059669' },
      { name: 'In Use',    value: totalBusy,    color: '#D97706' },
      { name: 'Offline',   value: totalOffline, color: '#DC2626' },
    ];

    // Simulated 24h utilization (area chart)
    const hours = Array.from({ length: 24 }, (_, i) => {
      const h = String(i).padStart(2, '0') + ':00';
      const util = 20 + Math.round(50 * Math.sin((i - 6) * Math.PI / 12) + Math.random() * 10);
      return { time: h, utilization: Math.max(5, Math.min(95, util)) };
    });

    return { cityData, operatorData, pieData, hours };
  }, []);
}

const OP_COLORS = ['#3730A3','#6366F1','#818CF8','#A5B4FC','#C7D2FE','#E0E7FF','#4338CA','#4F46E5'];

export default function Analytics() {
  const { cityData, operatorData, pieData, hours } = useDerivedData();

  return (
    <div className="analytics page-enter">
      <div className="analytics-header">
        <h1 className="analytics-title font-display">Network Analytics</h1>
        <p className="analytics-sub">Aggregated telemetry across all connected operators · Updated live</p>
      </div>

      <div className="analytics-grid">

        {/* 24h Utilization trend */}
        <div className="an-card card an-card-wide">
          <div className="an-card-header">
            <div className="an-card-title">24-Hour Utilization Trend</div>
            <span className="chip">Today</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hours} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F0F2F6" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid #E2E6EE', borderRadius: 8 }}
                formatter={(v) => [`${v}%`, 'Utilization']}
              />
              <Area type="monotone" dataKey="utilization" stroke="#6366F1" strokeWidth={2} fill="url(#utilGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Port status distribution */}
        <div className="an-card card">
          <div className="an-card-header">
            <div className="an-card-title">Port Status Distribution</div>
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
            <div className="an-card-title">City Port Breakdown</div>
            <span className="chip">All cities</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#F0F2F6" vertical={false} />
              <XAxis dataKey="city" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E2E6EE', borderRadius: 8 }} />
              <Bar dataKey="available" stackId="a" fill="#059669" radius={[0,0,0,0]} name="Available" />
              <Bar dataKey="busy"      stackId="a" fill="#D97706" name="In Use" />
              <Bar dataKey="offline"   stackId="a" fill="#DC2626" radius={[3,3,0,0]} name="Offline" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Operator market share */}
        <div className="an-card card">
          <div className="an-card-header">
            <div className="an-card-title">Operator Port Share</div>
          </div>
          <div className="op-share-list">
            {operatorData.sort((a,b) => b.value - a.value).map((op, i) => {
              const total = operatorData.reduce((s, o) => s + o.value, 0);
              const pct   = Math.round((op.value / total) * 100);
              return (
                <div key={op.name} className="op-row">
                  <div className="op-name">{op.name}</div>
                  <div className="op-bar-wrap">
                    <div className="op-bar" style={{ width: `${pct}%`, background: OP_COLORS[i % OP_COLORS.length] }} />
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {CHARGERS.map(c => {
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
                      <td>
                        <span className={`badge badge-${c.status}`}>
                          <span className={`dot dot-${c.status}`} />
                          {c.status === 'available' ? 'Available' : c.status === 'busy' ? 'Busy' : 'Offline'}
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
    </div>
  );
}
