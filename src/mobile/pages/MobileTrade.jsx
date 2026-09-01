import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import Chart from '../../components/Chart';
import MobileLayout from '../components/MobileLayout';
import MobilePortfolio from './MobilePortfolio';
import WelcomePromoModal from '../../components/WelcomePromoModal';
import { 
  MobilePositions,
  MobileOrderPanel, 
  MobilePositionManager,
  MobileTradeHeader,
  MobileTopNav
} from '../components/MobileTradeComponents';

import { useMarketData } from '../../context/MarketDataContext';

const cleanSymbol = (rawSymbol) => {
  if (!rawSymbol) return '';
  const parts = rawSymbol.split('.');
  return parts[parts.length - 1];
};

const defaultMarketsData = [
  // CRYPTO
  { symbol: 'BTC/USD', price: '78,207.00', change: '-1.10%', volume: '$1.64B', leverage: '40x', category: 'Crypto', logo: 'BTC', company: 'Bitcoin / USD CFD' },
  { symbol: 'ETH/USD', price: '2,180.50', change: '-1.74%', volume: '$592.5M', leverage: '25x', category: 'Crypto', logo: 'ETH', company: 'Ethereum / USD CFD' },
  { symbol: 'SOL/USD', price: '142.12', change: '+2.85%', volume: '$452.1M', leverage: '20x', category: 'Crypto', logo: 'SOL', company: 'Solana / USD CFD' },
  
  // COMMODITIES
  { symbol: 'XAU/USD', price: '2,315.10', change: '+0.45%', volume: '$452.0M', leverage: '50x', category: 'Commodities', logo: 'XAU', company: 'Gold / US Dollar CFD' },
  { symbol: 'XAG/USD', price: '28.45', change: '-0.21%', volume: '$104.0M', leverage: '20x', category: 'Commodities', logo: 'XAG', company: 'Silver / US Dollar CFD' },
  { symbol: 'WTI/USD', price: '82.45', change: '+0.15%', volume: '$85.0M', leverage: '20x', category: 'Commodities', logo: 'WTI', company: 'Crude Oil / US Dollar CFD' },

  // FOREX
  { symbol: 'EUR/USD', price: '1.0842', change: '+0.12%', volume: '$12.4B', leverage: '100x', category: 'Forex', logo: 'EUR', company: 'Euro / US Dollar CFD' },
  { symbol: 'GBP/USD', price: '1.2645', change: '-0.08%', volume: '$8.1B', leverage: '100x', category: 'Forex', logo: 'GBP', company: 'Pound / US Dollar CFD' },
  { symbol: 'USD/JPY', price: '149.52', change: '+0.34%', volume: '$15.2B', leverage: '100x', category: 'Forex', logo: 'JPY', company: 'US Dollar / Yen CFD' },
  
  // STOCKS
  { symbol: 'AAPL/USD', price: '189.45', change: '+0.24%', volume: '$1.2B', leverage: '10x', category: 'Stocks', logo: 'AAPL', company: 'Apple Inc. CFD' },
  { symbol: 'META/USD', price: '502.12', change: '-0.45%', volume: '$840.0M', leverage: '10x', category: 'Stocks', logo: 'META', company: 'Meta Platforms Inc. CFD' },
  { symbol: 'MSFT/USD', price: '415.67', change: '+0.51%', volume: '$950.0M', leverage: '10x', category: 'Stocks', logo: 'MSFT', company: 'Microsoft Corporation CFD' },
];

const categories = ['All', 'Crypto', 'Commodities', 'Forex', 'Stocks'];

