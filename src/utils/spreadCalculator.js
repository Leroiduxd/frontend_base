/**
 * Brokex Local Spread & PnL Calculator
 * Replicates BrokexCore.sol & BrokexLens.sol on-chain calculations locally with 0 RPC calls.
 */

export const PRECISION = 1000000n; // 1e6

/**
 * Calcule la racine carrée entière (équivalent de _sqrt en Solidity)
 */
export function sqrtSolidity(x) {
  const xBig = BigInt(x);
  if (xBig === 0n) return 0n;
  let z = (xBig + 1n) / 2n;
  let y = xBig;
  while (z < y) {
    y = z;
    z = (xBig / z + z) / 2n;
  }
  return y;
}

/**
 * Calcule les spreads exacts en local pour le frontend
 * @param {Object} assetInfo - L'objet asset retourné par protocol-info (ex: protocolInfo.assets[0] ou primaryAsset)
 * @param {BigInt|number|string} vaultLiquidity - Solde USDC de la Vault (ex: protocolInfo.vaultBalance)
 * @param {number} direction - 1 pour LONG, 0 pour SHORT
 * @param {BigInt|number|string} tradeOI - Collateral * Leverage (en USDC, scale 1e6)
 * @param {boolean} isOpening - true si ouverture, false si fermeture
 * @returns {{ longSpread: number, shortSpread: number, tradeSpread: number, tradeSpreadPercent: number, tradeSpreadBps: number }}
 */
export function calculateEstimatedSpreadLocal(assetInfo, vaultLiquidity, direction, tradeOI, isOpening = true) {
  if (!assetInfo) {
    return {
      longSpread: 300,
      shortSpread: 300,
      tradeSpread: 300,
      tradeSpreadPercent: 0.03,
      tradeSpreadBps: 3.0
    };
  }

  let longOI = BigInt(assetInfo.openInterestLong ?? 0);
  let shortOI = BigInt(assetInfo.openInterestShort ?? 0);
  const oi = BigInt(Math.round(Number(tradeOI || 0)));
  const vaultLiq = BigInt(Math.round(Number(vaultLiquidity || 0)));

  // 1. Mise à jour de l'OI post-trade
  if (isOpening) {
    if (direction === 1 || direction === '1') longOI += oi;
    else shortOI += oi;
  } else {
    if (direction === 1 || direction === '1') longOI = longOI >= oi ? longOI - oi : 0n;
    else shortOI = shortOI >= oi ? shortOI - oi : 0n;
  }

  const minSpread = BigInt(assetInfo.minSpread ?? 300);
  const maxSpread = BigInt(assetInfo.maxSpread ?? 1500);
  const maxPenalty = BigInt(assetInfo.maxSpreadPenalty ?? 1200);
  const maxDiscount = BigInt(assetInfo.maxSpreadDiscount ?? 100);
  const virtualOI = BigInt(assetInfo.spreadVirtualOI ?? 10000000000);
  const prec = PRECISION;

  // 2. Si les deux côtés sont parfaitement équilibrés
  if (longOI === shortOI) {
    const base = Number(minSpread);
    return {
      longSpread: base,
      shortSpread: base,
      tradeSpread: base,
      tradeSpreadPercent: base / 10000,
      tradeSpreadBps: base / 100
    };
  }

  // 3. Calcul du skew et de la profondeur
  const skew = longOI > shortOI ? longOI - shortOI : shortOI - longOI;
  const depth = vaultLiq + longOI + shortOI + virtualOI;

  if (depth === 0n) {
    const base = Number(minSpread);
    return {
      longSpread: base,
      shortSpread: base,
      tradeSpread: base,
      tradeSpreadPercent: base / 10000,
      tradeSpreadBps: base / 100
    };
  }

  let skewRatio = (skew * prec) / depth;
  if (skewRatio > prec) skewRatio = prec;

  // 4. Facteur de risque
  const riskFactor = sqrtSolidity(skewRatio * prec);

  const penalty = (maxPenalty * riskFactor) / prec;
  const discount = (maxDiscount * riskFactor) / prec;

  let dominantSpread = minSpread + penalty;
  if (dominantSpread > maxSpread) dominantSpread = maxSpread;

  const minoritySpread = minSpread > discount ? minSpread - discount : 0n;

  let longSpread = longOI > shortOI ? dominantSpread : minoritySpread;
  let shortSpread = longOI > shortOI ? minoritySpread : dominantSpread;

  let tradeSpread;
  if (isOpening) {
    tradeSpread = (direction === 1 || direction === '1') ? longSpread : shortSpread;
  } else {
    tradeSpread = (direction === 1 || direction === '1') ? shortSpread : longSpread;
  }

  const numTradeSpread = Number(tradeSpread);

  return {
    longSpread: Number(longSpread),               // échelle 1e6 (ex: 384 = 0.0384%)
    shortSpread: Number(shortSpread),             // échelle 1e6 (ex: 293 = 0.0293%)
    tradeSpread: numTradeSpread,
    tradeSpreadPercent: numTradeSpread / 10000,    // en % direct (ex: 0.0384%)
    tradeSpreadBps: numTradeSpread / 100          // en bps (ex: 3.84 bps)
  };
}

