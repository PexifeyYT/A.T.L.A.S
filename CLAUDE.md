# ATLAS — AI Trading Analysis System
## Complete Project Knowledge Dump for Claude

---

## Project Identity

**Name:** ATLAS (AI Trading & Liquidity Analysis System)  
**GitHub:** https://github.com/PexifeyYT/A.T.L.A.S  
**Owner:** Jaskamal (PexifeyYT), email: Jaskamal95330@gmail.com  
**Stack:** Electron 27 + React 18 + TypeScript + Vite + TailwindCSS  
**Purpose:** Desktop trading analysis app — TradingView-like UI, 22 strategy modules running in parallel, weighted confluence scoring, 40-bar market prediction overlay, self-improving learning loop.

---

## Tech Stack Details

| Layer | Technology |
|---|---|
| Desktop shell | Electron 27, contextIsolation, no nodeIntegration |
| Renderer | React 18, Vite 5 (dev: localhost:5173) |
| Charting | TradingView Lightweight Charts v4 |
| Styling | TailwindCSS v3 |
| Language | TypeScript (strict) — separate tsconfig for electron vs renderer |
| Database | SQLite via better-sqlite3 |
| Market data | Yahoo Finance v8 REST API (axios, no SDK) |
| IPC | Electron ipcMain/ipcRenderer via contextBridge preload |
| Build | `npm run build` = `vite build` + `tsc --project tsconfig.electron.json` |

---

## Directory Structure

```
src/
  main/
    index.ts          — Electron main process, IPC handlers, strategy registration, learning loop
    preload.ts        — contextBridge: exposes window.api to renderer
  renderer/
    App.tsx           — Root component, state, symbol/timeframe, scan, settings
    global.d.ts       — window.api type declarations
    layouts/
      Layout.tsx
    panels/
      ChartPanel.tsx  — TradingView chart, drawing tools, replay, prediction overlay (forwardRef)
      RightPanel.tsx  — Analysis results display
      ScanResultsPanel.tsx
    components/
      TopToolbar.tsx  — Symbol search, timeframe selector, Analyze/Scan buttons, replay controls
      LeftSidebar.tsx — Drawing tool palette
      BottomBar.tsx   — Status bar (symbol, price, bar count)
      SettingsModal.tsx
      SymbolSearch.tsx — Yahoo Finance search, any asset type
  core/
    types.ts          — All shared TypeScript interfaces
    data/
      MarketDataService.ts — Yahoo Finance OHLCV + quote + search, per-TF cache
    engine/
      AnalysisEngine.ts    — Runs all 22 strategies, weighted confluence, prediction generation
      AnalysisFormatter.ts — Format result for display
    strategies/           — 22 strategy modules (see below)
    learning/
      LearningEngine.ts   — In-memory weight management
      OutcomeChecker.ts   — Checks pending predictions vs actual price movement
  database/
    Database.ts       — SQLite schema + CRUD (predictions, outcomes, weights, asset profiles)
```

---

## IPC API (window.api)

Defined in `src/main/preload.ts`, typed in `src/renderer/global.d.ts`.

```typescript
window.api.fetchMarketData(symbol, timeframe)   // → { success, data: OHLCVData }
window.api.runAnalysis(symbol, timeframe, data) // → { success, data: AnalysisResult }
window.api.fetchLiveQuote(symbol)               // → { success, data: { price, change, changePercent } }
window.api.searchSymbols(query)                 // → { success, data: Array<{ symbol, name, type, exchange }> }
window.api.getModuleWeights()                   // → { success, data: Record<string, number> }
window.api.getLearningStats(symbol?)            // → { success, data: stats }
window.api.clearCache()
```

---

## Core Types (src/core/types.ts)

