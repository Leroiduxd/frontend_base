import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, AreaSeries } from 'lightweight-charts';

export default function Chart() {
  const chartContainerRef = useRef(null);
  const chartWrapperRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const seriesRef = useRef(null);
  const lastPriceRef = useRef(2300);
  const lastTimeRef = useRef(Math.floor(Date.now() / 1000));

  const [activeTimeframe, setActiveTimeframe] = useState('15m');
  const [isCandleType, setIsCandleType] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#888',
          fontSize: 10,
          fontFamily: "'Source Code Pro', monospace",
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.02)' },
          horzLines: { color: 'rgba(255,255,255,0.02)' },
        },
        crosshair: {
          mode: 0,
          vertLine: { color: '#c8a97e', width: 1, labelBackgroundColor: '#c8a97e' },
          horzLine: { color: '#c8a97e', width: 1, labelBackgroundColor: '#c8a97e' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.05)',
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.05)',
          timeVisible: true,
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });

      setChartInstance(chart);

      const resizeObserver = new ResizeObserver(entries => {
        if (entries[0] && chart) {
          const { width, height } = entries[0].contentRect;
          chart.applyOptions({ width, height });
        }
      });

      resizeObserver.observe(chartContainerRef.current);

      return () => {
        resizeObserver.disconnect();
        chart.remove();
      };
    } catch (err) {
      console.error("Chart init error:", err);
      setError(err.message);
    }
  }, []);

  // Update Series and Data
  useEffect(() => {
    if (!chartInstance) return;

    try {
      if (seriesRef.current) {
        chartInstance.removeSeries(seriesRef.current);
      }

      let series;
      if (isCandleType) {
        series = chartInstance.addSeries(CandlestickSeries, {
          upColor: '#3b82f6',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#3b82f6',
          wickDownColor: '#ef4444',
        });
      } else {
        series = chartInstance.addSeries(AreaSeries, {
          lineColor: '#c8a97e',
          topColor: 'rgba(200, 169, 126, 0.2)',
          bottomColor: 'rgba(200, 169, 126, 0)',
          lineWidth: 2,
        });
      }
      seriesRef.current = series;

      // Initial historical data
      const data = [];
      let price = 2300;
      const interval = 60; 
      const now = Math.floor(Date.now() / 1000);
      
      for (let i = 0; i < 200; i++) {
        const time = now - (200 - i) * interval;
        const open = price;
        const close = price + (Math.random() - 0.5) * 10;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        
        if (isCandleType) {
          data.push({ time, open, high, low, close });
        } else {
          data.push({ time, value: close });
        }
        price = close;
      }

      series.setData(data);
      lastPriceRef.current = price;
      lastTimeRef.current = now;
      chartInstance.timeScale().fitContent();
    } catch (err) {
      console.error("Series update error:", err);
      setError(err.message);
    }
  }, [chartInstance, isCandleType]);

  // Live updates
  useEffect(() => {
    if (!chartInstance || !seriesRef.current) return;

    const timer = setInterval(() => {
      if (!seriesRef.current) return;

      const change = (Math.random() - 0.5) * 4;
      const newPrice = lastPriceRef.current + change;
      
      if (isCandleType) {
        seriesRef.current.update({
          time: lastTimeRef.current,
          open: lastPriceRef.current,
          high: Math.max(lastPriceRef.current, newPrice) + 0.5,
          low: Math.min(lastPriceRef.current, newPrice) - 0.5,
          close: newPrice
        });
      } else {
        seriesRef.current.update({
          time: lastTimeRef.current,
          value: newPrice
        });
      }
      lastPriceRef.current = newPrice;
    }, 1000);

    return () => clearInterval(timer);
  }, [chartInstance, isCandleType]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={chartWrapperRef} className="chart panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div className="chart-toolbar" style={{ display: 'flex', padding: '10px', gap: '10px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          {timeframes.map(tf => (
            <button 
              key={tf} 
              onClick={() => setActiveTimeframe(tf)}
              style={{ 
                background: activeTimeframe === tf ? 'rgba(200, 169, 126, 0.1)' : 'transparent',
                color: activeTimeframe === tf ? 'var(--gold)' : 'var(--text-grey)',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
        
        <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 5px' }} />
        
        {/* Type Toggle */}
        <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '6px' }}>
          <button 
            onClick={() => setIsCandleType(true)}
            style={{ 
              background: isCandleType ? 'var(--gold)' : 'transparent',
              color: isCandleType ? '#000' : 'var(--text-grey)',
              border: 'none',
              padding: '4px 6px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Candlesticks"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2h2v3h-2V2zm5 4h2v14h-2V6zM6 8h2v10H6V8zm5 11h2v3h-2v-3z" /></svg>
          </button>
          <button 
            onClick={() => setIsCandleType(false)}
            style={{ 
              background: !isCandleType ? 'var(--gold)' : 'transparent',
              color: !isCandleType ? '#000' : 'var(--text-grey)',
              border: 'none',
              padding: '4px 6px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Line Chart"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 6-6 4 4 8-8"/></svg>
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Fullscreen Button */}
        <button 
          onClick={toggleFullscreen}
          style={{ 
            background: 'transparent',
            border: 'none',
            color: 'var(--text-grey)',
            padding: '6px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s'
          }}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          )}
        </button>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        {error ? (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
            {error}
          </div>
        ) : (
          <div ref={chartContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        )}
      </div>
    </div>
  );
}
