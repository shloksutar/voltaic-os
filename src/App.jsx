import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import AuthModal from './components/AuthModal/AuthModal';
import Overview from './pages/Overview/Overview';
import LiveMap from './pages/LiveMap/LiveMap';
import Chargers from './pages/Chargers/Chargers';
import Analytics from './pages/Analytics/Analytics';
import Alerts from './pages/Alerts/Alerts';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/chargers" element={<Chargers />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AuthModal />
      </BrowserRouter>
    </AuthProvider>
  );
}
