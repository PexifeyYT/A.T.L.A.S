import React, { useState, useEffect, useRef } from 'react';
import { SymbolSearch } from './SymbolSearch';

interface TopToolbarProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  onAnalyze?: () => void;
  analyzing?: boolean;
  onScan?: () => void;
  scanning?: boolean;
  liveQuote?: { price: number; changePercent: number } | null;
  onReplayStart?: () => void;
  onReplayStop?: () => void;
  replayMode?: boolean;
  replayPlaying?: boolean;
  onReplayPlayPause?: () => void;
  onReplayStep?: () => void;
  replayIndex?: number;
  totalBars?: number;
  modulesAgreed?: number;
  onSettings?: () => void;
}

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1H', value: '1H' },
  { label: '2H', value: '2H' },
  { label: '4H', value: '4H' },
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
];

// SVG Icons matching TradingView's icon style
const IcoCandlestick = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <line x1="5" y1="3" x2="5" y2="5.5"/>
    <rect x="3.5" y="5.5" width="3" height="5" rx="0.5" fill="currentColor"/>
    <line x1="5" y1="10.5" x2="5" y2="14"/>
    <line x1="12" y1="5" x2="12" y2="7"/>
    <rect x="10.5" y="7" width="3" height="6" rx="0.5" fill="none" stroke="currentColor"/>
    <line x1="12" y1="13" x2="12" y2="15"/>
  </svg>
);

const IcoAlert = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2 L9 3.5"/>
    <path d="M3.5 6 Q3.5 2 9 2 Q14.5 2 14.5 6 L14.5 11 L16 13 L2 13 L3.5 11 Z"/>
    <path d="M6.5 13 Q6.5 15.5 9 15.5 Q11.5 15.5 11.5 13"/>
  </svg>
);

const IcoReplay = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9 Q3 4 9 4 Q13 4 15 8"/>
    <polyline points="12,3 15,8 10,8"/>
    <line x1="9" y1="9" x2="9" y2="14"/>
    <line x1="6" y1="11" x2="9" y2="14"/><line x1="12" y1="11" x2="9" y2="14"/>
  </svg>
);

const IcoSettings = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <circle cx="9" cy="9" r="2.5"/>
    <path d="M9 1.5 L9 3.5 M9 14.5 L9 16.5 M1.5 9 L3.5 9 M14.5 9 L16.5 9 M3.6 3.6 L5 5 M13 13 L14.4 14.4 M14.4 3.6 L13 5 M5 13 L3.6 14.4"/>
  </svg>
);

const IcoScan = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <circle cx="7.5" cy="7.5" r="5"/>
    <line x1="11.5" y1="11.5" x2="16" y2="16"/>
    <line x1="5" y1="7.5" x2="10" y2="7.5"/><line x1="7.5" y1="5" x2="7.5" y2="10"/>
  </svg>
);

const IcoPlay = () => (
  <svg viewBox="0 0 18 18" width="14" height="14" fill="currentColor" stroke="none">
    <path d="M5 3 L15 9 L5 15 Z"/>
  </svg>
);

const IcoPause = () => (
  <svg viewBox="0 0 18 18" width="14" height="14" fill="currentColor" stroke="none">
    <rect x="4" y="3" width="3.5" height="12" rx="1"/>
    <rect x="10.5" y="3" width="3.5" height="12" rx="1"/>
  </svg>
);

const IcoStep = () => (
  <svg viewBox="0 0 18 18" width="14" height="14" fill="currentColor" stroke="none">
    <path d="M4 3 L11 9 L4 15 Z"/>
    <rect x="12" y="3" width="2.5" height="12" rx="0.8"/>
  </svg>
);

