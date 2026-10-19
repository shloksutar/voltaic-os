import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authCallback, setAuthCallback] = useState(null);

  // Check initial session
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('voltaic_token');
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res?.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('voltaic_token');
          }
        } catch (err) {
          console.warn('Failed to restore auth session:', err);
          localStorage.removeItem('voltaic_token');
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const handleAuthSuccess = useCallback((userData, token) => {
    if (token) {
      localStorage.setItem('voltaic_token', token);
    }
    setUser(userData);
    setIsAuthModalOpen(false);
    toast.success(`Signed in as ${userData?.name || userData?.email || 'EV driver'}`);

    if (authCallback && typeof authCallback === 'function') {
      authCallback(userData);
      setAuthCallback(null);
    }
  }, [authCallback, toast]);

  const loginWithEmail = async (email, password) => {
    const res = await authApi.login({ email, password });
    handleAuthSuccess(res.user, res.token);
    return res.user;
  };

  const registerWithEmail = async (data) => {
    const res = await authApi.register(data);
    handleAuthSuccess(res.user, res.token);
    return res.user;
  };


  const sendPhoneOtp = async (phone) => {
    return authApi.sendPhoneOtp(phone);
  };

  const verifyPhoneOtp = async (data) => {
    const res = await authApi.verifyPhoneOtp(data);
    handleAuthSuccess(res.user, res.token);
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('voltaic_token');
    setUser(null);
    toast.info('You have been signed out.');
  };

  const updateProfile = async (updates) => {
    if (!user) return null;
    const res = await authApi.updateProfile({ userId: user.id, ...updates });
    if (res?.user) {
      setUser(res.user);
    }
    return res.user;
  };

  const openAuthModal = (callback = null) => {
    if (callback) setAuthCallback(() => callback);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthCallback(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        loginWithEmail,
        registerWithEmail,
        sendPhoneOtp,
        verifyPhoneOtp,
        logout,
        updateProfile,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
