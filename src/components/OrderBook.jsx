import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useMarketData } from '../context/MarketDataContext';

const goldAccent = '#BC8961';
const buyColor = 'var(--color-blue)'; // blue
const sellColor = 'var(--color-red)'; // red

export default function OrderBook() {
  const { network } = useMarketData();
  const [trades, setTrades] = useState([]);
  const [totalTrades, setTotalTrades] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const [hoveredTrade, setHoveredTrade] = useState(null);
  const [containerRect, setContainerRect] = useState(null);
  const scrollRef = useRef(null);
  const containerRef = useRef(null);

  // Helper pour formater un trade brut venant de l'API
  const formatApiTrade = (t) => {
    const isLong = t.directionName === 'LONG' || t.direction === '1' || t.direction === 1;
    const side = isLong ? 'LONG' : 'SHORT';
    const lev = t.leverage ? `${t.leverage}x` : '10x';

    // Time
    const timestamp = t.closedAt || t.openedAt || t.openTimestamp || t.createdAt;
    let timeStr = '--:--:--';
    if (timestamp) {
      const date = new Date(Number(timestamp) * 1000);
      timeStr = date.toLocaleTimeString('en-GB', { hour12: false });
    }

    // Size / Margin (USDC en 6 décimales)
    const oiNum = t.openInterest ? Number(t.openInterest) / 1e6 : (t.collateral ? (Number(t.collateral) / 1e6) * Number(t.leverage || 1) : 0);
    const size = `$${oiNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const marginNum = t.margin ? Number(t.margin) / 1e6 : (t.collateral ? Number(t.collateral) / 1e6 : 0);
    const collateralStr = `$${marginNum.toFixed(2)} USDC`;

    // Prices (Pyth price en 6 décimales)
    const entryPriceNum = t.executionPriceOpen ? Number(t.executionPriceOpen) / 1e6 : (t.oraclePriceOpen ? Number(t.oraclePriceOpen) / 1e6 : null);
    const closePriceNum = t.executionPriceClose ? Number(t.executionPriceClose) / 1e6 : (t.oraclePriceClose ? Number(t.oraclePriceClose) / 1e6 : null);
    
    const entryPrice = entryPriceNum ? `$${entryPriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
    const closePrice = closePriceNum ? `$${closePriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

    // PnL
    const finalPnlNum = t.finalPnl ? Number(t.finalPnl) / 1e6 : 0;
    let pnl = '—';
    let pnlColor = 'var(--text-grey)';

    if (t.status === 'CLOSED') {
      const isProfit = finalPnlNum >= 0;
      pnl = `${isProfit ? '+' : ''}$${finalPnlNum.toFixed(2)}`;
      pnlColor = isProfit ? buyColor : sellColor;
    } else if (t.status === 'OPEN') {
      pnl = 'OPEN';
      pnlColor = goldAccent;
    } else if (t.status === 'CANCELLED') {
      pnl = 'CANCELLED';
      pnlColor = 'var(--text-grey)';
    }

    const traderShort = t.trader ? `${t.trader.slice(0, 6)}...${t.trader.slice(-4)}` : '—';
    const tpPriceNum = t.currentTakeProfit && Number(t.currentTakeProfit) > 0 ? Number(t.currentTakeProfit) / 1e6 : null;
    const slPriceNum = t.currentStopLoss && Number(t.currentStopLoss) > 0 ? Number(t.currentStopLoss) / 1e6 : null;

    return {
      id: `#${t.tradeId}`,
      tradeId: t.tradeId,
      time: timeStr,
      asset: 'XAU/USD',
      side,
      isLong,
      leverage: lev,
      size,
      sizeUSD: size,
      collateral: collateralStr,
      entryPrice,
      marketPrice: entryPrice,
      closePrice,
      liqPrice: '—',
      tp: tpPriceNum ? `$${tpPriceNum.toFixed(2)}` : 'None',
      sl: slPriceNum ? `$${slPriceNum.toFixed(2)}` : 'None',
      status: t.status || 'EXECUTED',
      statusColor: t.status === 'OPEN' ? goldAccent : t.status === 'CLOSED' ? (finalPnlNum >= 0 ? buyColor : sellColor) : 'var(--text-grey)',
      traderShort,
      pnl,
      pnlUsd: pnl,
      pnlColor,
      isOrder: t.orderTypeName === 'LIMIT'
    };
  };

  // Chargement initial ou changement de network
  useEffect(() => {
    let isMounted = true;
    setTrades([]);
    setOffset(0);
    setHasMore(true);
    isFetchingRef.current = false;

    const fetchInitialTrades = async () => {
      setIsLoading(true);
      try {
        const res = await api.getTrades({ limit: 50, offset: 0, network });
        if (!isMounted) return;

        if (res.trades && Array.isArray(res.trades)) {
          const formatted = res.trades.map(formatApiTrade);
          setTrades(formatted);
          setTotalTrades(res.total || formatted.length);
          setOffset(res.trades.length);
          setHasMore(res.trades.length < (res.total || 0));
        }
      } catch (err) {
        console.error("Failed to load initial trades:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInitialTrades();

    // Polling toutes les 5s pour actualiser les nouveaux trades
    const interval = setInterval(fetchInitialTrades, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [network]);

  // Chargement des pages suivantes au scroll vers le bas
  const handleScroll = async (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 60) {
      if (isFetchingRef.current || !hasMore) return;

      isFetchingRef.current = true;
      try {
        const res = await api.getTrades({ limit: 50, offset, network });
        if (res.trades && Array.isArray(res.trades) && res.trades.length > 0) {
          const formatted = res.trades.map(formatApiTrade);
          
          setTrades(prev => {
            const seen = new Set(prev.map(t => t.tradeId));
            const newTrades = formatted.filter(t => !seen.has(t.tradeId));
            return [...prev, ...newTrades];
          });

          const nextOffset = offset + res.trades.length;
          setOffset(nextOffset);
          setHasMore(nextOffset < (res.total || 0));
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Failed to paginate trades:", err);
      } finally {
        isFetchingRef.current = false;
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="book panel" 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--panel-bg)',
        color: 'var(--text-dark)',
        fontSize: '12px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <style>{`
        .trade-row {
          transition: all 0.15s ease;
        }
        .trade-row:hover {
          background: rgba(255, 255, 255, 0.04) !important;
        }
        .orderbook-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .orderbook-scroll::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 2px;
        }
        .orderbook-scroll {
          -ms-overflow-style: none;
          scrollbar-width: thin;
        }
      `}</style>

      {/* Table Header Columns */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1.2fr 1fr 1fr', 
        padding: '8px 10px', 
        fontSize: '9.5px', 
        color: 'var(--text-grey)',
        borderBottom: '1px solid var(--border-color)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: '600',
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        flexShrink: 0
      }}>
        <div>Time</div>
        <div>Asset</div>
        <div style={{ textAlign: 'right' }}>Size</div>
        <div style={{ textAlign: 'right' }}>PnL</div>
      </div>

      {/* Table Content Rows */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="orderbook-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '2px 0' }}
      >
        {trades.map((trade) => (
          <div
            key={trade.tradeId}
            onMouseEnter={() => {
              if (containerRef.current) {
                setContainerRect(containerRef.current.getBoundingClientRect());
              }
              setHoveredTrade(trade);
            }}
            onMouseLeave={() => setHoveredTrade(null)}
            className="trade-row"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1.2fr 1fr 1fr', 
              padding: '6.5px 10px', 
              fontSize: '11px',
              borderBottom: '1px solid rgba(255,255,255,0.015)',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{ color: 'var(--text-grey)', fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>
              {trade.time}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-dark)', fontSize: '11px' }}>
                {trade.asset}
              </span>
              <sup style={{ 
                fontSize: '8px', 
                fontWeight: '700',
                marginLeft: '3px',
                color: trade.isLong ? buyColor : sellColor,
                letterSpacing: '0.04em'
              }}>
                {trade.side}
              </sup>
            </div>

            <div style={{ textAlign: 'right', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)', fontWeight: '500', fontSize: '11px' }}>
              {trade.size}
            </div>

            <div style={{ 
              textAlign: 'right', 
              fontFamily: 'Source Code Pro, monospace',
              fontWeight: '600',
              fontSize: '11px',
              color: trade.pnlColor
            }}>
              {trade.pnl}
            </div>
          </div>
        ))}
        
        {/* Loading / Sync Indicator at Bottom */}
        <div style={{
          padding: '14px',
          textAlign: 'center',
          fontSize: '10px',
          color: 'var(--text-grey)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <div style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: goldAccent,
            opacity: 0.6
          }} />
          Syncing live trades...
        </div>
      </div>

      {/* Stationary Fixed Side Card via React Portal */}
      {hoveredTrade && containerRect && createPortal(
        <div style={{
          position: 'fixed',
          top: `${containerRect.top}px`,
          left: `${containerRect.left - 245 < 10 ? containerRect.right + 10 : containerRect.left - 245}px`,
          width: '235px',
          background: 'var(--panel-bg)',
          backgroundColor: '#080808',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          zIndex: 999999,
          pointerEvents: 'none',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
          fontFamily: 'Inter, sans-serif'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--text-dark)' }}>{hoveredTrade.asset}</span>
              <span style={{
                fontSize: '8px',
                fontWeight: 'bold',
                padding: '1px 5px',
                borderRadius: '3px',
                background: hoveredTrade.isLong ? 'var(--color-blue-bg)' : 'var(--color-red-bg)',
                color: hoveredTrade.isLong ? 'var(--color-blue)' : 'var(--color-red)'
              }}>
                {hoveredTrade.side} {hoveredTrade.leverage}
              </span>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-grey)' }}>
              {hoveredTrade.id}
            </span>
          </div>

          {/* Details List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-grey)' }}>Status:</span>
              <span style={{ fontWeight: '600', color: hoveredTrade.statusColor }}>{hoveredTrade.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-grey)' }}>Trader:</span>
              <span style={{ fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>{hoveredTrade.traderShort}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-grey)' }}>Size:</span>
              <span style={{ fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>{hoveredTrade.sizeUSD}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-grey)' }}>Margin:</span>
              <span style={{ fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>{hoveredTrade.collateral}</span>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '2px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-grey)' }}>Entry Price:</span>
              <span style={{ fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>{hoveredTrade.entryPrice}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-grey)' }}>Mark Price:</span>
              <span style={{ fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>{hoveredTrade.marketPrice}</span>
            </div>

            {hoveredTrade.closePrice !== '—' && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-grey)' }}>Close Price:</span>
                <span style={{ fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>{hoveredTrade.closePrice}</span>
              </div>
            )}

            {hoveredTrade.liqPrice !== '—' && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-grey)' }}>Liq. Price:</span>
                <span style={{ fontFamily: 'Source Code Pro, monospace', color: '#ef4444' }}>{hoveredTrade.liqPrice}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-grey)' }}>TP / SL:</span>
              <span style={{ fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>{hoveredTrade.tp} / {hoveredTrade.sl}</span>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '2px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-grey)', fontSize: '10px' }}>PnL:</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: hoveredTrade.pnlColor }}>
                {hoveredTrade.pnlUsd}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


