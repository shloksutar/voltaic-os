import { Component, lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import AuthModal from './components/AuthModal/AuthModal';
import SkeletonLoader from './components/SkeletonLoader/SkeletonLoader';
import './index.css';

// Lazy-loaded page chunks — each page is only fetched when first visited
const Overview    = lazy(() => import('./pages/Overview/Overview'));
const LiveMap     = lazy(() => import('./pages/LiveMap/LiveMap'));
const Chargers    = lazy(() => import('./pages/Chargers/Chargers'));
const NotFound    = lazy(() => import('./pages/NotFound/NotFound'));
const RentCharger = lazy(() => import('./pages/RentCharger/RentCharger'));
const Admin       = lazy(() => import('./pages/Admin/Admin'));

class PageErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PageErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.locationKey !== this.props.locationKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReload = () => {
    // If it's a dynamic module import failure (common after a new Vercel deployment),
    // force a hard refresh to grab the latest build assets
    window.location.href = window.location.href;
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        role="alert"
        style={{
          minHeight: '60vh',
          display: 'grid',
          placeItems: 'center',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <div>
          <h1 style={{ marginBottom: 8 }}>This page could not be loaded</h1>
          <p style={{ marginBottom: 20, color: '#64748B' }}>Please reload the page to try again.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={this.handleReload}>
              Reload page
            </button>
            <a href="/" className="btn btn-secondary">
              Go to Overview
            </a>
          </div>
        </div>
      </main>
    );
  }
}

function RoutedContent() {
  const location = useLocation();

  return (
    <PageErrorBoundary locationKey={location.pathname}>
      <Suspense fallback={<SkeletonLoader isInline />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/overview" element={<Navigate to="/" replace />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/livemap" element={<Navigate to="/map" replace />} />
          <Route path="/leaflet" element={<Navigate to="/map" replace />} />
          <Route path="/chargers" element={<Chargers />} />
          <Route path="/stations" element={<Navigate to="/chargers" replace />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/incidents" element={<Navigate to="/" replace />} />
          <Route path="/rent-charger" element={<RentCharger />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </PageErrorBoundary>
  );
}

export default function App() {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Show skeleton screen loader for around 1.5 seconds when opening the website
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1500);

    const removeTimer = setTimeout(() => {
      setShowSkeleton(false);
    }, 1850); // 1500ms + 350ms smooth fade transition

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          {showSkeleton && <SkeletonLoader isFadingOut={isFadingOut} />}
          <Navbar />
          <RoutedContent />
          <AuthModal />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
