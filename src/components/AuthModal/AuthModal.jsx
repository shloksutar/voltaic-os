import { useState } from 'react';
import { X, Mail, Phone, Lock, User, Car, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
    sendPhoneOtp,
    verifyPhoneOtp,
  } = useAuth();

  const [activeTab, setActiveTab] = useState('google'); // 'google' | 'email' | 'phone'
  const [isRegister, setIsRegister] = useState(true); // for email mode
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [vehicleModel, setVehicleModel] = useState('Tata Nexon EV Max');
  const [licensePlate, setLicensePlate] = useState('MH 02 EV 9912');

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [testOtpHint, setTestOtpHint] = useState('');

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async (account) => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle({
        email: account.email,
        name: account.name,
        avatar: account.avatar,
        googleId: `google_${Date.now()}`,
      });
    } catch (err) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await registerWithEmail({
          email,
          password,
          name,
          vehicleModel,
          licensePlate,
        });
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await sendPhoneOtp(phone);
      setOtpSent(true);
      setTestOtpHint(res.testOtp || '654321');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyPhoneOtp({
        phone,
        otp,
        name: name || `Driver (${phone.slice(-4)})`,
        vehicleModel,
        licensePlate,
      });
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={closeAuthModal}>
      <div className="auth-modal-card card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={closeAuthModal}>
          <X size={18} />
        </button>

        <div className="auth-modal-header">
          <div className="auth-brand-badge">⚡ VoltaicOS Account</div>
          <h2 className="auth-title font-display">
            {activeTab === 'google'
              ? 'Sign In with Google'
              : activeTab === 'phone'
              ? 'Phone Verification'
              : isRegister
              ? 'Create VoltaicOS Account'
              : 'Welcome Back'}
          </h2>
          <p className="auth-sub">
            Reserve EV charging slots, manage live reservations, and access smart routing.
          </p>
        </div>

        {/* Method selector tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'google' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('google');
              setError('');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" className="google-icon">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google
          </button>
          <button
            className={`auth-tab ${activeTab === 'email' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('email');
              setError('');
            }}
          >
            <Mail size={15} />
            Email
          </button>
          <button
            className={`auth-tab ${activeTab === 'phone' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('phone');
              setError('');
            }}
          >
            <Phone size={15} />
            Phone
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. GOOGLE SIGN IN TAB */}
        {activeTab === 'google' && (
          <div className="auth-tab-content">
            <p className="auth-hint-text">
              Sign in with your Google Account to instantly sync reservations and billing:
            </p>

            <button
              type="button"
              className="google-auth-btn"
              onClick={() => {
                const targetEmail = email || 'driver@gmail.com';
                const targetName = name || 'EV Driver';
                handleGoogleSignIn({
                  name: targetName,
                  email: targetEmail,
                  avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetEmail)}`,
                });
              }}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? 'Connecting with Google...' : 'Sign in with Google'}</span>
            </button>

            <div className="auth-divider">
              <span>or enter custom Google Account</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) {
                  const derivedName = name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  handleGoogleSignIn({
                    name: derivedName,
                    email,
                    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      email
                    )}`,
                  });
                }
              }}
            >
              <div className="auth-field">
                <label>Google Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={15} />
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary auth-submit-btn"
                disabled={loading || !email}
              >
                {loading ? 'Authenticating...' : 'Continue with Google'}
              </button>
            </form>
          </div>
        )}

        {/* 2. EMAIL SIGN IN / REGISTER TAB */}
        {activeTab === 'email' && (
          <form className="auth-tab-content" onSubmit={handleEmailSubmit}>
            <div className="auth-sub-toggle">
              <button
                type="button"
                className={`auth-sub-btn ${isRegister ? 'auth-sub-btn--active' : ''}`}
                onClick={() => setIsRegister(true)}
              >
                Create Account
              </button>
              <button
                type="button"
                className={`auth-sub-btn ${!isRegister ? 'auth-sub-btn--active' : ''}`}
                onClick={() => setIsRegister(false)}
              >
                Sign In
              </button>
            </div>

            {isRegister && (
              <div className="auth-field">
                <label>Full Name</label>
                <div className="auth-input-wrap">
                  <User size={15} />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={15} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <Lock size={15} />
                <input
                  type="password"
                  placeholder="Enter password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {isRegister && (
              <div className="auth-row-2">
                <div className="auth-field">
                  <label>EV Model</label>
                  <div className="auth-input-wrap">
                    <Car size={15} />
                    <input
                      type="text"
                      placeholder="e.g. Tata Nexon EV"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label>License Plate</label>
                  <div className="auth-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g. MH 02 EV 9912"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading
                ? 'Processing...'
                : isRegister
                ? 'Create EV Driver Account'
                : 'Sign In to Account'}
            </button>
          </form>
        )}

        {/* 3. PHONE NUMBER TAB */}
        {activeTab === 'phone' && (
          <div className="auth-tab-content">
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div className="auth-field">
                  <label>Mobile Number</label>
                  <div className="auth-phone-input">
                    <span className="auth-country-code">+91 (India)</span>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label>Your Name (optional)</label>
                  <div className="auth-input-wrap">
                    <User size={15} />
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary auth-submit-btn"
                  disabled={loading || !phone}
                >
                  {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div className="otp-sent-banner">
                  <CheckCircle2 size={16} />
                  <span>
                    SMS code sent to <strong>+91 {phone}</strong>
                  </span>
                </div>

                {testOtpHint && (
                  <div className="otp-test-chip" onClick={() => setOtp(testOtpHint)}>
                    ⚡ Quick Test Code: <strong>{testOtpHint}</strong> (Click to auto-fill)
                  </div>
                )}

                <div className="auth-field">
                  <label>Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    className="auth-otp-input"
                    maxLength={6}
                    placeholder="654321"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-row-2">
                  <div className="auth-field">
                    <label>EV Model</label>
                    <input
                      type="text"
                      placeholder="e.g. MG ZS EV"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                    />
                  </div>
                  <div className="auth-field">
                    <label>Vehicle Plate</label>
                    <input
                      type="text"
                      placeholder="DL 01 EV 4421"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary auth-submit-btn"
                  disabled={loading || !otp}
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm auth-resend-btn"
                  onClick={() => setOtpSent(false)}
                >
                  Change phone number
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
