ATLAS — AI Trading Analysis System

Complete Build Specification v1.0



Project Vision

Build ATLAS (Adaptive Trading \& Learning Analysis System) — a fully local, self-improving, production-grade Windows desktop application that functions as a superintelligent trading analyst. It replicates TradingView's complete UI/UX while layering a proprietary AI engine that learns from every prediction it makes, getting smarter every single session. This is not a tool — it is a system that grows. Over time, ATLAS becomes the single most accurate trading analysis system ever built for retail use, because unlike any human, it never forgets a pattern, never gets emotional, and never stops learning.

Everything runs 100% locally. No cloud. No subscriptions. No data leaves the machine.



Architecture Overview

ATLAS/

├── core/

│   ├── engine/           # AI analysis engine (local LLM + rule system)

│   ├── learning/         # Self-improvement loop, pattern memory, scoring

│   ├── strategies/       # All strategy modules (TJR, ICT, Wyckoff, Elliott, etc.)

│   ├── prediction/       # Prediction generator + scenario builder

│   └── data/             # Market data fetcher, normalizer, cache

├── database/

│   ├── atlas.db          # SQLite — predictions, outcomes, asset profiles, patterns

│   ├── patterns.db       # Discovered pattern library (grows over time)

│   └── memory.db         # Asset personality profiles, strategy performance log

├── ui/

│   ├── chart/            # Lightweight Charts engine, drawing tools, overlays

│   ├── panels/           # Watchlist, analysis panel, performance dashboard

│   ├── toolbar/          # Top bar, left sidebar, right sidebar (TradingView-identical)

│   └── settings/         # Customization, hotkeys, theme editor

├── models/

│   ├── local/            # Local LLM (Ollama + Mistral/LLaMA fine-tuned)

│   └── constitution/     # TJR Strategy Constitution + Master Strategy Library

└── services/

&#x20;   ├── data-feeds/        # Polygon.io / Alpaca / Yahoo Finance adapters

&#x20;   ├── news/              # Local news sentiment engine

&#x20;   └── scheduler/         # Background learning jobs, outcome checker



Tech Stack (All Local)



Desktop Framework: Electron (Windows-first, cross-platform ready)

Frontend: React 18 + TypeScript + TailwindCSS (TradingView token set)

Charting: TradingView Lightweight Charts v4 (open source, pixel-perfect)

Local AI/LLM: Ollama running Mistral 7B or LLaMA 3.1 8B locally, fine-tuned on trading data and TJR methodology, with a custom rule-layer on top

Analysis Logic: Custom TypeScript strategy engine (rule-based + ML hybrid)

Pattern Recognition: TensorFlow.js running fully in-process (no GPU server needed)

Database: SQLite via better-sqlite3 (3 databases: atlas, patterns, memory)

Market Data: Polygon.io free tier + Yahoo Finance fallback (both cached locally)

News Sentiment: Local NLP using Compromise.js + custom finance sentiment lexicon

State Management: Zustand

Build: electron-builder for Windows .exe installer

Background Jobs: node-cron for scheduled learning, outcome checking, model updates





Section 1: Complete TradingView-Identical UI

Color System (exact TradingView tokens):

Background:     #131722

Surface:        #1e222d

Surface2:       #2a2e39

Border:         #363a45

Text Primary:   #d1d4dc

Text Secondary: #787b86

Accent Blue:    #2962ff

Bullish Green:  #26a69a

Bearish Red:    #ef5350

Warning Orange: #f7a600

Top Toolbar (left to right):



ATLAS logo (replacing TradingView logo)

Symbol search box — clicking OR typing any letter anywhere on the chart instantly opens the search overlay

Timeframe quick-select buttons: 1m 5m 15m 30m 1H 2H 4H 1D 1W 1M

Vertical dropdown column for full interval list (exact match to Image 2):



TICKS: 1, 10, 100, 1000

