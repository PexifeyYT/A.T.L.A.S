import React from 'react';
import { PerformancePanel } from './PerformancePanel';

type RightPanelTab = 'watchlist' | 'info' | 'analysis' | 'performance';

interface RightPanelProps {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  analysisResult?: any;
  analysisLoading?: boolean;
  analysisError?: string | null;
  symbol?: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  activeTab,
  onTabChange,
  analysisResult,
  analysisLoading,
  analysisError,
  symbol = 'AAPL',
}) => {
  const tabs: { id: RightPanelTab; label: string }[] = [
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'info', label: 'Info' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <div className="w-80 bg-tv-surface border-l border-tv-border flex flex-col">
      {/* Tab buttons */}
      <div className="flex border-b border-tv-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 px-1 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-tv-accent text-tv-accent'
                : 'border-transparent text-tv-text-secondary hover:text-tv-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'watchlist' && <WatchlistContent />}
        {activeTab === 'info' && <InfoContent symbol={symbol} />}
        {activeTab === 'analysis' && (
          <AnalysisContent
            result={analysisResult}
            loading={analysisLoading}
            error={analysisError}
          />
        )}
        {activeTab === 'performance' && <PerformancePanel />}
      </div>
    </div>
  );
};

const WatchlistContent: React.FC = () => {
  const watchlist = [
    { symbol: 'AAPL', price: 190.5, change: 2.3 },
    { symbol: 'MSFT', price: 425.8, change: -1.2 },
    { symbol: 'TSLA', price: 245.3, change: 5.6 },
    { symbol: 'NVDA', price: 208.4, change: 3.1 },
    { symbol: 'SPY', price: 550.2, change: 0.8 },
    { symbol: 'QQQ', price: 381.7, change: 1.2 },
    { symbol: 'BTC', price: 65420, change: -2.1 },
    { symbol: 'ETH', price: 3512, change: -1.8 },
  ];

  return (
    <div>
      <div className="panel-header flex items-center justify-between">
        <span>Watchlist</span>
        <button className="text-tv-accent text-xs">+ Add</button>
      </div>
      {watchlist.map((item) => (
        <div key={item.symbol} className="panel-item border-b border-tv-border cursor-pointer hover:bg-tv-surface2">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-semibold text-sm">{item.symbol}</span>
              <div className="text-tv-text-secondary text-xs">${item.price.toLocaleString()}</div>
            </div>
            <span className={`text-sm font-medium ${item.change > 0 ? 'text-tv-green' : 'text-tv-red'}`}>
              {item.change > 0 ? '+' : ''}{item.change}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const InfoContent: React.FC<{ symbol: string }> = ({ symbol }) => {
  const symbolInfo: Record<string, any> = {
    AAPL: { name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', marketCap: '$2.9T', type: 'Stock' },
    MSFT: { name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology', marketCap: '$3.2T', type: 'Stock' },
    TSLA: { name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical', marketCap: '$780B', type: 'Stock' },
    NVDA: { name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Technology', marketCap: '$2.3T', type: 'Stock' },
    SPY: { name: 'SPDR S&P 500 ETF', exchange: 'NYSE', sector: 'ETF', marketCap: '$550B', type: 'ETF' },
    QQQ: { name: 'Invesco QQQ Trust', exchange: 'NASDAQ', sector: 'ETF', marketCap: '$250B', type: 'ETF' },
    BTC: { name: 'Bitcoin', exchange: 'Crypto', sector: 'Digital Asset', marketCap: '$1.3T', type: 'Crypto' },
    ETH: { name: 'Ethereum', exchange: 'Crypto', sector: 'Digital Asset', marketCap: '$420B', type: 'Crypto' },
  };

  const info = symbolInfo[symbol] || { name: symbol, exchange: 'Unknown', sector: '—', marketCap: '—', type: 'Unknown' };

  return (
    <div className="p-4 text-sm">
      <div className="panel-header">Symbol Info</div>
      <div className="mt-4 space-y-3 text-xs">
        {[
          ['Symbol', symbol],
          ['Name', info.name],
          ['Exchange', info.exchange],
          ['Sector', info.sector],
          ['Market Cap', info.marketCap],
          ['Asset Type', info.type],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-tv-border/30 pb-2">
            <span className="text-tv-text-secondary">{label}</span>
            <span className="text-tv-text font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalysisContent: React.FC<{
  result?: any;
  loading?: boolean;
  error?: string | null;
}> = ({ result, loading, error }) => {
  if (loading) {
    return (
      <div className="p-4">
        <div className="text-tv-text-secondary text-sm animate-pulse">
          🤖 ATLAS analyzing market structure...
          <br />
          Running 13 strategy modules in parallel...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm">
        <div className="text-tv-red">⚠️ Analysis Error</div>
        <div className="text-tv-text-secondary text-xs mt-2">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 text-sm">
        <div className="panel-header">ATLAS Analysis</div>
        <div className="mt-4 text-tv-text-secondary text-xs leading-relaxed">
          Click <span className="text-tv-accent font-semibold">ANALYZE</span> to run AI analysis on the current chart.
          <br /><br />
          ATLAS will run all 13 strategy modules in parallel and produce a complete trading analysis with entry zones, targets, and invalidation levels.
        </div>
      </div>
    );
  }

  const primary = result.primarySignal;
  const confidence = (result.confidence || 0).toFixed(1);
  const bullish = primary.direction === 'LONG';
  const bearish = primary.direction === 'SHORT';
  const dirColor = bullish ? 'text-tv-green' : bearish ? 'text-tv-red' : 'text-tv-text-secondary';
  const dirLabel = bullish ? '🟢 LONG' : bearish ? '🔴 SHORT' : '⚪ NEUTRAL';

  return (
    <div className="text-xs text-tv-text-secondary overflow-y-auto">
      {/* Header */}
      <div className="bg-tv-surface2 px-4 py-2 border-b border-tv-border">
        <div className="text-tv-text-secondary text-xs">ATLAS ANALYSIS</div>
        <div className={`text-xl font-bold ${dirColor}`}>{dirLabel}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-tv-text-secondary">Conviction:</span>
          <span className={`font-bold ${parseFloat(confidence) >= 7 ? 'text-tv-green' : parseFloat(confidence) >= 5 ? 'text-tv-orange' : 'text-tv-red'}`}>
            {confidence}/10
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Entry & Targets */}
        <div className="bg-tv-surface2 rounded p-3 space-y-2">
          <div className="text-tv-text font-semibold">🎯 TRADE SETUP</div>
          <div className="flex justify-between">
            <span>Entry Zone</span>
            <span className="text-tv-text font-medium">
              ${primary.entryZone[0]?.toFixed(2)} – ${primary.entryZone[1]?.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Target 1</span>
            <span className="text-tv-green font-medium">${primary.target1?.toFixed(2)}</span>
          </div>
          {primary.target2 > 0 && (
            <div className="flex justify-between">
              <span>Target 2</span>
              <span className="text-tv-green font-medium">${primary.target2?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Invalidation</span>
            <span className="text-tv-red font-medium">${primary.invalidation?.toFixed(2)}</span>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-tv-surface2 rounded p-3">
          <div className="text-tv-text font-semibold mb-1">📊 SIGNAL RATIONALE</div>
          <div className="text-tv-text-secondary leading-relaxed">{primary.explanation}</div>
        </div>

        {/* Key Levels */}
        {result.keyLevels?.length > 0 && (
          <div>
            <div className="text-tv-text font-semibold mb-2">📌 KEY LEVELS</div>
            <div className="space-y-1">
              {result.keyLevels.slice(0, 6).map((level: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="truncate">{level.label}</span>
                  <span className={`font-medium ${level.type === 'support' ? 'text-tv-green' : 'text-tv-red'}`}>
                    ${level.price?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module confluence */}
        <div>
          <div className="text-tv-text font-semibold mb-2">
            🧠 MODULES ({result.modulesAgreed?.length || 0}/13 agree)
          </div>
          <div className="space-y-1">
            {result.modulesAgreed?.map((mod: string) => (
              <div key={mod} className="flex items-center gap-2">
                <span className="text-tv-green">✓</span>
                <span>{formatModuleName(mod)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk flags */}
        {result.riskFlags?.length > 0 && (
          <div className="bg-tv-orange/10 border border-tv-orange/30 rounded p-3">
            <div className="text-tv-orange font-semibold mb-1">⚠️ RISK FLAGS</div>
            {result.riskFlags.map((flag: string, idx: number) => (
              <div key={idx} className="text-tv-orange text-xs">• {flag}</div>
            ))}
          </div>
        )}

        {/* Prediction tracked */}
        {result.predictionId && (
          <div className="text-tv-text-secondary text-xs border-t border-tv-border pt-2">
            🔬 Prediction tracked for learning: {result.predictionId.slice(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
};

function formatModuleName(name: string): string {
  const labels: Record<string, string> = {
    mod_smc: 'Smart Money Concepts',
    mod_tjr: 'TJR Constitution',
    mod_wyckoff: 'Wyckoff Method',
    mod_volume_profile: 'Volume Profile',
    mod_ma_systems: 'MA Systems',
    mod_classical_ta: 'Classical TA',
    mod_momentum: 'Momentum Oscillators',
    mod_volatility: 'Volatility Analysis',
    mod_intermarket: 'Intermarket Analysis',
    mod_sentiment: 'Sentiment Analysis',
    mod_seasonality: 'Seasonality',
    mod_elliott: 'Elliott Wave',
    mod_orderflow: 'Order Flow',
  };
  return labels[name] || name;
}
