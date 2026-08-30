import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';
import { parseUnits, maxUint256 } from 'viem';
import { useMarketData } from '../context/MarketDataContext';
import { useNotifications } from '../context/NotificationContext';
import { brokexCoreAbi } from '../abi/brokexCoreAbi';
import { api } from '../services/api';
import { getSavedReferrer, getEffectiveReferrerToSubmit } from '../utils/referral';
import { getContractAddresses } from '../utils/contracts';
import { useSmartWriteContract } from '../hooks/useSmartWriteContract';
import { useSpread } from '../hooks/useSpread';

const goldAccent = '#BC8961';
const goldAccentLight = 'rgba(188, 137, 97, 0.15)';

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

export default function OrderPanel() {
  const { 
    goldPrice, 
    goldPriceFormatted, 
    isMainnet, 
    network,
    setNetwork, 
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
    nextOpenTime
  } = useMarketData();

  const { showNotification } = useNotifications();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { executeWrite, waitForTx } = useSmartWriteContract();

  // Adresses centralisées depuis le .env
  const { core: coreAddress, usdc: usdcAddress } = getContractAddresses(isMainnet);

  // Lecture en temps réel du solde USDC (ERC20 avec 6 décimales)
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

  // Lecture de l'allowance USDC pour le contrat Core
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

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const usdcBalanceNum = isConnected && rawUsdcBalance !== undefined
    ? Number(rawUsdcBalance) / 1e6
    : 0;

  const usdcBalance = isConnected
    ? usdcBalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  const handleSwitchNetwork = (target) => {
    setNetwork(target);
  };

  const [side, setSide] = useState('buy'); // 'buy' (Long) | 'sell' (Short)
  const [orderType, setOrderType] = useState('market'); // 'market' | 'limit' | 'stop'
  const [leverage, setLeverage] = useState(5);
  const [collateralAmount, setCollateralAmount] = useState('10');
  const [targetPrice, setTargetPrice] = useState('');
  const [sizeCurrency, setSizeCurrency] = useState('USD');
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [tpPrice, setTpPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');
  const [activeFocusedInput, setActiveFocusedInput] = useState(null);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);

  // Status d'exécution de transaction
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si le marché est fermé, basculer automatiquement de 'market' à 'limit'
  useEffect(() => {
    if (isMarketOpen === false && orderType === 'market') {
      setOrderType('limit');
    }
  }, [isMarketOpen, orderType]);

  const handleClaimFaucet = () => {
    setIsClaimingFaucet(true);
    showNotification("1,000 Testnet USDC requested from faucet", "info", null, 4000, "USDC");
    setTimeout(() => {
      setIsClaimingFaucet(false);
    }, 1000);
  };

  const currentPrice = goldPrice || 2315.10;
  const askPriceStr = goldPriceFormatted !== '...' ? goldPriceFormatted : '2,315.10';
  const bidPriceStr = goldPrice ? (goldPrice - 0.20).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '2,314.90';
  const selectedAsset = 'XAU';

  const minLeverageNum = minLeverage || 5;
  const maxLeverageNum = maxLeverage || 50;
  
  // 4 leverage stops: 5x, 10x, 15x, 20x
  const leverageStops = [5, 10, 15, 20].filter(l => l >= minLeverageNum && l <= maxLeverageNum);

  const percentage = maxLeverageNum > minLeverageNum
    ? ((leverage - minLeverageNum) / (maxLeverageNum - minLeverageNum)) * 100
    : 0;
  const sliderBackground = `linear-gradient(to right, ${goldAccent} ${percentage}%, var(--border-color) ${percentage}%)`;

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

  // Déduction de la commission de l'API (ex: 0.1% => 99.9% de taille effective)
  const commissionRate = (commissionRatePercent || 0.1) / 100; // 0.001
  const effectiveSizeUSD = rawExposureUSD * (1 - commissionRate); // collat * lev * 99.9%

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

  // Handler de soumission d'ordre on-chain
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
      const directionInt = side === 'buy' ? 1 : 0; // 1 = LONG, 0 = SHORT
      const referrerAddress = await getEffectiveReferrerToSubmit(address, network);

      // Convertir SL & TP en 6 décimales
      const slUnits = tpSlEnabled && slPrice && Number(slPrice) > 0 ? parseUnits(slPrice, 6) : 0n;
      const tpUnits = tpSlEnabled && tpPrice && Number(tpPrice) > 0 ? parseUnits(tpPrice, 6) : 0n;

      if (orderType === 'market') {
        // 1. Récupération de la preuve oracle depuis le backend
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

        console.log('[OrderPanel] Submitting openMarket with referrer:', referrerAddress, marketOrderStruct);

        const txHash = await executeWrite({
          address: coreAddress,
          abi: brokexCoreAbi,
          functionName: 'openMarket',
          args: [marketOrderStruct, priceUpdateData],
        });

        showNotification(`Market ${side === 'buy' ? 'Long' : 'Short'} position successfully opened!`, "success", txHash, 7000, "XAU");
      } else {
        // Ordre Limit ou Stop
        const orderTypeInt = orderType === 'limit' ? 1 : 2; // 1 = LIMIT, 2 = STOP
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
    } catch (err) {
      console.error("Trade submission error:", err);
      const errMsg = err?.shortMessage || err?.message || "Failed to execute trade";
      showNotification(errMsg.length > 90 ? errMsg.slice(0, 90) + '...' : errMsg, "error", null, 6000, "XAU");
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeBg = 'var(--panel-bg)';
  const themeControlBg = 'rgba(255, 255, 255, 0.02)';
  const themeBorder = 'var(--border-color)';
  const themeText = 'var(--text-dark)';
  const themeTextMuted = 'var(--text-grey)';
  const buyColor = 'var(--color-blue)'; // blue
  const sellColor = 'var(--color-red)'; // red
  const buyColorBg = 'var(--color-blue-bg)';
  const sellColorBg = 'var(--color-red-bg)';

  return (
    <div className="order panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: themeBg,
      color: themeText,
      fontSize: '12px',
      position: 'relative',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <style>{`
        .order-content-scroll::-webkit-scrollbar {
          display: none;
        }
        .order-content-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners {
          -moz-appearance: textfield;
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

      {/* Scrollable Main Content */}
      <div className="order-content-scroll" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '6px 6px 12px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Top Tabs (Long/Short) - Live WSS Prices */}
        <div style={{ display: 'flex', flexShrink: 0, backgroundColor: themeControlBg, borderRadius: '6px', padding: '3px', border: `1px solid ${themeBorder}` }}>
          <div
            onClick={() => setSide('buy')}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', backgroundColor: side === 'buy' ? buyColorBg : 'transparent', border: `1px solid ${side === 'buy' ? buyColor : 'transparent'}`, transition: 'all 0.15s' }}>
            <div style={{ color: side === 'buy' ? buyColor : themeTextMuted, fontWeight: side === 'buy' ? 600 : 400, fontSize: '12px' }}>Long</div>
            <div style={{ color: side === 'buy' ? buyColor : themeTextMuted, fontSize: '11px', fontFamily: 'Source Code Pro, monospace' }}>${askPriceStr}</div>
          </div>
          <div
            onClick={() => setSide('sell')}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', backgroundColor: side === 'sell' ? sellColorBg : 'transparent', border: `1px solid ${side === 'sell' ? sellColor : 'transparent'}`, transition: 'all 0.15s' }}>
            <div style={{ color: side === 'sell' ? sellColor : themeTextMuted, fontWeight: side === 'sell' ? 600 : 400, fontSize: '12px' }}>Short</div>
            <div style={{ color: side === 'sell' ? sellColor : themeTextMuted, fontSize: '11px', fontFamily: 'Source Code Pro, monospace' }}>${bidPriceStr}</div>
          </div>
        </div>

        {/* Market / Limit / Stop */}
        <div style={{ display: 'flex', flexShrink: 0, backgroundColor: themeControlBg, borderRadius: '6px', padding: '3px', border: `1px solid ${themeBorder}` }}>
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
                  borderRadius: '4px',
                  backgroundColor: orderType === type ? goldAccentLight : 'transparent',
                  color: isMarketDisabled ? 'rgba(255,255,255,0.2)' : orderType === type ? goldAccent : themeTextMuted,
                  border: `1px solid ${orderType === type ? goldAccent : 'transparent'}`,
                  fontSize: '11px', 
                  fontWeight: orderType === type ? 600 : 400, 
                  textTransform: 'capitalize', 
                  transition: 'all 0.15s',
                  opacity: isMarketDisabled ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                {type}
              </div>
            );
          })}
        </div>

        {/* Available to Trade */}
        <div style={{ display: 'flex', flexShrink: 0, justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '0 2px' }}>
          <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}`, cursor: 'help' }}>Available to Trade</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace', fontWeight: 600 }}>{usdcBalance} USDC</span>
            <button
              onClick={handleClaimFaucet}
              disabled={isClaimingFaucet}
              title="Claim 1,000 USDC Faucet"
              style={{
                background: goldAccentLight,
                color: goldAccent,
                border: 'none',
                borderRadius: '2px',
                width: '16px',
                height: '16px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: isClaimingFaucet ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '1',
                transition: 'all 0.15s',
                opacity: isClaimingFaucet ? 0.6 : 1
              }}
            >
              {isClaimingFaucet ? '...' : '+'}
            </button>
          </div>
        </div>

        {/* Target Price (Limit/Stop only) */}
        {orderType !== 'market' && (
          <div
            style={{
              flexShrink: 0,
              backgroundColor: themeControlBg,
              borderRadius: '6px',
              border: `1px solid ${activeFocusedInput === 'targetPrice' ? goldAccent : themeBorder}`,
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 0.2s ease',
              boxShadow: activeFocusedInput === 'targetPrice' ? '0 0 6px rgba(188, 137, 97, 0.25)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeFocusedInput !== 'targetPrice') e.currentTarget.style.borderColor = goldAccent;
            }}
            onMouseLeave={(e) => {
              if (activeFocusedInput !== 'targetPrice') e.currentTarget.style.borderColor = themeBorder;
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: themeTextMuted, textTransform: 'capitalize' }}>
                {orderType} price
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: goldAccent, lineHeight: '1' }}>
                {orderType === 'limit' ? (side === 'buy' ? '≤' : '≥') : (side === 'buy' ? '≥' : '≤')}
              </span>
              <input
                type="number"
                className="no-spinners"
                value={targetPrice}
                onFocus={() => setActiveFocusedInput('targetPrice')}
                onBlur={() => setActiveFocusedInput(null)}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="None"
                style={{ fontSize: '14px', color: themeText, backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100%', fontWeight: 600, fontFamily: 'Source Code Pro, monospace', padding: 0 }}
              />
            </div>
          </div>
        )}

        {/* Collateral & Estimated Size */}
        <div
          style={{
            flexShrink: 0,
            backgroundColor: themeControlBg,
            borderRadius: '6px',
            border: `1px solid ${activeFocusedInput === 'collateral' ? goldAccent : themeBorder}`,
            display: 'flex',
            flexDirection: 'column',
            transition: 'border-color 0.2s ease',
            boxShadow: activeFocusedInput === 'collateral' ? '0 0 6px rgba(188, 137, 97, 0.25)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (activeFocusedInput !== 'collateral') e.currentTarget.style.borderColor = goldAccent;
          }}
          onMouseLeave={(e) => {
            if (activeFocusedInput !== 'collateral') e.currentTarget.style.borderColor = themeBorder;
          }}
        >
          {/* Collateral */}
          <div style={{ padding: '6px 8px', borderBottom: `1px solid ${themeBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: themeTextMuted }}>Collateral</span>
              <span
                style={{ fontSize: '11px', color: goldAccent, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  const cleanBal = String(usdcBalance).replace(/[^0-9.]/g, '');
                  if (cleanBal && !isNaN(Number(cleanBal))) {
                    setCollateralAmount(cleanBal);
                  }
                }}
              >
                Max
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                type="number"
                className="no-spinners"
                value={collateralAmount}
                onFocus={() => setActiveFocusedInput('collateral')}
                onBlur={() => setActiveFocusedInput(null)}
                onChange={(e) => setCollateralAmount(e.target.value)}
                style={{ fontSize: '14px', color: themeText, backgroundColor: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', padding: 0, width: '120px', fontFamily: 'Source Code Pro, monospace' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: themeText, fontWeight: 500, fontSize: '12px' }}>
                USDC
              </div>
            </div>
          </div>

          {/* Estimated Size */}
          <div style={{ padding: '8px 8px', borderBottom: `1px solid ${themeBorder}` }}>
            <div style={{ fontSize: '11px', color: themeTextMuted, marginBottom: '2px' }}>Estimated Size</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: themeText, fontFamily: 'Source Code Pro, monospace' }}>
                {displaySize}
              </span>
              <div
                onClick={() => setSizeCurrency(prev => prev === 'USD' ? 'ASSET' : 'USD')}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: goldAccent, fontWeight: 600, fontSize: '11px', backgroundColor: goldAccentLight, border: `1px solid ${goldAccent}`, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s' }}
              >
                <span>{sizeCurrency === 'USD' ? 'USD' : selectedAsset}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leverage Slider */}
        <div style={{ backgroundColor: themeControlBg, borderRadius: '6px', border: `1px solid ${themeBorder}`, padding: '6px 8px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', color: themeTextMuted }}>Leverage</span>
            <span style={{ color: themeText, fontWeight: 600, fontSize: '11px', fontFamily: 'Source Code Pro, monospace' }}>{leverage}x</span>
          </div>
          <input
            type="range"
            min={minLeverageNum}
            max={maxLeverageNum}
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="custom-leverage-slider"
            style={{ background: sliderBackground, width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', gap: '4px' }}>
            {leverageStops.map(lev => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  fontSize: '9px',
                  border: 'none',
                  borderRadius: '3px',
                  backgroundColor: leverage === lev ? goldAccentLight : 'rgba(255, 255, 255, 0.02)',
                  color: leverage === lev ? goldAccent : themeTextMuted,
                  fontFamily: 'Source Code Pro, monospace',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.1s'
                }}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* TP / SL Management Section */}
        <div style={{ flexShrink: 0, backgroundColor: themeControlBg, borderRadius: '6px', border: `1px solid ${themeBorder}`, display: 'flex', flexDirection: 'column' }}>
          <div
            onClick={() => setTpSlEnabled(!tpSlEnabled)}
            style={{
              padding: '10px 8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              borderBottom: tpSlEnabled ? `1px solid ${themeBorder}` : 'none'
            }}>
            <span style={{ fontSize: '11px', color: themeText, fontWeight: 600 }}>Take Profit / Stop Loss</span>
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
                  padding: '6px 8px',
                  borderBottom: `1px solid ${themeBorder}`,
                  border: activeFocusedInput === 'tp' ? `1px solid ${goldAccent}` : 'none',
                  borderRadius: '4px',
                  transition: 'border 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeFocusedInput !== 'tp') e.currentTarget.style.borderColor = goldAccent;
                }}
                onMouseLeave={(e) => {
                  if (activeFocusedInput !== 'tp') e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: themeTextMuted }}>Take Profit</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['10%', '25%', '50%', '100%'].map(p => (
                      <div
                        key={p}
                        onClick={() => {
                          const pct = parseFloat(p) / 100;
                          const calculatedTp = side === 'buy'
                            ? 2315 * (1 + pct / leverage)
                            : 2315 * (1 - pct / leverage);
                          setTpPrice(calculatedTp.toFixed(2));
                        }}
                        style={{
                          fontSize: '10px',
                          color: goldAccent,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontFamily: 'Source Code Pro, monospace',
                          transition: 'all 0.15s'
                        }}>
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
                    onFocus={() => setActiveFocusedInput('tp')}
                    onBlur={() => setActiveFocusedInput(null)}
                    onChange={(e) => setTpPrice(e.target.value)}
                    placeholder="None"
                    style={{ fontSize: '14px', color: themeText, backgroundColor: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', padding: 0, width: '120px', fontFamily: 'Source Code Pro, monospace' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: themeText, fontWeight: 500, fontSize: '12px' }}>
                    USD
                  </div>
                </div>
              </div>

              {/* Stop Loss Box */}
              <div
                style={{
                  padding: '6px 8px',
                  border: activeFocusedInput === 'sl' ? `1px solid ${goldAccent}` : 'none',
                  borderRadius: '4px',
                  transition: 'border 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeFocusedInput !== 'sl') e.currentTarget.style.borderColor = goldAccent;
                }}
                onMouseLeave={(e) => {
                  if (activeFocusedInput !== 'sl') e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: themeTextMuted }}>Stop Loss</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['10%', '25%', '50%', '70%'].map(p => (
                      <div
                        key={p}
                        onClick={() => {
                          const pct = parseFloat(p) / 100;
                          const calculatedSl = side === 'buy'
                            ? 2315 * (1 - pct / leverage)
                            : 2315 * (1 + pct / leverage);
                          setSlPrice(calculatedSl.toFixed(2));
                        }}
                        style={{
                          fontSize: '10px',
                          color: goldAccent,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontFamily: 'Source Code Pro, monospace',
                          transition: 'all 0.15s'
                        }}>
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
                    onFocus={() => setActiveFocusedInput('sl')}
                    onBlur={() => setActiveFocusedInput(null)}
                    onChange={(e) => setSlPrice(e.target.value)}
                    placeholder="None"
                    style={{ fontSize: '14px', color: themeText, backgroundColor: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', padding: 0, width: '120px', fontFamily: 'Source Code Pro, monospace' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: themeText, fontWeight: 500, fontSize: '12px' }}>
                    USD
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div style={{ flexShrink: 0, display: 'flex', marginTop: '5px' }}>
          {!isConnected ? (
            <button
              onClick={openConnectModal}
              type="button"
              style={{
                flex: 1,
                backgroundColor: goldAccent,
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(188, 137, 97, 0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 0.9}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
            >
              Connect Wallet
            </button>
          ) : needsAllowance ? (
            <button
              onClick={handleApproveUsdc}
              disabled={isSubmitting}
              type="button"
              style={{
                flex: 1,
                backgroundColor: goldAccent,
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(188, 137, 97, 0.3)'
              }}
            >
              {isSubmitting ? (
                <span>Approving USDC...</span>
              ) : (
                <span>Approve USDC</span>
              )}
            </button>
          ) : (
            <button
              onClick={handleExecuteTrade}
              disabled={isSubmitting}
              type="button"
              style={{
                flex: 1,
                backgroundColor: goldAccent,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
              {isSubmitting ? (
                <span>Executing {orderType.toUpperCase()}...</span>
              ) : (
                <span>Go {side === 'buy' ? 'Long' : 'Short'}</span>
              )}
            </button>
          )}
        </div>

        {/* Metrics List */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', marginTop: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Effective Size</span>
            <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>{(effectiveSizeUSD / currentPrice).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} {selectedAsset}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Exposure</span>
            <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>${rawExposureUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Collateral at Open</span>
            <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>{collatNum.toFixed(2)} USDC</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Liquidation Price</span>
            <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>
              {side === 'buy'
                ? (currentPrice * (1 - 0.9 / leverage)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : (currentPrice * (1 + 0.9 / leverage)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              }
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Spread ({side === 'buy' ? 'Long' : 'Short'})</span>
            <span style={{ color: goldAccent, fontFamily: 'Source Code Pro, monospace' }}>
              {activeSpreadFormatted}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Available Liquidity</span>
            <span style={{ fontSize: '11px', fontFamily: 'Source Code Pro, monospace', fontWeight: 600, color: side === 'buy' ? buyColor : sellColor }}>
              {side === 'buy' ? availLiqLongFormatted : availLiqShortFormatted}
            </span>
          </div>

          <div style={{ height: '1px', backgroundColor: themeBorder, margin: '6px 0' }}></div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Oracle Fee</span>
            <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>$0.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Open Fee ({(commissionRate * 100).toFixed(2)}%)</span>
            <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>${openFeeUSD.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: themeTextMuted, borderBottom: `1px dashed ${themeBorder}` }}>Spread Fee</span>
            <span style={{ color: themeText, fontFamily: 'Source Code Pro, monospace' }}>${spreadFeeUSD.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: `1px solid ${themeBorder}` }}>
            <span style={{ color: themeText, fontWeight: 600 }}>Total Fees</span>
            <span style={{ color: goldAccent, fontWeight: 600, fontFamily: 'Source Code Pro, monospace' }}>
              ~${totalFeesUSD.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Network Toggle & Social Links Fixed Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 6px 4px 6px',
        borderTop: 'none',
        backgroundColor: themeBg,
        flexShrink: 0,
        zIndex: 10
      }}>
        {/* Left: Social Links Icons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a
            href="https://x.com/brokexfi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-grey)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.color = goldAccent}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-grey)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>

          <a
            href="https://t.me/brokexfi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-grey)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.color = goldAccent}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-grey)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </a>

          <a
            href="https://docs.brokex.trade"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-grey)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.color = goldAccent}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-grey)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </a>
        </div>

        {/* Right: Testnet / Mainnet Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${themeBorder}`,
          borderRadius: '6px',
          padding: '3px',
          cursor: 'pointer',
          userSelect: 'none',
          alignItems: 'center',
          gap: '4px'
        }}>
          <a
            href="https://base.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = 0.75}
            onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
          >
            {/* Base Logo */}
            <div
              style={{
                width: '14px',
                height: '14px',
                marginLeft: '4px',
                marginRight: '2px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Base Logo"
            >
              <svg width="14" height="14" viewBox="0 0 111 111" fill="none">
                <circle cx="55.5" cy="55.5" r="55.5" fill={goldAccent}/>
                <path d="M55.5 87C72.9001 87 87 72.9001 87 55.5C87 38.0999 72.9001 24 55.5 24C38.6472 24 24.8778 37.2187 24.0454 53.8447H66.8625V57.1553H24.0454C24.8778 73.7813 38.6472 87 55.5 87Z" fill="#121212"/>
              </svg>
            </div>
          </a>

          <style>{`
            .network-toggle-active {
              color: #ffffff !important;
            }
          `}</style>

          <div
            onClick={() => handleSwitchNetwork('testnet')}
            style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '5px 8px',
              borderRadius: '4px',
              color: !isMainnet ? '#ffffff' : 'var(--text-grey)',
              background: !isMainnet ? goldAccent : 'transparent',
              opacity: !isMainnet ? 1 : 0.6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => { if (isMainnet) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { if (isMainnet) e.currentTarget.style.opacity = '0.6'; }}
            title="Base Sepolia Testnet"
          >
            Testnet
          </div>
          <div
            onClick={() => handleSwitchNetwork('mainnet')}
            style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '5px 8px',
              borderRadius: '4px',
              color: isMainnet ? '#ffffff' : 'var(--text-grey)',
              background: isMainnet ? goldAccent : 'transparent',
              opacity: isMainnet ? 1 : 0.6,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { if (!isMainnet) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { if (!isMainnet) e.currentTarget.style.opacity = '0.6'; }}
            title="Base Mainnet"
          >
            Mainnet
          </div>
        </div>
      </div>

    </div>
  );
}
