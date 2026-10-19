import { useState } from 'react';
import {
  X,
  Zap,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import { saveTwoWheelerBooking } from '../../data/twoWheelerChargers';
import './TwoWheelerBookingModal.css';

const DURATION_OPTIONS = [
  { label: '30 Mins (Emergency Top-up)', hours: 0.5 },
  { label: '1 Hour (Standard Charge)', hours: 1 },
  { label: '2 Hours (Commute Boost)', hours: 2 },
  { label: '3 Hours (Full 0–100%)', hours: 3 },
];

export default function TwoWheelerBookingModal({ charger, isOpen, onClose, onBookingSuccess }) {
  const [scooterModel, setScooterModel] = useState('');
  const [duration, setDuration] = useState(DURATION_OPTIONS[1]);
  const [arrivalTime, setArrivalTime] = useState('Immediately (Within 15 mins)');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderName, setRiderName] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen || !charger) return null;

  const {
    hostName,
    hostPhone,
    area,
    city,
    address,
    landmark,
    socketType,
    rateAmount = 25,
    lat,
    lng,
  } = charger;

  const totalCost = Math.max(0, Math.round(duration.hours * rateAmount));
  const cleanPhone = (hostPhone || '').replace(/\D/g, '');

  const handleConfirm = (e) => {
    e.preventDefault();
    setError('');

    if (!riderName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!riderPhone.trim() || riderPhone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    const bookingPayload = {
      chargerId: charger.id,
      chargerTitle: charger.title,
      hostName,
      hostPhone: cleanPhone,
      riderName: riderName.trim(),
      riderPhone: riderPhone.replace(/\D/g, '').slice(-10),
      scooterModel,
      durationHours: duration.hours,
      durationLabel: duration.label,
      arrivalTime,
      totalCost,
      city,
      area,
      address,
      socketType,
    };

    const saved = saveTwoWheelerBooking(bookingPayload);
    if (saved) {
      setConfirmedBooking(saved);
      if (onBookingSuccess) onBookingSuccess(saved);
    } else {
      setError('Could not process booking. Please try again.');
    }
  };

  const handleClose = () => {
    setConfirmedBooking(null);
    setError('');
    onClose();
  };

  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const waNotifyUrl = confirmedBooking
    ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
        `Hi ${hostName}, I just booked a charging slot (${confirmedBooking.id}) for my ${scooterModel} on VoltaicOS. Arriving at ${arrivalTime}. Address: ${address}. Please confirm!`
      )}`
    : '#';

  return (
    <div className="twb-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="twb-card card" onClick={(e) => e.stopPropagation()}>
        <div className="twb-header">
          <div>
            <div className="twb-badge">
              <span>🛵 2-Wheeler Rental Request</span>
            </div>
            <h2 className="twb-title font-display">
              {confirmedBooking ? 'Booking Confirmed!' : `Book Slot at ${area}`}
            </h2>
            <p className="twb-sub">
              {confirmedBooking
                ? `Host ${hostName} has been notified. Contact details and navigation ready.`
                : `Connect with verified host ${hostName} for EV scooter charging.`}
            </p>
          </div>
          <button className="twb-close" onClick={handleClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {confirmedBooking ? (
          <div className="twb-confirm-body">
            <div className="twb-confirm-icon">
              <CheckCircle2 size={46} color="#10B981" />
            </div>
            <h3 className="twb-confirm-title">Charging Slot Confirmed</h3>
            <div className="twb-booking-code font-display">{confirmedBooking.id}</div>
            <p className="twb-confirm-sub">
              Show this code to <strong>{hostName}</strong> upon arrival.
            </p>

            <div className="twb-details-box">
              <div className="twb-d-row">
                <span>Host:</span>
                <strong>{hostName}</strong>
              </div>
              <div className="twb-d-row">
                <span>Address:</span>
                <span>{address}, {area}</span>
              </div>
              {landmark && (
                <div className="twb-d-row">
                  <span>Landmark:</span>
                  <span>{landmark}</span>
                </div>
              )}
              <div className="twb-d-row">
                <span>Socket:</span>
                <span>{socketType}</span>
              </div>
              <div className="twb-d-row">
                <span>Vehicle:</span>
                <span>{scooterModel}</span>
              </div>
              <div className="twb-d-row">
                <span>Estimated Cost:</span>
                <strong style={{ color: '#10B981' }}>₹{totalCost}</strong>
              </div>
            </div>

            <div className="twb-confirm-actions">
              <a
                href={waNotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary twb-btn-wa"
              >
                <MessageCircle size={15} />
                <span>Message Host on WhatsApp</span>
              </a>

              <a
                href={`tel:+91${cleanPhone}`}
                className="btn btn-secondary"
              >
                <Phone size={15} />
                <span>Call +91 {cleanPhone}</span>
              </a>

              <a
                href={gmapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <Navigation size={15} />
                <span>Open Google Maps Directions</span>
              </a>
            </div>
          </div>
        ) : (
          <form className="twb-form" onSubmit={handleConfirm}>
            {error && (
              <div className="twb-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Host summary chip */}
            <div className="twb-host-summary">
              <div className="twb-hs-avatar">{hostName.charAt(0)}</div>
              <div className="twb-hs-info">
                <div className="twb-hs-name">
                  <strong>{hostName}</strong>
                  <span className="twb-v-tag">
                    <ShieldCheck size={11} /> Verified Host
                  </span>
                </div>
                <div className="twb-hs-addr">
                  <MapPin size={11} /> {address}, {area}, {city}
                </div>
                <div className="twb-hs-rate">
                  Rate: <strong>₹{rateAmount}/hr</strong> · Socket: {socketType}
                </div>
              </div>
            </div>

            <div className="twb-fields">
              <div className="twb-field">
                <label>Your Name <span className="tw-req">*</span></label>
                <input
                  type="text"
                  className="twb-input"
                  placeholder="e.g. Tanmay Roy"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  required
                />
              </div>

              <div className="twb-field">
                <label>Mobile Number (For Host Coordination) <span className="tw-req">*</span></label>
                <div className="twb-phone-wrap">
                  <span className="twb-prefix">+91</span>
                  <input
                    type="tel"
                    className="twb-input"
                    placeholder="10-digit mobile number"
                    value={riderPhone}
                    onChange={(e) => setRiderPhone(e.target.value)}
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="twb-field">
                <label>Your EV Scooter Model</label>
                <input
                  type="text"
                  className="twb-input"
                  placeholder="e.g. Ather 450X, Ola S1 Pro, TVS iQube"
                  value={scooterModel}
                  onChange={(e) => setScooterModel(e.target.value)}
                  required
                />
              </div>

              <div className="twb-field">
                <label>Charging Duration Needed</label>
                <div className="twb-dur-grid">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      className={`twb-dur-btn ${duration.hours === opt.hours ? 'twb-dur-btn--active' : ''}`}
                      onClick={() => setDuration(opt)}
                    >
                      <Clock size={12} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="twb-field">
                <label>Estimated Arrival</label>
                <select
                  className="twb-select"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                >
                  <option value="Immediately (Within 15 mins)">Immediately (Within 15 mins)</option>
                  <option value="In 30 minutes">In 30 minutes</option>
                  <option value="In 1 hour">In 1 hour</option>
                  <option value="Later this evening">Later this evening</option>
                </select>
              </div>

              <div className="twb-cost-breakdown">
                <div className="twb-cb-row">
                  <span>Rental Rate</span>
                  <span>₹{rateAmount} / hour</span>
                </div>
                <div className="twb-cb-row">
                  <span>Selected Duration</span>
                  <span>{duration.hours} hr</span>
                </div>
                <div className="twb-cb-row twb-cb-total">
                  <span>Total Amount Payable to Host</span>
                  <span>₹{totalCost}</span>
                </div>
                <div className="twb-cb-note">
                  Pay directly to host via UPI (GPay/PhonePe/Paytm) or cash upon arrival.
                </div>
              </div>
            </div>

            <div className="twb-footer">
              <button type="button" className="btn btn-ghost" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary twb-submit">
                <Zap size={14} />
                <span>Confirm & Request Slot (₹{totalCost})</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
