import React, { useState } from 'react';
import { Layout } from '@/renderer/layouts/Layout';
import { ChartPanel } from '@/renderer/panels/ChartPanel';
import { TopToolbar } from '@/renderer/components/TopToolbar';
import { LeftSidebar } from '@/renderer/components/LeftSidebar';
import { RightPanel } from '@/renderer/panels/RightPanel';
import { BottomBar } from '@/renderer/components/BottomBar';

export default function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1D');
  const [rightPanelTab, setRightPanelTab] = useState<'watchlist' | 'info' | 'analysis' | 'performance'>('watchlist');

  return (
    <Layout>
      <TopToolbar
        symbol={symbol}
        onSymbolChange={setSymbol}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />

        <ChartPanel symbol={symbol} timeframe={timeframe} />

        <RightPanel activeTab={rightPanelTab} onTabChange={setRightPanelTab} />
      </div>

      <BottomBar />
    </Layout>
  );
}
