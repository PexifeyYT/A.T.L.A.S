import React, { useState, useEffect, useCallback } from 'react';
import { PerformancePanel } from './PerformancePanel';
import { ChatPanel } from './ChatPanel';

type RightPanelTab = 'watchlist' | 'info' | 'analysis' | 'performance' | 'chat';

interface RightPanelProps {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  analysisResult?: any;
  analysisLoading?: boolean;
  analysisError?: string | null;
  symbol?: string;
  timeframe?: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  activeTab,
  onTabChange,
  analysisResult,
  analysisLoading,
  analysisError,
  symbol = 'AAPL',
  timeframe = '1D',
}) => {
  const [perfStats, setPerfStats] = useState<any>(null);

  useEffect(() => {
    const load = () => window.api.getPerformanceStats().then(r => {
      if (r.success) setPerfStats(r.data);
    }).catch(() => {});
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const tabs: { id: RightPanelTab; label: string; icon: string }[] = [
    { id: 'analysis', label: 'Analysis', icon: '📊' },
    { id: 'chat', label: 'AI Chat', icon: '🤖' },
    { id: 'performance', label: 'Stats', icon: '📈' },
    { id: 'watchlist', label: 'Watch', icon: '👁' },
    { id: 'info', label: 'Info', icon: 'ℹ' },
  ];

  return (
    <div className="w-80 bg-tv-surface border-l border-tv-border flex flex-col">
      {/* Tab buttons */}
      <div className="flex border-b border-tv-border bg-tv-surface2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors flex flex-col items-center gap-0.5 ${
              activeTab === tab.id
                ? 'border-tv-accent text-tv-accent bg-tv-surface'
                : 'border-transparent text-tv-text-secondary hover:text-tv-text hover:bg-tv-surface'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 ${activeTab === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {activeTab === 'watchlist' && <WatchlistContent />}
        {activeTab === 'info' && <InfoContent symbol={symbol} />}
        {activeTab === 'analysis' && (
          <AnalysisContent
            result={analysisResult}
            loading={analysisLoading}
            error={analysisError}
          />
        )}
        {activeTab === 'performance' && <PerformancePanel />}
        {activeTab === 'chat' && (
          <ChatPanel
            symbol={symbol}
            timeframe={timeframe}
            analysisResult={analysisResult}
            performanceStats={perfStats}
          />
        )}
      </div>
    </div>
  );
};

const WATCHLIST_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq ETF' },
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
];

const WatchlistContent: React.FC = () => {
  const [prices, setPrices] = useState<Record<string, { price: number; changePercent: number }>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const fetchAll = useCallback(async () => {
    const updates: Record<string, { price: number; changePercent: number }> = {};
    await Promise.allSettled(
      WATCHLIST_SYMBOLS.map(async ({ symbol }) => {
        try {
          const res = await window.api.fetchLiveQuote(symbol);
          if (res.success && res.data) {
            updates[symbol] = { price: res.data.price, changePercent: res.data.changePercent };
          }
        } catch {}
      })
    );
    if (Object.keys(updates).length > 0) {
      setPrices(prev => ({ ...prev, ...updates }));
      setLastUpdate(new Date());
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 border-b border-tv-border">
        <span className="text-xs font-bold text-tv-text">WATCHLIST</span>
        <span className="text-xs text-tv-text-secondary">
          {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Loading...'}
        </span>
      </div>
      {WATCHLIST_SYMBOLS.map(item => {
        const data = prices[item.symbol];
        const isUp = (data?.changePercent ?? 0) >= 0;
        return (
          <div
            key={item.symbol}
            className="flex items-center justify-between px-3 py-2 border-b border-tv-border/40 hover:bg-tv-surface2 cursor-pointer transition-colors"
          >
            <div>
              <div className="text-sm font-bold text-tv-text">{item.symbol}</div>
              <div className="text-xs text-tv-text-secondary">{item.name}</div>
            </div>
            <div className="text-right">
              {data ? (
                <>
                  <div className="text-sm font-mono text-tv-text">
                    ${data.price > 1000 ? data.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : data.price.toFixed(2)}
                  </div>
                  <div className={`text-xs font-medium ${isUp ? 'text-tv-green' : 'text-tv-red'}`}>
                    {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
                  </div>
                </>
              ) : (
                <div className="text-xs text-tv-text-secondary animate-pulse">—</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const InfoContent: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.api.fetchLiveQuote(symbol).then(r => {
      if (r.success && r.data) setQuote(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [symbol]);

  const up = (quote?.changePercent ?? 0) >= 0;

  return (
    <div className="p-3 text-xs">
      <div className="mb-3">
        <div className="text-xl font-bold text-tv-text">{symbol}</div>
        {loading ? (
          <div className="text-tv-text-secondary animate-pulse mt-1">Loading...</div>
        ) : quote ? (
          <div className="mt-1 space-y-0.5">
            <div className="text-2xl font-mono font-bold text-tv-text">
              ${quote.price > 1000
                ? quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : quote.price.toFixed(2)}
            </div>
            <div className={`font-semibold ${up ? 'text-tv-green' : 'text-tv-red'}`}>
              {up ? '+' : ''}{quote.change?.toFixed(2)} ({up ? '+' : ''}{quote.changePercent?.toFixed(2)}%)
            </div>
          </div>
        ) : (
          <div className="text-tv-text-secondary text-xs mt-1">Price unavailable</div>
        )}
      </div>

      <div className="space-y-2 border-t border-tv-border pt-3">
        {[
          ['Symbol', symbol],
          ['Data Source', 'Yahoo Finance'],
          ['Status', quote ? 'Live' : 'No data'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-tv-text-secondary">{label}</span>
            <span className="text-tv-text font-medium">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-tv-border text-tv-text-secondary leading-relaxed">
        Market data from Yahoo Finance. Analysis provided by ATLAS 13-module engine.
        Run <span className="text-tv-accent">ANALYZE</span> for full signal generation.
      </div>
    </div>
  );
};

const AnalysisContent: React.FC<{
  result?: any;
  loading?: boolean;
  error?: string | null;
}> = ({ result, loading, error }) => {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-tv-text-secondary text-sm font-semibold animate-pulse">
          🤖 ATLAS analyzing...
        </div>
        {['SMC', 'TJR', 'Wyckoff', 'Volume Profile', 'MA Systems', 'Momentum', 'Elliott Wave'].map(m => (
          <div key={m} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-tv-accent rounded-full animate-pulse" />
            <span className="text-xs text-tv-text-secondary">{m}</span>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-tv-red text-sm font-semibold mb-2">⚠️ Analysis Error</div>
        <div className="text-tv-text-secondary text-xs">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4">
        <div className="text-sm font-bold text-tv-text mb-3">ATLAS Analysis</div>
        <div className="text-tv-text-secondary text-xs leading-relaxed mb-4">
          Click <span className="text-tv-accent font-bold">🤖 ANALYZE</span> to run all 13 strategy modules in parallel.
          <br /><br />
          ATLAS produces entry zones, targets, invalidation levels, and conviction score.
        </div>
        <div className="space-y-2">
          {['SMC (1.82x)', 'TJR (1.71x)', 'Wyckoff (1.60x)', 'Volume Profile (1.54x)', 'MA Systems (1.31x)', '+ 8 more modules'].map(m => (
            <div key={m} className="flex items-center gap-2 text-xs text-tv-text-secondary">
              <span className="text-tv-accent">◆</span> {m}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const primary = result.primarySignal;
  const confidence = (result.confidence || 0).toFixed(1);
  const bullish = primary.direction === 'LONG';
  const bearish = primary.direction === 'SHORT';
  const dirColor = bullish ? 'text-tv-green' : bearish ? 'text-tv-red' : 'text-tv-text-secondary';
  const dirBg = bullish ? 'bg-tv-green/10 border-tv-green/30' : bearish ? 'bg-tv-red/10 border-tv-red/30' : 'bg-tv-surface2 border-tv-border';
  const dirLabel = bullish ? '🟢 LONG' : bearish ? '🔴 SHORT' : '⚪ NEUTRAL';
  const confNum = parseFloat(confidence);

  return (
    <div className="text-xs text-tv-text-secondary">
      {/* Direction header */}
      <div className={`mx-3 mt-3 mb-3 p-3 rounded-lg border ${dirBg}`}>
        <div className={`text-2xl font-black ${dirColor}`}>{dirLabel}</div>
        <div className="flex items-center gap-3 mt-1">
          <div>
            <span className="text-tv-text-secondary text-xs">Conviction</span>
            <div className={`text-lg font-bold ${confNum >= 7 ? 'text-tv-green' : confNum >= 5 ? 'text-tv-orange' : 'text-tv-red'}`}>
              {confidence}/10
            </div>
          </div>
          <div className="flex-1">
            <div className="w-full bg-tv-surface rounded-full h-1.5 mt-1">
              <div
                className={`h-1.5 rounded-full ${confNum >= 7 ? 'bg-tv-green' : confNum >= 5 ? 'bg-tv-orange' : 'bg-tv-red'}`}
                style={{ width: `${Math.min(confNum * 10, 100)}%` }}
              />
            </div>
            <div className="text-xs text-tv-text-secondary mt-0.5">
              {result.modulesAgreed?.length || 0}/13 modules
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 space-y-3 pb-4">
        {/* Trade setup */}
        <div className="bg-tv-surface2 rounded-lg p-3 border border-tv-border/50 space-y-1.5">
          <div className="text-tv-text font-bold text-xs mb-2">🎯 TRADE SETUP</div>
          <div className="flex justify-between">
            <span>Entry Zone</span>
            <span className="text-tv-text font-mono font-medium">
              ${primary.entryZone[0]?.toFixed(2)} – ${primary.entryZone[1]?.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Target 1</span>
            <span className="text-tv-green font-mono font-bold">${primary.target1?.toFixed(2)}</span>
          </div>
          {primary.target2 > 0 && (
            <div className="flex justify-between">
              <span>Target 2</span>
              <span className="text-tv-green font-mono font-medium">${primary.target2?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-tv-border/30 pt-1.5 mt-1">
            <span>Invalidation</span>
            <span className="text-tv-red font-mono font-bold">${primary.invalidation?.toFixed(2)}</span>
          </div>
          {primary.target1 > 0 && primary.entryZone[0] > 0 && primary.invalidation > 0 && (
            <div className="flex justify-between text-tv-text-secondary">
              <span>Risk:Reward</span>
              <span className="font-medium">
                {bullish
                  ? `1:${((primary.target1 - primary.entryZone[0]) / Math.max(primary.entryZone[0] - primary.invalidation, 0.01)).toFixed(1)}`
                  : `1:${((primary.entryZone[1] - primary.target1) / Math.max(primary.invalidation - primary.entryZone[1], 0.01)).toFixed(1)}`
                }
              </span>
            </div>
          )}
        </div>

        {/* LLM/Rule narrative */}
        <div className="bg-tv-surface2 rounded-lg p-3 border border-tv-border/50">
          <div className="text-tv-text font-bold mb-1.5 flex items-center gap-2">
            📊 NARRATIVE
            {result.llmModel && result.llmModel !== 'rule-based' && (
              <span className="text-[10px] text-tv-green bg-tv-green/10 px-1.5 py-0.5 rounded font-normal">
                {result.llmModel}
              </span>
            )}
          </div>
          <div className="text-tv-text-secondary leading-relaxed whitespace-pre-wrap">
            {result.llmText || primary.explanation}
          </div>
        </div>

        {/* Key levels */}
        {result.keyLevels?.length > 0 && (
          <div>
            <div className="text-tv-text font-bold mb-2">📌 KEY LEVELS</div>
            <div className="space-y-1">
              {result.keyLevels.slice(0, 6).map((level: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="truncate text-tv-text-secondary">{level.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-tv-text-secondary">{(level.strength * 100).toFixed(0)}%</span>
                    <span className={`font-mono font-medium ${level.type === 'support' ? 'text-tv-green' : 'text-tv-red'}`}>
                      ${level.price?.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module confluence */}
        <div>
          <div className="text-tv-text font-bold mb-2">
            🧠 MODULES ({result.modulesAgreed?.length || 0}/13 agree)
          </div>
          <div className="space-y-1">
            {ALL_MODULES.map(mod => {
              const agreed = result.modulesAgreed?.includes(mod.id);
              return (
                <div key={mod.id} className="flex items-center gap-2">
                  <span className={agreed ? 'text-tv-green' : 'text-tv-text-secondary opacity-40'}>
                    {agreed ? '✓' : '✗'}
                  </span>
                  <span className={agreed ? 'text-tv-text' : 'text-tv-text-secondary opacity-40'}>
                    {mod.label}
                  </span>
                  <span className="ml-auto text-tv-text-secondary opacity-60">{mod.weight}x</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk flags */}
        {result.riskFlags?.length > 0 && (
          <div className="bg-tv-orange/10 border border-tv-orange/30 rounded-lg p-3">
            <div className="text-tv-orange font-bold mb-1">⚠️ RISK FLAGS</div>
            {result.riskFlags.map((flag: string, idx: number) => (
              <div key={idx} className="text-tv-orange">• {flag}</div>
            ))}
          </div>
        )}

        {/* Prediction ID */}
        {result.predictionId && (
          <div className="text-tv-text-secondary text-xs border-t border-tv-border pt-2 font-mono">
            🔬 Tracked: {result.predictionId.slice(0, 12)}...
          </div>
        )}
      </div>
    </div>
  );
};

const ALL_MODULES = [
  { id: 'mod_smc', label: 'Smart Money Concepts', weight: '1.82' },
  { id: 'mod_tjr', label: 'TJR Constitution', weight: '1.71' },
  { id: 'mod_wyckoff', label: 'Wyckoff Method', weight: '1.60' },
  { id: 'mod_volume_profile', label: 'Volume Profile', weight: '1.54' },
  { id: 'mod_ma_systems', label: 'MA Systems', weight: '1.31' },
  { id: 'mod_classical_ta', label: 'Classical TA', weight: '1.31' },
  { id: 'mod_momentum', label: 'Momentum (RSI/MACD)', weight: '1.18' },
  { id: 'mod_volatility', label: 'Volatility (BB/ATR)', weight: '1.10' },
  { id: 'mod_intermarket', label: 'Intermarket / DXY', weight: '0.95' },
  { id: 'mod_sentiment', label: 'Sentiment', weight: '0.85' },
  { id: 'mod_seasonality', label: 'Seasonality', weight: '0.72' },
  { id: 'mod_elliott', label: 'Elliott Wave', weight: '0.71' },
  { id: 'mod_orderflow', label: 'Order Flow', weight: '0.68' },
];
