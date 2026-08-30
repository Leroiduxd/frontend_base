import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, AreaSeries } from 'lightweight-charts';
import { api } from '../services/api';
import { useMarketData } from '../context/MarketDataContext';
import useIsMobile from '../hooks/useIsMobile';

const TIMEFRAME_TO_RESOLUTION = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': '1440',
  '1w': '10080'
};

const getThemeConfig = (isLight) => ({
  layout: {
    background: { type: ColorType.Solid, color: 'transparent' },
    textColor: isLight ? '#475569' : '#888888',
    fontSize: 10,
    fontFamily: "'Source Code Pro', monospace",
  },
  grid: {
    vertLines: { color: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.03)' },
    horzLines: { color: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.03)' },
  },
  crosshair: {
    mode: 0,
    vertLine: { color: isLight ? '#b08d57' : '#c8a97e', width: 1, labelBackgroundColor: isLight ? '#b08d57' : '#c8a97e' },
    horzLine: { color: isLight ? '#b08d57' : '#c8a97e', width: 1, labelBackgroundColor: isLight ? '#b08d57' : '#c8a97e' },
  },
  rightPriceScale: {
    borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.05)',
  },
  timeScale: {
    borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.05)',
    timeVisible: true,
    secondsVisible: false,
  },
});

