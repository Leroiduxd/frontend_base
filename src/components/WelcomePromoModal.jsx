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
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 99999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .promo-cta-btn:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }
        .promo-cta-btn:active {
          transform: translateY(0);
        }
        .promo-ghost-btn:hover {
          color: var(--text-dark) !important;
        }
        .promo-row-hover:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }
      `}</style>

      {/* Main Luxury Dark Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#0a0a0c',
          border: '1px solid rgba(188, 137, 97, 0.28)',
          borderRadius: '12px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(188, 137, 97, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          color: 'var(--text-dark)'
        }}
      >
        {/* Subtle Warm Gold Top Edge Glow */}
        <div style={{
          height: '2px',
          width: '100%',
          background: 'linear-gradient(90deg, transparent, var(--gold) 40%, var(--gold) 60%, transparent)'
        }} />

        {/* Modal Header */}
        <div style={{
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: 'rgba(255, 255, 255, 0.015)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--gold)',
              boxShadow: '0 0 8px var(--gold)'
            }} />
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              color: 'var(--gold)',
              fontFamily: 'Source Code Pro, monospace',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              Trading Competition • Airdrop
            </span>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-grey)',
              cursor: 'pointer',
              fontSize: '15px',
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
        <div style={{ padding: '24px 24px 18px 24px', textAlign: 'center' }}>
          
          <div style={{
            fontSize: '11px',
            color: 'var(--text-grey)',
            fontFamily: 'Source Code Pro, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '6px'
          }}>
            Prize Pool
          </div>

          <div style={{
            fontSize: '40px',
            fontWeight: '900',
            fontFamily: 'Source Code Pro, monospace',
            color: 'var(--gold)',
            lineHeight: '1',
            letterSpacing: '-0.03em',
            textShadow: '0 0 25px rgba(188, 137, 97, 0.3)'
          }}>
            $250 USDC
          </div>

          <div style={{
            fontSize: '15px',
            fontWeight: '700',
            color: 'var(--text-dark)',
            marginTop: '10px',
            letterSpacing: '-0.01em'
          }}>
            25 Winners • Official Trading Campaign
          </div>

          <p style={{
            margin: '8px auto 0 auto',
            maxWidth: '360px',
            fontSize: '12px',
            color: 'var(--text-grey)',
            lineHeight: '1.5'
          }}>
            Starts September 5, 2026. Trade on Brokex, hold your position for 1+ hour, and qualify for random draws and performance rewards.
          </p>
        </div>

        {/* Clean Unencapsulated Key Metrics Table (Institutional Style) */}
        <div style={{
          margin: '0 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '4px 0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          <div className="promo-row-hover" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 6px',
            borderRadius: '4px',
            fontSize: '11.5px',
            transition: 'background 0.15s'
          }}>
            <span style={{ color: 'var(--text-grey)' }}>Qualification</span>
            <span style={{ fontWeight: '600', color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace' }}>
              ≥ $250 OI <span style={{ color: 'var(--text-grey)', fontWeight: 'normal' }}>(e.g. $25 × 10x)</span>
            </span>
          </div>

          <div className="promo-row-hover" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 6px',
            borderRadius: '4px',
            fontSize: '11.5px',
            transition: 'background 0.15s'
          }}>
            <span style={{ color: 'var(--text-grey)' }}>Holding Time</span>
            <span style={{ fontWeight: '600', color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace' }}>
              ≥ 1 Full Hour
            </span>
          </div>

          <div className="promo-row-hover" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 6px',
            borderRadius: '4px',
            fontSize: '11.5px',
            transition: 'background 0.15s'
          }}>
            <span style={{ color: 'var(--text-grey)' }}>Reward Split</span>
            <span style={{ fontWeight: '600', color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace' }}>
              20 Draw ($8) + 5 Ranked ($18)
            </span>
          </div>

          <div className="promo-row-hover" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 6px',
            borderRadius: '4px',
            fontSize: '11.5px',
            transition: 'background 0.15s'
          }}>
            <span style={{ color: 'var(--text-grey)' }}>Participant Cap</span>
            <span style={{ fontWeight: '600', color: 'var(--color-blue)', fontFamily: 'Source Code Pro, monospace' }}>
              400 Verified Wallets
            </span>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div style={{ padding: '20px 24px 22px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <button
            onClick={handleViewRules}
            className="promo-cta-btn"
            style={{
              width: '100%',
              backgroundColor: 'var(--gold)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              padding: '11px 18px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 12px rgba(188, 137, 97, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>View Full Rules & Join Airdrop</span>
            <span>↗</span>
          </button>

          <button
            onClick={handleClose}
            className="promo-ghost-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-grey)',
              fontSize: '11.5px',
              cursor: 'pointer',
              padding: '4px',
              transition: 'color 0.15s ease'
            }}
          >
            Continue to Terminal
          </button>

        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
