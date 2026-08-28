import { useState, useMemo, useEffect } from 'react';
import { useMarketData } from '../context/MarketDataContext';
import { api } from '../services/api';

export default function Ticker() {
  const { marketsList: contextMarkets, network } = useMarketData();
  const [localMarkets, setLocalMarkets] = useState([]);
  const [viewMode, setViewMode] = useState('winners'); // 'winners' | 'losers'
  
  // Utilise les marchés du context s'ils existent, sinon ceux chargés localement
  const markets = (contextMarkets && contextMarkets.length > 0) ? contextMarkets : localMarkets;

  // Récupération de secours via l'endpoint configuré dans api.js (qui utilise VITE_API_BASE_URL)
  useEffect(() => {
    let isMounted = true;
    const fetchMarkets = async () => {
      try {
        const res = await api.getMarkets(network || 'testnet');
        if (isMounted && res && Array.isArray(res.markets)) {
          setLocalMarkets(res.markets);
        }
      } catch (err) {
        console.warn("Ticker failed to fetch markets:", err);
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

  const toggleMode = () => {
    setViewMode(prev => prev === 'winners' ? 'losers' : 'winners');
  };

  // Icons
  const UpArrow = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );

  const DownArrow = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );

  // Nettoyage du préfixe de symbole :
  // "Equity.US.AAPL/USD" => "AAPL/USD"
  // "Metal.XAU/USD" => "XAU/USD"
  // "FX.EUR/USD" => "EUR/USD"
  // "Crypto.BTC/USD" => "BTC/USD"
  const cleanSymbol = (rawSymbol) => {
    if (!rawSymbol) return '';
    const parts = rawSymbol.split('.');
    return parts[parts.length - 1];
  };

  // Tri des marchés :
  // - Winners : tous les marchés triés du plus grand % au plus petit %
  // - Losers : tous les marchés triés du plus petit % au plus grand %
  const displayedMarkets = useMemo(() => {
    if (!markets || markets.length === 0) return [];

    const mapped = markets.map(m => {
      const dayVal = typeof m.dayChangePercent === 'number' ? m.dayChangePercent : (typeof m.change24h === 'number' ? m.change24h : 0);
      const weekVal = typeof m.weekChangePercent === 'number' ? m.weekChangePercent : 0;
      const hourVal = typeof m.hourChangePercent === 'number' ? m.hourChangePercent : 0;
      const change = dayVal !== 0 ? dayVal : (weekVal !== 0 ? weekVal : hourVal);

      const symbol = cleanSymbol(m.symbol || m.display_symbol || m.name);

      return {
        symbol,
        change,
        changeFormatted: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        isUp: change >= 0
      };
    }).filter(m => Boolean(m.symbol));

    const list = [...mapped];

    if (viewMode === 'winners') {
      return list.sort((a, b) => b.change - a.change);
    } else {
      return list.sort((a, b) => a.change - b.change);
    }
  }, [markets, viewMode]);

  const theme = viewMode === 'winners' 
    ? { color: 'var(--color-blue)', bg: 'var(--color-blue-glow)', label: 'TOP WINNERS', icon: <UpArrow /> }
    : { color: 'var(--color-red)', bg: 'var(--color-red-glow)', label: 'TOP LOSERS', icon: <DownArrow /> };

  return (
    <div className="ticker panel" style={{ 
      height: '40px', 
      background: 'var(--panel-bg)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      padding: '0 10px',
      overflow: 'hidden'
    }}>
      {/* Toggle Button - Seulement 2 modes : TOP WINNERS et TOP LOSERS */}
      <button 
        onClick={toggleMode}
        style={{
          background: theme.bg,
          border: 'none',
          color: theme.color,
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '6px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginRight: '20px',
          flexShrink: 0,
          transition: 'all 0.2s'
        }}
      >
        <span style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>{theme.icon}</span>
        {theme.label}
      </button>

      {/* Liste Défilante des Actifs Réels */}
      <div 
        className="ticker-scroll"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '20px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <style>{`
          .ticker-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {displayedMarkets.length === 0 ? (
          <span style={{ color: 'var(--text-grey)', fontSize: '10px' }}>Loading markets...</span>
        ) : (
          displayedMarkets.map((asset, index) => {
            const itemColor = asset.isUp ? 'var(--color-blue)' : 'var(--color-red)';

            return (
              <div 
                key={`${asset.symbol}-${index}`} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: '8px', 
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <span style={{ color: 'var(--text-grey)', fontSize: '10px', fontWeight: '600' }}>
                  {asset.symbol}
                </span>
                <span style={{ 
                  color: itemColor, 
                  fontSize: '10px', 
                  fontWeight: 'bold',
                  fontFamily: 'Source Code Pro, monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {asset.isUp ? <UpArrow /> : <DownArrow />}
                  {asset.changeFormatted}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
