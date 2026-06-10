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

function isEDT(d: Date): boolean {
  const y = d.getUTCFullYear();
  // 2nd Sunday of March at 07:00 UTC (2 AM EST → EDT)
  let marchSun = 0, count = 0;
  for (let day = 1; day <= 31; day++) {
    if (new Date(Date.UTC(y, 2, day)).getUTCDay() === 0 && ++count === 2) { marchSun = day; break; }
  }
  // 1st Sunday of November at 06:00 UTC (2 AM EDT → EST)
  let novSun = 0;
  for (let day = 1; day <= 30; day++) {
    if (new Date(Date.UTC(y, 10, day)).getUTCDay() === 0) { novSun = day; break; }
  }
  const start = new Date(Date.UTC(y, 2, marchSun, 7));
  const end   = new Date(Date.UTC(y, 10, novSun, 6));
  return d >= start && d < end;
}

function isMarketOpen(d: Date): boolean {
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  // EDT (UTC-4): 13:30-20:00 UTC; EST (UTC-5): 14:30-21:00 UTC
  return isEDT(d) ? mins >= 810 && mins < 1200 : mins >= 870 && mins < 1260;
}
