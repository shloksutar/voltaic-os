import { useState } from 'react';
import { X, Mail, Phone, Lock, User, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import './AuthModal.css';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    loginWithEmail,
    registerWithEmail,
    sendPhoneOtp,
    verifyPhoneOtp,
    handleAuthSuccess,
  } = useAuth();

  const [activeTab, setActiveTab] = useState('email'); // 'email' | 'phone'
  const [isRegister, setIsRegister] = useState(true); // for email mode
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Email OTP state (Supabase Auth flow)
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [testOtpHint, setTestOtpHint] = useState('');

  // Vehicle state (used on phone OTP verification step)
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  if (!isAuthModalOpen) return null;

  // Email: sign up or sign in with email + password via Supabase Auth
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        if (isRegister) {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name: name || email.split('@')[0] } },
          });
          if (signUpErr) throw new Error(signUpErr.message);
          // Supabase sends a confirmation email automatically
          const sbUser = data?.user;
          if (sbUser) {
            const userData = {
              id: sbUser.id,
              name: sbUser.user_metadata?.name || name || email.split('@')[0],
              email: sbUser.email,
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
              vehicleModel: 'Tata Nexon EV Max',
              licensePlate: 'MH 02 EV 1001',
            };
            handleAuthSuccess(userData, `token_${sbUser.id}`);
          }
        } else {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw new Error(signInErr.message);
          const sbUser = data?.user;
          if (sbUser) {
            const userData = {
              id: sbUser.id,
              name: sbUser.user_metadata?.name || email.split('@')[0],
              email: sbUser.email,
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
              vehicleModel: 'Tata Nexon EV Max',
              licensePlate: 'MH 02 EV 1001',
            };
            handleAuthSuccess(userData, `token_${sbUser.id}`);
          }
        }
      } else {
        // Fallback: custom backend
        if (isRegister) {
          await registerWithEmail({ email, password, name });
        } else {
          await loginWithEmail(email, password);
        }
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

  const resetModal = () => {
    setEmailOtpSent(false);
    setEmailOtp('');
    setOtpSent(false);
    setOtp('');
    setError('');
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
            {activeTab === 'phone'
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

        {/* 1. EMAIL SIGN UP / SIGN IN TAB */}
        {activeTab === 'email' && (
          <form className="auth-tab-content" onSubmit={handleEmailSubmit}>
            <div className="auth-sub-toggle">
              <button
                type="button"
                className={`auth-sub-btn ${isRegister ? 'auth-sub-btn--active' : ''}`}
                onClick={() => { setIsRegister(true); setError(''); }}
              >
                Create Account
              </button>
              <button
                type="button"
                className={`auth-sub-btn ${!isRegister ? 'auth-sub-btn--active' : ''}`}
                onClick={() => { setIsRegister(false); setError(''); }}
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
                  placeholder={isRegister ? 'Create a password (min. 6 characters)' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading
                ? 'Processing...'
                : isRegister
                ? 'Create EV Driver Account'
                : 'Sign In to Account'}
            </button>
          </form>
        )}

        {/* 2. PHONE NUMBER TAB */}
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
