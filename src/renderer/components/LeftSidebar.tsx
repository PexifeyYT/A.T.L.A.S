import React, { useState, useRef, useCallback } from 'react';

export type DrawingTool =
  | 'cursor' | 'trendline' | 'hline' | 'vline' | 'fib' | 'text' | 'rect' | 'longpos' | 'shortpos';

interface LeftSidebarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearDrawings?: () => void;
}

// ─── SVG Icon Components ──────────────────────────────────────────────────────

const Ico = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg viewBox="0 0 18 18" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IcoCrosshair = () => (
  <Ico>
    <circle cx="9" cy="9" r="1.8" fill="currentColor" stroke="none"/>
    <line x1="9" y1="1" x2="9" y2="6"/><line x1="9" y1="12" x2="9" y2="17"/>
    <line x1="1" y1="9" x2="6" y2="9"/><line x1="12" y1="9" x2="17" y2="9"/>
  </Ico>
);

const IcoTrendline = () => (
  <Ico>
    <line x1="3" y1="14" x2="15" y2="4"/>
    <circle cx="3" cy="14" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="4" r="1.5" fill="currentColor" stroke="none"/>
  </Ico>
);

const IcoHLine = () => (
  <Ico>
    <line x1="1.5" y1="9" x2="16.5" y2="9"/>
    <circle cx="1.5" cy="9" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="16.5" cy="9" r="1.4" fill="currentColor" stroke="none"/>
  </Ico>
);

const IcoVLine = () => (
  <Ico>
    <line x1="9" y1="1.5" x2="9" y2="16.5"/>
    <circle cx="9" cy="1.5" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="9" cy="16.5" r="1.4" fill="currentColor" stroke="none"/>
  </Ico>
);

const IcoRay = () => (
  <Ico>
    <line x1="2" y1="11" x2="16" y2="5"/>
    <circle cx="2" cy="11" r="1.4" fill="currentColor" stroke="none"/>
    <polyline points="13,3 16,5 13,7" fill="none"/>
  </Ico>
);

const IcoChannel = () => (
  <Ico>
    <line x1="2" y1="13" x2="16" y2="7"/>
    <line x1="2" y1="8" x2="16" y2="2" strokeDasharray="2.5 1.5"/>
    <circle cx="2" cy="13" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="7" r="1.4" fill="currentColor" stroke="none"/>
  </Ico>
);

const IcoPitchfork = () => (
  <Ico>
    <path d="M5 8Q9 3 13 8"/><line x1="9" y1="3" x2="9" y2="15"/>
    <line x1="5" y1="8" x2="5" y2="15"/><line x1="13" y1="8" x2="13" y2="15"/>
    <circle cx="9" cy="3" r="1.4" fill="currentColor" stroke="none"/>
  </Ico>
);

const IcoFib = () => (
  <Ico>
    <line x1="3" y1="4" x2="15" y2="4" strokeWidth="1.2"/>
    <line x1="3" y1="8" x2="15" y2="8" strokeWidth="1"/>
    <line x1="3" y1="11" x2="15" y2="11" strokeWidth="1"/>
    <line x1="3" y1="14" x2="15" y2="14" strokeWidth="1.2"/>
    <line x1="5" y1="2" x2="5" y2="16" strokeWidth="1.5"/>
    <circle cx="5" cy="4" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="5" cy="14" r="1.4" fill="currentColor" stroke="none"/>
  </Ico>
);

const IcoGann = () => (
  <Ico>
    <rect x="2" y="2" width="14" height="14" rx="0.5" strokeWidth="1.2"/>
    <line x1="2" y1="16" x2="16" y2="2" strokeWidth="1"/>
    <line x1="2" y1="9" x2="16" y2="9" strokeWidth="0.8" strokeDasharray="2"/>
    <line x1="9" y1="2" x2="9" y2="16" strokeWidth="0.8" strokeDasharray="2"/>
  </Ico>
);

