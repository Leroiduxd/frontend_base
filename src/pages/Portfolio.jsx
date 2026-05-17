import React from 'react';
import Sidebar from '../components/Sidebar';
import Positions from '../components/Positions';
import Ticker from '../components/Ticker';
import PortfolioMetrics from '../components/PortfolioMetrics';

export default function Portfolio() {
  const goldAccent = '#BC8961';

  return (
    <div style={{ 
      display: 'flex', 
      width: '100vw', 
      height: '100vh', 
      padding: '10px', 
      backgroundColor: 'var(--bg-dark)', 
      gap: '8px', 
      overflow: 'hidden' 
    }}>
      {/* LEFT COLUMN: Sidebar */}
      <Sidebar />

      {/* CENTER COLUMN: Top Performance Metrics & Bottom Positions component & Ticker */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px',
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* TOP PANEL: Portfolio Performance & Analytics Component */}
        <PortfolioMetrics />

        {/* BOTTOM PANEL: Positions */}
        <div style={{ height: '340px', flexShrink: 0 }}>
          <Positions />
        </div>

        {/* TICKER PANEL (Below Positions) */}
        <div style={{ height: '40px', flexShrink: 0 }}>
          <Ticker />
        </div>
      </div>

      {/* RIGHT COLUMN: "vide" (Width: 320px matching OrderPanel width exactly) */}
      <div className="panel" style={{ 
        width: '320px', 
        height: '100%', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {/* Subtle grid pattern background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)',
          backgroundSize: '16px 16px',
          pointerEvents: 'none'
        }} />
        <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.15em', color: goldAccent, fontFamily: 'Source Code Pro', textAlign: 'center' }}>
          [ MARKET METRICS ]
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-grey)', marginTop: '6px', textTransform: 'uppercase', textAlign: 'center' }}>
          Awaiting trade volume index...
        </span>
      </div>
    </div>
  );
}
