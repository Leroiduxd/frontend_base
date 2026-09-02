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
    }, 400);
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 99999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={handleClose}
    >
      {/* Flat, Matte, Minimalist Institutional Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#0c0c0e',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          color: 'var(--text-dark)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: '#0f0f12'
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'var(--text-grey)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Source Code Pro, monospace'
          }}>
            Trading Campaign • Notice
          </span>

          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-grey)',
              cursor: 'pointer',
              fontSize: '15px',
              lineHeight: 1,
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '18px 20px 14px 20px' }}>
          <h2 style={{
            margin: '0 0 6px 0',
            fontSize: '17px',
            fontWeight: '700',
            color: 'var(--text-dark)',
            letterSpacing: '-0.01em'
          }}>
            Brokex Trading Campaign ($250 Pool)
          </h2>

          <p style={{
            margin: '0 0 16px 0',
            fontSize: '12px',
            color: 'var(--text-grey)',
            lineHeight: '1.5'
          }}>
            Starts September 5, 2026, at 00:00 UTC. Open positions on Brokex, hold for at least 1 hour, and submit your participation to qualify for random draws and performance rewards.
          </p>

          {/* Clean Flat Specification Rows */}
          <div style={{
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              fontSize: '12px'
            }}>
              <span style={{ color: 'var(--text-grey)' }}>Prize Pool</span>
              <span style={{ fontWeight: '600', color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace' }}>
                $250 USDC on Base
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              fontSize: '12px'
            }}>
              <span style={{ color: 'var(--text-grey)' }}>Winners</span>
              <span style={{ fontWeight: '500', color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace' }}>
                25 Winners (20 Draw + 5 Ranked)
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              fontSize: '12px'
            }}>
              <span style={{ color: 'var(--text-grey)' }}>Qualification</span>
              <span style={{ fontWeight: '500', color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace' }}>
                ≥ $250 OI (Held ≥ 1 Hour)
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              fontSize: '12px'
            }}>
              <span style={{ color: 'var(--text-grey)' }}>Cap</span>
              <span style={{ fontWeight: '500', color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace' }}>
                400 Qualified Wallets
              </span>
            </div>

          </div>
        </div>

        {/* Flat Footer Buttons */}
        <div style={{
          padding: '12px 20px 16px 20px',
          display: 'flex',
          gap: '10px'
        }}>
          <button
            onClick={handleViewRules}
            style={{
              flex: 1,
              backgroundColor: 'var(--gold)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '9px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>View Rules & Form (/airdrop)</span>
            <span>↗</span>
          </button>

          <button
            onClick={handleClose}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-grey)',
              borderRadius: '4px',
              padding: '9px 14px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
