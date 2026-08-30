import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { useMarketData } from '../context/MarketDataContext';
import { useNotifications } from '../context/NotificationContext';
import { brokexCoreAbi } from '../abi/brokexCoreAbi';
import { useEnsOrBasename, getCleanReferralSlug, EnsName } from '../utils/ens.js';
import { getContractAddresses } from '../utils/contracts';
import { useSmartWriteContract } from '../hooks/useSmartWriteContract';

export default function ReferralModal({ isOpen, onClose }) {
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
    if (!isOpen || !isConnected || !address) {
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
        console.warn("Could not load referral data in modal:", err);
      }
    };

    fetchReferrals();
    const interval = setInterval(fetchReferrals, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, isConnected, address, network]);

  if (!isOpen) return null;

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

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'refFadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes refFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .ref-row:hover {
          background: var(--bg-subtle);
        }
        .ref-scrollable::-webkit-scrollbar {
          width: 4px;
        }
        .ref-scrollable::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="panel"
        style={{
          width: '100%',
          maxWidth: '740px',
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px var(--gold-glow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* ========================================================= */}
        {/* TOP SECTION (TIERS SUPÉRIEUR AVEC FOND EN POINTILLÉS) */}
        {/* ========================================================= */}
        <div style={{
          backgroundColor: 'var(--bg-subtle)',
          backgroundImage: 'radial-gradient(var(--border-color) 1.2px, transparent 1.2px)',
          backgroundSize: '10px 10px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          
          {/* Top Subtle Bar with Badge on Left & Close on Right */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px 0 18px'
          }}>
            <span style={{
              fontSize: '9.5px',
              fontWeight: '700',
              color: 'var(--gold)',
              background: 'var(--gold-glow)',
              border: '1px solid var(--gold)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'Source Code Pro, monospace'
            }}>
              {commissionRatePct}% LIFETIME REBATE
            </span>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-grey)',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1,
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
            >
              ✕
            </button>
          </div>

          {/* MAIN HERO: Grand QR Code on LEFT | 4 Stats (Top) & Invite Link (Bottom) on RIGHT */}
          <div style={{
            padding: '12px 20px 18px 20px',
            display: 'flex',
            gap: '18px',
            alignItems: 'center'
          }}>
            
            {/* LEFT COLUMN: LARGE PROMINENT QR CODE */}
            <div style={{
              background: '#ffffff',
              padding: '8px',
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
                    src: '/logo.svg',
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              ) : (
                <div style={{ width: '120px', height: '120px', background: 'rgba(0,0,0,0.05)' }} />
              )}
            </div>

            {/* RIGHT COLUMN: 4 STATS (TOP) & INVITE LINK (BOTTOM) */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              minWidth: 0
            }}>
              
              {/* 4 Stats Grid with Solid Background for Maximum Legibility */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                alignItems: 'center',
                background: 'var(--panel-bg)',
                borderRadius: '8px',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
              }}>
                
                {/* Metric 1: Unclaimed */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  paddingRight: '8px',
                  borderRight: '1px solid var(--border-color)',
                  gap: '2px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-grey)', fontWeight: '700', textTransform: 'uppercase' }}>
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
                  <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--gold)' }}>
                    ${pendingRewardsUSD}
                  </div>
                </div>

                {/* Metric 2: Total Earned */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0 8px',
                  borderRight: '1px solid var(--border-color)',
                  gap: '2px'
                }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-grey)', fontWeight: '700', textTransform: 'uppercase' }}>
                    Total Earned
                  </span>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--color-blue)' }}>
                    +${totalEarnedUSD}
                  </div>
                </div>

                {/* Metric 3: Referred */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0 8px',
                  borderRight: '1px solid var(--border-color)',
                  gap: '2px'
                }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-grey)', fontWeight: '700', textTransform: 'uppercase' }}>
                    Referred
                  </span>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>
                    {affiliatesList.length} <span style={{ fontSize: '9.5px', color: 'var(--text-grey)', fontWeight: 'normal' }}>traders</span>
                  </div>
                </div>

                {/* Metric 4: Rebate Tier */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  paddingLeft: '8px',
                  gap: '2px'
                }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-grey)', fontWeight: '700', textTransform: 'uppercase' }}>
                    Rebate Tier
                  </span>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--gold)' }}>
                    {commissionRatePct}% <span style={{ fontSize: '9.5px', color: 'var(--text-grey)', fontWeight: 'normal' }}>share</span>
                  </div>
                </div>

              </div>

              {/* Invite Link Input Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: '700', color: 'var(--text-grey)', textTransform: 'uppercase' }}>
                    Your Referral Link
                  </span>
                  {!isConnected ? (
                    <button
                      onClick={openConnectModal}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--gold)',
                        fontSize: '9.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      Connect Wallet
                    </button>
                  ) : (
                    <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>
                      Share or scan to earn 20% on every trade
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '3px 4px 3px 10px',
                  gap: '8px'
                }}>
                  <span style={{
                    flex: 1,
                    fontSize: '11.5px',
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
                    style={{
                      backgroundColor: copied ? 'var(--color-blue)' : 'var(--gold)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 14px',
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
              </div>

            </div>

          </div>

        </div>

        {/* ========================================================= */}
        {/* BOTTOM SECTION: FLUSH ACTIVITY TABLE (NO OUTER GAPS) */}
        {/* ========================================================= */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: 'transparent'
        }}>
          {/* Header Tabs */}
          <div style={{
            display: 'flex',
            padding: '0 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(0, 0, 0, 0.08)',
            gap: '16px'
          }}>
            <button
              onClick={() => setActiveTab('affiliates')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'affiliates' ? 'var(--gold)' : 'transparent'}`,
                color: activeTab === 'affiliates' ? 'var(--gold)' : 'var(--text-grey)',
                padding: '11px 2px',
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
                padding: '11px 2px',
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

          {/* Table Content */}
          <div style={{ height: '230px', overflowY: 'auto' }} className="ref-scrollable">
            {!isConnected ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '11.5px' }}>
                Connect your wallet to view affiliate activity
              </div>
            ) : activeTab === 'affiliates' ? (
              affiliatesList.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '11.5px' }}>
                  No referred traders yet. Share your invite link to start earning lifetime commissions!
                </div>
              ) : (
                <div>
                  {/* Columns */}
                  <div style={{
                    display: 'flex',
                    padding: '7px 20px',
                    fontSize: '9.5px',
                    color: 'var(--text-grey)',
                    borderBottom: '1px solid var(--border-color)',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    background: 'var(--bg-subtle)'
                  }}>
                    <div style={{ flex: 1.8 }}>Trader</div>
                    <div style={{ flex: 1 }}>Joined</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>Commission Rate</div>
                  </div>
                  {/* Rows */}
                  {affiliatesList.map((aff, idx) => {
                    const dateStr = aff.boundAt ? new Date(aff.boundAt * 1000).toLocaleDateString() : 'Recent';
                    const rate = formatReferralRate(aff.referralRate);

                    return (
                      <div
                        key={aff.address || idx}
                        className="ref-row"
                        style={{
                          display: 'flex',
                          padding: '7px 20px',
                          fontSize: '11px',
                          alignItems: 'center',
                          borderBottom: idx !== affiliatesList.length - 1 ? '1px solid var(--border-color)' : 'none',
                          height: '34px'
                        }}
                      >
                        <div style={{ flex: 1.8, fontFamily: 'Source Code Pro, monospace', fontSize: '11px', color: 'var(--text-dark)', fontWeight: '600' }}>
                          <EnsName address={aff.address} />
                        </div>
                        <div style={{ flex: 1, fontSize: '10px', color: 'var(--text-grey)' }}>
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
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-grey)', fontSize: '11.5px' }}>
                  No commission payouts yet. Rewards are credited automatically when your affiliates trade.
                </div>
              ) : (
                <div>
                  {/* Columns */}
                  <div style={{
                    display: 'flex',
                    padding: '7px 20px',
                    fontSize: '9.5px',
                    color: 'var(--text-grey)',
                    borderBottom: '1px solid var(--border-color)',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    background: 'var(--bg-subtle)'
                  }}>
                    <div style={{ flex: 1 }}>Trade</div>
                    <div style={{ flex: 1.8 }}>Trader</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>Payout</div>
                  </div>
                  {/* Rows */}
                  {rewardsHistory.map((rew, idx) => {
                    const amountUSD = rew.amount ? (Number(rew.amount) / 1e6).toFixed(3) : '0.000';

                    return (
                      <div
                        key={rew.txHash || idx}
                        className="ref-row"
                        style={{
                          display: 'flex',
                          padding: '7px 20px',
                          fontSize: '11px',
                          alignItems: 'center',
                          borderBottom: idx !== rewardsHistory.length - 1 ? '1px solid var(--border-color)' : 'none',
                          height: '34px'
                        }}
                      >
                        <div style={{ flex: 1, fontFamily: 'Source Code Pro, monospace', fontSize: '10px', color: 'var(--text-grey)' }}>
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
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
