import { useState } from 'react';
import { X, AlertTriangle, Car, WifiOff, Clock, CheckCircle2 } from 'lucide-react';
import { stationsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import './ReportIssueModal.css';

export default function ReportIssueModal({ station, isOpen, onClose, onReportSuccess }) {
  const { user } = useAuth();
  const [type, setType] = useState('ice'); // 'ice' | 'offline' | 'queue'
  const [bayNumber, setBayNumber] = useState(1);
  const [msg, setMsg] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !station) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let messageBody = msg;
    if (type === 'ice') {
      messageBody = `ICE vehicle (${licensePlate || 'unregistered'}) parked in EV bay #${bayNumber}. Automated camera validation logged. ${msg}`;
    } else if (type === 'offline') {
      messageBody = `Hardware fault reported at bay #${bayNumber}. ${msg || 'Charging session failed to initiate.'}`;
    } else if (type === 'queue') {
      messageBody = `Queue delay report: ${msg || 'Station at capacity with waiting line.'}`;
    }

    try {
      await stationsApi.reportIssue(station.id, {
        type,
        bayNumber,
        msg: messageBody,
        reporterName: user?.name || 'EV Driver',
      });
      setSuccess(true);
      if (onReportSuccess) onReportSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rim-overlay" onClick={onClose}>
      <div className="rim-card card" onClick={(e) => e.stopPropagation()}>
        <button className="rim-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="rim-header">
          <div className="rim-badge">🚨 Live Incident Dispatch</div>
          <h2 className="rim-title font-display">Report Station Issue</h2>
          <p className="rim-sub">{station.name}</p>
        </div>

        {success ? (
          <div className="rim-success">
            <CheckCircle2 size={42} color="#059669" />
            <div className="rim-success-title">Incident Dispatched!</div>
            <p className="rim-success-desc">
              Your report has been logged to the network alerts feed and dispatched to CPO operations.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rim-form">
            {error && <div className="rim-error">{error}</div>}

            <div className="rim-type-grid">
              {[
                { id: 'ice', label: 'ICE Blocking Bay', icon: Car },
                { id: 'offline', label: 'Hardware Fault', icon: WifiOff },
                { id: 'queue', label: 'Long Queue', icon: Clock },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`rim-type-btn ${type === item.id ? 'rim-type-btn--active' : ''}`}
                  onClick={() => setType(item.id)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="rim-field">
              <label>Affected Bay Number</label>
              <select
                value={bayNumber}
                onChange={(e) => setBayNumber(Number(e.target.value))}
                className="rim-select"
              >
                {Array.from({ length: station.ports || 6 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Bay #{i + 1}
                  </option>
                ))}
              </select>
            </div>

            {type === 'ice' && (
              <div className="rim-field">
                <label>Blocking Vehicle License Plate (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MH 04 AB 4321"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  className="rim-input"
                />
              </div>
            )}

            <div className="rim-field">
              <label>Incident Details</label>
              <textarea
                placeholder="Describe what happened (e.g. connector broken, screen unresponsive, car unattended)..."
                rows={3}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="rim-textarea"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary rim-submit-btn" disabled={loading}>
              <AlertTriangle size={15} />
              {loading ? 'Submitting report...' : 'Submit Incident Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
