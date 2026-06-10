import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface ChartPanelProps {
  symbol: string;
  timeframe: string;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({ symbol, timeframe }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const loadAndRender = async () => {
      try {
        setLoading(true);

        // Fetch market data
        const result = await window.api.fetchMarketData(symbol, timeframe);
        if (!result.success) {
          console.error('Failed to fetch data:', result.error);
          return;
        }

        const ohlcvData = result.data;
        const bars = ohlcvData.bars;

        // Create chart
        const chart = createChart(containerRef.current!, {
          layout: {
            background: { type: ColorType.Solid, color: '#131722' },
            textColor: '#d1d4dc',
          },
          width: containerRef.current!.clientWidth,
          height: containerRef.current!.clientHeight,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        });

        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderDownColor: '#ef5350',
          borderUpColor: '#26a69a',
          wickDownColor: '#ef5350',
          wickUpColor: '#26a69a',
        });

        // Convert bars to chart format
        const chartData = bars.map((bar: any) => ({
          time: Math.floor(bar.time / 1000),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        }));

        candlestickSeries.setData(chartData);
        chart.timeScale().fitContent();

        setLoading(false);

        // Handle resize
        const handleResize = () => {
          if (containerRef.current) {
            chart.applyOptions({
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
      } catch (error) {
        console.error('Error loading chart:', error);
        setLoading(false);
      }
    };

    loadAndRender();
  }, [symbol, timeframe]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-tv-bg border-r border-tv-border overflow-hidden relative"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-tv-bg/80 z-10">
          <div className="text-tv-text-secondary">Loading chart...</div>
        </div>
      )}
    </div>
  );
};
