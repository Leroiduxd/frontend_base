import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import useIsMobile from '../hooks/useIsMobile';
import MobileLayout from '../mobile/components/MobileLayout';
import AsciiStarsBackground from '../components/AsciiStarsBackground';

const GOOGLE_FORM_URL = 'https://forms.gle/ynmsAuniQTG4RuzX7';

export default function Airdrop() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const content = (
    <div className="airdrop-unified-panel">
      <style>{`
        .airdrop-unified-panel {
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
        .airdrop-card {
          border-bottom: 1px solid var(--border-color);
          padding: 24px 26px;
          background-color: transparent;
        }
        .airdrop-card:last-child {
          border-bottom: none;
        }
        @media (max-width: 600px) {
          .airdrop-card {
            padding: 18px 14px !important;
          }
        }
        .airdrop-primary-btn:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }
        .airdrop-primary-btn:active {
          transform: translateY(0);
        }
        .airdrop-secondary-btn:hover {
          border-color: var(--gold) !important;
          color: var(--text-dark) !important;
          background: rgba(255, 255, 255, 0.04) !important;
        }
      `}</style>

      {/* ========================================================= */}
      {/* 1. HERO HEADER: TITLE, PRIZE & ACTIONS */}
      {/* ========================================================= */}
      <div className="airdrop-card" style={{ textAlign: 'center', padding: '28px 24px' }}>
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: 'var(--gold)',
            background: 'rgba(188, 137, 97, 0.12)',
            border: '1px solid rgba(188, 137, 97, 0.3)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontFamily: 'Source Code Pro, monospace',
            letterSpacing: '0.04em'
          }}>
            OFFICIAL TRADING CAMPAIGN
          </span>
          <span style={{
            fontSize: '10px',
            fontWeight: '600',
            color: 'var(--text-grey)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontFamily: 'Source Code Pro, monospace'
          }}>
            BASE NETWORK
          </span>
        </div>

        {/* Main Title */}
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: '800',
          letterSpacing: '-0.02em',
          lineHeight: '1.25'
        }}>
          Brokex Trading Campaign — <span style={{ color: 'var(--gold)' }}>$250 Prize Pool</span>
        </h1>

        <p style={{
          margin: '0 auto 18px auto',
          maxWidth: '620px',
          fontSize: '13px',
          color: 'var(--text-grey)',
          lineHeight: '1.55'
        }}>
          Campaign starts <strong style={{ color: 'var(--text-dark)' }}>September 3, 2026, at 00:00 UTC</strong>. Trade on Brokex, hold your positions for at least 1 hour, and submit your participation to share $250 USDC across 25 winners.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '22px' }}>
          <a
            href={GOOGLE_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="airdrop-primary-btn"
            style={{
              backgroundColor: 'var(--gold)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(188, 137, 97, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Submit Your Participation Here</span>
            <span>↗</span>
          </a>

          <button
            onClick={() => navigate('/')}
            className="airdrop-secondary-btn"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              color: 'var(--text-grey)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Open Trade on Brokex
          </button>
        </div>

        {/* 5 Key Metric Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: '8px',
          paddingTop: '18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          textAlign: 'center'
        }}>
          <div style={{ padding: '8px 4px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Prize Pool</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--gold)', marginTop: '2px' }}>$250 USDC</div>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', marginTop: '1px' }}>Paid on Base</div>
          </div>

          <div style={{ padding: '8px 4px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Total Winners</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)', marginTop: '2px' }}>25 Winners</div>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', marginTop: '1px' }}>20 Draw + 5 Ranked</div>
          </div>

          <div style={{ padding: '8px 4px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Min. Open Interest</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)', marginTop: '2px' }}>$250 OI</div>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', marginTop: '1px' }}>e.g. $25 × 10x</div>
          </div>

          <div style={{ padding: '8px 4px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Trade Duration</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--text-dark)', marginTop: '2px' }}>≥ 1 Hour</div>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', marginTop: '1px' }}>Per trade</div>
          </div>

          <div style={{
            gridColumn: isMobile ? '1 / -1' : 'auto',
            padding: '8px 4px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '6px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', textTransform: 'uppercase' }}>Participant Cap</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'Source Code Pro, monospace', color: 'var(--color-blue)', marginTop: '2px' }}>400 Wallets</div>
            <div style={{ fontSize: '9px', color: 'var(--text-grey)', marginTop: '1px' }}>First-come verified</div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. HOW TO QUALIFY */}
      {/* ========================================================= */}
      <div className="airdrop-card">
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--gold)' }}>01</span>
          <span>How to Qualify</span>
        </div>

        <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', color: 'var(--text-grey)' }}>
          To become a qualified participant, you must complete all 5 requirements below:
        </p>

        {/* Stacked 1-Column List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Step 1 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(188, 137, 97, 0.15)',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              flexShrink: 0,
              marginTop: '1px'
            }}>
              1
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                Open at least $250 in cumulative Open Interest (OI) on Brokex
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-grey)', marginTop: '4px', lineHeight: '1.4' }}>
                Leverage counts toward OI. For example, opening a position with <strong>$25 margin at 10× leverage creates $250 in OI</strong>.
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(188, 137, 97, 0.15)',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              flexShrink: 0,
              marginTop: '1px'
            }}>
              2
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                Keep every trade counted toward the $250 requirement open for at least one hour
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-grey)', marginTop: '4px', lineHeight: '1.4' }}>
                Only OI opened during the campaign and held for at least one full hour counts. Opening and immediately closing positions, or creating artificial activity solely to manipulate the campaign, does not qualify.
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(188, 137, 97, 0.15)',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              flexShrink: 0,
              marginTop: '1px'
            }}>
              3
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                Follow @brokexfi on X
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-grey)', marginTop: '4px', lineHeight: '1.4' }}>
                Follow <a href="https://x.com/brokexfi" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: '600' }}>@brokexfi</a> on X (Twitter).
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(188, 137, 97, 0.15)',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              flexShrink: 0,
              marginTop: '1px'
            }}>
              4
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                Publish one X post confirming your participation in the campaign
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-grey)', marginTop: '4px', lineHeight: '1.4' }}>
                Post publicly from your account mentioning your participation in the Brokex trading competition.
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(188, 137, 97, 0.15)',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              flexShrink: 0,
              marginTop: '1px'
            }}>
              5
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                Submit the required information through the official campaign form
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-grey)', marginTop: '4px', lineHeight: '1.4' }}>
                The form requires: your Base wallet address, your X username/profile link, the link to your participation post, and confirmation that you follow @brokexfi.
              </div>
              <div style={{ marginTop: '10px' }}>
                <a
                  href={GOOGLE_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--gold)',
                    fontWeight: '700',
                    fontSize: '12px',
                    textDecoration: 'underline'
                  }}
                >
                  Submit your participation here ↗
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. CAMPAIGN DURATION */}
      {/* ========================================================= */}
      <div className="airdrop-card">
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--gold)' }}>02</span>
          <span>Campaign Duration</span>
        </div>

        <div style={{ fontSize: '12.5px', color: 'var(--text-grey)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            • The campaign runs for an initial period of <strong style={{ color: 'var(--text-dark)' }}>10 days</strong>.
          </div>
          <div>
            • If the 400-wallet cap has not been reached, Brokex may extend the campaign by:
            <ul style={{ margin: '4px 0 4px 16px', padding: 0 }}>
              <li>One additional period of 5 days; and</li>
              <li>A final additional period of 5 days.</li>
            </ul>
          </div>
          <div>
            • The campaign can therefore run for up to <strong style={{ color: 'var(--text-dark)' }}>20 days in total</strong>. It may close earlier if 400 verified qualified wallets are reached.
          </div>
          <div>
            • The final snapshot time will be announced in the Brokex app and on X before rewards are distributed.
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. REWARDS BREAKDOWN */}
      {/* ========================================================= */}
      <div className="airdrop-card">
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--gold)' }}>03</span>
          <span>Rewards</span>
        </div>

        <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', color: 'var(--text-grey)' }}>
          All rewards are paid in <strong style={{ color: 'var(--gold)' }}>USDC on Base</strong> to the wallet submitted through the official campaign form.
        </p>

        {/* Subsection A: Random draw rewards */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.015)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '14px 16px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)' }}>Random Draw Rewards</span>
            <span style={{ fontSize: '12px', color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace', fontWeight: '700' }}>Up to $160 USDC</span>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-grey)' }}>
            One $8 random-draw reward unlocks for every 20 verified qualified traders (maximum 20 random-draw winners):
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-grey)' }}>• 20 qualified traders</span>
              <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>1 winner ($8)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-grey)' }}>• 100 qualified traders</span>
              <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>5 winners ($40 total)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-grey)' }}>• 200 qualified traders</span>
              <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>10 winners ($80 total)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-grey)' }}>• 300 qualified traders</span>
              <span style={{ color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>15 winners ($120 total)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-grey)' }}>• 400 qualified traders</span>
              <span style={{ color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace', fontWeight: '700' }}>20 winners ($160 total)</span>
            </div>
          </div>
        </div>

        {/* Subsection B: Performance rewards */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.015)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)' }}>Performance Rewards</span>
            <span style={{ fontSize: '12px', color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace', fontWeight: '700' }}>$90 USDC (5 Winners)</span>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-grey)' }}>
            Performance rewards unlock as the campaign grows:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ padding: '6px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>At 200 qualified traders:</span>
                <span style={{ color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>2 × $18 each ($36 total)</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-grey)', marginTop: '2px' }}>
                2 highest-volume traders receive $18 each.
              </div>
            </div>

            <div style={{ padding: '6px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>At 300 qualified traders:</span>
                <span style={{ color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>2 × $18 each ($36 total)</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-grey)', marginTop: '2px' }}>
                2 additional traders with the best net realised PnL relative to margin used receive $18 each.
              </div>
            </div>

            <div style={{ padding: '6px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>At 400 qualified traders:</span>
                <span style={{ color: 'var(--gold)', fontFamily: 'Source Code Pro, monospace', fontWeight: '600' }}>1 × $18 ($18 total)</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-grey)', marginTop: '2px' }}>
                1 additional trader with the best net realised PnL relative to margin used receives $18.
              </div>
            </div>
          </div>

          {/* Performance Ranking Rules */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '11.5px', color: 'var(--text-grey)', lineHeight: '1.5' }}>
            <strong style={{ color: 'var(--text-dark)' }}>For performance rankings:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li>Only eligible trades held for at least one hour count.</li>
              <li>Volume is measured using cumulative OI at opening only.</li>
              <li>PnL rankings use realised PnL only.</li>
              <li>Commissions, spread and borrowing fees are included in net realised PnL.</li>
              <li>Open positions at the final snapshot do not count toward PnL rankings.</li>
              <li>Liquidated positions count as realised losses.</li>
            </ul>
          </div>
        </div>

        {/* 1 Reward per Wallet Rule */}
        <div style={{ marginTop: '14px', padding: '8px 12px', background: 'rgba(188, 137, 97, 0.06)', border: '1px solid rgba(188, 137, 97, 0.25)', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-grey)' }}>
          <strong style={{ color: 'var(--gold)' }}>Notice:</strong> One wallet may receive only one campaign reward. If a wallet qualifies for more than one reward category, Brokex may reassign or redraw the additional reward to ensure more participants can win.
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. VERIFICATION AND ANTI-ABUSE RULES */}
      {/* ========================================================= */}
      <div className="airdrop-card">
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--gold)' }}>04</span>
          <span>Verification and Anti-Abuse Rules</span>
        </div>

        <div style={{ fontSize: '12.5px', color: 'var(--text-grey)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            Each participant may use only <strong style={{ color: 'var(--text-dark)' }}>one wallet</strong> and <strong style={{ color: 'var(--text-dark)' }}>one X account</strong>.
          </div>
          <div>
            Brokex reserves the right to reject or disqualify any participant involved in, or reasonably suspected of, the following:
            <ul style={{ margin: '4px 0 4px 16px', padding: 0 }}>
              <li>Multiple wallets controlled by the same person</li>
              <li>Recycled or coordinated wallets</li>
              <li>Fake, inactive or duplicated X accounts</li>
              <li>Wash trading, self-trading or artificial volume</li>
              <li>Opposing or coordinated trades designed to manipulate rankings</li>
              <li>Misleading, incomplete or false form submissions</li>
              <li>Any activity intended to abuse the rewards program</li>
            </ul>
          </div>
          <div>
            Brokex performs the final eligibility review and finalises the list of verified qualified wallets before rewards are selected and distributed.
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. DISTRIBUTION */}
      {/* ========================================================= */}
      <div className="airdrop-card">
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--gold)' }}>05</span>
          <span>Distribution</span>
        </div>

        <div style={{ fontSize: '12.5px', color: 'var(--text-grey)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            • Random draw winners and leaderboard winners will be announced after the final eligibility review.
          </div>
          <div>
            • Eligible rewards will be sent in <strong>USDC on Base</strong> on the campaign closing day or, where operationally necessary, within 24 hours after the final results are announced.
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. IMPORTANT RISK NOTICE */}
      {/* ========================================================= */}
      <div className="airdrop-card" style={{ background: 'rgba(239, 68, 68, 0.03)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-red)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
          06. Important Risk Notice
        </div>

        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-grey)', lineHeight: '1.5' }}>
          Trading XAU/USD with leverage involves substantial risk. You may lose part or all of the margin used in a trade. Participation in this campaign is optional and should not be treated as investment, financial or trading advice.
        </p>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-grey)', lineHeight: '1.5' }}>
          The campaign is void where prohibited by applicable law. By participating, you confirm that you are legally allowed to use Brokex and agree to these rules.
        </p>
      </div>

      {/* Bottom CTA Card */}
      <div className="airdrop-card" style={{ textAlign: 'center', padding: '24px 20px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)' }}>
          Ready to join the competition?
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--text-grey)' }}>
          Open your trades on Brokex and register your participation today.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href={GOOGLE_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="airdrop-primary-btn"
            style={{
              backgroundColor: 'var(--gold)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(188, 137, 97, 0.3)'
            }}
          >
            Submit Form ↗
          </a>
          <button
            onClick={() => navigate('/')}
            className="airdrop-secondary-btn"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              color: 'var(--text-grey)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Start Trading Now
          </button>
        </div>
      </div>

    </div>
  );

  // Mobile rendering wrapped in MobileLayout with sticky bottom navigation tabs
  if (isMobile) {
    return (
      <MobileLayout disablePadding={true}>
        <style>{`
          .mobile-airdrop-scroll {
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

        {/* Scrollable Airdrop content */}
        <div className="mobile-airdrop-scroll">
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

          {/* Referral Tab Button */}
          <button 
            className="mobile-tab-item"
            onClick={() => navigate('/portfolio')}
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

  // Desktop rendering wrapped with Sidebar, without bottom Ticker, perfectly centered
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
        .airdrop-page-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .airdrop-page-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .airdrop-page-scroll::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
        .airdrop-page-scroll::-webkit-scrollbar-thumb:hover {
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
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Animated Golden ASCII Stars Background in empty space excluding sidebar */}
        <AsciiStarsBackground opacity={0.4} count={220} speed={0.7} />

        <div 
          className="airdrop-page-scroll"
          style={{ 
            flex: 1, 
            height: '100%',
            overflowY: 'auto',
            padding: '20px 20px 20px 20px',
            position: 'relative',
            zIndex: 1
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