SECONDS: 1, 5, 10, 15, 30, 45

MINUTES: 1, 2, 3, 5, 10, 15, 30, 45

HOURS: 1, 2, 3, 4

DAYS: 1 day, 1 week, 1 month, 3 months

\+ Add custom interval at top





Indicators button → opens indicator library panel

Alert button

Replay button → activates Replay Mode

Undo / Redo

ANALYZE button (ATLAS-specific — triggers full AI analysis on current chart)

WATCHLIST SCAN button (runs analysis across entire watchlist)



Left Sidebar — Drawing Tools (exact match to Image 1):

\[+]     Add tool / crosshair selector

\[/]     Trend line

\[≡]     Horizontal line / Horizontal ray

\[⋈]     Parallel channel

\[⊥]     Vertical line

\[\~]     Freehand draw / brush

\[T]     Text label

\[☺]     Callout / annotate

\[⊕]     Magnifier / zoom

\[📐]    Fibonacci retracement

\[🔗]    Fibonacci extension

\[🔒]    Lock drawing layer

\[✏️]    Edit mode

\[🔓]    Unlock layer

\[👁️]    Show / hide drawings

\[🗑️]    Delete selected / clear all

Full tool suite beyond sidebar:



Rectangle, triangle, ellipse, arrow, extended line, ray

Fibonacci fan, arc, time zones, circle

Pitchfork (Andrews), Schiff pitchfork, Gann box, Gann fan

Measurement tool (shows Δ price %, bar count, time elapsed)

Price label, date label, range highlighter

Brush with thickness and opacity controls

Eraser with radius control

Full undo/redo stack (unlimited depth, stored in SQLite)

All drawings persist between sessions, per-symbol, per-timeframe

Right-click any drawing → Edit properties, Clone, Lock, Delete



Right Panel:



Watchlist tab (symbol, last price, change, change %)

Symbol Info tab (full description, exchange, sector, market cap, earnings date)

ATLAS Analysis tab (AI output — rendered after analysis runs)

Performance tab (prediction accuracy dashboard)



Bottom Bar:



Time scrubber with date display

Bar count indicator

UTC clock (live)

ADJ toggle (adjusted/unadjusted prices)

Scale mode toggle (% / log / linear)





Section 2: Symbol Search \& Asset Monitoring



Typing any alphanumeric key anywhere on the chart (when no input is focused) instantly opens the search overlay — identical to TradingView behavior

Search overlay: dark frosted-glass panel, centered

Results update in real-time as user types, showing:



Ticker symbol (bold)

Full company/asset name

Exchange badge

Asset type badge (Stock / Crypto / Forex / Futures / Index / ETF)

Last price + % change





Keyboard navigation: arrow keys to move, Enter to load, Escape to close

Recent searches and most-analyzed assets shown when overlay opens with empty query

Clicking a result loads the chart, fetches historical data, and runs ATLAS analysis automatically





Section 3: Watchlist Feature

Watchlist Panel (right sidebar):



Add/remove symbols manually or by typing in search

Drag to reorder

Color-coded by ATLAS signal: green border = Bullish, red = Bearish, gray = Neutral

Mini sparkline (7-day) beside each symbol

Click any symbol → loads chart instantly



Watchlist Scan Mode:



Click WATCHLIST SCAN in top toolbar

ATLAS runs full AI analysis on every symbol in the watchlist sequentially

Progress bar shows scan status (e.g., "Analyzing 4/12: NVDA...")

Results render in a full-screen scannable table:



| Symbol | Price  | Signal      | Conviction | Setup Type        | Key Level | Target 1 | Target 2 | Invalidation |

|--------|--------|-------------|------------|-------------------|-----------|----------|----------|--------------|

| TSLA   | 396.68 | 🟢 LONG     | 7.8/10     | OB + FVG Retest   | $388.00   | $420.00  | $445.00  | $375.00      |

