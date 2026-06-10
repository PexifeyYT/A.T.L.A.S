import React, { useState, useEffect, useCallback } from 'react';
import { PerformancePanel } from './PerformancePanel';

type RightTab = 'watchlist' | 'signal' | 'performance';

interface RightPanelProps {
  analysisResult?: any;
  analysisLoading?: boolean;
  analysisError?: string | null;
  symbol?: string;
  timeframe?: string;
  onSymbolSelect?: (sym: string) => void;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

const DEFAULT_WATCHLIST = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta', exchange: 'NASDAQ' },
  { symbol: 'SPY', name: 'S&P 500 ETF', exchange: 'NYSE' },
  { symbol: 'QQQ', name: 'Nasdaq ETF', exchange: 'NASDAQ' },
  { symbol: 'BTC-USD', name: 'Bitcoin', exchange: 'Crypto' },
];

interface QuoteData { price: number; changePercent: number; change: number }

const WatchlistRow: React.FC<{
  item: { symbol: string; name: string; exchange: string };
  data?: QuoteData;
  active: boolean;
  onClick: () => void;
}> = ({ item, data, active, onClick }) => {
  const up = (data?.changePercent ?? 0) >= 0;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-2.5 border-b border-tv-border/30 transition-colors text-left ${
        active ? 'bg-tv-accent/10' : 'hover:bg-tv-surface2'
      }`}
    >
      {/* Exchange dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 mr-2 ${
        item.exchange === 'Crypto' ? 'bg-tv-green' :
        item.exchange === 'NYSE' ? 'bg-tv-orange' : 'bg-tv-accent'
      }`} />
      {/* Symbol + name */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-tv-text leading-tight">{item.symbol}</div>
        <div className="text-[11px] text-tv-text-secondary truncate leading-tight">{item.name}</div>
      </div>
      {/* Price + change */}
      <div className="text-right shrink-0 ml-2">
        {data ? (
          <>
            <div className="text-[13px] font-mono font-semibold text-tv-text leading-tight">
              {data.price > 1000
                ? data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : data.price.toFixed(2)}
            </div>
            <div className={`text-[11px] font-medium leading-tight ${up ? 'text-tv-green' : 'text-tv-red'}`}>
              {up ? '+' : ''}{data.changePercent.toFixed(2)}%
            </div>
          </>
        ) : (
          <div className="text-[13px] text-tv-text-secondary animate-pulse">—</div>
        )}
      </div>
    </button>
  );
};

