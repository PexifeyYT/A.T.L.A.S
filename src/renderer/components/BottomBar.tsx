import React, { useState, useEffect } from 'react';

export const BottomBar: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = time.toUTCString().split(' ')[4];

  return (
    <div className="flex items-center justify-between h-7 px-4 bg-tv-surface border-t border-tv-border text-xs text-tv-text-secondary select-none">
      <div className="flex items-center gap-4">
        <span className="text-tv-accent font-semibold">ATLAS v0.1.0</span>
        <span>© 2025 ATLAS Trading Systems</span>
      </div>

      <div className="flex items-center gap-5">
        <span>
          <span className="text-tv-text-secondary">Market: </span>
          <span className={isMarketOpen(time) ? 'text-tv-green font-semibold' : 'text-tv-red'}>
            {isMarketOpen(time) ? '● OPEN' : '● CLOSED'}
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
  // NYSE: 9:30–16:00 ET = 14:30–21:00 UTC
  return mins >= 870 && mins < 1260;
}
