import { Link } from 'react-router-dom';
import { Zap, Mail, Phone } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '../../constants/contact';
import './SiteFooter.css';

const FOOTER_LINKS = [
  { to: '/', label: 'Overview' },
  { to: '/map', label: 'Live Map' },
  { to: '/chargers', label: 'Chargers' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/alerts', label: 'Alerts' },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link to="/" className="footer-brand" aria-label="VoltaicOS home">
          <Zap size={16} />
          <span className="font-display">VoltaicOS</span>
        </Link>

        <nav className="footer-nav" aria-label="Footer">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="footer-contact">
          <a href={`tel:${SUPPORT_PHONE}`}>
            <Phone size={13} />
            {SUPPORT_PHONE_DISPLAY}
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail size={13} />
            {SUPPORT_EMAIL}
          </a>
        </div>

        <p className="footer-copy">© {year} VoltaicOS. Accelerating the electric transition.</p>
      </div>
    </footer>
  );
}
