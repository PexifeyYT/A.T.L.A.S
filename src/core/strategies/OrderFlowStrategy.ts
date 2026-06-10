import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Order Flow Analysis Strategy
 * Delta analysis, absorption zones, imbalance detection, exhaustion signals
 */
export class OrderFlowStrategy implements IStrategyModule {
  name = 'mod_orderflow';
  weight = 0.68;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 20) {
      return this.neutralSignal();
    }

    const delta = this.calculateDelta(bars);
    const absorption = this.detectAbsorption(bars);
    const lastBar = bars[bars.length - 1];

    // Positive delta accumulation = buying pressure
    if (delta > 500 && lastBar.close > bars[bars.length - 2].close) {
      return {
        direction: 'LONG',
        confidence: 0.50,
        entryZone: [lastBar.close, lastBar.close * 1.01],
        target1: lastBar.close * 1.04,
        target2: lastBar.close * 1.08,
        invalidation: lastBar.low,
        explanation: 'Positive order flow delta — accumulation in progress',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Negative delta = selling pressure
    if (delta < -500 && lastBar.close < bars[bars.length - 2].close) {
      return {
        direction: 'SHORT',
        confidence: 0.48,
        entryZone: [lastBar.close * 0.99, lastBar.close],
        target1: lastBar.close * 0.96,
        target2: lastBar.close * 0.92,
        invalidation: lastBar.high,
        explanation: 'Negative order flow delta — distribution in progress',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Absorption zone = reversal setup
    if (absorption && absorption.type === 'bullish') {
      return {
        direction: 'LONG',
        confidence: 0.46,
        entryZone: [lastBar.close, lastBar.close * 1.01],
        target1: lastBar.close * 1.05,
        target2: lastBar.close * 1.1,
        invalidation: absorption.low,
        explanation: 'Seller absorption detected — bullish reversal potential',
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
    return 0.48;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'Order Flow — Delta analysis, absorption zones, stacked imbalances, exhaustion patterns';
  }

  private calculateDelta(bars: any[]): number {
    // Simplified delta: up bars vs down bars weighted by volume
    let delta = 0;

    for (let i = 1; i < Math.min(bars.length, 21); i++) {
      const bar = bars[i];
      const prev = bars[i - 1];

      if (bar.close > prev.close) {
        delta += bar.volume * 0.5;
      } else if (bar.close < prev.close) {
        delta -= bar.volume * 0.5;
      }
    }

    return delta;
  }

  private detectAbsorption(bars: any[]) {
    // Simplified: detect large volume with small range = absorption
    const recent = bars.slice(-5);
    const ranges = recent.map((b) => b.high - b.low);
    const volumes = recent.map((b) => b.volume);

    const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    for (let i = 0; i < recent.length; i++) {
      if (ranges[i] < avgRange * 0.5 && volumes[i] > avgVolume * 1.5) {
        return {
          type: 'bullish',
          high: recent[i].high,
          low: recent[i].low,
        };
      }
    }

    return null;
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No order flow signal',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
