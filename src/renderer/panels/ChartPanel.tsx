import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineStyle,
} from 'lightweight-charts';

interface ChartPanelProps {
  symbol: string;
  timeframe: string;
  analysisResult?: any;
}

type DrawingTool = 'cursor' | 'hline' | 'trendline' | 'fib' | 'text';

export const ChartPanel: React.FC<ChartPanelProps> = ({ symbol, timeframe, analysisResult }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [allBars, setAllBars] = useState<CandlestickData[]>([]);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build chart
  useEffect(() => {
    // Run cleanup from previous render
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!containerRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setAllBars([]);
    setReplayMode(false);
    setReplayPlaying(false);

    // Destroy old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    }

    const container = containerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#363a45', style: LineStyle.Dotted },
        horzLines: { color: '#363a45', style: LineStyle.Dotted },
      },
      crosshair: { mode: 1 },
      width: container.clientWidth,
      height: container.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#363a45',
      },
      rightPriceScale: { borderColor: '#363a45' },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });
    candleSeriesRef.current = candleSeries;

    const ema21Series = chart.addLineSeries({
      color: '#f7a600',
      lineWidth: 1,
      title: 'EMA21',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema50Series = chart.addLineSeries({
      color: '#2962ff',
      lineWidth: 1,
      title: 'EMA50',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const volSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    // Fetch data
    window.api.fetchMarketData(symbol, timeframe).then(result => {
      if (cancelled) return;

      if (!result.success || !result.data?.bars?.length) {
        setError(result.error ?? 'No data returned');
        setLoading(false);
        return;
      }

      const bars = result.data.bars;
      const chartData: CandlestickData[] = bars.map((bar: any) => ({
        time: Math.floor(bar.time / 1000) as any,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }));

      setAllBars(chartData);
      setReplayIndex(chartData.length);

      candleSeries.setData(chartData);
      ema21Series.setData(calcEMA(chartData, 21));
      ema50Series.setData(calcEMA(chartData, 50));

      const volData = bars.map((bar: any) => ({
        time: Math.floor(bar.time / 1000) as any,
        value: bar.volume ?? 0,
        color: bar.close >= bar.open ? '#26a69a44' : '#ef535044',
      }));
      volSeries.setData(volData);

      chart.timeScale().fitContent();
      setLoading(false);
    }).catch(err => {
      if (cancelled) return;
      setError(String(err));
      setLoading(false);
    });

    const handleResize = () => {
      if (container && chartRef.current) {
        chartRef.current.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    cleanupRef.current = () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [symbol, timeframe]);

  // Draw analysis price lines when result changes
  useEffect(() => {
    if (!analysisResult || !candleSeriesRef.current) return;
    const sig = analysisResult.primarySignal;
    if (!sig || sig.direction === 'NEUTRAL') return;

    const bullish = sig.direction === 'LONG';

    try {
      candleSeriesRef.current.createPriceLine({
        price: sig.target1,
        color: '#26a69a',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'T1',
      });
      if (sig.target2 && sig.target2 > 0) {
        candleSeriesRef.current.createPriceLine({
          price: sig.target2,
          color: '#26a69a',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'T2',
        });
      }
      candleSeriesRef.current.createPriceLine({
        price: sig.invalidation,
        color: '#ef5350',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'INV',
      });
      const entryMid = (sig.entryZone[0] + sig.entryZone[1]) / 2;
      candleSeriesRef.current.createPriceLine({
        price: entryMid,
        color: bullish ? '#26a69a' : '#ef5350',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'ENTRY',
      });
    } catch {
      // price lines may fail if chart was destroyed
    }
  }, [analysisResult]);

  // Replay
  const startReplay = useCallback(() => {
    if (allBars.length === 0 || !candleSeriesRef.current) return;
    setReplayMode(true);
    setReplayPlaying(false);
    const startIdx = Math.max(50, Math.floor(allBars.length * 0.4));
    setReplayIndex(startIdx);
    candleSeriesRef.current.setData(allBars.slice(0, startIdx));
    chartRef.current?.timeScale().fitContent();
  }, [allBars]);

  const stopReplay = useCallback(() => {
    if (replayTimer.current) clearInterval(replayTimer.current);
    setReplayMode(false);
    setReplayPlaying(false);
    if (candleSeriesRef.current && allBars.length > 0) {
      candleSeriesRef.current.setData(allBars);
      chartRef.current?.timeScale().fitContent();
    }
  }, [allBars]);

  const stepReplay = useCallback(() => {
    setReplayIndex(prev => {
      const next = Math.min(prev + 1, allBars.length);
      candleSeriesRef.current?.setData(allBars.slice(0, next));
      return next;
    });
  }, [allBars]);

  useEffect(() => {
    if (replayPlaying && replayMode) {
      replayTimer.current = setInterval(stepReplay, 250);
    } else {
      if (replayTimer.current) clearInterval(replayTimer.current);
    }
    return () => {
      if (replayTimer.current) clearInterval(replayTimer.current);
    };
  }, [replayPlaying, replayMode, stepReplay]);

  const tools: { id: DrawingTool; icon: string; label: string }[] = [
    { id: 'cursor', icon: '↖', label: 'Cursor' },
    { id: 'hline', icon: '─', label: 'H-Line' },
    { id: 'trendline', icon: '╱', label: 'Trend' },
    { id: 'fib', icon: 'φ', label: 'Fib' },
    { id: 'text', icon: 'T', label: 'Text' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-tv-bg overflow-hidden relative min-w-0">
      {/* Drawing toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-tv-border bg-tv-surface flex-shrink-0">
        {tools.map(tool => (
          <button
            key={tool.id}
            title={tool.label}
            onClick={() => setActiveTool(tool.id)}
            className={`w-7 h-7 text-xs rounded flex items-center justify-center transition-colors ${
              activeTool === tool.id
                ? 'bg-tv-accent text-white'
                : 'text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text'
            }`}
          >
            {tool.icon}
          </button>
        ))}

        <div className="w-px h-4 bg-tv-border mx-1" />

        {!replayMode ? (
          <button
            onClick={startReplay}
            disabled={allBars.length === 0}
            className="px-2 h-7 text-xs rounded text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text transition-colors disabled:opacity-40"
          >
            ⏪ Replay
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setReplayPlaying(p => !p)}
              className="px-2 h-7 text-xs rounded bg-tv-accent/20 text-tv-accent hover:bg-tv-accent/30 transition-colors"
            >
              {replayPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={stepReplay} className="px-2 h-7 text-xs rounded text-tv-text-secondary hover:bg-tv-surface2 transition-colors">
              ⏭
            </button>
            <span className="text-xs text-tv-text-secondary tabular-nums">
              {replayIndex}/{allBars.length}
            </span>
            <button onClick={stopReplay} className="px-2 h-7 text-xs rounded text-tv-red hover:bg-tv-red/10 transition-colors">
              ✕
            </button>
            <span className="text-xs text-tv-orange font-semibold animate-pulse ml-1">● REPLAY</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs text-tv-text-secondary">
          <span className="text-tv-orange">EMA<span className="text-yellow-400">21</span></span>
          <span className="text-tv-accent">EMA<span className="text-blue-400">50</span></span>
          <span className="text-tv-text-secondary opacity-60">Vol</span>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        style={{ cursor: activeTool === 'cursor' ? 'default' : 'crosshair' }}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 top-9 flex flex-col items-center justify-center bg-tv-bg/90 z-10">
          <div className="text-tv-text-secondary text-sm mb-2">Loading {symbol}...</div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-tv-accent rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-0 top-9 flex flex-col items-center justify-center bg-tv-bg/90 z-10">
          <div className="text-tv-red text-sm mb-1">⚠ Failed to load {symbol}</div>
          <div className="text-tv-text-secondary text-xs">{error}</div>
          <div className="text-tv-text-secondary text-xs mt-2">Using cached/mock data</div>
        </div>
      )}
    </div>
  );
};

function calcEMA(data: CandlestickData[], period: number): { time: any; value: number }[] {
  const k = 2 / (period + 1);
  const result: { time: any; value: number }[] = [];
  let ema = 0;
  let initialized = false;

  for (let i = 0; i < data.length; i++) {
    const close = data[i].close;
    if (!initialized) {
      ema = close;
      initialized = true;
    } else {
      ema = close * k + ema * (1 - k);
    }
    if (i >= period - 1) {
      result.push({ time: data[i].time, value: Math.round(ema * 100) / 100 });
    }
  }
  return result;
}
