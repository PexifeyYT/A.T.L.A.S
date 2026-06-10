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
    const strongestSignal =
      bullishSignals.length > bearishSignals.length
        ? bullishSignals.sort((a, b) => b.confidence - a.confidence)[0]
        : bearishSignals.sort((a, b) => b.confidence - a.confidence)[0];

    // Minimum 3 modules must agree
    const totalAgreed = signals.filter((s) => s.direction === strongestSignal.direction).length;
    const canPublish = totalAgreed >= 3;

    const result: AnalysisResult = {
      symbol: data.symbol,
      timeframe: data.timeframe,
      timestamp: Date.now(),
      primarySignal: strongestSignal || signals[0],
      confidence: canPublish ? strongestSignal.confidence * 10 : 0,
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
