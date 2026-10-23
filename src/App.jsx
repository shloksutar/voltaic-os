import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import AuthModal from './components/AuthModal/AuthModal';
import './index.css';

// Lazy-loaded page chunks — each page is only fetched when first visited
const Overview    = lazy(() => import('./pages/Overview/Overview'));
const LiveMap     = lazy(() => import('./pages/LiveMap/LiveMap'));
const Chargers    = lazy(() => import('./pages/Chargers/Chargers'));
const Analytics   = lazy(() => import('./pages/Analytics/Analytics'));
const Alerts      = lazy(() => import('./pages/Alerts/Alerts'));
const NotFound    = lazy(() => import('./pages/NotFound/NotFound'));
const RentCharger = lazy(() => import('./pages/RentCharger/RentCharger'));

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
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
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/dashboard" element={<Navigate to="/analytics" replace />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/incidents" element={<Navigate to="/alerts" replace />} />
              <Route path="/rent-charger" element={<RentCharger />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <AuthModal />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
