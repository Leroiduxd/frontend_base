import { useMemo } from 'react';
import { useMarketData } from '../context/MarketDataContext';
import { calculateEstimatedSpreadLocal, calculatePositionPnLWithSpread } from '../utils/spreadCalculator';

/**
 * Custom hook for instantaneous local spread calculation (0 RPC)
 * @param {Object} params
 * @param {number|string} params.direction - 1 for Long, 0 for Short
 * @param {number|string} params.collateralUSD - Collateral in USD (e.g. 100)
 * @param {number|string} params.leverage - Leverage multiplier (e.g. 10)
 * @param {boolean} [params.isOpening=true] - true for openMarket, false for closeMarket
 * @param {number|string} [params.assetId=5500] - Asset ID
 */
export function useSpread({
  direction = 1,
  collateralUSD = 0,
  leverage = 1,
  isOpening = true,
  assetId = 5500
} = {}) {
  const { protocolInfo, goldPrice } = useMarketData();

  const primaryAsset = useMemo(() => {
    if (!protocolInfo) return null;
    if (Array.isArray(protocolInfo.assets) && protocolInfo.assets.length > 0) {
      const found = protocolInfo.assets.find(a => String(a.assetId) === String(assetId));
      return found || protocolInfo.assets[0];
    }
    return protocolInfo;
  }, [protocolInfo, assetId]);

  const vaultLiquidity = protocolInfo?.vaultBalance ?? 25000000;

  const spreadResult = useMemo(() => {
    const collat = Number(collateralUSD || 0);
    const lev = Number(leverage || 1);
    // tradeOI scaled to 1e6 USDC
    const tradeOI = collat * lev * 1e6;
    const dir = direction === 1 || direction === '1' || direction === 'buy' ? 1 : 0;

    return calculateEstimatedSpreadLocal(
      primaryAsset,
      vaultLiquidity,
      dir,
      tradeOI,
      isOpening
    );
  }, [primaryAsset, vaultLiquidity, direction, collateralUSD, leverage, isOpening]);

  const currentPrice = Number(goldPrice || primaryAsset?.market24h?.current_price || 0);
  const spreadUSD = currentPrice > 0 ? (currentPrice * (spreadResult.tradeSpreadPercent / 100)) : 0;
  const spreadFormatted = `${spreadResult.tradeSpreadPercent.toFixed(2)}% ($${spreadUSD.toFixed(2)})`;
  const longSpreadFormatted = `${(spreadResult.longSpread / 10000).toFixed(2)}% ($${(currentPrice * ((spreadResult.longSpread / 10000) / 100)).toFixed(2)})`;
  const shortSpreadFormatted = `${(spreadResult.shortSpread / 10000).toFixed(2)}% ($${(currentPrice * ((spreadResult.shortSpread / 10000) / 100)).toFixed(2)})`;

  return {
    ...spreadResult,
    spreadUSD,
    spreadFormatted,
    longSpreadFormatted,
    shortSpreadFormatted,
    primaryAsset,
    vaultLiquidity
  };
}

/**
 * Custom hook to calculate unrealized PnL & estimated exit price taking closing spread into account
 */
export function usePositionPnL({
  isLong,
  entryPrice,
  currentMarkPrice,
  openInterestUSD,
  collateralUSD,
  assetId = 5500,
  borrowFeeUSD = 0
}) {
  const { protocolInfo, goldPrice } = useMarketData();

  const primaryAsset = useMemo(() => {
    if (!protocolInfo) return null;
    if (Array.isArray(protocolInfo.assets) && protocolInfo.assets.length > 0) {
      const found = protocolInfo.assets.find(a => String(a.assetId) === String(assetId));
      return found || protocolInfo.assets[0];
    }
    return protocolInfo;
  }, [protocolInfo, assetId]);

  const vaultLiquidity = protocolInfo?.vaultBalance ?? 25000000;
  const mark = Number(currentMarkPrice || goldPrice || 0);

  return useMemo(() => {
    const dir = isLong ? 1 : 0;
    const oi = Number(openInterestUSD || 0) * 1e6;

    // Calcul du spread de fermeture (isOpening = false)
    const closingSpreadRes = calculateEstimatedSpreadLocal(
      primaryAsset,
      vaultLiquidity,
      dir,
      oi,
      false
    );

    const pnlRes = calculatePositionPnLWithSpread({
      isLong: Boolean(isLong),
      entryPrice: Number(entryPrice || 0),
      currentMarkPrice: mark,
      openInterestUSD: Number(openInterestUSD || 0),
      collateralUSD: Number(collateralUSD || 0),
      closingSpreadPercent: closingSpreadRes.tradeSpreadPercent,
      borrowFeeUSD: Number(borrowFeeUSD || 0)
    });

    return {
      ...pnlRes,
      closingSpreadPercent: closingSpreadRes.tradeSpreadPercent,
      closingSpreadBps: closingSpreadRes.tradeSpreadBps,
      closingSpreadRaw: closingSpreadRes.tradeSpread
    };
  }, [primaryAsset, vaultLiquidity, isLong, entryPrice, mark, openInterestUSD, collateralUSD, borrowFeeUSD]);
}
