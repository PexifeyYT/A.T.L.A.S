# ATLAS — AI Trading Analysis System

Fully local, self-improving, production-grade Windows desktop trading analyst.

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop | Electron 27 |
| Frontend | React 18 + TypeScript + TailwindCSS |
| Charting | TradingView Lightweight Charts v4 |
| Analysis Engine | 13 parallel strategy modules (TypeScript) |
| Learning | Reinforcement-style weight updates (SQLite) |
| Market Data | Yahoo Finance v8 API + realistic mock fallback |
| LLM | Local Ollama (llama3/mistral/phi3) with rule-based fallback |
| Database | better-sqlite3 at Electron userData path |
| Installer | electron-builder NSIS (Windows x64) |

## Project Structure

```
ATLAS/
├── src/
│   ├── main/
│   │   ├── index.ts          # Electron main, IPC handlers, learning loop
│   │   └── preload.ts        # contextBridge API exposure
│   ├── renderer/
│   │   ├── App.tsx           # Root component, state management
│   │   ├── global.d.ts       # Window.api type declarations
│   │   ├── components/
│   │   │   ├── TopToolbar    # Symbol search, timeframes, ANALYZE, SCAN
│   │   │   ├── SymbolSearch  # Fullscreen overlay, keyboard navigation
│   │   │   ├── LeftSidebar   # Drawing tool selector
│   │   │   └── BottomBar     # Live clock, market open/close indicator
│   │   └── panels/
│   │       ├── ChartPanel    # Candlesticks, EMA 21/50, volume, drawing toolbar, replay mode
│   │       ├── RightPanel    # Tabs: Watchlist / Info / Analysis / Performance
│   │       ├── PerformancePanel # Accuracy, T1 hit rate, module weight bars
│   │       └── ScanResultsPanel # Batch scan sorted by conviction
│   ├── core/
│   │   ├── engine/
│   │   │   ├── AnalysisEngine.ts    # Parallel strategy runner, confluence scoring
│   │   │   └── AnalysisFormatter.ts # Rule-based institutional report generator
│   │   ├── strategies/              # 13 strategy modules
│   │   │   ├── SMCStrategy          # Order blocks, FVGs, BOS/CHoCH (weight: 1.82)
│   │   │   ├── TJRStrategy          # HTF bias → LTF OB entry, min 2.5 RR (1.71)
│   │   │   ├── WyckoffStrategy      # Accumulation/distribution phases (1.60)
│   │   │   ├── VolumeProfileStrategy # POC/VAH/VAL (1.54)
│   │   │   ├── MASystemStrategy     # EMA 9/21/50/200 ribbon (1.31)
│   │   │   ├── ClassicalPatternsStrategy # Flags, H&S, triangles (1.31)
│   │   │   ├── MomentumStrategy     # RSI/MACD/Stochastic (1.18)
│   │   │   ├── VolatilityStrategy   # Bollinger Bands/ATR (1.10)
│   │   │   ├── IntermarketStrategy  # DXY correlation, risk regime (0.95)
│   │   │   ├── SentimentStrategy    # News NLP (0.85)
│   │   │   ├── SeasonalityStrategy  # OpEx, turn-of-month (0.72)
│   │   │   ├── ElliottWaveStrategy  # 5-wave + Fib projections (0.71)
│   │   │   └── OrderFlowStrategy    # Delta, absorption zones (0.68)
│   │   ├── data/
│   │   │   └── MarketDataService.ts # Yahoo Finance v8, 5-min cache, mock fallback
│   │   ├── learning/
│   │   │   ├── LearningEngine.ts    # Module weight updates (lr=0.05, range 0.1–2.0)
│   │   │   ├── OutcomeChecker.ts    # Score predictions vs actual price action
│   │   │   └── PatternDiscovery.ts  # Winning module combination discovery
│   │   └── llm/
│   │       └── OllamaService.ts     # Ollama client, model detection, streaming
│   └── database/
│       └── Database.ts             # SQLite: predictions, outcomes, weights, profiles
└── assets/                         # App icon (icon.ico required for installer)
```

## Quick Start

```bash
npm install
npm run dev          # Start dev server (Electron + React hot reload)
```

## Build & Package

```bash
npm run build        # Compile TypeScript (both renderer + main)
npm run dist         # Build + create Windows NSIS installer → release/
```

## Key Features

**Analysis Engine**
- 13 strategy modules run in parallel
- Minimum 3 modules must agree for signal publication
- Weighted confluence scoring (0–10 conviction)
- Auto-saves predictions with conviction ≥ 6.0 to SQLite

**Learning Loop** (runs every 30 min)
- Fetches pending predictions older than 24h
- Scores against actual OHLCV via `OutcomeChecker`
- Updates module weights via reinforcement-style rewards
- Direction correct: ±0.5 | T1 hit: +0.2 | T2 hit: +0.3 | Entry respected: +0.1 | Invalidation: -0.2

**Chart**
- Candlestick + EMA 21/50 + volume histogram overlays
- Analysis price lines (entry/T1/T2/invalidation) auto-drawn on ANALYZE
- Drawing toolbar: cursor / H-line / trend line / Fibonacci / text
- Replay mode: bar-by-bar playback with play/pause/step controls

**Symbol Search** (Ctrl+K or `/`)
- Fullscreen frosted-glass overlay
- Arrow key navigation, Enter to select, Esc to close
- 18 pre-loaded symbols + free-text entry

**Watchlist Scan**
- Batch analysis across all 10 watchlist symbols
- Results grouped: Bullish → Bearish → Neutral, sorted by conviction
- Click any result to jump to that symbol

**LLM Integration**
- Auto-detects local Ollama (llama3, mistral, phi3, gemma)
- Falls back to rule-based `AnalysisFormatter` if unavailable
- Analysis panel shows model badge when LLM active

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+K or / | Open symbol search |
| Esc | Close search overlay |
| ↑↓ + Enter | Navigate and select symbol |