```typescript
interface OHLCV { time: number; open: number; high: number; low: number; close: number; volume: number; }
interface OHLCVData { symbol: string; timeframe: string; bars: OHLCV[]; }

interface StrategySignal {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;       // 0–1
  entryZone: [number, number];
  target1: number;
  target2?: number;
  invalidation: number;
  explanation: string;
  moduleName: string;
  weight: number;
}

interface IStrategyModule {
  name: string;
  analyze(data: OHLCVData, context: MarketContext): StrategySignal;
  getKeyLevels(data: OHLCVData): PriceLevel[];
  getConfidence(): number;
  getWeight(): number;
  getExplanation(): string;
}

interface PriceLevel {
  price: number;
  type: 'support' | 'resistance' | 'orderblock' | 'fvg' | 'liquidity';
  strength: number;
  label: string;
}

interface MarketContext {
  symbol: string;
  timestamp: number;
  macroTrend: 'UPTREND' | 'DOWNTREND' | 'RANGING';
  volatility: number;       // 0–1
  newssentiment?: number;
}

interface PredictionCandle {
  time: number;   // unix seconds
  open: number; high: number; low: number; close: number;
}

interface AnalysisResult {
  symbol: string;
  timeframe: string;
  timestamp: number;
  primarySignal: StrategySignal;
  confidence: number;       // 0–10 composite score
  modulesAgreed: string[];
  keyLevels: PriceLevel[];
  riskFlags: string[];
  prediction: { scenario1: { direction: string; probability: number; target1: number; target2: number } };
  predictionCandles?: PredictionCandle[];
  lastRealBarTime?: number; // unix seconds — boundary between real and predicted
  moduleVotes?: Record<string, { direction: string; confidence: number; agrees: boolean }>;
}
```

---

## Analysis Engine (src/core/engine/AnalysisEngine.ts)

### Flow
1. All 22 strategies run in parallel via `Promise.all`
2. Key levels collected from all strategies, clustered within 0.5% price bands
3. Bullish vs bearish signals compared by count AND weighted confidence sum
4. Winning direction = direction with more signals OR higher weighted sum on tie
5. `modulesAgreed` = signals matching winning direction
6. `canPublish = agreedCount >= 3 && direction !== NEUTRAL`
7. Composite score = `(avgConfidence × 0.6 + moduleRatio × 0.4) × 10` (max 10)
8. 40 prediction candles generated forward using ATR noise + decaying trend bias
9. `moduleVotes` map built for UI display

### Composite Score Formula
```
compositeScore = (avgConfidence * 0.6 + (agreedCount / totalModules) * 0.4) * 10
```
Only non-zero when canPublish is true.

### Prediction Candle Generation
- 40 bars forward from last real bar
- `bias = LONG → 1, SHORT → -1, NEUTRAL → 0`
- `trendPct = (confidence / 10) * 0.015 * bias` (max 1.5%/bar at confidence=10)
- `decayFactor = Math.exp(-i * 0.04)` — trend weakens over time
- `noiseMult = 0.7 + i * 0.02` — uncertainty grows with horizon
- Seeded LCG noise: `seed = (seed * 9301 + 49297) % 233280` seeded from `last.close * 1000`
- ATR calculated from last 14 bars

### Key Level Merging
- Sort all levels by price
- Cluster levels within 0.5% of each other
- Best strength level in cluster wins; price = cluster average

---

## Market Data Service (src/core/data/MarketDataService.ts)

### Timeframe → Yahoo Finance Interval Map
```
1m  → interval: '1m'   | range: dynamic (days)
5m  → interval: '5m'
15m → interval: '15m'
30m → interval: '30m'
1H  → interval: '60m'
2H  → interval: '60m'  (resampled 2:1 after fetch)
4H  → interval: '60m'  (resampled 4:1 after fetch)
1D  → interval: '1d'   | range: 'max'
1W  → interval: '1wk'  | range: 'max'
1M  → interval: '1mo'  | range: 'max'
```

### Per-Timeframe Cache TTL
```
1m: 15s  | 5m: 30s  | 15m: 60s | 30m: 90s
1H: 120s | 2H: 180s | 4H: 240s
1D: 5min | 1W: 10min | 1M: 15min
```

### Range Logic
- D/W/M + limit > 500 → `range = 'max'` (full lifetime history)
- Intraday: `rangeDays = min(rangeMultiplier * ceil(limit/100), 730)`
- `rangeDays < 8 → "{n}d"`, `< 60 → "{n}mo"`, else `"2y"`

### Resampling
- 2H and 4H: fetch 60m bars, aggregate N bars into one (OHLCV correct merge)

