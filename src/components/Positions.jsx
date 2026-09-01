import { useState, useEffect, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { api } from '../services/api';
import { useMarketData } from '../context/MarketDataContext';
import { useNotifications } from '../context/NotificationContext';
import { brokexCoreAbi } from '../abi/brokexCoreAbi';
import { getContractAddresses } from '../utils/contracts';
import { calculateEstimatedSpreadLocal, calculatePositionPnLWithSpread } from '../utils/spreadCalculator';
import { useSmartWriteContract } from '../hooks/useSmartWriteContract';
import ThemeModal from './ThemeModal';
import TradeDetailsDrawer from './TradeDetailsDrawer';
import { getSavedBgTheme, getSavedCandleTheme, getSavedAccentTheme } from '../utils/themeManager';

export default function Positions() {
  const { address, isConnected } = useAccount();
  const { network, isMainnet, goldPrice, protocolInfo, showOrderBook, setShowOrderBook } = useMarketData();
  const { showNotification } = useNotifications();
  const { executeWrite, waitForTx } = useSmartWriteContract();

  const [activeTab, setActiveTab] = useState('open'); // 'open', 'orders', 'history'
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [selectedTradeDetails, setSelectedTradeDetails] = useState(null);
  const [currentBg, setCurrentBg] = useState(getSavedBgTheme());
  const [currentCandle, setCurrentCandle] = useState(getSavedCandleTheme());
  const [currentAccent, setCurrentAccent] = useState(getSavedAccentTheme());

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [traderTrades, setTraderTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Brokex Core Contract Address centralisée depuis le .env
  const { core: coreAddress } = getContractAddresses(isMainnet);

  // Fermer une position au marché (closeMarket)
  const handleCloseMarket = async (tradeId) => {
    if (!isConnected || !address) return;
    setActionLoadingId(`close-${tradeId}`);
    showNotification(`Closing market position #${tradeId}...`, "info", null, 3000, "XAU");

    try {
      // 1. Récupération de la preuve oracle depuis le backend
      const proofRes = await api.getProof(network);
      if (!proofRes || !Array.isArray(proofRes.priceUpdateData) || proofRes.priceUpdateData.length === 0) {
        throw new Error("Unable to fetch oracle price proof.");
      }

      // 2. Appel contract closeMarket via executeWrite
      const txHash = await executeWrite({
        address: coreAddress,
        abi: brokexCoreAbi,
        functionName: 'closeMarket',
        args: [BigInt(tradeId), proofRes.priceUpdateData],
      });

      showNotification(`Position #${tradeId} closed successfully!`, "success", txHash, 7000, "XAU");
      await waitForTx(txHash);
    } catch (err) {
      console.error("Close market error:", err);
      const msg = err?.shortMessage || err?.message || "Failed to close position";
      showNotification(msg.length > 90 ? msg.slice(0, 90) + '...' : msg, "error", null, 6000, "XAU");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Annuler un ordre limite / stop (cancel)
  const handleCancelOrder = async (tradeId) => {
    if (!isConnected || !address) return;
    setActionLoadingId(`cancel-${tradeId}`);
    showNotification(`Cancelling order #${tradeId}...`, "info", null, 3000, "XAU");

    try {
      const txHash = await executeWrite({
        address: coreAddress,
        abi: brokexCoreAbi,
        functionName: 'cancel',
        args: [BigInt(tradeId)],
      });

      showNotification(`Order #${tradeId} cancelled successfully!`, "success", txHash, 7000, "XAU");
      await waitForTx(txHash);
    } catch (err) {
      console.error("Cancel order error:", err);
      const msg = err?.shortMessage || err?.message || "Failed to cancel order";
      showNotification(msg.length > 90 ? msg.slice(0, 90) + '...' : msg, "error", null, 6000, "XAU");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Récupération des trades du trader connecté
  useEffect(() => {
    if (!isConnected || !address) {
      setTraderTrades([]);
      return;
    }

    let isMounted = true;
    const fetchTraderData = async () => {
      try {
        const res = await api.getTraderTrades(address, network);
        if (!isMounted) return;
        if (res && Array.isArray(res.trades)) {
          setTraderTrades(res.trades);
        } else {
          setTraderTrades([]);
        }
      } catch (err) {
        console.warn("Failed to fetch trader trades:", err);
      }
    };

    fetchTraderData();
    const interval = setInterval(fetchTraderData, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [address, isConnected, network]);

  // Formatter un trade brut avec calcul local du spread de sortie et PnL net exact
  const formattedTrades = useMemo(() => {
    const currentMark = goldPrice || 4604.64;
    const primaryAsset = protocolInfo?.assets?.[0] || protocolInfo;
    const vaultLiquidity = protocolInfo?.vaultBalance ?? 25000000;

    return traderTrades.map((t) => {
      const isLong = t.directionName === 'LONG' || t.direction === '1' || t.direction === 1;
      const side = isLong ? 'Long' : 'Short';
      const lev = t.leverage ? `${t.leverage}x` : '5x';
      const levNum = Number(t.leverage || 5);

      // Collateral & Size (6 décimales USDC)
      const collatNum = t.margin ? Number(t.margin) / 1e6 : (t.collateral ? Number(t.collateral) / 1e6 : 0);
      const collateralStr = `$${collatNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const oiNum = t.openInterest ? Number(t.openInterest) / 1e6 : collatNum * levNum;
      const sizeStr = `$${oiNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Prix (6 décimales Pyth/Oracle)
      const entryPriceNum = t.executionPriceOpen ? Number(t.executionPriceOpen) / 1e6 : (t.oraclePriceOpen ? Number(t.oraclePriceOpen) / 1e6 : null);
      const closePriceNum = t.executionPriceClose ? Number(t.executionPriceClose) / 1e6 : (t.oraclePriceClose ? Number(t.oraclePriceClose) / 1e6 : null);
      const targetPriceNum = t.targetPrice && Number(t.targetPrice) > 0 ? Number(t.targetPrice) / 1e6 : null;

      const entryPriceStr = entryPriceNum ? `$${entryPriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
      const closePriceStr = closePriceNum ? `$${closePriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
      const orderPriceStr = targetPriceNum ? `$${targetPriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

      // Calcul du spread de sortie spécifique à la taille de la position (isOpening = false)
      const exitSpreadRes = calculateEstimatedSpreadLocal(
        primaryAsset,
        vaultLiquidity,
        isLong ? 1 : 0,
        oiNum * 1e6,
        false
      );

      const exitSpreadPercent = exitSpreadRes.tradeSpreadPercent; // ex: 0.0384%
      const spreadDecimal = exitSpreadPercent / 100;

      // Prix d'exécution effectif au marché (Bid pour Long, Ask pour Short)
      const estimatedExitPrice = isLong
        ? currentMark * (1 - spreadDecimal)
        : currentMark * (1 + spreadDecimal);

      const marketPriceStr = `$${currentMark.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const exitPriceStr = `$${estimatedExitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const spreadBpsStr = `${exitSpreadRes.tradeSpreadBps.toFixed(2)} bps (${exitSpreadPercent.toFixed(2)}%)`;

      // TP & SL
      const tpNum = t.currentTakeProfit && Number(t.currentTakeProfit) > 0 ? Number(t.currentTakeProfit) / 1e6 : null;
      const slNum = t.currentStopLoss && Number(t.currentStopLoss) > 0 ? Number(t.currentStopLoss) / 1e6 : null;
      const tpStr = tpNum ? `$${tpNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
      const slStr = slNum ? `$${slNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

      // Liquidation Price approximatif
      let liqPriceStr = '—';
      if (entryPriceNum) {
        const liq = isLong
          ? entryPriceNum * (1 - 0.9 / levNum)
          : entryPriceNum * (1 + 0.9 / levNum);
        liqPriceStr = `$${liq.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      // PnL Calculation intégrant le spread de fermeture
      let pnlUsd = '—';
      let pnlPct = '—';
      let isProfit = true;

      if (t.status === 'CLOSED') {
        const finalPnlNum = t.finalPnl ? Number(t.finalPnl) / 1e6 : 0;
        isProfit = finalPnlNum >= 0;
        pnlUsd = `${isProfit ? '+' : ''}$${finalPnlNum.toFixed(2)}`;
        const pct = collatNum > 0 ? (finalPnlNum / collatNum) * 100 : 0;
        pnlPct = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
      } else if (t.status === 'CREATED' || t.status === 'OPEN') {
        if (entryPriceNum && currentMark) {
          const pnlCalc = calculatePositionPnLWithSpread({
            isLong,
            entryPrice: entryPriceNum,
            currentMarkPrice: currentMark,
            openInterestUSD: oiNum,
            collateralUSD: collatNum,
            closingSpreadPercent: exitSpreadPercent,
            borrowFeeUSD: t.borrowFee ? Number(t.borrowFee) / 1e6 : 0
          });

          isProfit = pnlCalc.isProfit;
          pnlUsd = `${isProfit ? '+' : ''}$${pnlCalc.unrealizedPnlUSD.toFixed(2)}`;
          pnlPct = `${pnlCalc.unrealizedPnlPercent >= 0 ? '+' : ''}${pnlCalc.unrealizedPnlPercent.toFixed(2)}%`;
        }
      }

      return {
        raw: t,
        id: `#${t.tradeId}`,
        tradeId: t.tradeId,
        asset: 'XAU/USD',
        side,
        isLong,
        size: sizeStr,
        leverage: lev,
        collateral: collateralStr,
        entryPrice: entryPriceStr,
        marketPrice: marketPriceStr,
        exitPrice: exitPriceStr,
        spreadBpsStr,
        orderPrice: orderPriceStr,
        closePrice: closePriceStr,
        liqPrice: liqPriceStr,
        sl: slStr,
        tp: tpStr,
        pnlUsd,
        pnlPct,
        isProfit,
        status: t.status,
        orderTypeName: t.orderTypeName || (t.orderType === '1' ? 'LIMIT' : t.orderType === '2' ? 'STOP' : 'MARKET')
      };
    });
  }, [traderTrades, goldPrice, protocolInfo]);

  // Séparation en 3 onglets et tri antéchronologique (du plus récent au plus ancien)
  const openPositions = useMemo(() => {
    return formattedTrades
      .filter(t => t.status === 'OPEN')
      .sort((a, b) => Number(b.tradeId) - Number(a.tradeId));
  }, [formattedTrades]);

  const pendingOrders = useMemo(() => {
    return formattedTrades
      .filter(t => t.status === 'CREATED')
      .sort((a, b) => Number(b.tradeId) - Number(a.tradeId));
  }, [formattedTrades]);

  const historyPositions = useMemo(() => {
    return formattedTrades
      .filter(t => t.status === 'CLOSED' || t.status === 'CANCELLED' || t.status === 'LIQUIDATED')
      .sort((a, b) => Number(b.tradeId) - Number(a.tradeId));
  }, [formattedTrades]);

  const containerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(Boolean(isConnected));
  const [hoveredButton, setHoveredButton] = useState(null); // 'positions' | null

  // Synchronise en temps réel isExpanded avec la hauteur réelle (via ResizeObserver)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        setIsExpanded(height > 60);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleTabClick = (key) => {
    setActiveTab(key);
    document.documentElement.style.setProperty('--positions-height', '240px');
  };

  const handleToggleExpand = () => {
    const currentH = containerRef.current ? containerRef.current.offsetHeight : (isExpanded ? 240 : 40);
    if (currentH > 60) {
      document.documentElement.style.setProperty('--positions-height', '40px');
    } else {
      document.documentElement.style.setProperty('--positions-height', '240px');
    }
  };

  return (
    <div
      ref={containerRef}
      className="positions panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: isExpanded ? 'hidden' : 'visible', zIndex: 100 }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        height: '40px',
        flexShrink: 0,
        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
        position: 'relative'
      }}>
        {/* Left Tabs */}
        <div style={{ display: 'flex', gap: '5px' }}>
          {[
            { key: 'open', label: 'open positions', count: openPositions.length },
            { key: 'orders', label: 'orders', count: pendingOrders.length },
            { key: 'history', label: 'history', count: historyPositions.length }
          ].map(tab => {
            const isTabActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                style={{
                  background: 'transparent',
                  border: isTabActive ? '1px solid var(--gold)' : '1px solid transparent',
                  color: isTabActive ? 'var(--gold)' : 'var(--text-grey)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase'
                }}
              >
                {tab.label} [{tab.count}]
              </button>
            );
          })}
        </div>

        {/* Right Section: Order Book Toggle + Expand/Collapse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
          
          {/* SCHEMATIC WIREFRAME HOVER POPUP */}
          {hoveredButton && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              right: '0',
              width: '200px',
              backgroundColor: '#0c0d11',
              border: '1px solid rgba(188, 137, 97, 0.45)',
              borderRadius: '10px',
              padding: '10px 12px',
              boxShadow: '0 14px 40px rgba(0, 0, 0, 0.95), 0 0 25px rgba(188, 137, 97, 0.2)',
              zIndex: 999999,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              animation: 'tooltipFadeIn 0.15s ease-out'
            }}>
              <style>{`
                @keyframes tooltipFadeIn {
                  from { opacity: 0; transform: translateY(4px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {/* Triangle pointer */}
              <div style={{
                position: 'absolute',
                bottom: '-6px',
                right: '10px',
                width: '10px',
                height: '10px',
                backgroundColor: '#0c0d11',
                borderRight: '1px solid rgba(188, 137, 97, 0.45)',
                borderBottom: '1px solid rgba(188, 137, 97, 0.45)',
                transform: 'rotate(45deg)'
              }} />

              {/* Title & Status Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Positions Drawer
                </span>
                <span style={{
                  fontSize: '8.5px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontFamily: 'Source Code Pro, monospace',
                  background: isExpanded ? 'rgba(188, 137, 97, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                  color: isExpanded ? '#BC8961' : '#888d96',
                  border: isExpanded ? '1px solid rgba(188, 137, 97, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {isExpanded ? 'EXPANDED' : 'COLLAPSED'}
                </span>
              </div>

              {/* Mini App Wireframe Schema */}
              <div style={{
                width: '100%',
                height: '92px',
                backgroundColor: '#060709',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                boxSizing: 'border-box'
              }}>
                {/* TopNav Wireframe */}
                <div style={{
                  height: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4px',
                  gap: '3px'
                }}>
                  <div style={{ width: '12px', height: '4px', background: '#BC8961', borderRadius: '1px' }} />
                  <div style={{ width: '20px', height: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '1px' }} />
                </div>

                {/* Middle Section: Chart + OrderPanel */}
                <div style={{ flex: 1, display: 'flex', gap: '3px', minHeight: 0 }}>
                  {/* Chart */}
                  <div style={{
                    flex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '3px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2px'
                  }}>
                    <svg width="100%" height="100%" viewBox="0 0 50 20" fill="none" style={{ opacity: 0.35 }}>
                      <path d="M2 15 L12 8 L22 13 L32 5 L42 10 L48 3" stroke="#BC8961" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* OrderPanel Wireframe */}
                  <div style={{
                    width: '38px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '3px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '2px',
                    gap: '2px'
                  }}>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px' }} />
                    <div style={{ width: '100%', height: '6px', background: '#BC8961', opacity: 0.35, borderRadius: '1px', marginTop: 'auto' }} />
                  </div>
                </div>

                {/* Bottom Section: Positions Drawer Wireframe */}
                <div style={{
                  height: isExpanded ? '24px' : '9px',
                  backgroundColor: isExpanded ? 'rgba(188, 137, 97, 0.25)' : 'rgba(188, 137, 97, 0.08)',
                  border: isExpanded ? '1.5px solid #BC8961' : '1px dashed rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '2px 4px',
                  gap: '2px',
                  boxShadow: '0 0 8px rgba(188, 137, 97, 0.3)',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <div style={{ width: '15px', height: '2px', background: '#BC8961', opacity: isExpanded ? 0.9 : 0.3 }} />
                    <div style={{ width: '15px', height: '2px', background: 'rgba(255,255,255,0.2)' }} />
                  </div>
                  {isExpanded && (
                    <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.06)' }} />
                  )}
                </div>
              </div>

              {/* Action Hint */}
              <div style={{ fontSize: '9.5px', color: '#94a3b8', textAlign: 'center', fontWeight: '500' }}>
                {isExpanded ? 'Click to minimize Positions drawer' : 'Click to expand Positions drawer'}
              </div>
            </div>
          )}

          {/* NOTE: Order Book Toggle Button (temporarily disabled/hidden as requested) */}
          {/*
          <button
            onClick={() => setShowOrderBook(!showOrderBook)}
            onMouseEnter={() => setHoveredButton('orderbook')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              background: showOrderBook ? 'rgba(188, 137, 97, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: showOrderBook ? '1px solid #BC8961' : '1px solid var(--border-color)',
              color: showOrderBook ? '#BC8961' : 'var(--text-grey)',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              padding: 0
            }}
            title={showOrderBook ? "Hide Order Book" : "Show Order Book"}
            aria-label={showOrderBook ? "Hide Order Book" : "Show Order Book"}
          >
            {showOrderBook ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M15 3v18" />
                <path d="m18 10-2 2 2 2" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M15 3v18" strokeDasharray="3 3" />
                <path d="m10 10 2-2 2 2" />
              </svg>
            )}
          </button>
          */}

          {/* Button: Theme Customizer */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              color: 'var(--gold)',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              padding: 0
            }}
            title="Customize Theme & Candle Colors"
            aria-label="Customize Theme & Candle Colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
          </button>

          {/* Toggle Expand / Fold */}
          <button
            onClick={handleToggleExpand}
            onMouseEnter={() => setHoveredButton('positions')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              background: isExpanded ? 'var(--gold-glow)' : 'rgba(255, 255, 255, 0.03)',
              border: isExpanded ? '1px solid var(--gold)' : '1px solid var(--border-color)',
              color: isExpanded ? 'var(--gold)' : 'var(--text-grey)',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              padding: 0
            }}
            title={isExpanded ? "Collapse Positions Panel" : "Expand Positions Panel"}
            aria-label={isExpanded ? "Collapse Positions Panel" : "Expand Positions Panel"}
          >
            {isExpanded ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 15h18" />
                <path d="m10 18 2 2 2-2" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 15h18" strokeDasharray="3 3" />
                <path d="m10 10 2-2 2 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ flex: 1, overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: '100%', minWidth: '850px', display: 'flex', flexDirection: 'column' }}>
          {/* Table Header */}
          <div style={{
            display: 'flex',
            width: '100%',
            padding: '6px 15px',
            fontSize: '10px',
            color: 'var(--text-grey)',
            borderBottom: '1px solid var(--border-color)',
            textTransform: 'uppercase',
            fontWeight: '600',
            alignItems: 'center'
          }}>
            <div style={{ width: '65px' }}>ID / TXN</div>
            <div style={{ width: '135px' }}>Asset</div>
            <div style={{ flex: 1 }}>Size</div>
            <div style={{ flex: 0.8 }}>Lev.</div>
            <div style={{ flex: 1 }}>Coll.</div>
            {activeTab === 'open' && <div style={{ flex: 1 }}>Entry Price</div>}
            {activeTab === 'open' && <div style={{ flex: 1 }}>Market Price</div>}
            {activeTab === 'orders' && <div style={{ flex: 1 }}>Order Price</div>}
            {activeTab === 'history' && <div style={{ flex: 1 }}>Entry Price</div>}
            {activeTab === 'history' && <div style={{ flex: 1 }}>Close Price</div>}
            <div style={{ flex: 1 }}>{activeTab === 'history' ? 'Status' : 'Liq. Price'}</div>
            <div style={{ flex: 0.8 }}>SL</div>
            <div style={{ flex: 0.8 }}>TP</div>
            <div style={{ flex: 1.4, textAlign: 'right' }}>{activeTab === 'orders' ? 'Status' : 'PnL (USD/%)'}</div>
            <div style={{ width: '90px', textAlign: 'right' }}>{activeTab === 'history' ? 'Proofs' : 'Action'}</div>
          </div>

          {/* Empty State when Wallet not connected */}
          {!isConnected && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '11px' }}>
              Connect your wallet to see your positions and orders.
            </div>
          )}

          {/* Table Content: OPEN POSITIONS */}
          {isConnected && activeTab === 'open' && openPositions.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '11px' }}>
              No open positions found.
            </div>
          )}
          {isConnected && activeTab === 'open' && openPositions.map((pos) => (
            <div key={pos.id} style={{
              display: 'flex',
              width: '100%',
              padding: '6px 15px',
              fontSize: '11px',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              height: '32px'
            }} className="position-row">
              <div 
                onClick={() => setSelectedTradeDetails(pos)}
                style={{
                  width: '65px',
                  fontFamily: 'Source Code Pro, monospace',
                  fontSize: '10px',
                  color: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                title="View onchain proofs & trade details"
              >
                <span style={{ textDecoration: 'underline' }}>{pos.id}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>
              <div style={{ width: '135px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ minWidth: '65px' }}>{pos.asset}</span>
                <span style={{ fontSize: '7px', padding: '1px 4px', borderRadius: '3px', background: pos.isLong ? 'var(--color-blue-bg)' : 'var(--color-red-bg)', color: pos.isLong ? 'var(--color-blue)' : 'var(--color-red)', fontWeight: 'bold' }}>{pos.side.toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: '500' }}>{pos.size}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--gold)', fontWeight: '600' }}>{pos.leverage}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {pos.collateral}
              </div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-dark)' }}>{pos.entryPrice}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{pos.marketPrice}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--color-red)' }}>{pos.liqPrice}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {pos.sl}
              </div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {pos.tp}
              </div>
              <div style={{ flex: 1.4, textAlign: 'right', fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: 'bold', color: pos.isProfit ? 'var(--color-blue)' : 'var(--color-red)' }}>
                {pos.pnlUsd} <span style={{ fontSize: '9px', opacity: 0.8 }}>({pos.pnlPct})</span>
              </div>
              <div style={{ width: '90px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                <button
                  onClick={() => setSelectedTradeDetails(pos)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-grey)',
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-grey)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  title="View onchain proofs & transactions"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  TXN
                </button>
                <button
                  onClick={() => handleCloseMarket(pos.tradeId)}
                  disabled={actionLoadingId === `close-${pos.tradeId}`}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-red-glow)',
                    color: 'var(--color-red)',
                    fontSize: '9px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    cursor: actionLoadingId === `close-${pos.tradeId}` ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    opacity: actionLoadingId === `close-${pos.tradeId}` ? 0.6 : 1
                  }}
                >
                  {actionLoadingId === `close-${pos.tradeId}` ? '...' : 'CLOSE'}
                </button>
              </div>
            </div>
          ))}

          {/* Table Content: ORDERS */}
          {isConnected && activeTab === 'orders' && pendingOrders.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '11px' }}>
              No pending orders found.
            </div>
          )}
          {isConnected && activeTab === 'orders' && pendingOrders.map((order) => (
            <div key={order.id} style={{
              display: 'flex',
              width: '100%',
              padding: '6px 15px',
              fontSize: '11px',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              height: '32px'
            }} className="position-row">
              <div 
                onClick={() => setSelectedTradeDetails(order)}
                style={{
                  width: '65px',
                  fontFamily: 'Source Code Pro, monospace',
                  fontSize: '10px',
                  color: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                title="View onchain proofs & trade details"
              >
                <span style={{ textDecoration: 'underline' }}>{order.id}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>
              <div style={{ width: '135px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ minWidth: '65px' }}>{order.asset}</span>
                <span style={{ fontSize: '7px', padding: '1px 4px', borderRadius: '3px', background: order.isLong ? 'var(--color-blue-bg)' : 'var(--color-red-bg)', color: order.isLong ? 'var(--color-blue)' : 'var(--color-red)', fontWeight: 'bold' }}>{order.side.toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: '500' }}>{order.size}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--gold)', fontWeight: '600' }}>{order.leverage}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{order.collateral}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{order.orderPrice}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--color-red)' }}>{order.liqPrice}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{order.sl}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{order.tp}</div>
              <div style={{ flex: 1.4, textAlign: 'right', fontWeight: 'bold', color: 'var(--gold)' }}>{order.status}</div>
              <div style={{ width: '90px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                <button
                  onClick={() => setSelectedTradeDetails(order)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-grey)',
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-grey)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  title="View onchain proofs & transactions"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  TXN
                </button>
                <button
                  onClick={() => handleCancelOrder(order.tradeId)}
                  disabled={actionLoadingId === `cancel-${order.tradeId}`}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-dark)',
                    fontSize: '9px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    cursor: actionLoadingId === `cancel-${order.tradeId}` ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    opacity: actionLoadingId === `cancel-${order.tradeId}` ? 0.6 : 1
                  }}
                >
                  {actionLoadingId === `cancel-${order.tradeId}` ? '...' : 'CANCEL'}
                </button>
              </div>
            </div>
          ))}

          {/* Table Content: HISTORY */}
          {isConnected && activeTab === 'history' && historyPositions.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '11px' }}>
              No trade history found.
            </div>
          )}
          {isConnected && activeTab === 'history' && historyPositions.map((hist) => (
            <div key={hist.id} style={{
              display: 'flex',
              width: '100%',
              padding: '6px 15px',
              fontSize: '11px',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              height: '32px'
            }} className="position-row">
              <div 
                onClick={() => setSelectedTradeDetails(hist)}
                style={{
                  width: '65px',
                  fontFamily: 'Source Code Pro, monospace',
                  fontSize: '10px',
                  color: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                title="View onchain proofs & trade details"
              >
                <span style={{ textDecoration: 'underline' }}>{hist.id}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>
              <div style={{ width: '135px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ minWidth: '65px' }}>{hist.asset}</span>
                <span style={{ fontSize: '7px', padding: '1px 4px', borderRadius: '3px', background: hist.isLong ? 'var(--color-blue-bg)' : 'var(--color-red-bg)', color: hist.isLong ? 'var(--color-blue)' : 'var(--color-red)', fontWeight: 'bold' }}>{hist.side.toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: '500' }}>{hist.size}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--gold)', fontWeight: '600' }}>{hist.leverage}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{hist.collateral}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{hist.entryPrice}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{hist.closePrice}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: hist.status === 'CLOSED' ? 'var(--color-blue)' : 'var(--text-grey)', fontWeight: 600 }}>{hist.status}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{hist.sl}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{hist.tp}</div>
              <div style={{ flex: 1.4, textAlign: 'right', fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: 'bold', color: hist.isProfit ? 'var(--color-blue)' : 'var(--color-red)' }}>
                {hist.pnlUsd} <span style={{ fontSize: '9px', opacity: 0.8 }}>({hist.pnlPct})</span>
              </div>
              <div style={{ width: '90px', textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedTradeDetails(hist)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    color: goldAccent,
                    fontSize: '9px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontWeight: '600',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(188, 137, 97, 0.12)'; e.currentTarget.style.borderColor = goldAccent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  title="View onchain proofs & trade details"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  TXN ↗
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      <style>{`
        .position-row:hover {
          background: var(--bg-subtle);
        }
      `}</style>

      {/* Theme Customizer Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentBg={currentBg}
        currentCandle={currentCandle}
        currentAccent={currentAccent}
        onThemeChange={(newBg, newCandle, newAccent) => {
          setCurrentBg(newBg);
          setCurrentCandle(newCandle);
          setCurrentAccent(newAccent);
        }}
      />

      {/* Trade Details & Onchain Transactions Slide-over Drawer */}
      <TradeDetailsDrawer
        isOpen={!!selectedTradeDetails}
        onClose={() => setSelectedTradeDetails(null)}
        trade={selectedTradeDetails}
        isMainnet={isMainnet}
        currentMarkPrice={goldPrice}
        protocolInfo={protocolInfo}
      />
    </div>
  );
}
