import { useState, useEffect } from 'react';
import { X, Mail, Phone, Lock, User, AtSign, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { isOfficialEmail } from '../../utils/formValidation';
import './AuthModal.css';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    loginWithEmail,
    registerWithEmail,
    sendPhoneOtp,
    verifyPhoneOtp,
    handleAuthSuccess,
  } = useAuth();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('email'); // 'email' | 'phone'
  const [loginRole, setLoginRole] = useState('user'); // 'user' | 'admin' — User is the default
  const [isRegister, setIsRegister] = useState(false); // default to Sign In
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [testOtpHint, setTestOtpHint] = useState('');

  // Vehicle state (used on phone OTP verification step)
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  // Reset modal to requested mode (default: signin) whenever opened
  useEffect(() => {
    if (isAuthModalOpen) {
      setIsRegister(authModalMode === 'register');
      setLoginRole('user');
      setActiveTab('email');
      setError('');
      setNotice('');
    }
  }, [isAuthModalOpen, authModalMode]);

  const switchRole = (role) => {
    setLoginRole(role);
    setError('');
    setNotice('');
    if (role === 'admin') {
      // Admin access is sign-in only — no self-registration, no phone OTP
      setIsRegister(false);
      setActiveTab('email');
    }
  };

  if (!isAuthModalOpen) return null;

  // Email: sign in or sign up with email + password via Supabase Auth or fallback backend
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (!isOfficialEmail(cleanEmail)) {
      setError(
        'Please use an official or professional email address (e.g. @gmail.com, @yahoo.com, @hotmail.com, @ymail.com, @outlook.com, @icloud.com, @zohomail.com, or your corporate/organization domain).'
      );
      setLoading(false);
      return;
    }

    // --- Admin sign-in: server-side password verification + whitelist ---
    if (loginRole === 'admin') {
      try {
        await loginWithEmail(cleanEmail, password, { role: 'admin' });
        navigate('/admin');
      } catch (err) {
        setError(err.message || 'Admin sign-in failed. Check your credentials and authorization.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const chosenUsername = username.trim();
      const trimmedName = name.trim();
      if (isRegister) {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
        if (!chosenUsername) {
          throw new Error('Please choose a username for your account');
        }
        if (!trimmedName) {
          throw new Error('Please enter your full name');
        }
      }
      const displayName = trimmedName || chosenUsername || 'EV Driver';

      if (isSupabaseConfigured && supabase) {
        if (isRegister) {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                username: chosenUsername,
                name: displayName,
              },
            },
          });
          if (signUpErr) throw new Error(signUpErr.message);

          const sbUser = data?.user;
          const accessToken = data?.session?.access_token;
          if (sbUser && !accessToken) {
            // Email confirmation required — no session yet, so don't sign in
            setNotice('Account created! Please check your email to confirm, then sign in.');
            setIsRegister(false);
            return;
          }
          if (sbUser) {
            // Also save profile to public.users table
            try {
              await supabase.from('users').upsert({
                id: sbUser.id,
                name: displayName,
                email: cleanEmail,
                auth_provider: 'email',
                avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
                vehicle_model: 'Tata Nexon EV Max',
                license_plate: 'MH 02 EV 1001',
              });
            } catch (uErr) {
              console.warn('Could not upsert into public.users:', uErr);
            }

            const userData = {
              id: sbUser.id,
              username: chosenUsername,
              name: displayName,
              email: sbUser.email,
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
              vehicleModel: 'Tata Nexon EV Max',
              licensePlate: 'MH 02 EV 1001',
            };
            handleAuthSuccess(userData, data?.session?.access_token);
          }
        } else {
          // Attempt sign in
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (signInErr) {
            // Do not probe public.users here — it would both violate RLS and
            // leak whether an account exists. Generic message only.
            throw new Error(
              signInErr.message?.toLowerCase().includes('invalid login credentials')
                ? 'Incorrect email or password. Please check your credentials and try again.'
                : signInErr.message
            );
          }

          const sbUser = data?.user;
          if (sbUser) {
            const userDisplay = sbUser.user_metadata?.username || sbUser.user_metadata?.name || 'EV Driver';
            const userData = {
              id: sbUser.id,
              username: sbUser.user_metadata?.username || null,
              name: userDisplay,
              email: sbUser.email,
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userDisplay)}`,
              vehicleModel: 'Tata Nexon EV Max',
              licensePlate: 'MH 02 EV 1001',
            };
            handleAuthSuccess(userData, data?.session?.access_token);
          }
        }
      } else {
        // Fallback: custom backend
        if (isRegister) {
          await registerWithEmail({
            email: cleanEmail,
            password,
            username: chosenUsername,
            name: displayName,
          });
        } else {
          try {
            await loginWithEmail(cleanEmail, password);
          } catch (loginErr) {
            const isNotFound =
              loginErr?.notFound ||
              loginErr?.status === 404 ||
              loginErr?.message?.toLowerCase().includes('not found') ||
              loginErr?.message?.toLowerCase().includes('no account');

            if (isNotFound) {
              setIsRegister(true);
              if (!username) {
                setUsername(cleanEmail.split('@')[0] || '');
              }
              setNotice(`No account found for "${cleanEmail}". Please create an account first.`);
              return;
            }
            throw loginErr;
          }
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
    setNotice('');
    setLoading(true);
    try {
      const res = await sendPhoneOtp(phone);
      setOtpSent(true);
      setTestOtpHint(res.testOtp || '');
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
    setNotice('');
    setLoading(true);
    try {
      const chosenUsername = username.trim();
      const displayName = chosenUsername || name.trim() || 'EV Driver';
      await verifyPhoneOtp({
        phone,
        otp,
        username: chosenUsername || null,
        name: displayName,
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
            {loginRole === 'admin'
              ? 'Admin Console'
              : activeTab === 'phone'
              ? 'Phone Verification'
              : isRegister
              ? 'Create VoltaicOS Account'
              : 'Welcome Back'}
          </h2>
          <p className="auth-sub">
            {loginRole === 'admin'
              ? 'Authorized personnel only. Sign-in is restricted to whitelisted admin accounts.'
              : activeTab === 'phone'
              ? 'Verify your mobile number to book charging bays and sync reservations.'
              : isRegister
              ? 'Create an account to reserve charging bays, manage passes, and track costs.'
              : 'Sign in to access your slot reservations, verified vehicles, and charging passes.'}
          </p>
        </div>

        {/* Method selector tabs (hidden for admin sign-in) */}
        {loginRole !== 'admin' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${activeTab === 'email' ? 'auth-tab--active' : ''}`}
              onClick={() => {
                setActiveTab('email');
                setError('');
                setNotice('');
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
                setNotice('');
              }}
            >
              <Phone size={15} />
              Phone
            </button>
          </div>
        )}

        {notice && (
          <div className="auth-notice-banner">
            <AlertCircle size={15} />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. EMAIL SIGN UP / SIGN IN TAB */}
        {activeTab === 'email' && (
          <form className="auth-tab-content" onSubmit={handleEmailSubmit}>
            {/* Role selector: User (default) or Admin */}
            <div className="auth-role-toggle" role="tablist" aria-label="Login type">
              <button
                type="button"
                role="tab"
                aria-selected={loginRole === 'user'}
                className={`auth-role-btn ${loginRole === 'user' ? 'auth-role-btn--active' : ''}`}
                onClick={() => switchRole('user')}
              >
                <User size={14} />
                User
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginRole === 'admin'}
                className={`auth-role-btn auth-role-btn--admin ${loginRole === 'admin' ? 'auth-role-btn--active' : ''}`}
                onClick={() => switchRole('admin')}
              >
                <ShieldCheck size={14} />
                Admin
              </button>
            </div>

            {loginRole === 'admin' && (
              <div className="auth-admin-note">
                <ShieldCheck size={14} />
                <span>Authorized personnel only. Your email must be on the admin whitelist.</span>
              </div>
            )}

            {loginRole !== 'admin' && (
              <div className="auth-sub-toggle">
                <button
                  type="button"
                  className={`auth-sub-btn ${!isRegister ? 'auth-sub-btn--active' : ''}`}
                  onClick={() => { setIsRegister(false); setError(''); setNotice(''); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-sub-btn ${isRegister ? 'auth-sub-btn--active' : ''}`}
                  onClick={() => { setIsRegister(true); setError(''); setNotice(''); }}
                >
                  Create Account
                </button>
              </div>
            )}

            {isRegister && (
              <>
                <div className="auth-field">
                  <label>Username</label>
                  <div className="auth-input-wrap">
                    <AtSign size={15} />
                    <input
                      type="text"
                      placeholder="Choose a username (e.g. speed_demon)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

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
              </>
            )}

            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={15} />
                <input
                  type="email"
                  placeholder={isRegister ? "name@gmail.com, name@company.com" : "name@gmail.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {isRegister && (
                <p className="auth-field-hint">
                  Official emails accepted: Gmail, Yahoo, Hotmail, Ymail, Outlook, iCloud, Zoho, or company / institution work domains.
                </p>
              )}
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <Lock size={15} />
                <input
                  type="password"
                  placeholder={isRegister ? 'Create a password (min. 8 characters)' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading
                ? 'Processing...'
                : loginRole === 'admin'
                ? 'Sign In to Admin Console'
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
                  <label>Username (optional)</label>
                  <div className="auth-input-wrap">
                    <AtSign size={15} />
                    <input
                      type="text"
                      placeholder="Choose a username (e.g. volt_driver)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label>Full Name</label>
                  <div className="auth-input-wrap">
                    <User size={15} />
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
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
