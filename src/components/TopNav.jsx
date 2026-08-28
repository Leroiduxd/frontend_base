import React from 'react';
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

  const ticker = pythMetadata?.display_symbol || protocolInfo?.assets?.[0]?.pythMetadata?.display_symbol || 'XAU/USD';
  const description = pythMetadata?.description || 'Gold / US Dollar';
  const isPositiveChange = priceChangePercent24h >= 0;
  // Positive => Blue (#3b82f6), Negative => Red (#ef4444)
  const changeColor = isPositiveChange ? '#3b82f6' : '#ef4444';
  const goldAccent = '#BC8961';

  return (
    <div className="nav panel" style={{ overflow: 'hidden' }}>
      <div className="nav-stats-container" style={{ display: 'flex', width: '100%', overflow: 'hidden', gap: '0', paddingRight: '0' }}>
        
        {/* FIXED LEFT SIDE: Ticker Info [XAU] + Live Price + Spread + 24h Change (Blue/Red) */}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: '15px', padding: '0 15px 0 0' }}>
          
          {/* Ticker Selector */}
          <div className="ticker-selector" style={{ flexShrink: 0, paddingRight: '0', cursor: 'default' }}>
            <div className="ticker-logo" style={{
              borderRadius: '6px',
              background: goldAccent,
              color: '#000',
              fontWeight: 'bold',
              fontSize: '8.5px',
              fontFamily: 'Source Code Pro, monospace',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.02em',
              flexShrink: 0
            }}>
              [XAU]
            </div>
            <div className="ticker-info">
              <span className="ticker-name">{ticker}</span>
              <span className="ticker-label" style={{ fontSize: '10px', color: 'var(--text-grey)', fontWeight: 'normal' }}>Gold / US Dollar</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', flexShrink: 0 }}></div>

          {/* 1. Live Price (Fixed, does not move on scroll) */}
          <div className="stat-item" style={{ flexShrink: 0 }}>
            <span className="stat-label">Price</span>
            <span className="stat-value" style={{ fontSize: '14px', fontWeight: 'bold' }}>${goldPriceFormatted}</span>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', flexShrink: 0 }}></div>

          {/* 2. Spread vs Price */}
          <div className="stat-item" style={{ flexShrink: 0 }}>
            <span className="stat-label">Spread</span>
            <span className="stat-value" style={{ color: goldAccent, fontFamily: 'Source Code Pro, monospace' }}>
              {spreadFormatted}
            </span>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', flexShrink: 0 }}></div>

          {/* 3. 24h Change (Blue if positive, Red if negative) */}
          <div className="stat-item" style={{ flexShrink: 0 }}>
            <span className="stat-label">24h Change</span>
            <span className="stat-value" style={{ color: changeColor, fontWeight: '600' }}>
              {changeFormatted}
            </span>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', flexShrink: 0 }}></div>
        </div>

        {/* SCROLLABLE RIGHT SIDE: Remaining Stats with 24h High/Low at the far right */}
        <div className="scrollable-stats" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          overflowX: 'auto',
          flexGrow: 1,
          padding: '0 20px 0 10px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <style>{`
            .scrollable-stats::-webkit-scrollbar {
              display: none;
            }
            .scrollable-stats > * {
              flex-shrink: 0;
            }
          `}</style>

          {/* Borrow Rate (Hourly) */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="stat-item">
              <span className="stat-label">Borrow Long/h</span>
              <span className="stat-value" style={{ color: '#3b82f6', fontFamily: 'Source Code Pro, monospace' }}>{longBorrowRateFormatted}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Borrow Short/h</span>
              <span className="stat-value" style={{ color: '#ef4444', fontFamily: 'Source Code Pro, monospace' }}>{shortBorrowRateFormatted}</span>
            </div>
          </div>

          {/* Vertical Separator */}
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>

          {/* Open Interest (Long / Short USDC) & Ratio */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="stat-item">
              <span className="stat-label">Open Interest</span>
              <span className="stat-value" style={{ fontSize: '11px', fontFamily: 'Source Code Pro, monospace' }}>
                <span style={{ color: '#3b82f6' }}>{oiLongFormatted}</span>
                <span style={{ color: 'var(--text-grey)', margin: '0 4px' }}>/</span>
                <span style={{ color: '#ef4444' }}>{oiShortFormatted}</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">L/S Ratio</span>
              <span className="stat-value">
                <span style={{ color: '#3b82f6' }}>{longRatio}%</span>
                <span style={{ color: 'var(--text-grey)', margin: '0 4px' }}>/</span>
                <span style={{ color: '#ef4444' }}>{100 - longRatio}%</span>
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
                <span style={{ color: '#3b82f6' }}>{longVolFormatted}</span>
                <span style={{ color: 'var(--text-grey)', margin: '0 4px' }}>/</span>
                <span style={{ color: '#ef4444' }}>{shortVolFormatted}</span>
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

