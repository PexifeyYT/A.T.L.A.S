import { useState, useCallback, useEffect, useRef } from 'react';
import { Layout } from '@/renderer/layouts/Layout';
import { ChartPanel, ChartPanelRef, DrawingTool } from '@/renderer/panels/ChartPanel';
import { TopToolbar } from '@/renderer/components/TopToolbar';
import { LeftSidebar } from '@/renderer/components/LeftSidebar';
import { RightPanel } from '@/renderer/panels/RightPanel';
import { BottomBar } from '@/renderer/components/BottomBar';
import { ScanResultsPanel } from '@/renderer/panels/ScanResultsPanel';
import { SettingsModal } from '@/renderer/components/SettingsModal';

const SCAN_SYMBOLS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'GOOGL', 'AMZN', 'META', 'AMD', 'SPY', 'QQQ'];

export default function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1D');
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [liveQuote, setLiveQuote] = useState<{ price: number; changePercent: number } | null>(null);
  const liveQuotePollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Replay state — actual logic inside ChartPanel, state lifted here for TopToolbar
  const chartPanelRef = useRef<ChartPanelRef>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [totalBars, setTotalBars] = useState(0);

  const handleReplayModeChange = useCallback((active: boolean, playing: boolean, index: number, total: number) => {
    setReplayMode(active);
    setReplayPlaying(playing);
    setReplayIndex(index);
    setTotalBars(total);
  }, []);

  // Single shared live quote poll
  useEffect(() => {
    let active = true;
    const fetchQuote = async () => {
      try {
        const res = await window.api.fetchLiveQuote(symbol);
        if (active && res.success && res.data) {
          setLiveQuote({ price: res.data.price, changePercent: res.data.changePercent });
        }
      } catch {}
      if (active) liveQuotePollRef.current = setTimeout(fetchQuote, 10000);
    };
    setLiveQuote(null);
    fetchQuote();
    return () => {
      active = false;
      if (liveQuotePollRef.current) clearTimeout(liveQuotePollRef.current);
    };
  }, [symbol]);

  const handleRunAnalysis = useCallback(async () => {
    try {
      setAnalysisLoading(true);
      setAnalysisError(null);

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
      setAnalysisError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setAnalysisLoading(false);
    }
  }, [symbol, timeframe]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'a' || e.key === 'A') && !analysisLoading) handleRunAnalysis();
      if (e.key === 'Escape') setActiveTool('cursor');
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
      } catch {}
    }
    setScanning(false);
  };

  const modulesAgreed = analysisResult?.moduleVotes
    ? Object.values(analysisResult.moduleVotes as Record<string, any>).filter((v: any) => v?.agrees).length
    : 0;

  return (
    <Layout>
      <TopToolbar
        symbol={symbol}
        onSymbolChange={sym => { setSymbol(sym); setAnalysisResult(null); }}
        timeframe={timeframe}
        onTimeframeChange={tf => { setTimeframe(tf); setAnalysisResult(null); }}
        onAnalyze={handleRunAnalysis}
        analyzing={analysisLoading}
        onScan={handleScan}
        scanning={scanning}
        liveQuote={liveQuote}
        onReplayStart={() => chartPanelRef.current?.startReplay()}
        onReplayStop={() => chartPanelRef.current?.stopReplay()}
        onReplayPlayPause={() => { chartPanelRef.current?.togglePlayPause(); setReplayPlaying(p => !p); }}
        onReplayStep={() => chartPanelRef.current?.stepReplay()}
        replayMode={replayMode}
        replayPlaying={replayPlaying}
        replayIndex={replayIndex}
        totalBars={totalBars}
        modulesAgreed={modulesAgreed}
        onSettings={() => setShowSettings(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onClearDrawings={() => chartPanelRef.current?.clearDrawings()}
        />

        <ChartPanel
          ref={chartPanelRef}
          symbol={symbol}
          timeframe={timeframe}
          analysisResult={analysisResult}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          liveQuote={liveQuote}
          onReplayModeChange={handleReplayModeChange}
        />

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
            analysisResult={analysisResult}
            analysisLoading={analysisLoading}
            analysisError={analysisError}
            symbol={symbol}
            timeframe={timeframe}
          />
        )}
      </div>

      <BottomBar symbol={symbol} liveQuote={liveQuote} barCount={totalBars} />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </Layout>
  );
}
