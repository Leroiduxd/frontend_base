import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { useMarketData } from '../context/MarketDataContext';
import { useNotifications } from '../context/NotificationContext';
import { brokexCoreAbi } from '../abi/brokexCoreAbi';
import { useEnsOrBasename, getCleanReferralSlug, EnsName } from '../utils/ens.js';
import { getContractAddresses } from '../utils/contracts';

export default function ReferralModal({ isOpen, onClose }) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();
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
      const { core: coreAddress, paymasterUrl } = getContractAddresses(isMainnet);

      const capabilities = paymasterUrl && !paymasterUrl.includes('YOUR_CDP_API_KEY') ? {
        paymasterService: {
          url: paymasterUrl
        }
      } : undefined;

      const tx = await writeContractAsync({
        address: coreAddress,
        abi: brokexCoreAbi,
        functionName: 'claimReferralRewards',
        args: [],
        capabilities
      });

      showNotification("Referral rewards successfully claimed!", "success", tx, 6000, "USDC");
      const updated = await api.getReferrals(address, network || 'testnet');
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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: '12px',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--panel-border)',
          background: 'rgba(255, 255, 255, 0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-dark)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Referral Program
            </span>
            <span style={{
              fontSize: '10px',
              color: 'var(--gold)',
              backgroundColor: 'var(--gold-glow)',
              border: '1px solid rgba(200, 169, 126, 0.25)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontFamily: 'Source Code Pro, monospace'
            }}>
              {commissionRatePct}% COMMISSION
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-grey)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Earnings Overview Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px'
          }}>
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: '600' }}>Total Earned</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: '#3b82f6' }}>
                +${totalEarnedUSD}
              </span>
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: '600' }}>Unclaimed</span>
                <button
                  onClick={handleClaimRewards}
                  disabled={isClaiming || pendingRewardsNum <= 0}
                  style={{
                    background: pendingRewardsNum > 0 ? 'var(--gold)' : 'rgba(255, 255, 255, 0.05)',
                    color: pendingRewardsNum > 0 ? '#000000' : 'var(--text-grey)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '9.5px',
                    fontWeight: 'bold',
                    cursor: pendingRewardsNum > 0 && !isClaiming ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    opacity: isClaiming ? 0.6 : 1
                  }}
                >
                  {isClaiming ? '...' : 'Claim'}
                </button>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--gold)' }}>
                ${pendingRewardsUSD}
              </span>
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: '600' }}>Affiliates</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>
                {affiliatesList.length}
              </span>
            </div>
          </div>

          {/* Referral Link & QR Code Box */}
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--panel-border)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center'
          }}>
            {/* QR Code Container */}
            <div style={{
              background: '#ffffff',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid var(--panel-border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              {referralLink ? (
                <QRCodeSVG
                  value={referralLink}
                  size={92}
                  level="M"
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              ) : (
                <div style={{ width: '92px', height: '92px', background: 'rgba(255,255,255,0.05)' }} />
              )}
            </div>

            {/* Link & Copy Actions */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {isConnected ? 'Your Invite Link' : 'App Link'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-grey)' }}>
                  Scan QR code or copy URL
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-dark)',
                border: '1px solid var(--panel-border)',
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
                <button
                  onClick={handleCopy}
                  style={{
                    background: copied ? 'var(--text-dark)' : 'var(--gold)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    boxShadow: copied ? '0 2px 8px rgba(255, 255, 255, 0.2)' : 'none'
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {!isConnected && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ fontSize: '9.5px', color: 'var(--text-grey)' }}>
                    Connect wallet to earn commission on referrals
                  </span>
                  <button
                    onClick={openConnectModal}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--gold)',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Affiliates & Commission History */}
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--panel-border)',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--panel-border)',
              background: 'rgba(255, 255, 255, 0.01)',
              padding: '0 12px'
            }}>
              <button
                onClick={() => setActiveTab('affiliates')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === 'affiliates' ? 'var(--gold)' : 'transparent'}`,
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
                  borderBottom: `2px solid ${activeTab === 'history' ? 'var(--gold)' : 'transparent'}`,
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

            <div style={{ padding: '8px 12px', minHeight: '120px', maxHeight: '180px', overflowY: 'auto' }}>
              {!isConnected ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-grey)', fontSize: '11px' }}>
                  CONNECT WALLET TO VIEW REFERRAL STATS
                </div>
              ) : activeTab === 'affiliates' ? (
                affiliatesList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-grey)', fontSize: '11px' }}>
                    NO AFFILIATES YET — SHARE YOUR LINK OR QR CODE TO EARN!
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
                            padding: '8px 0',
                            borderBottom: idx !== affiliatesList.length - 1 ? '1px solid var(--panel-border)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: '600', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)' }}>
                              <EnsName address={aff.address} />
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-grey)' }}>
                              Joined {dateStr}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '10px',
                            color: 'var(--gold)',
                            fontFamily: 'Source Code Pro, monospace',
                            fontWeight: 'bold',
                            background: 'var(--gold-glow)',
                            border: '1px solid rgba(200, 169, 126, 0.2)',
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
                            padding: '8px 0',
                            borderBottom: idx !== rewardsHistory.length - 1 ? '1px solid var(--panel-border)' : 'none'
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
                            color: '#3b82f6'
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
      </div>
    </div>
  );
}
