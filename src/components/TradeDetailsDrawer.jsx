import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getExplorerTxUrl, getContractAddresses } from '../utils/contracts';
import { calculateEstimatedSpreadLocal } from '../utils/spreadCalculator';
import { brokexCoreAbi } from '../abi/brokexCoreAbi';
import { useSmartWriteContract } from '../hooks/useSmartWriteContract';
import { useNotifications } from '../context/NotificationContext';

export default function TradeDetailsDrawer({ 
  isOpen, 
  onClose, 
  trade, 
  isMainnet, 
  currentMarkPrice, 
  protocolInfo,
  onTradeUpdated 
}) {
  const { executeWrite, waitForTx } = useSmartWriteContract();
  const { showNotification } = useNotifications();
  const { core: coreAddress } = getContractAddresses(isMainnet);

  const [copiedHash, setCopiedHash] = useState(null);
  const [isUpdatingStops, setIsUpdatingStops] = useState(false);
  const [activeFocusedInput, setActiveFocusedInput] = useState(null);

  // Edit Mode for TP / SL (closed by default)
  const [isEditingStops, setIsEditingStops] = useState(false);

  // Form states for Stop Loss and Take Profit
  const [tpInput, setTpInput] = useState('');
  const [slInput, setSlInput] = useState('');
  const [stopError, setStopError] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const raw = trade?.raw || trade || {};

  // Exact theme color variables from OrderPanel.jsx
  const goldAccent = '#BC8961';
  const buyColor = 'var(--color-blue, #3b82f6)';
  const sellColor = 'var(--color-red, #ef4444)';
  const buyColorBg = 'var(--color-blue-bg, rgba(59, 130, 246, 0.1))';
  const sellColorBg = 'var(--color-red-bg, rgba(239, 68, 68, 0.1))';
  const themeText = 'var(--text-dark, #f0f0f0)';
  const themeTextMuted = 'var(--text-grey, #8a8a8a)';
  const themeBorder = 'var(--border-color, #262626)';
  const themeControlBg = 'rgba(255, 255, 255, 0.02)';

  // Direction and Side
  const isLong = raw.directionName === 'LONG' || raw.direction === '1' || raw.direction === 1 || trade?.isLong;
  const sideName = isLong ? 'Long' : 'Short';
  const sideColor = isLong ? buyColor : sellColor;
  const sideBg = isLong ? buyColorBg : sellColorBg;

  const lev = raw.leverage ? `${raw.leverage}x` : (trade?.leverage || '5x');
  const levNum = Number(raw.leverage || 5);

  const status = (raw.status || trade?.status || 'UNKNOWN').toUpperCase();
  let statusBadgeColor = themeTextMuted;
  let statusBadgeBg = 'rgba(255, 255, 255, 0.04)';
  if (status === 'OPEN') {
    statusBadgeColor = buyColor;
    statusBadgeBg = buyColorBg;
  } else if (status === 'CLOSED') {
    statusBadgeColor = themeTextMuted;
    statusBadgeBg = 'rgba(255, 255, 255, 0.06)';
  } else if (status === 'CREATED') {
    statusBadgeColor = goldAccent;
    statusBadgeBg = 'rgba(188, 137, 97, 0.12)';
  } else if (status === 'CANCELLED' || status === 'LIQUIDATED') {
    statusBadgeColor = sellColor;
    statusBadgeBg = sellColorBg;
  }

  const collatNum = raw.margin ? Number(raw.margin) / 1e6 : (raw.collateral ? Number(raw.collateral) / 1e6 : 0);
  const oiNum = raw.openInterest ? Number(raw.openInterest) / 1e6 : (collatNum * levNum);
  const entryPriceNum = raw.executionPriceOpen ? Number(raw.executionPriceOpen) / 1e6 : (raw.oraclePriceOpen ? Number(raw.oraclePriceOpen) / 1e6 : null);
  const closePriceNum = raw.executionPriceClose ? Number(raw.executionPriceClose) / 1e6 : (raw.oraclePriceClose ? Number(raw.oraclePriceClose) / 1e6 : null);
  const targetPriceNum = raw.targetPrice && Number(raw.targetPrice) > 0 ? Number(raw.targetPrice) / 1e6 : null;
  const currentPrice = currentMarkPrice || (entryPriceNum || 0);

  // Liquidation Price
  const rawLiq = trade?.liqPrice ? parseFloat(String(trade.liqPrice).replace(/[^0-9.]/g, '')) : null;
  const estLiqPrice = rawLiq || (entryPriceNum 
    ? (isLong ? entryPriceNum * (1 - 0.9 / levNum) : entryPriceNum * (1 + 0.9 / levNum))
    : 0);

  // Current TP / SL formatted
  const currentTpFormatted = raw.currentTakeProfit && Number(raw.currentTakeProfit) > 0
    ? `$${(Number(raw.currentTakeProfit) / 1e6).toFixed(2)}`
    : (trade?.tp || 'None');
  const currentSlFormatted = raw.currentStopLoss && Number(raw.currentStopLoss) > 0
    ? `$${(Number(raw.currentStopLoss) / 1e6).toFixed(2)}`
    : (trade?.sl || 'None');

  // Initialize input fields when trade changes
  useEffect(() => {
    if (trade) {
      const curTP = raw.currentTakeProfit && Number(raw.currentTakeProfit) > 0 
        ? (Number(raw.currentTakeProfit) / 1e6).toFixed(2)
        : '';
      const curSL = raw.currentStopLoss && Number(raw.currentStopLoss) > 0 
        ? (Number(raw.currentStopLoss) / 1e6).toFixed(2)
        : '';
      setTpInput(curTP);
      setSlInput(curSL);
      setStopError('');
    }
  }, [trade, raw.currentTakeProfit, raw.currentStopLoss]);

  // Timestamps
  const createdTimestamp = raw.createdAt || raw.createdTimestamp || raw.orderTimestamp;
  const openedTimestamp = raw.openedAt || raw.openTimestamp || raw.executionTimestamp;
  const closedTimestamp = raw.closedAt || raw.closeTimestamp;
  const cancelledTimestamp = raw.lastUpdatedAt && (status === 'CANCELLED' || status === 'LIQUIDATED') ? raw.lastUpdatedAt : null;

  // Fees & spread
  const commissionPaidUSD = raw.commissionPaid ? Number(raw.commissionPaid) / 1e6 : (raw.openingCommission ? Number(raw.openingCommission) / 1e6 : 0);
  const openingSpreadBps = raw.openingSpread ? Number(raw.openingSpread) / 100 : (raw.longSpread ? Number(raw.longSpread) / 100 : null);
  const closingFeeUSD = raw.closingFee ? Number(raw.closingFee) / 1e6 : 0;
  const traderPayoutUSD = raw.traderPayout ? Number(raw.traderPayout) / 1e6 : null;

  // Estimated exit spread
  const primaryAsset = protocolInfo?.assets?.[0] || protocolInfo;
  const vaultLiquidity = protocolInfo?.vaultBalance ?? 25000000;
  const exitSpreadRes = calculateEstimatedSpreadLocal(
    primaryAsset,
    vaultLiquidity,
    isLong ? 1 : 0,
    oiNum * 1e6,
    false
  );
  const exitSpreadPercent = exitSpreadRes?.tradeSpreadPercent || 0;
  const exitSpreadBps = exitSpreadRes?.tradeSpreadBps || 0;

  // Borrow fee calculations
  let borrowFeeUSD = 0;
  if (raw.borrowFee != null && Number(raw.borrowFee) > 0) {
    borrowFeeUSD = Number(raw.borrowFee) / 1e6;
  } else if (status === 'OPEN' && (raw.openTimestamp || raw.openedAt)) {
    const openedTime = Number(raw.openTimestamp || raw.openedAt);
    const nowSec = Math.floor(Date.now() / 1000);
    const hoursElapsed = Math.max(0, (nowSec - openedTime) / 3600);
    const hourlyRateBps = isLong 
      ? Number(primaryAsset?.currentLongBorrowRate || 40) 
      : Number(primaryAsset?.currentShortBorrowRate || 40);
    const hourlyRatePercent = (hourlyRateBps / 10000);
    borrowFeeUSD = oiNum * (hourlyRatePercent / 100) * hoursElapsed;
  }

  // PnL Calculations
  let displayPnlUSD = trade?.pnlUsd || '—';
  let displayPnlPct = trade?.pnlPct || '—';
  let isProfit = trade?.isProfit ?? true;

  if (status === 'CLOSED' && raw.finalPnl != null) {
    const finalPnlNum = Number(raw.finalPnl) / 1e6;
    isProfit = finalPnlNum >= 0;
    displayPnlUSD = `${finalPnlNum >= 0 ? '+' : ''}$${finalPnlNum.toFixed(2)}`;
    const pct = collatNum > 0 ? (finalPnlNum / collatNum) * 100 : 0;
    displayPnlPct = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  }

  // Validation
  const validateStops = (tpVal, slVal) => {
    const tp = parseFloat(tpVal);
    const sl = parseFloat(slVal);
    const entry = entryPriceNum || currentPrice;
    const liq = estLiqPrice;

    if (!entry) return null;

    if (isLong) {
      if (!isNaN(sl) && sl > 0) {
        if (sl >= entry) {
          return `Stop Loss ($${sl.toFixed(2)}) must be below Entry ($${entry.toFixed(2)})`;
        }
        if (liq > 0 && sl <= liq) {
          return `Stop Loss ($${sl.toFixed(2)}) must be above Liquidation ($${liq.toFixed(2)})`;
        }
      }
      if (!isNaN(tp) && tp > 0) {
        if (tp <= entry) {
          return `Take Profit ($${tp.toFixed(2)}) must be above Entry ($${entry.toFixed(2)})`;
        }
      }
    } else {
      if (!isNaN(sl) && sl > 0) {
        if (sl <= entry) {
          return `Stop Loss ($${sl.toFixed(2)}) must be above Entry ($${entry.toFixed(2)})`;
        }
        if (liq > 0 && sl >= liq) {
          return `Stop Loss ($${sl.toFixed(2)}) must be below Liquidation ($${liq.toFixed(2)})`;
        }
      }
      if (!isNaN(tp) && tp > 0) {
        if (tp >= entry) {
          return `Take Profit ($${tp.toFixed(2)}) must be below Entry ($${entry.toFixed(2)})`;
        }
      }
    }
    return null;
  };

  const handleUpdateStops = async () => {
    const errorMsg = validateStops(tpInput, slInput);
    if (errorMsg) {
      setStopError(errorMsg);
      return;
    }
    setStopError('');

    const newSLNum = parseFloat(slInput) || 0;
    const newTPNum = parseFloat(tpInput) || 0;

    const scaledSL = BigInt(Math.round(newSLNum * 1e6));
    const scaledTP = BigInt(Math.round(newTPNum * 1e6));

    setIsUpdatingStops(true);
    showNotification(`Updating stops for #${raw.tradeId}...`, 'info', null, 3000, 'XAU');

    try {
      const txHash = await executeWrite({
        address: coreAddress,
        abi: brokexCoreAbi,
        functionName: 'setStops',
        args: [BigInt(raw.tradeId), scaledSL, scaledTP]
      });

      showNotification(`Stops updated successfully!`, 'success', txHash, 5000, 'XAU');
      await waitForTx(txHash);
      setIsEditingStops(false);

      if (onTradeUpdated) {
        onTradeUpdated(raw.tradeId, newSLNum, newTPNum);
      }
    } catch (err) {
      console.error('Failed to set stops:', err);
      const msg = err?.shortMessage || err?.message || 'Failed to update stops';
      setStopError(msg.length > 80 ? msg.slice(0, 80) + '...' : msg);
      showNotification(msg.length > 80 ? msg.slice(0, 80) + '...' : msg, 'error', null, 5000, 'XAU');
    } finally {
      setIsUpdatingStops(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const d = new Date(Number(timestamp) * 1000);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedHash(type);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const shortenHash = (hash) => {
    if (!hash || typeof hash !== 'string') return '—';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Timeline events
  const timelineSteps = [];
  if (raw.creationTxHash || raw.createdAt) {
    timelineSteps.push({
      title: 'Order Created',
      description: raw.orderTypeName ? `${raw.orderTypeName} order registered` : 'Order submitted onchain',
      txHash: raw.creationTxHash,
      blockNumber: raw.creationBlock,
      timestamp: raw.createdAt,
      type: 'creation'
    });
  }

  if (raw.openingTxHash || raw.openedAt || raw.openTimestamp) {
    timelineSteps.push({
      title: 'Position Opened',
      description: `Executed at $${entryPriceNum ? entryPriceNum.toFixed(2) : '—'}`,
      txHash: raw.openingTxHash,
      blockNumber: raw.openingBlock,
      timestamp: raw.openedAt || raw.openTimestamp,
      type: 'opening'
    });
  }

  if (raw.closingTxHash || raw.closedAt) {
    timelineSteps.push({
      title: `Position ${raw.closeMethodName || 'Closed'}`,
      description: raw.executionPriceClose 
        ? `Closed at $${(Number(raw.executionPriceClose) / 1e6).toFixed(2)} (${displayPnlUSD})`
        : `Closed via ${raw.closeMethodName || 'Market'}`,
      txHash: raw.closingTxHash,
      blockNumber: raw.closingBlock,
      timestamp: raw.closedAt,
      type: 'closing'
    });
  }

  if (raw.cancellationTxHash || (status === 'CANCELLED' && raw.lastUpdatedAt)) {
    timelineSteps.push({
      title: 'Order Cancelled',
      description: 'Order cancelled onchain',
      txHash: raw.cancellationTxHash,
      timestamp: raw.lastUpdatedAt,
      type: 'cancellation'
    });
  }

  const eventsList = Array.isArray(raw.events) ? raw.events : [];

  if (!isOpen || !trade) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999999,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        touchAction: 'auto',
        animation: 'fadeIn 0.18s ease-out'
      }} 
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .order-content-scroll::-webkit-scrollbar {
          display: none;
        }
        .order-content-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Drawer Container (OrderPanel DA with refined padding & gap) */}
      <div 
        className="order panel"
        style={{
          width: '100%',
          maxWidth: '350px',
          height: '100%',
          maxHeight: '100vh',
          backgroundColor: 'var(--panel-bg, #080808)',
          borderLeft: `1px solid ${themeBorder}`,
          display: 'flex',
          flexDirection: 'column',
          fontSize: '12px',
          color: themeText,
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.85)',
          animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'auto',
          userSelect: 'text',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable Main Content with comfortable padding */}
        <div 
          className="order-content-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px 20px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* Top Tabs (Long / Short & Status) */}
          <div style={{ display: 'flex', flexShrink: 0, backgroundColor: themeControlBg, borderRadius: '6px', padding: '3px', border: `1px solid ${themeBorder}`, alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '6px 10px',
              borderRadius: '4px',
              backgroundColor: sideBg,
              border: `1px solid ${sideColor}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: sideColor, fontWeight: 600, fontSize: '12px' }}>{sideName} {lev}</span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  background: statusBadgeBg,
                  color: statusBadgeColor
                }}>
                  {status}
                </span>
              </div>
              <div style={{ color: sideColor, fontSize: '11px', fontFamily: 'Source Code Pro, monospace', marginTop: '2px' }}>
                Position #{raw.tradeId}
              </div>
            </div>

            {/* Close Sidebar Icon Button */}
            <div 
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                cursor: 'pointer',
                color: themeTextMuted,
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = themeText; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = themeTextMuted; }}
              title="Close panel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="15" y1="3" x2="15" y2="21"></line>
                <polyline points="9 10 12 12 9 14"></polyline>
              </svg>
            </div>
          </div>

          {/* Unrealized / Realized PnL Header (USD on top, Percentage on bottom) */}
          <div style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            padding: '2px 2px'
          }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>
              {status === 'CLOSED' ? 'Realized PnL' : 'Unrealized PnL'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
              <span style={{
                color: isProfit ? buyColor : sellColor,
                fontFamily: 'Source Code Pro, monospace',
                fontWeight: 700,
                fontSize: '16px',
                lineHeight: '1.1'
              }}>
                {displayPnlUSD}
              </span>
              <span style={{
                color: isProfit ? buyColor : sellColor,
                fontFamily: 'Source Code Pro, monospace',
                fontWeight: 600,
                fontSize: '11px',
                opacity: 0.9
              }}>
                {displayPnlPct}
              </span>
            </div>
          </div>

          {/* SECTION 1: Live Position Details (Displayed Cleanly at the Top) */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: themeText, borderBottom: `1px solid ${themeBorder}`, paddingBottom: '3px', marginBottom: '2px' }}>
              Position Metrics
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Collateral</span>
              <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>${collatNum.toFixed(2)} USDC</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Exposure Size</span>
              <span style={{ color: goldAccent, fontFamily: 'Source Code Pro, monospace', fontWeight: 600 }}>${oiNum.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Entry Price</span>
              <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>{entryPriceNum ? `$${entryPriceNum.toFixed(2)}` : '—'}</span>
            </div>

            {targetPriceNum && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Trigger Price</span>
                <span style={{ color: goldAccent, fontFamily: 'Source Code Pro, monospace' }}>${targetPriceNum.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>
                {status === 'CLOSED' ? 'Close Price' : 'Mark Price'}
              </span>
              <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>
                ${(status === 'CLOSED' ? closePriceNum : currentPrice) ? (status === 'CLOSED' ? closePriceNum : currentPrice).toFixed(2) : '—'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Liquidation Price</span>
              <span style={{ color: sellColor, fontFamily: 'Source Code Pro, monospace', fontWeight: 600 }}>
                {trade?.liqPrice || (estLiqPrice ? `$${estLiqPrice.toFixed(2)}` : '—')}
              </span>
            </div>

            {/* Take Profit Row with Edit Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Take Profit</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: buyColor, fontFamily: 'Source Code Pro, monospace' }}>{currentTpFormatted}</span>
                {(status === 'OPEN' || status === 'CREATED') && (
                  <button
                    onClick={() => setIsEditingStops(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: goldAccent,
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '0 2px'
                    }}
                    title="Edit Take Profit"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Stop Loss Row with Edit Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Stop Loss</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: sellColor, fontFamily: 'Source Code Pro, monospace' }}>{currentSlFormatted}</span>
                {(status === 'OPEN' || status === 'CREATED') && (
                  <button
                    onClick={() => setIsEditingStops(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: goldAccent,
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '0 2px'
                    }}
                    title="Edit Stop Loss"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Timestamps in Position Metrics */}
            {createdTimestamp && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Created At</span>
                <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>{formatDate(createdTimestamp)}</span>
              </div>
            )}

            {openedTimestamp && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Opened At</span>
                <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>{formatDate(openedTimestamp)}</span>
              </div>
            )}

            {closedTimestamp && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Closed At</span>
                <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>{formatDate(closedTimestamp)}</span>
              </div>
            )}

            {cancelledTimestamp && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Cancelled At</span>
                <span style={{ color: sellColor, fontFamily: 'Source Code Pro, monospace' }}>{formatDate(cancelledTimestamp)}</span>
              </div>
            )}
          </div>

          {/* SECTION 2: Edit TP / SL Form (Opens only on demand) */}
          {(status === 'OPEN' || status === 'CREATED') && isEditingStops && (
            <div style={{
              flexShrink: 0,
              backgroundColor: themeControlBg,
              borderRadius: '6px',
              border: `1px solid ${goldAccent}`,
              display: 'flex',
              flexDirection: 'column',
              padding: '6px',
              gap: '6px',
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: themeText }}>Modify TP / SL</span>
                <button
                  onClick={() => setIsEditingStops(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: themeTextMuted,
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: '2px 4px'
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Take Profit Box */}
              <div
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: activeFocusedInput === 'tp' ? `1px solid ${goldAccent}` : `1px solid ${themeBorder}`,
                  borderRadius: '4px',
                  transition: 'border 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: themeTextMuted }}>Take Profit</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['10%', '25%', '50%', '100%'].map(p => (
                      <div
                        key={p}
                        onClick={() => {
                          const entry = entryPriceNum || currentPrice;
                          if (!entry) return;
                          const pct = parseFloat(p) / 100;
                          const calculatedTp = isLong
                            ? entry * (1 + pct / levNum)
                            : entry * (1 - pct / levNum);
                          setTpInput(calculatedTp.toFixed(2));
                          setStopError(validateStops(calculatedTp.toFixed(2), slInput) || '');
                        }}
                        style={{
                          fontSize: '10px',
                          color: goldAccent,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontFamily: 'Source Code Pro, monospace',
                          transition: 'all 0.15s'
                        }}>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="no-spinners"
                    value={tpInput}
                    onFocus={() => setActiveFocusedInput('tp')}
                    onBlur={() => setActiveFocusedInput(null)}
                    onChange={(e) => {
                      setTpInput(e.target.value);
                      setStopError(validateStops(e.target.value, slInput) || '');
                    }}
                    placeholder="None"
                    style={{ fontSize: '13px', color: themeText, backgroundColor: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', padding: 0, width: '120px', fontFamily: 'Source Code Pro, monospace' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: themeText, fontWeight: 500, fontSize: '11px' }}>
                    USD
                  </div>
                </div>
              </div>

              {/* Stop Loss Box */}
              <div
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: activeFocusedInput === 'sl' ? `1px solid ${goldAccent}` : `1px solid ${themeBorder}`,
                  borderRadius: '4px',
                  transition: 'border 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: themeTextMuted }}>Stop Loss</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['10%', '25%', '50%', '70%'].map(p => (
                      <div
                        key={p}
                        onClick={() => {
                          const entry = entryPriceNum || currentPrice;
                          if (!entry) return;
                          const pct = parseFloat(p) / 100;
                          const calculatedSl = isLong
                            ? entry * (1 - pct / levNum)
                            : entry * (1 + pct / levNum);
                          setSlInput(calculatedSl.toFixed(2));
                          setStopError(validateStops(tpInput, calculatedSl.toFixed(2)) || '');
                        }}
                        style={{
                          fontSize: '10px',
                          color: goldAccent,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontFamily: 'Source Code Pro, monospace',
                          transition: 'all 0.15s'
                        }}>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="no-spinners"
                    value={slInput}
                    onFocus={() => setActiveFocusedInput('sl')}
                    onBlur={() => setActiveFocusedInput(null)}
                    onChange={(e) => {
                      setSlInput(e.target.value);
                      setStopError(validateStops(tpInput, e.target.value) || '');
                    }}
                    placeholder="None"
                    style={{ fontSize: '13px', color: themeText, backgroundColor: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', padding: 0, width: '120px', fontFamily: 'Source Code Pro, monospace' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: themeText, fontWeight: 500, fontSize: '11px' }}>
                    USD
                  </div>
                </div>
              </div>

              {stopError && (
                <div style={{
                  fontSize: '10px',
                  color: sellColor,
                  background: sellColorBg,
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  {stopError}
                </div>
              )}

              <button
                onClick={handleUpdateStops}
                disabled={isUpdatingStops || Boolean(stopError)}
                type="button"
                style={{
                  width: '100%',
                  backgroundColor: stopError ? 'rgba(255, 255, 255, 0.05)' : goldAccent,
                  color: stopError ? themeTextMuted : '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isUpdatingStops || Boolean(stopError) ? 'not-allowed' : 'pointer',
                  opacity: isUpdatingStops ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: stopError ? 'none' : '0 2px 10px rgba(188, 137, 97, 0.3)'
                }}
                onMouseEnter={(e) => { if (!stopError && !isUpdatingStops) e.currentTarget.style.opacity = 0.9; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
              >
                {isUpdatingStops ? 'Updating Stops...' : 'Save Stops'}
              </button>
            </div>
          )}

          {/* SECTION 3: Fees & Protocol Breakdown (Clearly Segmented) */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: themeText, borderBottom: `1px solid ${themeBorder}`, paddingBottom: '3px', marginBottom: '2px' }}>
              Fees & Protocol Breakdown
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Open Commission</span>
              <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>-${commissionPaidUSD.toFixed(3)} USDC</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>
                {status === 'CLOSED' ? 'Borrow Fees Paid' : 'Accrued Borrow Fee'}
              </span>
              <span style={{ color: borrowFeeUSD > 0 ? sellColor : themeText, fontFamily: 'Source Code Pro, monospace' }}>
                -${borrowFeeUSD.toFixed(4)} USDC
              </span>
            </div>

            {openingSpreadBps != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Open Spread</span>
                <span style={{ color: goldAccent, fontFamily: 'Source Code Pro, monospace' }}>
                  {openingSpreadBps.toFixed(2)} bps ({(openingSpreadBps / 100).toFixed(3)}%)
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>
                {status === 'CLOSED' ? 'Closing Spread' : 'Est. Close Spread'}
              </span>
              <span style={{ color: goldAccent, fontFamily: 'Source Code Pro, monospace' }}>
                {exitSpreadBps.toFixed(2)} bps ({(exitSpreadPercent).toFixed(3)}%)
              </span>
            </div>

            {closingFeeUSD > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Closing Fee</span>
                <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>-${closingFeeUSD.toFixed(3)} USDC</span>
              </div>
            )}

            {traderPayoutUSD != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: `1px dashed ${themeBorder}` }}>
                <span style={{ color: themeText, fontWeight: 600 }}>Trader Payout</span>
                <span style={{ color: goldAccent, fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace' }}>${traderPayoutUSD.toFixed(2)} USDC</span>
              </div>
            )}
          </div>

          {/* SECTION 4: Onchain Timeline & Proofs (With Spaced Top Margin) */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: themeText, borderBottom: `1px solid ${themeBorder}`, paddingBottom: '3px' }}>
              Onchain Timeline
            </div>

            {timelineSteps.length === 0 ? (
              <div style={{ fontSize: '11px', color: themeTextMuted }}>
                No transaction recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {timelineSteps.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}>
                      {/* Square indicator */}
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '1px',
                        background: idx === timelineSteps.length - 1 ? goldAccent : themeTextMuted,
                        flexShrink: 0
                      }} />
                      {idx < timelineSteps.length - 1 && (
                        <div style={{
                          width: '1px',
                          flex: 1,
                          background: themeBorder,
                          marginTop: '3px'
                        }} />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 600, color: themeText }}>{step.title}</span>
                        {step.timestamp && (
                          <span style={{ fontSize: '10px', color: themeTextMuted, fontFamily: 'Source Code Pro, monospace' }}>
                            {formatDate(step.timestamp)}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '10px', color: themeTextMuted }}>
                        {step.description} {step.blockNumber && `• Block #${step.blockNumber}`}
                      </div>

                      {step.txHash && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '10px' }}>
                          <span style={{ fontFamily: 'Source Code Pro, monospace', color: themeTextMuted }}>
                            {shortenHash(step.txHash)}
                          </span>

                          <button
                            onClick={() => copyToClipboard(step.txHash, `step-${idx}`)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedHash === `step-${idx}` ? buyColor : themeTextMuted,
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '10px'
                            }}
                          >
                            {copiedHash === `step-${idx}` ? 'Copied' : 'Copy'}
                          </button>

                          <a
                            href={getExplorerTxUrl(step.txHash, isMainnet)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: goldAccent,
                              textDecoration: 'none',
                              fontSize: '10px',
                              fontWeight: 600
                            }}
                          >
                            BaseScan ↗
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contract Events */}
            {eventsList.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${themeBorder}` }}>
                <div style={{ fontSize: '11px', color: themeTextMuted, marginBottom: '6px', fontWeight: 600 }}>
                  Contract Events ({eventsList.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {eventsList.map((ev, i) => (
                    <div key={i} style={{
                      padding: '3px 0',
                      fontSize: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>
                        {ev.event}
                      </span>
                      {ev.transactionHash && (
                        <a
                          href={getExplorerTxUrl(ev.transactionHash, isMainnet)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: goldAccent, textDecoration: 'none', fontSize: '10px', fontFamily: 'Source Code Pro, monospace' }}
                        >
                          {shortenHash(ev.transactionHash)} ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
