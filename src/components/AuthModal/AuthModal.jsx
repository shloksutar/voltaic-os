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

  // Email: send OTP via Supabase Auth (works for both sign up and sign in)
  const handleEmailSendOtp = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    setError('');
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: { name: name || email.split('@')[0] },
            shouldCreateUser: true,
          },
        });
        if (otpError) throw new Error(otpError.message);
        setEmailOtpSent(true);
      } else {
        // Fallback: use the custom backend email/password flow
        if (isRegister) {
          await registerWithEmail({ email, password, name });
        } else {
          await loginWithEmail(email, password);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  // Email: verify OTP token from inbox
  const handleEmailVerifyOtp = async (e) => {
    e.preventDefault();
    if (!emailOtp) { setError('Please enter the 6-digit code from your email'); return; }
    setError('');
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: emailOtp,
        type: 'email',
      });
      if (verifyError) throw new Error(verifyError.message);
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
        localStorage.setItem('voltaic_token', `token_${sbUser.id}`);
        localStorage.setItem('voltaic_user', JSON.stringify(userData));
        closeAuthModal();
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Check the code and try again.');
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

        {/* 1. EMAIL OTP TAB */}
        {activeTab === 'email' && (
          <div className="auth-tab-content">
            {!emailOtpSent ? (
              <form onSubmit={handleEmailSendOtp}>
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

                <button
                  type="submit"
                  className="btn btn-primary auth-submit-btn"
                  disabled={loading || !email}
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailVerifyOtp}>
                <div className="otp-sent-banner">
                  <CheckCircle2 size={16} />
                  <span>
                    6-digit code sent to <strong>{email}</strong> — check your inbox & spam folder
                  </span>
                </div>

                <div className="auth-field">
                  <label>Enter 6-Digit Code</label>
                  <input
                    type="text"
                    className="auth-otp-input"
                    maxLength={6}
                    placeholder="123456"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary auth-submit-btn"
                  disabled={loading || emailOtp.length < 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm auth-resend-btn"
                  onClick={resetModal}
                >
                  ← Use different email
                </button>
              </form>
            )}
          </div>
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