| NVDA   | 208.19 | 🔴 SHORT    | 6.2/10     | CHoCH + Bearish OB| $212.00   | $195.00  | $182.00  | $218.00      |

| AAPL   | 290.55 | ⚪ NEUTRAL  | 4.1/10     | Range — No Setup  | —         | —        | —        | —            |



Sortable by any column

Click any row → opens that symbol's full chart with analysis already rendered

Export scan results as CSV or PDF





Section 4: AI Analysis Engine

Trigger: User clicks ANALYZE or loads a new symbol.

Analysis Pipeline (runs locally, in sequence):

1\. Fetch OHLCV data → all timeframes (1m through Monthly)

2\. Run Multi-Timeframe Structure Analysis

3\. Identify all key levels (S/R, OBs, FVGs, Liquidity pools)

4\. Run all strategy modules in parallel

5\. Score confluences — count how many strategies agree

6\. Pull Asset Personality Profile from memory.db

7\. Pull news sentiment (local NLP)

8\. Pull economic calendar flags

9\. Generate Primary + Alternate scenarios

10\. Render prediction overlay on chart

11\. Write prediction record to atlas.db (for future scoring)

12\. Render written analysis in right panel

Strategy Modules (all run in parallel, each returns a signal + confidence):



mod\_tjr — TJR Strategy Constitution rules

mod\_smc — Smart Money Concepts (ICT framework)

mod\_wyckoff — Wyckoff accumulation/distribution

mod\_elliott — Elliott Wave counter + projector

mod\_volume\_profile — POC, VAH, VAL, HVN, LVN

mod\_classical\_ta — Head/shoulders, flags, wedges, channels

mod\_ma\_systems — EMA/SMA crosses, slope, dynamic S/R

mod\_momentum — RSI divergence, MACD, Stochastic, MFI

mod\_volatility — BB squeeze, ATR, VIX correlation

mod\_intermarket — DXY, bonds, sector rotation, risk-on/off

mod\_orderflow — Delta, absorption, imbalance (where data available)

mod\_sentiment — News NLP score, social mention volume

mod\_seasonality — Day-of-week, monthly expiry, earnings cycle



Confluence Scoring:

javascriptconst signalScore = modules

&#x20; .filter(m => m.direction === primaryDirection)

&#x20; .reduce((sum, m) => sum + (m.confidence \* m.weight), 0);



// Minimum 3 modules must agree for a signal to be published

// Conviction degrades if: against HTF trend, near earnings, major macro event within window



Section 5: Prediction Overlay \& Scenario Map

On the chart, after analysis:



Primary path — solid gradient line (green tinted if bullish, red if bearish), labeled with P1: 72%

Bull alternate — thin dashed green line, labeled ALT-B: 18%

Bear alternate — thin dashed red line, labeled ALT-S: 10%

Confidence band — shaded area that widens as projection extends (tighter near-term, wider long-term)

Entry Zone box — translucent green/red rectangle at the identified entry level

Target labels — horizontal dashed lines at T1 and T2, price labeled

Invalidation line — solid red horizontal line, labeled INVALIDATION: $XXX

Key level markers — labeled horizontal lines at all identified S/R, OBs, FVGs

Structure labels — small text overlays: "BOS," "CHoCH," "FVG," "OB," "Liquidity Sweep," etc.



All overlays are toggleable (show/hide each layer independently).

Written Analysis Panel (right sidebar, ATLAS tab):

━━━ ATLAS ANALYSIS — TSLA — 1D ━━━



📊 MARKET STRUCTURE

Price is in a bullish market structure on the daily, 

having broken the last significant high at $388.42 and 

creating a series of higher highs and higher lows since 

the March 2025 swing low at $214.36.



🎯 KEY LEVELS

\- Daily Order Block: $383.00–$388.00 (untested origin candle)

\- 4H FVG: $391.20–$396.80 (partially filled)

