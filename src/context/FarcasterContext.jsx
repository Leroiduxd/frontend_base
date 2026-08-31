import React, { createContext, useContext, useEffect, useState } from 'react';
import sdk from '@farcaster/frame-sdk';

const FarcasterContext = createContext({
  isFarcaster: false,
  farcasterUser: null,
  context: null,
  close: () => {},
  openUrl: (url) => window.open(url, '_blank'),
});

export function FarcasterProvider({ children }) {
  const [isFarcaster, setIsFarcaster] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState(null);
  const [context, setContext] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initFarcaster = async () => {
      try {
        // Obtenir le contexte Farcaster s'il est disponible
        const ctx = await sdk.context;
        if (isMounted && ctx) {
          setContext(ctx);
          if (ctx.user) {
            setFarcasterUser(ctx.user);
            setIsFarcaster(true);
          }
        }
      } catch (err) {
        // En dehors de Farcaster / navigateur classique, on ignore l'erreur
        console.debug("Not running inside Farcaster context:", err);
      } finally {
        // CRITIQUE : signale à Warpcast / Base App que l'UI est prête et ferme l'écran de chargement (splash screen)
        try {
          sdk.actions.ready();
        } catch (readyErr) {
          console.debug("sdk.actions.ready() outside frame:", readyErr);
        }
      }
    };

    initFarcaster();

    return () => {
      isMounted = false;
    };
  }, []);

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
    <FarcasterContext.Provider value={{ isFarcaster, farcasterUser, context, close, openUrl }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
