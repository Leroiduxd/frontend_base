import React, { useState, useEffect } from 'react';

// Common Accent Colors (Theme-aware via CSS variables)
const goldAccent = '#BC8961';
const goldAccentLight = 'rgba(188, 137, 97, 0.15)';
const buyColor = '#3b82f6'; // blue
const sellColor = '#ef4444'; // red
const buyColorBg = 'rgba(59, 130, 246, 0.1)';
const sellColorBg = 'rgba(239, 68, 68, 0.1)';

// ----------------------------------------------------
// 0. MOBILE TRADE HEADER (Unified Header Component)
// ----------------------------------------------------
export function MobileTradeHeader({ activeMarketInfo, setIsMarketSelectorOpen }) {
  const isPositive = activeMarketInfo.change.startsWith('+');

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 12px 8px 12px', background: 'transparent', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexGrow: 1 }} onClick={() => setIsMarketSelectorOpen(true)}>
        {/* Logo box */}
        <div style={{
          width: '36px',
          height: '36px',
          backgroundColor: 'rgba(200, 169, 126, 0.08)',
          border: '1px solid rgba(200, 169, 126, 0.2)',
          borderRadius: '8px',
          color: 'var(--gold)',
          fontWeight: '900',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          flexShrink: 0
        }}>
          {activeMarketInfo.logo}
        </div>
        
        {/* Name and Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {/* Row 1: Symbol & Leverage + Price on right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-dark)' }}>
                {activeMarketInfo.symbol}
              </span>
              <span style={{ fontSize: '8px', backgroundColor: 'rgba(188, 137, 97, 0.1)', color: 'var(--gold)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                {activeMarketInfo.leverage}
              </span>
            </div>
            
            {/* Price aligned to the right */}
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace' }}>
              ${activeMarketInfo.price}
            </span>
          </div>

          {/* Row 2: Company + Variation on right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-grey)' }}>
              {activeMarketInfo.company}
            </span>
            
            {/* Variation aligned to the right */}
            <span style={{ 
              fontSize: '10.5px', 
              fontWeight: 'bold', 
              color: isPositive ? '#3b82f6' : '#ef4444', 
              fontFamily: 'Source Code Pro, monospace' 
            }}>
              {activeMarketInfo.change}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 0.5. MOBILE TOPNAV (TradeHeader + Scrollable Metrics Row)
// ----------------------------------------------------
export function MobileTopNav({ activeMarketInfo, setIsMarketSelectorOpen }) {
  const isPositive = activeMarketInfo.change.startsWith('+');

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header Title & Select */}
      <MobileTradeHeader 
        activeMarketInfo={activeMarketInfo} 
        setIsMarketSelectorOpen={setIsMarketSelectorOpen} 
      />

      {/* 2. Scrollable stats row (matching TopNav.jsx exactly, with Price/Variation cleanly omitted as they are placed in Header) */}
      <div className="mobile-metrics-scroll no-scrollbar" style={{
        display: 'flex',
        gap: '18px',
        overflowX: 'auto',
        padding: '4px 12px 12px 12px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        borderBottom: '1px solid var(--border-color)',
        background: 'transparent'
      }}>
        {/* Style to prevent shrink on mobile metric items */}
        <style>{`
          .mobile-metrics-scroll > * { flex-shrink: 0; }
        `}</style>

        {/* Funding Long */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Funding Long</span>
          <span style={{ fontSize: '10.5px', fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold', color: '#ef4444' }}>
            0.0100%
          </span>
        </div>

        {/* Funding Short */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Funding Short</span>
          <span style={{ fontSize: '10.5px', fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold', color: '#3b82f6' }}>
            -0.0100%
          </span>
        </div>

        {/* Open Interest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Open Interest</span>
          <span style={{ fontSize: '10.5px', fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold', color: 'var(--text-dark)' }}>
            {activeMarketInfo.symbol === 'XAU/USD' || activeMarketInfo.symbol === 'XAU-USD' ? '125.4M / 500M' : activeMarketInfo.symbol === 'BTC/USD' || activeMarketInfo.symbol === 'BTC-USDC' ? '42.8M / 200M' : '15.2M / 100M'}
          </span>
        </div>

        {/* Long/Short Ratio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>L/S Ratio</span>
          <span style={{ fontSize: '10.5px', fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold' }}>
            <span style={{ color: '#3b82f6' }}>65%</span>
            <span style={{ color: 'var(--text-grey)', margin: '0 2px' }}>/</span>
            <span style={{ color: '#ef4444' }}>35%</span>
          </span>
        </div>

        {/* 24h Volume */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>24h Volume</span>
          <span style={{ fontSize: '10.5px', fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold', color: 'var(--text-dark)' }}>
            {activeMarketInfo.volume}
          </span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 1. MOBILE TRADE INFO (Ticker & Market Stats)
// ----------------------------------------------------
export function MobileTradeInfo({ onOpenMarket, activeView, setActiveView }) {
  const stats = {
    ticker: 'XAU/USD',
    price: '2,315.10',
    change: '+0.12%',
    fundingLong: '0.0100%',
    fundingShort: '-0.0100%',
    oi: '125.4M',
    maxOi: '500M',
    longRatio: 65,
    vol24h: '842.5M'
  };

  return (
    <div style={{
      background: 'var(--panel-bg)',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      borderBottom: '1px solid var(--border-color)',
      borderRadius: '0px',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: '100%'
    }}>
      {/* Top Ticker Selector & Main Price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        {/* Left: Ticker selector */}
        <div 
          onClick={onOpenMarket}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            cursor: 'pointer'
          }}
        >
          <div style={{ 
            width: '22px', 
            height: '22px', 
            background: goldAccent, 
            borderRadius: '5px', 
            color: '#000', 
            fontWeight: 'bold', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '12px'
          }}>
            G
          </div>
          <span style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
            {stats.ticker}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--text-grey)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </span>
        </div>

        {/* Right: Main Price (Larger font size) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)', lineHeight: '1.1' }}>
            ${stats.price}
          </span>
        </div>
      </div>

      {activeView !== 'positions' && (
        <>
          <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '2px 0' }} />

          {/* Horizontal Scrolling Stats grid for clean fit */}
          <div style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            <style>{`
              .mobile-scroll-stats::-webkit-scrollbar { display: none; }
            `}</style>
            
            <div className="mobile-scroll-stats" style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Funding L/S</span>
                <span style={{ fontSize: '10px', fontFamily: 'Source Code Pro, monospace', fontWeight: '500' }}>
                  <span style={{ color: '#ef4444' }}>{stats.fundingLong}</span>
                  <span style={{ color: 'var(--text-grey)', margin: '0 2px' }}>/</span>
                  <span style={{ color: '#3b82f6' }}>{stats.fundingShort}</span>
                </span>
              </div>

              <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)', alignSelf: 'center' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Open Interest</span>
                <span style={{ fontSize: '10px', fontFamily: 'Source Code Pro, monospace', fontWeight: '500' }}>
                  {stats.oi} <span style={{ color: 'var(--text-grey)', fontSize: '8px' }}>/ {stats.maxOi}</span>
                </span>
              </div>

              <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)', alignSelf: 'center' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Long/Short Ratio</span>
                <span style={{ fontSize: '10px', fontFamily: 'Source Code Pro, monospace', fontWeight: '500' }}>
                  <span style={{ color: '#3b82f6' }}>{stats.longRatio}%</span>
                  <span style={{ color: 'var(--text-grey)', margin: '0 2px' }}>/</span>
                  <span style={{ color: '#ef4444' }}>{100 - stats.longRatio}%</span>
                </span>
              </div>

              <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)', alignSelf: 'center' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>24h Volume</span>
                <span style={{ fontSize: '10px', fontFamily: 'Source Code Pro, monospace', fontWeight: '500' }}>
                  ${stats.vol24h}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 2. MOBILE POSITIONS (Trades & Orders Card List)
// ----------------------------------------------------
export function MobilePositions({ onManagePosition, isFullPage = false }) {
  const [activeTab, setActiveTab] = useState('open');

  const positions = [
    { id: '#8492', asset: 'XAU/USD', side: 'Long', size: '$25,000', leverage: '50x', collateral: '$500', liqPrice: '$2,285.50', sl: '$2,300.00', tp: '$2,350.00', marketPrice: '$2,315.10', pnlUsd: '+$125.40', pnlPct: '+25.08%' },
    { id: '#8493', asset: 'BTC/USDC', side: 'Short', size: '$12,500', leverage: '25x', collateral: '$500', liqPrice: '$84,200', sl: '$82,000', tp: '$75,000', marketPrice: '$79,048', pnlUsd: '+$340.20', pnlPct: '+68.04%' },
  ];

  const orders = [
    { id: '#7102', asset: 'SOL/USDC', side: 'Long', size: '$5,000', leverage: '10x', collateral: '$500', liqPrice: '$124.50', sl: '$130.00', tp: '$180.00', orderPrice: '$145.00', status: 'Pending' },
    { id: '#7105', asset: 'ETH/USDC', side: 'Short', size: '$8,000', leverage: '20x', collateral: '$400', liqPrice: '$3,850', sl: '$3,600', tp: '$2,800', orderPrice: '$3,420', status: 'Pending' },
  ];

  const history = [
    { id: '#4421', asset: 'BTC/USDC', side: 'Long', size: '$10,000', leverage: '20x', collateral: '$500', liqPrice: '—', sl: '—', tp: '—', closePrice: '$68,400', pnlUsd: '+$840.00', pnlPct: '+168.00%' },
    { id: '#4398', asset: 'XAU/USD', side: 'Short', size: '$50,000', leverage: '100x', collateral: '$500', liqPrice: '—', sl: '—', tp: '—', closePrice: '$2,340.50', pnlUsd: '-$120.50', pnlPct: '-24.10%' },
  ];

  const currentList = activeTab === 'open' ? positions : activeTab === 'orders' ? orders : history;

  return (
    <div style={{
      background: 'var(--panel-bg)',
      borderTop: isFullPage ? 'none' : '1px solid var(--border-color)',
      borderLeft: 'none',
      borderRight: 'none',
      borderBottom: 'none',
      borderRadius: '0px',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: isFullPage ? '100%' : 'auto',
      flex: isFullPage ? 1 : 'none',
      overflow: 'hidden'
    }}>
      {/* Tabs Header */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        padding: '12px 12px 0px 12px',
        justifyContent: 'flex-start',
        gap: '16px',
        background: 'rgba(255,255,255,0.01)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {['open', 'orders', 'history'].map(tab => {
          const count = tab === 'open' ? positions.length : tab === 'orders' ? orders.length : history.length;
          const isActive = activeTab === tab;
          const labelText = tab === 'open' ? `Open (${count})` : tab === 'orders' ? `Orders (${count})` : `History (${count})`;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? goldAccent : 'transparent'}`,
                color: isActive ? 'var(--text-dark)' : 'var(--text-grey)',
                fontSize: '11px',
                fontWeight: '600',
                padding: '6px 0px 8px 0px',
                borderRadius: '0px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
            >
              {labelText}
            </button>
          );
        })}
      </div>

      {/* Cards List container */}
      <div style={{
        padding: '0 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0px',
        flexShrink: 0,
        maxHeight: 'none',
        overflow: 'visible'
      }}>
        {currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-grey)', fontSize: '11px' }}>
            NO ACTIVE ITEMS
          </div>
        ) : (
          currentList.map((item, idx) => (
            <div 
              key={idx}
              style={{
                background: 'transparent',
                borderBottom: idx !== currentList.length - 1 ? '1px solid var(--border-color)' : 'none',
                padding: '12px 0px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {/* Card Title Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.asset}</span>
                  <span style={{
                    fontSize: '8px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    background: item.side === 'Long' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: item.side === 'Long' ? '#3b82f6' : '#ef4444'
                  }}>
                    {item.side.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '10px', fontFamily: 'Source Code Pro', color: '#BC8961', fontWeight: 'bold' }}>
                    {item.leverage}
                  </span>
                </div>
                
                <span style={{ fontSize: '10px', fontFamily: 'Source Code Pro', color: 'var(--text-grey)' }}>
                  {item.id}
                </span>
              </div>

              {/* Grid Values */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px 12px',
                fontSize: '11px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-grey)' }}>Size:</span>
                  <span style={{ fontWeight: '500', fontFamily: 'Source Code Pro' }}>{item.size}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-grey)' }}>Collateral:</span>
                  <span style={{ fontWeight: '500', fontFamily: 'Source Code Pro' }}>{item.collateral}</span>
                </div>
                
                {activeTab === 'open' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Market Price:</span>
                      <span style={{ fontWeight: '500', fontFamily: 'Source Code Pro' }}>{item.marketPrice}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Liq. Price:</span>
                      <span style={{ color: '#ef4444', fontFamily: 'Source Code Pro', fontWeight: '500' }}>{item.liqPrice}</span>
                    </div>
                  </>
                )}

                {activeTab === 'orders' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Trigger Price:</span>
                      <span style={{ fontWeight: '500', fontFamily: 'Source Code Pro' }}>{item.orderPrice}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Status:</span>
                      <span style={{ color: goldAccent, fontWeight: 'bold' }}>{item.status}</span>
                    </div>
                  </>
                )}

                {activeTab === 'history' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Close Price:</span>
                      <span style={{ fontWeight: '500', fontFamily: 'Source Code Pro' }}>{item.closePrice}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Closed:</span>
                      <span style={{ color: 'var(--text-grey)', fontWeight: 'bold' }}>Settled</span>
                    </div>
                  </>
                )}
              </div>

              {/* SL / TP row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px dashed var(--border-color)',
                borderRadius: '6px',
                fontSize: '10px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-grey)', marginRight: '4px' }}>TP:</span>
                  <span style={{ color: '#3b82f6', fontFamily: 'Source Code Pro', fontWeight: '500' }}>{item.tp}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-grey)', marginRight: '4px' }}>SL:</span>
                  <span style={{ color: '#ef4444', fontFamily: 'Source Code Pro', fontWeight: '500' }}>{item.sl}</span>
                </div>
              </div>

              {/* PnL and Actions block */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '4px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.03)'
              }}>
                <div>
                  {(activeTab === 'open' || activeTab === 'history') && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>Unrealized PnL</span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        fontFamily: 'Source Code Pro',
                        color: item.pnlUsd.startsWith('+') ? '#3b82f6' : '#ef4444'
                      }}>
                        {item.pnlUsd} <span style={{ fontSize: '10px', fontWeight: '500' }}>({item.pnlPct})</span>
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {activeTab === 'open' && (
                    <>
                      <button
                        onClick={() => onManagePosition(item, 'collateral')}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-dark)',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          cursor: 'pointer'
                        }}
                      >
                        + MARGIN
                      </button>
                      <button
                        onClick={() => onManagePosition(item, 'close')}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${sellColor}`,
                          color: sellColor,
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          cursor: 'pointer'
                        }}
                      >
                        CLOSE
                      </button>
                    </>
                  )}
                  {activeTab === 'orders' && (
                    <button
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-dark)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        cursor: 'pointer'
                      }}
                    >
                      CANCEL
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 3. MOBILE ORDER PANEL (Long / Short Input Drawer)
// ----------------------------------------------------
export function MobileOrderPanel({ isOpen, onClose, initialSide = 'buy', isInline = false }) {
  const [side, setSide] = useState(initialSide);
  const [orderType, setOrderType] = useState('market');
  const [leverage, setLeverage] = useState(10);
  const [collateralAmount, setCollateralAmount] = useState('100');
  const [targetPrice, setTargetPrice] = useState('');
  const [sizeCurrency, setSizeCurrency] = useState('USD');
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [tpPrice, setTpPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');

  // Sync side with initialSide prop when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSide(initialSide);
    }
  }, [isOpen, initialSide]);

  if (!isOpen) return null;

  const askPrice = '2,315.10';
  const bidPrice = '2,314.90';
  const usdcBalance = '1,500.00';
  const selectedAsset = 'XAU';

  const minLeverageNum = 1;
  const maxLeverageNum = 100;
  const leverageStops = [2, 10, 25, 50, 100];

  const percentage = ((leverage - minLeverageNum) / (maxLeverageNum - minLeverageNum)) * 100;
  const sliderBackground = `linear-gradient(to right, ${goldAccent} ${percentage}%, var(--border-color) ${percentage}%)`;

  const collatNum = Number(collateralAmount || 0);
  const estimatedSizeUSDNum = collatNum * leverage;
  const displaySize = sizeCurrency === 'USD'
    ? estimatedSizeUSDNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (estimatedSizeUSDNum / 2315).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  const selectedSideColor = side === 'buy' ? buyColor : sellColor;
  const selectedSideBg = side === 'buy' ? buyColorBg : sellColorBg;

  const innerSheet = (
    <div style={{
      background: isInline ? 'transparent' : 'var(--bg-dark)',
      borderTop: isInline ? 'none' : '1px solid var(--border-color)',
      borderTopLeftRadius: isInline ? '0px' : '20px',
      borderTopRightRadius: isInline ? '0px' : '20px',
      padding: isInline ? '12px 8px' : '16px 12px',
      maxHeight: isInline ? '100%' : '85vh',
      height: isInline ? '100%' : 'auto',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: isInline ? 'none' : '0 -8px 30px rgba(0, 0, 0, 0.5)',
      width: '100%'
    }}>
      {/* Drag Handle indicator */}
      {!isInline && (
        <div style={{
          width: '40px',
          height: '4px',
          background: 'var(--border-color)',
          borderRadius: '2px',
          alignSelf: 'center',
          marginBottom: '4px'
        }} />
      )}

      {/* Drawer Header */}
      {!isInline && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-dark)', textTransform: 'uppercase' }}>
            Configure Order
          </h3>

          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-grey)',
              fontSize: '22px',
              lineHeight: '1',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            &times;
          </button>
        </div>
      )}

        {/* Long/Short Tabs */}
        <div style={{ 
          display: 'flex', 
          backgroundColor: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '8px', 
          padding: '3px', 
          border: '1px solid var(--border-color)' 
        }}>
          <div
            onClick={() => setSide('buy')}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              padding: '6px 8px', 
              cursor: 'pointer', 
              borderRadius: '6px', 
              alignItems: 'center',
              backgroundColor: side === 'buy' ? buyColorBg : 'transparent', 
              border: `1px solid ${side === 'buy' ? buyColor : 'transparent'}`, 
              transition: 'all 0.15s' 
            }}
          >
            <div style={{ color: side === 'buy' ? buyColor : 'var(--text-grey)', fontWeight: side === 'buy' ? 700 : 500, fontSize: '12px' }}>LONG</div>
            <div style={{ color: side === 'buy' ? buyColor : 'var(--text-grey)', fontSize: '10px', fontFamily: 'Source Code Pro, monospace' }}>{askPrice}</div>
          </div>
          <div
            onClick={() => setSide('sell')}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              padding: '6px 8px', 
              cursor: 'pointer', 
              borderRadius: '6px', 
              alignItems: 'center',
              backgroundColor: side === 'sell' ? sellColorBg : 'transparent', 
              border: `1px solid ${side === 'sell' ? sellColor : 'transparent'}`, 
              transition: 'all 0.15s' 
            }}
          >
            <div style={{ color: side === 'sell' ? sellColor : 'var(--text-grey)', fontWeight: side === 'sell' ? 700 : 500, fontSize: '12px' }}>SHORT</div>
            <div style={{ color: side === 'sell' ? sellColor : 'var(--text-grey)', fontSize: '10px', fontFamily: 'Source Code Pro, monospace' }}>{bidPrice}</div>
          </div>
        </div>

        {/* Order Types */}
        <div style={{ 
          display: 'flex', 
          backgroundColor: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '8px', 
          padding: '3px', 
          border: '1px solid var(--border-color)' 
        }}>
          {['market', 'limit', 'stop'].map(type => (
            <div
              key={type}
              onClick={() => setOrderType(type)}
              style={{
                flex: 1, 
                textAlign: 'center', 
                padding: '6px', 
                cursor: 'pointer', 
                borderRadius: '6px',
                backgroundColor: orderType === type ? goldAccentLight : 'transparent',
                color: orderType === type ? goldAccent : 'var(--text-grey)',
                border: `1px solid ${orderType === type ? goldAccent : 'transparent'}`,
                fontSize: '11px', 
                fontWeight: orderType === type ? 600 : 400, 
                textTransform: 'uppercase', 
                transition: 'all 0.15s'
              }}
            >
              {type}
            </div>
          ))}
        </div>

        {/* Target Price (Limit/Stop only) */}
        {orderType !== 'market' && (
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.02)', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)', 
            padding: '6px 10px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '2px' 
          }}>
            <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>
              {orderType} Price
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: goldAccent }}>
                {orderType === 'limit' ? (side === 'buy' ? '≤' : '≥') : (side === 'buy' ? '≥' : '≤')}
              </span>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-dark)', 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  width: '100%', 
                  fontWeight: '600', 
                  fontFamily: 'Source Code Pro, monospace' 
                }}
              />
            </div>
          </div>
        )}

        {/* Collateral Input */}
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)', 
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Collateral</span>
              <span 
                style={{ fontSize: '10px', color: goldAccent, fontWeight: 'bold', cursor: 'pointer' }} 
                onClick={() => setCollateralAmount('1500')}
              >
                MAX (Bal: {usdcBalance} USDC)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                type="number"
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
                style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-dark)', 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  padding: 0, 
                  width: '120px', 
                  fontWeight: 'bold',
                  fontFamily: 'Source Code Pro, monospace' 
                }}
              />
              <span style={{ fontWeight: '600', fontSize: '11px', color: 'var(--text-dark)' }}>
                USDC
              </span>
            </div>
          </div>

          {/* Size Indicator */}
          <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Estimated Size</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace' }}>
                {displaySize}
              </span>
            </div>
            <button
              onClick={() => setSizeCurrency(prev => prev === 'USD' ? 'ASSET' : 'USD')}
              style={{ 
                border: `1px solid ${goldAccent}`, 
                background: goldAccentLight, 
                color: goldAccent, 
                padding: '4px 8px', 
                borderRadius: '4px', 
                fontSize: '10px', 
                fontWeight: 'bold',
                cursor: 'pointer' 
              }}
            >
              {sizeCurrency === 'USD' ? 'USD' : selectedAsset}
            </button>
          </div>
        </div>

        {/* Leverage Slider */}
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)', 
          padding: '8px 10px', 
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Leverage</span>
            <span style={{ color: goldAccent, fontWeight: 'bold', fontSize: '12px', fontFamily: 'Source Code Pro, monospace' }}>{leverage}x</span>
          </div>
          <input
            type="range"
            min={minLeverageNum}
            max={maxLeverageNum}
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            style={{ 
              width: '100%', 
              background: sliderBackground, 
              accentColor: goldAccent, 
              height: '4px',
              borderRadius: '2px',
              cursor: 'pointer' 
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', gap: '4px' }}>
            {leverageStops.map(lev => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                style={{
                  flex: 1, 
                  padding: '4px 0', 
                  fontSize: '9px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: leverage === lev ? goldAccentLight : 'rgba(255,255,255,0.02)',
                  color: leverage === lev ? goldAccent : 'var(--text-grey)',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* TP / SL Toggle and Fields */}
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)', 
          padding: '8px 10px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px' 
        }}>
          <div 
            onClick={() => setTpSlEnabled(!tpSlEnabled)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-dark)', fontWeight: 'bold' }}>Take Profit / Stop Loss</span>
            <div style={{ 
              width: '28px', 
              height: '14px', 
              backgroundColor: tpSlEnabled ? goldAccent : 'rgba(255,255,255,0.1)', 
              borderRadius: '8px', 
              position: 'relative',
              transition: 'all 0.2s'
            }}>
              <div style={{ 
                width: '10px', 
                height: '10px', 
                backgroundColor: '#fff', 
                borderRadius: '50%', 
                position: 'absolute',
                top: '2px',
                left: tpSlEnabled ? '16px' : '2px',
                transition: 'all 0.2s'
              }} />
            </div>
          </div>

          {tpSlEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>TAKE PROFIT</span>
                <input 
                  type="number"
                  value={tpPrice}
                  onChange={(e) => setTpPrice(e.target.value)}
                  placeholder="Target Price"
                  style={{ 
                    width: '100%', 
                    backgroundColor: 'rgba(0,0,0,0.2)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '4px', 
                    padding: '5px', 
                    color: 'var(--text-dark)', 
                    fontSize: '11px', 
                    outline: 'none', 
                    fontFamily: 'Source Code Pro, monospace' 
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>STOP LOSS</span>
                <input 
                  type="number"
                  value={slPrice}
                  onChange={(e) => setSlPrice(e.target.value)}
                  placeholder="Stop Price"
                  style={{ 
                    width: '100%', 
                    backgroundColor: 'rgba(0,0,0,0.2)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '4px', 
                    padding: '5px', 
                    color: 'var(--text-dark)', 
                    fontSize: '11px', 
                    outline: 'none', 
                    fontFamily: 'Source Code Pro, monospace' 
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Metric Details list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', padding: '0 2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-grey)' }}>Liquidation Price</span>
            <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro' }}>
              {side === 'buy'
                ? (2315 * (1 - 0.9 / leverage)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : (2315 * (1 + 0.9 / leverage)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              }
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-grey)' }}>Exposure Size</span>
            <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro' }}>
              ${estimatedSizeUSDNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-grey)' }}>Total Fees</span>
            <span style={{ color: goldAccent, fontFamily: 'Source Code Pro', fontWeight: 'bold' }}>
              ~$0.54
            </span>
          </div>
        </div>

        {/* Large Action Submit Button */}
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'var(--gold)',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px',
            fontWeight: '900',
            cursor: 'pointer',
            textAlign: 'center',
            marginTop: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          {side === 'buy' ? 'Go Long' : 'Go Short'}
        </button>
      </div>
  );

  if (isInline) return innerSheet;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }}>
      {/* Tap outside to close spacer */}
      <div style={{ flex: 1 }} onClick={onClose} />
      {innerSheet}
    </div>
  );
}

// ----------------------------------------------------
// 4. MOBILE POSITION MANAGER (Details & Edit Modal)
// ----------------------------------------------------
export function MobilePositionManager({ isOpen, onClose, position, initialTab = 'close' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [closeAmount, setCloseAmount] = useState(100);
  const [tpValue, setTpValue] = useState('');
  const [slValue, setSlValue] = useState('');
  const [marginAction, setMarginAction] = useState('add');
  const [marginAmount, setMarginAmount] = useState('');

  // Sync initial state when position/isOpen changes
  useEffect(() => {
    if (isOpen && position) {
      setTpValue(position.tp?.replace('$', '') || '');
      setSlValue(position.sl?.replace('$', '') || '');
    }
  }, [isOpen, position]);

  // Sync tab when opened via specific quick buttons
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !position) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      {/* Modal Card container */}
      <div style={{
        background: 'var(--bg-dark)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '440px',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
      }}>
        
        {/* Header Block */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{position.asset}</span>
            <span style={{
              fontSize: '8px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 'bold',
              background: position.side === 'Long' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: position.side === 'Long' ? '#3b82f6' : '#ef4444'
            }}>
              {position.side.toUpperCase()}
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-grey)',
              fontSize: '22px',
              cursor: 'pointer',
              lineHeight: '1',
              padding: '2px'
            }}
          >
            &times;
          </button>
        </div>

        {/* Quick Position Status */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.01)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Unrealized PnL</span>
            <span style={{ 
              fontSize: '15px', 
              fontWeight: 'bold', 
              fontFamily: 'Source Code Pro',
              color: position.pnlUsd.startsWith('+') ? '#3b82f6' : '#ef4444' 
            }}>
              {position.pnlUsd} <span style={{ fontSize: '11px', fontWeight: '500' }}>({position.pnlPct})</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Collateral</span>
            <span style={{ fontSize: '12px', fontWeight: '600', fontFamily: 'Source Code Pro' }}>
              {position.collateral}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.1)'
        }}>
          {['close', 'collateral', 'tpsl'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '6px 0',
                fontSize: '10px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                borderRadius: '6px',
                cursor: 'pointer',
                background: activeTab === tab ? goldAccentLight : 'transparent',
                color: activeTab === tab ? goldAccent : 'var(--text-grey)',
                border: `1px solid ${activeTab === tab ? goldAccent : 'transparent'}`
              }}
            >
              {tab === 'collateral' ? 'Margin' : tab === 'tpsl' ? 'TP/SL' : 'Close'}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div style={{ padding: '16px', flex: 1, minHeight: '180px' }}>
          
          {activeTab === 'close' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Close Percentage</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: goldAccent, fontFamily: 'Source Code Pro' }}>{closeAmount}%</span>
              </div>
              <input
                type="range" min="1" max="100" value={closeAmount} onChange={e => setCloseAmount(Number(e.target.value))}
                style={{ width: '100%', accentColor: goldAccent, height: '4px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                {[25, 50, 75, 100].map(p => (
                  <button
                    key={p} onClick={() => setCloseAmount(p)}
                    style={{ 
                      flex: 1, 
                      padding: '4px', 
                      fontSize: '9px', 
                      background: closeAmount === p ? goldAccentLight : 'rgba(255,255,255,0.02)', 
                      border: `1px solid ${closeAmount === p ? goldAccent : 'var(--border-color)'}`, 
                      borderRadius: '4px', 
                      color: closeAmount === p ? goldAccent : 'var(--text-grey)', 
                      cursor: 'pointer',
                      fontWeight: 'bold' 
                    }}
                  >{p}%</button>
                ))}
              </div>
              <div style={{ 
                padding: '10px', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '6px', 
                fontSize: '10px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '6px', 
                marginTop: '6px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-grey)' }}>Closing size</span>
                  <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro' }}>
                    ${(closeAmount / 100 * parseFloat(position.size.replace('$', '').replace(',', ''))).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-grey)' }}>Estimated Return</span>
                  <span style={{ color: goldAccent, fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>
                    ${(closeAmount / 100 * (parseFloat(position.collateral.replace('$', '')) + parseFloat(position.pnlUsd.replace('$', '').replace('+', '')))).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'collateral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ 
                display: 'flex', 
                gap: '4px', 
                background: 'rgba(255,255,255,0.02)', 
                padding: '3px', 
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}>
                <button 
                  onClick={() => setMarginAction('add')} 
                  style={{ 
                    flex: 1, padding: '5px', fontSize: '10px', fontWeight: 'bold',
                    background: marginAction === 'add' ? goldAccentLight : 'transparent', 
                    border: `1px solid ${marginAction === 'add' ? goldAccent : 'transparent'}`, 
                    borderRadius: '4px', color: marginAction === 'add' ? goldAccent : 'var(--text-grey)', 
                    cursor: 'pointer' 
                  }}
                >ADD MARGIN</button>
                <button 
                  onClick={() => setMarginAction('remove')} 
                  style={{ 
                    flex: 1, padding: '5px', fontSize: '10px', fontWeight: 'bold',
                    background: marginAction === 'remove' ? goldAccentLight : 'transparent', 
                    border: `1px solid ${marginAction === 'remove' ? goldAccent : 'transparent'}`, 
                    borderRadius: '4px', color: marginAction === 'remove' ? goldAccent : 'var(--text-grey)', 
                    cursor: 'pointer' 
                  }}
                >REMOVE MARGIN</button>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Amount</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>Bal: 1,500 USDC</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input
                    type="number" value={marginAmount} onChange={e => setMarginAmount(e.target.value)} placeholder="0.00"
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-dark)', fontSize: '18px', fontWeight: 'bold', fontFamily: 'Source Code Pro', width: '70%' }}
                  />
                  <span style={{ fontWeight: 'bold', fontSize: '11px', color: 'var(--text-dark)' }}>USDC</span>
                </div>
              </div>
              <div style={{ 
                padding: '10px', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '6px', 
                fontSize: '10px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '6px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-grey)' }}>New Leverage</span>
                  <span style={{ color: goldAccent, fontWeight: 'bold' }}>{marginAction === 'add' ? '42x' : '58x'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-grey)' }}>New Liq. Price</span>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{marginAction === 'add' ? '$2,105.20' : '$2,350.40'}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tpsl' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>TAKE PROFIT</span>
                <input
                  type="number" value={tpValue} onChange={e => setTpValue(e.target.value)} placeholder="Target Price"
                  style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', color: 'var(--text-dark)', fontSize: '12px', outline: 'none', fontFamily: 'Source Code Pro' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>STOP LOSS</span>
                <input
                  type="number" value={slValue} onChange={e => setSlValue(e.target.value)} placeholder="Stop Price"
                  style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', color: 'var(--text-dark)', fontSize: '12px', outline: 'none', fontFamily: 'Source Code Pro' }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Submit Actions Button */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
          <button
            onClick={onClose}
            style={{ 
              width: '100%', 
              padding: '10px', 
              background: goldAccent, 
              border: 'none', 
              borderRadius: '6px', 
              color: '#fff', 
              fontWeight: 'bold', 
              fontSize: '12px', 
              cursor: 'pointer', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {activeTab === 'close' ? `Close ${closeAmount}% Position` : activeTab === 'collateral' ? `${marginAction === 'add' ? 'Add' : 'Remove'} Margin` : 'Update TP/SL'}
          </button>
        </div>
      </div>
    </div>
  );
}