export default function MobileTrade() {
  const { marketsList } = useMarketData();
  const navigate = useNavigate();
  const location = useLocation();

  // Primary active tab switcher: 'markets', 'trade', 'portfolio'
  // On first load, land directly on 'trade' (Order Panel), unless path is /portfolio or /markets
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname === '/portfolio') return 'portfolio';
    if (location.pathname === '/markets') return 'markets';
    return 'trade';
  });

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  // State to manage Market selection overlay/subview inside Markets tab
  const [isMarketSelectorOpen, setIsMarketSelectorOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPair, setSelectedPair] = useState(() => {
    return localStorage.getItem('brokex_selected_pair') || 'XAU/USD';
  });

  // Position Manager Modal State (for Portfolio positions)
  const [isPosManagerOpen, setIsPosManagerOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [posManagerTab, setPosManagerTab] = useState('close');

  // Floating button visibility on scroll
  const [showFloatingTradeBtn, setShowFloatingTradeBtn] = useState(true);

  const handleMarketsScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 40) {
      setShowFloatingTradeBtn(false);
    } else {
      setShowFloatingTradeBtn(true);
    }
  };

  const handleSelectMarket = (symbol) => {
    setSelectedPair(symbol);
    localStorage.setItem('brokex_selected_pair', symbol);
    window.dispatchEvent(new Event('brokex_pair_changed'));
    setIsMarketSelectorOpen(false);
  };

  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const handleFloatingAction = () => {
    if (!isConnected) {
      if (openConnectModal) openConnectModal();
    } else {
      handleTabChange('trade');
    }
  };

  const handleManagePosition = (position, tab) => {
    setSelectedPosition(position);
    setPosManagerTab(tab);
    setIsPosManagerOpen(true);
  };

  const formattedMarkets = useMemo(() => {
    if (!marketsList || marketsList.length === 0) return defaultMarketsData;

    return marketsList.map(m => {
      const sym = cleanSymbol(m.symbol || m.display_symbol || m.name);
      const dayVal = typeof m.dayChangePercent === 'number' ? m.dayChangePercent : (typeof m.change24h === 'number' ? m.change24h : 0);
      const weekVal = typeof m.weekChangePercent === 'number' ? m.weekChangePercent : 0;
      const hourVal = typeof m.hourChangePercent === 'number' ? m.hourChangePercent : 0;
      const changeVal = dayVal !== 0 ? dayVal : (weekVal !== 0 ? weekVal : hourVal);
      const priceStr = typeof m.price === 'number'
        ? m.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: m.price < 10 ? 4 : 2 })
        : (m.price || '0.00');

      let category = 'Crypto';
      const catLower = (m.category || '').toLowerCase();
      if (catLower.includes('metal') || catLower.includes('commodity') || sym.startsWith('XAU') || sym.startsWith('XAG') || sym.startsWith('WTI')) {
        category = 'Commodities';
      } else if (catLower.includes('fx') || catLower.includes('forex') || sym.startsWith('EUR') || sym.startsWith('GBP') || sym.startsWith('USD')) {
        category = 'Forex';
      } else if (catLower.includes('stock') || catLower.includes('equity') || sym.startsWith('AAPL') || sym.startsWith('META') || sym.startsWith('MSFT')) {
        category = 'Stocks';
      }

      const logo = sym.split('/')[0].slice(0, 4);

      return {
        symbol: sym,
        price: priceStr,
        change: `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(2)}%`,
        volume: m.volume24h ? `$${m.volume24h}` : '$452.0M',
        leverage: m.maxLeverage ? `${m.maxLeverage}x` : '50x',
        category,
        logo,
        company: m.name ? `${m.name} CFD` : `${sym} CFD`
      };
    });
  }, [marketsList]);

  const filteredMarkets = useMemo(() => {
    if (activeCategory === 'All') return formattedMarkets;
    return formattedMarkets.filter(m => m.category === activeCategory);
  }, [activeCategory, formattedMarkets]);

  const activeMarketInfo = useMemo(() => {
    const market = formattedMarkets.find(m => m.symbol === selectedPair || m.symbol.replace('/', '-') === selectedPair.replace('/', '-'));
    if (market) return market;
    return { symbol: 'XAU/USD', price: '2,315.10', change: '+0.45%', volume: '$452.0M', leverage: '50x', logo: 'XAU', company: 'Gold / US Dollar CFD' };
  }, [selectedPair, formattedMarkets]);

  return (
    <MobileLayout disablePadding={true}>
      <style>{`
        .mobile-main-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 100%;
        }
        
        .mobile-chart-area {
          flex: 1;
          background: var(--panel-bg);
          overflow: hidden;
          position: relative;
        }

        .chart.panel {
          border-radius: 0px !important;
          border-left: none !important;
          border-right: none !important;
        }

        /* Premium Bottom Tab Bar styling */
        .mobile-bottom-tabs {
          display: flex;
          background: rgba(10, 10, 10, 0.92);
          backdrop-filter: blur(25px);
          border-top: 1px solid var(--border-color);
          height: 46px;
          padding-bottom: env(safe-area-inset-bottom, 0);
          align-items: center;
          justify-content: space-around;
          z-index: 1000;
          flex-shrink: 0;
        }

        body.light-mode .mobile-bottom-tabs {
          background: rgba(255, 255, 255, 0.92);
        }

        .mobile-tab-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          color: var(--text-grey);
          cursor: pointer;
          gap: 6px;
          flex: 1;
          height: 100%;
          transition: all 0.2s ease;
          border: none;
          background: transparent;
          outline: none;
        }

        .mobile-tab-item.active {
          color: var(--gold);
        }

        .mobile-tab-label {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .market-list-card:active {
          transform: scale(0.98);
          background: rgba(200, 169, 126, 0.04);
        }

        /* Hide scrollbars across the app for ultra-clean mobile feeling */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Main viewport */}
      <main className="mobile-main-container">
        
        {/* TAB 1: MARKETS VIEW (CHART + DETAILS + POSITIONS) */}
        {activeTab === 'markets' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
            {/* Unified Chart + Ticker stats + Positions scrollable container */}
            <div 
              className="no-scrollbar" 
              onScroll={handleMarketsScroll}
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                backgroundColor: 'var(--bg-dark)',
                padding: '8px',
                paddingBottom: '84px',
                gap: '2px',
                position: 'relative'
              }}
            >
                
                {/* CARD 1: Unified TradeHeader + Metrics Stats + Chart (看起来像一个整体 div) */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  backgroundColor: 'var(--panel-bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  flexShrink: 0
                }}>
                  {/* Unified Header & Market Stats Row */}
                  <MobileTopNav 
                    activeMarketInfo={activeMarketInfo} 
                    setIsMarketSelectorOpen={setIsMarketSelectorOpen} 
                  />

                  {/* 3. Chart Container */}
                  <div style={{ height: '320px', width: '100%', overflow: 'hidden' }}>
                    <Chart />
                  </div>
                </div>

                {/* CARD 2: Positions Section Card */}
                <div style={{ 
                  flexShrink: 0, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  width: '100%',
                  backgroundColor: 'var(--panel-bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}>
                  <MobilePositions 
                    onManagePosition={handleManagePosition} 
                    isFullPage={false} 
                  />
                </div>

              </div>

            {/* Bouton Trade flottant par-dessus tout qui disparaît au scroll */}
            {!isMarketSelectorOpen && (
              <div style={{
                position: 'absolute',
                bottom: '56px', // Au dessus de la barre de navigation du bas (qui fait 46px)
                left: '12px',
                right: '12px',
                zIndex: 999,
                pointerEvents: showFloatingTradeBtn ? 'auto' : 'none',
                opacity: showFloatingTradeBtn ? 1 : 0,
                transform: showFloatingTradeBtn ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <button
                  onClick={handleFloatingAction}
                  style={{
                    width: '100%',
                    height: '38px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    boxShadow: '0 3px 12px rgba(255, 255, 255, 0.15)',
                    transition: 'transform 0.15s ease, opacity 0.15s ease'
                  }}
                  className="mobile-trade-action-btn"
                >
                  {isConnected ? 'Trade' : 'Connect Wallet'}
                </button>
                <style>{`
                  .mobile-trade-action-btn {
                    background-color: #ffffff;
                    color: #000000;
                  }
                  body.light-mode .mobile-trade-action-btn {
                    background-color: #000000 !important;
                    color: #ffffff !important;
                  }
                  .mobile-trade-action-btn:active {
                    transform: scale(0.98);
                    opacity: 0.9;
                  }
                `}</style>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRADE VIEW (ORDER PANEL ONLY) */}
        {activeTab === 'trade' && (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: 'var(--bg-dark)', 
            padding: '8px', 
            width: '100%',
            overflowY: 'auto',
            minHeight: 0
          }} className="no-scrollbar">
            {/* Unified Trade TopNav + Order Panel (One Single Div!) */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              backgroundColor: 'var(--panel-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              overflow: 'visible',
              marginBottom: '16px'
            }}>
              <MobileTopNav 
                activeMarketInfo={activeMarketInfo} 
                setIsMarketSelectorOpen={setIsMarketSelectorOpen} 
              />
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <MobileOrderPanel 
                  isOpen={true} 
                  onClose={() => handleTabChange('markets')} 
                  initialSide="buy" 
                  isInline={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REFERRAL VIEW */}
        {activeTab === 'portfolio' && (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: 'var(--bg-dark)', 
            padding: '8px', 
            paddingBottom: '32px',
            width: '100%',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <MobilePortfolio />
          </div>
        )}
      </main>

      {/* Premium Sticky Bottom Tab Bar */}
      <footer className="mobile-bottom-tabs">
        {/* Markets Tab Button */}
        <button 
          className={`mobile-tab-item ${activeTab === 'markets' ? 'active' : ''}`}
          onClick={() => handleTabChange('markets')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
          </svg>
          <span className="mobile-tab-label">Markets</span>
        </button>

        {/* Trade Tab Button */}
        <button 
          className={`mobile-tab-item ${activeTab === 'trade' ? 'active' : ''}`}
          onClick={() => handleTabChange('trade')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="12" cy="12" r="3" /><path d="m14 10 2-2" /><path d="m10 14-2 2" /><path d="m14 14 2 2" /><path d="m10 10-2-2" />
          </svg>
          <span className="mobile-tab-label">Trade</span>
        </button>

        {/* Referral Tab Button */}
        <button 
          className={`mobile-tab-item ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => handleTabChange('portfolio')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="mobile-tab-label">Referral</span>
        </button>
      </footer>

      {/* Position action overlay manager */}
      <MobilePositionManager
        isOpen={isPosManagerOpen}
        onClose={() => setIsPosManagerOpen(false)}
        position={selectedPosition}
        initialTab={posManagerTab}
      />

      {/* Welcome Offer Promo Modal */}
      <WelcomePromoModal onReferNow={() => handleTabChange('portfolio')} />
    </MobileLayout>
  );
}