### Symbol Search
- Yahoo Finance v1/finance/search
- Supports: EQUITY, ETF, CRYPTOCURRENCY, INDEX, FUTURE, CURRENCY, MUTUALFUND
- "Load anyway" fallback for any manually typed symbol
- Works for: AAPL, BTC-USD, EURUSD=X, GC=F (gold futures), ^GSPC (S&P 500), etc.

---

## ChartPanel (src/renderer/panels/ChartPanel.tsx)

### Key Architecture
- `forwardRef + useImperativeHandle` exposes: `startReplay`, `stopReplay`, `togglePlayPause`, `stepReplay`, `clearDrawings`
- Chart built once in `useEffect` on mount; cleanup on unmount
- Canvas overlay for drawing tools (trend lines, horizontal lines, text) AND prediction boundary line
- Subscribes to `timeScale().subscribeVisibleLogicalRangeChange()` to redraw vertical line on pan/zoom

### Prediction Overlay
- Separate `CandlestickSeries` for predicted candles (blue color scheme: `#1565c0`, `#0d47a1`)
- Blue dashed vertical line at `lastRealBarTime` (drawn on canvas overlay)
- "NOW" label left of line, "FORECAST →" label right of line
- Blue semi-transparent shade on forecast side
- Forecast toggle button: absolute top-right corner, `z-20`
- State: `const [showPrediction, setShowPrediction] = useState(true)`

### Timeframe Fix
In `App.tsx`:
```tsx
<ChartPanel
  key={`${symbol}-${timeframe}`}   // ← forces full remount on change
  ...
/>
```
This forces complete React unmount/remount when symbol OR timeframe changes, clearing all chart state cleanly.

### Drawing Tools
- `cursor` | `horizontal` | `trendline` | `text` | `fibonacci` | `rectangle`
- Canvas overlay mousedown/mousemove/mouseup handlers
- Drawings stored in `drawingsRef` array, redrawn on `redrawAll()`

### Replay Mode
- Slices bars array up to `replayIndex`, feeds to chart
- Play mode: `setInterval` advancing index
- Lifted state: `replayMode`, `replayPlaying`, `replayIndex`, `totalBars` in App.tsx
- Callback: `onReplayModeChange(active, playing, index, total)`

---

## App.tsx State

```typescript
symbol: string                    // current ticker
timeframe: string                 // '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '1D' | '1W' | '1M'
activeTool: DrawingTool           // drawing tool
analysisResult: AnalysisResult | null
analysisLoading: boolean
analysisError: string | null
scanResults: any[]
scanning: boolean
showScan: boolean
showSettings: boolean
liveQuote: { price, changePercent } | null
replayMode, replayPlaying, replayIndex, totalBars  // replay lifted state
```

Live quote polls every 10s via `setTimeout` loop, clears on symbol change.

Keyboard shortcuts:
- `A` → run analysis (when not loading)
- `Escape` → reset to cursor tool

---

## Learning System

### Database Tables (SQLite)
- `predictions` — stored predictions (id, symbol, TF, direction, entry, targets, modules, conviction, status)
- `prediction_outcomes` — actual results (directionCorrect, target1Hit, target2Hit, score -3..+11)
- `module_weights` — persisted per-module weights (name, weight, updated_at)
- `asset_profiles` — per-symbol accuracy stats (accuracy, totalPredictions, wins)

### Learning Loop
- Runs every 30 minutes
- Checks pending predictions against actual price movement via `OutcomeChecker`
- Score -3..+11 → reward = score / 110 → applied to each agreeing module's weight
- Weights clamped to [0.1, 2.0]
- Weights synced back to `LearningEngine` memory after DB update

### Outcome Scoring
```
+5  direction correct
+3  target1 hit
+3  target2 hit
-3  invalidation hit
+1  entry zone respected (price entered zone)
-3  direction wrong (no other points awarded)
Max = 11 (perfect), Min = -3 (stopped out immediately wrong direction)
```

---

## All 22 Strategy Modules

### Module Names, Weights, File Paths

