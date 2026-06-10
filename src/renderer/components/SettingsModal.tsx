import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.loadSettings().then(res => {
      if (res.success && res.data?.anthropicApiKey) {
        setApiKey(res.data.anthropicApiKey);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    await window.api.saveSettings({ anthropicApiKey: apiKey.trim() });
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
            <div className="text-sm font-bold text-tv-text">⚙ Settings</div>
            <div className="text-xs text-tv-text-secondary mt-0.5">Configure AI providers</div>
          </div>
          <button onClick={onClose} className="text-tv-text-secondary hover:text-tv-text text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-tv-surface2">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-bold text-tv-text mb-2">
              Anthropic API Key
              <span className="ml-2 text-tv-green font-normal">(enables real Claude AI chat & analysis)</span>
            </label>
            <input
              type="password"
              value={loading ? '' : apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-tv-bg border border-tv-border rounded px-3 py-2 text-sm text-tv-text placeholder-tv-text-secondary outline-none focus:border-tv-accent transition-colors font-mono"
            />
            <div className="mt-1.5 text-xs text-tv-text-secondary">
              Get your key at{' '}
              <span className="text-tv-accent">console.anthropic.com</span>
              {' '}· Uses claude-haiku-4-5-20251001 (fast, cheap)
            </div>
          </div>

          <div className="bg-tv-surface2 rounded-lg p-3 border border-tv-border/50 text-xs text-tv-text-secondary space-y-1">
            <div className="font-bold text-tv-text text-xs mb-2">AI Priority Order</div>
            <div className="flex items-center gap-2">
              <span className="text-tv-green">1.</span> Claude API (if key set)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-tv-orange">2.</span> Ollama local LLM (if running on port 11434)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-tv-red">3.</span> Rule-based fallback (always works, no AI)
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-tv-accent text-white text-sm font-bold rounded hover:bg-blue-500 transition-colors"
            >
              {saved ? '✓ Saved!' : 'Save Settings'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-tv-text-secondary border border-tv-border rounded hover:bg-tv-surface2 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="text-xs text-tv-text-secondary border-t border-tv-border pt-3">
            API key stored locally in AppData. Takes effect immediately — no restart needed.
          </div>
        </div>
      </div>
    </div>
  );
};
