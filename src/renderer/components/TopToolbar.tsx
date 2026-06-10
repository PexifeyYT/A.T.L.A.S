import React, { useState } from 'react';
import { SymbolSearch } from './SymbolSearch';

interface TopToolbarProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  onAnalyze?: () => void;
  analyzing?: boolean;
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '2H', '4H', '1D', '1W', '1M'];

export const TopToolbar: React.FC<TopToolbarProps> = ({
  symbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  onAnalyze,
  analyzing = false,
}) => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="flex items-center gap-4 h-12 px-4 bg-tv-surface border-b border-tv-border">
      {/* Logo */}
      <div className="text-lg font-bold text-tv-accent">ATLAS</div>

      {/* Symbol Search */}
      <div className="flex-1 max-w-xs relative">
        <SymbolSearch
          value={symbol}
          onChange={(sym) => {
            onSymbolChange(sym);
            setShowSearch(false);
          }}
          onFocus={() => setShowSearch(true)}
          onBlur={() => setTimeout(() => setShowSearch(false), 200)}
        />
      </div>

      {/* Timeframe buttons */}
      <div className="flex items-center gap-2 border-l border-tv-border pl-4">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className={`toolbar-button ${tf === timeframe ? 'active' : ''}`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-l border-tv-border pl-4 ml-auto">
        <button className="toolbar-button" title="Indicators">
          📊 Indicators
        </button>
        <button className="toolbar-button" title="Alerts">
          🔔 Alerts
        </button>
        <button className="toolbar-button" title="Replay">
          ⏮ Replay
        </button>
        <button className="toolbar-button" title="Undo">
          ↶
        </button>
        <button className="toolbar-button" title="Redo">
          ↷
        </button>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className={`toolbar-button font-bold ${analyzing ? 'opacity-50 cursor-not-allowed' : 'bg-tv-accent text-tv-bg hover:bg-blue-600'}`}
        >
          🤖 {analyzing ? 'ANALYZING...' : 'ANALYZE'}
        </button>
        <button className="toolbar-button">
          📋 SCAN
        </button>
      </div>
    </div>
  );
};
