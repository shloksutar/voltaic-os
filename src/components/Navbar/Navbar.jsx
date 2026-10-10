import { NavLink, Link, useLocation } from 'react-router-dom';
import { Zap, LayoutDashboard, Map, BarChart2, Bell, Settings, ChevronRight } from 'lucide-react';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/',         label: 'Overview',   icon: LayoutDashboard },
  { to: '/map',      label: 'Live Map',   icon: Map },
  { to: '/chargers', label: 'Chargers',   icon: Zap },
  { to: '/analytics',label: 'Analytics',  icon: BarChart2 },
  { to: '/alerts',   label: 'Alerts',     icon: Bell },
];

export default function Navbar() {
  const location = useLocation();
  const isLanding = location.pathname === '/landing' || location.pathname === '/home';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <Zap size={18} strokeWidth={2.5} />
        </div>
        <span className="brand-name font-display">VoltaicOS</span>
        <span className="brand-tag">BETA</span>
      </div>

      <ul className="navbar-links">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} end>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="navbar-actions">
        <button className="nav-icon-btn" title="Notifications">
          <Bell size={17} strokeWidth={1.8} />
          <span className="notif-dot" />
        </button>
        <button className="nav-icon-btn" title="Settings">
          <Settings size={17} strokeWidth={1.8} />
        </button>
        <div className="nav-avatar">SL</div>
      </div>
    </nav>
  );
}
