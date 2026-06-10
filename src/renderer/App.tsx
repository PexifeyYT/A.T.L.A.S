import { useState, useCallback, useEffect } from 'react';
import { Layout } from '@/renderer/layouts/Layout';
import { ChartPanel } from '@/renderer/panels/ChartPanel';
import { TopToolbar } from '@/renderer/components/TopToolbar';
import { LeftSidebar } from '@/renderer/components/LeftSidebar';
import { RightPanel } from '@/renderer/panels/RightPanel';
import { BottomBar } from '@/renderer/components/BottomBar';
import { ScanResultsPanel } from '@/renderer/panels/ScanResultsPanel';

type RightPanelTab = 'watchlist' | 'info' | 'analysis' | 'performance' | 'chat';
type DrawingTool = 'cursor' | 'hline' | 'trendline' | 'fib' | 'text';

const SCAN_SYMBOLS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'GOOGL', 'AMZN', 'META', 'AMD', 'SPY', 'QQQ'];

export default function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1D');
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('analysis');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showScan, setShowScan] = useState(false);

  const handleRunAnalysis = useCallback(async () => {
    try {
      setAnalysisLoading(true);
      setAnalysisError(null);
      setRightPanelTab('analysis');

      const marketDataResult = await window.api.fetchMarketData(symbol, timeframe);
      if (!marketDataResult.success) {
        setAnalysisError(marketDataResult.error ?? 'Failed to fetch data');
        return;
      }

      const analysisRes = await window.api.runAnalysis(symbol, timeframe, marketDataResult.data);
      if (!analysisRes.success) {
        setAnalysisError(analysisRes.error ?? 'Analysis failed');
        return;
      }

      setAnalysisResult(analysisRes.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAnalysisError(errorMessage);
    } finally {
      setAnalysisLoading(false);
    }
  }, [symbol, timeframe]);

  // Keyboard shortcut: A = analyze, Escape = cursor tool
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'a' || e.key === 'A') {
        if (!analysisLoading) handleRunAnalysis();
      }
      if (e.key === 'Escape') {
        setActiveTool('cursor');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [analysisLoading, handleRunAnalysis]);

  const handleScan = async () => {
    setScanning(true);
    setShowScan(true);
    setScanResults([]);

    const results: any[] = [];
    for (const sym of SCAN_SYMBOLS) {
      try {
        const md = await window.api.fetchMarketData(sym, timeframe);
        if (!md.success) continue;
        const ar = await window.api.runAnalysis(sym, timeframe, md.data);
        if (!ar.success) continue;
        results.push({ symbol: sym, ...ar.data });
        setScanResults([...results]);
      } catch {
        // skip failed symbol
      }
    }
    setScanning(false);
  };

  return (
    <Layout>
      <TopToolbar
        symbol={symbol}
        onSymbolChange={sym => { setSymbol(sym); setAnalysisResult(null); }}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        onAnalyze={handleRunAnalysis}
        analyzing={analysisLoading}
        onScan={handleScan}
        scanning={scanning}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar activeTool={activeTool} onToolChange={setActiveTool} />

        <ChartPanel symbol={symbol} timeframe={timeframe} analysisResult={analysisResult} activeTool={activeTool} onToolChange={setActiveTool} />

        {showScan ? (
          <ScanResultsPanel
            results={scanResults}
            scanning={scanning}
            timeframe={timeframe}
            onSelectSymbol={sym => { setSymbol(sym); setShowScan(false); }}
            onClose={() => setShowScan(false)}
          />
        ) : (
          <RightPanel
            activeTab={rightPanelTab}
            onTabChange={setRightPanelTab}
            analysisResult={analysisResult}
            analysisLoading={analysisLoading}
            analysisError={analysisError}
            symbol={symbol}
            timeframe={timeframe}
          />
        )}
      </div>

      <BottomBar symbol={symbol} />
    </Layout>
  );
}
