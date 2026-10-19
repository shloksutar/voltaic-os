import { useState, useMemo } from 'react';
import {
  X,
  Zap,
  Clock,
  Calendar,
  Car,
  CheckCircle,
  MapPin,
  ExternalLink,
  QrCode,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { bookingsApi } from '../../api/client';
import './ReservationModal.css';

export default function ReservationModal({ station, isOpen, onClose, onBookingComplete }) {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const toast = useToast();

  const [selectedBay, setSelectedBay] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(
    new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [duration, setDuration] = useState(45);
  const [vehicleNumber, setVehicleNumber] = useState(user?.licensePlate || '');
  const [vehicleModel, setVehicleModel] = useState(user?.vehicleModel || '');
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Available connectors on the station
  const connectors = useMemo(() => {
    if (!station) return [];
    if (Array.isArray(station.connectors) && station.connectors.length > 0) {
      return station.connectors;
    }
    // Fallback generate from station ports
    return Array.from({ length: station.ports || 4 }, (_, i) => ({
      bay: i + 1,
      type: i % 2 === 0 ? `CCS2 (${station.speed || 60} kW DC)` : 'Type 2 AC (22 kW)',
      status: i < (station.available || 1) ? 'available' : 'busy',
    }));
  }, [station]);

  // Set default available bay
  useState(() => {
    const firstAvail = connectors.find((c) => c.status === 'available');
    if (firstAvail) setSelectedBay(firstAvail);
  });

  if (!isOpen || !station) return null;

  // Price calculations
  const tariff = station.tariffPerKwh || 19.5;
  const resFee = station.reservationFee || 50;
  const estimatedKwh = Math.round((station.speed * (duration / 60)) * 0.7);
  const energyCost = Math.round(estimatedKwh * tariff);
  const totalCost = energyCost + resFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBay) {
      setError('Please select an available charging bay');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        stationId: station.id,
        bayNumber: selectedBay.bay,
        portType: selectedBay.type,
        date,
        startTime,
        durationMinutes: duration,
        vehicleNumber,
        vehicleModel,
        userId: user?.id || 'guest_' + Date.now(),
        userName: user?.name || guestName || 'EV Driver',
        userEmail: user?.email || '',
        userPhone: user?.phone || guestPhone || '',
      };

      const res = await bookingsApi.create(payload);
      setConfirmedBooking(res.booking);
      toast.success('Charging slot reserved successfully!');
      if (onBookingComplete) {
        onBookingComplete(res.booking);
      }
    } catch (err) {
      const msg = err.message || 'Failed to complete reservation';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!confirmedBooking) return;
    try {
      setLoading(true);
      await bookingsApi.cancel(confirmedBooking.id);
      setConfirmedBooking(null);
      toast.info('Reservation has been cancelled.');
      onClose();
    } catch (err) {
      const msg = err.message || 'Failed to cancel reservation';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="res-modal-overlay" onClick={onClose}>
      <div className="res-modal-card card" onClick={(e) => e.stopPropagation()}>
        <button className="res-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {!confirmedBooking ? (
          <div>
            {/* Header */}
            <div className="res-modal-header">
              <div className="res-badge">⚡ Real-Time Slot Reservation</div>
              <h2 className="res-title font-display">{station.name}</h2>
              <div className="res-location">
                <MapPin size={13} />
                <span>{station.address || `${station.city} · ${station.operator}`}</span>
              </div>
              <div className="res-tags">
                <span className="res-chip">{station.operator}</span>
                <span className="res-chip">{station.speed} kW Peak</span>
                <span className="res-chip">₹{tariff}/kWh</span>
                <span className="res-chip chip-avail">
                  {station.available} of {station.ports} bays available
                </span>
              </div>
            </div>

            {/* Auth notice banner if guest */}
            {!isAuthenticated && (
              <div className="res-guest-banner">
                <div>
                  <strong>Fast Pass:</strong> Sign in with your Email or Phone Number for instant 1-tap bookings.
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost res-guest-auth-btn"
                  onClick={() => openAuthModal()}
                >
                  Sign In / Register
                </button>
              </div>
            )}

            {error && (
              <div className="res-error-banner">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="res-form">
              {/* 1. Bay Selection */}
              <div className="res-section">
                <label className="res-section-label">1. Select Charging Bay</label>
                <div className="res-bays-grid">
                  {connectors.map((c) => {
                    const isSelected = selectedBay?.bay === c.bay;
                    const isAvail = c.status === 'available';
                    return (
                      <button
                        type="button"
                        key={c.bay}
                        disabled={!isAvail}
                        className={`res-bay-card ${isSelected ? 'res-bay--selected' : ''} ${
                          !isAvail ? 'res-bay--disabled' : ''
                        }`}
                        onClick={() => setSelectedBay(c)}
                      >
                        <div className="res-bay-top">
                          <span className="res-bay-num">Bay #{c.bay}</span>
                          <span className={`dot dot-${c.status}`} />
                        </div>
                        <div className="res-bay-type">{c.type}</div>
                        <div className="res-bay-status">
                          {isAvail ? 'Available' : 'Occupied'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Timing */}
              <div className="res-section">
                <label className="res-section-label">2. Booking Schedule</label>
                <div className="res-timing-grid">
                  <div className="res-field">
                    <label>Date</label>
                    <div className="res-input-wrap">
                      <Calendar size={14} />
                      <input
                        type="date"
                        value={date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="res-field">
                    <label>Start Time</label>
                    <div className="res-input-wrap">
                      <Clock size={14} />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Duration options */}
                <div className="res-duration-wrap">
                  <span className="res-duration-label">Charging Duration:</span>
                  <div className="res-duration-chips">
                    {[30, 45, 60, 90].map((mins) => (
                      <button
                        type="button"
                        key={mins}
                        className={`res-duration-btn ${
                          duration === mins ? 'res-duration-btn--active' : ''
                        }`}
                        onClick={() => setDuration(mins)}
                      >
                        {mins} mins
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Vehicle Info */}
              <div className="res-section">
                <label className="res-section-label">3. Vehicle Identification</label>
                <div className="res-timing-grid">
                  <div className="res-field">
                    <label>EV Model</label>
                    <div className="res-input-wrap">
                      <Car size={14} />
                      <input
                        type="text"
                        placeholder="EV make and model"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="res-field">
                    <label>License Plate</label>
                    <div className="res-input-wrap">
                      <input
                        type="text"
                        placeholder="e.g. MH 02 EV 9912"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="res-timing-grid" style={{ marginTop: '10px' }}>
                    <div className="res-field">
                      <label>Driver Name</label>
                      <input
                        type="text"
                        placeholder="Your full name"
                        className="res-plain-input"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="res-field">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        className="res-plain-input"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Fare breakdown */}
              <div className="res-fare-card">
                <div className="res-fare-row">
                  <span>Estimated Delivery (~{estimatedKwh} kWh)</span>
                  <span>₹{energyCost}</span>
                </div>
                <div className="res-fare-row">
                  <span>Slot Reservation Hold Fee</span>
                  <span>₹{resFee}</span>
                </div>
                <div className="res-fare-divider" />
                <div className="res-fare-total">
                  <span>Total Estimated Cost</span>
                  <span className="res-fare-price">₹{totalCost}</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary res-submit-btn"
                disabled={loading || !selectedBay}
              >
                <Zap size={16} />
                {loading ? 'Confirming Reservation...' : 'Confirm Slot Reservation'}
              </button>
            </form>
          </div>
        ) : (
          /* CONFIRMED DIGITAL PASS */
          <div className="res-success-view">
            <div className="res-success-icon">
              <CheckCircle size={36} color="#059669" />
            </div>
            <h2 className="res-success-title font-display">Slot Reserved Successfully!</h2>
            <p className="res-success-sub">
              Your charging bay is locked and guaranteed. Hardware will activate when you scan or arrive.
            </p>

            <div className="res-pass-card">
              <div className="res-pass-header">
                <div>
                  <div className="res-pass-code-label">Booking Reference</div>
                  <div className="res-pass-code font-display">{confirmedBooking.id}</div>
                </div>
                <div className="res-pass-qr">
                  <QrCode size={52} color="#3730A3" />
                </div>
              </div>

              <div className="res-pass-details">
                <div className="res-pass-item">
                  <span className="rpi-label">Station</span>
                  <span className="rpi-val">{confirmedBooking.stationName}</span>
                </div>
                <div className="res-pass-item">
                  <span className="rpi-label">Allocated Bay</span>
                  <span className="rpi-val rpi-bay">
                    Bay #{confirmedBooking.bayNumber} · {confirmedBooking.portType}
                  </span>
                </div>
                <div className="res-pass-item">
                  <span className="rpi-label">Date & Time</span>
                  <span className="rpi-val">
                    {confirmedBooking.date} at {confirmedBooking.startTime} ({confirmedBooking.durationMinutes} mins)
                  </span>
                </div>
                <div className="res-pass-item">
                  <span className="rpi-label">Vehicle</span>
                  <span className="rpi-val">
                    {confirmedBooking.vehicleNumber} ({confirmedBooking.vehicleModel})
                  </span>
                </div>
                <div className="res-pass-item">
                  <span className="rpi-label">Estimated Bill</span>
                  <span className="rpi-val">₹{confirmedBooking.estimatedCost}</span>
                </div>
              </div>
            </div>

            <div className="res-success-actions">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary res-nav-btn"
              >
                <MapPin size={15} />
                Get Driving Directions <ExternalLink size={13} />
              </a>
              <button
                type="button"
                className="btn btn-ghost res-close-done-btn"
                onClick={onClose}
              >
                Done
              </button>
            </div>

            <button
              type="button"
              className="res-cancel-btn"
              onClick={handleCancelReservation}
              disabled={loading}
            >
              Cancel this reservation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
