import React, { useState, useEffect } from 'react';
import { SymbolSearch } from './SymbolSearch';
import { SettingsModal } from './SettingsModal';

interface TopToolbarProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  onAnalyze?: () => void;
  analyzing?: boolean;
  onScan?: () => void;
  scanning?: boolean;
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '2H', '4H', '1D', '1W', '1M'];

export const TopToolbar: React.FC<TopToolbarProps> = ({
  symbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  onAnalyze,
  analyzing = false,
  onScan,
  scanning = false,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quote, setQuote] = useState<{ price: number; changePercent: number } | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const r = await window.api.fetchLiveQuote(symbol);
        if (active && r.success && r.data) setQuote({ price: r.data.price, changePercent: r.data.changePercent });
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [symbol]);

  // Global hotkey: / or Ctrl+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !showSearch) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSearch]);

  return (
    <>
      <div className="flex items-center gap-2 h-12 px-4 bg-tv-surface border-b border-tv-border">
        {/* Logo */}
        <div className="text-base font-bold text-tv-accent tracking-widest mr-2">ATLAS</div>

        {/* Symbol button — opens overlay */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-tv-surface2 border border-tv-border rounded hover:border-tv-accent transition-colors text-sm font-bold text-tv-text min-w-[100px]"
          title="Search symbol (/ or Ctrl+K)"
        >
          <span>{symbol}</span>
          <span className="text-tv-text-secondary text-xs">▼</span>
        </button>

        {/* Timeframe buttons */}
        <div className="flex items-center gap-0.5 border-l border-tv-border pl-3">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                tf === timeframe
                  ? 'bg-tv-accent/20 text-tv-accent font-semibold'
                  : 'text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Live price in toolbar */}
        {quote && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-tv-surface2 rounded border border-tv-border ml-2">
            <span className="text-tv-text text-xs font-mono font-semibold">{quote.price.toFixed(2)}</span>
            <span className={`text-xs font-mono ${quote.changePercent >= 0 ? 'text-tv-green' : 'text-tv-red'}`}>
              {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onScan}
            disabled={scanning}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              scanning
                ? 'opacity-50 cursor-not-allowed border-tv-border text-tv-text-secondary'
                : 'border-tv-orange/50 text-tv-orange hover:bg-tv-orange/10'
            }`}
          >
            {scanning ? '⏳ SCANNING...' : '📋 SCAN ALL'}
          </button>

          <button
            onClick={onAnalyze}
            disabled={analyzing}
            title="Run analysis (A)"
            className={`px-4 py-1.5 text-xs rounded font-bold transition-colors ${
              analyzing
                ? 'opacity-50 cursor-not-allowed bg-tv-surface2 text-tv-text-secondary'
                : 'bg-tv-accent text-white hover:bg-blue-500'
            }`}
          >
            {analyzing ? '⏳ ANALYZING...' : '🤖 ANALYZE'}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            title="Settings (API Keys)"
            className="w-8 h-8 flex items-center justify-center text-tv-text-secondary hover:text-tv-text hover:bg-tv-surface2 rounded transition-colors text-base"
          >
            ⚙
          </button>
        </div>
      </div>

      {showSearch && (
        <SymbolSearch
          onSelect={onSymbolChange}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
};
