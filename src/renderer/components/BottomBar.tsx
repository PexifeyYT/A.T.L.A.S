import React, { useState, useEffect, useRef } from 'react';

interface BottomBarProps {
  symbol?: string;
}

export const BottomBar: React.FC<BottomBarProps> = ({ symbol }) => {
  const [time, setTime] = useState(new Date());
  const [quote, setQuote] = useState<{ price: number; changePercent: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!symbol) return;
    let active = true;

    const fetchQuote = async () => {
      try {
        const res = await window.api.fetchLiveQuote(symbol);
        if (active && res.success && res.data) {
          setQuote({ price: res.data.price, changePercent: res.data.changePercent });
        }
      } catch {}
      if (active) pollRef.current = setTimeout(fetchQuote, 10000);
    };

    setQuote(null);
    fetchQuote();
    return () => {
      active = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [symbol]);

  const timeStr = time.toUTCString().split(' ')[4];
  const open = isMarketOpen(time);

  return (
    <div className="flex items-center justify-between h-7 px-4 bg-tv-surface border-t border-tv-border text-xs text-tv-text-secondary select-none">
      <div className="flex items-center gap-4">
        <span className="text-tv-accent font-semibold">ATLAS v0.1.0</span>
        {symbol && (
          <span className="flex items-center gap-1.5">
            <span className="text-tv-text font-bold">{symbol}</span>
            {quote ? (
              <>
                <span className="font-mono text-tv-text">
                  ${quote.price > 1000
                    ? quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : quote.price.toFixed(2)}
                </span>
                <span className={`font-medium ${quote.changePercent >= 0 ? 'text-tv-green' : 'text-tv-red'}`}>
                  {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="animate-pulse">—</span>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <span>
          <span className="text-tv-text-secondary">NYSE: </span>
          <span className={open ? 'text-tv-green font-semibold' : 'text-tv-red'}>
            {open ? '● OPEN' : '● CLOSED'}
          </span>
        </span>
        <span className="font-mono text-tv-text">🕐 {timeStr} UTC</span>
      </div>
    </div>
  );
};

function isMarketOpen(d: Date): boolean {
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const mins = h * 60 + m;
  return mins >= 870 && mins < 1260;
}