| Module Name | ID | Weight | File |
|---|---|---|---|
| Smart Money Concepts | mod_smc | 1.82 | SMCStrategy.ts |
| TJR Price Action | mod_tjr | 1.71 | TJRStrategy.ts |
| Wyckoff Method | mod_wyckoff | 1.60 | WyckoffStrategy.ts |
| Supply & Demand Zones | mod_supply_demand | 1.55 | SupplyDemandZoneStrategy.ts |
| Volume Profile | mod_volume_profile | 1.54 | VolumeProfileStrategy.ts |
| Liquidity Hunt | mod_liquidity_hunt | 1.48 | LiquidityHuntStrategy.ts |
| VSA | mod_vsa | 1.45 | VSAStrategy.ts |
| Market Profile | mod_market_profile | 1.42 | MarketProfileStrategy.ts |
| VWAP | mod_vwap | 1.38 | VWAPStrategy.ts |
| MA Systems | mod_ma_systems | 1.31 | MASystemStrategy.ts |
| Classical Patterns | mod_classical_ta | 1.31 | ClassicalPatternsStrategy.ts |
| Divergence | mod_divergence | 1.28 | DivergenceStrategy.ts |
| Mean Reversion | mod_mean_reversion | 1.22 | MeanReversionStrategy.ts |
| Momentum | mod_momentum | 1.18 | MomentumStrategy.ts |
| Opening Range Breakout | mod_orb | 1.15 | OpeningRangeStrategy.ts |
| Volatility | mod_volatility | 1.10 | VolatilityStrategy.ts |
| Donchian Breakout | mod_donchian | 1.08 | DonchianBreakoutStrategy.ts |
| Intermarket | mod_intermarket | 0.95 | IntermarketStrategy.ts |
| Sentiment | mod_sentiment | 0.85 | SentimentStrategy.ts |
| Seasonality | mod_seasonality | 0.72 | SeasonalityStrategy.ts |
| Elliott Wave | mod_elliott | 0.71 | ElliottWaveStrategy.ts |
| Order Flow | mod_orderflow | 0.68 | OrderFlowStrategy.ts |

---

## Strategy Implementation Details

### SMCStrategy (mod_smc, weight 1.82)
Smart Money Concepts — highest weight, institutional-grade analysis.
- **Order Blocks:** Last bearish bar before bullish impulse (demand OB), last bullish bar before bearish impulse (supply OB). Valid when price returns to zone.
- **Fair Value Gaps (FVG):** 3-bar pattern — bar[i-2].high < bar[i].low = bullish FVG; bar[i-2].low > bar[i].high = bearish FVG. Price fills gap and continues.
- **Break of Structure (BOS):** Higher high in downtrend = potential reversal; lower low in uptrend = potential reversal.
- **Change of Character (CHoCH):** First break against trend direction.
- Entry: when price returns to OB within FVG zone; target = previous swing opposite side.

### TJRStrategy (mod_tjr, weight 1.71)
TJR Price Action methodology — second highest weight.
- **Institutional Candles:** Large-bodied candles (body > 2× ATR) that gap from prior range.
- **Entry Zones:** 50% retracement of institutional candle body.
- **Liquidity grabs:** Wick beyond recent swing then close back inside range.
- **Key levels:** Highs/lows of institutional candles serve as S/R.

### WyckoffStrategy (mod_wyckoff, weight 1.60)
Wyckoff Market Cycle — accumulation/distribution phase detection.
- **Phases:** Accumulation (PS → SC → AR → ST → Spring → SOS → LPS → BU) / Distribution (PSY → BC → AR → ST → UTAD → LPSY → SOW).
- **Spring:** False breakdown below support (accumulation), traps shorts, volume spike.
- **Upthrust:** False breakout above resistance (distribution), traps longs.
- **Effort vs Result:** High volume with little price movement = absorption. Low volume on retest = weakness drying up.
- Volume analysis: selling climax vs buying climax identification.

### SupplyDemandZoneStrategy (mod_supply_demand, weight 1.55)
- **Zone detection:** Base bar (range < 1.2× ATR) followed by explosive move (> 2× ATR) = zone.
- **Demand zone:** Base + explosive UP move.
- **Supply zone:** Base + explosive DOWN move.
- **Freshness:** Untested zones (0 retests) = confidence 0.76. Each retest degrades zone quality.
- **Retest detection:** Bar overlaps zone price range = retest counted.
- Entry: price returns to zone for first or second time. Third+ test = zone likely broken.

