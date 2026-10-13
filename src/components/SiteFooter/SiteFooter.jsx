import { Link } from 'react-router-dom';
import { Zap, Mail, Phone, ShieldCheck } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '../../constants/contact';
import './SiteFooter.css';

const FOOTER_LINKS = [
  { to: '/', label: 'Overview' },
  { to: '/map', label: 'Live Map' },
  { to: '/chargers', label: 'Chargers Directory' },
  { to: '/analytics', label: 'Network Analytics' },
  { to: '/alerts', label: 'Incident Feed' },
];

const CURRENT_YEAR = 2026;

export default function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer-inner">
        {/* Clickable Brand Logo */}
        <Link to="/" className="footer-brand" aria-label="VoltaicOS home">
          <div className="footer-brand-icon">
            <Zap size={15} strokeWidth={2.5} />
          </div>
          <span className="font-display footer-brand-title">VoltaicOS</span>
        </Link>

        {/* Navigation Links */}
        <nav className="footer-nav" aria-label="Footer Navigation">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.to} to={item.to} className="footer-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Clickable Contact: Phone and Email */}
        <div className="footer-contact">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="footer-contact-link"
            aria-label={`Call driver support at ${SUPPORT_PHONE_DISPLAY}`}
          >
            <Phone size={14} />
            <span>{SUPPORT_PHONE_DISPLAY}</span>
          </a>
          <span className="footer-contact-sep">·</span>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="footer-contact-link"
            aria-label={`Email support at ${SUPPORT_EMAIL}`}
          >
            <Mail size={14} />
            <span>{SUPPORT_EMAIL}</span>
          </a>
        </div>

        {/* Badge & Copyright */}
        <div className="footer-meta">
          <div className="footer-badge">
            <ShieldCheck size={13} color="#059669" />
            <span>OCPI 2.2.1 Protocol Compliance · 99.9% Telemetry Uptime</span>
          </div>
          <p className="footer-copy">
            © {CURRENT_YEAR} VoltaicOS. Accelerating the electric mobility transition.
          </p>
        </div>
      </div>
    </footer>
  );
}
