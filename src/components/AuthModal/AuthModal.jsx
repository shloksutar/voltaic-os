import { useState, useEffect } from 'react';
import { X, Mail, Phone, Lock, User, AtSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
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

  const [activeTab, setActiveTab] = useState('email'); // 'email' | 'phone'
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
      setError('');
      setNotice('');
    }
  }, [isAuthModalOpen, authModalMode]);

  if (!isAuthModalOpen) return null;

  // Email: sign in or sign up with email + password via Supabase Auth or fallback backend
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const chosenUsername = username.trim();
      const trimmedName = name.trim();
      if (isRegister) {
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
            handleAuthSuccess(userData, `token_${sbUser.id}`);
          }
        } else {
          // Attempt sign in
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (signInErr) {
            // Check if user exists in public.users table
            let userFound = false;
            try {
              const { data: userRow } = await supabase
                .from('users')
                .select('id, email')
                .eq('email', cleanEmail)
                .maybeSingle();

              if (userRow) {
                userFound = true;
              }
            } catch (checkErr) {
              console.warn('Could not check user existence:', checkErr);
            }

            // If user's data is not found, redirect them to the create account section
            if (!userFound) {
              setIsRegister(true);
              if (!username) {
                setUsername(cleanEmail.split('@')[0] || '');
              }
              setNotice(`No account found for "${cleanEmail}". Please create an account first.`);
              return;
            }

            // User exists, but credentials/password was invalid
            throw new Error(
              signInErr.message?.toLowerCase().includes('invalid login credentials')
                ? 'Incorrect password. Please check your password and try again.'
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
            handleAuthSuccess(userData, `token_${sbUser.id}`);
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
            {activeTab === 'phone'
              ? 'Phone Verification'
              : isRegister
              ? 'Create VoltaicOS Account'
              : 'Welcome Back'}
          </h2>
          <p className="auth-sub">
            {activeTab === 'phone'
              ? 'Verify your mobile number to book charging bays and sync reservations.'
              : isRegister
              ? 'Create an account to reserve charging bays, manage passes, and track costs.'
              : 'Sign in to access your slot reservations, verified vehicles, and charging passes.'}
          </p>
        </div>

        {/* Method selector tabs */}
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