/**
 * Calcule le prix d'exécution estimé à la clôture et le PnL non réalisé intégrant le spread de sortie
 * @param {Object} params
 * @param {boolean} params.isLong - Direction de la position
 * @param {number} params.entryPrice - Prix d'exécution d'entrée (USD)
 * @param {number} params.currentMarkPrice - Prix oracle actuel (USD)
 * @param {number} params.openInterestUSD - Taille d'exposition (Collateral * Leverage) en USD
 * @param {number} params.collateralUSD - Collatéral en USD
 * @param {number} params.closingSpreadPercent - Spread estimé de fermeture en % (ex: 0.0384)
 * @param {number} [params.borrowFeeUSD=0] - Frais d'emprunt cumulés
 * @returns {{ estimatedExitPrice: number, unrealizedPnlUSD: number, unrealizedPnlPercent: number, isProfit: boolean, closingSpreadUSD: number }}
 */
export function calculatePositionPnLWithSpread({
  isLong,
  entryPrice,
  currentMarkPrice,
  openInterestUSD,
  collateralUSD,
  closingSpreadPercent = 0.03,
  borrowFeeUSD = 0
}) {
  if (!entryPrice || !currentMarkPrice || entryPrice <= 0 || currentMarkPrice <= 0) {
    return {
      estimatedExitPrice: currentMarkPrice || 0,
      unrealizedPnlUSD: 0,
      unrealizedPnlPercent: 0,
      isProfit: true,
      closingSpreadUSD: 0
    };
  }

  // A la clôture :
  // Un LONG vend au Bid (currentMark * (1 - closingSpreadPercent / 100))
  // Un SHORT achète au Ask (currentMark * (1 + closingSpreadPercent / 100))
  const spreadDecimal = (closingSpreadPercent || 0) / 100;
  const estimatedExitPrice = isLong
    ? currentMarkPrice * (1 - spreadDecimal)
    : currentMarkPrice * (1 + spreadDecimal);

  const closingSpreadUSD = currentMarkPrice * spreadDecimal * (openInterestUSD / entryPrice);

  const priceDiff = isLong
    ? (estimatedExitPrice - entryPrice)
    : (entryPrice - estimatedExitPrice);

  const rawPnl = (priceDiff / entryPrice) * openInterestUSD;
  const netPnlUSD = rawPnl - (borrowFeeUSD || 0);
  const netPnlPercent = collateralUSD > 0 ? (netPnlUSD / collateralUSD) * 100 : 0;

  return {
    estimatedExitPrice,
    unrealizedPnlUSD: netPnlUSD,
    unrealizedPnlPercent: netPnlPercent,
    isProfit: netPnlUSD >= 0,
    closingSpreadUSD
  };
}
