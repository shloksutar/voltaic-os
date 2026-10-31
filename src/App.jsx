import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
          <Suspense fallback={null}>
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
          <AuthModal />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
