import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface ChartPanelProps {
  symbol: string;
  timeframe: string;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({ symbol, timeframe }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
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

    // Sample data
    const data = [
      { time: '2024-06-01', open: 100, high: 105, low: 99, close: 103 },
      { time: '2024-06-02', open: 103, high: 108, low: 102, close: 106 },
      { time: '2024-06-03', open: 106, high: 110, low: 105, close: 109 },
      { time: '2024-06-04', open: 109, high: 112, low: 108, close: 111 },
      { time: '2024-06-05', open: 111, high: 115, low: 110, close: 113 },
      { time: '2024-06-06', open: 113, high: 116, low: 112, close: 114 },
      { time: '2024-06-07', open: 114, high: 118, low: 113, close: 117 },
      { time: '2024-06-08', open: 117, high: 120, low: 116, close: 119 },
      { time: '2024-06-09', open: 119, high: 122, low: 118, close: 121 },
    ];

    candlestickSeries.setData(data);
    chart.timeScale().fitContent();

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
  }, [symbol, timeframe]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-tv-bg border-r border-tv-border overflow-hidden"
    />
  );
};