const WatchlistPanel: React.FC<{
  currentSymbol: string;
  onSelect: (sym: string) => void;
}> = ({ currentSymbol, onSelect }) => {
  const [prices, setPrices] = useState<Record<string, QuoteData>>({});

  const fetchAll = useCallback(async () => {
    const updates: Record<string, QuoteData> = {};
    await Promise.allSettled(
      DEFAULT_WATCHLIST.map(async ({ symbol }) => {
        try {
          const res = await window.api.fetchLiveQuote(symbol);
          if (res.success && res.data) {
            updates[symbol] = {
              price: res.data.price,
              changePercent: res.data.changePercent,
              change: res.data.change ?? 0,
            };
          }
        } catch {}
      })
    );
    if (Object.keys(updates).length > 0) {
      setPrices(prev => ({ ...prev, ...updates }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div className="flex-1 overflow-y-auto">
      {DEFAULT_WATCHLIST.map(item => (
        <WatchlistRow
          key={item.symbol}
          item={item}
          data={prices[item.symbol]}
          active={item.symbol === currentSymbol}
          onClick={() => onSelect(item.symbol)}
        />
      ))}
    </div>
  );
};

// ─── Signal Panel ─────────────────────────────────────────────────────────────

const SignalPanel: React.FC<{
  result?: any;
  loading?: boolean;
  error?: string | null;
}> = ({ result, loading, error }) => {
  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-4 h-4 border-2 border-tv-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-tv-text-secondary">Running 13 modules...</span>
        </div>
        <div className="space-y-2">
          {['SMC', 'TJR', 'Wyckoff', 'Volume Profile', 'MA Systems', 'Momentum', 'Elliott Wave'].map(m => (
            <div key={m} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-tv-accent rounded-full animate-pulse" />
              <span className="text-[12px] text-tv-text-secondary">{m}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-[13px] text-tv-red font-semibold mb-1">Analysis Error</div>
        <div className="text-[12px] text-tv-text-secondary">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4">
        <div className="text-[13px] font-semibold text-tv-text mb-2">ATLAS Signal</div>
        <div className="text-[12px] text-tv-text-secondary leading-relaxed mb-3">
          Press <kbd className="bg-tv-surface2 text-tv-text px-1 rounded text-[11px]">A</kbd> or click{' '}
          <span className="text-tv-accent">Indicators</span> to run all 13 strategy modules in parallel.
        </div>
        <div className="space-y-1.5">
          {[
            ['mod_smc', 'Smart Money Concepts', '1.82×'],
            ['mod_tjr', 'TJR Constitution', '1.71×'],
            ['mod_wyckoff', 'Wyckoff Method', '1.60×'],
            ['mod_volume_profile', 'Volume Profile', '1.54×'],
            ['mod_ma_systems', 'MA Systems', '1.31×'],
          ].map(([, label, weight]) => (
            <div key={label} className="flex items-center justify-between text-[12px]">
              <span className="text-tv-text-secondary">◆ {label}</span>
              <span className="text-tv-text-secondary/50 font-mono text-[11px]">{weight}</span>
            </div>
          ))}
          <div className="text-[11px] text-tv-text-secondary/50 italic">+ 8 more modules</div>
        </div>
      </div>
    );
  }

  const sig = result.primarySignal;
  const conf = (result.confidence || 0);
  const bullish = sig.direction === 'LONG';
  const bearish = sig.direction === 'SHORT';

  const dirColor = bullish ? 'text-tv-green' : bearish ? 'text-tv-red' : 'text-tv-text-secondary';
  const dirBg = bullish ? 'bg-tv-green/10 border-tv-green/30' : bearish ? 'bg-tv-red/10 border-tv-red/30' : 'bg-tv-surface2 border-tv-border';
  const confColor = conf >= 7 ? 'text-tv-green' : conf >= 4.5 ? 'text-tv-orange' : 'text-tv-red';

  return (
    <div className="overflow-y-auto">
      {/* Direction header */}
      <div className={`mx-2.5 mt-2.5 p-2.5 rounded-lg border ${dirBg}`}>
        <div className={`text-[18px] font-black leading-none ${dirColor}`}>
          {bullish ? '▲ LONG' : bearish ? '▼ SHORT' : '— NEUTRAL'}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <div>
            <div className={`text-[16px] font-bold tabular-nums leading-none ${confColor}`}>
              {conf.toFixed(1)}<span className="text-[11px] font-normal text-tv-text-secondary">/10</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="w-full bg-tv-bg rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${conf >= 7 ? 'bg-tv-green' : conf >= 4.5 ? 'bg-tv-orange' : 'bg-tv-red'}`}
                style={{ width: `${Math.min(conf * 10, 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-tv-text-secondary mt-0.5">
              {result.modulesAgreed?.length ?? 0}/13 modules agreed
            </div>
          </div>
        </div>
      </div>

      {/* Trade setup */}
      <div className="mx-2.5 mt-2 bg-tv-surface2 rounded-lg p-2.5 border border-tv-border/40">
        <div className="text-[11px] font-bold text-tv-text-secondary uppercase tracking-wider mb-2">Trade Setup</div>
        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between">
            <span className="text-tv-text-secondary">Entry</span>
            <span className="font-mono text-tv-text">
              ${sig.entryZone[0]?.toFixed(2)} – ${sig.entryZone[1]?.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-tv-text-secondary">Target 1</span>
            <span className="font-mono font-bold text-tv-green">${sig.target1?.toFixed(2)}</span>
          </div>
          {sig.target2 > 0 && (
            <div className="flex justify-between">
              <span className="text-tv-text-secondary">Target 2</span>
              <span className="font-mono text-tv-green">${sig.target2?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-tv-border/30 pt-1.5">
            <span className="text-tv-text-secondary">Stop</span>
            <span className="font-mono font-bold text-tv-red">${sig.invalidation?.toFixed(2)}</span>
          </div>
          {sig.target1 > 0 && sig.entryZone[0] > 0 && sig.invalidation > 0 && (
            <div className="flex justify-between">
              <span className="text-tv-text-secondary">R:R</span>
              <span className="font-mono font-medium text-tv-text">
                1:{bullish
                  ? ((sig.target1 - sig.entryZone[0]) / Math.max(sig.entryZone[0] - sig.invalidation, 0.01)).toFixed(1)
                  : ((sig.entryZone[1] - sig.target1) / Math.max(sig.invalidation - sig.entryZone[1], 0.01)).toFixed(1)
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Module confluence grid */}
      <div className="mx-2.5 mt-2">
        <div className="text-[11px] font-bold text-tv-text-secondary uppercase tracking-wider mb-1.5">
          Modules ({result.modulesAgreed?.length ?? 0}/13)
        </div>
        <div className="space-y-0.5">
          {ALL_MODULES.map(mod => {
            const agreed = result.modulesAgreed?.includes(mod.id);
            return (
              <div key={mod.id} className="flex items-center gap-1.5 text-[11px]">
                <span className={agreed ? 'text-tv-green' : 'text-tv-border'}>
                  {agreed ? '✓' : '×'}
                </span>
                <span className={agreed ? 'text-tv-text' : 'text-tv-text-secondary/40'}>
                  {mod.label}
                </span>
                <span className="ml-auto font-mono text-[10px] text-tv-text-secondary/50">{mod.weight}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key levels */}
      {result.keyLevels?.length > 0 && (
        <div className="mx-2.5 mt-2 mb-1">
          <div className="text-[11px] font-bold text-tv-text-secondary uppercase tracking-wider mb-1.5">Key Levels</div>
          <div className="space-y-1">
            {result.keyLevels.slice(0, 5).map((lvl: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-tv-text-secondary truncate">{lvl.label}</span>
                <span className={`font-mono font-medium ${lvl.type === 'support' ? 'text-tv-green' : 'text-tv-red'}`}>
                  ${lvl.price?.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk flags */}
      {result.riskFlags?.length > 0 && (
        <div className="mx-2.5 mt-2 mb-2 bg-tv-orange/10 border border-tv-orange/30 rounded-lg p-2.5">
          <div className="text-[11px] font-bold text-tv-orange mb-1">⚠ Risk Flags</div>
          {result.riskFlags.map((f: string, i: number) => (
            <div key={i} className="text-[11px] text-tv-orange">• {f}</div>
          ))}
        </div>
      )}

      {/* Narrative */}
      {result.llmText && (
        <div className="mx-2.5 mt-2 mb-3">
          <div className="text-[11px] font-bold text-tv-text-secondary uppercase tracking-wider mb-1.5">Narrative</div>
          <div className="text-[11px] text-tv-text-secondary leading-relaxed whitespace-pre-wrap">
            {result.llmText.slice(0, 600)}{result.llmText.length > 600 ? '…' : ''}
          </div>
        </div>
      )}

      {result.predictionId && (
        <div className="mx-2.5 pb-3 text-[10px] text-tv-text-secondary/40 font-mono">
          Tracked: {result.predictionId.slice(0, 12)}…
        </div>
      )}
    </div>
  );
};

const ALL_MODULES = [
  { id: 'mod_smc', label: 'Smart Money', weight: '1.82×' },
  { id: 'mod_tjr', label: 'TJR', weight: '1.71×' },
  { id: 'mod_wyckoff', label: 'Wyckoff', weight: '1.60×' },
  { id: 'mod_volume_profile', label: 'Volume Profile', weight: '1.54×' },
  { id: 'mod_ma_systems', label: 'MA Systems', weight: '1.31×' },
  { id: 'mod_classical_ta', label: 'Classical TA', weight: '1.31×' },
  { id: 'mod_momentum', label: 'Momentum', weight: '1.18×' },
  { id: 'mod_volatility', label: 'Volatility', weight: '1.10×' },
  { id: 'mod_intermarket', label: 'Intermarket', weight: '0.95×' },
  { id: 'mod_sentiment', label: 'Sentiment', weight: '0.85×' },
  { id: 'mod_seasonality', label: 'Seasonality', weight: '0.72×' },
  { id: 'mod_elliott', label: 'Elliott Wave', weight: '0.71×' },
  { id: 'mod_orderflow', label: 'Order Flow', weight: '0.68×' },
];

// ─── Tab Icon Buttons ─────────────────────────────────────────────────────────

const TabBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; title: string }> = ({
  active, onClick, children, title,
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex-1 py-2 text-[11px] font-medium border-b-2 transition-colors flex flex-col items-center gap-0.5 ${
      active
        ? 'border-tv-accent text-tv-accent'
        : 'border-transparent text-tv-text-secondary hover:text-tv-text hover:border-tv-border'
    }`}
  >
    {children}
  </button>
);

// ─── Main RightPanel ──────────────────────────────────────────────────────────

export const RightPanel: React.FC<RightPanelProps> = ({
  analysisResult,
  analysisLoading,
  analysisError,
  symbol = 'AAPL',
  timeframe = '1D',
  onSymbolSelect,
}) => {
  const [tab, setTab] = useState<RightTab>('watchlist');

  // Auto-switch to signal tab when analysis completes
  useEffect(() => {
    if (analysisResult && !analysisLoading) setTab('signal');
  }, [analysisResult, analysisLoading]);

  return (
    <div className="w-[280px] bg-tv-surface border-l border-tv-border flex flex-col overflow-hidden shrink-0">
      {/* Tab header — TV-style */}
      <div className="flex border-b border-tv-border bg-tv-surface shrink-0">
        <TabBtn active={tab === 'watchlist'} onClick={() => setTab('watchlist')} title="Watchlist">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <line x1="3" y1="4" x2="13" y2="4"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="3" y1="12" x2="10" y2="12"/>
          </svg>
          <span>Watchlist</span>
        </TabBtn>
        <TabBtn active={tab === 'signal'} onClick={() => setTab('signal')} title="Analysis signal">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M2 12 L5 7 L8 9 L11 4 L14 7"/>
            <circle cx="14" cy="7" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
          <span>
            Signal
            {analysisLoading && <span className="ml-1 inline-block w-2 h-2 border border-tv-accent border-t-transparent rounded-full animate-spin" />}
            {analysisResult && !analysisLoading && (
              <span className="ml-1 text-[10px] font-bold text-tv-accent">
                {analysisResult.primarySignal?.direction === 'LONG' ? '▲' : analysisResult.primarySignal?.direction === 'SHORT' ? '▼' : '—'}
              </span>
            )}
          </span>
        </TabBtn>
        <TabBtn active={tab === 'performance'} onClick={() => setTab('performance')} title="Performance & weights">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <rect x="2" y="9" width="3" height="5" rx="0.5"/>
            <rect x="6.5" y="5" width="3" height="9" rx="0.5"/>
            <rect x="11" y="2" width="3" height="12" rx="0.5"/>
          </svg>
          <span>Stats</span>
        </TabBtn>
      </div>

      {/* Watchlist header */}
      {tab === 'watchlist' && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-tv-border shrink-0">
          <span className="text-[12px] font-bold text-tv-text">My Watchlist</span>
          <div className="flex items-center gap-1">
            <button className="w-6 h-6 flex items-center justify-center rounded text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text transition-colors text-sm" title="Add symbol">+</button>
            <button className="w-6 h-6 flex items-center justify-center rounded text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text transition-colors" title="List view">
              <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                <line x1="2" y1="4" x2="12" y2="4"/><line x1="2" y1="7" x2="12" y2="7"/><line x1="2" y1="10" x2="12" y2="10"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'watchlist' && (
          <WatchlistPanel currentSymbol={symbol} onSelect={sym => { onSymbolSelect?.(sym); }} />
        )}
        {tab === 'signal' && (
          <SignalPanel result={analysisResult} loading={analysisLoading} error={analysisError} />
        )}
        {tab === 'performance' && <PerformancePanel />}
      </div>
    </div>
  );
};