const IcoPattern = () => (
  <Ico>
    <circle cx="3" cy="13" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="7" cy="5" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="11" cy="10" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="4" r="1.5" fill="currentColor" stroke="none"/>
    <line x1="3" y1="13" x2="7" y2="5" strokeWidth="1.2"/>
    <line x1="7" y1="5" x2="11" y2="10" strokeWidth="1.2"/>
    <line x1="11" y1="10" x2="15" y2="4" strokeWidth="1.2"/>
  </Ico>
);

const IcoElliott = () => (
  <Ico>
    <path d="M2 13 L4.5 7 L7 10.5 L9.5 4 L12 8 L14 6 L16 8"/>
  </Ico>
);

const IcoCycles = () => (
  <Ico>
    <path d="M2 9 C3.5 4 5.5 4 7 9 S10.5 14 12 9 S15.5 4 17 7"/>
    <line x1="7" y1="3" x2="7" y2="15" strokeWidth="0.8" strokeDasharray="1.5"/>
    <line x1="12" y1="3" x2="12" y2="15" strokeWidth="0.8" strokeDasharray="1.5"/>
  </Ico>
);

const IcoLongPos = () => (
  <Ico>
    <rect x="2" y="5" width="14" height="5" rx="0.5" strokeWidth="0" fill="#26a69a" opacity="0.4"/>
    <rect x="2" y="10" width="14" height="4" rx="0.5" strokeWidth="0" fill="#ef5350" opacity="0.4"/>
    <line x1="2" y1="5" x2="16" y2="5" stroke="#26a69a" strokeWidth="1.6"/>
    <line x1="2" y1="10" x2="16" y2="10" strokeWidth="1"/>
    <line x1="2" y1="14" x2="16" y2="14" stroke="#ef5350" strokeWidth="1.4"/>
  </Ico>
);

const IcoShortPos = () => (
  <Ico>
    <rect x="2" y="9" width="14" height="5" rx="0.5" strokeWidth="0" fill="#26a69a" opacity="0.4"/>
    <rect x="2" y="4" width="14" height="5" rx="0.5" strokeWidth="0" fill="#ef5350" opacity="0.4"/>
    <line x1="2" y1="9" x2="16" y2="9" stroke="#26a69a" strokeWidth="1.6"/>
    <line x1="2" y1="4" x2="16" y2="4" stroke="#ef5350" strokeWidth="1.4"/>
    <line x1="2" y1="14" x2="16" y2="14" strokeWidth="1"/>
  </Ico>
);

const IcoRect = () => (
  <Ico>
    <rect x="2.5" y="5" width="13" height="8" rx="0.8"/>
  </Ico>
);

const IcoBrush = () => (
  <Ico>
    <path d="M13 2 L16 5 L7 13 Q5 15 3 15 Q3 13 5 11 Z"/>
    <line x1="11" y1="4" x2="14" y2="7"/>
  </Ico>
);

const IcoText = () => (
  <Ico>
    <line x1="3.5" y1="5" x2="14.5" y2="5" strokeWidth="1.6"/>
    <line x1="9" y1="5" x2="9" y2="15" strokeWidth="1.6"/>
  </Ico>
);

const IcoMagnet = () => (
  <Ico>
    <path d="M4.5 3L4.5 9Q4.5 14.5 9 14.5Q13.5 14.5 13.5 9L13.5 3"/>
    <line x1="2.5" y1="3" x2="6.5" y2="3" strokeWidth="2.5"/>
    <line x1="11.5" y1="3" x2="15.5" y2="3" strokeWidth="2.5"/>
  </Ico>
);

const IcoLock = () => (
  <Ico>
    <rect x="3.5" y="9" width="11" height="8" rx="1.5"/>
    <path d="M6 9 V6.5 A3 3 0 0 1 12 6.5 V9"/>
    <circle cx="9" cy="13.5" r="1.3" fill="currentColor" stroke="none"/>
  </Ico>
);

const IcoEye = () => (
  <Ico>
    <path d="M1.5 9 Q9 2 16.5 9 Q9 16 1.5 9 Z"/>
    <circle cx="9" cy="9" r="2.5"/>
  </Ico>
);

