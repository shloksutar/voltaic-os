import { Zap } from 'lucide-react';
import './SkeletonLoader.css';

export default function SkeletonLoader({ isFadingOut = false, isInline = false }) {
  const content = (
    <>
      {/* ── Top Navigation Skeleton ── */}
      <nav className="skeleton-navbar" aria-hidden="true">
        <div className="skeleton-nav-brand">
          <div className="skeleton-brand-icon">
            <Zap size={18} color="#4338CA" />
          </div>
          <div className="skeleton-bone skeleton-brand-text skeleton-bone--round" />
        </div>

        <div className="skeleton-nav-links">
          <div className="skeleton-bone skeleton-nav-pill skeleton-bone--pill" style={{ width: '84px' }} />
          <div className="skeleton-bone skeleton-nav-pill skeleton-bone--pill" style={{ width: '92px' }} />
          <div className="skeleton-bone skeleton-nav-pill skeleton-bone--pill" style={{ width: '86px' }} />
          <div className="skeleton-bone skeleton-nav-pill skeleton-bone--pill" style={{ width: '108px' }} />
        </div>

        <div className="skeleton-nav-actions">
          <div className="skeleton-bone skeleton-bone--pill" style={{ width: '96px', height: '36px' }} />
          <div className="skeleton-bone skeleton-bone--round" style={{ width: '36px', height: '36px' }} />
        </div>
      </nav>

      {/* ── Main Page Skeleton ── */}
      <main className="skeleton-content" aria-hidden="true">
        {/* Hero Card Skeleton */}
        <section className="skeleton-hero">
          <div className="skeleton-hero-eyebrow">
            <span className="skeleton-eyebrow-dot" />
            <div className="skeleton-bone skeleton-bone--pill" style={{ width: '220px', height: '18px' }} />
          </div>

          <div className="skeleton-hero-title-group">
            <div className="skeleton-bone skeleton-hero-title-1" />
            <div className="skeleton-bone skeleton-hero-title-2" />
          </div>

          <div className="skeleton-hero-desc-group">
            <div className="skeleton-bone" style={{ width: '92%', height: '15px' }} />
            <div className="skeleton-bone" style={{ width: '78%', height: '15px' }} />
          </div>

          <div className="skeleton-hero-cta">
            <div className="skeleton-bone skeleton-cta-btn skeleton-bone--card" style={{ width: '180px', height: '44px' }} />
            <div className="skeleton-bone skeleton-cta-btn skeleton-bone--card" style={{ width: '150px', height: '44px' }} />
          </div>

          <div className="skeleton-bone skeleton-bone--pill" style={{ width: '130px', height: '14px', marginTop: '6px' }} />
        </section>

        {/* 4 Stat Cards Skeleton */}
        <section className="skeleton-stats-grid">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="skeleton-stat-card">
              <div className="skeleton-stat-card-header">
                <div className="skeleton-bone skeleton-stat-icon" />
                <div className="skeleton-bone skeleton-stat-badge skeleton-bone--pill" />
              </div>
              <div className="skeleton-bone skeleton-stat-value" />
              <div className="skeleton-bone skeleton-stat-label" />
              <div className="skeleton-bone skeleton-stat-sub" />
            </div>
          ))}
        </section>

        {/* Stations Section Skeleton */}
        <section className="skeleton-stations-section">
          <div className="skeleton-section-header">
            <div className="skeleton-header-left">
              <div className="skeleton-bone" style={{ width: '200px', height: '22px', borderRadius: '6px' }} />
              <div className="skeleton-bone" style={{ width: '260px', height: '14px' }} />
            </div>
            <div className="skeleton-bone skeleton-bone--pill" style={{ width: '100px', height: '28px' }} />
          </div>

          <div className="skeleton-cards-grid">
            {[1, 2].map((idx) => (
              <div key={idx} className="skeleton-station-card">
                <div className="skeleton-station-card-top">
                  <div className="skeleton-station-info">
                    <div className="skeleton-bone" style={{ width: '70%', height: '18px' }} />
                    <div className="skeleton-bone" style={{ width: '45%', height: '13px' }} />
                  </div>
                  <div className="skeleton-bone skeleton-bone--pill" style={{ width: '80px', height: '24px' }} />
                </div>

                <div className="skeleton-station-ports">
                  <div className="skeleton-bone skeleton-bone--pill" style={{ width: '100%', height: '8px' }} />
                  <div className="skeleton-ports-legend">
                    <div className="skeleton-bone skeleton-bone--pill" style={{ width: '75px', height: '18px' }} />
                    <div className="skeleton-bone skeleton-bone--pill" style={{ width: '65px', height: '18px' }} />
                    <div className="skeleton-bone skeleton-bone--pill" style={{ width: '50px', height: '18px' }} />
                  </div>
                </div>

                <div className="skeleton-station-bottom">
                  <div className="skeleton-station-tags">
                    <div className="skeleton-bone skeleton-bone--pill" style={{ width: '110px', height: '24px' }} />
                    <div className="skeleton-bone skeleton-bone--pill" style={{ width: '70px', height: '20px' }} />
                  </div>
                  <div className="skeleton-bone skeleton-bone--card" style={{ width: '90px', height: '32px' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Floating status badge */}
      <div className="skeleton-floating-badge" role="status" aria-live="polite">
        <div className="skeleton-badge-spinner" />
        <span>Loading VoltaicOS...</span>
      </div>
    </>
  );

  if (isInline) {
    return (
      <div className="skeleton-inline-wrapper" role="status" aria-busy="true" aria-label="Loading VoltaicOS">
        {content}
      </div>
    );
  }

  return (
    <div
      className={`skeleton-screen-overlay ${isFadingOut ? 'is-fading-out' : ''}`}
      role="status"
      aria-busy="true"
      aria-label="Loading VoltaicOS"
    >
      {content}
    </div>
  );
}
