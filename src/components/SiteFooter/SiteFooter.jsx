import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import './SiteFooter.css';

const FOOTER_LINKS = [
  { to: '/', label: 'Overview' },
  { to: '/map', label: 'Live Map' },
  { to: '/chargers', label: 'Chargers Directory' },
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

        {/* Copyright */}
        <p className="footer-copy">
          © {CURRENT_YEAR} VoltaicOS. Accelerating the electric mobility transition.
        </p>
      </div>
    </footer>
  );
}
