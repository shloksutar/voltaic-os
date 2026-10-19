import { Link } from 'react-router-dom';
import { ArrowLeft, Map, Zap, Compass } from 'lucide-react';
import PageMeta from '../../components/PageMeta/PageMeta';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found page-enter">
      <PageMeta
        title="Page not found"
        description="The page you requested does not exist on VoltaicOS. Return home or open the live charger map."
      />
      <div className="nf-card card">
        <div className="nf-code font-display">404</div>
        <h1 className="nf-title font-display">This route is offline</h1>
        <p className="nf-desc">
          We could not find that page. It may have been moved, or the link is out of date.
        </p>
        <div className="nf-actions">
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={15} /> Back to Overview
          </Link>
          <Link to="/map" className="btn btn-secondary">
            <Map size={15} /> Open Live Map
          </Link>
          <Link to="/interactive-map" className="btn btn-secondary">
            <Compass size={15} /> Interactive Map
          </Link>
          <Link to="/chargers" className="btn btn-secondary">
            <Zap size={15} /> Browse Chargers
          </Link>
        </div>
        <div className="nf-support" style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--color-border-soft)', fontSize: '13px', color: 'var(--color-text-3)' }}>
          Need urgent station dispatch or driver support?{' '}
          <a href="tel:+911800208808" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            +91 1800-208-808
          </a>
          {' · '}
          <a href="mailto:hello@voltaicos.io" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            hello@voltaicos.io
          </a>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
