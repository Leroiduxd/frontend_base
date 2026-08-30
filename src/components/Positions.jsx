import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { api } from '../services/api';
import { useMarketData } from '../context/MarketDataContext';
import { useNotifications } from '../context/NotificationContext';
import { brokexCoreAbi } from '../abi/brokexCoreAbi';
import { getContractAddresses } from '../utils/contracts';
import { calculateEstimatedSpreadLocal, calculatePositionPnLWithSpread } from '../utils/spreadCalculator';
import { useSmartWriteContract } from '../hooks/useSmartWriteContract';

export default function Positions() {
  const { address, isConnected } = useAccount();
  const { network, isMainnet, goldPrice, protocolInfo, showOrderBook, setShowOrderBook } = useMarketData();
  const { showNotification } = useNotifications();
  const { executeWrite, waitForTx } = useSmartWriteContract();

  const [activeTab, setActiveTab] = useState('open'); // 'open', 'orders', 'history'

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

  return (
    <div className="positions panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        height: '40px',
        flexShrink: 0,
        borderBottom: '1px solid var(--border-color)'
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
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'transparent',
                  border: isTabActive ? '1px solid #BC8961' : '1px solid transparent',
                  color: isTabActive ? '#BC8961' : 'var(--text-grey)',
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

        {/* Right Section: Order Book Toggle (Icon Only) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowOrderBook(!showOrderBook)}
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
                <path d="m10 10 2 2-2 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

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
            <div style={{ width: '60px' }}>ID</div>
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
            {activeTab !== 'history' && <div style={{ width: '75px', textAlign: 'right' }}>Action</div>}
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
              borderBottom: '1px solid rgba(255,255,255,0.02)',
              height: '32px'
            }} className="position-row">
              <div style={{ width: '60px', fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{pos.id}</div>
              <div style={{ width: '135px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ minWidth: '65px' }}>{pos.asset}</span>
                <span style={{ fontSize: '7px', padding: '1px 4px', borderRadius: '3px', background: pos.isLong ? 'var(--color-blue-bg)' : 'var(--color-red-bg)', color: pos.isLong ? 'var(--color-blue)' : 'var(--color-red)', fontWeight: 'bold' }}>{pos.side.toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: '500' }}>{pos.size}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: '#BC8961', fontWeight: '600' }}>{pos.leverage}</div>
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
              <div style={{ width: '75px', textAlign: 'right' }}>
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
              borderBottom: '1px solid rgba(255,255,255,0.02)',
              height: '32px'
            }} className="position-row">
              <div style={{ width: '60px', fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{order.id}</div>
              <div style={{ width: '135px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ minWidth: '65px' }}>{order.asset}</span>
                <span style={{ fontSize: '7px', padding: '1px 4px', borderRadius: '3px', background: order.isLong ? 'var(--color-blue-bg)' : 'var(--color-red-bg)', color: order.isLong ? 'var(--color-blue)' : 'var(--color-red)', fontWeight: 'bold' }}>{order.side.toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: '500' }}>{order.size}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: '#BC8961', fontWeight: '600' }}>{order.leverage}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{order.collateral}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{order.orderPrice}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--color-red)' }}>{order.liqPrice}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{order.sl}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{order.tp}</div>
              <div style={{ flex: 1.4, textAlign: 'right', fontWeight: 'bold', color: '#BC8961' }}>{order.status}</div>
              <div style={{ width: '75px', textAlign: 'right' }}>
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
              borderBottom: '1px solid rgba(255,255,255,0.02)',
              height: '32px'
            }} className="position-row">
              <div style={{ width: '60px', fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{hist.id}</div>
              <div style={{ width: '135px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ minWidth: '65px' }}>{hist.asset}</span>
                <span style={{ fontSize: '7px', padding: '1px 4px', borderRadius: '3px', background: hist.isLong ? 'var(--color-blue-bg)' : 'var(--color-red-bg)', color: hist.isLong ? 'var(--color-blue)' : 'var(--color-red)', fontWeight: 'bold' }}>{hist.side.toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: '500' }}>{hist.size}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: '#BC8961', fontWeight: '600' }}>{hist.leverage}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{hist.collateral}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{hist.entryPrice}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px' }}>{hist.closePrice}</div>
              <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: hist.status === 'CLOSED' ? 'var(--color-blue)' : 'var(--text-grey)', fontWeight: 600 }}>{hist.status}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{hist.sl}</div>
              <div style={{ flex: 0.8, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>{hist.tp}</div>
              <div style={{ flex: 1.4, textAlign: 'right', fontFamily: 'Source Code Pro, monospace', fontSize: '10px', fontWeight: 'bold', color: hist.isProfit ? 'var(--color-blue)' : 'var(--color-red)' }}>
                {hist.pnlUsd} <span style={{ fontSize: '9px', opacity: 0.8 }}>({hist.pnlPct})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .position-row:hover {
          background: rgba(255,255,255,0.03);
        }
      `}</style>
    </div>
  );
}
