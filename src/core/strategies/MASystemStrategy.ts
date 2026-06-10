import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Moving Average Systems Strategy
 * EMA crossovers, dynamic support/resistance, ribbon compression
 */
export class MASystemStrategy implements IStrategyModule {
  name = 'mod_ma_systems';
  weight = 1.31;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 200) {
      return this.neutralSignal();
    }

    const ma9 = this.calculateEMA(bars, 9);
    const ma21 = this.calculateEMA(bars, 21);
    const ma50 = this.calculateEMA(bars, 50);
    const ma200 = this.calculateEMA(bars, 200);

    const lastClose = bars[bars.length - 1].close;

    // Golden cross: 9 EMA crosses above 21 EMA
    const prev9 = this.calculateEMA(bars.slice(0, -1), 9);
    const prev21 = this.calculateEMA(bars.slice(0, -1), 21);

    const goldenCross = prev9 <= prev21 && ma9 > ma21;
    const deathCross = prev9 >= prev21 && ma9 < ma21;

    if (goldenCross && lastClose > ma50 && ma50 > ma200) {
      return {
        direction: 'LONG',
        confidence: 0.72,
        entryZone: [ma21, ma9],
        target1: lastClose * 1.05,
        target2: lastClose * 1.1,
        invalidation: ma50 - 1,
        explanation: 'MA Golden Cross — 9 EMA > 21 EMA > 50 EMA > 200 EMA (trending up)',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (deathCross && lastClose < ma50 && ma50 < ma200) {
      return {
        direction: 'SHORT',
        confidence: 0.68,
        entryZone: [ma9, ma21],
        target1: lastClose * 0.95,
        target2: lastClose * 0.9,
        invalidation: ma50 + 1,
        explanation: 'MA Death Cross — 9 EMA < 21 EMA < 50 EMA < 200 EMA (trending down)',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Price above all MAs = long bias
    if (lastClose > ma9 && ma9 > ma21 && ma21 > ma50 && ma50 > ma200) {
      return {
        direction: 'LONG',
        confidence: 0.6,
        entryZone: [ma21, lastClose],
        target1: lastClose * 1.04,
        target2: lastClose * 1.08,
        invalidation: ma50,
        explanation: 'MA ribbon aligned bullish — all MAs stacked upward',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Price below all MAs = short bias
    if (lastClose < ma9 && ma9 < ma21 && ma21 < ma50 && ma50 < ma200) {
      return {
        direction: 'SHORT',
        confidence: 0.57,
        entryZone: [lastClose, ma21],
        target1: lastClose * 0.96,
        target2: lastClose * 0.92,
        invalidation: ma50,
        explanation: 'MA ribbon aligned bearish — all MAs stacked downward',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars;
    if (bars.length < 200) return [];

    const ma9 = this.calculateEMA(bars, 9);
    const ma21 = this.calculateEMA(bars, 21);
    const ma50 = this.calculateEMA(bars, 50);
    const ma200 = this.calculateEMA(bars, 200);

    return [
      {
        price: ma200,
        type: 'support',
        strength: 0.9,
        label: 'EMA 200 (long-term)',
      },
      {
        price: ma50,
        type: 'support',
        strength: 0.8,
        label: 'EMA 50',
      },
      {
        price: ma21,
        type: 'support',
        strength: 0.7,
        label: 'EMA 21',
      },
      {
        price: ma9,
        type: 'support',
        strength: 0.6,
        label: 'EMA 9 (signal)',
      },
    ];
  }

  getConfidence(): number {
    return 0.68;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'MA Systems — Golden/Death crosses, EMA ribbon alignment, dynamic support/resistance';
  }

  private calculateEMA(bars: any[], period: number): number {
    if (bars.length < period) {
      return bars.reduce((sum, b) => sum + b.close, 0) / bars.length;
    }

    const seedCloses = bars.slice(0, period).map((b: any) => b.close);
    const sma = seedCloses.reduce((a: number, b: number) => a + b, 0) / period;
    const multiplier = 2 / (period + 1);

    let ema = sma;
    for (let i = period; i < bars.length; i++) {
      ema = bars[i].close * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No MA system signal',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
