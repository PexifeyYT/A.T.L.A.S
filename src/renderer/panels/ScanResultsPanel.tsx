import React from 'react';

interface ScanResult {
  symbol: string;
  primarySignal: {
    direction: 'LONG' | 'SHORT' | 'NEUTRAL';
    confidence: number;
    entryZone: [number, number];
    target1: number;
    invalidation: number;
  };
  confidence: number;
  modulesAgreed: string[];
}

interface ScanResultsPanelProps {
  results: ScanResult[];
  scanning: boolean;
  timeframe: string;
  onSelectSymbol: (symbol: string) => void;
  onClose: () => void;
}

export const ScanResultsPanel: React.FC<ScanResultsPanelProps> = ({
  results,
  scanning,
  timeframe,
  onSelectSymbol,
  onClose,
}) => {
  const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
  const longs = sorted.filter(r => r.primarySignal.direction === 'LONG');
  const shorts = sorted.filter(r => r.primarySignal.direction === 'SHORT');
  const neutral = sorted.filter(r => r.primarySignal.direction === 'NEUTRAL');

  return (
    <div className="w-96 bg-tv-surface border-l border-tv-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tv-border">
        <div>
          <div className="text-sm font-bold text-tv-text">ATLAS SCAN — {timeframe}</div>
          <div className="text-xs text-tv-text-secondary">
            {scanning ? 'Scanning...' : `${results.length} symbols analyzed`}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-tv-text-secondary hover:text-tv-text text-sm transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {scanning && results.length === 0 && (
          <div className="p-4 text-tv-text-secondary text-sm text-center animate-pulse">
            Running 13 modules across watchlist...
          </div>
        )}

        {/* Bullish signals */}
        {longs.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-xs font-bold text-tv-green bg-tv-green/5 border-b border-tv-border">
              🟢 BULLISH SETUPS ({longs.length})
            </div>
            {longs.map(r => (
              <ScanRow key={r.symbol} result={r} onSelect={onSelectSymbol} />
            ))}
          </div>
        )}

        {/* Bearish signals */}
        {shorts.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-xs font-bold text-tv-red bg-tv-red/5 border-b border-tv-border">
              🔴 BEARISH SETUPS ({shorts.length})
            </div>
            {shorts.map(r => (
              <ScanRow key={r.symbol} result={r} onSelect={onSelectSymbol} />
            ))}
          </div>
        )}

        {/* Neutral */}
        {neutral.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-xs font-bold text-tv-text-secondary border-b border-tv-border">
              ⚪ NO SETUP ({neutral.length})
            </div>
            {neutral.map(r => (
              <ScanRow key={r.symbol} result={r} onSelect={onSelectSymbol} />
            ))}
          </div>
        )}
      </div>

      {!scanning && results.length > 0 && (
        <div className="px-4 py-2 border-t border-tv-border text-xs text-tv-text-secondary">
          {longs.length} long · {shorts.length} short · {neutral.length} neutral
        </div>
      )}
    </div>
  );
};

const ScanRow: React.FC<{ result: ScanResult; onSelect: (sym: string) => void }> = ({
  result,
  onSelect,
}) => {
  const sig = result.primarySignal;
  const isLong = sig.direction === 'LONG';
  const isShort = sig.direction === 'SHORT';
  const confidence = result.confidence.toFixed(1);
  const confColor =
    result.confidence >= 7 ? 'text-tv-green' :
    result.confidence >= 5 ? 'text-tv-orange' : 'text-tv-red';

  return (
    <button
      onClick={() => onSelect(result.symbol)}
      className="w-full px-3 py-2.5 border-b border-tv-border/50 hover:bg-tv-surface2 text-left transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm text-tv-text">{result.symbol}</span>
        <span className={`text-xs font-bold ${confColor}`}>{confidence}/10</span>
      </div>
      <div className="flex items-center justify-between text-xs text-tv-text-secondary">
        <span>
          {isLong ? '🟢' : isShort ? '🔴' : '⚪'}{' '}
          Entry ${(isShort ? sig.entryZone[1] : sig.entryZone[0]).toFixed(2)}
        </span>
        <span className="text-tv-green">T1 ${sig.target1.toFixed(2)}</span>
        <span className="text-tv-red">INV ${sig.invalidation.toFixed(2)}</span>
      </div>
      <div className="mt-1 text-xs text-tv-text-secondary">
        {result.modulesAgreed.length}/13 modules agree
      </div>
    </button>
  );
};