const IcoTrash = () => (
  <Ico>
    <line x1="3" y1="5.5" x2="15" y2="5.5" strokeWidth="1.5"/>
    <path d="M7 5.5 V3.5 Q7 3 7.5 3 H10.5 Q11 3 11 3.5 V5.5"/>
    <path d="M5 5.5 L5.5 15 Q5.5 15.5 6 15.5 H12 Q12.5 15.5 12.5 15 L13 5.5"/>
    <line x1="7.5" y1="8.5" x2="7.5" y2="12.5" strokeWidth="1"/>
    <line x1="10.5" y1="8.5" x2="10.5" y2="12.5" strokeWidth="1"/>
  </Ico>
);

const IcoEraserLine = () => (
  <Ico>
    <line x1="2" y1="9" x2="16" y2="9" strokeDasharray="3 2"/>
    <line x1="3" y1="13" x2="10" y2="5"/>
    <line x1="3" y1="13" x2="6" y2="13"/>
    <line x1="10" y1="5" x2="13" y2="5"/>
    <line x1="13" y1="5" x2="10" y2="13"/>
    <line x1="10" y1="13" x2="3" y2="13"/>
  </Ico>
);

// ─── Subtool and Group Definitions ───────────────────────────────────────────

interface SubTool {
  tool: DrawingTool | null;
  label: string;
  Icon: React.FC;
  shortcut?: string;
}

interface GroupDef {
  id: string;
  defaultTool: DrawingTool;
  GroupIcon: React.FC;
  label: string;
  subtools: SubTool[];
  section?: string;
}

interface SectionedSub {
  section?: string;
  items: SubTool[];
}

