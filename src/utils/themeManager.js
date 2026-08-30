// Theme Manager for Brokex: Background Themes, Candle Color Palettes, and Accent Color Themes

export const ACCENT_THEMES = {
  gold: {
    id: 'gold',
    name: 'Imperial Gold',
    color: '#BC8961',
    glow: 'rgba(188, 137, 97, 0.18)'
  },
  amber: {
    id: 'amber',
    name: 'Cyber Amber',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.18)'
  },
  violet: {
    id: 'violet',
    name: 'Neon Violet',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.18)'
  },
  cyan: {
    id: 'cyan',
    name: 'Electric Cyan',
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.18)'
  },
  rose: {
    id: 'rose',
    name: 'Rose Quartz',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.18)'
  }
};

export const BG_THEMES = {
  midnight: {
    id: 'midnight',
    name: 'Midnight Onyx',
    bg: '#000000',
    panelBg: 'rgba(8, 8, 8, 0.9)',
    borderColor: '#262626',
    gradient: 'radial-gradient(circle at 0% 0%, rgba(200, 169, 126, 0.025) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.02) 0%, transparent 50%), radial-gradient(circle at center, #050505 0%, #000000 100%)',
    previewColors: ['#000000', '#121212', '#BC8961']
  },
  obsidian: {
    id: 'obsidian',
    name: 'Cyber Obsidian',
    bg: '#040507',
    panelBg: 'rgba(10, 12, 16, 0.92)',
    borderColor: '#1e222b',
    gradient: 'radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.18) 0%, transparent 60%), #040507',
    previewColors: ['#040507', '#0f1218', '#64748b']
  },
  navy: {
    id: 'navy',
    name: 'Deep Navy',
    bg: '#030812',
    panelBg: 'rgba(8, 16, 28, 0.92)',
    borderColor: '#192b45',
    gradient: 'radial-gradient(circle at 0% 0%, rgba(26, 54, 93, 0.28) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(14, 165, 233, 0.08) 0%, transparent 50%), #030812',
    previewColors: ['#030812', '#0c1a30', '#0ea5e9']
  },
  ember: {
    id: 'ember',
    name: 'Dark Ember',
    bg: '#0a0705',
    panelBg: 'rgba(18, 13, 9, 0.92)',
    borderColor: '#382516',
    gradient: 'radial-gradient(circle at 0% 0%, rgba(188, 137, 97, 0.18) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(217, 119, 6, 0.06) 0%, transparent 50%), #0a0705',
    previewColors: ['#0a0705', '#19120c', '#d97706']
  }
};

export const CANDLE_THEMES = {
  'blue-red': {
    id: 'blue-red',
    name: 'Blue / Red',
    subtitle: 'Modern Web3',
    bullColor: '#3b82f6',
    bearColor: '#ef4444',
    blueBg: 'rgba(59, 130, 246, 0.1)',
    blueGlow: 'rgba(59, 130, 246, 0.15)',
    redBg: 'rgba(239, 68, 68, 0.1)',
    redGlow: 'rgba(239, 68, 68, 0.15)'
  },
  'green-red': {
    id: 'green-red',
    name: 'Green / Red',
    subtitle: 'Classic Trading',
    bullColor: '#10b981',
    bearColor: '#ef4444',
    blueBg: 'rgba(16, 185, 129, 0.1)',
    blueGlow: 'rgba(16, 185, 129, 0.15)',
    redBg: 'rgba(239, 68, 68, 0.1)',
    redGlow: 'rgba(239, 68, 68, 0.15)'
  }
};

export function getSavedBgTheme() {
  if (typeof window === 'undefined') return 'midnight';
  return localStorage.getItem('brokex_bg_theme') || 'midnight';
}

export function getSavedCandleTheme() {
  if (typeof window === 'undefined') return 'blue-red';
  return localStorage.getItem('brokex_candle_theme') || 'blue-red';
}

export function getSavedAccentTheme() {
  if (typeof window === 'undefined') return 'gold';
  return localStorage.getItem('brokex_accent_theme') || 'gold';
}

export function applyTheme(bgId, candleId, accentId) {
  if (typeof document === 'undefined') return;

  const resolvedBgId = bgId || getSavedBgTheme();
  const resolvedCandleId = candleId || getSavedCandleTheme();
  const resolvedAccentId = accentId || getSavedAccentTheme();

  const bgConfig = BG_THEMES[resolvedBgId] || BG_THEMES.midnight;
  const candleConfig = CANDLE_THEMES[resolvedCandleId] || CANDLE_THEMES['blue-red'];
  const accentConfig = ACCENT_THEMES[resolvedAccentId] || ACCENT_THEMES.gold;

  const root = document.documentElement;

  // Apply Background Variables
  root.style.setProperty('--bg-dark', bgConfig.bg);
  root.style.setProperty('--bg-gradient', bgConfig.gradient);
  root.style.setProperty('--panel-bg', bgConfig.panelBg);
  root.style.setProperty('--border-color', bgConfig.borderColor);

  // Remove direct inline styles on body so body.light-mode CSS rules work seamlessly
  document.body.style.removeProperty('background-color');
  document.body.style.removeProperty('background-image');

  // Apply Candle / PnL / Side Colors
  root.style.setProperty('--color-blue', candleConfig.bullColor);
  root.style.setProperty('--color-blue-bg', candleConfig.blueBg);
  root.style.setProperty('--color-blue-glow', candleConfig.blueGlow);

  root.style.setProperty('--color-red', candleConfig.bearColor);
  root.style.setProperty('--color-red-bg', candleConfig.redBg);
  root.style.setProperty('--color-red-glow', candleConfig.redGlow);

  // Apply Accent (Gold / Brand) Colors
  root.style.setProperty('--gold', accentConfig.color);
  root.style.setProperty('--gold-glow', accentConfig.glow);

  // Save to LocalStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('brokex_bg_theme', resolvedBgId);
    localStorage.setItem('brokex_candle_theme', resolvedCandleId);
    localStorage.setItem('brokex_accent_theme', resolvedAccentId);
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { bgId: resolvedBgId, candleId: resolvedCandleId, accentId: resolvedAccentId }
    }));
  }
}

// Automatically apply saved theme on initial script load
if (typeof window !== 'undefined') {
  applyTheme();
}
