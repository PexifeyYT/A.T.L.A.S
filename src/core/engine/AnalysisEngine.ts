import { AnalysisResult, OHLCVData, MarketContext, IStrategyModule, PredictionCandle } from '@core/types';

export class AnalysisEngine {
  private strategies: Map<string, IStrategyModule> = new Map();

  registerStrategy(strategy: IStrategyModule): void {
    this.strategies.set(strategy.name, strategy);
  }

  updateWeights(weights: Map<string, number>): void {
    for (const [name, weight] of weights) {
      const strategy = this.strategies.get(name);
      if (strategy) (strategy as any).weight = weight;
    }
  }

  async analyze(data: OHLCVData, context: MarketContext): Promise<AnalysisResult> {
    // Run all strategies in parallel
    const signalPromises = Array.from(this.strategies.values()).map((strategy) =>
      Promise.resolve(strategy.analyze(data, context)),
    );

    const signals = await Promise.all(signalPromises);

    // Get key levels from all strategies
    const allKeyLevels = Array.from(this.strategies.values()).flatMap((strategy) =>
      strategy.getKeyLevels(data),
    );

    // Deduplicate and merge key levels
    const keyLevels = this.mergeKeyLevels(allKeyLevels);

    // Calculate confluence score
    const bullishSignals = signals.filter((s) => s.direction === 'LONG');
    const bearishSignals = signals.filter((s) => s.direction === 'SHORT');

    const weightedSum = (sigs: typeof signals) =>
      sigs.reduce((sum, s) => sum + s.confidence * s.weight, 0);
    const bullishWins = bullishSignals.length > bearishSignals.length ||
      (bullishSignals.length === bearishSignals.length && weightedSum(bullishSignals) >= weightedSum(bearishSignals));
    let strongestSignal = bullishWins
      ? bullishSignals.sort((a, b) => b.confidence * b.weight - a.confidence * a.weight)[0]
      : bearishSignals.sort((a, b) => b.confidence * b.weight - a.confidence * a.weight)[0];

    // Fall back to neutral signal if no directional signals
    if (!strongestSignal) {
      const lastBar = data.bars[data.bars.length - 1];
      const price = lastBar?.close ?? 100;
      strongestSignal = {
        direction: 'NEUTRAL',
        confidence: 0,
        entryZone: [price, price],
        target1: price * 1.02,
        target2: price * 1.04,
        invalidation: price * 0.97,
        explanation: 'No clear directional confluence across modules',
        moduleName: 'mod_smc',
        weight: 1.0,
      };
    }

    // Minimum 3 modules must agree
    const agreedSignals = signals.filter((s) => s.direction === strongestSignal.direction);
    const totalAgreed = agreedSignals.length;
    const canPublish = totalAgreed >= 3 && strongestSignal.direction !== 'NEUTRAL';

    // Composite score: 60% avg signal confidence, 40% module coverage ratio
    const avgConfidence = agreedSignals.reduce((sum, s) => sum + s.confidence, 0) / Math.max(agreedSignals.length, 1);
    const totalModules = this.strategies.size;
    const moduleRatio = totalAgreed / totalModules;
    const compositeScore = canPublish ? Math.min((avgConfidence * 0.6 + moduleRatio * 0.4) * 10, 10) : 0;

    // Generate prediction candles based on agreed signal direction + confidence
    const lastBar = data.bars[data.bars.length - 1];
    const lastBarTime = Math.floor(lastBar.time / 1000);
    const predictionCandles = this.generatePredictionCandles(
      data,
      strongestSignal.direction,
      compositeScore,
    );

    // Build module votes map for UI
    const moduleVotes: Record<string, { direction: string; confidence: number; agrees: boolean }> = {};
    for (const s of signals) {
      moduleVotes[s.moduleName] = {
        direction: s.direction,
        confidence: s.confidence,
        agrees: s.direction === strongestSignal.direction,
      };
    }

    const result: AnalysisResult = {
      symbol: data.symbol,
      timeframe: data.timeframe,
      timestamp: Date.now(),
      primarySignal: strongestSignal,
      confidence: compositeScore,
      modulesAgreed: signals
        .filter((s) => s.direction === strongestSignal.direction)
        .map((s) => s.moduleName),
      keyLevels,
      riskFlags: this.generateRiskFlags(context, canPublish ? strongestSignal.direction : undefined),
      prediction: {
        scenario1: {
          direction: strongestSignal.direction,
          probability: Math.min(strongestSignal.confidence * 100, 99),
          target1: strongestSignal.target1,
          target2: strongestSignal.target2 || strongestSignal.target1 * 1.05,
        },
      },
      predictionCandles,
      lastRealBarTime: lastBarTime,
      moduleVotes,
    };

    return result;
  }