### VolumeProfileStrategy (mod_volume_profile, weight 1.54)
- POC (Point of Control): price with highest total volume over lookback
- Value Area High/Low: range containing 70% of volume around POC
- High-volume nodes = magnetic S/R levels
- Low-volume nodes = price moves fast through them (air pockets)

### LiquidityHuntStrategy (mod_liquidity_hunt, weight 1.48)
- **Swing H/L detection:** 2-bar confirmation both sides = confirmed swing.
- **Equal highs/lows:** Within 0.2% tolerance = liquidity pool (stop cluster).
- **Bullish sweep:** `bar.low < swingLow * 0.998 AND bar.close > swingLow` = stops taken, price reverses.
- **Bearish sweep:** `bar.high > swingHigh * 1.002 AND bar.close < swingHigh` = stops taken, price reverses.
- **Equal high sweep:** Price breaks above double top then closes below = flushed longs.
- **Session extremes:** Prior session high/low sweeps as stop-hunt signals.
- Confidence based on wick size relative to ATR.

### VSAStrategy (mod_vsa, weight 1.45)
Volume Spread Analysis — Richard Wyckoff / Tom Williams methodology.
- **Selling Climax:** Wide spread + ultra-high volume + close in lower half = smart money absorbing supply.
- **Buying Climax:** Wide spread + ultra-high volume + close in upper half = distribution.
- **Stopping Volume:** Wide down bar + ultra-high volume + close above mid = buyers absorbing sellers.
- **No Demand:** Narrow spread + low volume + up close = weak move, no institutional buying.
- **No Supply:** Narrow spread + low volume + down close = weak selling, potential long.
- **Effort vs Result:** High volume + tiny price move = trapped party losing. Low volume sustained move = easy trend.
- Volume thresholds: avgVol × 2.0 = high, × 3.0 = ultra-high, × 0.7 = low.

### MarketProfileStrategy (mod_market_profile, weight 1.42)
- 50-bucket volume histogram over last 100 bars
- POC = bucket with max volume
- Value Area = expand from POC until 70% of total volume captured → VAH/VAL
- **Poor High:** 2+ consecutive bars with same high (incomplete auction, will revisit)
- **Poor Low:** 2+ consecutive bars with same low
- Price at VAL = LONG (0.72 confidence) — value zone buyers
- Price at VAH = SHORT (0.72 confidence) — value zone sellers
- POC = strongest magnet level

### VWAPStrategy (mod_vwap, weight 1.38)
- VWAP = Σ(TP × Volume) / Σ(Volume) where TP = (high+low+close)/3
- Standard deviation bands: ±1σ, ±2σ from VWAP
- **VWAP Reclaim:** Price below VWAP, then closes above = bullish bias shift.
- **VWAP Rejection:** Price above VWAP, then closes below = bearish bias shift.
- **±2σ Mean Reversion:** Price at +2σ = SHORT (0.68 conf); price at -2σ = LONG (0.68 conf).
- **VWAP Pullback:** Price pulls back to VWAP from above = long entry (0.65 conf).
- Anchored VWAP from significant swing points as additional S/R.

### MASystemStrategy (mod_ma_systems, weight 1.31)
- EMA 9, 21, 50, 200 calculations
- Golden cross (50 > 200) / Death cross (50 < 200) — trend bias
- EMA alignment: 9 > 21 > 50 = strong uptrend; inverse = strong downtrend
- Price vs EMA 200 = primary bull/bear filter
- EMA convergence/divergence as momentum measure

### ClassicalPatternsStrategy (mod_classical_ta, weight 1.31)
Classical technical analysis patterns:
- **Head & Shoulders / Inverse H&S:** 3-peak pattern, neckline break = reversal.
- **Double Top / Double Bottom:** Equal highs/lows within 1% + retest.
- **Wedges:** Rising wedge (bearish), falling wedge (bullish) — converging trendlines.
- **Triangles:** Symmetrical (breakout), ascending (bullish bias), descending (bearish bias).
- **Flags & Pennants:** Continuation patterns after sharp impulse.
- **Cup & Handle:** Rounded bottom + small consolidation = breakout long.
- Measured move targets: pattern height projected from breakout.

