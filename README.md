# ATLAS — AI Trading Analysis System

Complete build specification v1.0

Build a fully local, self-improving, production-grade Windows desktop application that functions as a superintelligent trading analyst.

## Tech Stack

- **Desktop Framework**: Electron (Windows-first)
- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Charting**: TradingView Lightweight Charts v4
- **Analysis**: Custom TypeScript strategy engine (rule-based + ML hybrid)
- **Database**: SQLite (better-sqlite3)
- **State Management**: Zustand
- **Build**: electron-builder

## Project Structure

```
ATLAS/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/          # React frontend
│   │   ├── components/    # UI components
│   │   ├── panels/        # Main panels
│   │   ├── hooks/         # React hooks
│   │   └── store/         # Zustand stores
│   ├── core/              # AI analysis engine
│   │   ├── engine/        # Main analysis engine
│   │   ├── strategies/    # Strategy modules
│   │   └── data/          # Market data handling
│   └── database/          # Database layer
├── dist/                  # Build output
├── package.json
├── tsconfig.json
└── GOAL.md               # Full specification
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (Electron + React hot reload)
npm run dev

# Build for production
npm run build

# Create Windows installer
npm run dist
```

## Phase 1 Status

✅ Electron + React scaffolding
✅ TypeScript setup
✅ TailwindCSS theming
✅ Base UI layout
  - Top toolbar with symbol search & timeframe selector
  - Left sidebar with drawing tools
  - Chart panel with Lightweight Charts
  - Right panel with tabs (Watchlist, Info, Analysis, Performance)
  - Bottom bar with controls
✅ Basic chart rendering (candlesticks with sample data)

## Next Phases

- Phase 2: Market data integration (Polygon.io, Yahoo Finance)
- Phase 3: Strategy modules (TJR, SMC, Wyckoff)
- Phase 4: Prediction tracking & learning loop
- Phase 5: Full 12-module strategy suite
- Phase 6: Local LLM integration
- Phase 7: Advanced dashboards & tools
- Phase 8: Polish, testing, packaging

## Standards

- No placeholder UI — everything functional
- Sub-200ms chart render on symbol/timeframe switch
- AI analysis <15 seconds per asset
- All drawings persist between sessions
- Keyboard shortcuts match TradingView
- Offline capable with cached data
- Full learning loop with pattern discovery
