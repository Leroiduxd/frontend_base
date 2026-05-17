import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PortfolioMetrics() {
  const [activeMainTab, setActiveMainTab] = useState('pnl'); // 'pnl' | 'volume' | 'gainloss'
  const [isNet, setIsNet] = useState(false);
  const [activeTimeframe, setActiveTimeframe] = useState('ALL'); // '7D' | '30D' | '1Y' | 'ALL'

  const goldAccent = '#BC8961';
  const goldAccentLight = 'rgba(188, 137, 97, 0.15)';

  const topStats = {
    pnl: { label: 'Realized PNL', value: '$1,799.63', sub: '+12.4% vs last month' },
    volume: { label: 'Total Volume', value: '$203,444.31', sub: '35 trades executed' },
    gainloss: { label: 'Gain & Loss', value: '22 vs 13', sub: '62.8% Win Rate' }
  };

  // Mock datasets for chart.js
  const chartLabels = {
    '7D': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    '30D': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    '1Y': ['Q1', 'Q2', 'Q3', 'Q4'],
    'ALL': ['2023', 'Mid 2024', 'End 2025', 'Now']
  };

  const pnlData = {
    '7D': { gross: [142, 312, 280, 720, 610, 940, 1799.63], net: [132, 290, 255, 680, 560, 880, 1699.63] },
    '30D': { gross: [240.50, 490.20, 1120.40, 1799.63], net: [220.50, 440.20, 1010.40, 1699.63] },
    '1Y': { gross: [310.20, 842.10, 1340.50, 1799.63], net: [280.20, 792.10, 1240.50, 1699.63] },
    'ALL': { gross: [0, 420, 1280.40, 1799.63], net: [0, 380, 1190.40, 1699.63] }
  };

  const volumeData = {
    '7D': [15000, 22000, 18000, 35000, 28000, 42000, 60000],
    '30D': [45000, 58000, 72000, 95000],
    '1Y': [120000, 185000, 240000, 310000],
    'ALL': [25000, 85000, 145000, 203444.31]
  };

  const gainLossData = {
    '7D': { wins: [4, 8, 11, 15, 17, 20, 22], losses: [1, 3, 5, 7, 9, 11, 13] },
    '30D': { wins: [5, 12, 18, 22], losses: [2, 6, 9, 13] },
    '1Y': { wins: [6, 14, 19, 22], losses: [3, 7, 10, 13] },
    'ALL': { wins: [0, 10, 18, 22], losses: [0, 5, 10, 13] }
  };

  const currentLabels = chartLabels[activeTimeframe];

  // Configure Chart.js options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#0a0a0a',
        titleColor: '#fff',
        titleFont: {
          family: "'Source Code Pro', monospace",
          size: 10
        },
        bodyColor: goldAccent,
        bodyFont: {
          family: "'Source Code Pro', monospace",
          size: 11,
          weight: 'bold'
        },
        borderColor: goldAccent,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (activeMainTab === 'gainloss') {
                label += context.parsed.y + ' trades';
              } else {
                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#888888',
          font: {
            family: "'Source Code Pro', monospace",
            size: 9
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.02)',
          drawTicks: false
        },
        ticks: {
          color: '#888888',
          font: {
            family: "'Source Code Pro', monospace",
            size: 9
          },
          callback: (value) => {
            if (activeMainTab === 'gainloss') return value;
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
            return `$${value}`;
          }
        }
      }
    }
  };

  // Generate chart data based on active tab
  const getChartData = () => {
    if (activeMainTab === 'pnl') {
      const grossSet = pnlData[activeTimeframe].gross;
      const netSet = pnlData[activeTimeframe].net;

      const datasets = [
        {
          label: 'Gross Profit',
          data: grossSet,
          borderColor: goldAccent,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(188, 137, 97, 0.25)');
            gradient.addColorStop(1, 'rgba(188, 137, 97, 0.0)');
            return gradient;
          },
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: goldAccent,
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          pointRadius: 4
        }
      ];

      if (isNet) {
        datasets.push({
          label: 'Net Profit',
          data: netSet,
          borderColor: '#3b82f6',
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
            return gradient;
          },
          borderWidth: 2,
          borderDash: [5, 5],
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          pointRadius: 4
        });
      }

      return { labels: currentLabels, datasets };
    } else if (activeMainTab === 'volume') {
      const volSet = volumeData[activeTimeframe];
      return {
        labels: currentLabels,
        datasets: [
          {
            label: 'Volume',
            data: volSet,
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return null;
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(188, 137, 97, 0.8)');
              gradient.addColorStop(1, 'rgba(188, 137, 97, 0.1)');
              return gradient;
            },
            borderRadius: 6,
            borderWidth: 0,
            barThickness: 34
          }
        ]
      };
    } else {
      // Gain & Loss
      const wins = gainLossData[activeTimeframe].wins;
      const losses = gainLossData[activeTimeframe].losses;
      return {
        labels: currentLabels,
        datasets: [
          {
            label: 'Wins',
            data: wins,
            borderColor: '#10b981',
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return null;
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
              gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
              return gradient;
            },
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#10b981',
            pointRadius: 3
          },
          {
            label: 'Losses',
            data: losses,
            borderColor: '#ef4444',
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return null;
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(239, 68, 68, 0.12)');
              gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
              return gradient;
            },
            borderWidth: 2,
            borderDash: [4, 4],
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#ef4444',
            pointRadius: 3
          }
        ]
      };
    }
  };

  return (
    <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Tab Selector Headers */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)' }}>
        {Object.keys(topStats).map((tab) => {
          const active = activeMainTab === tab;
          return (
            <div 
              key={tab} 
              onClick={() => setActiveMainTab(tab)}
              style={{
                flex: 1,
                padding: '20px 24px',
                cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.01)' : 'transparent',
                borderBottom: `2px solid ${active ? goldAccent : 'transparent'}`,
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--text-grey)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                {topStats[tab].label}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ 
                  fontSize: '22px', 
                  fontWeight: 'bold', 
                  color: active ? goldAccent : 'var(--text-dark)', 
                  fontFamily: 'Source Code Pro',
                  transition: 'color 0.3s'
                }}>
                  {topStats[tab].value}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)', transition: 'color 0.3s' }}>
                {topStats[tab].sub}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart Controls & Canvas Area */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Toggle switch */}
          <div 
            onClick={() => setIsNet(!isNet)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ 
              width: '34px', 
              height: '18px', 
              borderRadius: '10px', 
              backgroundColor: isNet ? goldAccent : 'rgba(255,255,255,0.1)', 
              position: 'relative',
              transition: 'background-color 0.2s',
              border: '1px solid var(--panel-border)'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: isNet ? '#fff' : 'var(--text-grey)',
                position: 'absolute',
                top: '2px',
                left: isNet ? '18px' : '3px',
                transition: 'left 0.2s, background-color 0.2s'
              }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Compare Gross vs. Net
            </span>
          </div>

          {/* Timeframe Selectors */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '3px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
            {['7D', '30D', '1Y', 'ALL'].map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                style={{
                  padding: '4px 10px',
                  fontSize: '10px',
                  fontFamily: 'Source Code Pro',
                  fontWeight: 'bold',
                  background: activeTimeframe === tf ? goldAccentLight : 'transparent',
                  border: `1px solid ${activeTimeframe === tf ? goldAccent : 'transparent'}`,
                  borderRadius: '4px',
                  color: activeTimeframe === tf ? goldAccent : 'var(--text-grey)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Glowing ChartJS Plot Area */}
        <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '180px' }}>
          {activeMainTab === 'volume' ? (
            <Bar data={getChartData()} options={options} />
          ) : (
            <Line data={getChartData()} options={options} />
          )}
        </div>
      </div>
    </div>
  );
}
