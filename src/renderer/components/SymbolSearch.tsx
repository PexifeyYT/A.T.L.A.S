import React, { useState, useEffect, useRef, useCallback } from 'react';

const POPULAR = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms', type: 'Stock', exchange: 'NASDAQ' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETF', exchange: 'NYSE' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF', exchange: 'NASDAQ' },
  { symbol: 'BTC-USD', name: 'Bitcoin USD', type: 'Crypto', exchange: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum USD', type: 'Crypto', exchange: 'Crypto' },
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
  Index: 'text-yellow-400',
  Fund: 'text-pink-400',
};

interface SymbolItem { symbol: string; name: string; type: string; exchange: string }

interface SymbolSearchProps {
  onSelect: (symbol: string) => void;
  onClose: () => void;
}

export const SymbolSearch: React.FC<SymbolSearchProps> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [results, setResults] = useState<SymbolItem[]>(POPULAR);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(POPULAR);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const res = await window.api.searchSymbols(q.trim());
      if (res.success && res.data.length > 0) {
        setResults(res.data);
      } else {
        // fallback: filter popular list
        const filtered = POPULAR.filter(
          s => s.symbol.toLowerCase().includes(q.toLowerCase()) ||
               s.name.toLowerCase().includes(q.toLowerCase())
        );
        setResults(filtered);
      }
    } catch {
      const filtered = POPULAR.filter(
        s => s.symbol.toLowerCase().includes(q.toLowerCase()) ||
             s.name.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    setSelected(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[selected]) {
        onSelect(results[selected].symbol);
        onClose();
      } else if (query.trim()) {
        onSelect(query.trim().toUpperCase());
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'rgba(19,23,34,0.88)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl bg-tv-surface border border-tv-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-tv-border">
          <span className="text-tv-text-secondary text-base">
            {searching ? (
              <span className="inline-block w-4 h-4 border-2 border-tv-accent border-t-transparent rounded-full animate-spin" />
            ) : '🔍'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search symbol, name, or crypto..."
            className="flex-1 bg-transparent text-tv-text text-sm outline-none placeholder-tv-text-secondary"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-tv-text-secondary hover:text-tv-text text-sm px-1">
              ✕
            </button>
          )}
        </div>

        {!query && (
          <div className="px-4 pt-2 pb-1">
            <span className="text-xs text-tv-text-secondary uppercase tracking-wider font-semibold">Popular</span>
          </div>
        )}

        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {results.length === 0 && !searching ? (
            <div className="px-4 py-6 text-tv-text-secondary text-sm text-center">
              No results for "{query}".{' '}
              <button
                onClick={() => { onSelect(query.trim().toUpperCase()); onClose(); }}
                className="text-tv-accent hover:underline"
              >
                Load "{query.toUpperCase()}" anyway
              </button>
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={`${item.symbol}-${idx}`}
                onClick={() => { onSelect(item.symbol); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === selected ? 'bg-tv-accent/10 border-l-2 border-tv-accent' : 'hover:bg-tv-surface2 border-l-2 border-transparent'
                }`}
              >
                <div className="w-20 font-bold text-sm text-tv-text shrink-0">{item.symbol}</div>
                <div className="flex-1 text-xs text-tv-text-secondary truncate">{item.name}</div>
                <div className={`text-xs font-semibold shrink-0 ${TYPE_COLORS[item.type] ?? 'text-tv-text-secondary'}`}>
                  {item.type}
                </div>
                <div className="text-xs text-tv-text-secondary w-16 text-right shrink-0 truncate">{item.exchange}</div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-tv-border text-xs text-tv-text-secondary flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
          <span className="ml-auto opacity-60">Yahoo Finance search</span>
        </div>
      </div>
    </div>
  );
};
