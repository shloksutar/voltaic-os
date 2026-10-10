import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, QrCode, Ban, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { bookingsApi } from '../../api/client';
import './UserBookingsModal.css';

export default function UserBookingsModal({ isOpen, onClose, onRefreshStations }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getAll(user?.id);
      setBookings(res.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this slot reservation?')) return;
    setCancellingId(bookingId);
    try {
      await bookingsApi.cancel(bookingId);
      await fetchBookings();
      if (onRefreshStations) onRefreshStations();
    } catch (err) {
      alert(err.message || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'active');
  const pastBookings = bookings.filter((b) => b.status !== 'active');

  return (
    <div className="ubm-overlay" onClick={onClose}>
      <div className="ubm-card card" onClick={(e) => e.stopPropagation()}>
        <button className="ubm-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="ubm-header">
          <div className="ubm-badge">⚡ Driver Dashboard</div>
          <h2 className="ubm-title font-display">My Slot Reservations</h2>
          <p className="ubm-sub">
            {bookings.length} reservations linked to {user?.name || user?.email || 'your device'}
          </p>
        </div>

        {loading ? (
          <div className="ubm-loading">
            <RefreshCw size={24} className="spin-icon" />
            <span>Loading reservations...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="ubm-empty">
            <Calendar size={36} strokeWidth={1.2} />
            <div>You have no reservations yet.</div>
            <p>Select any charging station from the Live Map or Chargers list to book a slot.</p>
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              Browse Stations
            </button>
          </div>
        ) : (
          <div className="ubm-content">
            {/* Active Bookings */}
            {activeBookings.length > 0 && (
              <div className="ubm-section">
                <div className="ubm-section-title">
                  <span className="dot dot-available dot-pulse" /> Active Passes ({activeBookings.length})
                </div>
                <div className="ubm-list">
                  {activeBookings.map((b) => (
                    <div key={b.id} className="ubm-item ubm-item--active">
                      <div className="ubm-item-top">
                        <div>
                          <div className="ubm-item-id">{b.id}</div>
                          <div className="ubm-item-station">{b.stationName}</div>
                        </div>
                        <span className="badge badge-available">
                          <CheckCircle size={12} /> Confirmed Slot
                        </span>
                      </div>

                      <div className="ubm-item-meta">
                        <div className="ubm-meta-chip">
                          <Clock size={12} /> {b.date} · {b.startTime} ({b.durationMinutes}m)
                        </div>
                        <div className="ubm-meta-chip ubm-bay-chip">
                          Bay #{b.bayNumber} ({b.portType})
                        </div>
                        <div className="ubm-meta-chip">
                          {b.vehicleNumber} ({b.vehicleModel})
                        </div>
                      </div>

                      <div className="ubm-item-actions">
                        {b.address && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              b.stationName + ' ' + b.city
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-sm"
                          >
                            <MapPin size={13} /> Maps <ExternalLink size={11} />
                          </a>
                        )}
                        <button
                          className="btn btn-sm ubm-cancel-btn"
                          disabled={cancellingId === b.id}
                          onClick={() => handleCancel(b.id)}
                        >
                          <Ban size={13} /> {cancellingId === b.id ? 'Cancelling...' : 'Cancel Reservation'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past / Cancelled Bookings */}
            {pastBookings.length > 0 && (
              <div className="ubm-section">
                <div className="ubm-section-title">Past / Cancelled History ({pastBookings.length})</div>
                <div className="ubm-list">
                  {pastBookings.map((b) => (
                    <div key={b.id} className="ubm-item ubm-item--past">
                      <div className="ubm-item-top">
                        <div>
                          <div className="ubm-item-id">{b.id}</div>
                          <div className="ubm-item-station">{b.stationName}</div>
                        </div>
                        <span className="badge badge-offline">
                          {b.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                        </span>
                      </div>
                      <div className="ubm-item-meta">
                        <div className="ubm-meta-chip">
                          {b.date} at {b.startTime} · Bay #{b.bayNumber}
                        </div>
                        <div className="ubm-meta-chip">₹{b.estimatedCost}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