\- Weekly Liquidity Pool: $412.00 (equal highs — likely target)

\- Major Support: $375.00 (previous CHoCH level)



📈 PRIMARY SCENARIO — 72% CONFIDENCE

Bias: BULLISH

Entry Zone: $383.00–$388.00 (OB retest)

Target 1: $420.00 (+8.4%)

Target 2: $445.00 (+14.8%)

Invalidation: Daily close below $375.00

Time Horizon: 8–15 trading days



📉 ALTERNATE SCENARIO — 28% CONFIDENCE  

If price fails to hold $383.00, expects a deeper retest 

of the $360.00–$365.00 weekly demand zone before 

any bullish continuation attempt.



⚠️ RISK FLAGS

\- Earnings report in 18 days — widen stops

\- DXY showing strength — mild headwind for equities

\- RSI approaching overbought on 4H (71.2)



🧠 STRATEGY CONFLUENCES (8/13 modules agree bullish)

✅ TJR OB Retest Setup

✅ ICT Optimal Trade Entry Zone

✅ Wyckoff Spring in progress

✅ Elliott Wave 4 correction complete

✅ Volume Profile POC holding as support

✅ EMA 21 dynamic support intact

✅ News sentiment: NEUTRAL-BULLISH (68/100)

✅ Daily structure: Higher low confirmed

❌ Intermarket: DXY mild headwind

❌ RSI: Near overbought on 4H

❌ MACD: Histogram compressing



🤖 ATLAS CONVICTION: 7.4/10

━━━━━━━━━━━━━━━━━━━━━━━━━━

Panel is exportable as PDF with chart snapshot included.



Section 6: Replay Feature



Click Replay in top toolbar

Chart rewinds to a user-selected historical date (date picker appears)

All future candles are hidden — chart looks exactly as it did on that date

Play forward bar-by-bar at adjustable speeds: 0.5x 1x 2x 5x 10x

Step forward one bar at a time with arrow key

ATLAS runs its full analysis at the replay start date — user can see what it predicted vs. what actually happened (visible as bars are revealed)

Replay mode badge shown in top-left corner of chart

All drawing tools work in Replay mode

ESC exits replay, returns to live chart





Section 7: TJR Strategy Constitution (Full Extraction)

Deep research every TJR Trades video at @TJRTrades and extract, then permanently encode as the constitution.json rulebook:

json{

&#x20; "strategy\_name": "TJR\_CONSTITUTION\_v1",

&#x20; "core\_framework": "Smart Money Concepts + ICT",

&#x20; "entry\_requirements": {

&#x20;   "minimum\_conditions\_met": 4,

&#x20;   "conditions": \[

&#x20;     "HTF bias established (Daily or higher)",

&#x20;     "Market structure break confirmed (BOS or CHoCH on LTF)",

&#x20;     "Price inside valid order block or FVG",

&#x20;     "Liquidity sweep on LTF before entry",

&#x20;     "Confluence with key Fibonacci level (0.618, 0.705, 0.79 OTE)"

&#x20;   ]

&#x20; },

&#x20; "invalidation\_rules": \[

&#x20;   "Daily candle closes beyond the origin candle of OB",

&#x20;   "Price creates new structure low in bullish setup",

&#x20;   "Volume spike against thesis direction",

&#x20;   "News event fundamentally changes asset outlook"

&#x20; ],

&#x20; "timeframe\_stack": {

&#x20;   "bias": \["Monthly", "Weekly", "Daily"],

&#x20;   "intermediate": \["4H", "1H"],

&#x20;   "entry": \["15M", "5M"],

&#x20;   "precision": \["1M"]

&#x20; },

&#x20; "risk\_management": {

&#x20;   "minimum\_rr": 2.5,

&#x20;   "max\_risk\_per\_trade": "1% of account",

&#x20;   "preferred\_rr": 4.0,

&#x20;   "stop\_placement": "Beyond OB origin candle + ATR buffer"

&#x20; },

&#x20; "sit\_out\_conditions": \[

&#x20;   "Within 48 hours of major macro event",

&#x20;   "Earnings within 5 trading days",

&#x20;   "Conviction below 6.0/10",

&#x20;   "Less than 3 timeframes in confluence",

&#x20;   "VIX above 30 without volatility strategy active"

&#x20; ]

}



