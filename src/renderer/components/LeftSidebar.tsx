import React, { useState } from 'react';

type DrawingTool = 'crosshair' | 'trendline' | 'horizontal' | 'channel' | 'vertical' | 'freehand' | 'text' | 'callout' | 'zoom' | 'fib-retracement' | 'fib-extension' | 'lock' | 'edit' | 'unlock' | 'show' | 'delete';

export const LeftSidebar: React.FC = () => {
  const [activeTool, setActiveTool] = useState<DrawingTool | null>(null);

  const tools: { id: DrawingTool; label: string; icon: string }[] = [
    { id: 'crosshair', label: 'Crosshair', icon: '+' },
    { id: 'trendline', label: 'Trend Line', icon: '/' },
    { id: 'horizontal', label: 'Horizontal Line', icon: '≡' },
    { id: 'channel', label: 'Parallel Channel', icon: '⋈' },
    { id: 'vertical', label: 'Vertical Line', icon: '⊥' },
    { id: 'freehand', label: 'Freehand', icon: '~' },
    { id: 'text', label: 'Text', icon: 'T' },
    { id: 'callout', label: 'Callout', icon: '☺' },
    { id: 'zoom', label: 'Magnifier', icon: '⊕' },
    { id: 'fib-retracement', label: 'Fib Retracement', icon: '📐' },
    { id: 'fib-extension', label: 'Fib Extension', icon: '🔗' },
    { id: 'lock', label: 'Lock', icon: '🔒' },
    { id: 'edit', label: 'Edit', icon: '✏️' },
    { id: 'unlock', label: 'Unlock', icon: '🔓' },
    { id: 'show', label: 'Show/Hide', icon: '👁️' },
    { id: 'delete', label: 'Delete', icon: '🗑️' },
  ];

  return (
    <div className="w-12 bg-tv-surface border-r border-tv-border flex flex-col items-center gap-2 py-2 overflow-y-auto">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
          className={`sidebar-icon flex items-center justify-center text-lg ${
            activeTool === tool.id ? 'text-tv-accent' : 'text-tv-text-secondary'
          }`}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};
