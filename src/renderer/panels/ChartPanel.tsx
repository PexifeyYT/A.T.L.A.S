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

interface HorizontalLine {
  id: string;
  price: number;
  color: string;
  label?: string;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({ symbol, timeframe, analysisResult }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [_hLines, _setHLines] = useState<HorizontalLine[]>([]);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [allBars, setAllBars] = useState<CandlestickData[]>([]);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildChart = useCallback(async () => {
    if (!containerRef.current) return;

    // Cleanup old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    setLoading(true);

    try {
      const result = await window.api.fetchMarketData(symbol, timeframe);
      if (!result.success) {
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

      const chart = createChart(containerRef.current!, {
        layout: {
          background: { type: ColorType.Solid, color: '#131722' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#363a45', style: LineStyle.Dotted },
          horzLines: { color: '#363a45', style: LineStyle.Dotted },
        },
        crosshair: {
          mode: 1,
        },
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#363a45',
        },
        rightPriceScale: {
          borderColor: '#363a45',
        },
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
      candleSeries.setData(chartData);

      // EMA 21 overlay
      const ema21Series = chart.addLineSeries({
        color: '#f7a600',
        lineWidth: 1,
        title: 'EMA 21',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema21Series.setData(calcEMA(chartData, 21));

      // EMA 50 overlay
      const ema50Series = chart.addLineSeries({
        color: '#2962ff',
        lineWidth: 1,
        title: 'EMA 50',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema50Series.setData(calcEMA(chartData, 50));

      // Volume histogram
      const volSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      const volData = bars.map((bar: any) => ({
        time: Math.floor(bar.time / 1000) as any,
        value: bar.volume,
        color: bar.close >= bar.open ? '#26a69a55' : '#ef535055',
      }));
      volSeries.setData(volData);

      chart.timeScale().fitContent();
      setLoading(false);

      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (err) {
      console.error('Chart error:', err);
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    const cleanup = buildChart();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [buildChart]);

  // Draw analysis levels when result changes
  useEffect(() => {
    if (!analysisResult || !candleSeriesRef.current) return;
    const sig = analysisResult.primarySignal;
    if (!sig || sig.direction === 'NEUTRAL') return;

    const isLong = sig.direction === 'LONG';
    candleSeriesRef.current.createPriceLine({
      price: sig.target1,
      color: '#26a69a',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'T1',
    });
    if (sig.target2 > 0) {
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
    candleSeriesRef.current.createPriceLine({
      price: (sig.entryZone[0] + sig.entryZone[1]) / 2,
      color: isLong ? '#26a69a88' : '#ef535088',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'ENTRY',
    });
  }, [analysisResult]);

  // Replay controls
  const startReplay = useCallback(() => {
    if (allBars.length === 0 || !candleSeriesRef.current) return;
    setReplayMode(true);
    setReplayIndex(50);
    candleSeriesRef.current.setData(allBars.slice(0, 50));
  }, [allBars]);

  const stopReplay = useCallback(() => {
    setReplayMode(false);
    setReplayPlaying(false);
    if (replayTimer.current) clearInterval(replayTimer.current);
    if (candleSeriesRef.current && allBars.length > 0) {
      candleSeriesRef.current.setData(allBars);
    }
    chartRef.current?.timeScale().fitContent();
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
      replayTimer.current = setInterval(stepReplay, 300);
    } else {
      if (replayTimer.current) clearInterval(replayTimer.current);
    }
    return () => {
      if (replayTimer.current) clearInterval(replayTimer.current);
    };
  }, [replayPlaying, replayMode, stepReplay]);

  const handleChartClick = useCallback(() => {
    if (activeTool === 'hline' && chartRef.current) {
      // Placeholder: add hline at crosshair price
      // Full implementation requires coordinateToPrice
    }
  }, [activeTool]);

  const tools: { id: DrawingTool; icon: string; label: string }[] = [
    { id: 'cursor', icon: '↖', label: 'Cursor' },
    { id: 'hline', icon: '─', label: 'H-Line' },
    { id: 'trendline', icon: '╱', label: 'Trend Line' },
    { id: 'fib', icon: 'φ', label: 'Fibonacci' },
    { id: 'text', icon: 'T', label: 'Text' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-tv-bg overflow-hidden relative">
      {/* Drawing toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-tv-border bg-tv-surface">
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
            title="Replay Mode"
            onClick={startReplay}
            className="px-2 h-7 text-xs rounded text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text transition-colors flex items-center gap-1"
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
            <button
              onClick={stepReplay}
              className="px-2 h-7 text-xs rounded text-tv-text-secondary hover:bg-tv-surface2 transition-colors"
            >
              ⏭
            </button>
            <span className="text-xs text-tv-text-secondary">
              {replayIndex}/{allBars.length}
            </span>
            <button
              onClick={stopReplay}
              className="px-2 h-7 text-xs rounded text-tv-red hover:bg-tv-red/10 transition-colors"
            >
              ✕ Exit
            </button>
          </div>
        )}
        {replayMode && (
          <span className="ml-2 text-xs text-tv-orange font-semibold animate-pulse">
            ● REPLAY
          </span>
        )}
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        onClick={handleChartClick}
        style={{ cursor: activeTool === 'cursor' ? 'default' : 'crosshair' }}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-tv-bg/80 z-10 top-9">
          <div className="text-tv-text-secondary text-sm">Loading {symbol}...</div>
        </div>
      )}
    </div>
  );
};

function calcEMA(data: CandlestickData[], period: number): { time: any; value: number }[] {
  const k = 2 / (period + 1);
  const result: { time: any; value: number }[] = [];
  let ema = 0;

  for (let i = 0; i < data.length; i++) {
    const close = data[i].close;
    if (i === 0) {
      ema = close;
    } else {
      ema = close * k + ema * (1 - k);
    }
    if (i >= period - 1) {
      result.push({ time: data[i].time, value: Math.round(ema * 100) / 100 });
    }
  }
  return result;
}