### DivergenceStrategy (mod_divergence, weight 1.28)
- RSI calculated over full bar array, 14-period
- **Regular Bullish Divergence:** Price makes lower low, RSI makes higher low = reversal signal (only when RSI < 45).
- **Regular Bearish Divergence:** Price makes higher high, RSI makes lower high = reversal signal (only when RSI > 55).
- **Hidden Bullish Divergence:** Price makes higher low, RSI makes lower low = continuation LONG.
- **Hidden Bearish Divergence:** Price makes lower high, RSI makes higher high = continuation SHORT.
- Swing detection: `findMinIdx` / `findMaxIdx` within 10-bar lookback windows.
- Confidence: 0.68 regular, 0.62 hidden.

### MeanReversionStrategy (mod_mean_reversion, weight 1.22)
- Z-score: `(price - mean) / stddev` over 20 bars
- Bollinger Bands: 20-period SMA ± 2σ
- ADX filter: only trade when ADX < 25 (non-trending market)
- `Z < -2.0` = LONG (oversold, revert to mean); `Z > 2.0` = SHORT (overbought)
- Confidence: `min(|z-score| / 3, 0.85)` × ADX discount factor
- ADX calculation: True Range → ATR → +DI/-DI → DX → ADX (14-period smoothed)

### MomentumStrategy (mod_momentum, weight 1.18)
- RSI, MACD, Stochastic combinations
- RSI > 60 + MACD crossover = momentum LONG
- RSI < 40 + MACD crossover = momentum SHORT
- Rate of change (ROC) as confirmation
- Momentum divergence from price as signal

### OpeningRangeStrategy (mod_orb, weight 1.15)
- First-N-bars range: `N = 30` for 1m, `6` for 5m, `4` for 15m, `3` for 30m, `2` for 1H, `1` for higher TFs
- ORH = highest high in opening range; ORL = lowest low
- **ORB Long:** Breakout above ORH + volume > avg × 1.2 → target ORH + (ORH-ORL) × 1.5
- **ORB Short:** Breakdown below ORL → target ORL - (ORH-ORL) × 1.5
- Range filter: 0.3%–3% of price (too tight = fake, too wide = extended)
- R:R filter: minimum 1.8:1 required
- **Failed ORB Fade:** Breaks out → fades back inside range → reversal trade

### VolatilityStrategy (mod_volatility, weight 1.10)
- ATR bands around price
- Bollinger Band squeeze: bands narrowing = expansion imminent
- IV percentile proxy from historical ATR range
- High volatility entry (range expansion from squeeze) vs low volatility fade

### DonchianBreakoutStrategy (mod_donchian, weight 1.08)
Turtle Trading System (Richard Dennis / William Eckhardt).
- **System 1 (fast):** 20-bar channel breakout entry; exit on 10-bar opposite breakout
- **System 2 (slow):** 55-bar channel breakout entry; exit on 20-bar opposite breakout
- Stops: 2× ATR from entry price
- **Channel compression:** Current range < 55% of historical average range = squeeze → imminent breakout
- Confidence 0.72 for S2 (more reliable), 0.62 for S1

### IntermarketStrategy (mod_intermarket, weight 0.95)
- Correlation proxies: DXY vs equities, bonds vs equities, gold vs risk-off
- Sector rotation signals
- Crude oil → energy sector
- Dollar strength → emerging market weakness
- Uses bar data correlations as proxy (no live intermarket data feed)

### SentimentStrategy (mod_sentiment, weight 0.85)
- Simulated sentiment scoring based on price action proxies
- Gap up/down momentum as sentiment signal
- Volume surge vs price move ratio as crowd behavior proxy
- Fear/greed proxy: sharp declines on high volume = fear (contrarian long signal)

### SeasonalityStrategy (mod_seasonality, weight 0.72)
- Month-of-year seasonal biases (Jan effect, sell in May, Santa rally, etc.)
- Day-of-week patterns
- Known seasonal anomalies per asset class
- Lower weight — contextual bias only, not primary signal

### ElliottWaveStrategy (mod_elliott, weight 0.71)
- Wave counting on price swings
- Impulse waves 1-3-5, corrective waves A-B-C
- Fibonacci ratios: wave 2 retraces 61.8% of wave 1; wave 3 = 161.8% of wave 1
- Extended waves, failure patterns
- Lower weight due to subjectivity in wave counting

