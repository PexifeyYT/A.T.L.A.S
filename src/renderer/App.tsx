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
  const [rightPanelTab, setRightPanelTab] = useState<'watchlist' | 'info' | 'analysis' | 'performance'>('analysis');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    try {
      setAnalysisLoading(true);
      setAnalysisError(null);
      setRightPanelTab('analysis');

      // Fetch market data
      const marketDataResult = await window.api.fetchMarketData(symbol, timeframe);
      if (!marketDataResult.success) {
        setAnalysisError(marketDataResult.error);
        return;
      }

      // Run analysis
      const analysisRes = await window.api.runAnalysis(symbol, timeframe, marketDataResult.data);
      if (!analysisRes.success) {
        setAnalysisError(analysisRes.error);
        return;
      }

      setAnalysisResult(analysisRes.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAnalysisError(errorMessage);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <Layout>
      <TopToolbar
        symbol={symbol}
        onSymbolChange={setSymbol}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        onAnalyze={handleRunAnalysis}
        analyzing={analysisLoading}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />

        <ChartPanel symbol={symbol} timeframe={timeframe} />

        <RightPanel
          activeTab={rightPanelTab}
          onTabChange={setRightPanelTab}
          analysisResult={analysisResult}
          analysisLoading={analysisLoading}
          analysisError={analysisError}
        />
      </div>

      <BottomBar />
    </Layout>
  );
}
