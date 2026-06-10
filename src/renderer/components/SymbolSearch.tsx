import React, { useState, useEffect, useRef } from 'react';

const SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETF', exchange: 'NYSE' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF', exchange: 'NASDAQ' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'ETF', exchange: 'NYSE' },
  { symbol: 'BTC-USD', name: 'Bitcoin USD', type: 'Crypto', exchange: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum USD', type: 'Crypto', exchange: 'Crypto' },
  { symbol: 'SOL-USD', name: 'Solana USD', type: 'Crypto', exchange: 'Crypto' },
  { symbol: 'GC=F', name: 'Gold Futures', type: 'Futures', exchange: 'COMEX' },
  { symbol: 'CL=F', name: 'Crude Oil Futures', type: 'Futures', exchange: 'NYMEX' },
  { symbol: 'DX-Y.NYB', name: 'US Dollar Index', type: 'Forex', exchange: 'ICE' },
];

const TYPE_COLORS: Record<string, string> = {
  Stock: 'text-tv-accent',
  ETF: 'text-tv-orange',
  Crypto: 'text-tv-green',
  Futures: 'text-tv-text-secondary',
  Forex: 'text-purple-400',
};

interface SymbolSearchProps {
  onSelect: (symbol: string) => void;
  onClose: () => void;
}

export const SymbolSearch: React.FC<SymbolSearchProps> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? SYMBOLS.filter(
        s =>
          s.symbol.toLowerCase().includes(query.toLowerCase()) ||
          s.name.toLowerCase().includes(query.toLowerCase()),
      )
    : SYMBOLS;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      if (filtered[selected]) {
        onSelect(filtered[selected].symbol);
        onClose();
      } else if (query.trim()) {
        onSelect(query.trim().toUpperCase());
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'rgba(19,23,34,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl bg-tv-surface border border-tv-border rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-tv-border">
          <span className="text-tv-text-secondary text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search symbol or name..."
            className="flex-1 bg-transparent text-tv-text text-sm outline-none placeholder-tv-text-secondary"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-tv-text-secondary hover:text-tv-text text-sm">
              ✕
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-tv-text-secondary text-sm text-center">
              No results. Press Enter to load "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.symbol}
                onClick={() => { onSelect(item.symbol); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === selected ? 'bg-tv-accent/10' : 'hover:bg-tv-surface2'
                }`}
              >
                <div className="w-20 font-bold text-sm text-tv-text">{item.symbol}</div>
                <div className="flex-1 text-xs text-tv-text-secondary truncate">{item.name}</div>
                <div className={`text-xs font-medium ${TYPE_COLORS[item.type] ?? 'text-tv-text-secondary'}`}>
                  {item.type}
                </div>
                <div className="text-xs text-tv-text-secondary w-16 text-right">{item.exchange}</div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-tv-border text-xs text-tv-text-secondary flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
};
