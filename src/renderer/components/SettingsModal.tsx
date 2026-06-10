import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    window.api.loadSettings().then(res => {
      if (res.success && res.data?.version) setVersion(res.data.version);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    await window.api.saveSettings({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(19,23,34,0.88)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-tv-surface border border-tv-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-tv-border">
          <div>
            <div className="text-sm font-bold text-tv-text">Settings</div>
            <div className="text-xs text-tv-text-secondary mt-0.5">ATLAS Configuration</div>
          </div>
          <button onClick={onClose} className="text-tv-text-secondary hover:text-tv-text text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-tv-surface2">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-tv-surface2 rounded-lg p-3 border border-tv-border/50 text-xs text-tv-text-secondary space-y-2">
            <div className="font-bold text-tv-text text-xs mb-2">Analysis Engine</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tv-green" />
              <span>13 algorithmic modules active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tv-green" />
              <span>Adaptive weight learning enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tv-green" />
              <span>Data: Yahoo Finance v8 (live quotes + OHLCV)</span>
            </div>
          </div>

          <div className="bg-tv-surface2 rounded-lg p-3 border border-tv-border/50 text-xs text-tv-text-secondary">
            <div className="font-bold text-tv-text text-xs mb-2">About ATLAS</div>
            <div className="text-tv-text-secondary">
              Multi-strategy confluence engine. Runs SMC, TJR, Wyckoff, Elliott Wave, Volume Profile, MA Systems, Momentum, Classical TA, Volatility, Intermarket, Sentiment, Seasonality, and Order Flow modules simultaneously. Signals require ≥6.0 conviction across weighted modules.
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-tv-accent text-white text-sm font-bold rounded hover:bg-blue-500 transition-colors"
            >
              {saved ? '✓ Saved!' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-tv-text-secondary border border-tv-border rounded hover:bg-tv-surface2 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
