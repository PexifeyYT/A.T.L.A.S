import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Volatility Analysis Strategy
 * Bollinger Bands squeeze, ATR trailing stops, volatility regime detection
 */
export class VolatilityStrategy implements IStrategyModule {
  name = 'mod_volatility';
  weight = 1.1;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 30) {
      return this.neutralSignal();
    }

    const bb = this.calculateBollingerBands(bars, 20, 2);
    const atr = this.calculateATR(bars, 14);
    const lastBar = bars[bars.length - 1];

    // Bollinger Bands squeeze (low volatility setup)
    const bandWidth = bb.upper - bb.lower;
    // Historical average BB bandwidth over last 50 bars
    let bwSum = 0;
    const lookback = Math.min(50, bars.length - 20);
    for (let i = 0; i < lookback; i++) {
      const slice = bars.slice(i, i + 20);
      const c = slice.map((b: any) => b.close);
      const m = c.reduce((a: number, v: number) => a + v, 0) / 20;
      const sd = Math.sqrt(c.reduce((a: number, v: number) => a + (v - m) ** 2, 0) / 20);
      bwSum += sd * 4;
    }
    const avgBandWidth = lookback > 0 ? bwSum / lookback : bandWidth;

    if (bandWidth < avgBandWidth * 0.5) {
      // Squeeze detected — expansion coming
      if (lastBar.close > bb.middle) {
        return {
          direction: 'LONG',
          confidence: 0.58,
          entryZone: [bb.middle, lastBar.close],
          target1: lastBar.close + atr * 2,
          target2: lastBar.close + atr * 3,
          invalidation: bb.lower,
          explanation: `BB squeeze detected — volatility breakout imminent, long bias`,
          moduleName: this.name,
          weight: this.weight,
        };
      }

      if (lastBar.close < bb.middle) {
        return {
          direction: 'SHORT',
          confidence: 0.55,
          entryZone: [lastBar.close, bb.middle],
          target1: lastBar.close - atr * 2,
          target2: lastBar.close - atr * 3,
          invalidation: bb.upper,
          explanation: `BB squeeze detected — volatility breakout imminent, short bias`,
          moduleName: this.name,
          weight: this.weight,
        };
      }
    }

    // Price touches BB bands = reversal setup
    if (Math.abs(lastBar.close - bb.upper) < atr * 0.2) {
      // Near upper band = reversal down
      return {
        direction: 'SHORT',
        confidence: 0.54,
        entryZone: [Math.min(lastBar.close, bb.upper), Math.max(lastBar.close, bb.upper)],
        target1: bb.middle,
        target2: bb.lower,
        invalidation: bb.upper + atr,
        explanation: `Price at BB upper band — mean reversion pullback expected`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (Math.abs(lastBar.close - bb.lower) < atr * 0.2) {
      // Near lower band = reversal up
      return {
        direction: 'LONG',
        confidence: 0.54,
        entryZone: [Math.min(bb.lower, lastBar.close), Math.max(bb.lower, lastBar.close)],
        target1: bb.middle,
        target2: bb.upper,
        invalidation: bb.lower - atr,
        explanation: `Price at BB lower band — mean reversion bounce expected`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars;
    if (bars.length < 30) return [];

    const bb = this.calculateBollingerBands(bars, 20, 2);

    return [
      {
        price: bb.upper,
        type: 'resistance',
        strength: 0.75,
        label: `BB Upper ${bb.upper.toFixed(2)}`,
      },
      {
        price: bb.middle,
        type: 'support',
        strength: 0.7,
        label: `BB Middle (SMA) ${bb.middle.toFixed(2)}`,
      },
      {
        price: bb.lower,
        type: 'support',
        strength: 0.75,
        label: `BB Lower ${bb.lower.toFixed(2)}`,
      },
    ];
  }

  getConfidence(): number {
    return 0.56;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'Volatility — BB squeeze/expansion, band extremes, ATR trailing stops, mean reversion zones';
  }

  private calculateBollingerBands(bars: any[], period: number, stdDev: number) {
    const closes = bars.slice(-period).map((b) => b.close);
    const sma = closes.reduce((a, b) => a + b, 0) / period;

    const variance = closes.reduce((sum, close) => sum + Math.pow(close - sma, 2), 0) / period;
    const sd = Math.sqrt(variance);

    return {
      upper: sma + stdDev * sd,
      middle: sma,
      lower: sma - stdDev * sd,
    };
  }

  private calculateATR(bars: any[], period: number): number {
    if (bars.length < period) return 0;

    let tr = 0;
    for (let i = Math.max(0, bars.length - period); i < bars.length; i++) {
      const bar = bars[i];
      const prev = i > 0 ? bars[i - 1] : bar;

      const h_l = bar.high - bar.low;
      const h_c = Math.abs(bar.high - prev.close);
      const l_c = Math.abs(bar.low - prev.close);

      tr += Math.max(h_l, h_c, l_c);
    }

    return tr / period;
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No volatility signal',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
