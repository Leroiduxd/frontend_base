import React from 'react';
import { createPortal } from 'react-dom';
import { BG_THEMES, CANDLE_THEMES, ACCENT_THEMES, applyTheme } from '../utils/themeManager';

export default function ThemeModal({ isOpen, onClose, currentBg, currentCandle, currentAccent, onThemeChange }) {
  if (!isOpen) return null;

  const handleSelectBg = (bgId) => {
    applyTheme(bgId, currentCandle, currentAccent);
    if (onThemeChange) onThemeChange(bgId, currentCandle, currentAccent);
  };

  const handleSelectCandle = (candleId) => {
    applyTheme(currentBg, candleId, currentAccent);
    if (onThemeChange) onThemeChange(currentBg, candleId, currentAccent);
  };

  const handleSelectAccent = (accentId) => {
    applyTheme(currentBg, currentCandle, accentId);
    if (onThemeChange) onThemeChange(currentBg, currentCandle, accentId);
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 25px var(--gold-glow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'transparent'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Interface Customizer
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-grey)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SECTION 1: ACCENT COLOR (GOLD / THEME ACCENT) */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-grey)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
              1. Brand Accent Color
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {Object.values(ACCENT_THEMES).map((accent) => {
                const isSelected = currentAccent === accent.id;
                return (
                  <button
                    key={accent.id}
                    onClick={() => handleSelectAccent(accent.id)}
                    style={{
                      background: isSelected ? accent.glow : 'var(--bg-subtle)',
                      border: isSelected ? `2px solid ${accent.color}` : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px 4px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? `0 0 12px ${accent.color}44` : 'none'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: accent.color,
                      boxShadow: `0 0 8px ${accent.color}88`,
                      border: '1px solid rgba(255, 255, 255, 0.4)'
                    }} />
                    <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: isSelected ? accent.color : 'var(--text-grey)', textAlign: 'center' }}>
                      {accent.name.split(' ')[1] || accent.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: BACKGROUND THEMES */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-grey)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
              2. Dark Background Atmosphere
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {Object.values(BG_THEMES).map((theme) => {
                const isSelected = currentBg === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelectBg(theme.id)}
                    style={{
                      background: isSelected ? 'var(--gold-glow)' : 'var(--bg-subtle)',
                      border: isSelected ? '1.5px solid var(--gold)' : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      boxShadow: isSelected ? '0 0 15px var(--gold-glow)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Visual Color Dots representing the background palette */}
                    <div style={{
                      display: 'flex',
                      gap: '3px',
                      padding: '3px 5px',
                      borderRadius: '6px',
                      background: theme.bg,
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      flexShrink: 0
                    }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: theme.previewColors[0], border: '1px solid rgba(255,255,255,0.2)' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: theme.previewColors[1] }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--gold)' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: isSelected ? 'var(--gold)' : 'var(--text-dark)' }}>
                        {theme.name}
                      </div>
                    </div>

                    {isSelected && (
                      <span style={{ color: 'var(--gold)', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: CANDLE COLORS */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-grey)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
              3. Candlestick & Trade Colors
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {Object.values(CANDLE_THEMES).map((theme) => {
                const isSelected = currentCandle === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelectCandle(theme.id)}
                    style={{
                      background: isSelected ? 'var(--gold-glow)' : 'var(--bg-subtle)',
                      border: isSelected ? '1.5px solid var(--gold)' : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      textAlign: 'left',
                      boxShadow: isSelected ? '0 0 15px var(--gold-glow)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: isSelected ? 'var(--gold)' : 'var(--text-dark)' }}>
                        {theme.name}
                      </span>
                      {isSelected && <span style={{ color: 'var(--gold)', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                    </div>

                    {/* Mini Candle Bar Previews */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-around',
                      height: '30px',
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0 12px'
                    }}>
                      {/* Bull Candle */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '1.5px', height: '3px', background: theme.bullColor }} />
                        <div style={{ width: '7px', height: '12px', background: theme.bullColor, borderRadius: '1px' }} />
                        <div style={{ width: '1.5px', height: '3px', background: theme.bullColor }} />
                      </div>

                      {/* Bear Candle */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '1.5px', height: '3px', background: theme.bearColor }} />
                        <div style={{ width: '7px', height: '12px', background: theme.bearColor, borderRadius: '1px' }} />
                        <div style={{ width: '1.5px', height: '3px', background: theme.bearColor }} />
                      </div>

                      {/* PnL Sample Badge */}
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: 'bold',
                        color: theme.bullColor,
                        background: theme.blueBg,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        +14.2%
                      </span>
                    </div>

                    <div style={{ fontSize: '9.5px', color: 'var(--text-grey)' }}>
                      {theme.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'transparent'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--gold)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 20px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