Section 8: Master Strategy Library

Layer every proven strategy as an independent module. Each module is a self-contained TypeScript class implementing IStrategyModule:

typescriptinterface IStrategyModule {

&#x20; name: string;

&#x20; analyze(data: OHLCVData, context: MarketContext): StrategySignal;

&#x20; getKeyLevels(data: OHLCVData): PriceLevel\[];

&#x20; getConfidence(): number;        // 0–1

&#x20; getWeight(): number;            // learned weight, updated by self-improvement loop

&#x20; getExplanation(): string;       // plain English explanation of its finding

}

Modules:



SmartMoneyConcepts — BOS/CHoCH, OBs, FVGs, breaker blocks, mitigation, liquidity voids, kill zones, daily profiles

WyckoffMethod — Accumulation/distribution phase detection, spring/upthrust, composite man logic, P\&F count projection

ElliottWave — 5-wave impulse detection, 3-wave correction, degree labeling, Fibonacci wave relationships, truncation/extension detection

VolumeProfile — POC, VAH, VAL, HVN, LVN, single print detection, naked POC magnet logic

OrderFlow — Delta analysis, absorption zones, stacked imbalances, exhaustion signals

ClassicalTA — 23 classical patterns with exact breakout confirmation rules and measured move projections

MovingAverageSystems — EMA/SMA crosses, dynamic S/R, slope angle, MA ribbon compression

MomentumOscillators — RSI regular + hidden divergence, MACD histogram reversal, Stochastic extremes, MFI, Williams %R

VolatilityAnalysis — BB squeeze setup, ATR trailing stops, historical vs. implied volatility context

IntermarketAnalysis — DXY/equity correlation, bond yield impact, sector rotation matrix, risk-on/off regime classifier

SentimentAnalysis — Local news NLP scoring, social mention volume trend, options flow signals (where available)

SeasonalityPatterns — Day-of-week tendency database, monthly OpEx effects, pre/post-earnings drift patterns





Section 9: Multi-Timeframe Confluence Engine

Hard rule — analysis always runs top-down:

Monthly → Weekly → Daily → 4H → 1H → 15M → 5M → 1M

For every analysis:



Macro bias (Monthly/Weekly) — Trending / Ranging / Reversing — sets the direction filter

Intermediate structure (Daily/4H) — Where is price in the swing? Key levels mapped

Setup timeframe (1H/15M) — What specific pattern is forming? Entry type identified

Trigger timeframe (5M/1M) — Exact candle confirmation criteria



Minimum 3 timeframes in directional agreement → signal published

Fewer than 3 → output "NO SETUP — WAITING FOR CONFLUENCE" with reasoning

Confluence score displayed as a visual meter in the analysis panel: ████████░░ 8/10 Timeframes Aligned



Section 10: Self-Improvement Learning System

This is what makes ATLAS unique. It never stops learning.

Prediction Lifecycle:

ANALYSIS RUNS

&#x20;    ↓

Prediction record written to atlas.db:

{

&#x20; id: uuid,

&#x20; symbol: "TSLA",

&#x20; timeframe: "1D",

&#x20; timestamp: 1749494400,

&#x20; direction: "BULLISH",

&#x20; entry\_zone: \[383.00, 388.00],

&#x20; target\_1: 420.00,

&#x20; target\_2: 445.00,

&#x20; invalidation: 375.00,

&#x20; horizon\_bars: 12,

&#x20; modules\_agreed: \["mod\_tjr", "mod\_smc", "mod\_wyckoff", ...],

&#x20; conviction: 7.4,

&#x20; status: "PENDING"

}

