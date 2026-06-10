import React from 'react';

type RightPanelTab = 'watchlist' | 'info' | 'analysis' | 'performance';

interface RightPanelProps {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  analysisResult?: any;
  analysisLoading?: boolean;
  analysisError?: string | null;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  activeTab,
  onTabChange,
  analysisResult,
  analysisLoading,
  analysisError,
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
            className={`flex-1 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
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
        {activeTab === 'info' && <InfoContent />}
        {activeTab === 'analysis' && (
          <AnalysisContent
            result={analysisResult}
            loading={analysisLoading}
            error={analysisError}
          />
        )}
        {activeTab === 'performance' && <PerformanceContent />}
      </div>
    </div>
  );
};

const WatchlistContent: React.FC = () => {
  const watchlist = [
    { symbol: 'AAPL', price: 190.5, change: 2.3 },
    { symbol: 'MSFT', price: 425.8, change: -1.2 },
    { symbol: 'TSLA', price: 245.3, change: 5.6 },
  ];

  return (
    <div>
      <div className="panel-header">Watchlist</div>
      {watchlist.map((item) => (
        <div key={item.symbol} className="panel-item border-b border-tv-border">
          <div className="flex justify-between items-center">
            <span className="font-semibold">{item.symbol}</span>
            <span className={item.change > 0 ? 'text-tv-green' : 'text-tv-red'}>
              {item.change > 0 ? '+' : ''}{item.change}%
            </span>
          </div>
          <div className="text-tv-text-secondary text-xs">${item.price}</div>
        </div>
      ))}
    </div>
  );
};

const InfoContent: React.FC = () => {
  return (
    <div className="p-4 text-sm text-tv-text-secondary">
      <div className="panel-header">Symbol Info</div>
      <div className="mt-4 space-y-2">
        <div>
          <span className="text-tv-text">Symbol:</span> AAPL
        </div>
        <div>
          <span className="text-tv-text">Company:</span> Apple Inc.
        </div>
        <div>
          <span className="text-tv-text">Exchange:</span> NASDAQ
        </div>
        <div>
          <span className="text-tv-text">Market Cap:</span> $3.2T
        </div>
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
      <div className="p-4 text-sm">
        <div className="panel-header">ATLAS Analysis</div>
        <div className="mt-4 text-tv-text-secondary">Analyzing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm">
        <div className="panel-header">ATLAS Analysis</div>
        <div className="mt-4 text-tv-red">Error: {error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 text-sm">
        <div className="panel-header">ATLAS Analysis</div>
        <div className="mt-4 text-tv-text-secondary">
          Click ANALYZE to run AI analysis on current chart.
        </div>
      </div>
    );
  }

  const primary = result.primarySignal;
  const confidence = (result.confidence || 0).toFixed(1);

  return (
    <div className="p-4 text-xs text-tv-text-secondary space-y-4 overflow-y-auto">
      <div className="panel-header text-xs">ATLAS ANALYSIS</div>

      <div>
        <div className="text-tv-text font-semibold">📊 SIGNAL</div>
        <div className={`text-lg font-bold ${primary.direction === 'LONG' ? 'text-tv-green' : primary.direction === 'SHORT' ? 'text-tv-red' : 'text-tv-text-secondary'}`}>
          {primary.direction}
        </div>
        <div className="text-tv-text-secondary">{primary.explanation}</div>
      </div>

      <div>
        <div className="text-tv-text font-semibold">🎯 TARGETS</div>
        <div className="space-y-1">
          <div>
            Entry Zone: {primary.entryZone[0].toFixed(2)} - {primary.entryZone[1].toFixed(2)}
          </div>
          <div className="text-tv-green">Target 1: {primary.target1.toFixed(2)}</div>
          {primary.target2 && <div className="text-tv-green">Target 2: {primary.target2.toFixed(2)}</div>}
          <div className="text-tv-red">Invalidation: {primary.invalidation.toFixed(2)}</div>
        </div>
      </div>

      <div>
        <div className="text-tv-text font-semibold">🤖 CONVICTION</div>
        <div className="text-tv-accent text-base font-bold">{confidence}/10</div>
      </div>

      <div>
        <div className="text-tv-text font-semibold">✅ MODULES ({result.modulesAgreed?.length || 0})</div>
        <div className="space-y-1">
          {result.modulesAgreed?.map((mod: string) => (
            <div key={mod} className="text-tv-green">
              ✓ {mod}
            </div>
          ))}
        </div>
      </div>

      {result.riskFlags && result.riskFlags.length > 0 && (
        <div>
          <div className="text-tv-text font-semibold">⚠️ RISK FLAGS</div>
          <div className="space-y-1 text-tv-orange">
            {result.riskFlags.map((flag: string, idx: number) => (
              <div key={idx}>• {flag}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PerformanceContent: React.FC = () => {
  return (
    <div className="p-4 text-sm">
      <div className="panel-header">Performance Dashboard</div>
      <div className="mt-4 space-y-3 text-tv-text-secondary">
        <div className="flex justify-between">
          <span>Overall Accuracy:</span>
          <span className="text-tv-green font-semibold">71.8%</span>
        </div>
        <div className="flex justify-between">
          <span>Total Predictions:</span>
          <span className="text-tv-text">1,180</span>
        </div>
        <div className="flex justify-between">
          <span>Win Rate:</span>
          <span className="text-tv-green font-semibold">847</span>
        </div>
      </div>
    </div>
  );
};
