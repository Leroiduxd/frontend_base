import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function WelcomePromoModal({ onReferNow }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show smoothly on visit
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleActionRefer = () => {
    setIsOpen(false);
    if (onReferNow) {
      onReferNow();
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        animation: 'promoFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes promoFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .promo-btn-primary:hover {
          opacity: 0.92;
        }
        .promo-btn-secondary:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          border-color: var(--gold) !important;
        }
        .promo-scrollable::-webkit-scrollbar {
          display: none;
        }
        .promo-scrollable {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (max-width: 540px) {
          .promo-reward-card-desktop {
            display: none !important;
          }
          .promo-grid-steps {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .promo-hero-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0 !important;
          }
          .promo-booster-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .promo-booster-btn {
            width: 100% !important;
            text-align: center !important;
          }
        }
      `}</style>

      {/* Main Container - Fully responsive for Desktop & Mobile */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="promo-scrollable"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#0a0a0c',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(188, 137, 97, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          color: 'var(--text-dark)'
        }}
      >
        {/* Subtle Accent Top Line */}
        <div style={{ height: '2px', background: 'var(--gold)', width: '100%', flexShrink: 0 }} />

        {/* Header Bar: Clean & Minimal */}
        <div style={{
          padding: '14px 16px 12px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0d0d10',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              color: 'var(--gold)',
              background: 'rgba(188, 137, 97, 0.12)',
              border: '1px solid rgba(188, 137, 97, 0.25)',
              padding: '2px 7px',
              borderRadius: '3px',
              fontFamily: 'Source Code Pro, monospace',
              letterSpacing: '0.04em'
            }}>
              BROKEX REWARD
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-grey)', fontFamily: 'Source Code Pro, monospace' }}>
              • First 50 Wallets
            </span>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-grey)',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-grey)'}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Hero Banner: Clean Typography & Exact Payout */}
        <div 
          className="promo-hero-row"
          style={{
            padding: '18px 18px 16px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid var(--border-color)',
            gap: '16px',
            flexShrink: 0
          }}
        >
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--text-dark)',
              letterSpacing: '-0.02em',
              lineHeight: '1.25'
            }}>
              First Trade Bonus: <span style={{ color: 'var(--gold)' }}>$5.00 USDC</span>
            </h2>
            <p style={{
              margin: '6px 0 0 0',
              fontSize: '12px',
              color: 'var(--text-grey)',
              lineHeight: '1.45'
            }}>
              Open your first leveraged position on Base and receive $5.00 directly credited to your wallet.
            </p>
          </div>

          {/* Reward Box (Visible on Desktop / Hidden on Mobile to save space) */}
          <div 
            className="promo-reward-card-desktop"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '8px 14px',
              textAlign: 'right',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: '600' }}>Reward</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--gold)', lineHeight: '1.2' }}>
              $5.00
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', fontFamily: 'Source Code Pro, monospace' }}>USDC on Base</div>
          </div>
        </div>

        {/* Requirements & Criteria */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Eligibility Requirements
          </div>

          <div className="promo-grid-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            
            {/* Step 1 */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace' }}>01</span>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>Margin</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dark)' }}>
                ≥ $5.00 Collateral
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-grey)', lineHeight: '1.3' }}>
                Open your first trade with minimum $5 margin.
              </div>
            </div>

            {/* Step 2 */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace' }}>02</span>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>Duration</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dark)' }}>
                &gt; 6 Hours Active
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-grey)', lineHeight: '1.3' }}>
                Keep your position active for over 6 hours.
              </div>
            </div>

            {/* Step 3 */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace' }}>03</span>
                <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>Distribution</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dark)' }}>
                $5.00 Direct USDC
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-grey)', lineHeight: '1.3' }}>
                Reward credited for the first 50 unique traders.
              </div>
            </div>

          </div>

          {/* Referral Booster Row */}
          <div 
            className="promo-booster-row"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.015)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-dark)' }}>
                Boost your priority by referring traders
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-grey)', lineHeight: '1.3' }}>
                Earn 20% rebate on every trade. <span style={{ color: 'var(--gold)' }}>1+ trade required on your wallet to be eligible.</span>
              </div>
            </div>

            <button
              onClick={handleActionRefer}
              className="promo-btn-secondary promo-booster-btn"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--gold)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Refer Now ↗
            </button>
          </div>

          {/* Action Button */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
            <button
              onClick={handleClose}
              className="promo-btn-primary"
              style={{
                flex: 1,
                backgroundColor: 'var(--gold)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(188, 137, 97, 0.25)'
              }}
            >
              Start Trading Now
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
