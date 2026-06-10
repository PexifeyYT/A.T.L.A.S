import { AnalysisResult, OHLCVData, MarketContext, IStrategyModule } from '@core/types';

export class AnalysisEngine {
  private strategies: Map<string, IStrategyModule> = new Map();

  registerStrategy(strategy: IStrategyModule): void {
    this.strategies.set(strategy.name, strategy);
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

    let strongestSignal = bullishSignals.length >= bearishSignals.length
      ? bullishSignals.sort((a, b) => b.confidence - a.confidence)[0]
      : bearishSignals.sort((a, b) => b.confidence - a.confidence)[0];

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
    const totalAgreed = signals.filter((s) => s.direction === strongestSignal.direction).length;
    const canPublish = totalAgreed >= 3 && strongestSignal.direction !== 'NEUTRAL';

    const result: AnalysisResult = {
      symbol: data.symbol,
      timeframe: data.timeframe,
      timestamp: Date.now(),
      primarySignal: strongestSignal,
      confidence: canPublish ? Math.min(strongestSignal.confidence * 10, 10) : 0,
      modulesAgreed: signals
        .filter((s) => s.direction === strongestSignal.direction)
        .map((s) => s.moduleName),
      keyLevels,
      riskFlags: this.generateRiskFlags(context),
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
    const grouped: Record<number, any> = {};

    levels.forEach((level) => {
      const key = Math.round(level.price * 100) / 100;
      if (!grouped[key]) {
        grouped[key] = level;
      }
    });

    return Object.values(grouped);
  }

  private generateRiskFlags(context: MarketContext): string[] {
    const flags: string[] = [];

    if (context.volatility > 0.7) {
      flags.push('High volatility — widen stops');
    }

    return flags;
  }
}
