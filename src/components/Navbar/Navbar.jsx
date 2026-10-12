import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Zap,
  LayoutDashboard,
  Map,
  BarChart2,
  Bell,
  User,
  Calendar,
  LogOut,
  Car,
  ChevronDown,
  Menu,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import UserBookingsModal from '../UserBookingsModal/UserBookingsModal';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '../../constants/contact';
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
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'EV';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    toast.success('Signed out successfully.');
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo" aria-label="VoltaicOS home">
            <div className="brand-icon">
              <Zap size={18} strokeWidth={2.5} />
            </div>
            <span className="brand-name font-display">VoltaicOS</span>
            <span className="brand-tag">LIVE</span>
          </Link>
        </div>

        <ul className="navbar-links navbar-links--desktop">
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
          <button
            className="nav-bookings-btn"
            onClick={() => setShowBookingsModal(true)}
            title="My Slot Reservations"
          >
            <Calendar size={15} />
            <span>My Bookings</span>
          </button>

          {isAuthenticated && user ? (
            <div className="nav-user-container" ref={menuRef}>
              <button
                type="button"
                className="nav-user-trigger"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-expanded={showUserMenu}
                aria-haspopup="true"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="nav-avatar-img" width={28} height={28} />
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
                    {user.email && (
                      <a className="duh-email" href={`mailto:${user.email}`}>
                        {user.email}
                      </a>
                    )}
                    {user.phone && (
                      <a className="duh-email" href={`tel:${user.phone}`}>
                        {user.phone}
                      </a>
                    )}
                    {user.licensePlate && (
                      <div className="duh-plate">
                        <Car size={12} /> {user.licensePlate} ({user.vehicleModel})
                      </div>
                    )}
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowBookingsModal(true);
                    }}
                  >
                    <Calendar size={15} />
                    <span>My Reservations</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button type="button" className="dropdown-item dropdown-item--danger" onClick={handleLogout}>
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-sm nav-login-btn" onClick={() => openAuthModal()}>
              <User size={14} />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            className="nav-hamburger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="nav-drawer-overlay" onClick={() => setMobileOpen(false)}>
          <div className="nav-drawer" onClick={(e) => e.stopPropagation()}>
            <ul className="navbar-links navbar-links--mobile">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                    end
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="nav-drawer-bookings"
              onClick={() => {
                setMobileOpen(false);
                setShowBookingsModal(true);
              }}
            >
              <Calendar size={16} />
              My Bookings
            </button>
            <div className="nav-drawer-contact">
              <a href={`tel:${SUPPORT_PHONE}`}>
                <Phone size={14} />
                {SUPPORT_PHONE_DISPLAY}
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail size={14} />
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      )}

      <UserBookingsModal isOpen={showBookingsModal} onClose={() => setShowBookingsModal(false)} />
    </>
  );
}
