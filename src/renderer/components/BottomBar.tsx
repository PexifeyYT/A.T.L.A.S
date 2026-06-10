import React, { useState, useEffect } from 'react';

interface BottomBarProps {
  symbol?: string;
  liveQuote?: { price: number; changePercent: number } | null;
  barCount?: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({ symbol, liveQuote: quote = null, barCount = 0 }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = String(time.getUTCHours()).padStart(2, '0');
  const m = String(time.getUTCMinutes()).padStart(2, '0');
  const s = String(time.getUTCSeconds()).padStart(2, '0');
  const timeStr = `${h}:${m}:${s}`;
  const open = isMarketOpen(time);
  const up = (quote?.changePercent ?? 0) >= 0;

  return (
    <div className="flex items-center justify-between h-6 px-3 bg-tv-surface border-t border-tv-border text-[11px] text-tv-text-secondary select-none shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-tv-accent font-bold tracking-wider">ATLAS</span>
        {symbol && (
          <span className="flex items-center gap-1.5">
            <span className="text-tv-text font-semibold">{symbol}</span>
            {quote ? (
              <>
                <span className="font-mono text-tv-text">
                  {quote.price > 1000
                    ? quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : quote.price.toFixed(2)}
                </span>
                <span className={`font-medium ${up ? 'text-tv-green' : 'text-tv-red'}`}>
                  {up ? '+' : ''}{quote.changePercent.toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="animate-pulse">—</span>
            )}
          </span>
        )}
        {barCount > 0 && (
          <span className="text-tv-text-secondary/60">{barCount} bars</span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-tv-green' : 'bg-tv-red'}`} />
          <span>NYSE {open ? 'Open' : 'Closed'}</span>
        </span>
        <span className="font-mono">{timeStr} UTC</span>
      </div>
    </div>
  );
};

function isEDT(d: Date): boolean {
  const y = d.getUTCFullYear();
  let marchSun = 0, count = 0;
  for (let day = 1; day <= 31; day++) {
    if (new Date(Date.UTC(y, 2, day)).getUTCDay() === 0 && ++count === 2) { marchSun = day; break; }
  }
  let novSun = 0;
  for (let day = 1; day <= 30; day++) {
    if (new Date(Date.UTC(y, 10, day)).getUTCDay() === 0) { novSun = day; break; }
  }
  return d >= new Date(Date.UTC(y, 2, marchSun, 7)) && d < new Date(Date.UTC(y, 10, novSun, 6));
}

function isMarketOpen(d: Date): boolean {
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  return isEDT(d) ? mins >= 810 && mins < 1200 : mins >= 870 && mins < 1260;
}
