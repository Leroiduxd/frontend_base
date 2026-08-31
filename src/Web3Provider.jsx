import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, getDefaultWallets, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const farcasterWallet = () => ({
  id: 'farcaster',
  name: 'Farcaster / Base App',
  iconUrl: 'https://app.brokex.trade/logo.svg',
  iconBackground: '#000000',
  createConnector: farcasterMiniApp,
});

const defaultWallets = getDefaultWallets().wallets;

export const config = getDefaultConfig({
  appName: 'Brokex',
  projectId: '0430982e60e771b033c063cf46132717', // WalletConnect Cloud Project ID
  chains: [base, baseSepolia],
  wallets: [
    {
      groupName: 'Mini App & In-App',
      wallets: [farcasterWallet],
    },
    ...defaultWallets,
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  ssr: false,
});

const queryClient = new QueryClient();

const brokexDarkTheme = darkTheme({
  accentColor: '#c8a97e',
  accentColorForeground: '#000000',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

const customRainbowTheme = {
  ...brokexDarkTheme,
  colors: {
    ...brokexDarkTheme.colors,
    accentColor: '#c8a97e',
    accentColorForeground: '#000000',
    modalBackground: '#000000',
    modalBorder: 'rgba(255, 255, 255, 0.1)',
    modalText: '#f0f0f0',
    modalTextSecondary: '#8a8a8a',
    actionButtonBorder: 'rgba(255, 255, 255, 0.1)',
    actionButtonBorderMobile: 'rgba(255, 255, 255, 0.1)',
    actionButtonSecondaryBackground: '#0d0d0d',
    closeButton: '#8a8a8a',
    closeButtonBackground: '#111111',
    connectButtonBackground: '#000000',
    connectButtonBackgroundError: '#ef4444',
    connectButtonInnerBackground: '#0d0d0d',
    connectButtonText: '#f0f0f0',
    connectButtonTextError: '#ffffff',
    connectionIndicator: '#10b981',
    downloadBottomCardBackground: '#0d0d0d',
    downloadTopCardBackground: '#141414',
    error: '#ef4444',
    generalBorder: 'rgba(255, 255, 255, 0.08)',
    generalBorderDim: 'rgba(255, 255, 255, 0.04)',
    menuItemBackground: '#0d0d0d',
    modalBackdrop: 'rgba(0, 0, 0, 0.8)',
    profileAction: '#0d0d0d',
    profileActionHover: '#181818',
    profileForeground: '#000000',
    selectedOptionBorder: '#c8a97e',
    standby: '#c8a97e',
  },
  radii: {
    ...brokexDarkTheme.radii,
    modal: '12px',
    menuButton: '8px',
    actionButton: '8px',
  },
  shadows: {
    ...brokexDarkTheme.shadows,
    dialog: '0 30px 70px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
  }
};

export function Web3Provider({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customRainbowTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
