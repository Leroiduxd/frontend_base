import React, { createContext, useContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount, useConnect } from 'wagmi';

const FarcasterContext = createContext({
  isMiniApp: false,
  isFarcaster: false,
  farcasterUser: null,
  context: null,
  close: () => {},
  openUrl: (url) => window.open(url, '_blank'),
});

export function FarcasterProvider({ children }) {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState(null);
  const [context, setContext] = useState(null);

  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  useEffect(() => {
    let isMounted = true;

    const initMiniApp = async () => {
      try {
        // Détecte si l'app s'exécute dans une WebView / iframe Mini App (Warpcast ou Base App)
        const insideMiniApp = await sdk.isInMiniApp();
        if (isMounted) {
          setIsMiniApp(insideMiniApp);
        }

        if (insideMiniApp) {
          const ctx = await sdk.context;
          if (isMounted && ctx) {
            setContext(ctx);
            if (ctx.user) {
              setFarcasterUser(ctx.user);
            }
          }

          // Connexion automatique au wallet natif de la Mini App si l'utilisateur n'est pas encore connecté
          if (!isConnected && connectors && connectors.length > 0) {
            const miniAppConnector = connectors.find(
              (c) => c.id === 'farcaster' || c.id === 'farcasterMiniApp' || c.name?.toLowerCase().includes('farcaster')
            );
            if (miniAppConnector) {
              connect({ connector: miniAppConnector });
            }
          }
        }
      } catch (err) {
        console.debug('Mini App init info (running in standard browser):', err);
      } finally {
        // CRITIQUE : signale à Farcaster / Base App que le chargement est terminé pour enlever l'écran de démarrage
        try {
          await sdk.actions.ready();
        } catch (readyErr) {
          console.debug('sdk.actions.ready() executed outside mini-app context:', readyErr);
        }
      }
    };

    initMiniApp();

    return () => {
      isMounted = false;
    };
  }, [isConnected, connectors, connect]);

  const close = () => {
    try {
      sdk.actions.close();
    } catch {
      window.close();
    }
  };

  const openUrl = (url) => {
    try {
      sdk.actions.openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <FarcasterContext.Provider
      value={{
        isMiniApp,
        isFarcaster: isMiniApp,
        farcasterUser,
        context,
        close,
        openUrl,
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}

export function useMiniAppEnvironment() {
  const { isMiniApp } = useContext(FarcasterContext);
  return { isMiniApp };
}

export function useMiniAppUser() {
  const { farcasterUser } = useContext(FarcasterContext);
  return farcasterUser;
}
