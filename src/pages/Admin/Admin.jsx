import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Plug,
  Zap,
  User,
  Phone,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  Tag,
  Building2,
  Lock,
  ShieldAlert,
  LogIn,
  PauseCircle,
  Undo2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { chargerListingsApi } from '../../api/client';
import PageMeta from '../../components/PageMeta/PageMeta';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import './Admin.css';

const STATUS_CONFIG = {
  pending_review: {
    label: 'Pending Review',
    icon: Clock,
    cls: 'status-pending',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    cls: 'status-approved',
  },
  on_hold: {
    label: 'On Hold',
    icon: PauseCircle,
    cls: 'status-hold',
  },
  denied: {
    label: 'Denied',
    icon: XCircle,
    cls: 'status-denied',
  },
  // Legacy value kept for backward compatibility with older records
  rejected: {
    label: 'Denied',
    icon: XCircle,
    cls: 'status-denied',
  },
};

function ListingCard({ listing, onReview }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(null); // 'approved' | 'on_hold' | 'denied' | null
  const cfg = STATUS_CONFIG[listing.status] || STATUS_CONFIG.pending_review;
  const StatusIcon = cfg.icon;
  const isEffective = (s) => (listing.status || '') === s || (s === 'denied' && listing.status === 'rejected');

  const handleReview = async (targetStatus) => {
    if (!onReview || acting) return;
    setActing(targetStatus);
    try {
      await onReview(listing.id, targetStatus);
    } finally {
      setActing(null);
    }
  };

  const submittedDate = listing.submittedAt
    ? new Date(listing.submittedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <div className={`admin-card ${expanded ? 'admin-card--expanded' : ''}`}>
      {/* Card header */}
      <div className="admin-card-header" onClick={() => setExpanded((x) => !x)}>
        <div className="admin-card-left">
          <div className="admin-listing-id">
            <Tag size={13} />
            {listing.id}
          </div>
          <div className="admin-listing-name">{listing.fullName || 'Unknown Applicant'}</div>
          <div className="admin-listing-location">
            <MapPin size={12} />
            {listing.address ? `${listing.address}, ` : ''}{listing.city || '—'}
            {listing.pincode ? ` — ${listing.pincode}` : ''}
          </div>
        </div>

        <div className="admin-card-right">
          <span className={`admin-status-badge ${cfg.cls}`}>
            <StatusIcon size={12} />
            {cfg.label}
          </span>
          <div className="admin-card-date">
            <Calendar size={11} />
            {submittedDate}
          </div>
          <button className="admin-expand-btn" aria-label={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="admin-card-body">
          <div className="admin-details-grid">
            {/* Applicant Info */}
            <section className="admin-detail-section">
              <h4 className="admin-detail-title">
                <User size={14} /> Applicant Info
              </h4>
              <div className="admin-detail-rows">
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Full Name</span>
                  <span className="admin-detail-value">{listing.fullName || '—'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">
                    <Mail size={11} /> Email
                  </span>
                  <span className="admin-detail-value">
                    {listing.email ? (
                      <a href={`mailto:${listing.email}`} className="admin-link">
                        {listing.email}
                      </a>
                    ) : '—'}
                  </span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">
                    <Phone size={11} /> Phone
                  </span>
                  <span className="admin-detail-value">
                    {listing.phone ? (
                      <a href={`tel:${listing.phone}`} className="admin-link">
                        {listing.phone}
                      </a>
                    ) : '—'}
                  </span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">ID Type</span>
                  <span className="admin-detail-value">{listing.idType || '—'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">ID Number</span>
                  <span className="admin-detail-value">{listing.idNumber || '—'}</span>
                </div>
              </div>
            </section>

            {/* Charger Details */}
            <section className="admin-detail-section">
              <h4 className="admin-detail-title">
                <Plug size={14} /> Charger Details
              </h4>
              <div className="admin-detail-rows">
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Brand</span>
                  <span className="admin-detail-value">{listing.chargerBrand || '—'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Connector</span>
                  <span className="admin-detail-value">{listing.connectorType || '—'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">
                    <Zap size={11} /> Power Level
                  </span>
                  <span className="admin-detail-value">{listing.powerLevel || '—'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Price / Unit</span>
                  <span className="admin-detail-value">
                    {listing.pricePerUnit ? `₹${listing.pricePerUnit}/kWh` : '—'}
                  </span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Max Sessions/Day</span>
                  <span className="admin-detail-value">{listing.maxSessions || '—'}</span>
                </div>
                {Array.isArray(listing.supportedVehicles) && listing.supportedVehicles.length > 0 && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">2W Models</span>
                    <span className="admin-detail-value">{listing.supportedVehicles.join(', ')}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Location */}
            <section className="admin-detail-section">
              <h4 className="admin-detail-title">
                <Building2 size={14} /> Location
              </h4>
              <div className="admin-detail-rows">
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Address</span>
                  <span className="admin-detail-value">{listing.address || '—'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">City</span>
                  <span className="admin-detail-value">{listing.city || '—'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Pincode</span>
                  <span className="admin-detail-value">{listing.pincode || '—'}</span>
                </div>
              </div>
            </section>

            {/* Availability */}
            <section className="admin-detail-section">
              <h4 className="admin-detail-title">
                <Calendar size={14} /> Availability
              </h4>
              <div className="admin-detail-rows">
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Days</span>
                  <span className="admin-detail-value">
                    {Array.isArray(listing.selectedDays) && listing.selectedDays.length > 0
                      ? listing.selectedDays.join(', ')
                      : '—'}
                  </span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Hours</span>
                  <span className="admin-detail-value">
                    {listing.timeFrom && listing.timeTo
                      ? `${listing.timeFrom} – ${listing.timeTo}`
                      : '—'}
                  </span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Min Booking</span>
                  <span className="admin-detail-value">
                    {listing.minBookingHours ? `${listing.minBookingHours} hrs` : '—'}
                  </span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">Advance Notice</span>
                  <span className="admin-detail-value">
                    {listing.advanceNoticeHours ? `${listing.advanceNoticeHours} hrs` : '—'}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {listing.chargerDescription && (
            <div className="admin-description">
              <span className="admin-detail-label">Description</span>
              <p>{listing.chargerDescription}</p>
            </div>
          )}
        </div>
      )}

      {/* Admin review actions: approve / hold / deny */}
      <div className="admin-actions">
        <div className="admin-actions-meta">
          {listing.reviewedAt ? (
            <>
              Reviewed {new Date(listing.reviewedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              {listing.reviewedBy ? ` by ${listing.reviewedBy}` : ''}
            </>
          ) : (
            'Not reviewed yet'
          )}
        </div>
        <div className="admin-action-btns">
          <button
            type="button"
            className={`admin-action-btn admin-action-btn--approve ${isEffective('approved') ? 'is-active' : ''}`}
            disabled={!!acting || isEffective('approved')}
            onClick={() => handleReview('approved')}
          >
            {acting === 'approved' ? <RefreshCw size={13} className="spin-icon" /> : <CheckCircle size={13} />}
            Approve
          </button>
          <button
            type="button"
            className={`admin-action-btn admin-action-btn--hold ${isEffective('on_hold') ? 'is-active' : ''}`}
            disabled={!!acting || isEffective('on_hold')}
            onClick={() => handleReview('on_hold')}
          >
            {acting === 'on_hold' ? <RefreshCw size={13} className="spin-icon" /> : <PauseCircle size={13} />}
            Hold
          </button>
          <button
            type="button"
            className={`admin-action-btn admin-action-btn--deny ${isEffective('denied') ? 'is-active' : ''}`}
            disabled={!!acting || isEffective('denied')}
            onClick={() => handleReview('denied')}
          >
            {acting === 'denied' ? <RefreshCw size={13} className="spin-icon" /> : <XCircle size={13} />}
            Deny
          </button>
          {listing.status && listing.status !== 'pending_review' && (
            <button
              type="button"
              className="admin-action-btn admin-action-btn--reset"
              disabled={!!acting}
              onClick={() => handleReview('pending_review')}
              title="Reset back to Pending Review"
            >
              {acting === 'pending_review' ? <RefreshCw size={13} className="spin-icon" /> : <Undo2 size={13} />}
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, isAuthenticated, loading, openAuthModal } = useAuth();
  const toast = useToast();

  const [listings, setListings] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const isAdmin = isAuthenticated && user && user.isAdmin === true;

  const fetchListings = useCallback(async () => {
    setFetching(true);
    try {
      const res = await chargerListingsApi.getAll(); // no userId → fetch all
      setListings(res.listings || []);
    } catch (err) {
      console.error('Failed to fetch charger listings:', err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchListings();
  }, [isAdmin, fetchListings]);

  // Admin decision: approve / hold / deny (or reset) a charger application
  const handleReview = useCallback(
    async (id, status) => {
      try {
        const res = await chargerListingsApi.updateStatus(id, status, user?.email || 'admin');
        const updated = res?.listing || { status };
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
        const message =
          status === 'approved'
            ? `Host listing ${id} approved.`
            : status === 'on_hold'
            ? `Host listing ${id} put on hold.`
            : status === 'denied'
            ? `Host listing ${id} denied.`
            : `Host listing ${id} moved back to pending review.`;
        toast.success(message);
      } catch (err) {
        console.error('Failed to update listing status:', err);
        toast.error(err?.message || 'Failed to update the application status. Please try again.');
        throw err;
      }
    },
    [toast, user]
  );

  if (loading) return null;

  // ── Not logged in ──────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <>
        <PageMeta title="Admin Access | VoltaicOS" description="Admin-only area" />
        <div className="access-denied-page">
          <div className="access-denied-card card">
            <div className="access-denied-icon access-denied-icon--lock">
              <Lock size={36} />
            </div>
            <h1 className="access-denied-title font-display">Sign In Required</h1>
            <p className="access-denied-sub">
              This page is restricted to VoltaicOS administrators.<br />
              Please sign in to continue.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => openAuthModal()}
            >
              <LogIn size={15} /> Sign In
            </button>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  // ── Logged in but not an admin ─────────────────────────
  if (!isAdmin) {
    return (
      <>
        <PageMeta title="Access Denied | VoltaicOS" description="Admin-only area" />
        <div className="access-denied-page">
          <div className="access-denied-card card">
            <div className="access-denied-icon access-denied-icon--shield">
              <ShieldAlert size={36} />
            </div>
            <h1 className="access-denied-title font-display">Access Denied</h1>
            <p className="access-denied-sub">
              Hey <strong>{user.name || user.email}</strong>, you don't have admin privileges.
              <br />
              This area is restricted to authorised VoltaicOS administrators only.
            </p>
            <div className="access-denied-user-chip">
              <User size={13} />
              {user.email || user.phone || 'Unknown account'}
            </div>
            <Link to="/" className="btn btn-primary">
              Return to Overview
            </Link>
            <p className="access-denied-note">
              If you believe this is a mistake, contact the site owner directly.
            </p>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  // Filter & search (legacy 'rejected' is treated as denied)
  const isDeniedStatus = (s) => s === 'denied' || s === 'rejected';
  const visible = listings.filter((l) => {
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'denied' ? isDeniedStatus(l.status) : l.status === filterStatus);
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (l.fullName || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.id || '').toLowerCase().includes(q) ||
      (l.chargerBrand || '').toLowerCase().includes(q) ||
      (l.connectorType || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: listings.length,
    pending_review: listings.filter((l) => l.status === 'pending_review').length,
    approved: listings.filter((l) => l.status === 'approved').length,
    on_hold: listings.filter((l) => l.status === 'on_hold').length,
    denied: listings.filter((l) => isDeniedStatus(l.status)).length,
  };

  return (
    <>
      <PageMeta
        title="Admin — Charger Requests | VoltaicOS"
        description="Admin panel to review all charger hosting requests submitted via Rent My Charger."
      />

      <main className="admin-page">
        {/* Header */}
        <div className="admin-hero">
          <div className="admin-hero-inner">
            <div className="admin-hero-badge">
              <Shield size={14} />
              Admin Panel
            </div>
            <h1 className="admin-hero-title font-display">Charger Hosting Requests</h1>
            <p className="admin-hero-sub">
              Review and manage all charger listing applications submitted by hosts across the network.
            </p>
          </div>
        </div>

        <div className="admin-body">
          {/* Stats bar */}
          <div className="admin-stats-bar">
            <div className="admin-stat-chip admin-stat-chip--all">
              <span className="admin-stat-num">{counts.all}</span>
              <span className="admin-stat-label">Total</span>
            </div>
            <div className="admin-stat-chip admin-stat-chip--pending">
              <Clock size={14} />
              <span className="admin-stat-num">{counts.pending_review}</span>
              <span className="admin-stat-label">Pending</span>
            </div>
            <div className="admin-stat-chip admin-stat-chip--approved">
              <CheckCircle size={14} />
              <span className="admin-stat-num">{counts.approved}</span>
              <span className="admin-stat-label">Approved</span>
            </div>
            <div className="admin-stat-chip admin-stat-chip--hold">
              <PauseCircle size={14} />
              <span className="admin-stat-num">{counts.on_hold}</span>
              <span className="admin-stat-label">On Hold</span>
            </div>
            <div className="admin-stat-chip admin-stat-chip--denied">
              <XCircle size={14} />
              <span className="admin-stat-num">{counts.denied}</span>
              <span className="admin-stat-label">Denied</span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-search-wrap">
              <Search size={15} className="admin-search-icon" />
              <input
                id="admin-search"
                className="admin-search"
                type="text"
                placeholder="Search by name, email, city, ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="admin-filter-wrap">
              <Filter size={14} />
              <select
                id="admin-filter"
                className="admin-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="on_hold">On Hold</option>
                <option value="denied">Denied</option>
              </select>
            </div>

            <button
              className="btn btn-ghost btn-sm admin-refresh-btn"
              onClick={fetchListings}
              disabled={fetching}
              title="Refresh"
            >
              <RefreshCw size={14} className={fetching ? 'spin-icon' : ''} />
              {fetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {/* Listings */}
          {fetching && listings.length === 0 ? (
            <div className="admin-loading">
              <RefreshCw size={26} className="spin-icon" />
              <span>Loading charger requests…</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="admin-empty">
              <Plug size={40} strokeWidth={1.2} />
              <div>No charger requests found.</div>
              {search || filterStatus !== 'all' ? (
                <p>Try clearing your search or filter.</p>
              ) : (
                <p>Charger hosting applications will appear here once submitted.</p>
              )}
            </div>
          ) : (
            <div className="admin-listings">
              <div className="admin-results-count">
                Showing {visible.length} of {listings.length} request{listings.length !== 1 ? 's' : ''}
              </div>
              {visible.map((listing) => (
                <ListingCard key={listing.id} listing={listing} onReview={handleReview} />
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
