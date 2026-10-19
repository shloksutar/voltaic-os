import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import AuthModal from './components/AuthModal/AuthModal';
import Overview from './pages/Overview/Overview';
import LiveMap from './pages/LiveMap/LiveMap';
import Chargers from './pages/Chargers/Chargers';
import Analytics from './pages/Analytics/Analytics';
import Alerts from './pages/Alerts/Alerts';
import InteractiveMap from './pages/InteractiveMap/InteractiveMap';
import NotFound from './pages/NotFound/NotFound';
import './index.css';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/overview" element={<Navigate to="/" replace />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/map" element={<LiveMap />} />
            <Route path="/livemap" element={<Navigate to="/map" replace />} />
            <Route path="/interactive-map" element={<InteractiveMap />} />
            <Route path="/leaflet" element={<Navigate to="/interactive-map" replace />} />
            <Route path="/chargers" element={<Chargers />} />
            <Route path="/stations" element={<Navigate to="/chargers" replace />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/dashboard" element={<Navigate to="/analytics" replace />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/incidents" element={<Navigate to="/alerts" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AuthModal />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
