import React, { useRef } from 'react';
import { useMarketData } from '../context/MarketDataContext';

export default function TopNav({ onOpenMarket }) {
  const { 
    goldPriceFormatted,
    changeFormatted,
    priceChangePercent24h,
    high24hFormatted,
    low24hFormatted,
    longBorrowRateFormatted,
    shortBorrowRateFormatted,
    spreadFormatted,
    oiTotalFormatted,
    oiLongFormatted,
    oiShortFormatted,
    longRatio,
    volume24hFormatted,
    longVolFormatted,
    shortVolFormatted,
    pythMetadata,
    protocolInfo
  } = useMarketData();

  const statsScrollRef = useRef(null);

  const handleWheel = (e) => {
    if (statsScrollRef.current) {
      statsScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const ticker = pythMetadata?.display_symbol || protocolInfo?.assets?.[0]?.pythMetadata?.display_symbol || 'XAU/USD';
  const description = pythMetadata?.description || 'Gold / US Dollar';
  const isPositiveChange = priceChangePercent24h >= 0;
  // Positive => Blue (var(--color-blue)), Negative => Red (var(--color-red))
  const changeColor = isPositiveChange ? 'var(--color-blue)' : 'var(--color-red)';
  const goldAccent = 'var(--gold)';

  return (
    <div className="nav panel" style={{ overflow: 'hidden' }}>
      <div className="nav-stats-container" style={{ display: 'flex', width: '100%', overflow: 'hidden', gap: '0', paddingRight: '0' }}>
        
        {/* FIXED LEFT SIDE: Ticker Info [XAU] + Live Price */}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: '15px', padding: '0 15px 0 0' }}>
          
          {/* Ticker Selector */}
          <div className="ticker-selector" style={{ flexShrink: 0, paddingRight: '0', cursor: 'default' }}>
            <div className="ticker-logo" style={{
              borderRadius: '6px',
              background: goldAccent,
              color: '#000',
              fontWeight: 'bold',
              fontSize: '9px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Source Code Pro, monospace'
            }}>
              [XAU]
            </div>
            <div className="ticker-info">
              <span className="ticker-name" style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dark)' }}>{ticker}</span>
              <span className="ticker-desc" style={{ fontSize: '10px', color: 'var(--text-grey)' }}>{description}</span>
            </div>
          </div>

          {/* Current Live Price */}
          <div className="stat-item" style={{ flexShrink: 0 }}>
            <span className="stat-label">Price</span>
            <span className="stat-value" style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>
              ${goldPriceFormatted}
            </span>
          </div>
        </div>

        {/* Separator between Fixed Header and Scrollable Statistics */}
        <div style={{ width: '1px', height: '32px', background: 'var(--border-color)', flexShrink: 0, margin: '0 15px 0 0' }}></div>

        {/* SCROLLABLE STATS RIGHT SIDE (Wheel Scroll Enabled) */}
        <div 
          ref={statsScrollRef}
          onWheel={handleWheel}
          className="scrollable-stats"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            flex: 1,
            paddingRight: '12px'
          }}
        >
          <style>{`
            .scrollable-stats::-webkit-scrollbar {
              display: none;
            }
            .scrollable-stats > * {
              flex-shrink: 0;
            }
          `}</style>

          {/* Spread & 24h Change (Glisse avec le reste) */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="stat-item">
              <span className="stat-label">Spread</span>
              <span className="stat-value" style={{ fontSize: '12px', color: goldAccent, fontFamily: 'Source Code Pro, monospace' }}>
                {spreadFormatted}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">24h Change</span>
              <span className="stat-value" style={{ fontSize: '12px', color: changeColor, fontWeight: '600', fontFamily: 'Source Code Pro, monospace' }}>
                {changeFormatted}
              </span>
            </div>
          </div>

          {/* Vertical Separator */}
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>

          {/* Borrow Rate (Hourly) */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="stat-item">
              <span className="stat-label">Borrow Long/h</span>
              <span className="stat-value" style={{ color: 'var(--color-blue)', fontFamily: 'Source Code Pro, monospace' }}>{longBorrowRateFormatted}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Borrow Short/h</span>
              <span className="stat-value" style={{ color: 'var(--color-red)', fontFamily: 'Source Code Pro, monospace' }}>{shortBorrowRateFormatted}</span>
            </div>
          </div>

          {/* Vertical Separator */}
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>

          {/* Open Interest (Long / Short USDC) & Ratio */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="stat-item">
              <span className="stat-label">Open Interest</span>
              <span className="stat-value" style={{ fontSize: '11px', fontFamily: 'Source Code Pro, monospace' }}>
                <span style={{ color: 'var(--color-blue)' }}>{oiLongFormatted}</span>
                <span style={{ color: 'var(--text-grey)', margin: '0 4px' }}>/</span>
                <span style={{ color: 'var(--color-red)' }}>{oiShortFormatted}</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">L/S Ratio</span>
              <span className="stat-value">
                <span style={{ color: 'var(--color-blue)' }}>{longRatio}%</span>
                <span style={{ color: 'var(--text-grey)', margin: '0 4px' }}>/</span>
                <span style={{ color: 'var(--color-red)' }}>{100 - longRatio}%</span>
              </span>
            </div>
          </div>

          {/* Vertical Separator */}
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>

          {/* 24h Volume Total & Long/Short */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="stat-item">
              <span className="stat-label">24h Vol</span>
              <span className="stat-value" style={{ fontWeight: '600' }}>{volume24hFormatted}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Vol (L / S)</span>
              <span className="stat-value" style={{ fontSize: '11px', fontFamily: 'Source Code Pro, monospace' }}>
                <span style={{ color: 'var(--color-blue)' }}>{longVolFormatted}</span>
                <span style={{ color: 'var(--text-grey)', margin: '0 4px' }}>/</span>
                <span style={{ color: 'var(--color-red)' }}>{shortVolFormatted}</span>
              </span>
            </div>
          </div>

          {/* Vertical Separator */}
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>

          {/* 24h Low & 24h High (Far right) */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="stat-item">
              <span className="stat-label">24h Low</span>
              <span className="stat-value" style={{ fontFamily: 'Source Code Pro, monospace' }}>{low24hFormatted}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">24h High</span>
              <span className="stat-value" style={{ fontFamily: 'Source Code Pro, monospace' }}>{high24hFormatted}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

