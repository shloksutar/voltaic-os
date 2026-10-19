import {
  MapPin,
  Clock,
  ShieldCheck,
  Phone,
  MessageCircle,
  Zap,
  Star,
  Check,
  AlertCircle,
} from 'lucide-react';
import './TwoWheelerCard.css';

export default function TwoWheelerCard({ charger, onBook, selected, onSelect }) {
  const {
    hostName,
    hostPhone,
    idType,
    title,
    city,
    area,
    address,
    landmark,
    socketType,
    powerOutput,
    supportedVehicles = [],
    rateDisplay,
    availabilityStatus,
    availableTiming,
    amenities = [],
    notes,
    rating = 4.9,
    reviewsCount = 18,
    totalSessionsCompleted = 45,
  } = charger;

  const isAvailableNow = availabilityStatus === 'available_now';

  const cleanPhone = (hostPhone || '').replace(/\D/g, '');
  const waLink = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
    `Hello ${hostName}, I found your 2-wheeler EV charger on VoltaicOS (${area}, ${city}). Is it available right now for charging?`
  )}`;

  return (
    <div
      className={`tw-card card ${selected ? 'tw-card--selected' : ''}`}
      onClick={() => onSelect && onSelect(charger)}
    >
      {/* Top Bar: Scooter Badge + Availability Status */}
      <div className="tw-card-top">
        <div className="tw-card-badge">
          <span className="tw-badge-icon">🛵</span>
          <span>2-Wheeler Community Host</span>
        </div>

        <div className={`tw-status-tag ${isAvailableNow ? 'tw-status-tag--avail' : 'tw-status-tag--sched'}`}>
          <span className={`tw-status-dot ${isAvailableNow ? 'tw-dot-pulse' : ''}`} />
          <span>{isAvailableNow ? 'Available Now' : 'Scheduled Hours'}</span>
        </div>
      </div>

      {/* Main Info */}
      <div className="tw-card-header">
        <div>
          <h3 className="tw-card-title font-display">{title || `${area} EV Socket`}</h3>
          <div className="tw-card-location">
            <MapPin size={13} className="text-primary" />
            <span>
              <strong>{area}</strong>, {city}
            </span>
          </div>
          {landmark && <div className="tw-card-landmark">📍 {landmark}</div>}
        </div>

        <div className="tw-card-price">
          <span className="tw-price-val font-display">{rateDisplay || '₹25/hr'}</span>
          <span className="tw-price-sub">rental rate</span>
        </div>
      </div>

      {/* Host Credentials & Trust Badge */}
      <div className="tw-host-strip">
        <div className="tw-host-info">
          <div className="tw-host-avatar">
            {hostName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="tw-host-name">
              <span>Host: {hostName}</span>
              <span className="tw-verified-badge" title="Government ID Verified Host">
                <ShieldCheck size={12} />
                <span>Verified</span>
              </span>
            </div>
            <div className="tw-host-stats">
              <span className="tw-stat-rating">
                <Star size={11} fill="#F59E0B" color="#F59E0B" /> {rating} ({reviewsCount})
              </span>
              <span className="tw-stat-sep">·</span>
              <span>{totalSessionsCompleted} riders served</span>
            </div>
          </div>
        </div>

        <div className="tw-id-tag">
          <span>{idType || 'Aadhaar Verified'}</span>
        </div>
      </div>

      {/* Socket & Timing details */}
      <div className="tw-specs-row">
        <div className="tw-spec-item">
          <Zap size={13} className="tw-spec-icon text-primary" />
          <div>
            <div className="tw-spec-label">Socket / Power</div>
            <div className="tw-spec-val">{socketType} ({powerOutput || '3.3 kW'})</div>
          </div>
        </div>

        <div className="tw-spec-item">
          <Clock size={13} className="tw-spec-icon" />
          <div>
            <div className="tw-spec-label">Host Timing</div>
            <div className="tw-spec-val">{availableTiming || '07:00 AM – 10:00 PM'}</div>
          </div>
        </div>
      </div>

      {/* Supported 2-Wheelers */}
      {supportedVehicles.length > 0 && (
        <div className="tw-vehicles-wrap">
          <div className="tw-vehicles-label">Compatible Scooters:</div>
          <div className="tw-vehicles-list">
            {supportedVehicles.slice(0, 4).map((v) => (
              <span key={v} className="tw-v-pill">
                <Check size={10} /> {v.replace(' / ', '/')}
              </span>
            ))}
            {supportedVehicles.length > 4 && (
              <span className="tw-v-pill tw-v-more">+{supportedVehicles.length - 4} more</span>
            )}
          </div>
        </div>
      )}

      {/* Amenities & Notes */}
      {amenities.length > 0 && (
        <div className="tw-amenities-row">
          {amenities.map((a) => (
            <span key={a} className="tw-amenity-chip">✓ {a}</span>
          ))}
        </div>
      )}

      {notes && (
        <div className="tw-card-notes">
          <span className="tw-notes-icon">💬</span>
          <span>&ldquo;{notes}&rdquo;</span>
        </div>
      )}

      {/* Action Buttons: Contact Host & Book */}
      <div className="tw-card-actions">
        <a
          href={`tel:+91${cleanPhone}`}
          className="btn btn-ghost btn-sm tw-btn-call"
          title={`Call ${hostName} directly`}
          onClick={(e) => e.stopPropagation()}
        >
          <Phone size={13} />
          <span>Call Host</span>
        </a>

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm tw-btn-wa"
          title="Chat with host on WhatsApp"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle size={13} />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          className="btn btn-primary btn-sm tw-btn-book"
          onClick={(e) => {
            e.stopPropagation();
            if (onBook) onBook(charger);
          }}
        >
          <Zap size={13} />
          <span>Request Slot</span>
        </button>
      </div>
    </div>
  );
}
