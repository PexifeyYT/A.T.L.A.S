import React from 'react';

type RightPanelTab = 'watchlist' | 'info' | 'analysis' | 'performance';

interface RightPanelProps {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ activeTab, onTabChange }) => {
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
        {activeTab === 'analysis' && <AnalysisContent />}
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

const AnalysisContent: React.FC = () => {
  return (
    <div className="p-4 text-sm">
      <div className="panel-header">ATLAS Analysis</div>
      <div className="mt-4 text-tv-text-secondary">
        <p>Run analysis to see AI predictions and strategy signals.</p>
      </div>
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