&#x20;    ↓

Background scheduler checks every 30 minutes (market hours)

&#x20;    ↓

After horizon\_bars have elapsed:

\- Fetch actual OHLCV data for that window

\- Score the prediction:

&#x20; • Direction correct? (+2 pts)

&#x20; • Target 1 hit? (+3 pts)

&#x20; • Target 2 hit? (+5 pts)

&#x20; • Invalidation NOT triggered? (+1 pt)

&#x20; • Invalidation triggered? (-3 pts)

&#x20; • Entry zone respected? (+1 pt)

\- Write outcome back to prediction record

\- Update module weights in memory.db

\- Check for new patterns in the outcome data

&#x20;    ↓

LEARNING LOOP FIRES

Module Weight Update (Reinforcement Learning):

typescriptfunction updateModuleWeight(module: string, outcome: PredictionOutcome) {

&#x20; const current = db.getModuleWeight(module);

&#x20; const reward = calculateReward(outcome);  // -1.0 to +1.0

&#x20; const learningRate = 0.05;

&#x20; const newWeight = current + (learningRate \* reward);

&#x20; db.setModuleWeight(module, clamp(newWeight, 0.1, 2.0));

}

// Modules that consistently contribute to winning predictions get heavier weight

// Modules that consistently appear in losing predictions get lighter weight

// This happens automatically, every single prediction cycle

Pattern Discovery Engine:

After every 50 predictions are scored, the pattern engine runs:

typescriptfunction discoverNewPatterns() {

&#x20; // Pull all winning predictions from last 500

&#x20; const winners = db.getOutcomes({ minScore: 8, limit: 500 });

&#x20; 

&#x20; // Find common feature combinations in winners:

&#x20; // - Which module combinations co-occur most in wins?

&#x20; // - Which price structure features appear consistently?

&#x20; // - Which timeframe combinations produce best accuracy?

&#x20; // - Which asset types respond best to which strategies?

&#x20; 

&#x20; // Any combination appearing in 70%+ of winners that isn't

&#x20; // already in the rule library → flagged as "Emerging Pattern"

&#x20; // User gets notified: "ATLAS discovered a new pattern: \[description]"

&#x20; // Pattern stored in patterns.db with confidence score

&#x20; // ATLAS begins weighting this pattern in future analyses

}

Asset Personality Profile (builds over time per symbol):

json{

&#x20; "symbol": "TSLA",

&#x20; "profile\_version": 47,

&#x20; "last\_updated": "2026-06-09",

&#x20; "behavior": {

&#x20;   "ema\_21\_respect\_rate": 0.73,

&#x20;   "fvg\_fill\_rate": 0.81,

&#x20;   "ob\_respect\_rate": 0.68,

&#x20;   "mean\_reversion\_tendency": 0.44,

&#x20;   "trend\_following\_tendency": 0.71,

&#x20;   "avg\_daily\_range\_pct": 3.8,

&#x20;   "earnings\_gap\_up\_hold\_rate": 0.52,

&#x20;   "earnings\_gap\_down\_hold\_rate": 0.31,

&#x20;   "best\_performing\_strategy": "mod\_smc",

&#x20;   "worst\_performing\_strategy": "mod\_elliott",

&#x20;   "best\_timeframe": "4H",

&#x20;   "volatility\_profile": "HIGH",

&#x20;   "market\_leader\_or\_lagger": "LEADER",

&#x20;   "dxy\_correlation": -0.41

&#x20; },

&#x20; "atlas\_accuracy\_on\_this\_symbol": 0.74,

&#x20; "total\_predictions": 89,

&#x20; "wins": 66,

&#x20; "notes": "Respects OBs strongly. FVGs fill \~80% of time. Elliott Wave unreliable on this asset. 4H is best entry timeframe. Avoid holding through earnings."

}

