import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
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
  Shield,
  Plug,
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
  { to: '/rent-charger', label: 'Rent Charger', icon: Plug },
];

export default function Navbar() {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Escape key closes menus
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setShowUserMenu(false);
      }
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
    setMobileOpen(false);
    logout();
    toast.success('Signed out successfully.');
  };

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main Navigation">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo" aria-label="VoltaicOS home" onClick={() => setMobileOpen(false)}>
            <div className="brand-icon">
              <Zap size={18} strokeWidth={2.5} />
            </div>
            <span className="brand-name font-display">VoltaicOS</span>
            <span className="brand-tag">LIVE</span>
          </Link>
        </div>

        {/* Desktop nav links */}
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

        {/* Actions */}
        <div className="navbar-actions">
          <button
            type="button"
            className="nav-bookings-btn"
            onClick={() => setShowBookingsModal(true)}
            title="My Slot Reservations"
            aria-label="My Slot Reservations"
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
                aria-label="User profile menu"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name || 'User'} className="nav-avatar-img" width={28} height={28} />
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
                        <Car size={12} /> {user.licensePlate} ({user.vehicleModel || 'EV'})
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
            <button
              type="button"
              className="btn btn-primary btn-sm nav-login-btn"
              onClick={() => openAuthModal()}
              aria-label="Sign In"
            >
              <User size={14} />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile hamburger toggle */}
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

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="nav-drawer-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="nav-drawer" onClick={(e) => e.stopPropagation()} aria-label="Mobile Menu">
            <div className="nav-drawer-header">
              <Link to="/" className="navbar-logo" onClick={() => setMobileOpen(false)}>
                <div className="brand-icon">
                  <Zap size={18} strokeWidth={2.5} />
                </div>
                <span className="brand-name font-display">VoltaicOS</span>
              </Link>
              <button
                type="button"
                className="nav-drawer-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* User status banner in drawer */}
            <div className="nav-drawer-user-section">
              {isAuthenticated && user ? (
                <div className="drawer-user-card card">
                  <div className="drawer-user-info">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="nav-avatar-img" width={36} height={36} />
                    ) : (
                      <div className="nav-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div>
                      <div className="drawer-user-name">{user.name || 'EV Driver'}</div>
                      <div className="drawer-user-sub">{user.email || user.phone || 'Verified Member'}</div>
                    </div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm drawer-logout-btn" onClick={handleLogout}>
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary drawer-login-btn"
                  onClick={() => {
                    setMobileOpen(false);
                    openAuthModal();
                  }}
                >
                  <User size={15} />
                  <span>Sign In or Register</span>
                </button>
              )}
            </div>

            {/* Navigation items */}
            <ul className="navbar-links navbar-links--mobile">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) => `nav-link nav-link--mobile ${isActive ? 'nav-link-active' : ''}`}
                    end
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Quick Actions */}
            <div className="nav-drawer-actions">
              <button
                type="button"
                className="nav-drawer-bookings"
                onClick={() => {
                  setMobileOpen(false);
                  setShowBookingsModal(true);
                }}
              >
                <Calendar size={16} />
                <span>My Slot Reservations</span>
              </button>
            </div>

            {/* Support hotline contact */}
            <div className="nav-drawer-contact">
              <div className="drawer-contact-title">24/7 EV Driver Assistance</div>
              <a href={`tel:${SUPPORT_PHONE}`} className="drawer-contact-link">
                <Phone size={15} />
                <span>{SUPPORT_PHONE_DISPLAY}</span>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="drawer-contact-link">
                <Mail size={15} />
                <span>{SUPPORT_EMAIL}</span>
              </a>
            </div>

            <div className="nav-drawer-footer">
              <Shield size={13} color="#059669" />
              <span>OCPI 2.2.1 Secure Network Bridge</span>
            </div>
          </aside>
        </div>
      )}

      {/* User Bookings Modal */}
      <UserBookingsModal isOpen={showBookingsModal} onClose={() => setShowBookingsModal(false)} />
    </>
  );
}