### OrderFlowStrategy (mod_orderflow, weight 0.68)
- Footprint chart proxy from OHLCV (no tick data available)
- Delta estimation: if close > open = buying pressure; vice versa
- Volume-weighted delta over recent bars
- Absorption detection: high volume + small range = order absorption
- Lowest weight — requires tick data for full accuracy, OHLCV proxy is approximate

---

## Scoring and Confluence Rules

1. Minimum 3 modules must agree on direction → `canPublish = true`
2. Direction must not be NEUTRAL
3. Composite score 0–10 only when canPublish is true; 0 otherwise
4. `compositeScore = min((avgConfidence × 0.6 + (agreedCount/22) × 0.4) × 10, 10)`
5. Risk flags generated from context: counter-trend, high volatility, low volatility squeeze
6. Primary signal = highest `confidence × weight` product among agreeing signals

---

## Known Bugs Fixed

| Bug | Root Cause | Fix Applied |
|---|---|---|
| Timeframe switching didn't update chart | React didn't unmount ChartPanel, stale chart state | `key={symbol-timeframe}` on ChartPanel in App.tsx |
| `moduleRatio` wrong with 22 modules | Hardcoded `/13` in engine | Changed to `/this.strategies.size` |
| LiquidityHuntStrategy TS6133 errors | `prev` and `price` declared but unused | Removed unused variables |
| Cache stale on intraday switches | Flat 5-min TTL for all timeframes | Per-TF TTL map (15s–15min) |

---

## Build Commands

```bash
npm run dev       # Vite dev server on :5173 + Electron watching
npm run build     # Full production build (react + electron tsc)
npm run build:react    # Vite only
npm run build:electron # tsc --project tsconfig.electron.json only
```

Dev flow: `npm run dev` starts Vite at :5173, Electron loads that URL in dev mode with DevTools open.

---

## Adding a New Strategy Module

1. Create `src/core/strategies/NewStrategy.ts`
2. Implement `IStrategyModule` interface: `name`, `analyze()`, `getKeyLevels()`, `getConfidence()`, `getWeight()`, `getExplanation()`
3. `name` must be unique string ID (e.g., `'mod_newstrat'`)
4. Import in `src/main/index.ts`
5. Add to `allModuleNames` array
6. Add to `defaultWeights` map
7. Call `analysisEngine.registerStrategy(new NewStrategy())`
8. Weight range: 0.1–2.0. High confidence institutional methods get 1.5+. Lower for noisy/approximate methods.

---

## UI Layout

```
[TopToolbar: SymbolSearch | Timeframe | Analyze | Scan | Replay | ModuleCount | Settings]
[LeftSidebar: Drawing Tools] [ChartPanel: TV Chart + Canvas Overlay] [RightPanel/ScanPanel]
[BottomBar: Symbol | Price | Change% | Bar Count]
```

ChartPanel has:
- Forecast toggle button (top-right, absolute z-20)
- Drawing tools react to `activeTool` prop
- Replay controls exposed via ref

---

## Color Scheme

```
Background: #131722 (TradingView dark)
Up candles: #26a69a (teal)
Down candles: #ef5350 (red)
Prediction candles: #1565c0 / #0d47a1 (blue)
Prediction line: #2196f3 (blue dashed)
Grid: #1e222d
Text primary: #d1d4dc
Accent: #2196f3 (blue)
```

---

## Important Implementation Notes

- `webSecurity: false` in BrowserWindow — required for file:// cross-origin local assets in packaged build
- `show: false` + `ready-to-show` event — prevents blank flash on startup
- Canvas overlay mounted over chart with `pointer-events: none` except when drawing tool active
- `subscribeVisibleLogicalRangeChange` — required so prediction boundary line stays aligned during pan/zoom
- Yahoo Finance requires `User-Agent` header or returns 429
- `includePrePost: false` in Yahoo params — exclude pre/post market data
- Prediction candle series has `priceLineVisible: false, lastValueVisible: false` — no price labels on right axis for predicted candles
- `forwardRef` on ChartPanel — required because App.tsx needs to call replay methods imperatively
- Mock data generator in MarketDataService as fallback when Yahoo fails — realistic OHLCV with trend bias per symbol