Profiles update automatically after every scored prediction. The AI reads the profile before every analysis and adjusts its strategy weights per-asset accordingly.

Learning Milestones:

ATLAS tracks its own evolution and notifies the user at key moments:



"ATLAS has now made 100 predictions. Current accuracy: 61.3%"

"ATLAS has discovered a new pattern: 4H OB + Daily FVG confluence produces 78% win rate on large-cap tech"

"ATLAS accuracy on TSLA has reached 80% after 45 predictions"

"Module reweighting complete: mod\_wyckoff weight increased to 1.6x, mod\_elliott reduced to 0.7x"

"ATLAS has surpassed 1,000 predictions. Rolling 90-day accuracy: 71.8%"





Section 11: Performance Dashboard

Dedicated full-screen panel inside ATLAS:

━━━ ATLAS PERFORMANCE DASHBOARD ━━━



OVERALL ACCURACY          71.8%    (847/1,180 predictions scored)

DIRECTIONAL ACCURACY      78.4%    (direction called correctly)

TARGET 1 HIT RATE         64.2%

TARGET 2 HIT RATE         41.7%

AVERAGE R:R ACHIEVED      3.2:1    (vs. projected 3.8:1)

INVALIDATION HIT RATE     21.6%    (thesis killed before target)



BY ASSET CLASS:

&#x20; Stocks (Large Cap)       74.1%   ████████████████████░░░░░

&#x20; Stocks (Small Cap)       58.3%   ███████████████░░░░░░░░░░

&#x20; Crypto                   69.7%   ██████████████████░░░░░░░

&#x20; Forex                    71.2%   ███████████████████░░░░░░

&#x20; Futures                  66.4%   █████████████████░░░░░░░░



BY TIMEFRAME:

&#x20; 1D                       76.3%   Best performing

&#x20; 4H                       72.1%

&#x20; 1H                       68.4%

&#x20; 15M                      61.2%

&#x20; 5M                       54.7%   Least reliable



BY STRATEGY MODULE:

&#x20; mod\_smc                  78.2%   Weight: 1.82x ↑

&#x20; mod\_tjr                  75.6%   Weight: 1.71x ↑

&#x20; mod\_wyckoff              72.4%   Weight: 1.60x ↑

&#x20; mod\_volume\_profile       71.8%   Weight: 1.54x

&#x20; mod\_classical\_ta         68.3%   Weight: 1.31x

&#x20; mod\_momentum             65.1%   Weight: 1.18x

&#x20; mod\_elliott              58.4%   Weight: 0.71x ↓

&#x20; mod\_sentiment            54.2%   Weight: 0.62x ↓



DISCOVERED PATTERNS (23 total):

&#x20; • 4H OB + Daily FVG confluence → 78.4% accuracy (144 samples)

&#x20; • Wyckoff Spring + Volume spike → 81.2% accuracy (67 samples)

&#x20; • 3-TF EMA alignment + OTE zone → 74.7% accuracy (91 samples)

&#x20; \[View all 23 patterns →]



ROLLING ACCURACY TREND (chart):

&#x20; \[Line chart showing 30/60/90-day rolling accuracy over time]



BEST RECENT CALLS:          WORST RECENT CALLS:

&#x20; NVDA 4H LONG  +18.4%       AAPL 1D SHORT -8.1%

&#x20; BTC  1D LONG  +24.7%       SPY  1H LONG  -4.3%

&#x20; MSFT 4H SHORT +11.2%       META 4H LONG  -6.7%



Section 12: Sentiment \& External Data (Local)

All of this runs locally — no paid APIs required for core function:



News Sentiment: RSS feeds from Reuters, Bloomberg (public), Yahoo Finance News — parsed locally, scored using a custom finance sentiment lexicon (bullish/bearish word weights) + Compromise.js NLP — score per asset, per day