const GROUPS: GroupDef[] = [
  {
    id: 'cursor', label: 'Cursor', defaultTool: 'cursor', GroupIcon: IcoCrosshair,
    subtools: [
      { tool: 'cursor', label: 'Cross', Icon: IcoCrosshair },
      { tool: null, label: 'Dot', Icon: () => <Ico><circle cx="9" cy="9" r="2.5" fill="currentColor" stroke="none"/></Ico> },
      { tool: null, label: 'Arrow', Icon: () => <Ico><path d="M4 3L4 15L7.5 11.5L10 16L11.5 15.2L9 10.5L14.5 10.5Z" fill="currentColor" stroke="none"/></Ico> },
      { tool: null, label: 'Demonstration', Icon: () => <Ico><circle cx="9" cy="9" r="5.5"/><circle cx="9" cy="9" r="2" fill="currentColor" stroke="none"/></Ico> },
      { tool: null, label: 'Eraser', Icon: IcoEraserLine },
    ],
  },
  {
    id: 'lines', label: 'Lines', defaultTool: 'trendline', GroupIcon: IcoTrendline,
    subtools: [
      { tool: 'trendline', label: 'Trendline', Icon: IcoTrendline, shortcut: 'Alt+T' },
      { tool: null, label: 'Ray', Icon: IcoRay },
      { tool: null, label: 'Info line', Icon: () => <Ico><line x1="2" y1="12" x2="16" y2="6"/><circle cx="2" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="6" r="1.4" fill="currentColor" stroke="none"/></Ico> },
      { tool: null, label: 'Extended line', Icon: () => <Ico><line x1="1" y1="13" x2="17" y2="5"/><line x1="5" y1="11" x2="7" y2="10" strokeWidth="2"/></Ico> },
      { tool: null, label: 'Trend angle', Icon: () => <Ico><line x1="2" y1="14" x2="16" y2="6"/><path d="M2 14 L6 14" strokeWidth="1"/><path d="M2 14 Q5 14 5 11" fill="none" strokeWidth="1"/></Ico> },
      { tool: 'hline', label: 'Horizontal line', Icon: IcoHLine, shortcut: 'Alt+H' },
      { tool: null, label: 'Horizontal ray', Icon: IcoRay, shortcut: 'Alt+J' },
      { tool: 'vline', label: 'Vertical line', Icon: IcoVLine, shortcut: 'Alt+V' },
      { tool: null, label: 'Crossline', Icon: () => <Ico><line x1="1.5" y1="9" x2="16.5" y2="9"/><line x1="9" y1="1.5" x2="9" y2="16.5"/></Ico>, shortcut: 'Alt+C' },
    ],
  },
  {
    id: 'channels', label: 'Channels', defaultTool: 'trendline', GroupIcon: IcoChannel,
    subtools: [
      { tool: null, label: 'Parallel channel', Icon: IcoChannel },
      { tool: null, label: 'Regression trend', Icon: () => <Ico><line x1="2" y1="14" x2="16" y2="6" strokeWidth="1.6"/><line x1="2" y1="12" x2="16" y2="4" strokeDasharray="2"/><line x1="2" y1="16" x2="16" y2="8" strokeDasharray="2"/></Ico> },
      { tool: null, label: 'Flat top/bottom', Icon: () => <Ico><line x1="2" y1="6" x2="16" y2="6"/><line x1="2" y1="12" x2="16" y2="12"/><line x1="2" y1="6" x2="2" y2="12" strokeDasharray="2"/><line x1="16" y1="6" x2="16" y2="12" strokeDasharray="2"/></Ico> },
      { tool: null, label: 'Disjoint channel', Icon: () => <Ico><line x1="2" y1="13" x2="9" y2="8"/><line x1="9" y1="8" x2="16" y2="11"/><line x1="2" y1="16" x2="9" y2="11" strokeDasharray="2"/><line x1="9" y1="5" x2="16" y2="8" strokeDasharray="2"/></Ico> },
    ],
  },
  {
    id: 'pitchfork', label: 'Pitchforks', defaultTool: 'trendline', GroupIcon: IcoPitchfork,
    subtools: [
      { tool: null, label: 'Pitchfork', Icon: IcoPitchfork },
      { tool: null, label: 'Schiff pitchfork', Icon: IcoPitchfork },
      { tool: null, label: 'Modified Schiff pitchfork', Icon: IcoPitchfork },
      { tool: null, label: 'Inside pitchfork', Icon: IcoPitchfork },
    ],
  },
  {
    id: 'fib', label: 'Fibonacci', defaultTool: 'fib', GroupIcon: IcoFib,
    subtools: [
      { tool: 'fib', label: 'Fib retracement', Icon: IcoFib, shortcut: 'Alt+F' },
      { tool: null, label: 'Trend-based fib extension', Icon: IcoFib },
      { tool: null, label: 'Fib channel', Icon: IcoFib },
      { tool: null, label: 'Fib time zone', Icon: () => <Ico><line x1="5" y1="2" x2="5" y2="16" strokeWidth="1.2"/><line x1="9" y1="2" x2="9" y2="16" strokeWidth="1.2"/><line x1="13" y1="2" x2="13" y2="16" strokeWidth="1.2"/><line x1="16" y1="2" x2="16" y2="16" strokeWidth="1.2"/><line x1="2" y1="12" x2="5" y2="8" strokeWidth="1.8"/></Ico> },
      { tool: null, label: 'Fib speed resistance fan', Icon: IcoFib },
      { tool: null, label: 'Trend-based fib time', Icon: IcoFib },
      { tool: null, label: 'Fib circles', Icon: () => <Ico><circle cx="5" cy="9" r="3"/><circle cx="9" cy="9" r="5"/><circle cx="9" cy="9" r="7"/></Ico> },
      { tool: null, label: 'Fib spiral', Icon: IcoFib },
      { tool: null, label: 'Fib speed resistance arcs', Icon: IcoFib },
      { tool: null, label: 'Fib wedge', Icon: IcoFib },
      { tool: null, label: 'Pitchfan', Icon: IcoFib },
    ],
  },
  {
    id: 'gann', label: 'Gann', defaultTool: 'trendline', GroupIcon: IcoGann,
    subtools: [
      { tool: null, label: 'Gann box', Icon: IcoGann },
      { tool: null, label: 'Gann square fixed', Icon: IcoGann },
      { tool: null, label: 'Gann square', Icon: IcoGann },
      { tool: null, label: 'Gann fan', Icon: IcoGann },
    ],
  },
  {
    id: 'patterns', label: 'Chart Patterns', defaultTool: 'trendline', GroupIcon: IcoPattern,
    subtools: [
      { tool: null, label: 'XABCD pattern', Icon: IcoPattern },
      { tool: null, label: 'Cypher pattern', Icon: IcoPattern },
      { tool: null, label: 'Head and shoulders', Icon: () => <Ico><path d="M2 14 L5 9 L7 11 L9 5 L11 11 L13 9 L16 14"/></Ico> },
      { tool: null, label: 'ABCD pattern', Icon: IcoPattern },
      { tool: null, label: 'Triangle pattern', Icon: () => <Ico><path d="M2 14 L9 4 L16 14 Z"/></Ico> },
      { tool: null, label: 'Three drives pattern', Icon: IcoPattern },
    ],
  },
  {
    id: 'elliott', label: 'Elliott Waves', defaultTool: 'trendline', GroupIcon: IcoElliott,
    subtools: [
      { tool: null, label: 'Elliott impulse wave (1·2·3·4·5)', Icon: IcoElliott },
      { tool: null, label: 'Elliott correction wave (A·B·C)', Icon: IcoElliott },
      { tool: null, label: 'Elliott triangle wave (A·B·C·D·E)', Icon: IcoElliott },
      { tool: null, label: 'Elliott double combo wave (W·X·Y)', Icon: IcoElliott },
      { tool: null, label: 'Elliott triple combo wave (W·X·Y·X·Z)', Icon: IcoElliott },
    ],
  },
  {
    id: 'cycles', label: 'Cycles', defaultTool: 'trendline', GroupIcon: IcoCycles,
    subtools: [
      { tool: null, label: 'Cyclic lines', Icon: IcoCycles },
      { tool: null, label: 'Time cycles', Icon: IcoCycles },
      { tool: null, label: 'Sine line', Icon: IcoCycles },
    ],
  },
  {
    id: 'forecast', label: 'Forecasting', defaultTool: 'longpos', GroupIcon: IcoLongPos,
    subtools: [
      { tool: 'longpos', label: 'Long position', Icon: IcoLongPos },
      { tool: 'shortpos', label: 'Short position', Icon: IcoShortPos },
      { tool: null, label: 'Position forecast', Icon: () => <Ico><rect x="2" y="5" width="14" height="8" rx="1"/><line x1="2" y1="9" x2="16" y2="9" strokeDasharray="2"/></Ico> },
      { tool: null, label: 'Bars pattern', Icon: () => <Ico><rect x="2" y="6" width="3" height="8" rx="0.5" fill="currentColor" stroke="none" opacity="0.6"/><rect x="7" y="4" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" opacity="0.6"/><rect x="12" y="7" width="3" height="7" rx="0.5" fill="currentColor" stroke="none" opacity="0.6"/></Ico> },
      { tool: null, label: 'Ghost feed', Icon: () => <Ico><path d="M2 14 L6 10 L9 12 L12 7 L16 9" strokeDasharray="3 2"/></Ico> },
      { tool: null, label: 'Sector', Icon: () => <Ico><path d="M9 9 L16 5 A8 8 0 0 1 16 13 Z" fill="currentColor" stroke="none" opacity="0.4"/><circle cx="9" cy="9" r="7"/><line x1="9" y1="9" x2="16" y2="5"/><line x1="9" y1="9" x2="16" y2="13"/></Ico> },
    ],
  },
  {
    id: 'shapes', label: 'Shapes', defaultTool: 'rect', GroupIcon: IcoRect,
    subtools: [
      { tool: null, label: 'Brush', Icon: IcoBrush },
      { tool: null, label: 'Highlighter', Icon: () => <Ico><path d="M12 2 L16 6 L7 14 Q5 15 3 15 Q3 13 4 11 Z" fill="currentColor" stroke="none" opacity="0.5"/><line x1="10" y1="4" x2="14" y2="8"/></Ico> },
      { tool: null, label: 'Arrow marker', Icon: () => <Ico><path d="M9 2 L9 12 M5 8 L9 2 L13 8" fill="none"/></Ico> },
      { tool: null, label: 'Arrow', Icon: () => <Ico><line x1="3" y1="9" x2="15" y2="9"/><polyline points="11,5 15,9 11,13"/></Ico> },
      { tool: null, label: 'Arrow mark up', Icon: () => <Ico><line x1="9" y1="3" x2="9" y2="16"/><polyline points="5,7 9,3 13,7"/></Ico> },
      { tool: null, label: 'Arrow mark down', Icon: () => <Ico><line x1="9" y1="2" x2="9" y2="15"/><polyline points="5,11 9,15 13,11"/></Ico> },
      { tool: 'rect', label: 'Rectangle', Icon: IcoRect, shortcut: 'Alt+Shift+R' },
      { tool: null, label: 'Rotated rectangle', Icon: () => <Ico><path d="M3 11 L7 4 L15 7 L11 14 Z"/></Ico> },
      { tool: null, label: 'Path', Icon: () => <Ico><path d="M3 13 Q7 4 12 8 Q15 11 15 5"/></Ico> },
      { tool: null, label: 'Circle', Icon: () => <Ico><circle cx="9" cy="9" r="6.5"/></Ico> },
      { tool: null, label: 'Ellipse', Icon: () => <Ico><ellipse cx="9" cy="9" rx="6.5" ry="4"/></Ico> },
      { tool: null, label: 'Triangle', Icon: () => <Ico><path d="M9 3 L16 14 L2 14 Z"/></Ico> },
    ],
  },
  {
    id: 'text', label: 'Text', defaultTool: 'text', GroupIcon: IcoText,
    subtools: [
      { tool: 'text', label: 'Text', Icon: IcoText },
      { tool: null, label: 'Note', Icon: () => <Ico><rect x="3" y="3" width="12" height="12" rx="1"/><line x1="6" y1="7" x2="12" y2="7"/><line x1="6" y1="10" x2="10" y2="10"/></Ico> },
      { tool: null, label: 'Price note', Icon: () => <Ico><path d="M2 6 Q2 4 4 4 L14 4 Q16 4 16 6 L16 10 Q16 12 14 12 L9 12 L6 15 L6 12 L4 12 Q2 12 2 10 Z"/></Ico> },
      { tool: null, label: 'Pin', Icon: () => <Ico><circle cx="9" cy="7" r="4"/><line x1="9" y1="11" x2="9" y2="16"/><line x1="6" y1="16" x2="12" y2="16"/></Ico> },
      { tool: null, label: 'Callout', Icon: () => <Ico><path d="M2 4 Q2 3 3 3 L15 3 Q16 3 16 4 L16 10 Q16 11 15 11 L7 11 L4 14 L4 11 L3 11 Q2 11 2 10 Z"/></Ico> },
      { tool: null, label: 'Flag mark', Icon: () => <Ico><line x1="5" y1="3" x2="5" y2="15"/><path d="M5 3 L14 6 L5 9 Z" fill="currentColor" stroke="none" opacity="0.7"/></Ico> },
    ],
  },
];

// ─── Tool Group Button ────────────────────────────────────────────────────────

interface GroupBtnProps {
  group: GroupDef;
  activeTool: DrawingTool;
  activeSubtoolMap: Record<string, DrawingTool>;
  onToolChange: (t: DrawingTool) => void;
  setActiveSubtoolMap: React.Dispatch<React.SetStateAction<Record<string, DrawingTool>>>;
}

const GroupBtn: React.FC<GroupBtnProps> = ({ group, activeTool, activeSubtoolMap, onToolChange, setActiveSubtoolMap }) => {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTool = activeSubtoolMap[group.id] ?? group.defaultTool;
  const isActive = group.subtools.some(s => s.tool === activeTool);

  const CurrentIcon = group.subtools.find(s => s.tool === currentTool)?.Icon ?? group.GroupIcon;

  const openFlyout = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeFlyout = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };
  const keepOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const handleGroupClick = () => {
    const tool = currentTool ?? group.defaultTool;
    if (tool) onToolChange(tool);
    openFlyout();
  };

  const handleSubClick = (sub: SubTool) => {
    if (sub.tool) {
      onToolChange(sub.tool);
      setActiveSubtoolMap(prev => ({ ...prev, [group.id]: sub.tool! }));
    }
    setOpen(false);
  };

  const hasSubtools = group.subtools.length > 1;

  return (
    <div className="relative" onMouseLeave={closeFlyout}>
      <button
        onMouseEnter={hasSubtools ? openFlyout : undefined}
        onClick={handleGroupClick}
        title={group.label}
        className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative ${
          isActive
            ? 'text-tv-accent bg-tv-accent/15'
            : 'text-tv-text-secondary hover:text-tv-text hover:bg-tv-surface2'
        }`}
      >
        <CurrentIcon />
        {hasSubtools && (
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-current opacity-60" style={{ transform: 'rotate(-45deg)' }} />
        )}
      </button>

      {open && hasSubtools && (
        <div
          className="absolute left-full top-0 z-50 ml-1 bg-tv-surface border border-tv-border rounded-lg shadow-2xl overflow-hidden"
          style={{ minWidth: 220 }}
          onMouseEnter={keepOpen}
          onMouseLeave={closeFlyout}
        >
          {group.subtools.map((sub, idx) => (
            <button
              key={idx}
              onClick={() => handleSubClick(sub)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                activeTool === sub.tool
                  ? 'bg-tv-accent/15 text-tv-accent'
                  : sub.tool
                    ? 'text-tv-text hover:bg-tv-surface2'
                    : 'text-tv-text-secondary hover:bg-tv-surface2'
              }`}
            >
              <span className="w-4 flex-shrink-0 text-current opacity-80">
                <sub.Icon />
              </span>
              <span className="flex-1">{sub.label}</span>
              {sub.shortcut && (
                <span className="text-xs text-tv-text-secondary font-mono">{sub.shortcut}</span>
              )}
              {!sub.tool && (
                <span className="text-[10px] text-tv-text-secondary/50 italic">coming soon</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeTool, onToolChange, onClearDrawings }) => {
  const [activeSubtoolMap, setActiveSubtoolMap] = useState<Record<string, DrawingTool>>({});
  const [magnetOn, setMagnetOn] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hidden, setHidden] = useState(false);

  return (
    <div className="w-[46px] bg-tv-bg border-r border-tv-border flex flex-col items-center py-1.5 gap-0.5 select-none z-20">
      {GROUPS.map(group => (
        <GroupBtn
          key={group.id}
          group={group}
          activeTool={activeTool}
          activeSubtoolMap={activeSubtoolMap}
          onToolChange={onToolChange}
          setActiveSubtoolMap={setActiveSubtoolMap}
        />
      ))}

      {/* Separator */}
      <div className="w-6 h-px bg-tv-border my-1" />

      {/* Magnet */}
      <button
        onClick={() => setMagnetOn(v => !v)}
        title={magnetOn ? 'Magnet: Strong' : 'Magnet: Weak'}
        className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
          magnetOn ? 'text-tv-accent bg-tv-accent/15' : 'text-tv-text-secondary hover:text-tv-text hover:bg-tv-surface2'
        }`}
      >
        <IcoMagnet />
      </button>

      {/* Lock drawings */}
      <button
        onClick={() => setLocked(v => !v)}
        title={locked ? 'Unlock drawings' : 'Lock drawings'}
        className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
          locked ? 'text-tv-orange bg-tv-orange/10' : 'text-tv-text-secondary hover:text-tv-text hover:bg-tv-surface2'
        }`}
      >
        <IcoLock />
      </button>

      {/* Hide/show drawings */}
      <button
        onClick={() => setHidden(v => !v)}
        title={hidden ? 'Show drawings' : 'Hide drawings'}
        className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
          hidden ? 'text-tv-text-secondary line-through' : 'text-tv-text-secondary hover:text-tv-text hover:bg-tv-surface2'
        }`}
      >
        <IcoEye />
      </button>

      {/* Clear all drawings */}
      <button
        onClick={onClearDrawings}
        title="Remove all drawings"
        className="w-9 h-9 flex items-center justify-center rounded text-tv-text-secondary hover:text-tv-red hover:bg-tv-red/10 transition-colors"
      >
        <IcoTrash />
      </button>
    </div>
  );
};