export default function Chart() {
  const { goldPrice, network } = useMarketData();
  const chartContainerRef = useRef(null);
  const chartWrapperRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const seriesRef = useRef(null);
  const lastCandleRef = useRef(null);

  const allCandlesRef = useRef([]);
  const isFetchingOlderRef = useRef(false);
  const hasMoreHistoryRef = useRef(true);

  const isMobile = useIsMobile();
  const [activeTimeframe, setActiveTimeframe] = useState('15m');
  const [isCandleType, setIsCandleType] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  // Keep fullscreen state in sync with native browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(Boolean(fsElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // 1. Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const isLight = document.body.classList.contains('light-mode');
      const themeConfig = getThemeConfig(isLight);

      const chart = createChart(chartContainerRef.current, {
        ...themeConfig,
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });

      setChartInstance(chart);

      // Listen to theme change (light-mode toggle on body)
      const themeObserver = new MutationObserver(() => {
        const currentIsLight = document.body.classList.contains('light-mode');
        chart.applyOptions(getThemeConfig(currentIsLight));
      });
      themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

      const resizeObserver = new ResizeObserver(entries => {
        if (entries[0] && chart) {
          const { width, height } = entries[0].contentRect;
          chart.applyOptions({ width, height });
        }
      });

      resizeObserver.observe(chartContainerRef.current);

      return () => {
        themeObserver.disconnect();
        resizeObserver.disconnect();
        chart.remove();
      };
    } catch (err) {
      console.error("Chart init error:", err);
      setError(err.message);
    }
  }, []);

  // 2. Fetch Initial Candles on Timeframe / Network / Type Change
  useEffect(() => {
    if (!chartInstance) return;

    let isMounted = true;
    const resolution = TIMEFRAME_TO_RESOLUTION[activeTimeframe] || '15';
    hasMoreHistoryRef.current = true;
    isFetchingOlderRef.current = false;
    allCandlesRef.current = [];

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getChartHistory({
          resolution,
          limit: 200,
          network
        });

        if (!isMounted) return;

        if (seriesRef.current) {
          chartInstance.removeSeries(seriesRef.current);
        }

        let series;
        const upColor = getComputedStyle(document.documentElement).getPropertyValue('--color-blue').trim() || '#3b82f6';
        const downColor = getComputedStyle(document.documentElement).getPropertyValue('--color-red').trim() || '#ef4444';

        if (isCandleType) {
          series = chartInstance.addSeries(CandlestickSeries, {
            upColor,
            downColor,
            borderVisible: false,
            wickUpColor: upColor,
            wickDownColor: downColor,
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

        if (res.candles && res.candles.length > 0) {
          const sorted = [...res.candles].sort((a, b) => a.time - b.time);
          const uniqueCandles = [];
          const seen = new Set();
          for (const c of sorted) {
            if (!seen.has(c.time)) {
              seen.add(c.time);
              uniqueCandles.push(c);
            }
          }

          allCandlesRef.current = uniqueCandles;

          if (isCandleType) {
            series.setData(uniqueCandles);
          } else {
            series.setData(uniqueCandles.map(c => ({ time: c.time, value: c.close })));
          }

          const last = uniqueCandles[uniqueCandles.length - 1];
          lastCandleRef.current = { ...last };
          chartInstance.timeScale().fitContent();
        }
      } catch (err) {
        console.error("Failed to load chart candles:", err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [chartInstance, activeTimeframe, isCandleType, network]);

  // Dynamically update candle colors when theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      if (!chartInstance || !seriesRef.current) return;
      const upColor = getComputedStyle(document.documentElement).getPropertyValue('--color-blue').trim() || '#3b82f6';
      const downColor = getComputedStyle(document.documentElement).getPropertyValue('--color-red').trim() || '#ef4444';
      if (isCandleType) {
        seriesRef.current.applyOptions({
          upColor,
          downColor,
          wickUpColor: upColor,
          wickDownColor: downColor,
        });
      }
    };

    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, [chartInstance, isCandleType]);

  // 3. Infinite Scroll Backwards: Detect Scroll to Left and Load Older Candles
  useEffect(() => {
    if (!chartInstance) return;

    const resolution = TIMEFRAME_TO_RESOLUTION[activeTimeframe] || '15';
    let isSubscribed = true;

    const handleLogicalRangeChange = async (logicalRange) => {
      if (!logicalRange || !hasMoreHistoryRef.current || isFetchingOlderRef.current) return;

      // When the user scrolls close to the leftmost visible bars (logicalRange.from < 25)
      if (logicalRange.from < 25 && allCandlesRef.current.length > 0) {
        isFetchingOlderRef.current = true;
        const oldestTime = allCandlesRef.current[0].time;

        try {
          const olderData = await api.getChartHistory({
            resolution,
            limit: 200,
            to: oldestTime - 1,
            network
          });

          if (!isSubscribed) return;

          if (olderData && Array.isArray(olderData.candles) && olderData.candles.length > 0) {
            const olderSorted = [...olderData.candles].sort((a, b) => a.time - b.time);
            
            // Deduplicate and prepend
            const seenTimes = new Set(allCandlesRef.current.map(c => c.time));
            const newOldCandles = olderSorted.filter(c => !seenTimes.has(c.time));

            if (newOldCandles.length > 0) {
              const currentRange = chartInstance.timeScale().getVisibleLogicalRange();
              const addedCount = newOldCandles.length;
              const combined = [...newOldCandles, ...allCandlesRef.current];
              allCandlesRef.current = combined;

              if (seriesRef.current) {
                if (isCandleType) {
                  seriesRef.current.setData(combined);
                } else {
                  seriesRef.current.setData(combined.map(c => ({ time: c.time, value: c.close })));
                }
              }

              // Preserve exact scroll position so user keeps smooth panning without jumping
              if (currentRange) {
                chartInstance.timeScale().setVisibleLogicalRange({
                  from: currentRange.from + addedCount,
                  to: currentRange.to + addedCount,
                });
              }
            } else {
              hasMoreHistoryRef.current = false;
            }
          } else {
            hasMoreHistoryRef.current = false;
          }
        } catch (e) {
          console.warn("Failed to load older candles:", e);
        } finally {
          if (isSubscribed) {
            isFetchingOlderRef.current = false;
          }
        }
      }
    };

    chartInstance.timeScale().subscribeVisibleLogicalRangeChange(handleLogicalRangeChange);

    return () => {
      isSubscribed = false;
      chartInstance.timeScale().unsubscribeVisibleLogicalRangeChange(handleLogicalRangeChange);
    };
  }, [chartInstance, activeTimeframe, isCandleType, network]);

  // 4. Live Price Updates (from Oracle) on the current candle
  useEffect(() => {
    if (!seriesRef.current || !lastCandleRef.current || !goldPrice) return;

    const currentCandle = lastCandleRef.current;
    const newPrice = Number(goldPrice);

    const updatedCandle = {
      ...currentCandle,
      high: Math.max(currentCandle.high, newPrice),
      low: Math.min(currentCandle.low, newPrice),
      close: newPrice,
    };

    lastCandleRef.current = updatedCandle;

    try {
      if (isCandleType) {
        seriesRef.current.update(updatedCandle);
      } else {
        seriesRef.current.update({
          time: updatedCandle.time,
          value: newPrice,
        });
      }
    } catch (e) {
      // Ignore update timing race conditions
    }
  }, [goldPrice, isCandleType]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (chartWrapperRef.current) {
        const req =
          chartWrapperRef.current.requestFullscreen ||
          chartWrapperRef.current.webkitRequestFullscreen ||
          chartWrapperRef.current.mozRequestFullScreen ||
          chartWrapperRef.current.msRequestFullscreen;

        if (req) {
          try {
            const res = req.call(chartWrapperRef.current);
            if (res && typeof res.catch === 'function') {
              res.catch(() => {});
            }
          } catch (err) {
            // Native fullscreen not supported (e.g. iOS Safari), fallback to CSS fullscreen
          }
        }
      }
    } else {
      setIsFullscreen(false);
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      if (fsElement) {
        const exit =
          document.exitFullscreen ||
          document.webkitExitFullscreen ||
          document.mozCancelFullScreen ||
          document.msExitFullscreen;

        if (exit) {
          try {
            const res = exit.call(document);
            if (res && typeof res.catch === 'function') {
              res.catch(() => {});
            }
          } catch (err) {}
        }
      }
    }
  };

  return (
    <div
      ref={chartWrapperRef}
      className="chart panel"
      style={isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-dark)',
        padding: '8px'
      } : {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%'
      }}
    >
      <div className="chart-toolbar" style={{ display: 'flex', padding: '6px 8px', gap: '8px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              style={{
                background: activeTimeframe === tf ? 'rgba(200, 169, 126, 0.1)' : 'transparent',
                color: activeTimeframe === tf ? 'var(--gold)' : 'var(--text-grey)',
                border: 'none',
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: activeTimeframe === tf ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tf}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '12px', background: 'var(--border-color)', margin: '0 4px' }} />

        {/* Type Toggle */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsCandleType(true)}
            className={`chart-action-btn ${isCandleType ? 'active' : ''}`}
            title="Chandelier Japonais"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" id="Trading-Pattern-Up--Streamline-Ultimate">
              <path fill="currentColor" fillRule="evenodd" d="M3.25001 1c0 -0.414214 -0.33579 -0.75 -0.75 -0.75 -0.41422 0 -0.75 0.335786 -0.75 0.75v3.64999c-0.41363 0 -0.797166 0.14006 -1.078556 0.42145 -0.281389 0.28139 -0.421446 0.66493 -0.421446 1.07855v3c0 0.41363 0.140057 0.79717 0.421446 1.07851 0.28139 0.2814 0.664926 0.4215 1.078556 0.4215v2.5c0 0.4142 0.33578 0.75 0.75 0.75 0.41421 0 0.75 -0.3358 0.75 -0.75v-2.5c0.41362 0 0.79716 -0.1401 1.07855 -0.4215 0.28139 -0.28134 0.42145 -0.66488 0.42145 -1.07851v-3c0 -0.41362 -0.14006 -0.79716 -0.42145 -1.07855 -0.28139 -0.28139 -0.66493 -0.42145 -1.07855 -0.42145V1Zm4 18.75c-0.41363 0 -0.79717 -0.1401 -1.07856 -0.4215 -0.28139 -0.2813 -0.42144 -0.6649 -0.42144 -1.0785v-4.5c0 -0.4136 0.14005 -0.7972 0.42144 -1.0786s0.66493 -0.4214 1.07856 -0.4214V9.74999c0 -0.41421 0.33578 -0.75 0.75 -0.75 0.41421 0 0.75 0.33579 0.75 0.75V12.25c0.41362 0 0.79716 0.14 1.07855 0.4214 0.28144 0.2814 0.42144 0.665 0.42144 1.0786v4.5c0 0.4136 -0.14 0.7972 -0.42144 1.0785 -0.28139 0.2814 -0.66493 0.4215 -1.07855 0.4215V23c0 0.4142 -0.33579 0.75 -0.75 0.75 -0.41422 0 -0.75 -0.3358 -0.75 -0.75v-3.25Zm5.72149 -7.9786c0.2813 -0.2813 0.6649 -0.4214 1.0785 -0.4214h1.5c0.4136 0 0.7972 0.1401 1.0786 0.4214 0.2814 0.2814 0.4214 0.665 0.4214 1.0786v4c0 0.4136 -0.14 0.7972 -0.4214 1.0786 -0.2814 0.2813 -0.665 0.4214 -1.0786 0.4214v3.5c0 0.4142 -0.3358 0.75 -0.75 0.75s-0.75 -0.3358 -0.75 -0.75v-3.5c-0.4136 0 -0.7972 -0.1401 -1.0785 -0.4214 -0.2814 -0.2814 -0.4215 -0.665 -0.4215 -1.0786v-4c0 -0.4136 0.1401 -0.7972 0.4215 -1.0786Zm7.8547 -9.00155c-0.1425 -0.17099 -0.3536 -0.26986 -0.5762 -0.26986 -0.2226 0 -0.4337 0.09887 -0.5762 0.26986l-3 3.60001c-0.1863 0.22356 -0.2264 0.53472 -0.103 0.79826 0.1234 0.26353 0.3882 0.43188 0.6792 0.43188h2v11.25c0 0.5523 0.4477 1 1 1s1 -0.4477 1 -1V7.6h2c0.291 0 0.5557 -0.16835 0.6792 -0.43188 0.1234 -0.26354 0.0833 -0.5747 -0.103 -0.79826l-3 -3.60001Z" clipRule="evenodd" strokeWidth="1" />
            </svg>
          </button>
          <button
            onClick={() => setIsCandleType(false)}
            className={`chart-action-btn ${!isCandleType ? 'active' : ''}`}
            title="Graphique en Ligne"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path fill="currentColor" fillRule="evenodd" d="M1.25 18a.75.75 0 0 1 .75-.75h20a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1-.75-.75Zm3.47-5.53a.75.75 0 0 1 0-1.06l5.5-5.5a.75.75 0 0 1 1.06 0l4.5 4.5 4.97-4.97a.75.75 0 1 1 1.06 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-4.5-4.5-4.97 4.97a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
            </svg>
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
            padding: '4px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s'
          }}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          )}
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={chartContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        {error && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', zIndex: 10 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