Economic Calendar: Local SQLite table populated from a free economic calendar API (TradingEconomics free tier or scraped from ForexFactory) — flags CPI, FOMC, NFP, GDP, earnings dates

Short Interest: Fetched from FINRA free data (updated twice monthly) — stored locally, surfaced when short interest > 20% of float

Options Activity: Where available via Unusual Whales free tier or Yahoo Finance options chain — large OI at specific strikes flagged as target magnets

Social Volume: Reddit mention count via Pushshift/RedditAPI free tier — sudden volume spikes flagged as attention signal





Section 13: Customization Settings

Full settings panel with live preview:

Theme:



Dark (default — TradingView identical)

Light

Custom — full color picker for every UI token (background, surface, text, accent, up/down candle colors)

Save/load named themes



Chart:



Chart type: Candlestick / Heikin-Ashi / Line / Area / Bar / Baseline / Hollow Candle

Default indicators (toggle each): EMA 9, EMA 21, EMA 50, EMA 200, VWAP, Volume, RSI, MACD, Bollinger Bands

Grid style: None / Dotted / Solid

Price scale: Linear / Log / Percent

Watermark: Show symbol name on chart (toggleable)

Background watermark opacity slider



ATLAS AI:



Analysis sensitivity: Conservative (fewer signals, higher accuracy) ↔ Aggressive (more signals, lower threshold)

Minimum confluence required: 2 / 3 / 4 / 5 modules

Prediction horizon: 10 / 20 / 50 / 100 bars

Auto-analyze on symbol load: On / Off

Show/hide each overlay layer: Prediction line, Key levels, Structure labels, Entry zone, Targets, Invalidation

Learning system: On / Off / Reset (with confirmation)



Hotkeys:



Fully remappable, matching TradingView defaults out of the box

Alt+T: Trend line

Alt+H: Horizontal line

Alt+F: Fibonacci retracement

Alt+A: Run ATLAS analysis

Space: Play/pause replay

Arrow keys: Step through replay bars

Ctrl+Z / Ctrl+Y: Undo / Redo drawings



Data:



Primary data source: Polygon.io / Yahoo Finance / Alpaca

API key fields (stored locally in encrypted config)

Cache settings: Max cache age, clear cache button

Data refresh rate: 1s / 5s / 15s / 30s / 1m (live charts only)





Section 14: Quality \& Polish Requirements



Zero placeholder UI — every button is functional. Unbuilt features show tooltip: "Coming in v1.1"

Sub-200ms chart render on timeframe or symbol switch

AI analysis completes in under 15 seconds per asset on local hardware (i5/i7 with 16GB RAM minimum spec)

LLM responses stream into the analysis panel in real-time (typing effect) so user sees progress

All drawings persist between sessions, per symbol, per timeframe

Keyboard shortcuts match TradingView exactly, fully remappable

Error states handled gracefully — API down, no data, rate limited: clear message + fallback action

Offline capable — works fully offline using cached data (clearly indicated when using cache)

Auto-updater — electron-updater checks for ATLAS updates on launch

First-run onboarding — guided tour of all panels on first launch

Crash recovery — unsaved drawings auto-recovered on next launch

Windows installer — single .exe via electron-builder, installs to Program Files, adds to Start Menu and Desktop

Minimum system requirements displayed in installer: Windows 10+, 8GB RAM, 4GB disk, i5 or equivalent





The Standard

ATLAS should be able to sit in front of any chart, on any asset, on any timeframe, and produce an analysis that a 20-year SMC + Wyckoff + ICT trained institutional trader would read and say "yes — it sees exactly what I see, and then some."

On day one, it is as smart as the rules it was built with. On day 365, it has seen thousands of predictions play out, discovered dozens of patterns no human codified, learned which strategies work on which assets, and compounded that knowledge into every new analysis it produces.

It gets better every single day. It never forgets. It never gets emotional. It never misses a pattern. It is the last trading tool anyone will ever need.

