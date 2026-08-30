import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';
import { useMarketData } from '../../context/MarketDataContext';
import { api } from '../../services/api';
import BrokexLogo from '../../components/BrokexLogo';

const cleanSymbol = (rawSymbol) => {
  if (!rawSymbol) return '';
  const parts = rawSymbol.split('.');
  return parts[parts.length - 1];
};

export default function MobileLayout({ children, disablePadding = false }) {
  const { marketsList: contextMarkets, network } = useMarketData();
  const [localMarkets, setLocalMarkets] = useState([]);
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();

  const [isLightMode, setIsLightMode] = useState(
    document.body.classList.contains('light-mode')
  );

  const markets = (contextMarkets && contextMarkets.length > 0) ? contextMarkets : localMarkets;

  useEffect(() => {
    let isMounted = true;
    const fetchMarkets = async () => {
      try {
        const res = await api.getMarkets(network || 'testnet');
        if (isMounted && res && Array.isArray(res.markets)) {
          setLocalMarkets(res.markets);
        }
      } catch (err) {
        console.warn("Mobile ticker failed to fetch markets:", err);
      }
    };

    if (!contextMarkets || contextMarkets.length === 0) {
      fetchMarkets();
    }
    const interval = setInterval(fetchMarkets, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [network, contextMarkets]);

  const tickerItems = useMemo(() => {
    if (!markets || markets.length === 0) return [];

    return markets.map((m) => {
      const dayVal = typeof m.dayChangePercent === 'number' ? m.dayChangePercent : (typeof m.change24h === 'number' ? m.change24h : 0);
      const weekVal = typeof m.weekChangePercent === 'number' ? m.weekChangePercent : 0;
      const hourVal = typeof m.hourChangePercent === 'number' ? m.hourChangePercent : 0;

      const changeVal = dayVal !== 0 ? dayVal : (weekVal !== 0 ? weekVal : hourVal);
      const symbol = cleanSymbol(m.symbol || m.display_symbol || m.name);

      return {
        symbol,
        change: `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(2)}%`,
        isUp: changeVal >= 0
      };
    }).filter(item => Boolean(item.symbol));
  }, [markets]);

  const toggleTheme = () => {
    const newMode = !isLightMode;
    setIsLightMode(newMode);
    document.body.classList.toggle('light-mode');
  };

  const handleWalletClick = () => {
    if (isConnected) {
      if (openAccountModal) openAccountModal();
    } else {
      if (openConnectModal) openConnectModal();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100dvh', // Use 100dvh for modern mobile devices to avoid bottom bar clipping
      backgroundColor: 'var(--bg-dark)',
      color: 'var(--text-dark)',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      <style>{`
        html, body, #root {
          height: 100dvh !important;
          overflow: hidden !important;
        }

        @keyframes ticker-marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }

        .mobile-ticker-container {
          flex: 1;
          margin: 0 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          height: 100%;
          mask-image: linear-gradient(to right, transparent, white 15%, white 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, white 15%, white 85%, transparent);
        }

        .mobile-ticker-track {
          display: flex;
          gap: 24px;
          animation: ticker-marquee 50s linear infinite;
          white-space: nowrap;
        }

        .mobile-ticker-track:hover {
          animation-play-state: paused;
        }

        .mobile-ticker-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-family: 'Source Code Pro', monospace;
          font-weight: bold;
        }

        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 44px;
          padding: 0 8px;
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(20px);
          z-index: 1000;
        }

        body.light-mode .mobile-header {
          background: rgba(255, 255, 255, 0.85);
        }

        .mobile-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .mobile-logo-text {
          font-size: 14px;
          font-weight: 900;
          color: var(--text-dark);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .mobile-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .mobile-action-btn {
          background: transparent;
          border: none;
          color: var(--text-grey);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .mobile-action-btn:active {
          background: rgba(200, 169, 126, 0.1);
          color: var(--gold);
        }

        .mobile-wallet-btn {
          background: #BC8961;
          color: #000000;
          border: 1px solid #BC8961;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(188, 137, 97, 0.3);
        }

        .mobile-wallet-btn:active {
          transform: scale(0.96);
        }

        .mobile-wallet-btn.connected {
          background: rgba(188, 137, 97, 0.12);
          color: #BC8961;
          border: 1px solid rgba(188, 137, 97, 0.4);
          box-shadow: none;
          font-family: 'Source Code Pro', monospace;
          font-weight: 600;
        }

        .mobile-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>

      {/* Premium Top Navigation Bar */}
      <header className="mobile-header">
        {/* Left: Logo Only */}
        <Link to="/" className="mobile-logo" style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <BrokexLogo size={22} color="var(--gold)" />
        </Link>

        {/* Center: Gliding price ticker marquee */}
        <div className="mobile-ticker-container">
          <div className="mobile-ticker-track">
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <div key={idx} className="mobile-ticker-item">
                <span style={{ color: 'var(--text-grey)' }}>[</span>
                <span style={{ color: 'var(--text-dark)' }}>{item.symbol}</span>
                <span style={{ color: 'var(--text-grey)' }}>]</span>
                <span style={{ color: item.isUp ? 'var(--color-blue)' : 'var(--color-red)', marginLeft: '3px' }}>{item.change}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions (Theme Toggle + Wallet Connect) */}
        <div className="mobile-header-actions" style={{ flexShrink: 0 }}>
          {/* Theme Toggle */}
          <button className="mobile-action-btn" onClick={toggleTheme}>
            {isLightMode ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            )}
          </button>

          {/* Wallet Button */}
          <button
            className={`mobile-wallet-btn ${isConnected ? 'connected' : ''}`}
            onClick={handleWalletClick}
            style={{ fontWeight: '500' }}
          >
            {isConnected && address ? `${address.slice(0, 4)}...${address.slice(-2)}` : 'Connect'}
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main
        className="mobile-content"
        style={disablePadding ? {
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 0
        } : {}}
      >
        {children}
      </main>
    </div>
  );
}
