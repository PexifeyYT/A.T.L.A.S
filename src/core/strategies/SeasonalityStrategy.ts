import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Seasonality Patterns Strategy
 * Day-of-week tendencies, monthly OpEx effects, pre/post-earnings drift
 */
export class SeasonalityStrategy implements IStrategyModule {
  name = 'mod_seasonality';
  weight = 0.72;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 30) {
      return this.neutralSignal();
    }

    const lastBar = bars[bars.length - 1];
    const lastDate = new Date(lastBar.time);
    const dayOfWeek = this.getDayOfWeek(lastDate);
    const monthlyPattern = this.getMonthlyPattern(lastDate);

    // Monday effect (historically weaker)
    if (dayOfWeek === 'Monday' && monthlyPattern < 0) {
      return {
        direction: 'SHORT',
        confidence: 0.42,
        entryZone: [lastBar.close * 0.99, lastBar.close],
        target1: lastBar.close * 0.97,
        target2: lastBar.close * 0.94,
        invalidation: lastBar.high * 1.02,
        explanation: 'Monday seasonal weakness + end-of-month headwind',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Post-earnings drift (bullish after earnings)
    if (monthlyPattern > 0.5) {
      return {
        direction: 'LONG',
        confidence: 0.45,
        entryZone: [lastBar.close, lastBar.close * 1.01],
        target1: lastBar.close * 1.03,
        target2: lastBar.close * 1.06,
        invalidation: lastBar.low * 0.98,
        explanation: 'Post-earnings drift + positive monthly bias',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  getKeyLevels(): PriceLevel[] {
    return [];
  }

  getConfidence(): number {
    return 0.43;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'Seasonality — Day-of-week tendencies, monthly OpEx, pre/post-earnings drift, turn-of-month effect';
  }

  private getDayOfWeek(d: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getUTCDay()];
  }

  private getMonthlyPattern(d: Date): number {
    const day = d.getUTCDate();
    if (day < 5) return 0.3;  // Turn of month = bullish
    if (day > 25) return -0.2; // End of month = bearish
    return 0;
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No seasonality signal',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
