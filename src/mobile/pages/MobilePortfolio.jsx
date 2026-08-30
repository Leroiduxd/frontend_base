import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { api } from '../../services/api';
import { useMarketData } from '../../context/MarketDataContext';
import { useNotifications } from '../../context/NotificationContext';
import { brokexCoreAbi } from '../../abi/brokexCoreAbi';
import { useEnsOrBasename, getCleanReferralSlug, EnsName } from '../../utils/ens.js';
import { getContractAddresses } from '../../utils/contracts';
import { useSmartWriteContract } from '../../hooks/useSmartWriteContract';

export default function MobilePortfolio() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { executeWrite, waitForTx } = useSmartWriteContract();
  const { network, isMainnet } = useMarketData();
  const { showNotification } = useNotifications();
  const userBasename = useEnsOrBasename(address);

  const [referralData, setReferralData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('affiliates'); // 'affiliates' | 'history'

  // Génération du lien de parrainage (avec slug court si Basename / ENS)
  const referralSlug = useMemo(() => {
    return getCleanReferralSlug(address, userBasename);
  }, [address, userBasename]);

  const referralLink = useMemo(() => {
    if (!referralSlug) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.brokex.trade';
    return `${origin}/${referralSlug}`;
  }, [referralSlug]);

  // Récupération des données depuis l'API /referrals/:address
  useEffect(() => {
    let isMounted = true;
    if (!isConnected || !address) {
      setReferralData(null);
      return;
    }

    const fetchReferrals = async () => {
      try {
        setIsLoading(true);
        const data = await api.getReferrals(address, network || 'testnet');
        if (isMounted && data && data.success) {
          setReferralData(data);
        }
      } catch (err) {
        console.warn("Could not load referral stats:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReferrals();
    const interval = setInterval(fetchReferrals, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isConnected, address, network]);

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        // Fallback pour navigateurs mobiles et contextes non sécurisés
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      if (showNotification) {
        showNotification("Referral link copied to clipboard!", "success", null, 3000, "REF");
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy failed, using fallback:", err);
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      if (showNotification) {
        showNotification("Referral link copied!", "success", null, 3000, "REF");
      }
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;

    // L'API native de partage mobile (iOS Safari / Android Chrome)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Brokex Perpetual DEX',
          text: 'Trade Gold & Forex with up to 50x leverage on Brokex:\n',
          url: referralLink
        });
        return;
      } catch (err) {
        // Si l'utilisateur a simplement annulé la boîte de dialogue native de partage, ne rien faire
        if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
          return;
        }
        console.warn("navigator.share failed, fallback to copy:", err);
      }
    }

    // Fallback si le navigateur ne supporte pas le partage natif (ex: HTTP non sécurisé en localhost)
    handleCopy();
  };

  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimRewards = async () => {
    if (!isConnected || !address) {
      if (openConnectModal) openConnectModal();
      return;
    }

    const pendingNum = referralData?.pendingRewards ? Number(referralData.pendingRewards) : 0;
    if (pendingNum <= 0) {
      showNotification("No unclaimed rewards available to claim.", "error", null, 3000, "REF");
      return;
    }

    setIsClaiming(true);
    showNotification("Claiming referral rewards...", "info", null, 4000, "USDC");

    try {
      const isMainnet = network === 'mainnet';
      const { core: coreAddress } = getContractAddresses(isMainnet);

      const tx = await executeWrite({
        address: coreAddress,
        abi: brokexCoreAbi,
        functionName: 'claimReferralRewards',
        args: [],
      });

      showNotification("Referral rewards successfully claimed!", "success", tx, 6000, "USDC");
      await waitForTx(tx);
      // Rafraîchir les données
      const updated = await api.getReferrals(address, network || 'mainnet');
      if (updated && updated.success) setReferralData(updated);
    } catch (err) {
      console.error("Claim rewards failed:", err);
      showNotification(`Claim failed: ${err.shortMessage || err.message || 'Transaction rejected'}`, "error", null, 5000, "REF");
    } finally {
      setIsClaiming(false);
    }
  };

  // Conversions micro-USDC (6 décimales)
  const totalEarnedUSD = referralData?.totalEarned ? (Number(referralData.totalEarned) / 1e6).toFixed(2) : '0.00';
  const pendingRewardsNum = referralData?.pendingRewards ? Number(referralData.pendingRewards) / 1e6 : 0;
  const pendingRewardsUSD = pendingRewardsNum.toFixed(2);
  const claimedRewardsUSD = referralData?.claimedRewards ? (Number(referralData.claimedRewards) / 1e6).toFixed(2) : '0.00';
  
  const formatCommissionRatePct = (rawRate) => {
    if (!rawRate) return '20.0';
    const num = Number(rawRate);
    if (isNaN(num)) return '20.0';
    if (num >= 10000) return (num / 10000).toFixed(1);
    if (num >= 100) return (num / 100).toFixed(1);
    return num.toFixed(1);
  };

  const formatReferralRate = (rawRate) => {
    if (!rawRate) return '20';
    const num = Number(rawRate);
    if (isNaN(num)) return '20';
    if (num >= 10000) return (num / 10000).toFixed(0);
    if (num >= 100) return (num / 100).toFixed(0);
    return num.toFixed(0);
  };

  const commissionRatePct = formatCommissionRatePct(referralData?.referralRate);
  const affiliatesList = referralData?.affiliates || [];
  const rewardsHistory = referralData?.rewardsHistory || [];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      backgroundColor: 'var(--panel-bg)',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      marginBottom: '16px'
    }}>
      {/* 1. Header Overview & Total Profit Card */}
      <div style={{
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>
            Referral Program
          </span>
          <span style={{
            fontSize: '9px',
            color: 'var(--gold)',
            backgroundColor: 'rgba(188, 137, 97, 0.12)',
            border: '1px solid rgba(188, 137, 97, 0.3)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontFamily: 'Source Code Pro, monospace'
          }}>
            {commissionRatePct}% COMMISSION
          </span>
        </div>

        {/* Total Profit Earned Display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--color-blue)' }}>
              +${totalEarnedUSD}
            </span>
            <span style={{ fontSize: '9px', color: 'var(--text-grey)', marginTop: '2px' }}>
              Total Earnings (USDC)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>
              {affiliatesList.length}
            </span>
            <span style={{ fontSize: '9px', color: 'var(--text-grey)', marginTop: '2px' }}>
              Total Affiliates
            </span>
          </div>
        </div>

        {/* Pending & Claimed Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: 'bold' }}>Unclaimed</span>
            <span style={{ fontWeight: 'bold', color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace', fontSize: '15px' }}>
              ${pendingRewardsUSD}
            </span>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: 'bold' }}>Claimed</span>
            <span style={{ fontWeight: 'bold', color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace', fontSize: '15px' }}>
              ${claimedRewardsUSD}
            </span>
          </div>
        </div>

        {/* Full-width Claim Button (Same 38px height as Trade / Connect buttons) */}
        <button
          onClick={handleClaimRewards}
          disabled={isClaiming || pendingRewardsNum <= 0}
          style={{
            width: '100%',
            height: '38px',
            background: pendingRewardsNum > 0 ? '#BC8961' : 'rgba(255, 255, 255, 0.04)',
            color: pendingRewardsNum > 0 ? '#000000' : 'var(--text-grey)',
            border: pendingRewardsNum > 0 ? 'none' : '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: '700',
            cursor: pendingRewardsNum > 0 && !isClaiming ? 'pointer' : 'not-allowed',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
            opacity: isClaiming ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: pendingRewardsNum > 0 ? '0 3px 12px rgba(188, 137, 97, 0.25)' : 'none'
          }}
          onMouseDown={(e) => { if (pendingRewardsNum > 0) e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          onTouchStart={(e) => { if (pendingRewardsNum > 0) e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {isClaiming ? (
            'Claiming Rewards...'
          ) : pendingRewardsNum > 0 ? (
            `Claim Rewards ($${pendingRewardsUSD})`
          ) : (
            'No Rewards to Claim'
          )}
        </button>
      </div>

      {/* 2. Referral Link Share Section */}
      <div style={{
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.04em' }}>
            Your Personal Invite Link
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>
            Share & Earn {commissionRatePct}%
          </span>
        </div>

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
              fontWeight: '700',
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 12px rgba(188, 137, 97, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Connect Wallet to Get Link
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '4px 6px 4px 10px',
            gap: '8px'
          }}>
            <span style={{
              flex: 1,
              fontSize: '11px',
              fontFamily: 'Source Code Pro, monospace',
              color: 'var(--text-dark)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {referralLink}
            </span>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? '#ffffff' : '#BC8961',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: copied ? '0 2px 8px rgba(255, 255, 255, 0.2)' : 'none'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleShare}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
                </svg>
                <span>Share</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Affiliates List & Commission History Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.01)',
          padding: '0 12px'
        }}>
          <button
            onClick={() => setActiveTab('affiliates')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'affiliates' ? '#BC8961' : 'transparent'}`,
              color: activeTab === 'affiliates' ? 'var(--text-dark)' : 'var(--text-grey)',
              padding: '10px 8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Affiliates ({affiliatesList.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'history' ? '#BC8961' : 'transparent'}`,
              color: activeTab === 'history' ? 'var(--text-dark)' : 'var(--text-grey)',
              padding: '10px 8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Commission History ({rewardsHistory.length})
          </button>
        </div>

        {/* Content List */}
        <div style={{ padding: '8px 12px', minHeight: '120px' }}>
          {!isConnected ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-grey)', fontSize: '11px' }}>
              CONNECT WALLET TO VIEW REFERRALS
            </div>
          ) : activeTab === 'affiliates' ? (
            affiliatesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-grey)', fontSize: '11px' }}>
                NO AFFILIATES YET — SHARE YOUR LINK TO EARN!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {affiliatesList.map((aff, idx) => {
                  const dateStr = aff.boundAt ? new Date(aff.boundAt * 1000).toLocaleDateString() : 'Recent';
                  const rate = formatReferralRate(aff.referralRate);

                  return (
                    <div
                      key={aff.address || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: idx !== affiliatesList.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>
                          <EnsName address={aff.address} />
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>
                          Joined on {dateStr}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        color: '#BC8961',
                        fontFamily: 'Source Code Pro, monospace',
                        fontWeight: 'bold',
                        background: 'rgba(188, 137, 97, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {rate}% Share
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            rewardsHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-grey)', fontSize: '11px' }}>
                NO COMMISSIONS RECEIVED YET
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {rewardsHistory.map((rew, idx) => {
                  const amountUSD = rew.amount ? (Number(rew.amount) / 1e6).toFixed(3) : '0.000';
                  const dateStr = rew.timestamp ? new Date(rew.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <div
                      key={rew.txHash || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: idx !== rewardsHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                          Trade #{rew.tradeId || idx + 1} (<EnsName address={rew.trader} />)
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>
                          {dateStr}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        fontFamily: 'Source Code Pro, monospace',
                        color: 'var(--color-blue)'
                      }}>
                        +${amountUSD} USDC
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
