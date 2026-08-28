import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ReferralModal from './ReferralModal';

export default function Sidebar() {
  const location = useLocation();
  const activePath = location.pathname;
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  const menuItems = [
    { 
      path: '/', 
      label: 'Trade', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 21-4-4 4-4" /><path d="M3 17h18" /><path d="m17 3 4 4-4 4" /><path d="M21 7H3" />
        </svg>
      )
    }
  ];

  const [isLightMode, setIsLightMode] = useState(false);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    document.body.classList.toggle('light-mode');
  };

  return (
    <div className="sidebar" style={{ 
      gridArea: 'sidebar',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '0', 
      background: 'transparent', 
      border: 'none',
      height: '100%',
      zIndex: 100
    }}>
      <style>{`
        .sidebar-item {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-grey);
          transition: all 0.2s;
          position: relative;
          text-decoration: none;
          cursor: pointer;
        }
        .sidebar-item:hover {
          color: var(--text-dark);
        }
        .sidebar-item.active {
          color: var(--gold);
        }
        .wallet-btn {
          background: transparent;
          color: var(--text-grey);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .wallet-btn:hover {
          color: var(--text-dark);
        }
        .wallet-btn.connected {
          color: var(--gold);
        }
        .logo-container {
          width: 40px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
      `}</style>

      <div className="logo-container">
        <img src="/logo.svg" alt="Brokex" style={{ width: '22px' }} />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', alignItems: 'center', marginTop: '10px' }}>
        {menuItems.map((item) => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`sidebar-item ${activePath === item.path ? 'active' : ''}`}
            title={item.label}
          >
            {item.icon}
          </Link>
        ))}

        {/* Referral Program Button */}
        <div 
          className={`sidebar-item ${isReferralOpen ? 'active' : ''}`}
          onClick={() => setIsReferralOpen(true)}
          title="Referral Program"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        {/* Theme Toggle */}
        <div className="sidebar-item" onClick={toggleTheme} style={{ marginBottom: '10px' }}>
          {isLightMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          )}
        </div>

        {/* RainbowKit Connect Button */}
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="wallet-btn"
                        title="Connect Wallet"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="14" x="3" y="5" rx="3" /><path d="M16 12h3" /><path d="M21 9v6" />
                        </svg>
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button
                        onClick={openChainModal}
                        type="button"
                        className="wallet-btn"
                        title="Wrong network"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="14" x="3" y="5" rx="3" /><path d="M16 12h3" /><path d="M21 9v6" />
                        </svg>
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="wallet-btn connected"
                      title={`${account.displayName} (${account.displayBalance ?? ''})`}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="14" x="3" y="5" rx="3" /><path d="M16 12h3" /><path d="M21 9v6" />
                      </svg>
                    </button>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>

      {/* Referral Program Modal */}
      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
      />
    </div>
  );
}