export const TopToolbar: React.FC<TopToolbarProps> = ({
  symbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  onAnalyze,
  analyzing = false,
  onScan,
  scanning = false,
  liveQuote: quote = null,
  onReplayStart,
  onReplayStop,
  replayMode = false,
  replayPlaying = false,
  onReplayPlayPause,
  onReplayStep,
  replayIndex = 0,
  totalBars = 0,
  modulesAgreed = 0,
  onSettings,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showTfMenu, setShowTfMenu] = useState(false);
  const tfMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !showSearch) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSearch]);

  // Close TF menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tfMenuRef.current && !tfMenuRef.current.contains(e.target as Node)) {
        setShowTfMenu(false);
      }
    };
    if (showTfMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTfMenu]);

  const priceStr = quote
    ? quote.price > 1000
      ? quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : quote.price.toFixed(2)
    : null;

  const changePos = (quote?.changePercent ?? 0) >= 0;

  // Common button style
  const iconBtn = 'w-8 h-8 flex items-center justify-center rounded text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text transition-colors';

  return (
    <>
      <div className="flex items-center h-[46px] px-3 bg-tv-surface border-b border-tv-border gap-1 select-none flex-shrink-0">

        {/* Logo */}
        <div
          className="mr-2 shrink-0 select-none"
          style={{
            fontFamily: 'Georgia, "Times New Roman", Times, serif',
            fontSize: '17px',
            fontWeight: '400',
            color: '#d1d4dc',
            letterSpacing: '0.12em',
            lineHeight: 1,
          }}
        >
          A.T.L.A.S
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-tv-border mx-1 shrink-0" />

        {/* Symbol chip */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-1.5 px-2 h-7 rounded hover:bg-tv-surface2 transition-colors group shrink-0"
          title="Search symbol (/ or Ctrl+K)"
        >
          <span className="text-[13px] font-bold text-tv-text">{symbol}</span>
          <svg viewBox="0 0 10 6" width="8" height="5" fill="currentColor" className="text-tv-text-secondary group-hover:text-tv-text transition-colors">
            <path d="M0 0 L5 6 L10 0 Z"/>
          </svg>
        </button>

        {/* Live price badge */}
        {quote && priceStr && (
          <div className="flex items-center gap-1 px-1.5 h-6 rounded shrink-0">
            <span className="text-[12px] font-mono font-semibold text-tv-text">{priceStr}</span>
            <span className={`text-[11px] font-mono font-medium ${changePos ? 'text-tv-green' : 'text-tv-red'}`}>
              {changePos ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </span>
          </div>
        )}

        <div className="h-5 w-px bg-tv-border mx-1 shrink-0" />

        {/* Timeframe buttons */}
        <div className="flex items-center gap-px shrink-0">
          {TIMEFRAMES.slice(0, 7).map(tf => (
            <button
              key={tf.value}
              onClick={() => onTimeframeChange(tf.value)}
              className={`px-1.5 h-7 text-[12px] rounded font-medium transition-colors ${
                tf.value === timeframe
                  ? 'bg-tv-accent/20 text-tv-accent'
                  : 'text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text'
              }`}
            >
              {tf.label}
            </button>
          ))}
          {/* More timeframes dropdown */}
          <div className="relative" ref={tfMenuRef}>
            <button
              onClick={() => setShowTfMenu(v => !v)}
              className={`px-1.5 h-7 text-[12px] rounded font-medium transition-colors ${
                ['1D', '1W', '1M'].includes(timeframe)
                  ? 'bg-tv-accent/20 text-tv-accent'
                  : 'text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text'
              }`}
            >
              {['1D', '1W', '1M'].includes(timeframe) ? timeframe : '▾'}
            </button>
            {showTfMenu && (
              <div className="absolute top-full left-0 mt-1 bg-tv-surface border border-tv-border rounded-lg shadow-xl z-50 py-1 min-w-[100px]">
                {TIMEFRAMES.slice(7).map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => { onTimeframeChange(tf.value); setShowTfMenu(false); }}
                    className={`w-full px-4 py-1.5 text-left text-sm transition-colors ${
                      tf.value === timeframe
                        ? 'text-tv-accent bg-tv-accent/10'
                        : 'text-tv-text hover:bg-tv-surface2'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-5 w-px bg-tv-border mx-1 shrink-0" />

        {/* Chart type (candlestick) */}
        <button className={iconBtn} title="Chart type: Candlestick">
          <IcoCandlestick />
        </button>

        <div className="h-5 w-px bg-tv-border mx-1 shrink-0" />

        {/* Indicators / Analyze */}
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          title="Run ATLAS analysis (A)"
          className={`flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium rounded transition-colors ${
            analyzing
              ? 'text-tv-text-secondary opacity-60 cursor-not-allowed'
              : 'text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text'
          }`}
        >
          {analyzing ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-tv-accent border-t-transparent rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M2 14 L5 9 L8 11 L11 5 L14 8 L16 6"/>
                <circle cx="16" cy="6" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
              <span>Indicators</span>
              {modulesAgreed > 0 && (
                <span className="bg-tv-accent text-white text-[10px] font-bold px-1 rounded leading-none py-px">
                  {modulesAgreed}
                </span>
              )}
            </>
          )}
        </button>

        {/* Alert */}
        <button className={iconBtn} title="Create alert">
          <IcoAlert />
        </button>

        {/* Separator */}
        <div className="h-5 w-px bg-tv-border mx-1 shrink-0" />

        {/* Replay */}
        {!replayMode ? (
          <button
            onClick={onReplayStart}
            className={iconBtn}
            title="Bar replay"
          >
            <IcoReplay />
          </button>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-tv-orange font-semibold animate-pulse mr-1">● REPLAY</span>
            <span className="text-[11px] text-tv-text-secondary font-mono tabular-nums mr-1">
              {replayIndex}/{totalBars}
            </span>
            <button
              onClick={onReplayPlayPause}
              className="w-7 h-7 flex items-center justify-center rounded bg-tv-accent/20 text-tv-accent hover:bg-tv-accent/30 transition-colors"
              title={replayPlaying ? 'Pause' : 'Play'}
            >
              {replayPlaying ? <IcoPause /> : <IcoPlay />}
            </button>
            <button
              onClick={onReplayStep}
              className={`${iconBtn} text-tv-text`}
              title="Step forward"
            >
              <IcoStep />
            </button>
            <button
              onClick={onReplayStop}
              className="w-7 h-7 flex items-center justify-center rounded text-tv-red hover:bg-tv-red/10 transition-colors text-xs font-bold"
              title="Exit replay"
            >
              ✕
            </button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Scan */}
        <button
          onClick={onScan}
          disabled={scanning}
          title="Scan all symbols"
          className={`flex items-center gap-1.5 px-2.5 h-7 text-[12px] font-medium rounded border transition-colors ${
            scanning
              ? 'border-tv-border text-tv-text-secondary opacity-60 cursor-not-allowed'
              : 'border-tv-orange/40 text-tv-orange hover:bg-tv-orange/10'
          }`}
        >
          {scanning ? (
            <><span className="inline-block w-3 h-3 border-2 border-tv-orange border-t-transparent rounded-full animate-spin" /><span>Scanning</span></>
          ) : (
            <><IcoScan /><span>Scan</span></>
          )}
        </button>

        <div className="h-5 w-px bg-tv-border mx-2 shrink-0" />

        {/* Settings */}
        <button className={iconBtn} title="Settings" onClick={onSettings}>
          <IcoSettings />
        </button>
      </div>

      {showSearch && (
        <SymbolSearch onSelect={onSymbolChange} onClose={() => setShowSearch(false)} />
      )}
    </>
  );
};
