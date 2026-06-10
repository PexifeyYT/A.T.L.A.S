import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineStyle,
} from 'lightweight-charts';

export type DrawingTool = 'cursor' | 'hline' | 'vline' | 'trendline' | 'fib' | 'text' | 'rect' | 'longpos' | 'shortpos';

interface Drawing {
  id: string;
  type: DrawingTool;
  points: { x: number; y: number; price?: number; time?: number }[];
  color: string;
  label?: string;
}

export interface ChartPanelRef {
  startReplay: () => void;
  stopReplay: () => void;
  stepReplay: () => void;
  togglePlayPause: () => void;
  clearDrawings: () => void;
}

interface ChartPanelProps {
  symbol: string;
  timeframe: string;
  analysisResult?: any;
  activeTool?: DrawingTool;
  onToolChange?: (tool: DrawingTool) => void;
  liveQuote?: { price: number; changePercent: number } | null;
  onReplayModeChange?: (active: boolean, playing: boolean, index: number, total: number) => void;
}

export const ChartPanel = forwardRef<ChartPanelRef, ChartPanelProps>(({
  symbol, timeframe, analysisResult, activeTool: externalTool, onToolChange, liveQuote, onReplayModeChange,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const analysisLinesRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalTool, setInternalTool] = useState<DrawingTool>('cursor');
  const activeTool = externalTool ?? internalTool;
  const setActiveTool = (t: DrawingTool) => { setInternalTool(t); onToolChange?.(t); };
  const [allBars, setAllBars] = useState<CandlestickData[]>([]);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ohlcv, setOhlcv] = useState<{ open: number; high: number; low: number; close: number; volume?: number } | null>(null);
  const [showPrediction, setShowPrediction] = useState(true);
  const predictionSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lastRealBarTimeRef = useRef<number | null>(null);

  // Drawing state — persisted per symbol+timeframe in localStorage
  const drawingKey = `atlas_drawings_${symbol}_${timeframe}`;
  const [drawings, setDrawings] = useState<Drawing[]>(() => {
    try {
      const saved = localStorage.getItem(`atlas_drawings_${symbol}_${timeframe}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const drawingsRef = useRef<Drawing[]>(drawings);
  const activeDrawingRef = useRef<Drawing | null>(null);
  const isDrawingRef = useRef(false);
  const activeToolRef = useRef<DrawingTool>('cursor');

  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => {
    drawingsRef.current = drawings;
    try { localStorage.setItem(drawingKey, JSON.stringify(drawings)); } catch {}
  }, [drawings, drawingKey]);

  // Reload drawings when symbol/timeframe changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(drawingKey);
      const d = saved ? JSON.parse(saved) : [];
      setDrawings(d);
      drawingsRef.current = d;
    } catch {
      setDrawings([]);
      drawingsRef.current = [];
    }
  }, [drawingKey]);

  // Build chart
  useEffect(() => {
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
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const ema50Series = chart.addLineSeries({
      color: '#2962ff',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
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

    // Fetch lifetime data — use large limit to get max range
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

    // Prediction series — semi-transparent blue candles
    const predSeries = chart.addCandlestickSeries({
      upColor: '#1565c0',
      downColor: '#0d47a1',
      borderUpColor: '#1e88e5',
      borderDownColor: '#1565c0',
      wickUpColor: '#1e88e5',
      wickDownColor: '#42a5f5',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    predictionSeriesRef.current = predSeries;

    chart.subscribeCrosshairMove(param => {
      if (param.time && candleSeries) {
        const bar = param.seriesData.get(candleSeries) as any;
        if (bar && bar.open !== undefined) {
          setOhlcv({ open: bar.open, high: bar.high, low: bar.low, close: bar.close });
        }
      } else {
        setOhlcv(null);
      }
    });

    // Redraw overlay when panning/zooming to keep vertical prediction line aligned
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      redrawAll();
    });

    const handleResize = () => {
      if (container && chartRef.current) {
        chartRef.current.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
        resizeOverlay();
        redrawAll();
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
        predictionSeriesRef.current = null;
        lastRealBarTimeRef.current = null;
      }
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [symbol, timeframe]);

  // Draw analysis price lines when result changes — clear previous ones first
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Remove old analysis lines
    try {
      for (const line of analysisLinesRef.current) {
        candleSeriesRef.current.removePriceLine(line);
      }
    } catch {}
    analysisLinesRef.current = [];

    if (!analysisResult) return;
    const sig = analysisResult.primarySignal;
    if (!sig || sig.direction === 'NEUTRAL') return;

    const bullish = sig.direction === 'LONG';
    const newLines: any[] = [];

    try {
      newLines.push(candleSeriesRef.current.createPriceLine({
        price: sig.target1,
        color: '#26a69a',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'T1',
      }));
      if (sig.target2 && sig.target2 > 0) {
        newLines.push(candleSeriesRef.current.createPriceLine({
          price: sig.target2,
          color: '#26a69a',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'T2',
        }));
      }
      newLines.push(candleSeriesRef.current.createPriceLine({
        price: sig.invalidation,
        color: '#ef5350',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'INV',
      }));
      const entryMid = (sig.entryZone[0] + sig.entryZone[1]) / 2;
      newLines.push(candleSeriesRef.current.createPriceLine({
        price: entryMid,
        color: bullish ? '#26a69a' : '#ef5350',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'ENTRY',
      }));
      analysisLinesRef.current = newLines;
    } catch {
      // price lines may fail if chart was destroyed
    }
  }, [analysisResult]);

  // ─── Prediction candles ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!predictionSeriesRef.current) return;
    if (analysisResult?.predictionCandles && showPrediction && analysisResult.predictionCandles.length > 0) {
      try {
        predictionSeriesRef.current.setData(
          analysisResult.predictionCandles.map(c => ({
            time: c.time as any,
            open: c.open, high: c.high, low: c.low, close: c.close,
          }))
        );
        lastRealBarTimeRef.current = analysisResult.lastRealBarTime ?? null;
      } catch {}
    } else {
      try { predictionSeriesRef.current.setData([]); } catch {}
      if (!showPrediction) lastRealBarTimeRef.current = null;
    }
    redrawAll();
  }, [analysisResult, showPrediction, redrawAll]);

  // ─── Drawing overlay ─────────────────────────────────────────────────────────
  const resizeOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }, []);

  useEffect(() => {
    resizeOverlay();
  }, [resizeOverlay]);

  const redrawAll = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw prediction boundary line
    if (lastRealBarTimeRef.current && chartRef.current) {
      const x = chartRef.current.timeScale().timeToCoordinate(lastRealBarTimeRef.current as any);
      if (x !== null && x > 0 && x < canvas.width) {
        // Shade prediction area
        ctx.save();
        ctx.fillStyle = 'rgba(25,118,210,0.04)';
        ctx.fillRect(x, 0, canvas.width - x, canvas.height);
        // Vertical dashed line
        ctx.strokeStyle = '#1e88e5';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        // Label
        ctx.fillStyle = '#1e88e5';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('NOW', x - 24, 14);
        ctx.fillText('FORECAST →', x + 6, 14);
        ctx.restore();
      }
    }

    for (const d of drawingsRef.current) {
      drawShape(ctx, d, canvas);
    }
    if (activeDrawingRef.current) {
      drawShape(ctx, activeDrawingRef.current, canvas);
    }
  }, []);

  const drawShape = (ctx: CanvasRenderingContext2D, d: Drawing, canvas: HTMLCanvasElement) => {
    if (d.points.length === 0) return;
    ctx.strokeStyle = d.color;
    ctx.fillStyle = d.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.font = '12px monospace';

    if (d.type === 'hline' && d.points.length >= 1) {
      const y = d.points[0].y;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      if (d.points[0].price != null) {
        ctx.fillText(`$${d.points[0].price.toFixed(2)}`, canvas.width - 80, y - 4);
      }
    } else if (d.type === 'vline' && d.points.length >= 1) {
      const x = d.points[0].x;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (d.type === 'trendline' && d.points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(d.points[0].x, d.points[0].y);
      ctx.lineTo(d.points[1].x, d.points[1].y);
      ctx.stroke();
      // Extend slightly
      const dx = d.points[1].x - d.points[0].x;
      const dy = d.points[1].y - d.points[0].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const ux = dx / len, uy = dy / len;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(d.points[1].x, d.points[1].y);
        ctx.lineTo(d.points[1].x + ux * 80, d.points[1].y + uy * 80);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (d.type === 'fib' && d.points.length >= 2) {
      const y0 = d.points[0].y;
      const y1 = d.points[1].y;
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
      const colors = ['#26a69a', '#2962ff', '#f7a600', '#ef5350', '#f7a600', '#2962ff', '#26a69a'];
      levels.forEach((lvl, i) => {
        const y = y0 + (y1 - y0) * lvl;
        ctx.strokeStyle = colors[i];
        ctx.fillStyle = colors[i];
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText(`${(lvl * 100).toFixed(1)}%`, 6, y - 3);
      });
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.color;
    } else if (d.type === 'text' && d.points.length >= 1) {
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#f7a600';
      ctx.fillText(d.label || 'Label', d.points[0].x, d.points[0].y);
    } else if (d.type === 'rect' && d.points.length >= 2) {
      const x1 = d.points[0].x, y1 = d.points[0].y;
      const x2 = d.points[1].x, y2 = d.points[1].y;
      ctx.strokeStyle = '#2962ff';
      ctx.fillStyle = 'rgba(41,98,255,0.08)';
      ctx.beginPath();
      ctx.rect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
      ctx.fill();
      ctx.stroke();
    } else if ((d.type === 'longpos' || d.type === 'shortpos') && d.points.length >= 2) {
      const isLong = d.type === 'longpos';
      const entry = d.points[0].y;
      const target = d.points[1].y;
      const x1 = d.points[0].x, x2 = d.points[1].x ?? canvas.width - 40;
      const profitColor = isLong ? 'rgba(38,166,154,0.15)' : 'rgba(239,83,80,0.15)';
      const lossColor = isLong ? 'rgba(239,83,80,0.15)' : 'rgba(38,166,154,0.15)';
      const entryY = isLong ? Math.max(entry, target) : Math.min(entry, target);
      const tgtY = isLong ? Math.min(entry, target) : Math.max(entry, target);
      // profit zone
      ctx.fillStyle = profitColor;
      ctx.fillRect(Math.min(x1,x2), tgtY, Math.abs(x2-x1), entryY - tgtY);
      // entry line
      ctx.strokeStyle = '#d1d4dc';
      ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      ctx.moveTo(Math.min(x1,x2), entry);
      ctx.lineTo(Math.max(x1,x2), entry);
      ctx.stroke();
      ctx.setLineDash([]);
      // target line
      ctx.strokeStyle = isLong ? '#26a69a' : '#ef5350';
      ctx.beginPath();
      ctx.moveTo(Math.min(x1,x2), target);
      ctx.lineTo(Math.max(x1,x2), target);
      ctx.stroke();
      ctx.fillStyle = isLong ? '#26a69a' : '#ef5350';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(isLong ? '▲ Long' : '▼ Short', Math.min(x1,x2) + 4, entry - 4);
    }
  };

  const getPrice = useCallback((y: number): number | undefined => {
    if (!chartRef.current || !candleSeriesRef.current) return undefined;
    try {
      return (candleSeriesRef.current as any).coordinateToPrice(y) ?? undefined;
    } catch {
      return undefined;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = overlayRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find nearest drawing within 12px
    let nearest: Drawing | null = null;
    let nearestDist = 12;

    for (const d of drawingsRef.current) {
      let dist = Infinity;
      if (d.type === 'hline' && d.points.length >= 1) {
        dist = Math.abs(d.points[0].y - my);
      } else if (d.type === 'vline' && d.points.length >= 1) {
        dist = Math.abs(d.points[0].x - mx);
      } else if ((d.type === 'trendline' || d.type === 'fib') && d.points.length >= 2) {
        const p1 = d.points[0], p2 = d.points[1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len2 = dx * dx + dy * dy;
        if (len2 > 0) {
          const t = Math.max(0, Math.min(1, ((mx - p1.x) * dx + (my - p1.y) * dy) / len2));
          const px = p1.x + t * dx, py = p1.y + t * dy;
          dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
        }
      } else if (d.type === 'text' && d.points.length >= 1) {
        dist = Math.sqrt((mx - d.points[0].x) ** 2 + (my - d.points[0].y) ** 2);
      }
      if (dist < nearestDist) { nearestDist = dist; nearest = d; }
    }

    if (nearest) {
      const id = nearest.id;
      setDrawings(prev => prev.filter(d => d.id !== id));
      drawingsRef.current = drawingsRef.current.filter(d => d.id !== id);
      redrawAll();
    }
  }, [redrawAll]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const tool = activeToolRef.current;
    if (tool === 'cursor') return;

    const rect = overlayRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const price = getPrice(y);

    if (tool === 'hline') {
      const d: Drawing = {
        id: Math.random().toString(36).slice(2),
        type: 'hline',
        points: [{ x, y, price }],
        color: '#f7a600',
      };
      setDrawings(prev => [...prev, d]);
      drawingsRef.current = [...drawingsRef.current, d];
      redrawAll();
      return;
    }

    if (tool === 'vline') {
      const d: Drawing = {
        id: Math.random().toString(36).slice(2),
        type: 'vline',
        points: [{ x, y, price }],
        color: '#787b86',
      };
      setDrawings(prev => [...prev, d]);
      drawingsRef.current = [...drawingsRef.current, d];
      redrawAll();
      return;
    }

    if (tool === 'text') {
      const label = window.prompt('Label text:') || 'Note';
      const d: Drawing = {
        id: Math.random().toString(36).slice(2),
        type: 'text',
        points: [{ x, y, price }],
        color: '#f7a600',
        label,
      };
      setDrawings(prev => [...prev, d]);
      drawingsRef.current = [...drawingsRef.current, d];
      redrawAll();
      return;
    }

    // two-point drawings: trendline, fib, rect, longpos, shortpos
    const colorMap: Partial<Record<DrawingTool, string>> = {
      fib: '#26a69a', rect: '#2962ff', longpos: '#26a69a', shortpos: '#ef5350', trendline: '#2962ff',
    };
    const d: Drawing = {
      id: Math.random().toString(36).slice(2),
      type: tool,
      points: [{ x, y, price }],
      color: colorMap[tool] ?? '#2962ff',
    };
    activeDrawingRef.current = d;
    isDrawingRef.current = true;
  }, [getPrice, redrawAll]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeDrawingRef.current) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const price = getPrice(y);

    activeDrawingRef.current = {
      ...activeDrawingRef.current,
      points: [activeDrawingRef.current.points[0], { x, y, price }],
    };
    redrawAll();
  }, [getPrice, redrawAll]);

  const handleMouseUp = useCallback((_e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeDrawingRef.current) return;
    isDrawingRef.current = false;
    if (activeDrawingRef.current.points.length >= 2) {
      const d = activeDrawingRef.current;
      setDrawings(prev => [...prev, d]);
      drawingsRef.current = [...drawingsRef.current, d];
    }
    activeDrawingRef.current = null;
    redrawAll();
  }, [redrawAll]);

  const clearDrawings = useCallback(() => {
    setDrawings([]);
    drawingsRef.current = [];
    activeDrawingRef.current = null;
    redrawAll();
  }, [redrawAll]);

  // Expose replay and drawing controls to parent via ref
  useImperativeHandle(ref, () => ({
    startReplay: () => startReplay(),
    stopReplay: () => stopReplay(),
    stepReplay: () => stepReplay(),
    togglePlayPause: () => setReplayPlaying(p => !p),
    clearDrawings: () => clearDrawings(),
  }));

  // ─── Replay ──────────────────────────────────────────────────────────────────
  const startReplay = useCallback(() => {
    if (allBars.length === 0 || !candleSeriesRef.current) return;
    const startIdx = Math.max(50, Math.floor(allBars.length * 0.4));
    setReplayMode(true);
    setReplayPlaying(false);
    setReplayIndex(startIdx);
    candleSeriesRef.current.setData(allBars.slice(0, startIdx));
    chartRef.current?.timeScale().fitContent();
    onReplayModeChange?.(true, false, startIdx, allBars.length);
  }, [allBars, onReplayModeChange]);

  const stopReplay = useCallback(() => {
    if (replayTimer.current) clearInterval(replayTimer.current);
    setReplayMode(false);
    setReplayPlaying(false);
    if (candleSeriesRef.current && allBars.length > 0) {
      candleSeriesRef.current.setData(allBars);
      chartRef.current?.timeScale().fitContent();
    }
    onReplayModeChange?.(false, false, allBars.length, allBars.length);
  }, [allBars, onReplayModeChange]);

  const stepReplay = useCallback(() => {
    setReplayIndex(prev => {
      if (prev >= allBars.length) return prev;
      // Append single bar instead of re-setting entire slice (O(1) vs O(n))
      candleSeriesRef.current?.update(allBars[prev]);
      return prev + 1;
    });
  }, [allBars]);

  useEffect(() => {
    if (replayPlaying && replayMode) {
      replayTimer.current = setInterval(stepReplay, 250);
    } else {
      if (replayTimer.current) clearInterval(replayTimer.current);
    }
    return () => { if (replayTimer.current) clearInterval(replayTimer.current); };
  }, [replayPlaying, replayMode, stepReplay]);


  return (
    <div className="flex-1 flex flex-col bg-tv-bg overflow-hidden relative min-w-0">
      {/* Chart + drawing overlay */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ cursor: activeTool === 'cursor' ? 'default' : 'crosshair' }}
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            pointerEvents: activeTool !== 'cursor' ? 'auto' : 'none',
            cursor: activeTool !== 'cursor' ? 'crosshair' : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        />
      </div>

      {/* Prediction toggle — top right */}
      {analysisResult?.predictionCandles && analysisResult.predictionCandles.length > 0 && (
        <button
          onClick={() => setShowPrediction(p => !p)}
          className={`absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold border transition-colors ${
            showPrediction
              ? 'bg-blue-600/20 border-blue-500/60 text-blue-400 hover:bg-blue-600/30'
              : 'bg-tv-surface/80 border-tv-border text-tv-text-secondary hover:bg-tv-surface2'
          }`}
          title="Toggle AI forecast overlay"
        >
          <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 10 L4 6 L7 8 L10 3 L13 5"/>
            <circle cx="13" cy="5" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
          Forecast {showPrediction ? 'ON' : 'OFF'}
        </button>
      )}

      {/* TV-style OHLCV overlay — top left */}
      {!loading && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none flex items-baseline gap-3 select-none">
          <span className="text-[12px] font-bold text-tv-text tracking-wide">{symbol}</span>
          <span className="text-[11px] text-tv-text-secondary">{timeframe}</span>
          {(ohlcv ?? (liveQuote ? { open: liveQuote.price, high: liveQuote.price, low: liveQuote.price, close: liveQuote.price } : null)) && (() => {
            const bar = ohlcv ?? { open: liveQuote!.price, high: liveQuote!.price, low: liveQuote!.price, close: liveQuote!.price };
            const up = bar.close >= bar.open;
            const fmt = (n: number) => n > 999 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n.toFixed(2);
            const chg = ((bar.close - bar.open) / bar.open * 100);
            return (
              <>
                <span className="text-[11px] text-tv-text-secondary">O <span className={up ? 'text-tv-green' : 'text-tv-red'}>{fmt(bar.open)}</span></span>
                <span className="text-[11px] text-tv-text-secondary">H <span className="text-tv-green">{fmt(bar.high)}</span></span>
                <span className="text-[11px] text-tv-text-secondary">L <span className="text-tv-red">{fmt(bar.low)}</span></span>
                <span className="text-[11px] text-tv-text-secondary">C <span className={up ? 'text-tv-green' : 'text-tv-red'}>{fmt(bar.close)}</span></span>
                <span className={`text-[11px] font-medium ${up ? 'text-tv-green' : 'text-tv-red'}`}>{up ? '+' : ''}{chg.toFixed(2)}%</span>
                <span className="text-[11px] text-yellow-400/80">EMA21</span>
                <span className="text-[11px] text-tv-accent/80">EMA50</span>
              </>
            );
          })()}
        </div>
      )}

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

      {/* Drawing mode hint */}
      {activeTool !== 'cursor' && !loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-tv-surface/90 border border-tv-border rounded px-3 py-1.5 text-xs text-tv-text-secondary pointer-events-none">
          {activeTool === 'hline' && 'Click to place horizontal line · Right-click to delete'}
          {activeTool === 'vline' && 'Click to place vertical line · Right-click to delete'}
          {activeTool === 'trendline' && 'Click and drag to draw · Right-click to delete'}
          {activeTool === 'fib' && 'Click and drag for Fibonacci · Right-click to delete'}
          {activeTool === 'text' && 'Click to place label · Right-click to delete'}
          {activeTool === 'rect' && 'Click and drag to draw rectangle · Right-click to delete'}
          {activeTool === 'longpos' && 'Click and drag to mark long position · Right-click to delete'}
          {activeTool === 'shortpos' && 'Click and drag to mark short position · Right-click to delete'}
        </div>
      )}
    </div>
  );
});

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
