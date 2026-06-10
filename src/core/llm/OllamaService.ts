import axios from 'axios';
import { AnalysisResult } from '../types';
import { AnalysisFormatter } from '../engine/AnalysisFormatter';

const OLLAMA_BASE = 'http://localhost:11434';
const PREFERRED_MODELS = ['llama3', 'mistral', 'phi3', 'gemma', 'deepseek'];

const ATLAS_SYSTEM_PROMPT = `You are ATLAS (Adaptive Trading & Learning Analysis System), a superintelligent AI trading analyst built into a desktop trading application. You have deep expertise in:

TRADING & MARKETS:
- Smart Money Concepts (SMC): order blocks, fair value gaps, break of structure, change of character, liquidity sweeps, inducement
- TJR Strategy: HTF bias → LTF structure → OB/FVG entry, minimum 2.5:1 RR
- Wyckoff Method: accumulation/distribution schematics, spring, upthrust, UTAD, LPSY
- Elliott Wave Theory: 5-wave impulse, 3-wave corrective, Fibonacci extensions (1.618, 2.618)
- Volume Profile: Point of Control (POC), Value Area High/Low, volume nodes
- Moving Average Systems: EMA 9/21/50/200, golden cross, death cross, ribbon alignment
- Momentum: RSI divergence, MACD histogram, Stochastic crossovers
- Volatility: Bollinger Band squeeze/expansion, ATR-based stops
- Intermarket: DXY correlation, risk-on/off regime detection
- Seasonality: OpEx cycles, turn-of-month effects, day-of-week patterns
- Classical TA: flags, pennants, head & shoulders, triangles, measured moves
- Order Flow: delta analysis, absorption zones, imbalance detection

ABOUT ATLAS SYSTEM:
- 13 strategy modules run in parallel, minimum 3 must agree for signal publication
- Module weights range 0.1–2.0, updated via learning loop (reinforcement-style)
- Learning rate: 0.05 per prediction outcome
- Predictions auto-saved when conviction ≥ 6.0/10
- Background learning loop runs every 30 minutes
- Current module weights (default): SMC 1.82, TJR 1.71, Wyckoff 1.60, Vol. Profile 1.54, MA Systems 1.31, Classical TA 1.31, Momentum 1.18, Volatility 1.10, Intermarket 0.95, Sentiment 0.85, Seasonality 0.72, Elliott Wave 0.71, Order Flow 0.68
- Market data: Yahoo Finance v8 API with realistic mock fallback
- Database: SQLite storing predictions, outcomes, module weights, asset profiles

Answer questions about trading, markets, ATLAS's own analytics, strategy explanations, and anything finance-related. Be direct, precise, and professional. Use concrete numbers and specific techniques.`;

export class OllamaService {
  private formatter = new AnalysisFormatter();
  private available = false;
  private model: string | null = null;
  private chatHistory: { role: string; content: string }[] = [];
  private anthropicKey: string | null = null;

  async init(): Promise<void> {
    // Check for Anthropic API key first
    this.anthropicKey = process.env.ANTHROPIC_API_KEY || null;

    // Try to load from settings file
    if (!this.anthropicKey) {
      try {
        const { app } = await import('electron');
        const fs = await import('fs');
        const path = await import('path');
        const settingsPath = path.join(app.getPath('userData'), 'atlas-settings.json');
        if (fs.existsSync(settingsPath)) {
          const s = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
          if (s.anthropicApiKey) this.anthropicKey = s.anthropicApiKey;
        }
      } catch {}
    }

    if (this.anthropicKey) {
      this.available = true;
      this.model = 'claude-haiku-4-5-20251001';
      console.log('ATLAS LLM: Claude API ready');
      return;
    }

    // Try Ollama
    try {
      const resp = await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 2000 });
      const models: string[] = (resp.data.models ?? []).map((m: any) => m.name as string);

      for (const preferred of PREFERRED_MODELS) {
        const found = models.find(m => m.toLowerCase().startsWith(preferred));
        if (found) {
          this.model = found;
          break;
        }
      }

