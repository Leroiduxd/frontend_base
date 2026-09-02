import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export default function WelcomePromoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show smoothly on visit
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleViewRules = () => {
    setIsOpen(false);
    navigate('/airdrop');
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
          transform: translateY(-1px);
        }
        .promo-btn-primary:active {
          transform: translateY(0);
        }
        .promo-btn-secondary:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          border-color: var(--gold) !important;
          color: var(--text-dark) !important;
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
          .promo-footer-btns {
            flex-direction: column !important;
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
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(188, 137, 97, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          color: 'var(--text-dark)'
        }}
      >
        {/* Top Gold Accent Line */}
        <div style={{ height: '2px', background: 'var(--gold)', width: '100%', flexShrink: 0 }} />

        {/* Header Bar: Clean & Minimal */}
        <div style={{
          padding: '14px 18px 12px 18px',
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
              border: '1px solid rgba(188, 137, 97, 0.3)',
              padding: '2px 8px',
              borderRadius: '3px',
              fontFamily: 'Source Code Pro, monospace',
              letterSpacing: '0.04em'
            }}>
              BROKEX TRADING AIRDROP
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-grey)', fontFamily: 'Source Code Pro, monospace' }}>
              • Starts Sep 5, 00:00 UTC
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

        {/* Hero Section */}
        <div 
          className="promo-hero-row"
          style={{
            padding: '18px 20px 16px 20px',
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
              fontSize: '21px',
              fontWeight: '800',
              color: 'var(--text-dark)',
              letterSpacing: '-0.02em',
              lineHeight: '1.25'
            }}>
              Trading Campaign: <span style={{ color: 'var(--gold)' }}>$250 Prize Pool</span>
            </h2>
            <p style={{
              margin: '6px 0 0 0',
              fontSize: '12px',
              color: 'var(--text-grey)',
              lineHeight: '1.45'
            }}>
              Trade on Brokex, hold qualifying positions, and win up to $250 USDC across <strong>25 winners</strong> (Random Draw & Leaderboard rankings).
            </p>
          </div>

          {/* Desktop Summary Badge */}
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
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: '600' }}>Pool</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--gold)', lineHeight: '1.2' }}>
              $250
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', fontFamily: 'Source Code Pro, monospace' }}>25 Winners</div>
          </div>
        </div>

        {/* Requirements & Criteria (3-Step Cards) */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            How to Qualify
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
                <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>Volume</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dark)' }}>
                ≥ $250 Open Interest
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-grey)', lineHeight: '1.3' }}>
                Cumulative OI (e.g. $25 margin with 10× leverage).
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
                ≥ 1 Hour Held
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-grey)', lineHeight: '1.3' }}>
                Every qualifying position must be held for 1+ hour.
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
                <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>Form & Social</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dark)' }}>
                Follow & Submit Form
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-grey)', lineHeight: '1.3' }}>
                Follow @brokexfi, post on X and submit your wallet.
              </div>
            </div>

          </div>

          {/* Key Distribution Overview */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <span style={{ color: 'var(--text-dark)', fontWeight: '600' }}>20 Draw Winners ($8 each)</span>
              <span style={{ color: 'var(--text-grey)' }}> • </span>
              <span style={{ color: 'var(--gold)', fontWeight: '600' }}>5 Leaderboard Winners ($18 each)</span>
            </div>
            <div style={{ color: 'var(--color-blue)', fontFamily: 'Source Code Pro, monospace', fontSize: '10.5px' }}>
              Capped at 400 wallets
            </div>
          </div>

          {/* Action Buttons */}
          <div className="promo-footer-btns" style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              onClick={handleViewRules}
              className="promo-btn-primary"
              style={{
                flex: 1.2,
                backgroundColor: 'var(--gold)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(188, 137, 97, 0.3)'
              }}
            >
              <span>View Full Campaign Rules (/airdrop)</span>
              <span>↗</span>
            </button>

            <button
              onClick={handleClose}
              className="promo-btn-secondary"
              style={{
                flex: 0.8,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                color: 'var(--text-grey)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Start Trading
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