  private mergeKeyLevels(levels: any[]) {
    if (levels.length === 0) return [];
    const sorted = [...levels].filter(l => l.price > 0).sort((a, b) => a.price - b.price);
    if (sorted.length === 0) return [];
    const clusters: any[][] = [[sorted[0]]];

    for (let i = 1; i < sorted.length; i++) {
      const last = clusters[clusters.length - 1];
      const refPrice = last[0].price;
      // Cluster levels within 0.5% of each other
      if (Math.abs(sorted[i].price - refPrice) / refPrice < 0.005) {
        last.push(sorted[i]);
      } else {
        clusters.push([sorted[i]]);
      }
    }

    return clusters.map(cluster => {
      const best = cluster.reduce((a, b) => a.strength > b.strength ? a : b);
      const avgPrice = cluster.reduce((sum, l) => sum + l.price, 0) / cluster.length;
      return { ...best, price: avgPrice };
    }).sort((a, b) => b.strength - a.strength);
  }

  private generatePredictionCandles(
    data: OHLCVData,
    direction: string,
    confidence: number, // 0-10
  ): PredictionCandle[] {
    const bars = data.bars;
    if (bars.length < 14) return [];

    const last = bars[bars.length - 1];
    const atr = this.calcATR(bars.slice(-14));
    const intervalMs = this.getIntervalMs(data.timeframe);
    const intervalSec = intervalMs / 1000;

    const bias = direction === 'LONG' ? 1 : direction === 'SHORT' ? -1 : 0;
    // Trend strength: confidence 0-10 → 0-1.5% per bar max bias
    const trendPct = (confidence / 10) * 0.015 * bias;

    const candles: PredictionCandle[] = [];
    let price = last.close;
    // Start time = last bar time (in seconds) + one interval
    let time = Math.floor(last.time / 1000) + intervalSec;

    const count = 40; // predict 40 bars forward

    // Use seeded-style noise for reproducibility within the same analysis
    let seed = last.close * 1000;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < count; i++) {
      // Trend decays over time (uncertainty increases)
      const decayFactor = Math.exp(-i * 0.04);
      const trend = price * trendPct * decayFactor;
      // ATR-based noise, increasing with forecast horizon
      const noiseMult = 0.7 + i * 0.02;
      const noise = (rand() - 0.5) * atr * noiseMult;
      const move = trend + noise;

      const open = price;
      const close = Math.max(open * 0.5, open + move);
      const wickMult = 0.15 + rand() * 0.35;
      const high = Math.max(open, close) + atr * wickMult;
      const low = Math.min(open, close) - atr * wickMult;
      const r = (v: number) => Math.round(v * 10000) / 10000;

      candles.push({ time, open: r(open), high: r(high), low: r(Math.max(low, 0.0001)), close: r(close) });
      price = close;
      time += intervalSec;
    }

    return candles;
  }

  private calcATR(bars: OHLCVData['bars']): number {
    if (bars.length < 2) return bars[bars.length - 1]?.close * 0.01 || 1;
    let sum = 0;
    for (let i = 1; i < bars.length; i++) {
      sum += Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i-1].close),
        Math.abs(bars[i].low - bars[i-1].close),
      );
    }
    return sum / (bars.length - 1);
  }

  private getIntervalMs(tf: string): number {
    const map: Record<string, number> = {
      '1m': 60e3, '5m': 5*60e3, '15m': 15*60e3, '30m': 30*60e3,
      '1H': 3600e3, '2H': 2*3600e3, '4H': 4*3600e3,
      '1D': 86400e3, '1W': 7*86400e3, '1M': 30*86400e3,
    };
    return map[tf] ?? 86400e3;
  }

  private generateRiskFlags(context: MarketContext, agreedDirection?: string): string[] {
    const flags: string[] = [];

    if (context.volatility > 0.7) {
      flags.push('High volatility — widen stops by 1.5x ATR');
    }

    if (context.volatility < 0.1) {
      flags.push('Low volatility squeeze — potential expansion imminent, size down');
    }

    if (agreedDirection === 'LONG' && context.macroTrend === 'DOWNTREND') {
      flags.push('Counter-trend LONG vs macro downtrend — reduce position size');
    }

    if (agreedDirection === 'SHORT' && context.macroTrend === 'UPTREND') {
      flags.push('Counter-trend SHORT vs macro uptrend — reduce position size');
    }

    return flags;
  }
}
