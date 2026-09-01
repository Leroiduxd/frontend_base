import React, { useState, useEffect } from 'react';
import { getExplorerTxUrl, getExplorerAddressUrl, getExplorerBlockUrl } from '../utils/contracts';

const goldAccent = '#BC8961';
const blueColor = 'var(--color-blue, #3b82f6)';
const redColor = 'var(--color-red, #ef4444)';

export default function TradeDetailsDrawer({ isOpen, onClose, trade, isMainnet, currentMarkPrice, protocolInfo }) {
  const [copiedHash, setCopiedHash] = useState(null);

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

  if (!isOpen || !trade) return null;

  const raw = trade.raw || trade;

  // Formatting helpers
  const isLong = raw.directionName === 'LONG' || raw.direction === '1' || raw.direction === 1 || trade.isLong;
  const sideName = isLong ? 'LONG' : 'SHORT';
  const sideColor = isLong ? blueColor : redColor;
  const sideBg = isLong ? 'var(--color-blue-bg, rgba(59, 130, 246, 0.12))' : 'var(--color-red-bg, rgba(239, 68, 68, 0.12))';

  const lev = raw.leverage ? `${raw.leverage}x` : (trade.leverage || '5x');
  const levNum = Number(raw.leverage || 5);

  // Status styling
  const status = (raw.status || trade.status || 'UNKNOWN').toUpperCase();
  let statusBadgeColor = 'var(--text-grey)';
  let statusBadgeBg = 'rgba(255, 255, 255, 0.06)';
  if (status === 'OPEN') {
    statusBadgeColor = blueColor;
    statusBadgeBg = 'var(--color-blue-bg, rgba(59, 130, 246, 0.12))';
  } else if (status === 'CLOSED') {
    statusBadgeColor = 'var(--text-dark)';
    statusBadgeBg = 'rgba(255, 255, 255, 0.1)';
  } else if (status === 'CREATED') {
    statusBadgeColor = goldAccent;
    statusBadgeBg = 'rgba(188, 137, 97, 0.12)';
  } else if (status === 'CANCELLED' || status === 'LIQUIDATED') {
    statusBadgeColor = redColor;
    statusBadgeBg = 'var(--color-red-bg, rgba(239, 68, 68, 0.12))';
  }

  // Financial calculations
  const collatNum = raw.margin ? Number(raw.margin) / 1e6 : (raw.collateral ? Number(raw.collateral) / 1e6 : 0);
  const oiNum = raw.openInterest ? Number(raw.openInterest) / 1e6 : (collatNum * levNum);
  const entryPriceNum = raw.executionPriceOpen ? Number(raw.executionPriceOpen) / 1e6 : (raw.oraclePriceOpen ? Number(raw.oraclePriceOpen) / 1e6 : null);
  const closePriceNum = raw.executionPriceClose ? Number(raw.executionPriceClose) / 1e6 : (raw.oraclePriceClose ? Number(raw.oraclePriceClose) / 1e6 : null);
  const targetPriceNum = raw.targetPrice && Number(raw.targetPrice) > 0 ? Number(raw.targetPrice) / 1e6 : null;
  const currentPrice = currentMarkPrice || (entryPriceNum || 0);

  // Fees & spread
  const commissionPaidUSD = raw.commissionPaid ? Number(raw.commissionPaid) / 1e6 : (raw.openingCommission ? Number(raw.openingCommission) / 1e6 : 0);
  const openingSpreadBps = raw.openingSpread ? Number(raw.openingSpread) / 100 : (raw.longSpread ? Number(raw.longSpread) / 100 : null);
  const closingFeeUSD = raw.closingFee ? Number(raw.closingFee) / 1e6 : 0;
  const traderPayoutUSD = raw.traderPayout ? Number(raw.traderPayout) / 1e6 : null;

  // Borrow fee calculations
  let borrowFeeUSD = 0;
  if (raw.borrowFee != null && Number(raw.borrowFee) > 0) {
    borrowFeeUSD = Number(raw.borrowFee) / 1e6;
  } else if (status === 'OPEN' && (raw.openTimestamp || raw.openedAt)) {
    const openedTime = Number(raw.openTimestamp || raw.openedAt);
    const nowSec = Math.floor(Date.now() / 1000);
    const hoursElapsed = Math.max(0, (nowSec - openedTime) / 3600);
    const primaryAsset = protocolInfo?.assets?.[0] || protocolInfo;
    const hourlyRateBps = isLong 
      ? Number(primaryAsset?.currentLongBorrowRate || 40) 
      : Number(primaryAsset?.currentShortBorrowRate || 40);
    const hourlyRatePercent = (hourlyRateBps / 10000); // 40 => 0.004%
    borrowFeeUSD = oiNum * (hourlyRatePercent / 100) * hoursElapsed;
  }

  // PnL
  let displayPnlUSD = trade.pnlUsd || '—';
  let displayPnlPct = trade.pnlPct || '—';
  let isProfit = trade.isProfit ?? true;

  if (status === 'CLOSED' && raw.finalPnl != null) {
    const finalPnlNum = Number(raw.finalPnl) / 1e6;
    isProfit = finalPnlNum >= 0;
    displayPnlUSD = `${isProfit ? '+' : ''}$${finalPnlNum.toFixed(2)}`;
    const pct = collatNum > 0 ? (finalPnlNum / collatNum) * 100 : 0;
    displayPnlPct = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  }

  // Date formatters
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
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  // Collect all unique transaction records
  const timelineSteps = [];

  if (raw.creationTxHash || raw.createdAt) {
    timelineSteps.push({
      title: 'Order Created',
      description: raw.orderTypeName ? `${raw.orderTypeName} Order submitted` : 'Order submitted onchain',
      txHash: raw.creationTxHash,
      blockNumber: raw.creationBlock,
      timestamp: raw.createdAt,
      type: 'creation',
      badge: 'CREATED'
    });
  }

  if (raw.openingTxHash || raw.openedAt) {
    timelineSteps.push({
      title: 'Position Opened',
      description: `Executed at $${entryPriceNum ? entryPriceNum.toFixed(2) : '—'}`,
      txHash: raw.openingTxHash,
      blockNumber: raw.openingBlock,
      timestamp: raw.openedAt || raw.openTimestamp,
      type: 'opening',
      badge: 'OPEN'
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
      type: 'closing',
      badge: raw.closeMethodName || 'CLOSED'
    });
  }

  if (raw.cancellationTxHash) {
    timelineSteps.push({
      title: 'Order Cancelled',
      description: 'Order cancelled by trader',
      txHash: raw.cancellationTxHash,
      timestamp: raw.lastUpdatedAt,
      type: 'cancellation',
      badge: 'CANCELLED'
    });
  }

  const eventsList = Array.isArray(raw.events) ? raw.events : [];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999999,
      display: 'flex',
      justifyContent: 'flex-end',
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onClose}>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .drawer-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .drawer-scrollbar::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 4px;
        }
        .drawer-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #383838;
        }
      `}</style>

      {/* Drawer Container */}
      <div 
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          background: 'var(--panel-bg, #080808)',
          borderLeft: '1px solid var(--border-color, #262626)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.8)',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          color: 'var(--text-dark, #f0f0f0)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color, #262626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: goldAccent,
              color: '#000',
              fontWeight: 'bold',
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontFamily: 'Source Code Pro, monospace'
            }}>
              #{raw.tradeId}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '700', fontSize: '14px' }}>XAU/USD</span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: sideBg,
                  color: sideColor,
                  letterSpacing: '0.05em'
                }}>
                  {sideName} {lev}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-grey, #8a8a8a)' }}>
                {raw.orderTypeName || 'MARKET'} Trade Details & Onchain Proofs
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '9px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '4px',
              background: statusBadgeBg,
              color: statusBadgeColor,
              border: `1px solid ${statusBadgeColor}33`,
              textTransform: 'uppercase'
            }}>
              {status}
            </span>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color, #262626)',
                color: 'var(--text-grey, #8a8a8a)',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-grey, #8a8a8a)'; e.currentTarget.style.borderColor = 'var(--border-color, #262626)'; }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="drawer-scrollbar" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          
          {/* Top PnL Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid var(--border-color, #262626)',
            borderRadius: '10px',
            padding: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-grey, #8a8a8a)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {status === 'CLOSED' ? 'Realized Net PnL' : 'Unrealized PnL (Net)'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-grey, #8a8a8a)' }}>
                Network: <strong style={{ color: isMainnet ? '#10b981' : goldAccent }}>{isMainnet ? 'Base Mainnet' : 'Base Sepolia'}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'Source Code Pro, monospace',
                color: isProfit ? blueColor : redColor
              }}>
                {displayPnlUSD}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: 'Source Code Pro, monospace',
                color: isProfit ? blueColor : redColor
              }}>
                ({displayPnlPct})
              </span>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-grey, #8a8a8a)', display: 'block' }}>Collateral</span>
                <span style={{ fontSize: '12px', fontWeight: '600', fontFamily: 'Source Code Pro, monospace' }}>
                  ${collatNum.toFixed(2)} USDC
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-grey, #8a8a8a)', display: 'block' }}>Position Size</span>
                <span style={{ fontSize: '12px', fontWeight: '600', fontFamily: 'Source Code Pro, monospace', color: goldAccent }}>
                  ${oiNum.toFixed(2)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-grey, #8a8a8a)', display: 'block' }}>Leverage</span>
                <span style={{ fontSize: '12px', fontWeight: '600', fontFamily: 'Source Code Pro, monospace' }}>
                  {lev}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing & Execution Details */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color, #262626)',
            borderRadius: '10px',
            padding: '14px 16px'
          }}>
            <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: goldAccent, fontWeight: '700', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Execution & Prices
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Entry Price</span>
                <span style={{ fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>
                  {entryPriceNum ? `$${entryPriceNum.toFixed(2)}` : '—'}
                </span>
              </div>

              {targetPriceNum && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Order Target Price</span>
                  <span style={{ fontFamily: 'Source Code Pro, monospace', fontWeight: '600', color: goldAccent }}>
                    ${targetPriceNum.toFixed(2)}
                  </span>
                </div>
              )}

              {status === 'CLOSED' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Close Price</span>
                  <span style={{ fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>
                    {closePriceNum ? `$${closePriceNum.toFixed(2)}` : '—'}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Current Oracle Price</span>
                  <span style={{ fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>
                    ${currentPrice ? currentPrice.toFixed(2) : '—'}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Estimated Liquidation</span>
                <span style={{ fontFamily: 'Source Code Pro, monospace', fontWeight: '600', color: redColor }}>
                  {trade.liqPrice || '—'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Take Profit (TP)</span>
                <span style={{ fontFamily: 'Source Code Pro, monospace', color: raw.currentTakeProfit && Number(raw.currentTakeProfit) > 0 ? blueColor : 'var(--text-grey, #8a8a8a)' }}>
                  {raw.currentTakeProfit && Number(raw.currentTakeProfit) > 0 ? `$${(Number(raw.currentTakeProfit) / 1e6).toFixed(2)}` : 'None'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Stop Loss (SL)</span>
                <span style={{ fontFamily: 'Source Code Pro, monospace', color: raw.currentStopLoss && Number(raw.currentStopLoss) > 0 ? redColor : 'var(--text-grey, #8a8a8a)' }}>
                  {raw.currentStopLoss && Number(raw.currentStopLoss) > 0 ? `$${(Number(raw.currentStopLoss) / 1e6).toFixed(2)}` : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Fees & Borrow Breakdown */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color, #262626)',
            borderRadius: '10px',
            padding: '14px 16px'
          }}>
            <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: goldAccent, fontWeight: '700', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Protocol Fees & Borrow Details
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>
                  {status === 'CLOSED' ? 'Borrow Fees Paid' : 'Accrued Borrow Fee'}
                </span>
                <span style={{ fontFamily: 'Source Code Pro, monospace', fontWeight: '600', color: borrowFeeUSD > 0 ? redColor : 'inherit' }}>
                  -${borrowFeeUSD.toFixed(4)} USDC
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Opening Commission</span>
                <span style={{ fontFamily: 'Source Code Pro, monospace' }}>
                  -${commissionPaidUSD.toFixed(4)} USDC
                </span>
              </div>

              {openingSpreadBps != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Opening Spread</span>
                  <span style={{ fontFamily: 'Source Code Pro, monospace' }}>
                    {openingSpreadBps.toFixed(2)} bps ({(openingSpreadBps / 100).toFixed(3)}%)
                  </span>
                </div>
              )}

              {closingFeeUSD > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Closing Fee</span>
                  <span style={{ fontFamily: 'Source Code Pro, monospace' }}>
                    -${closingFeeUSD.toFixed(4)} USDC
                  </span>
                </div>
              )}

              {traderPayoutUSD != null && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  <span style={{ color: 'var(--text-dark, #f0f0f0)', fontWeight: '600' }}>Trader Final Payout</span>
                  <span style={{ fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold', color: goldAccent }}>
                    ${traderPayoutUSD.toFixed(2)} USDC
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* On-Chain Lifecycle Timeline */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color, #262626)',
            borderRadius: '10px',
            padding: '14px 16px'
          }}>
            <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: goldAccent, fontWeight: '700', letterSpacing: '0.05em', marginBottom: '14px' }}>
              Onchain Transactions & Proofs
            </h4>

            {timelineSteps.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-grey, #8a8a8a)', textAlign: 'center', padding: '10px 0' }}>
                No blockchain transactions recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {timelineSteps.map((step, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    gap: '12px',
                    position: 'relative'
                  }}>
                    {/* Step Icon / Line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: idx === timelineSteps.length - 1 ? goldAccent : 'rgba(255, 255, 255, 0.1)',
                        border: `2px solid ${idx === timelineSteps.length - 1 ? '#000' : 'var(--border-color, #262626)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        ✓
                      </div>
                      {idx < timelineSteps.length - 1 && (
                        <div style={{
                          width: '2px',
                          flex: 1,
                          background: 'var(--border-color, #262626)',
                          marginTop: '4px',
                          marginBottom: '4px'
                        }} />
                      )}
                    </div>

                    {/* Step Content */}
                    <div style={{ flex: 1, fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark, #f0f0f0)' }}>
                          {step.title}
                        </span>
                        {step.timestamp && (
                          <span style={{ fontSize: '10px', color: 'var(--text-grey, #8a8a8a)', fontFamily: 'Source Code Pro, monospace' }}>
                            {formatDate(step.timestamp)}
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '10px', color: 'var(--text-grey, #8a8a8a)', marginBottom: '6px' }}>
                        {step.description} {step.blockNumber && `(Block #${step.blockNumber})`}
                      </p>

                      {step.txHash ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(0, 0, 0, 0.35)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          width: 'fit-content'
                        }}>
                          <span style={{ fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey, #8a8a8a)' }}>
                            Tx: {shortenHash(step.txHash)}
                          </span>

                          <button
                            onClick={() => copyToClipboard(step.txHash, `step-${idx}`)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedHash === `step-${idx}` ? '#10b981' : goldAccent,
                              cursor: 'pointer',
                              fontSize: '10px',
                              padding: '0 2px'
                            }}
                            title="Copy transaction hash"
                          >
                            {copiedHash === `step-${idx}` ? 'Copied!' : 'Copy'}
                          </button>

                          <a
                            href={getExplorerTxUrl(step.txHash, isMainnet)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: goldAccent,
                              textDecoration: 'none',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontWeight: '600'
                            }}
                          >
                            BaseScan ↗
                          </a>
                        </div>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-grey, #8a8a8a)', fontStyle: 'italic' }}>
                          Hash pending indexer
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Contract Events (If available) */}
          {eventsList.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color, #262626)',
              borderRadius: '10px',
              padding: '14px 16px'
            }}>
              <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: goldAccent, fontWeight: '700', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Emitted Smart Contract Events ({eventsList.length})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {eventsList.map((ev, i) => (
                  <div key={i} style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    fontSize: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', color: goldAccent, fontFamily: 'Source Code Pro, monospace' }}>
                        {ev.event}
                      </span>
                      {ev.blockNumber && (
                        <a
                          href={getExplorerBlockUrl(ev.blockNumber, isMainnet)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text-grey, #8a8a8a)', textDecoration: 'none' }}
                        >
                          Block #{ev.blockNumber} ↗
                        </a>
                      )}
                    </div>

                    {ev.transactionHash && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-grey, #8a8a8a)', fontFamily: 'Source Code Pro, monospace' }}>
                          {shortenHash(ev.transactionHash)}
                        </span>
                        <a
                          href={getExplorerTxUrl(ev.transactionHash, isMainnet)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: blueColor, textDecoration: 'none', fontWeight: '600' }}
                        >
                          View Tx ↗
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trader Wallet info */}
          {raw.trader && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color, #262626)',
              fontSize: '10px'
            }}>
              <span style={{ color: 'var(--text-grey, #8a8a8a)' }}>Trader Address</span>
              <a
                href={getExplorerAddressUrl(raw.trader, isMainnet)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-dark, #f0f0f0)', fontFamily: 'Source Code Pro, monospace', textDecoration: 'none' }}
              >
                {raw.trader.slice(0, 6)}...{raw.trader.slice(-4)} ↗
              </a>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-color, #262626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.4)'
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-grey, #8a8a8a)' }}>
            Brokex Core v1.0 • Base
          </span>

          <button
            onClick={onClose}
            style={{
              background: goldAccent,
              border: 'none',
              color: '#000',
              fontSize: '11px',
              fontWeight: '700',
              padding: '7px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}
