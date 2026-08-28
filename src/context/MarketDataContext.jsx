import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { api } from '../services/api';
import { isMarketOpenFromSchedule, getNextMarketOpenTime } from '../utils/marketSchedule';
import { getContractAddresses } from '../utils/contracts';

const MarketDataContext = createContext(null);

export function MarketDataProvider({ children }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Network state: 'testnet' | 'mainnet'
  const [selectedNetwork, setSelectedNetwork] = useState('testnet');

  const currentNetwork = isConnected
    ? (chainId === base.id ? 'mainnet' : 'testnet')
    : selectedNetwork;

  const isMainnet = currentNetwork === 'mainnet';

  const setNetwork = (network) => {
    setSelectedNetwork(network);
    if (isConnected && switchChain) {
      switchChain({ chainId: network === 'mainnet' ? base.id : baseSepolia.id });
    }
  };

  const [oracleData, setOracleData] = useState(null);
  const [protocolInfo, setProtocolInfo] = useState(null);
  const [marketsList, setMarketsList] = useState([]);
  const [goldPrice, setGoldPrice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Oracle Price, Protocol Info, and Markets List
  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        const [oracleRes, protocolRes, marketsRes] = await Promise.allSettled([
          api.getOraclePrice(currentNetwork),
          api.getProtocolInfo(currentNetwork),
          api.getMarkets(currentNetwork),
        ]);

        if (!isMounted) return;

        if (oracleRes.status === 'fulfilled' && oracleRes.value?.price !== undefined) {
          setOracleData(oracleRes.value);
          setGoldPrice(oracleRes.value.price);
        }

        if (protocolRes.status === 'fulfilled' && protocolRes.value?.data) {
          setProtocolInfo(protocolRes.value.data);
        }

        if (marketsRes.status === 'fulfilled' && Array.isArray(marketsRes.value?.markets)) {
          setMarketsList(marketsRes.value.markets);
        }

        setError(null);
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Appel immédiat au chargement ou au changement de réseau
    fetchAllData();

    // Polling toutes les 1 seconde (1000ms)
    const interval = setInterval(fetchAllData, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentNetwork]);

  // --- CALCULS & FORMATAGES ---

  // L'actif principal (Gold / XAU/USD) dans le tableau assets ou à la racine
  const primaryAsset = protocolInfo?.assets?.[0] || protocolInfo;

  // 1. Prix Or
  const currentPrice = goldPrice || protocolInfo?.market24h?.current_price || 0;
  const goldPriceFormatted = currentPrice
    ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '...';

  // 2. 24h Variation / High / Low (récupérés de market24h)
  const priceChangePercent24h = protocolInfo?.market24h?.price_change_percent_24h ?? 0;
  const changeFormatted = `${priceChangePercent24h >= 0 ? '+' : ''}${priceChangePercent24h.toFixed(2)}%`;
  
  const high24h = protocolInfo?.market24h?.high_24h;
  const high24hFormatted = high24h != null
    ? `$${high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '...';

  const low24h = protocolInfo?.market24h?.low_24h;
  const low24hFormatted = low24h != null
    ? `$${low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '...';

  // 3. Borrow Rates (Hourly)
  const longBorrowRateNum = primaryAsset?.currentLongBorrowRate ? Number(primaryAsset.currentLongBorrowRate) / 10000 : 0.004;
  const shortBorrowRateNum = primaryAsset?.currentShortBorrowRate ? Number(primaryAsset.currentShortBorrowRate) / 10000 : 0.004;
  const longBorrowRateFormatted = `${longBorrowRateNum.toFixed(4)}%`;
  const shortBorrowRateFormatted = `${shortBorrowRateNum.toFixed(4)}%`;

  // 4. Spreads (en % & en $ par rapport au prix)
  const longSpreadBps = primaryAsset?.currentLongSpread ? Number(primaryAsset.currentLongSpread) / 100 : 5;
  const shortSpreadBps = primaryAsset?.currentShortSpread ? Number(primaryAsset.currentShortSpread) / 100 : 5;
  const longSpreadPercent = longSpreadBps / 100;
  const shortSpreadPercent = shortSpreadBps / 100;
  const longSpreadUSD = currentPrice ? (currentPrice * (longSpreadPercent / 100)) : 0;
  const shortSpreadUSD = currentPrice ? (currentPrice * (shortSpreadPercent / 100)) : 0;

  const longSpreadFormatted = `${longSpreadPercent.toFixed(2)}% ($${longSpreadUSD.toFixed(2)})`;
  const shortSpreadFormatted = `${shortSpreadPercent.toFixed(2)}% ($${shortSpreadUSD.toFixed(2)})`;
  
  const avgSpreadBps = (longSpreadBps + shortSpreadBps) / 2;
  const spreadPercent = avgSpreadBps / 100;
  const spreadUSD = currentPrice ? (currentPrice * (spreadPercent / 100)) : 0;
  const spreadFormatted = `${spreadPercent.toFixed(2)}% ($${spreadUSD.toFixed(2)})`;

  // 5. Open Interest (Long & Short en USDC direct)
  const formatUSDCAmount = (val) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const oiLongRaw = primaryAsset?.openInterestLong != null ? Number(primaryAsset.openInterestLong) / 1e6 : 0;
  const oiShortRaw = primaryAsset?.openInterestShort != null ? Number(primaryAsset.openInterestShort) / 1e6 : 0;
  const maxSkewRaw = primaryAsset?.maxSkew != null ? Number(primaryAsset.maxSkew) / 1e6 : 5000;
  const totalOIRaw = oiLongRaw + oiShortRaw;

  // Calcul des liquidités disponibles (Available Liquidity)
  // Pour les Longs : oiShort + maxSkew - oiLong
  // Pour les Shorts : oiLong + maxSkew - oiShort
  const availLiqLongRaw = Math.max(0, oiShortRaw + maxSkewRaw - oiLongRaw);
  const availLiqShortRaw = Math.max(0, oiLongRaw + maxSkewRaw - oiShortRaw);

  const oiLongFormatted = formatUSDCAmount(oiLongRaw);
  const oiShortFormatted = formatUSDCAmount(oiShortRaw);
  const oiTotalFormatted = formatUSDCAmount(totalOIRaw);
  const availLiqLongFormatted = formatUSDCAmount(availLiqLongRaw);
  const availLiqShortFormatted = formatUSDCAmount(availLiqShortRaw);

  // Ratio Long / Short
  const longRatio = totalOIRaw > 0 ? Math.round((oiLongRaw / totalOIRaw) * 100) : 50;

  // 6. 24h Volume (Cumulé & Détail Long/Short)
  const volume24hRaw = protocolInfo?.volume24h?.totalVolumeRaw ? Number(protocolInfo.volume24h.totalVolumeRaw) / 1e6 : 0;
  const volume24hFormatted = formatUSDCAmount(volume24hRaw);

  const longVolRaw = (
    (protocolInfo?.volume24h?.opened?.longVolumeRaw ? Number(protocolInfo.volume24h.opened.longVolumeRaw) : 0) +
    (protocolInfo?.volume24h?.closed?.longVolumeRaw ? Number(protocolInfo.volume24h.closed.longVolumeRaw) : 0)
  ) / 1e6;

  const shortVolRaw = (
    (protocolInfo?.volume24h?.opened?.shortVolumeRaw ? Number(protocolInfo.volume24h.opened.shortVolumeRaw) : 0) +
    (protocolInfo?.volume24h?.closed?.shortVolumeRaw ? Number(protocolInfo.volume24h.closed.shortVolumeRaw) : 0)
  ) / 1e6;

  const longVolFormatted = formatUSDCAmount(longVolRaw);
  const shortVolFormatted = formatUSDCAmount(shortVolRaw);

  // 7. Paramètres de trading du protocole
  const minLeverage = primaryAsset?.minLeverage ? Number(primaryAsset.minLeverage) : 5;
  const maxLeverage = primaryAsset?.maxLeverage ? Number(primaryAsset.maxLeverage) : 20;
  const minTradeSizeUSD = primaryAsset?.minTradeSize ? Number(primaryAsset.minTradeSize) / 1e6 : 10;
  const commissionRatePercent = primaryAsset?.commissionRate ? (Number(primaryAsset.commissionRate) / 1000000) * 100 : 0.1;

  // 8. Informations du Vault & Métadonnées
  const { vault: defaultVaultAddress } = getContractAddresses(isMainnet);
  const vaultAddress = protocolInfo?.vault || defaultVaultAddress;
  const vaultBalanceUSD = protocolInfo?.vaultBalance ? Number(protocolInfo.vaultBalance) / 1e6 : 0;
  const lockedCapitalUSD = protocolInfo?.lockedCapital ? Number(protocolInfo.lockedCapital) / 1e6 : 0;
  const pythMetadata = primaryAsset?.pythMetadata || protocolInfo?.pythMetadata;

  // 9. État d'ouverture du marché (Market Open / Closed) calculé via le schedule horaire (Pyth schedule)
  const scheduleString = pythMetadata?.schedule || primaryAsset?.schedule || protocolInfo?.schedule;
  
  const isMarketOpenBySchedule = scheduleString 
    ? isMarketOpenFromSchedule(scheduleString) 
    : undefined;

  const nextOpenTime = scheduleString
    ? getNextMarketOpenTime(scheduleString)
    : '';

  const isMarketOpen = isMarketOpenBySchedule !== undefined
    ? isMarketOpenBySchedule
    : primaryAsset?.isMarketOpen !== undefined
      ? Boolean(primaryAsset.isMarketOpen)
      : protocolInfo?.isMarketOpen !== undefined
        ? Boolean(protocolInfo.isMarketOpen)
        : (primaryAsset?.listed !== false && primaryAsset?.securityMode !== 1);

  // 10. OrderBook Visibility Toggle (Desktop)
  const [showOrderBook, setShowOrderBookState] = useState(() => {
    const saved = localStorage.getItem('brokex_show_orderbook');
    return saved !== null ? saved === 'true' : true;
  });

  const setShowOrderBook = (val) => {
    setShowOrderBookState((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : typeof val === 'boolean' ? val : !prev;
      localStorage.setItem('brokex_show_orderbook', String(nextVal));
      return nextVal;
    });
  };

  return (
    <MarketDataContext.Provider
      value={{
        network: currentNetwork,
        isMainnet: currentNetwork === 'mainnet',
        setNetwork,
        oracleData,
        protocolInfo,
        marketsList,
        goldPrice: currentPrice,
        goldPriceFormatted,
        changeFormatted,
        priceChangePercent24h,
        high24hFormatted,
        low24hFormatted,
        longBorrowRateFormatted,
        shortBorrowRateFormatted,
        spreadFormatted,
        longSpreadFormatted,
        shortSpreadFormatted,
        longSpreadPercent,
        shortSpreadPercent,
        spreadUSDFormatted: `$${spreadUSD.toFixed(2)}`,
        oiTotalFormatted,
        oiLongFormatted,
        oiShortFormatted,
        availLiqLongFormatted,
        availLiqShortFormatted,
        availLiqLongRaw,
        availLiqShortRaw,
        longRatio,
        volume24hFormatted,
        longVolFormatted,
        shortVolFormatted,
        minLeverage,
        maxLeverage,
        minTradeSizeUSD,
        commissionRatePercent,
        vaultAddress,
        vaultBalanceUSD,
        lockedCapitalUSD,
        pythMetadata,
        feedId: primaryAsset?.feedId || '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2',
        assetId: primaryAsset?.assetId ? Number(primaryAsset.assetId) : 5500,
        isMarketOpen,
        nextOpenTime,
        isLoading,
        error,
        showOrderBook,
        setShowOrderBook,
      }}
    >
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData() {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
}
