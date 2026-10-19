import { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import {
  saveTwoWheelerCharger,
  TWO_WHEELER_SOCKET_TYPES,
  POPULAR_EV_SCOOTERS,
} from '../../data/twoWheelerChargers';
import { CITIES } from '../../data/chargers';
import './TwoWheelerRentModal.css';

const ID_TYPES = [
  'Aadhaar Card (Verified)',
  'Driving Licence (Verified)',
  'Voter ID (Verified)',
  'PAN Card (Verified)',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TwoWheelerRentModal({ isOpen, onClose, onChargerPosted }) {
  const [hostName, setHostName] = useState('');
  const [hostPhone, setHostPhone] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [idType, setIdType] = useState('Aadhaar Card (Verified)');
  const [idNumber, setIdNumber] = useState('');

  const [city, setCity] = useState('Bengaluru');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');

  const [socketType, setSocketType] = useState(TWO_WHEELER_SOCKET_TYPES[0]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [rateAmount, setRateAmount] = useState('');
  const [isAvailableNow, setIsAvailableNow] = useState(false);
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [notes, setNotes] = useState('');
  const [coveredParking, setCoveredParking] = useState(false);

  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdCharger, setCreatedCharger] = useState(null);

  if (!isOpen) return null;

  const toggleVehicle = (v) => {
    setSelectedVehicles((prev) =>
      prev.includes(v) ? prev.filter((item) => item !== v) : [...prev, v]
    );
  };

  const toggleDay = (d) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!hostName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!hostPhone.trim() || hostPhone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!area.trim()) {
      setError('Please enter your area / neighborhood (e.g., Indiranagar, Bandra West).');
      return;
    }
    if (!address.trim()) {
      setError('Please enter the charger address.');
      return;
    }
    if (!idNumber.trim()) {
      setError('Please enter your Government ID number for rider verification.');
      return;
    }
    if (selectedVehicles.length === 0) {
      setError('Please select at least one compatible 2-wheeler scooter.');
      return;
    }
    if (!rateAmount || isNaN(Number(rateAmount)) || Number(rateAmount) < 0) {
      setError('Please enter a valid hourly rate (or 0 for free community sharing).');
      return;
    }

    const cityCoords = {
      Mumbai: [19.076, 72.8777],
      Delhi: [28.6139, 77.209],
      Bengaluru: [12.9716, 77.5946],
      Hyderabad: [17.385, 78.4867],
      Pune: [18.5204, 73.8567],
      Chennai: [13.0827, 80.2707],
    };

    const baseCoord = cityCoords[city] || [12.9716, 77.5946];
    const jitterLat = (Math.random() - 0.5) * 0.04;
    const jitterLng = (Math.random() - 0.5) * 0.04;

    const amenitiesList = ['Ground Floor Access'];
    if (coveredParking) amenitiesList.push('Covered Parking');
    amenitiesList.push('CCTV Monitored');

    const newListing = {
      hostName: hostName.trim(),
      hostPhone: hostPhone.replace(/\D/g, '').slice(-10),
      hostEmail: hostEmail.trim() || `${hostName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      idType: idType,
      idNumberMasked: `${idNumber.slice(0, 2)}****${idNumber.slice(-3)}`,
      title: `${area} — 2W ${socketType.includes('Ather') ? 'Ather Dot' : socketType.includes('Ola') ? 'Ola Companion' : '16A Fast Socket'}`,
      city: city,
      area: area.trim(),
      address: address.trim(),
      landmark: landmark.trim() || 'Easily accessible from main gate',
      lat: Number((baseCoord[0] + jitterLat).toFixed(4)),
      lng: Number((baseCoord[1] + jitterLng).toFixed(4)),
      socketType: socketType,
      powerOutput: '3.3 kW AC',
      supportedVehicles: selectedVehicles,
      tariffMode: 'hourly',
      rateDisplay: Number(rateAmount) === 0 ? 'Free (Community)' : `₹${rateAmount}/hr`,
      rateAmount: Number(rateAmount),
      availabilityStatus: isAvailableNow ? 'available_now' : 'scheduled',
      availableTiming:
        timeFrom && timeTo
          ? `${timeFrom} – ${timeTo}${selectedDays.length > 0 ? ` (${selectedDays.join(', ')})` : ''}`
          : selectedDays.length > 0
          ? `Available (${selectedDays.join(', ')})`
          : 'Available on Request / Booking',
      days: selectedDays,
      amenities: amenitiesList,
      notes: notes.trim() || 'Two-wheeler charging spot ready. Please call or WhatsApp before reaching.',
      coveredParking,
    };

    const saved = saveTwoWheelerCharger(newListing);
    if (saved) {
      setCreatedCharger(saved);
      setIsSuccess(true);
      if (onChargerPosted) {
        onChargerPosted(saved);
      }
    } else {
      setError('Failed to save charger. Please try again.');
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setCreatedCharger(null);
    onClose();
  };

  return (
    <div className="tw-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="tw-modal-card card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="tw-modal-header">
          <div className="tw-modal-header-text">
            <div className="tw-modal-badge">
              <span className="tw-scooter-icon">🛵</span>
              <span>2-Wheeler Community Charger Host</span>
            </div>
            <h2 className="tw-modal-title font-display">
              {isSuccess ? 'Charger Listed Successfully!' : 'Apply to Rent Your 2W EV Charger'}
            </h2>
            <p className="tw-modal-sub">
              {isSuccess
                ? 'Your charger is now live on VoltaicOS! Nearby 2-wheeler riders in need can discover and contact you.'
                : 'Help fellow electric scooter riders stranded with low battery and earn ₹20–₹40 per hour.'}
            </p>
          </div>
          <button className="tw-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Success View */}
        {isSuccess && createdCharger ? (
          <div className="tw-success-view">
            <div className="tw-success-icon-wrap">
              <CheckCircle2 size={48} className="tw-success-check" />
            </div>
            <h3 className="tw-success-heading">Your 2W Charger is Live!</h3>
            <p className="tw-success-desc">
              Riders searching in <strong>{createdCharger.area}, {createdCharger.city}</strong> can now see your listing, verified credentials, and contact you directly for charging sessions.
            </p>

            <div className="tw-success-details-card">
              <div className="tw-sd-row">
                <span className="tw-sd-label">Host Name:</span>
                <span className="tw-sd-val">{createdCharger.hostName} (Verified)</span>
              </div>
              <div className="tw-sd-row">
                <span className="tw-sd-label">Phone / WhatsApp:</span>
                <span className="tw-sd-val">+91 {createdCharger.hostPhone}</span>
              </div>
              <div className="tw-sd-row">
                <span className="tw-sd-label">Socket Type:</span>
                <span className="tw-sd-val">{createdCharger.socketType}</span>
              </div>
              <div className="tw-sd-row">
                <span className="tw-sd-label">Rental Rate:</span>
                <span className="tw-sd-val font-semibold" style={{ color: 'var(--color-primary)' }}>
                  {createdCharger.rateDisplay}
                </span>
              </div>
              <div className="tw-sd-row">
                <span className="tw-sd-label">Availability:</span>
                <span className="tw-sd-val">
                  <span className="tw-avail-pill">● Available Now</span>
                </span>
              </div>
            </div>

            <div className="tw-success-actions">
              <button className="btn btn-primary" onClick={handleReset}>
                Done & View on Chargers List
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form className="tw-form" onSubmit={handleSubmit}>
            {error && (
              <div className="tw-form-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="tw-form-scroll">
              {/* Section 1: Driver & Host Details */}
              <div className="tw-section">
                <div className="tw-section-title">
                  <User size={15} className="text-primary" />
                  <span>1. Driver & Host Contact Details</span>
                </div>
                <div className="tw-grid-2">
                  <div className="tw-field">
                    <label>Full Name <span className="tw-req">*</span></label>
                    <div className="tw-input-wrap">
                      <User size={14} />
                      <input
                        type="text"
                        placeholder="e.g., Rohit Sharma"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="tw-field">
                    <label>Mobile / WhatsApp <span className="tw-req">*</span></label>
                    <div className="tw-input-wrap">
                      <span className="tw-phone-prefix">+91</span>
                      <Phone size={14} />
                      <input
                        type="tel"
                        placeholder="10-digit number"
                        value={hostPhone}
                        onChange={(e) => setHostPhone(e.target.value)}
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="tw-grid-2" style={{ marginTop: '10px' }}>
                  <div className="tw-field">
                    <label>Email Address</label>
                    <div className="tw-input-wrap">
                      <Mail size={14} />
                      <input
                        type="email"
                        placeholder="e.g., rohit@gmail.com"
                        value={hostEmail}
                        onChange={(e) => setHostEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="tw-field">
                    <label>Government ID Verification <span className="tw-req">*</span></label>
                    <div className="tw-input-wrap">
                      <ShieldCheck size={14} />
                      <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                        {ID_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="tw-field" style={{ marginTop: '10px' }}>
                  <label>ID Number (Encrypted & Masked) <span className="tw-req">*</span></label>
                  <div className="tw-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g., 8892-4412-1092"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Location & Address */}
              <div className="tw-section">
                <div className="tw-section-title">
                  <MapPin size={15} className="text-primary" />
                  <span>2. Charger Location (Where the scooter will be plugged in)</span>
                </div>
                <div className="tw-grid-2">
                  <div className="tw-field">
                    <label>City <span className="tw-req">*</span></label>
                    <div className="tw-input-wrap">
                      <select value={city} onChange={(e) => setCity(e.target.value)}>
                        {CITIES.filter((c) => c !== 'All Cities').map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="tw-field">
                    <label>Area / Locality <span className="tw-req">*</span></label>
                    <div className="tw-input-wrap">
                      <input
                        type="text"
                        placeholder="e.g., Koramangala 4th Block"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="tw-field" style={{ marginTop: '10px' }}>
                  <label>Address <span className="tw-req">*</span></label>
                  <div className="tw-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g., House #24, 7th Cross, Near Sony World Signal"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="tw-field" style={{ marginTop: '10px' }}>
                  <label>Helpful Landmark for 2W Riders</label>
                  <div className="tw-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g., Next to Axis Bank ATM, ground floor stilt parking"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: 2-Wheeler Charger Specifications */}
              <div className="tw-section">
                <div className="tw-section-title">
                  <Zap size={15} className="text-primary" />
                  <span>3. 2-Wheeler Charger Type & Compatibility</span>
                </div>
                <div className="tw-field">
                  <label>Socket / Charger Type <span className="tw-req">*</span></label>
                  <div className="tw-input-wrap">
                    <select value={socketType} onChange={(e) => setSocketType(e.target.value)}>
                      {TWO_WHEELER_SOCKET_TYPES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="tw-field" style={{ marginTop: '12px' }}>
                  <label>Supported Electric 2-Wheelers (Select all that can plug in) <span className="tw-req">*</span></label>
                  <div className="tw-chips-wrap">
                    {POPULAR_EV_SCOOTERS.map((v) => {
                      const isSel = selectedVehicles.includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          className={`tw-chip ${isSel ? 'tw-chip--active' : ''}`}
                          onClick={() => toggleVehicle(v)}
                        >
                          {isSel ? '✓ ' : '+ '}
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 4: Availability & Pricing */}
              <div className="tw-section">
                <div className="tw-section-title">
                  <Clock size={15} className="text-primary" />
                  <span>4. Availability Schedule & Rental Rate</span>
                </div>

                <div className="tw-avail-now-row">
                  <label className="tw-toggle-label">
                    <input
                      type="checkbox"
                      checked={isAvailableNow}
                      onChange={(e) => setIsAvailableNow(e.target.checked)}
                    />
                    <span className="tw-toggle-slider" />
                    <span className="tw-toggle-text">
                      <strong>Charger Available Right Now</strong> (Shows live &ldquo;Available Now&rdquo; green badge)
                    </span>
                  </label>
                </div>

                <div className="tw-grid-2" style={{ marginTop: '12px' }}>
                  <div className="tw-field">
                    <label>Available From</label>
                    <input
                      type="time"
                      className="tw-time-input"
                      value={timeFrom}
                      onChange={(e) => setTimeFrom(e.target.value)}
                    />
                  </div>
                  <div className="tw-field">
                    <label>Available Until</label>
                    <input
                      type="time"
                      className="tw-time-input"
                      value={timeTo}
                      onChange={(e) => setTimeTo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="tw-field" style={{ marginTop: '12px' }}>
                  <label>Available Days</label>
                  <div className="tw-days-row">
                    {DAYS.map((d) => {
                      const isSel = selectedDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`tw-day-btn ${isSel ? 'tw-day-btn--active' : ''}`}
                          onClick={() => toggleDay(d)}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="tw-grid-2" style={{ marginTop: '12px' }}>
                  <div className="tw-field">
                    <label>Hourly Rental Price (₹/hour) <span className="tw-req">*</span></label>
                    <div className="tw-input-wrap">
                      <span className="tw-phone-prefix">₹</span>
                      <input
                        type="number"
                        min="0"
                        max="150"
                        value={rateAmount}
                        onChange={(e) => setRateAmount(e.target.value)}
                        placeholder="e.g., 25"
                        required
                      />
                    </div>
                    <span className="tw-hint">Recommended: ₹20–₹35/hr to cover electricity + profit</span>
                  </div>

                  <div className="tw-field">
                    <label className="tw-checkbox-field" style={{ marginTop: '24px' }}>
                      <input
                        type="checkbox"
                        checked={coveredParking}
                        onChange={(e) => setCoveredParking(e.target.checked)}
                      />
                      <span>Covered / Shaded Scooter Parking</span>
                    </label>
                  </div>
                </div>

                <div className="tw-field" style={{ marginTop: '12px' }}>
                  <label>Access Instructions & Notes for Riders</label>
                  <textarea
                    className="tw-textarea"
                    rows={2}
                    placeholder="e.g., Gate is always unlocked, switchboard is on the left pillar, water dispenser available."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="tw-modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary tw-submit-btn">
                <Zap size={14} />
                <span>Post 2W Charger Availability</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
