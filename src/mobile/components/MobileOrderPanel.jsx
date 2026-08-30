import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseUnits, maxUint256 } from 'viem';
import { useMarketData } from '../../context/MarketDataContext';
import { useNotifications } from '../../context/NotificationContext';
import { brokexCoreAbi } from '../../abi/brokexCoreAbi';
import { api } from '../../services/api';
import { getSavedReferrer, getEffectiveReferrerToSubmit } from '../../utils/referral';
import { getContractAddresses } from '../../utils/contracts';
import { useSmartWriteContract } from '../../hooks/useSmartWriteContract';
import { useSpread } from '../../hooks/useSpread';

// Common Accent Colors (Theme-aware via CSS variables)
const goldAccent = '#BC8961';
const goldAccentLight = 'rgba(188, 137, 97, 0.15)';
const buyColor = 'var(--color-blue)'; // blue
const sellColor = 'var(--color-red)'; // red
const buyColorBg = 'var(--color-blue-bg)';
const sellColorBg = 'var(--color-red-bg)';

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

export default function MobileOrderPanel({ isOpen, onClose, initialSide = 'buy', isInline = false }) {
  const { 
    goldPrice, 
    goldPriceFormatted, 
    isMainnet, 
    network,
    minLeverage, 
    maxLeverage,
    minTradeSizeUSD,
    commissionRatePercent,
    longSpreadFormatted,
    shortSpreadFormatted,
    longSpreadPercent,
    shortSpreadPercent,
    availLiqLongFormatted,
    availLiqShortFormatted,
    availLiqLongRaw,
    availLiqShortRaw,
    feedId,
    assetId,
    isMarketOpen,
    nextOpenTime,
    setNetwork
  } = useMarketData();

  const { showNotification } = useNotifications();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { executeWrite, waitForTx } = useSmartWriteContract();

  // Adresses centralisées depuis le .env
  const { core: coreAddress, usdc: usdcAddress } = getContractAddresses(isMainnet);

  const { data: rawUsdcBalance, refetch: refetchUsdc } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(isConnected && address),
      refetchInterval: 3000,
    }
  });

  const { data: rawAllowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && coreAddress ? [address, coreAddress] : undefined,
    query: {
      enabled: Boolean(isConnected && address && coreAddress),
      refetchInterval: 3000,
    }
  });

  const [side, setSide] = useState(initialSide);
  const [orderType, setOrderType] = useState('market');
  const [leverage, setLeverage] = useState(5);
  const [collateralAmount, setCollateralAmount] = useState('10');
  const [targetPrice, setTargetPrice] = useState('');
  const [sizeCurrency, setSizeCurrency] = useState('USD');
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [tpPrice, setTpPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync side with initialSide prop when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSide(initialSide);
    }
  }, [isOpen, initialSide]);

  // Si marché fermé, basculer vers limit
  useEffect(() => {
    if (isMarketOpen === false && orderType === 'market') {
      setOrderType('limit');
    }
  }, [isMarketOpen, orderType]);

  if (!isOpen) return null;

  const currentPrice = goldPrice || 2315.10;
  const askPriceStr = goldPriceFormatted !== '...' ? goldPriceFormatted : '2,315.10';
  const bidPriceStr = goldPrice ? (goldPrice - 0.20).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '2,314.90';
  const selectedAsset = 'XAU';

  const usdcBalanceNum = isConnected && rawUsdcBalance !== undefined
    ? Number(rawUsdcBalance) / 1e6
    : 0;
  const usdcBalance = isConnected
    ? usdcBalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  const minLeverageNum = minLeverage || 5;
  const maxLeverageNum = maxLeverage || 50;
  const leverageStops = [5, 10, 15, 20].filter(l => l >= minLeverageNum && l <= maxLeverageNum);

  const percentage = maxLeverageNum > minLeverageNum
    ? ((leverage - minLeverageNum) / (maxLeverageNum - minLeverageNum)) * 100
    : 0;

  const collatNum = Number(collateralAmount || 0);
  const rawExposureUSD = collatNum * leverage;

  // Calcul instantané du spread via la formule exacte Solidity locale (0 RPC)
  const {
    tradeSpreadPercent,
    spreadFormatted: dynamicSpreadFormatted,
    longSpreadFormatted: dynamicLongSpreadFormatted,
    shortSpreadFormatted: dynamicShortSpreadFormatted
  } = useSpread({
    direction: side === 'buy' ? 1 : 0,
    collateralUSD: collatNum,
    leverage: leverage,
    isOpening: true,
    assetId: assetId || 5500
  });

  const commissionRate = (commissionRatePercent || 0.1) / 100;
  const effectiveSizeUSD = rawExposureUSD * (1 - commissionRate);

  const displaySize = sizeCurrency === 'USD'
    ? effectiveSizeUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (effectiveSizeUSD / currentPrice).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  // Pour les ordres Market, le spread s'ajuste dynamiquement à la taille de l'ordre
  const activeSpreadFormatted = orderType === 'market'
    ? dynamicSpreadFormatted
    : (side === 'buy' ? dynamicLongSpreadFormatted : dynamicShortSpreadFormatted);

  const activeSpreadPercent = tradeSpreadPercent || (side === 'buy' ? (longSpreadPercent || 0.0384) : (shortSpreadPercent || 0.0293));
  const spreadFeeUSD = rawExposureUSD * (activeSpreadPercent / 100);
  const openFeeUSD = rawExposureUSD * commissionRate;
  const oracleFeeUSD = 0.00;
  const totalFeesUSD = openFeeUSD + spreadFeeUSD + oracleFeeUSD;

  // Calcul du prix de liquidation estimé
  const liqPrice = side === 'buy'
    ? currentPrice * (1 - 0.95 / leverage)
    : currentPrice * (1 + 0.95 / leverage);

  // Calcul sécurisé des unités de collatéral
  const currentCollatUnits = (() => {
    try {
      const clean = String(collateralAmount || '0').replace(/[^0-9.]/g, '');
      return clean && !isNaN(Number(clean)) ? parseUnits(clean, 6) : 0n;
    } catch {
      return 0n;
    }
  })();

  const needsAllowance = isConnected && rawAllowance !== undefined && BigInt(rawAllowance || 0n) < (currentCollatUnits > 0n ? currentCollatUnits : 10000000n);

  // Handler d'approbation USDC dédié
  const handleApproveUsdc = async () => {
    if (!isConnected || !address) {
      if (openConnectModal) openConnectModal();
      return;
    }
    if (!coreAddress || coreAddress === '0x0000000000000000000000000000000000000000') {
      showNotification("Brokex contract address is not configured for this network.", "error");
      return;
    }
    setIsSubmitting(true);
    showNotification("Requesting USDC token approval in wallet...", "info", null, 4000, "USDC");
    try {
      const approveTxHash = await executeWrite({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [coreAddress, maxUint256],
      });

      showNotification("Waiting for USDC approval confirmation on-chain...", "info", null, 4000, "USDC");
      await waitForTx(approveTxHash);
      showNotification("USDC approved successfully!", "success", approveTxHash, 5000, "USDC");
      await refetchAllowance();
    } catch (err) {
      console.error("USDC Approve error:", err);
      const errMsg = err?.shortMessage || err?.message || "Failed to approve USDC";
      showNotification(errMsg.length > 90 ? errMsg.slice(0, 90) + '...' : errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteTrade = async () => {
    if (!isConnected || !address) {
      if (openConnectModal) openConnectModal();
      return;
    }

    if (!coreAddress || coreAddress === '0x0000000000000000000000000000000000000000') {
      showNotification("Brokex contract address is not configured for this network.", "error");
      return;
    }

    const cleanCollat = String(collateralAmount || '0').replace(/[^0-9.]/g, '');
    const collatNum = parseFloat(cleanCollat) || 0;
    if (collatNum <= 0) {
      showNotification("Please enter a valid collateral amount.", "error");
      return;
    }

    if (minTradeSizeUSD && collatNum < minTradeSizeUSD) {
      showNotification(`Minimum trade collateral is $${minTradeSizeUSD} USDC.`, "error");
      return;
    }

    // 1. Vérification Solde USDC
    if (rawUsdcBalance === undefined || BigInt(rawUsdcBalance) < currentCollatUnits) {
      showNotification(`Insufficient USDC balance in wallet (${usdcBalance} USDC available, ${collatNum.toFixed(2)} USDC required).`, "error");
      return;
    }

    // 2. Vérification Allowance USDC
    if (rawAllowance === undefined || BigInt(rawAllowance) < currentCollatUnits) {
      showNotification("USDC allowance insufficient. Please approve USDC first.", "error");
      handleApproveUsdc();
      return;
    }

    // 3. Vérification Liquidité Disponible
    const requestedOI = collatNum * leverage;
    const availableLiqUSD = side === 'buy' ? (availLiqLongRaw || 0) : (availLiqShortRaw || 0);
    if (availableLiqUSD > 0 && requestedOI > availableLiqUSD) {
      showNotification(`Insufficient pool liquidity for ${side === 'buy' ? 'Long' : 'Short'} (Requested: $${requestedOI.toFixed(2)}, Available: $${availableLiqUSD.toFixed(2)}).`, "error");
      return;
    }

    if ((orderType === 'limit' || orderType === 'stop') && (!targetPrice || Number(targetPrice) <= 0)) {
      showNotification(`Please enter a valid target price for ${orderType} order.`, "error");
      return;
    }

    setIsSubmitting(true);
    showNotification(`Submitting ${orderType.toUpperCase()} ${side === 'buy' ? 'LONG' : 'SHORT'} order...`, "info", null, 3000, "XAU");

    try {
      const collatUnits = parseUnits(cleanCollat, 6);
      const activeFeedId = feedId || '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2';
      const directionInt = side === 'buy' ? 1 : 0;
      const referrerAddress = await getEffectiveReferrerToSubmit(address, network);

      const slUnits = tpSlEnabled && slPrice && Number(slPrice) > 0 ? parseUnits(slPrice, 6) : 0n;
      const tpUnits = tpSlEnabled && tpPrice && Number(tpPrice) > 0 ? parseUnits(tpPrice, 6) : 0n;

      if (orderType === 'market') {
        const proofRes = await api.getProof(network);
        if (!proofRes || !Array.isArray(proofRes.priceUpdateData) || proofRes.priceUpdateData.length === 0) {
          throw new Error("Unable to fetch oracle price proof.");
        }
        const priceUpdateData = proofRes.priceUpdateData;
        const activeAssetId = BigInt(proofRes.assetId ?? assetId ?? 5500);

        const marketOrderStruct = {
          assetId: activeAssetId,
          direction: directionInt,
          collateral: collatUnits,
          leverage: BigInt(leverage),
          stopLoss: slUnits,
          takeProfit: tpUnits,
          referrer: referrerAddress,
        };

        console.log('[MobileOrderPanel] Submitting openMarket with referrer:', referrerAddress, marketOrderStruct);

        const txHash = await executeWrite({
          address: coreAddress,
          abi: brokexCoreAbi,
          functionName: 'openMarket',
          args: [marketOrderStruct, priceUpdateData],
        });

        showNotification(`Market ${side === 'buy' ? 'Long' : 'Short'} position successfully opened!`, "success", txHash, 7000, "XAU");
      } else {
        const orderTypeInt = orderType === 'limit' ? 1 : 2;
        const targetPriceUnits = parseUnits(targetPrice, 6);
        const activeAssetId = BigInt(assetId ?? 5500);

        const pendingOrderStruct = {
          assetId: activeAssetId,
          direction: directionInt,
          orderType: orderTypeInt,
          targetPrice: targetPriceUnits,
          collateral: collatUnits,
          leverage: BigInt(leverage),
          stopLoss: slUnits,
          takeProfit: tpUnits,
          referrer: referrerAddress,
        };

        const txHash = await executeWrite({
          address: coreAddress,
          abi: brokexCoreAbi,
          functionName: 'openOrder',
          args: [pendingOrderStruct],
        });

        showNotification(`${orderType.toUpperCase()} ${side === 'buy' ? 'Long' : 'Short'} order placed successfully!`, "success", txHash, 7000, "XAU");
      }

      refetchUsdc();
      if (onClose) onClose();
    } catch (err) {
      console.error("Trade submission error:", err);
      const errMsg = err?.shortMessage || err?.message || "Failed to execute trade";
      showNotification(errMsg.length > 90 ? errMsg.slice(0, 90) + '...' : errMsg, "error", null, 6000, "XAU");
    } finally {
      setIsSubmitting(false);
    }
  };

  const innerSheet = (
    <div style={{
      background: isInline ? 'transparent' : 'var(--bg-dark)',
      borderTop: isInline ? 'none' : '1px solid var(--border-color)',
      borderTopLeftRadius: isInline ? '0px' : '20px',
      borderTopRightRadius: isInline ? '0px' : '20px',
      padding: isInline ? '12px 8px' : '16px 12px',
      maxHeight: isInline ? 'none' : '85vh',
      height: 'auto',
      overflowY: isInline ? 'visible' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: isInline ? 'none' : '0 -8px 30px rgba(0, 0, 0, 0.5)',
      width: '100%',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners {
          -moz-appearance: textfield;
        }
        .no-spinners:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .custom-leverage-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .custom-leverage-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 1px solid #333;
          box-shadow: 0 0 4px rgba(0,0,0,0.3);
        }
        .custom-leverage-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 1px solid #333;
          box-shadow: 0 0 4px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Drag Handle indicator */}
      {!isInline && (
        <div style={{
          width: '40px',
          height: '4px',
          background: 'var(--border-color)',
          borderRadius: '2px',
          alignSelf: 'center',
          marginBottom: '4px'
        }} />
      )}

      {/* Drawer Header */}
      {!isInline && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-dark)', textTransform: 'uppercase' }}>
            Configure Order ({selectedAsset})
          </h3>

          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-grey)',
              fontSize: '22px',
              lineHeight: '1',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Long/Short Tabs */}
      <div style={{ 
        display: 'flex', 
        backgroundColor: 'rgba(255, 255, 255, 0.02)', 
        borderRadius: '8px', 
        padding: '3px', 
        border: '1px solid var(--border-color)' 
      }}>
        <div
          onClick={() => setSide('buy')}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1, 
            padding: '6px 8px', 
            cursor: 'pointer', 
            borderRadius: '6px', 
            alignItems: 'center',
            backgroundColor: side === 'buy' ? buyColorBg : 'transparent', 
            border: `1px solid ${side === 'buy' ? buyColor : 'transparent'}`, 
            transition: 'all 0.15s' 
          }}
        >
          <div style={{ color: side === 'buy' ? buyColor : 'var(--text-grey)', fontWeight: side === 'buy' ? 700 : 500, fontSize: '12px' }}>LONG</div>
          <div style={{ color: side === 'buy' ? buyColor : 'var(--text-grey)', fontSize: '10px', fontFamily: 'Source Code Pro, monospace' }}>${askPriceStr}</div>
        </div>
        <div
          onClick={() => setSide('sell')}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1, 
            padding: '6px 8px', 
            cursor: 'pointer', 
            borderRadius: '6px', 
            alignItems: 'center',
            backgroundColor: side === 'sell' ? sellColorBg : 'transparent', 
            border: `1px solid ${side === 'sell' ? sellColor : 'transparent'}`, 
            transition: 'all 0.15s' 
          }}
        >
          <div style={{ color: side === 'sell' ? sellColor : 'var(--text-grey)', fontWeight: side === 'sell' ? 700 : 500, fontSize: '12px' }}>SHORT</div>
          <div style={{ color: side === 'sell' ? sellColor : 'var(--text-grey)', fontSize: '10px', fontFamily: 'Source Code Pro, monospace' }}>${bidPriceStr}</div>
        </div>
      </div>

      {/* Order Types */}
      <div style={{ 
        display: 'flex', 
        backgroundColor: 'rgba(255, 255, 255, 0.02)', 
        borderRadius: '8px', 
        padding: '3px', 
        border: '1px solid var(--border-color)' 
      }}>
        {['market', 'limit', 'stop'].map(type => {
          const isMarketDisabled = type === 'market' && isMarketOpen === false;
          return (
            <div
              key={type}
              onClick={() => {
                if (isMarketDisabled) {
                  const openMsg = nextOpenTime ? `Market is closed. Opens in ${nextOpenTime}.` : `Market is currently closed. Only Limit & Stop orders allowed.`;
                  showNotification(openMsg, "error", null, 4500, "XAU");
                  return;
                }
                setOrderType(type);
              }}
              style={{
                flex: 1, 
                textAlign: 'center', 
                padding: '6px', 
                cursor: isMarketDisabled ? 'not-allowed' : 'pointer', 
                borderRadius: '6px',
                backgroundColor: orderType === type ? goldAccentLight : 'transparent',
                color: isMarketDisabled ? 'rgba(255,255,255,0.2)' : orderType === type ? goldAccent : 'var(--text-grey)',
                border: `1px solid ${orderType === type ? goldAccent : 'transparent'}`,
                fontSize: '10px', 
                fontWeight: orderType === type ? 600 : 500, 
                letterSpacing: '0.04em',
                textTransform: 'uppercase', 
                transition: 'all 0.15s',
                opacity: isMarketDisabled ? 0.4 : 1
              }}
            >
              {type}
            </div>
          );
        })}
      </div>

      {/* Target Price (Limit/Stop only) */}
      {orderType !== 'market' && (
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)', 
          padding: '6px 10px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '2px' 
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>
            {orderType} Price
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: goldAccent }}>
              {orderType === 'limit' ? (side === 'buy' ? '≤' : '≥') : (side === 'buy' ? '≥' : '≤')}
            </span>
            <input
              type="number"
              className="no-spinners"
              placeholder="0.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dark)',
                fontSize: '15px',
                fontWeight: 'bold',
                fontFamily: 'Source Code Pro, monospace',
                width: '100%',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-grey)', fontFamily: 'Source Code Pro, monospace' }}>USD</span>
          </div>
        </div>
      )}

      {/* Available to Trade */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        padding: '0 2px',
        marginTop: '2px',
        marginBottom: '-2px'
      }}>
        <span style={{ color: 'var(--text-grey)', fontSize: '11px' }}>Available to trade</span>
        <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace', fontWeight: '600', fontSize: '11.5px' }}>
          {usdcBalance} USDC
        </span>
      </div>

      {/* Collateral Input Box */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: focusedInput === 'collateral' ? `1px solid ${goldAccent}` : '1px solid var(--border-color)',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        transition: 'border 0.2s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Collateral</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['25%', '50%', '75%', 'MAX'].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  if (usdcBalanceNum > 0) {
                    const factor = pct === '25%' ? 0.25 : pct === '50%' ? 0.5 : pct === '75%' ? 0.75 : 1;
                    setCollateralAmount((usdcBalanceNum * factor).toFixed(2));
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-grey)',
                  fontSize: '9px',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                {pct}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input
            type="number"
            className="no-spinners"
            placeholder="0.00"
            value={collateralAmount}
            onFocus={() => setFocusedInput('collateral')}
            onBlur={() => setFocusedInput(null)}
            onChange={(e) => setCollateralAmount(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dark)',
              fontSize: '18px',
              fontWeight: 'bold',
              fontFamily: 'Source Code Pro, monospace',
              width: '60%',
              outline: 'none'
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace' }}>USDC</span>
        </div>
      </div>

      {/* Position Size Input/Display */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Position Size</span>
          <span style={{ fontSize: '10px', color: 'var(--text-grey)', fontFamily: 'Source Code Pro, monospace' }}>
            ~{(effectiveSizeUSD / currentPrice).toFixed(4)} {selectedAsset}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: goldAccent }}>
            ${displaySize}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-grey)', fontFamily: 'Source Code Pro, monospace' }}>USD</span>
        </div>
      </div>

      {/* Leverage Slider Block */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Leverage</span>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: goldAccent, fontFamily: 'Source Code Pro, monospace' }}>
            {leverage}x
          </span>
        </div>

        <input
          type="range"
          min={minLeverageNum}
          max={maxLeverageNum}
          step="1"
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="custom-leverage-slider"
          style={{ background: `linear-gradient(to right, ${goldAccent} ${percentage}%, var(--border-color) ${percentage}%)` }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
          {leverageStops.map((stop) => (
            <button
              key={stop}
              onClick={() => setLeverage(stop)}
              style={{
                flex: 1,
                background: leverage === stop ? goldAccentLight : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${leverage === stop ? goldAccent : 'var(--border-color)'}`,
                color: leverage === stop ? goldAccent : 'var(--text-grey)',
                fontSize: '9px',
                padding: '3px 0',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                fontFamily: 'Source Code Pro, monospace'
              }}
            >
              {stop}x
            </button>
          ))}
        </div>
      </div>

      {/* TP / SL Management Section (Aligned with PC Design) */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Toggle Header */}
        <div
          onClick={() => setTpSlEnabled(!tpSlEnabled)}
          style={{
            padding: '8px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: tpSlEnabled ? '1px solid var(--border-color)' : 'none'
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-dark)', fontWeight: 600 }}>Take Profit / Stop Loss</span>
          <div style={{
            width: '32px',
            height: '16px',
            backgroundColor: tpSlEnabled ? goldAccent : 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            position: 'relative',
            transition: 'all 0.2s'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#fff',
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: tpSlEnabled ? '18px' : '2px',
              transition: 'all 0.2s'
            }} />
          </div>
        </div>

        {tpSlEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Take Profit Box */}
            <div
              style={{
                padding: '8px 10px',
                border: focusedInput === 'tp' ? `1px solid ${goldAccent}` : '1px solid transparent',
                borderRadius: '4px',
                transition: 'border 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Take Profit</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['10%', '25%', '50%', '100%'].map(p => (
                    <div
                      key={p}
                      onClick={() => {
                        const pct = parseFloat(p) / 100;
                        const calculatedTp = side === 'buy'
                          ? currentPrice * (1 + pct / leverage)
                          : currentPrice * (1 - pct / leverage);
                        setTpPrice(calculatedTp.toFixed(2));
                      }}
                      style={{
                        fontSize: '9.5px',
                        color: goldAccent,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontFamily: 'Source Code Pro, monospace',
                        transition: 'all 0.15s'
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input
                  type="number"
                  className="no-spinners"
                  value={tpPrice}
                  onFocus={() => setFocusedInput('tp')}
                  onBlur={() => setFocusedInput(null)}
                  onChange={(e) => setTpPrice(e.target.value)}
                  placeholder="None"
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-dark)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    width: '120px',
                    fontFamily: 'Source Code Pro, monospace'
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dark)', fontWeight: 500, fontSize: '11px' }}>
                  USD
                </div>
              </div>
            </div>

            {/* Separator line between Take Profit and Stop Loss */}
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

            {/* Stop Loss Box */}
            <div
              style={{
                padding: '8px 10px',
                border: focusedInput === 'sl' ? `1px solid ${goldAccent}` : '1px solid transparent',
                borderRadius: '4px',
                transition: 'border 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Stop Loss</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['10%', '25%', '50%', '70%'].map(p => (
                    <div
                      key={p}
                      onClick={() => {
                        const pct = parseFloat(p) / 100;
                        const calculatedSl = side === 'buy'
                          ? currentPrice * (1 - pct / leverage)
                          : currentPrice * (1 + pct / leverage);
                        setSlPrice(calculatedSl.toFixed(2));
                      }}
                      style={{
                        fontSize: '9.5px',
                        color: goldAccent,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontFamily: 'Source Code Pro, monospace',
                        transition: 'all 0.15s'
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input
                  type="number"
                  className="no-spinners"
                  value={slPrice}
                  onFocus={() => setFocusedInput('sl')}
                  onBlur={() => setFocusedInput(null)}
                  onChange={(e) => setSlPrice(e.target.value)}
                  placeholder="None"
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-dark)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    width: '120px',
                    fontFamily: 'Source Code Pro, monospace'
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dark)', fontWeight: 500, fontSize: '11px' }}>
                  USD
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Breakdown Metrics */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px 10px',
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        fontSize: '10.5px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-grey)' }}>Collateral</span>
          <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold' }}>
            ${collatNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-grey)' }}>Exposure</span>
          <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold' }}>
            ${rawExposureUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-grey)' }}>Effective Size</span>
          <span style={{ color: goldAccent, fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold' }}>
            ${effectiveSizeUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-grey)' }}>Liquidation Price</span>
          <span style={{ color: sellColor, fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold' }}>
            ${liqPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-grey)' }}>Available Liquidity</span>
          <span style={{ color: side === 'buy' ? buyColor : sellColor, fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace' }}>
            {side === 'buy' ? availLiqLongFormatted : availLiqShortFormatted}
          </span>
        </div>
        <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-grey)' }}>Total Fees</span>
          <span style={{ color: goldAccent, fontFamily: 'Source Code Pro, monospace', fontWeight: 'bold' }}>
            ${totalFeesUSD.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Large Action Submit Button */}
      {!isConnected ? (
        <button
          onClick={openConnectModal}
          style={{
            width: '100%',
            height: '38px',
            backgroundColor: '#BC8961',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '4px',
            boxShadow: '0 3px 12px rgba(188, 137, 97, 0.25)',
            transition: 'transform 0.15s ease, opacity 0.15s ease'
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Connect Wallet
        </button>
      ) : needsAllowance ? (
        <button
          onClick={handleApproveUsdc}
          disabled={isSubmitting}
          style={{
            backgroundColor: goldAccent,
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px',
            fontWeight: '900',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            textAlign: 'center',
            marginTop: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            opacity: isSubmitting ? 0.7 : 1,
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 10px rgba(188, 137, 97, 0.3)'
          }}
        >
          {isSubmitting ? 'Approving USDC...' : 'Approve USDC'}
        </button>
      ) : (
        <button
          onClick={handleExecuteTrade}
          disabled={isSubmitting}
          style={{
            backgroundColor: goldAccent,
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '13.5px',
            fontWeight: '700',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            textAlign: 'center',
            marginTop: '4px',
            letterSpacing: '0.02em',
            opacity: isSubmitting ? 0.7 : 1,
            transition: 'all 0.15s ease',
            boxShadow: '0 3px 12px rgba(188, 137, 97, 0.25)'
          }}
        >
          {isSubmitting
            ? `Executing ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}...`
            : `Go ${side === 'buy' ? 'Long' : 'Short'}`
          }
        </button>
      )}
    </div>
  );

  if (isInline) return innerSheet;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }}>
      {/* Tap outside to close spacer */}
      <div style={{ flex: 1 }} onClick={onClose} />
      {innerSheet}
    </div>
  );
}
