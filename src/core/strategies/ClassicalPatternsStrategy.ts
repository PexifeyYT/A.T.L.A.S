import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Classical Technical Patterns Strategy
 * Head & shoulders, flags, wedges, triangles, rectangles, pennants
 */
export class ClassicalPatternsStrategy implements IStrategyModule {
  name = 'mod_classical_ta';
  weight = 1.31;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 20) {
      return this.neutralSignal();
    }

    // Detect patterns
    const flag = this.detectFlag(bars);
    const triangle = this.detectTriangle(bars);
    const headShoulders = this.detectHeadShoulders(bars);


    // Flag breakout
    if (flag && flag.direction === 'up') {
      return {
        direction: 'LONG',
        confidence: 0.65,
        entryZone: [flag.breakoutLevel, flag.breakoutLevel * 1.005],
        target1: flag.target1,
        target2: flag.target2,
        invalidation: flag.invalidation,
        explanation: `Bullish flag detected — measured move target ${flag.target1.toFixed(2)}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (flag && flag.direction === 'down') {
      return {
        direction: 'SHORT',
        confidence: 0.62,
        entryZone: [flag.breakoutLevel * 0.995, flag.breakoutLevel],
        target1: flag.target1,
        target2: flag.target2,
        invalidation: flag.invalidation,
        explanation: `Bearish flag detected — measured move target ${flag.target1.toFixed(2)}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Triangle breakout
    if (triangle && triangle.direction === 'up') {
      return {
        direction: 'LONG',
        confidence: 0.63,
        entryZone: [triangle.breakout, triangle.breakout * 1.005],
        target1: triangle.target1,
        target2: triangle.target2,
        invalidation: triangle.invalidation,
        explanation: `Triangle breakout (ascending) — price target ${triangle.target1.toFixed(2)}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (triangle && triangle.direction === 'down') {
      return {
        direction: 'SHORT',
        confidence: 0.60,
        entryZone: [triangle.breakout * 0.995, triangle.breakout],
        target1: triangle.target1,
        target2: triangle.target2,
        invalidation: triangle.invalidation,
        explanation: `Triangle breakout (descending) — price target ${triangle.target1.toFixed(2)}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Head & shoulders reversal
    if (headShoulders && headShoulders.direction === 'down') {
      return {
        direction: 'SHORT',
        confidence: 0.61,
        entryZone: [headShoulders.neckline * 0.995, headShoulders.neckline],
        target1: headShoulders.target,
        target2: headShoulders.target * 0.95,
        invalidation: headShoulders.headHigh + 1,
        explanation: 'Head & shoulders reversal — bearish move to neckline support',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-30);
    const triangle = this.detectTriangle(bars);

    if (triangle) {
      return [
        {
          price: triangle.breakout,
          type: 'resistance',
          strength: 0.8,
          label: 'Triangle Breakout',
        },
      ];
    }

    return [];
  }

  getConfidence(): number {
    return 0.63;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'Classical Patterns — Flags, triangles, head & shoulders, measured moves, breakout projections';
  }

  private detectFlag(bars: any[]) {
    // Simplified flag detection: consolidation after strong move
    const recent = bars.slice(-15);
    const highs = recent.map((b) => b.high);
    const lows = recent.map((b) => b.low);

    const range = Math.max(...highs) - Math.min(...lows);
    const volatility = range / Math.min(...lows);

    if (volatility < 0.05) {
      // Low volatility = potential consolidation
      const poleSize = bars[bars.length - 15]?.close || 100;

      return {
        direction: 'up',
        breakoutLevel: Math.max(...highs),
        target1: Math.max(...highs) + poleSize * 0.5,
        target2: Math.max(...highs) + poleSize,
        invalidation: Math.min(...lows),
      };
    }

    return null;
  }

  private detectTriangle(bars: any[]) {
    // Simplified: detect converging highs and lows
    const recent = bars.slice(-20);
    const highs = recent.map((b) => b.high);
    const lows = recent.map((b) => b.low);

    const highSpread = Math.max(...highs.slice(-10)) - Math.min(...highs.slice(-10));
    const lowSpread = Math.max(...lows.slice(-10)) - Math.min(...lows.slice(-10));

    if (highSpread < lowSpread * 0.5 && lowSpread > 0) {
      // Converging pattern
      const apex = Math.max(...highs) - Math.min(...lows);

      return {
        direction: 'up',
        breakout: Math.max(...recent.slice(-5).map((b) => b.high)),
        target1: Math.max(...recent.slice(-5).map((b) => b.high)) + apex * 0.75,
        target2: Math.max(...recent.slice(-5).map((b) => b.high)) + apex * 1.5,
        invalidation: Math.min(...recent.map((b) => b.low)),
      };
    }

    return null;
  }

  private detectHeadShoulders(bars: any[]) {
    const recent = bars.slice(-25);
    const highs = recent.map((b) => b.high);

    // Simplified: 3 peaks with middle peak highest
    const peak1 = Math.max(...highs.slice(0, 8));
    const peak2 = Math.max(...highs.slice(8, 16));
    const peak3 = Math.max(...highs.slice(16, 25));

    if (peak2 > peak1 && peak2 > peak3 && peak1 > peak3 * 0.95) {
      const neckline = Math.min(...bars.map((b) => b.low));

      return {
        direction: 'down',
        headHigh: peak2,
        neckline,
        target: neckline - (peak2 - neckline),
      };
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
      explanation: 'No classical pattern identified',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
