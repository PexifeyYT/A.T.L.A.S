import React, { useEffect, useState } from 'react';

interface PerformanceStats {
  total: number;
  scored: number;
  wins: number;
  accuracy: number;
  t1HitRate: number;
  moduleWeights: Record<string, number>;
}

export const PerformancePanel: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await window.api.getPerformanceStats();
        if (result.success) setStats(result.data);
      } catch { /* no db yet */ }
    };
    loadStats();
  }, []);

  const moduleOrder = [
    'mod_smc', 'mod_tjr', 'mod_wyckoff', 'mod_volume_profile',
    'mod_ma_systems', 'mod_classical_ta', 'mod_momentum', 'mod_volatility',
    'mod_intermarket', 'mod_sentiment', 'mod_seasonality', 'mod_elliott', 'mod_orderflow',
  ];

  const moduleLabels: Record<string, string> = {
    mod_smc: 'SMC', mod_tjr: 'TJR', mod_wyckoff: 'Wyckoff',
    mod_volume_profile: 'Vol. Profile', mod_ma_systems: 'MA Systems',
    mod_classical_ta: 'Classical TA', mod_momentum: 'Momentum',
    mod_volatility: 'Volatility', mod_intermarket: 'Intermarket',
    mod_sentiment: 'Sentiment', mod_seasonality: 'Seasonality',
    mod_elliott: 'Elliott Wave', mod_orderflow: 'Order Flow',
  };

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const accuracy = stats?.accuracy ?? 0;

  return (
    <div className="p-4 text-xs text-tv-text-secondary space-y-4 overflow-y-auto">
      <div className="text-sm font-bold text-tv-text border-b border-tv-border pb-2">
        📊 ATLAS PERFORMANCE
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-tv-surface2 p-2 rounded">
          <div className="text-tv-text-secondary text-xs">Accuracy</div>
          <div className={`text-lg font-bold ${accuracy > 0.6 ? 'text-tv-green' : accuracy > 0.4 ? 'text-tv-orange' : 'text-tv-red'}`}>
            {pct(accuracy)}
          </div>
        </div>
        <div className="bg-tv-surface2 p-2 rounded">
          <div className="text-tv-text-secondary text-xs">Total Calls</div>
          <div className="text-lg font-bold text-tv-text">{stats?.total ?? 0}</div>
        </div>
        <div className="bg-tv-surface2 p-2 rounded">
          <div className="text-tv-text-secondary text-xs">Scored</div>
          <div className="text-lg font-bold text-tv-text">{stats?.scored ?? 0}</div>
        </div>
        <div className="bg-tv-surface2 p-2 rounded">
          <div className="text-tv-text-secondary text-xs">T1 Hit Rate</div>
          <div className={`text-lg font-bold ${(stats?.t1HitRate ?? 0) > 0.5 ? 'text-tv-green' : 'text-tv-text'}`}>
            {pct(stats?.t1HitRate ?? 0)}
          </div>
        </div>
      </div>

      {/* Accuracy bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-tv-text-secondary">Rolling Accuracy</span>
          <span className={accuracy > 0.6 ? 'text-tv-green' : 'text-tv-orange'}>{pct(accuracy)}</span>
        </div>
        <div className="w-full bg-tv-surface2 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${accuracy > 0.6 ? 'bg-tv-green' : accuracy > 0.4 ? 'bg-tv-orange' : 'bg-tv-red'}`}
            style={{ width: `${Math.min(accuracy * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Module weights */}
      <div>
        <div className="text-tv-text font-semibold mb-2">BY STRATEGY MODULE</div>
        <div className="space-y-1">
          {moduleOrder.map(mod => {
            const w = stats?.moduleWeights?.[mod] ?? 1.0;
            const wPct = ((w / 2.0) * 100);
            return (
              <div key={mod} className="flex items-center gap-2">
                <span className="w-24 text-xs truncate">{moduleLabels[mod]}</span>
                <div className="flex-1 bg-tv-surface2 rounded h-1.5">
                  <div
                    className={`h-1.5 rounded ${w > 1.3 ? 'bg-tv-green' : w > 0.8 ? 'bg-tv-accent' : 'bg-tv-red'}`}
                    style={{ width: `${wPct}%` }}
                  />
                </div>
                <span className={`w-10 text-right text-xs ${w > 1.0 ? 'text-tv-green' : 'text-tv-red'}`}>
                  {w.toFixed(2)}x
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {stats?.total === 0 && (
        <div className="text-tv-text-secondary text-center py-4">
          Run ANALYZE to start building ATLAS's learning database.
          <br /><br />
          Performance improves with every prediction scored.
        </div>
      )}
    </div>
  );
};