      if (!this.model && models.length > 0) {
        this.model = models[0];
      }

      this.available = !!this.model;
      if (this.available) {
        console.log(`ATLAS LLM: Ollama connected — using ${this.model}`);
      }
    } catch {
      console.log('ATLAS LLM: No LLM available — using rule-based system');
    }
  }

  setAnthropicKey(key: string): void {
    this.anthropicKey = key || null;
    if (key) {
      this.available = true;
      this.model = 'claude-haiku-4-5-20251001';
    } else {
      // Key cleared — fall back to Ollama or rule-based
      if (!this.model || this.model.startsWith('claude')) {
        this.available = false;
        this.model = null;
      }
    }
  }

  isAvailable(): boolean { return this.available; }
  getModel(): string | null { return this.model; }

  async chat(message: string, context?: {
    symbol?: string;
    timeframe?: string;
    analysisResult?: any;
    performanceStats?: any;
  }): Promise<string> {
    if (this.available && this.model) {
      if (this.anthropicKey && this.model.startsWith('claude')) {
        return this.chatWithClaude(message, context);
      }
      return this.chatWithOllama(message, context);
    }
    return this.ruleBasedChat(message, context);
  }

  private async chatWithClaude(message: string, context?: any): Promise<string> {
    try {
      let systemPrompt = ATLAS_SYSTEM_PROMPT;
      if (context?.symbol) systemPrompt += `\n\nCURRENT CHART: ${context.symbol} on ${context.timeframe || '1D'} timeframe.`;
      if (context?.analysisResult) {
        const r = context.analysisResult;
        systemPrompt += `\nLAST ANALYSIS: ${r.primarySignal?.direction} | Conviction: ${r.confidence?.toFixed(1)}/10 | Entry: $${r.primarySignal?.entryZone?.[0]?.toFixed(2)}–$${r.primarySignal?.entryZone?.[1]?.toFixed(2)} | T1: $${r.primarySignal?.target1?.toFixed(2)} | Invalidation: $${r.primarySignal?.invalidation?.toFixed(2)} | Modules agreed: ${r.modulesAgreed?.join(', ')}`;
      }
      if (context?.performanceStats) {
        const p = context.performanceStats;
        systemPrompt += `\nATLAS PERFORMANCE: ${(p.accuracy * 100)?.toFixed(1)}% accuracy | ${p.total} total calls`;
      }

      const messages = [
        ...this.chatHistory.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: message },
      ];

      const resp = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: systemPrompt,
          messages,
        },
        {
          headers: {
            'x-api-key': this.anthropicKey!,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const reply: string = resp.data.content?.[0]?.text ?? 'No response';
      this.chatHistory.push({ role: 'user', content: message });
      this.chatHistory.push({ role: 'assistant', content: reply });
      if (this.chatHistory.length > 40) this.chatHistory = this.chatHistory.slice(-40);
      return reply;
    } catch (err: any) {
      console.warn('Claude API chat failed:', err?.response?.data || err.message);
      return this.ruleBasedChat(message, context);
    }
  }

  private async chatWithOllama(message: string, context?: any): Promise<string> {
    try {
      let systemPrompt = ATLAS_SYSTEM_PROMPT;

      if (context?.symbol) {
        systemPrompt += `\n\nCURRENT CHART: ${context.symbol} on ${context.timeframe || '1D'} timeframe.`;
      }
      if (context?.analysisResult) {
        const r = context.analysisResult;
        systemPrompt += `\nLAST ANALYSIS: ${r.primarySignal?.direction} | Conviction: ${r.confidence?.toFixed(1)}/10 | Entry: $${r.primarySignal?.entryZone?.[0]?.toFixed(2)}–$${r.primarySignal?.entryZone?.[1]?.toFixed(2)} | T1: $${r.primarySignal?.target1?.toFixed(2)} | Invalidation: $${r.primarySignal?.invalidation?.toFixed(2)} | Modules agreed: ${r.modulesAgreed?.join(', ')}`;
      }
      if (context?.performanceStats) {
        const p = context.performanceStats;
        systemPrompt += `\nATLAS PERFORMANCE: ${(p.accuracy * 100)?.toFixed(1)}% accuracy | ${p.total} total calls | ${p.scored} scored | T1 hit rate: ${(p.t1HitRate * 100)?.toFixed(1)}%`;
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.chatHistory.slice(-10),
        { role: 'user', content: message },
      ];

      const resp = await axios.post(
        `${OLLAMA_BASE}/api/chat`,
        {
          model: this.model,
          messages,
          stream: false,
          options: { temperature: 0.4, top_p: 0.9, num_predict: 600 },
        },
        { timeout: 30000 },
      );

      const reply: string = resp.data.message?.content ?? 'No response';

      this.chatHistory.push({ role: 'user', content: message });
      this.chatHistory.push({ role: 'assistant', content: reply });
      if (this.chatHistory.length > 40) this.chatHistory = this.chatHistory.slice(-40);

      return reply;
    } catch (err) {
      console.warn('Ollama chat failed:', err);
      return this.ruleBasedChat(message);
    }
  }

  private ruleBasedChat(message: string, context?: any): string {
    const q = message.toLowerCase();

    // ATLAS self-knowledge
    if (q.includes('atlas') && (q.includes('how') || q.includes('work') || q.includes('what'))) {
      return `ATLAS runs 13 strategy modules in parallel:\n\n` +
        `🏆 HIGH WEIGHT (>1.3x):\n• SMC (1.82x) — Order blocks, FVGs, liquidity\n• TJR (1.71x) — HTF bias → LTF entry, 2.5:1 RR\n• Wyckoff (1.60x) — Accumulation/distribution phases\n• Volume Profile (1.54x) — POC, VAH, VAL\n• MA Systems + Classical TA (1.31x each)\n\n` +
        `📊 MID WEIGHT (0.8–1.3x):\n• Momentum (1.18x), Volatility (1.10x), Intermarket (0.95x)\n\n` +
        `📉 LOWER WEIGHT (<0.8x):\n• Sentiment (0.85x), Seasonality (0.72x), Elliott (0.71x), Order Flow (0.68x)\n\nMinimum 3 modules must agree. Conviction ≥6.0 auto-saves prediction to SQLite. Learning loop runs every 30min.`;
    }

    if (q.includes('module weight') || q.includes('learning')) {
      return `ATLAS updates module weights after each prediction outcome using a normalized score:\n\n• Direction correct: +2\n• Target 1 hit: +3\n• Target 2 hit: +5\n• No invalidation: +1\n• Invalidation hit: -3\n• Entry respected: +1\n\nScore (-3 to +11) normalized to weight delta (~±0.1). Weights clamped 0.1–2.0. Over time, more accurate modules gain higher weights and dominate the signal.`;
    }

    if (q.includes('performance') || q.includes('accuracy')) {
      if (context?.performanceStats) {
        const p = context.performanceStats;
        return `ATLAS Performance:\n• Accuracy: ${(p.accuracy * 100).toFixed(1)}%\n• Total Calls: ${p.total}\n• Scored Predictions: ${p.scored}\n• T1 Hit Rate: ${(p.t1HitRate * 100).toFixed(1)}%\n\nPerformance improves as more predictions are scored. Check the Performance tab for module-by-module weights.`;
      }
      return `Run ANALYZE and let predictions mature (24h+) for the learning loop to score them. Then check the Performance tab for accuracy stats and module weights.`;
    }

    // SMC
    if (q.includes('order block') || q.includes('ob')) {
      return `Order Blocks (OB) — Smart Money Concepts:\n\n📦 BULLISH OB: Last bearish candle before a strong bullish move that breaks structure. Price returns to this zone for entry.\n\n📦 BEARISH OB: Last bullish candle before a strong bearish move that breaks structure.\n\nKey rules:\n• OB must cause a Break of Structure (BOS) or Change of Character (CHoCH)\n• Look for Fair Value Gaps (FVG) inside the OB for precision entries\n• Valid until price closes through the opposite side\n• Higher timeframe OBs carry more weight`;
    }

    if (q.includes('fvg') || q.includes('fair value gap') || q.includes('imbalance')) {
      return `Fair Value Gaps (FVG) / Imbalances:\n\nFormed when price moves so fast there's a 3-candle gap — the high of candle 1 doesn't overlap with the low of candle 3.\n\n🟢 Bullish FVG: Gap between C1 high and C3 low — price tends to fill before continuing up\n🔴 Bearish FVG: Gap between C1 low and C3 high — price tends to fill before continuing down\n\nUsage: Use FVGs inside HTF Order Blocks as precision entry zones. 50% of the FVG is the optimal entry point. Un-mitigated FVGs act as magnets.`;
    }

    if (q.includes('wyckoff')) {
      return `Wyckoff Method — Phase Analysis:\n\n📈 ACCUMULATION (Bullish):\nPS → SC (Selling Climax) → AR → ST → Spring (fake breakdown below support) → LPS → SOS\n\n📉 DISTRIBUTION (Bearish):\nPSY → BC (Buying Climax) → AR → ST → UTAD (fake breakout above resistance) → LPSY → SOW\n\nKey concept: Composite Man (smart money) accumulates below resistance, distributes above support. Trade WITH the Composite Man — buy Springs, sell UTADs.`;
    }

    if (q.includes('elliott') || q.includes('wave')) {
      return `Elliott Wave Theory:\n\n5-WAVE IMPULSE:\nWave 1: Initial move\nWave 2: Retraces 50–61.8% of Wave 1\nWave 3: Strongest (usually 1.618x Wave 1) — never shortest\nWave 4: Retraces 38.2% of Wave 3, no overlap with Wave 1 top\nWave 5: Final push, often diverges on RSI\n\n3-WAVE CORRECTION (ABC):\nWave A: Initial correction\nWave B: Relief rally (61.8–78.6% retrace)\nWave C: Final leg (equal to or 1.618x Wave A)\n\nFib targets: 1.618, 2.618, 4.236 extensions`;
    }

    if (q.includes('rsi')) {
      return `RSI (Relative Strength Index):\n\n• >70: Overbought — potential reversal or pullback zone\n• <30: Oversold — potential bounce zone\n• 50 level: Trend direction — above = bullish bias, below = bearish\n\nDivergence (more important):\n🔴 Bearish: Price makes higher high, RSI makes lower high\n🟢 Bullish: Price makes lower low, RSI makes higher low\n\nHidden Divergence:\n• Bullish hidden: Price higher low, RSI lower low → trend continuation long\n• Bearish hidden: Price lower high, RSI higher high → trend continuation short`;
    }

    if (q.includes('macd')) {
      return `MACD (Moving Average Convergence Divergence):\n\nComponents:\n• MACD Line: EMA12 − EMA26\n• Signal Line: EMA9 of MACD Line\n• Histogram: MACD − Signal\n\nSignals:\n• Bullish crossover: MACD crosses above Signal (momentum shift up)\n• Bearish crossover: MACD crosses below Signal (momentum shift down)\n• Zero line cross: Trend change\n• Histogram expansion = momentum strengthening\n• Histogram shrinking = momentum weakening\n\nBest with: RSI confirmation + structure break`;
    }

    if (q.includes('support') || q.includes('resistance')) {
      return `Support & Resistance:\n\n📌 Support: Price level where buying pressure exceeds selling. Previous lows, swing lows, POC, round numbers.\n\n📌 Resistance: Price level where selling pressure exceeds buying. Previous highs, swing highs, VAH, round numbers.\n\nRole reversal: Broken support becomes resistance (and vice versa) — most reliable re-test entries.\n\nStrength factors:\n• Number of touches (more = stronger)\n• Timeframe (HTF > LTF)\n• Volume at the level\n• Distance from current price`;
    }

    if (q.includes('risk') || q.includes('stop loss') || q.includes('position size')) {
      return `Risk Management — Non-negotiable rules:\n\n📐 Position sizing:\nRisk per trade = 1–2% of account max\nPosition size = (Account × Risk%) ÷ (Entry − Stop)\n\n🛡️ Stop placement:\n• Below order block / FVG low (for longs)\n• Above order block / FVG high (for shorts)\n• Never round numbers alone — use structure\n\n🎯 Risk:Reward:\n• Minimum 2:1 (TJR requires 2.5:1)\n• At 3:1 RR with 40% win rate = profitable\n• At 2:1 RR need 34%+ win rate to break even\n\n⚠️ Never move stop to breakeven before T1 is hit`;
    }

    if (q.includes('volume profile') || q.includes('poc') || q.includes('vah') || q.includes('val')) {
      return `Volume Profile:\n\n• POC (Point of Control): Price level with most traded volume. Acts as magnet and S/R.\n• VAH (Value Area High): Top of value area (70% of volume). Strong resistance.\n• VAL (Value Area Low): Bottom of value area. Strong support.\n• HVN (High Volume Node): Price consolidates here.\n• LVN (Low Volume Node): Price moves fast through here.\n\nStrategy: Buy at VAL (in uptrend), short at VAH (in downtrend). POC rejection = strong signal. Price inside value area = range. Price outside = trending.`;
    }

    if (q.includes('dxy') || q.includes('dollar') || q.includes('intermarket')) {
      return `Intermarket Analysis — DXY Correlations:\n\n📈 DXY UP → Typically bearish for:\n• Gold (GC), Silver\n• Emerging market equities\n• BTC/Crypto (loose negative correlation)\n• Commodities (oil, copper)\n\n📈 DXY UP → Typically bullish for:\n• US equities (mixed — benefit from strong economy)\n• USD pairs in Forex\n\nRisk-on regime: Stocks ↑, VIX ↓, Bonds ↓, Commodities ↑\nRisk-off regime: Bonds ↑, Gold ↑, VIX ↑, Stocks ↓\n\nATLAS Intermarket module monitors DXY trend direction and flags conflicts.`;
    }

    if (q.includes('seasonality') || q.includes('opex') || q.includes('options expiration')) {
      return `Seasonality & Options Expiration:\n\n📅 Options Expiration (OpEx):\n• Monthly: 3rd Friday of each month — increased volatility, pin risk near max pain\n• Quarterly: March/June/September/December (quad witching)\n\nSeasonal patterns:\n• January Effect: Small caps outperform in January\n• Sell in May: Markets historically weak May–October\n• Santa Rally: Dec 25 – Jan 2 often bullish\n• Turn of Month: First few trading days usually bullish (fund inflows)\n• Monday Effect: Markets open lower on Mondays historically\n\nATLAS Seasonality module applies a bias adjustment based on current date.`;
    }

    if (q.includes('tjr') || q.includes('constitution')) {
      return `TJR Strategy Constitution (built into ATLAS):\n\n1️⃣ HTF Bias First: Determine trend on D1/W1. Only trade in HTF direction.\n\n2️⃣ LTF Structure: Drop to H1/H4, identify Break of Structure (BOS) confirming HTF bias.\n\n3️⃣ Entry Zone: Find unfilled Order Block or Fair Value Gap at LTF that aligns with HTF S/R level.\n\n4️⃣ Entry: Limit order at 50% of OB/FVG or market on BOS retest.\n\n5️⃣ Stop: Below OB low (for longs). Must give 2.5:1 minimum RR to T1.\n\n6️⃣ Targets: T1 = nearest liquidity / HTF structure. T2 = 1.618 extension or next major level.\n\nATLAS TJR module weight: 1.71x`;
    }

    if (q.includes('current') && (q.includes('analysis') || q.includes('signal') || q.includes('trade'))) {
      if (context?.analysisResult) {
        const r = context.analysisResult;
        const sig = r.primarySignal;
        return `Current ATLAS Signal for ${context.symbol}:\n\n${sig.direction === 'LONG' ? '🟢 LONG' : sig.direction === 'SHORT' ? '🔴 SHORT' : '⚪ NEUTRAL'} | Conviction: ${r.confidence?.toFixed(1)}/10\n\nEntry Zone: $${sig.entryZone?.[0]?.toFixed(2)} – $${sig.entryZone?.[1]?.toFixed(2)}\nTarget 1: $${sig.target1?.toFixed(2)}\nTarget 2: $${(sig.target2 ?? 0).toFixed(2)}\nInvalidation: $${sig.invalidation?.toFixed(2)}\n\nModules agreed: ${r.modulesAgreed?.length}/13\n${r.riskFlags?.length > 0 ? `\n⚠️ Risk flags: ${r.riskFlags.join(', ')}` : ''}`;
      }
      return `No analysis run yet. Click ANALYZE to run all 13 modules on the current chart.`;
    }

    // Generic fallback
    const suggestions = [
      'order blocks', 'fair value gaps', 'Wyckoff method', 'Elliott Wave', 'RSI divergence',
      'MACD signals', 'volume profile', 'DXY correlation', 'TJR strategy',
      'risk management', 'position sizing', 'ATLAS modules', 'learning loop',
    ];
    return `I can help with:\n\n${suggestions.map(s => `• ${s}`).join('\n')}\n\nAsk me anything about trading strategies, market analysis, or how ATLAS works internally.`;
  }

  async generateAnalysis(result: AnalysisResult): Promise<string> {
    if (!this.available || !this.model) {
      return this.formatter.format(result);
    }

    // Claude path
    if (this.anthropicKey && this.model.startsWith('claude')) {
      try {
        const prompt = this.buildAnalysisPrompt(result);
        const resp = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 600,
            system: ATLAS_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
          },
          {
            headers: {
              'x-api-key': this.anthropicKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            timeout: 30000,
          },
        );
        const text: string = resp.data.content?.[0]?.text ?? '';
        return text.trim() || this.formatter.format(result);
      } catch (err: any) {
        console.warn('Claude generateAnalysis failed:', err?.response?.data || err.message);
        return this.formatter.format(result);
      }
    }

    // Ollama path
    try {
      const prompt = this.buildAnalysisPrompt(result);
      const resp = await axios.post(
        `${OLLAMA_BASE}/api/generate`,
        {
          model: this.model,
          prompt,
          stream: false,
          options: { temperature: 0.3, top_p: 0.9, num_predict: 512 },
        },
        { timeout: 30000 },
      );

      const text: string = resp.data.response ?? '';
      return text.trim() || this.formatter.format(result);
    } catch {
      return this.formatter.format(result);
    }
  }

  private buildAnalysisPrompt(result: AnalysisResult): string {
    const sig = result.primarySignal;
    const modules = result.modulesAgreed.map(m => m.replace('mod_', '')).join(', ');
    const keyLevels = result.keyLevels.slice(0, 6).map(l => `${l.label}: $${l.price.toFixed(2)}`).join(' | ');
    const entryMid = ((sig.entryZone[0] + sig.entryZone[1]) / 2).toFixed(2);
    const risk = sig.direction === 'LONG'
      ? (sig.entryZone[0] - sig.invalidation).toFixed(2)
      : (sig.invalidation - sig.entryZone[1]).toFixed(2);

    return `ATLAS analysis request for ${result.symbol} (${result.timeframe}):

Signal: ${sig.direction} | Conviction: ${result.confidence.toFixed(1)}/10
Entry: $${sig.entryZone[0].toFixed(2)}–$${sig.entryZone[1].toFixed(2)} (mid $${entryMid}) | Risk: $${risk}
T1: $${sig.target1.toFixed(2)} | T2: $${(sig.target2 ?? sig.target1 * 1.05).toFixed(2)} | Invalidation: $${sig.invalidation.toFixed(2)}
Strategy signal: ${sig.explanation}
Modules agreed (${result.modulesAgreed.length}/13): ${modules}
Key levels: ${keyLevels || 'None'}
Risk flags: ${result.riskFlags.join(', ') || 'None'}

Write a 3-paragraph professional analysis: (1) market structure and bias, (2) setup rationale with the specific entry/target/stop, (3) risk management and what would invalidate this trade. Be specific with price levels. No bullet points — narrative prose only.`;
  }

  clearChatHistory(): void {
    this.chatHistory = [];
  }
}
