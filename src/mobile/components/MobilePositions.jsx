import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { api } from '../../services/api';
import { useMarketData } from '../../context/MarketDataContext';
import { useNotifications } from '../../context/NotificationContext';
import { brokexCoreAbi } from '../../abi/brokexCoreAbi';
import { getContractAddresses } from '../../utils/contracts';
import { calculateEstimatedSpreadLocal, calculatePositionPnLWithSpread } from '../../utils/spreadCalculator';
import { useSmartWriteContract } from '../../hooks/useSmartWriteContract';
import TradeDetailsDrawer from '../../components/TradeDetailsDrawer';

const goldAccent = '#BC8961';
const sellColor = '#ef4444'; // red

export default function MobilePositions({ isFullPage = false }) {
  const { address, isConnected } = useAccount();
  const { network, isMainnet, goldPrice, protocolInfo } = useMarketData();
  const { showNotification } = useNotifications();
  const { executeWrite, waitForTx } = useSmartWriteContract();

  const [activeTab, setActiveTab] = useState('open'); // 'open', 'orders', 'history'
  const [selectedTradeDetails, setSelectedTradeDetails] = useState(null);
  const [traderTrades, setTraderTrades] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Position Manager Modal State
  const [isPosManagerOpen, setIsPosManagerOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [posManagerTab, setPosManagerTab] = useState('close'); // 'close', 'tp-sl'
  const [isLoading, setIsLoading] = useState(false);

  // Brokex Core Contract Address centralisée depuis le .env
  const { core: coreAddress } = getContractAddresses(isMainnet);

  // Polling des trades du trader connecté
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
        console.warn("Failed to fetch mobile trader trades:", err);
      }
    };

    fetchTraderData();
    const interval = setInterval(fetchTraderData, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isConnected, address, network]);

  // Fermer une position au marché
  const handleCloseMarket = async (tradeId) => {
    if (!isConnected || !address) return;
    setActionLoadingId(`close-${tradeId}`);
    showNotification(`Closing market position #${tradeId}...`, "info", null, 3000, "XAU");

    try {
      const proofRes = await api.getProof(network);
      if (!proofRes || !Array.isArray(proofRes.priceUpdateData) || proofRes.priceUpdateData.length === 0) {
        throw new Error("Unable to fetch oracle price proof.");
      }

      const txHash = await executeWrite({
        address: coreAddress,
        abi: brokexCoreAbi,
        functionName: 'closeMarket',
        args: [BigInt(tradeId), proofRes.priceUpdateData],
      });

      showNotification(`Position #${tradeId} closed successfully!`, "success", txHash, 7000, "XAU");
      await waitForTx(txHash);
    } catch (err) {
      console.error("Mobile close market error:", err);
      const msg = err?.shortMessage || err?.message || "Failed to close position";
      showNotification(msg.length > 90 ? msg.slice(0, 90) + '...' : msg, "error", null, 6000, "XAU");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Annuler un ordre
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
      console.error("Mobile cancel order error:", err);
      const msg = err?.shortMessage || err?.message || "Failed to cancel order";
      showNotification(msg.length > 90 ? msg.slice(0, 90) + '...' : msg, "error", null, 6000, "XAU");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Formatage des données de trading (aligné exactement avec Positions.jsx PC)
  const formattedTrades = useMemo(() => {
    const currentMark = goldPrice || 2315.10;
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

      // Prix (6 décimales Pyth)
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

      const exitSpreadPercent = exitSpreadRes.tradeSpreadPercent;
      const spreadDecimal = exitSpreadPercent / 100;
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

      // PnL Calculation avec déduction du spread de sortie
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
        orderTypeName: t.orderTypeName || (t.orderType === '1' || t.orderType === 1 ? 'LIMIT' : t.orderType === '2' || t.orderType === 2 ? 'STOP' : 'MARKET')
      };
    });
  }, [traderTrades, goldPrice, protocolInfo]);

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

  const currentList = activeTab === 'open' ? openPositions : activeTab === 'orders' ? pendingOrders : historyPositions;

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
        {[
          { key: 'open', label: 'Open', count: openPositions.length },
          { key: 'orders', label: 'Orders', count: pendingOrders.length },
          { key: 'history', label: 'History', count: historyPositions.length }
        ].map(tab => {
          const isActive = activeTab === tab.key;
          const labelText = `${tab.label} (${tab.count})`;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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
        {!isConnected ? (
          <div style={{ textAlign: 'center', padding: '30px 12px', color: 'var(--text-grey)', fontSize: '11px' }}>
            CONNECT YOUR WALLET TO VIEW POSITIONS
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-grey)', fontSize: '11px' }}>
            NO ACTIVE {activeTab.toUpperCase()} ITEMS
          </div>
        ) : (
          currentList.map((item, idx) => (
            <div 
              key={item.id || idx}
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
                    background: item.side === 'Long' ? 'var(--color-blue-bg)' : 'var(--color-red-bg)',
                    color: item.side === 'Long' ? 'var(--color-blue)' : 'var(--color-red)'
                  }}>
                    {item.side.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '10px', fontFamily: 'Source Code Pro', color: '#BC8961', fontWeight: 'bold' }}>
                    {item.leverage}
                  </span>
                </div>
                
                <button
                  onClick={() => setSelectedTradeDetails(item)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    color: goldAccent,
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontFamily: 'Source Code Pro',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="View onchain proofs & details"
                >
                  <span>{item.id}</span>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
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
                      <span style={{ color: 'var(--text-grey)' }}>Entry Price:</span>
                      <span style={{ fontWeight: '500', fontFamily: 'Source Code Pro' }}>{item.entryPrice}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Market Price:</span>
                      <span style={{ fontWeight: '500', fontFamily: 'Source Code Pro' }}>{item.marketPrice}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Liq. Price:</span>
                      <span style={{ color: 'var(--color-red)', fontFamily: 'Source Code Pro', fontWeight: '500' }}>{item.liqPrice}</span>
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
                      <span style={{ color: 'var(--text-grey)' }}>Entry Price:</span>
                      <span style={{ fontWeight: '500', fontFamily: 'Source Code Pro' }}>{item.entryPrice}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Close Price:</span>
                      <span style={{ fontWeight: '500', fontFamily: 'Source Code Pro' }}>{item.closePrice}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-grey)' }}>Status:</span>
                      <span style={{ color: item.status === 'CLOSED' ? 'var(--color-blue)' : 'var(--text-grey)', fontWeight: 'bold' }}>{item.status}</span>
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
                  <span style={{ color: 'var(--color-blue)', fontFamily: 'Source Code Pro', fontWeight: '500' }}>{item.tp}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-grey)', marginRight: '4px' }}>SL:</span>
                  <span style={{ color: 'var(--color-red)', fontFamily: 'Source Code Pro', fontWeight: '500' }}>{item.sl}</span>
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
                      <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>
                        {activeTab === 'history' ? 'Realized PnL' : 'Unrealized PnL'}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        fontFamily: 'Source Code Pro',
                        color: item.isProfit ? 'var(--color-blue)' : 'var(--color-red)'
                      }}>
                        {item.pnlUsd} <span style={{ fontSize: '10px', fontWeight: '500' }}>({item.pnlPct})</span>
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedTradeDetails(item)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-grey)',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="View onchain proofs & details"
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    TXN
                  </button>

                  {activeTab === 'open' && (
                    <button
                      onClick={() => handleCloseMarket(item.tradeId)}
                      disabled={actionLoadingId === `close-${item.tradeId}`}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--color-red-glow)',
                        color: 'var(--color-red)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '4px 10px',
                        cursor: actionLoadingId === `close-${item.tradeId}` ? 'not-allowed' : 'pointer',
                        opacity: actionLoadingId === `close-${item.tradeId}` ? 0.6 : 1
                      }}
                    >
                      {actionLoadingId === `close-${item.tradeId}` ? '...' : 'CLOSE'}
                    </button>
                  )}
                  {activeTab === 'orders' && (
                    <button
                      onClick={() => handleCancelOrder(item.tradeId)}
                      disabled={actionLoadingId === `cancel-${item.tradeId}`}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-dark)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '4px 10px',
                        cursor: actionLoadingId === `cancel-${item.tradeId}` ? 'not-allowed' : 'pointer',
                        opacity: actionLoadingId === `cancel-${item.tradeId}` ? 0.6 : 1
                      }}
                    >
                      {actionLoadingId === `cancel-${item.tradeId}` ? '...' : 'CANCEL'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
