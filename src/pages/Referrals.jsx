import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { QRCodeSVG } from 'qrcode.react';
import Sidebar from '../components/Sidebar';
import useIsMobile from '../hooks/useIsMobile';
import MobileLayout from '../mobile/components/MobileLayout';
import { api } from '../services/api';
import { useMarketData } from '../context/MarketDataContext';
import { useNotifications } from '../context/NotificationContext';
import { brokexCoreAbi } from '../abi/brokexCoreAbi';
import { useEnsOrBasename, getCleanReferralSlug, EnsName } from '../utils/ens.js';
import { getContractAddresses } from '../utils/contracts';
import { useSmartWriteContract } from '../hooks/useSmartWriteContract';

export default function Referrals() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { executeWrite, waitForTx } = useSmartWriteContract();
  const { network } = useMarketData();
  const { showNotification } = useNotifications();
  const userBasename = useEnsOrBasename(address);

  const [referralData, setReferralData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState('affiliates'); // 'affiliates' | 'history'

  const referralSlug = useMemo(() => {
    return getCleanReferralSlug(address, userBasename);
  }, [address, userBasename]);

  const referralLink = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.brokex.trade';
    if (!address) return origin;
    return referralSlug ? `${origin}/${referralSlug}` : `${origin}/${address}`;
  }, [referralSlug, address]);

  useEffect(() => {
    let isMounted = true;
    if (!isConnected || !address) {
      setReferralData(null);
      return;
    }

    const fetchReferrals = async () => {
      try {
        const data = await api.getReferrals(address, network || 'testnet');
        if (isMounted && data && data.success) {
          setReferralData(data);
        }
      } catch (err) {
        console.warn("Could not load referral data:", err);
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
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
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
      console.warn("Copy error:", err);
    }
  };

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
      const updated = await api.getReferrals(address, network || 'mainnet');
      if (updated && updated.success) setReferralData(updated);
    } catch (err) {
      console.error("Claim rewards failed:", err);
      showNotification(`Claim failed: ${err.shortMessage || err.message || 'Transaction rejected'}`, "error", null, 5000, "REF");
    } finally {
      setIsClaiming(false);
    }
  };

  const totalEarnedUSD = referralData?.totalEarned ? (Number(referralData.totalEarned) / 1e6).toFixed(2) : '0.00';
  const pendingRewardsNum = referralData?.pendingRewards ? Number(referralData.pendingRewards) / 1e6 : 0;
  const pendingRewardsUSD = pendingRewardsNum.toFixed(2);
  const affiliatesList = referralData?.affiliates || [];
  const rewardsHistory = referralData?.rewardsHistory || [];

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

  const content = (
    <div className="ref-unified-panel">
      <style>{`
        .ref-unified-panel {
          width: 100%;
          max-width: 800px;
          margin: 0 auto 60px auto;
          background-color: var(--panel-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          color: var(--text-dark);
        }
        .ref-page-card {
          border-bottom: 1px solid var(--border-color);
          padding: 24px 26px;
          background-color: transparent;
        }
        .ref-page-card:last-child {
          border-bottom: none;
        }
        @media (max-width: 600px) {
          .ref-page-card {
            padding: 18px 14px !important;
          }
        }
        .ref-primary-btn:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }
        .ref-primary-btn:active {
          transform: translateY(0);
        }
        .ref-row:hover {
          background: var(--bg-subtle);
        }
        .ref-table-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .ref-table-scroll::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
      `}</style>

      {/* ========================================================= */}
      {/* 1. HERO HEADER: TITLE, BADGE & DESCRIPTION */}
      {/* ========================================================= */}
      <div className="ref-page-card" style={{ textAlign: 'center', padding: '28px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: 'var(--gold)',
            background: 'var(--gold-glow)',
            border: '1px solid var(--gold)',
            padding: '3px 10px',
            borderRadius: '4px',
            fontFamily: 'Source Code Pro, monospace',
            letterSpacing: '0.06em'
          }}>
            {commissionRatePct}% LIFETIME REBATE
          </span>
          <span style={{
            fontSize: '10px',
            fontWeight: '600',
            color: 'var(--text-grey)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            padding: '3px 10px',
            borderRadius: '4px',
            fontFamily: 'Source Code Pro, monospace'
          }}>
            BASE NETWORK
          </span>
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          letterSpacing: '-0.02em',
          margin: '0 0 10px 0',
          color: 'var(--text-dark)'
        }}>
          Referral & Affiliate Program
        </h1>

        <p style={{
          fontSize: '13px',
          color: 'var(--text-grey)',
          maxWidth: '620px',
          margin: '0 auto 20px auto',
          lineHeight: '1.6'
        }}>
          Invite traders to Brokex and earn a lifetime 20% commission on every trade fee they generate. Payouts accumulate in USDC directly on Base with one-click onchain claims.
        </p>

        {/* 4 Stats Grid in Hero */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '10px',
          marginTop: '10px'
        }}>
          {/* Stat 1: Unclaimed */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px 14px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-grey)', fontWeight: '700', textTransform: 'uppercase' }}>
                Unclaimed
              </span>
              <button
                onClick={handleClaimRewards}
                disabled={isClaiming || pendingRewardsNum <= 0}
                style={{
                  backgroundColor: pendingRewardsNum > 0 ? 'var(--gold)' : 'transparent',
                  color: pendingRewardsNum > 0 ? '#ffffff' : 'var(--text-grey)',
                  border: pendingRewardsNum > 0 ? 'none' : '1px solid var(--border-color)',
                  borderRadius: '3px',
                  padding: '1px 6px',
                  fontSize: '9px',
                  fontWeight: '700',
                  cursor: pendingRewardsNum > 0 && !isClaiming ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s'
                }}
              >
                {isClaiming ? '...' : 'Claim'}
              </button>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--gold)', marginTop: '4px' }}>
              ${pendingRewardsUSD}
            </div>
          </div>

          {/* Stat 2: Total Earned */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px 14px',
            textAlign: 'left'
          }}>
            <span style={{ fontSize: '10px', color: 'var(--text-grey)', fontWeight: '700', textTransform: 'uppercase' }}>
              Total Earned
            </span>
            <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--color-blue)', marginTop: '4px' }}>
              +${totalEarnedUSD}
            </div>
          </div>

          {/* Stat 3: Referred */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px 14px',
            textAlign: 'left'
          }}>
            <span style={{ fontSize: '10px', color: 'var(--text-grey)', fontWeight: '700', textTransform: 'uppercase' }}>
              Referred
            </span>
            <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)', marginTop: '4px' }}>
              {affiliatesList.length} <span style={{ fontSize: '10px', color: 'var(--text-grey)', fontWeight: 'normal' }}>traders</span>
            </div>
          </div>

          {/* Stat 4: Rebate Tier */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px 14px',
            textAlign: 'left'
          }}>
            <span style={{ fontSize: '10px', color: 'var(--text-grey)', fontWeight: '700', textTransform: 'uppercase' }}>
              Rebate Share
            </span>
            <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--gold)', marginTop: '4px' }}>
              {commissionRatePct}%
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. REFERRAL LINK & QR CODE SECTION */}
      {/* ========================================================= */}
      <div className="ref-page-card">
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '20px',
          alignItems: 'center'
        }}>
          {/* QR Code */}
          <div style={{
            background: '#ffffff',
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
          }}>
            {referralLink ? (
              <QRCodeSVG
                value={referralLink}
                size={120}
                level="H"
                fgColor="#000000"
                bgColor="#ffffff"
                imageSettings={{
                  src: '/logo-gold.svg',
                  x: undefined,
                  y: undefined,
                  height: 26,
                  width: 26,
                  excavate: true,
                }}
              />
            ) : (
              <div style={{ width: '120px', height: '120px', background: 'rgba(0,0,0,0.05)' }} />
            )}
          </div>

          {/* Link Box and Info */}
          <div style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-grey)', textTransform: 'uppercase' }}>
                Your Unique Invite Link
              </span>
              {!isConnected && (
                <button
                  onClick={openConnectModal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold)',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Connect Wallet
                </button>
              )}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#0a0a0c',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '4px 6px 4px 12px',
              gap: '10px'
            }}>
              <span style={{
                flex: 1,
                fontSize: '12px',
                fontFamily: 'Source Code Pro, monospace',
                color: 'var(--text-dark)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {referralLink}
              </span>

              <button
                onClick={handleCopy}
                className="ref-primary-btn"
                style={{
                  backgroundColor: copied ? 'var(--color-blue)' : 'var(--gold)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '7px 16px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s'
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-grey)', lineHeight: '1.5' }}>
              Share your link or QR code with traders. When they visit and execute at least 1 trade, their address is permanently bound to you onchain.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. HOW IT WORKS (3 Simple Steps) */}
      {/* ========================================================= */}
      <div className="ref-page-card">
        <h2 style={{
          fontSize: '14px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--gold)',
          margin: '0 0 16px 0',
          fontFamily: 'Source Code Pro, monospace'
        }}>
          How Brokex Affiliates Work
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '12px'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gold)', marginBottom: '6px', fontFamily: 'Source Code Pro, monospace' }}>
              01 • SHARE
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '4px' }}>
              Send Your Link
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-grey)', lineHeight: '1.4' }}>
              Copy your personal referral URL or QR code and share it on X, Telegram, or Discord.
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gold)', marginBottom: '6px', fontFamily: 'Source Code Pro, monospace' }}>
              02 • TRADE
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '4px' }}>
              Referrals Open Positions
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-grey)', lineHeight: '1.4' }}>
              As soon as a referred user connects and opens a trade, their wallet is permanently bound to yours.
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gold)', marginBottom: '6px', fontFamily: 'Source Code Pro, monospace' }}>
              03 • EARN
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '4px' }}>
              20% Lifetime Payouts
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-grey)', lineHeight: '1.4' }}>
              Every time your referrals trade, 20% of protocol fees accumulate in your balance, claimable anytime in USDC.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. ACTIVITY TABLE: REFERRED TRADERS & COMMISSION HISTORY */}
      {/* ========================================================= */}
      <div className="ref-page-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Tabs Header */}
        <div style={{
          display: 'flex',
          padding: '0 20px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: '#0a0a0c',
          gap: '18px'
        }}>
          <button
            onClick={() => setActiveTab('affiliates')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'affiliates' ? 'var(--gold)' : 'transparent'}`,
              color: activeTab === 'affiliates' ? 'var(--gold)' : 'var(--text-grey)',
              padding: '12px 2px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              transition: 'all 0.15s'
            }}
          >
            Referred Traders ({affiliatesList.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'history' ? 'var(--gold)' : 'transparent'}`,
              color: activeTab === 'history' ? 'var(--gold)' : 'var(--text-grey)',
              padding: '12px 2px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              transition: 'all 0.15s'
            }}
          >
            Commission History ({rewardsHistory.length})
          </button>
        </div>

        {/* Table Body */}
        <div style={{ minHeight: '220px', maxHeight: '380px', overflowY: 'auto' }} className="ref-table-scroll">
          {!isConnected ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '12px' }}>
              Connect your wallet to view your affiliate activity
            </div>
          ) : activeTab === 'affiliates' ? (
            affiliatesList.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '12px' }}>
                No referred traders yet. Share your invite link to start earning lifetime commissions!
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex',
                  padding: '8px 20px',
                  fontSize: '10px',
                  color: 'var(--text-grey)',
                  borderBottom: '1px solid var(--border-color)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  backgroundColor: 'var(--bg-subtle)'
                }}>
                  <div style={{ flex: 1.8 }}>Trader</div>
                  <div style={{ flex: 1 }}>Joined</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>Commission Rate</div>
                </div>

                {affiliatesList.map((aff, idx) => {
                  const dateStr = aff.boundAt ? new Date(aff.boundAt * 1000).toLocaleDateString() : 'Recent';
                  const rate = formatReferralRate(aff.referralRate);

                  return (
                    <div
                      key={aff.address || idx}
                      className="ref-row"
                      style={{
                        display: 'flex',
                        padding: '8px 20px',
                        fontSize: '11px',
                        alignItems: 'center',
                        borderBottom: idx !== affiliatesList.length - 1 ? '1px solid var(--border-color)' : 'none',
                        height: '36px'
                      }}
                    >
                      <div style={{ flex: 1.8, fontFamily: 'Source Code Pro, monospace', fontSize: '11px', color: 'var(--text-dark)', fontWeight: '600' }}>
                        <EnsName address={aff.address} />
                      </div>
                      <div style={{ flex: 1, fontSize: '11px', color: 'var(--text-grey)' }}>
                        {dateStr}
                      </div>
                      <div style={{ flex: 1, textAlign: 'right', fontFamily: 'Source Code Pro, monospace', fontSize: '11px', color: 'var(--gold)', fontWeight: 'bold' }}>
                        {rate}% Share
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            rewardsHistory.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '12px' }}>
                No commission payouts yet. Rewards are credited automatically when your affiliates trade.
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex',
                  padding: '8px 20px',
                  fontSize: '10px',
                  color: 'var(--text-grey)',
                  borderBottom: '1px solid var(--border-color)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  backgroundColor: 'var(--bg-subtle)'
                }}>
                  <div style={{ flex: 1 }}>Trade</div>
                  <div style={{ flex: 1.8 }}>Trader</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>Payout</div>
                </div>

                {rewardsHistory.map((rew, idx) => {
                  const amountUSD = rew.amount ? (Number(rew.amount) / 1e6).toFixed(3) : '0.000';

                  return (
                    <div
                      key={rew.txHash || idx}
                      className="ref-row"
                      style={{
                        display: 'flex',
                        padding: '8px 20px',
                        fontSize: '11px',
                        alignItems: 'center',
                        borderBottom: idx !== rewardsHistory.length - 1 ? '1px solid var(--border-color)' : 'none',
                        height: '36px'
                      }}
                    >
                      <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '11px', color: 'var(--text-grey)' }}>
                        #{rew.tradeId || idx + 1}
                      </div>
                      <div style={{ flex: 1.8, fontFamily: 'Source Code Pro, monospace', fontSize: '11px', color: 'var(--text-dark)' }}>
                        <EnsName address={rew.trader} />
                      </div>
                      <div style={{ flex: 1, textAlign: 'right', fontFamily: 'Source Code Pro, monospace', fontSize: '11px', color: 'var(--color-blue)', fontWeight: 'bold' }}>
                        +${amountUSD} USDC
                      </div>
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

  // Mobile rendering wrapped in MobileLayout with sticky bottom navigation tabs
  if (isMobile) {
    return (
      <MobileLayout disablePadding={true}>
        <style>{`
          .mobile-referral-scroll {
            flex: 1;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: 8px 8px 30px 8px;
          }
          .mobile-bottom-tabs {
            display: flex;
            background: rgba(10, 10, 10, 0.92);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border-top: 1px solid var(--border-color);
            height: 46px;
            padding-bottom: env(safe-area-inset-bottom, 0);
            align-items: center;
            justify-content: space-around;
            z-index: 1000;
            flex-shrink: 0;
          }
          body.light-mode .mobile-bottom-tabs {
            background: rgba(255, 255, 255, 0.92);
          }
          .mobile-tab-item {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            color: var(--text-grey);
            cursor: pointer;
            gap: 6px;
            flex: 1;
            height: 100%;
            transition: all 0.2s ease;
            border: none;
            background: transparent;
            outline: none;
          }
          .mobile-tab-item.active,
          .mobile-tab-item:active {
            color: var(--gold);
          }
          .mobile-tab-label {
            font-size: 10px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
        `}</style>

        {/* Scrollable Referral content */}
        <div className="mobile-referral-scroll">
          {content}
        </div>

        {/* Sticky Bottom Tab Bar */}
        <footer className="mobile-bottom-tabs">
          {/* Markets Tab Button */}
          <button 
            className="mobile-tab-item"
            onClick={() => navigate('/market')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
            <span className="mobile-tab-label">Markets</span>
          </button>

          {/* Trade Tab Button */}
          <button 
            className="mobile-tab-item"
            onClick={() => navigate('/')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="12" cy="12" r="3" /><path d="m14 10 2-2" /><path d="m10 14-2 2" /><path d="m14 14 2 2" /><path d="m10 10-2-2" />
            </svg>
            <span className="mobile-tab-label">Trade</span>
          </button>

          {/* Referral Tab Button (Active) */}
          <button 
            className="mobile-tab-item active"
            onClick={() => navigate('/referrals')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="mobile-tab-label">Referral</span>
          </button>
        </footer>
      </MobileLayout>
    );
  }

  // Desktop rendering wrapped with Sidebar & Framed Panel matching Airdrop.jsx
  return (
    <div style={{ 
      display: 'flex', 
      width: '100vw', 
      height: '100vh', 
      padding: '10px', 
      backgroundColor: 'var(--bg-dark)', 
      gap: '8px', 
      overflow: 'hidden' 
    }}>
      <style>{`
        .ref-page-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .ref-page-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .ref-page-scroll::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
        .ref-page-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--gold);
        }
      `}</style>

      {/* LEFT COLUMN: Sidebar */}
      <Sidebar />

      {/* CENTER / MAIN VIEW: Framed panel matching Brokex design system */}
      <div 
        className="panel"
        style={{ 
          flex: 1, 
          height: '100%',
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div 
          className="ref-page-scroll"
          style={{ 
            flex: 1, 
            height: '100%',
            overflowY: 'auto',
            padding: '20px 20px 20px 20px'
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
