import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function MarketMetrics() {
  const goldAccent = '#BC8961';
  const goldAccentLight = 'rgba(188, 137, 97, 0.1)';
  const blueColor = '#3b82f6';
  const redColor = '#ef4444';

  // Historical volume distribution
  const volumeByAsset = {
    labels: ['XAU/USD', 'BTC/USDC', 'ETH/USDC', 'SOL/USDC'],
    values: [185800, 123868, 61934, 41290],
    percentages: ['45%', '30%', '15%', '10%']
  };

  const chartData = {
    labels: volumeByAsset.labels,
    datasets: [
      {
        data: volumeByAsset.values,
        backgroundColor: [
          '#BC8961', // Gold
          '#3b82f6', // Blue
          'rgba(188, 137, 97, 0.5)', // Muted Gold
          'rgba(59, 130, 246, 0.4)', // Muted Blue
        ],
        borderWidth: 1,
        borderColor: '#0f0f0f',
        hoverOffset: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Custom legendary grid below for premium look
      },
      tooltip: {
        backgroundColor: '#0a0a0a',
        titleColor: '#fff',
        titleFont: { family: "'Source Code Pro', monospace", size: 10 },
        bodyColor: goldAccent,
        bodyFont: { family: "'Source Code Pro', monospace", size: 10, weight: 'bold' },
        borderColor: goldAccent,
        borderWidth: 1,
        padding: 8,
        displayColors: true,
        boxWidth: 8,
        callbacks: {
          label: (context) => {
            const val = context.raw;
            return ` Volume: $${new Intl.NumberFormat('en-US').format(val)}`;
          }
        }
      },
    },
    cutout: '76%',
  };

  return (
    <div className="panel" style={{ 
      width: '320px', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'relative', 
      overflow: 'hidden',
      flexShrink: 0
    }}>
      {/* Subtle grid pattern background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.01) 1px, transparent 0)',
        backgroundSize: '16px 16px',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '8px 12px', 
        borderBottom: '1px solid var(--border-color)',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.12em', color: goldAccent, fontFamily: 'Source Code Pro' }}>
            [ ACCOUNT METRICS ]
          </span>
        </div>
        <span style={{ fontSize: '8px', color: 'var(--text-grey)', fontFamily: 'Source Code Pro', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>
          LIVE FEED
        </span>
      </div>

      {/* Scrollable Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }} className="custom-scrollbar">
        
        {/* Camembert (Doughnut) Chart Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.05em', color: 'var(--text-grey)', textTransform: 'uppercase', alignSelf: 'flex-start' }}>
            Volume Distribution by Asset
          </span>
          
          <div style={{ position: 'relative', width: '170px', height: '170px' }}>
            <Doughnut data={chartData} options={chartOptions} />
            {/* Center Text inside Donut */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vol Total</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', fontFamily: 'Source Code Pro' }}>$412.8k</span>
            </div>
          </div>

          {/* Custom Legendary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginTop: '4px' }}>
            {volumeByAsset.labels.map((lbl, idx) => {
              const colors = ['#BC8961', '#3b82f6', 'rgba(188, 137, 97, 0.7)', 'rgba(59, 130, 246, 0.6)'];
              return (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '2px', backgroundColor: colors[idx] }} />
                    <span style={{ fontSize: '9px', fontFamily: 'Source Code Pro', color: 'var(--text-dark)', fontWeight: '500' }}>{lbl.split('/')[0]}</span>
                  </div>
                  <span style={{ fontSize: '9px', fontFamily: 'Source Code Pro', color: 'var(--text-grey)', fontWeight: 'bold' }}>{volumeByAsset.percentages[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.05), transparent)' }} />

        {/* Global Financial Metrics Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.05em', color: 'var(--text-grey)', textTransform: 'uppercase' }}>
            Performance overview
          </span>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            
            {/* PnL Total */}
            <div style={{ padding: '8px 10px', background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '500' }}>ALL-TIME PNL</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: blueColor, fontFamily: 'Source Code Pro', marginTop: '2px' }}>+$3,479.23</span>
            </div>

            {/* Total Volume */}
            <div style={{ padding: '8px 10px', background: 'rgba(188, 137, 97, 0.03)', border: '1px solid rgba(188, 137, 97, 0.1)', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '500' }}>TOTAL VOLUME</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: goldAccent, fontFamily: 'Source Code Pro', marginTop: '2px' }}>$412,892.00</span>
            </div>

            {/* Win/Loss Ratio */}
            <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: '500' }}>WIN/LOSS RATIO</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', fontFamily: 'Source Code Pro' }}>1.69</span>
                <span style={{ fontSize: '8px', color: 'var(--text-grey)' }}>(22W - 13L)</span>
              </div>
            </div>

            {/* Total Fees */}
            <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: '500' }}>TOTAL FEES PAID</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: redColor, fontFamily: 'Source Code Pro', marginTop: '2px' }}>$247.74</span>
            </div>

            {/* Total Orders */}
            <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: '500' }}>ALL-TIME ORDERS</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', fontFamily: 'Source Code Pro', marginTop: '2px' }}>35</span>
            </div>

            {/* Win Rate */}
            <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '8px', color: 'var(--text-grey)', textTransform: 'uppercase', fontWeight: '500' }}>WIN RATE</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: blueColor, fontFamily: 'Source Code Pro', marginTop: '2px' }}>62.8%</span>
            </div>

          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.05), transparent)' }} />

        {/* Trade Lifecycle & Triggers Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.05em', color: 'var(--text-grey)', textTransform: 'uppercase' }}>
            Lifecycle & Triggers
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* Active Open Positions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dark)' }}>Open Positions</span>
              <span style={{ fontSize: '9px', fontFamily: 'Source Code Pro', fontWeight: 'bold', color: blueColor, background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                2 Active
              </span>
            </div>

            {/* TP Triggered */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dark)' }}>Take Profits Triggered</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={blueColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
                <span style={{ fontSize: '9px', fontFamily: 'Source Code Pro', fontWeight: 'bold', color: blueColor }}>14 times</span>
              </div>
            </div>

            {/* SL Triggered */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dark)' }}>Stop Losses Triggered</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={redColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                <span style={{ fontSize: '9px', fontFamily: 'Source Code Pro', fontWeight: 'bold', color: redColor }}>9 times</span>
              </div>
            </div>

            {/* Liquidations */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dark)' }}>Positions Liquidated</span>
              <span style={{ fontSize: '9px', fontFamily: 'Source Code Pro', fontWeight: 'bold', color: '#888', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                0 Clean
              </span>
            </div>

          </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
