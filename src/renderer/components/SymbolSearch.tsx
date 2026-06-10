import React, { useState, useEffect } from 'react';

interface SymbolSearchProps {
  value: string;
  onChange: (symbol: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'BTC', 'ETH'];

export const SymbolSearch: React.FC<SymbolSearchProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toUpperCase();
    setQuery(q);

    if (q.length === 0) {
      setResults(POPULAR_SYMBOLS);
    } else {
      const filtered = POPULAR_SYMBOLS.filter((sym) => sym.includes(q));
      setResults(filtered);
    }
  };

  const handleSelectResult = (symbol: string) => {
    onChange(symbol);
    setQuery(symbol);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          setShowResults(true);
          onFocus?.();
        }}
        onBlur={onBlur}
        placeholder="Search symbol..."
        className="w-full px-3 py-1.5 text-sm bg-tv-surface2 border border-tv-border rounded text-tv-text placeholder-tv-text-secondary focus:outline-none focus:border-tv-accent"
      />

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-tv-surface border border-tv-border rounded shadow-lg z-50">
          {results.map((symbol) => (
            <button
              key={symbol}
              onClick={() => handleSelectResult(symbol)}
              className="w-full text-left px-3 py-2 hover:bg-tv-surface2 text-sm text-tv-text"
            >
              {symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
