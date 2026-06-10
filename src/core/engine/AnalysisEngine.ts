import { AnalysisResult, OHLCVData, MarketContext, IStrategyModule } from '@core/types';

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
    const moduleRatio = totalAgreed / 13;
    const compositeScore = canPublish ? Math.min((avgConfidence * 0.6 + moduleRatio * 0.4) * 10, 10) : 0;

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
    };

    return result;
  }

  private mergeKeyLevels(levels: any[]) {
    if (levels.length === 0) return [];
    const sorted = [...levels].sort((a, b) => a.price - b.price);
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
