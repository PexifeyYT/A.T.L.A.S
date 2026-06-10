import React from 'react';

type DrawingTool = 'cursor' | 'hline' | 'vline' | 'trendline' | 'fib' | 'text';

interface LeftSidebarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeTool, onToolChange }) => {
  const tools: { id: DrawingTool; label: string; icon: string }[] = [
    { id: 'cursor', label: 'Cursor (Esc)', icon: '↖' },
    { id: 'trendline', label: 'Trend Line', icon: '/' },
    { id: 'hline', label: 'Horizontal Line', icon: '─' },
    { id: 'vline', label: 'Vertical Line', icon: '│' },
    { id: 'fib', label: 'Fibonacci Retracement', icon: 'φ' },
    { id: 'text', label: 'Text Label', icon: 'T' },
  ];

  return (
    <div className="w-12 bg-tv-surface border-r border-tv-border flex flex-col items-center gap-1 py-2">
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          title={tool.label}
          className={`w-9 h-9 flex items-center justify-center rounded text-sm transition-colors ${
            activeTool === tool.id
              ? 'bg-tv-accent text-white'
              : 'text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text'
          }`}
        >
          {tool.icon}
        </button>
      ))}

      <div className="w-7 h-px bg-tv-border my-1" />

      {/* Non-functional extras for UI completeness */}
      {[
        { icon: '⋈', label: 'Parallel Channel' },
        { icon: '~', label: 'Freehand' },
        { icon: '☁', label: 'Callout' },
      ].map(t => (
        <button
          key={t.label}
          title={t.label}
          className="w-9 h-9 flex items-center justify-center rounded text-sm text-tv-text-secondary hover:bg-tv-surface2 hover:text-tv-text transition-colors opacity-50 cursor-not-allowed"
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};
