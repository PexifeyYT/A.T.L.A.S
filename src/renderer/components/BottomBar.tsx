import React, { useState } from 'react';

export const BottomBar: React.FC = () => {
  const [scale, setScale] = useState<'linear' | 'log' | 'percent'>('linear');
  const [adjusted, setAdjusted] = useState(true);

  return (
    <div className="flex items-center justify-between h-8 px-4 bg-tv-surface border-t border-tv-border text-xs text-tv-text-secondary">
      <div className="flex items-center gap-4">
        <div>📅 2024-06-09</div>
        <div>📊 Bar: 123</div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="checkbox"
              checked={adjusted}
              onChange={(e) => setAdjusted(e.target.checked)}
              className="w-3 h-3"
            />
            {' '}
            ADJ
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-tv-text-secondary">Scale:</label>
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value as any)}
            className="bg-tv-surface2 border border-tv-border px-2 py-0.5 rounded text-tv-text"
          >
            <option value="linear">Linear</option>
            <option value="log">Log</option>
            <option value="percent">%</option>
          </select>
        </div>

        <div className="text-tv-accent font-mono">🕐 UTC: 20:45:30</div>
      </div>
    </div>
  );
};
