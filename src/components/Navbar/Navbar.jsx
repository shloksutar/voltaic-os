import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Zap,
  LayoutDashboard,
  Map,
  BarChart2,
  Bell,
  Settings,
  User,
  Calendar,
  LogOut,
  Car,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import UserBookingsModal from '../UserBookingsModal/UserBookingsModal';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/map', label: 'Live Map', icon: Map },
  { to: '/chargers', label: 'Chargers', icon: Zap },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/alerts', label: 'Alerts', icon: Bell },
];

export default function Navbar() {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'EV';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
            <div className="brand-icon">
              <Zap size={18} strokeWidth={2.5} />
            </div>
            <span className="brand-name font-display">VoltaicOS</span>
            <span className="brand-tag">LIVE</span>
          </Link>
        </div>

        <ul className="navbar-links">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                end
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="navbar-actions">
          {/* My Bookings Button */}
          <button
            className="nav-bookings-btn"
            onClick={() => setShowBookingsModal(true)}
            title="My Slot Reservations"
          >
            <Calendar size={15} />
            <span>My Bookings</span>
          </button>

          {/* Alerts notification icon */}
          <button
            className="nav-icon-btn"
            title="Network Alerts"
            onClick={() => navigate('/alerts')}
          >
            <Bell size={17} strokeWidth={1.8} />
            <span className="notif-dot" />
          </button>

          {/* User Profile / Auth State */}
          {isAuthenticated && user ? (
            <div className="nav-user-container" ref={menuRef}>
              <button
                className="nav-user-trigger"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="nav-avatar-img" />
                ) : (
                  <div className="nav-avatar">{getInitials(user.name)}</div>
                )}
                <div className="nav-user-info-text">
                  <span className="nav-user-name">{user.name || 'EV Driver'}</span>
                  <span className="nav-user-vehicle">
                    {user.vehicleModel ? user.vehicleModel.split(' ')[0] : 'EV'}
                  </span>
                </div>
                <ChevronDown size={13} className="nav-user-chevron" />
              </button>

              {showUserMenu && (
                <div className="nav-user-dropdown card">
                  <div className="dropdown-user-header">
                    <div className="duh-name">{user.name}</div>
                    <div className="duh-email">{user.email || user.phone}</div>
                    {user.licensePlate && (
                      <div className="duh-plate">
                        <Car size={12} /> {user.licensePlate} ({user.vehicleModel})
                      </div>
                    )}
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowBookingsModal(true);
                    }}
                  >
                    <Calendar size={15} />
                    <span>My Reservations</span>
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/alerts');
                    }}
                  >
                    <Bell size={15} />
                    <span>Active Alerts</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item dropdown-item--danger"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary btn-sm nav-login-btn" onClick={() => openAuthModal()}>
              <User size={14} />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </nav>

      {/* Bookings Modal */}
      <UserBookingsModal
        isOpen={showBookingsModal}
        onClose={() => setShowBookingsModal(false)}
      />
    </>
  );
}
