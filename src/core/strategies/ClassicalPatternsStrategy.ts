import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
  OHLCV,
} from '@core/types';

export class ClassicalPatternsStrategy implements IStrategyModule {
  name = 'mod_classical_ta';
  weight = 1.31;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 30) return this.neutralSignal();

    const headShoulders = this.detectHeadShoulders(bars);
    if (headShoulders) {
      if (headShoulders.direction === 'down') {
        return {
          direction: 'SHORT',
          confidence: 0.68,
          entryZone: [headShoulders.neckline * 1.001, headShoulders.neckline * 0.999],
          target1: headShoulders.target,
          target2: headShoulders.target * 0.97,
          invalidation: headShoulders.headHigh * 1.002,
          explanation: `H&S reversal — neckline $${headShoulders.neckline.toFixed(2)}, measured move to $${headShoulders.target.toFixed(2)}`,
          moduleName: this.name,
          weight: this.weight,
        };
      }
      if (headShoulders.direction === 'up') {
        return {
          direction: 'LONG',
          confidence: 0.65,
          entryZone: [headShoulders.neckline * 0.999, headShoulders.neckline * 1.001],
          target1: headShoulders.target,
          target2: headShoulders.target * 1.03,
          invalidation: headShoulders.headHigh * 0.998,
          explanation: `Inv H&S reversal — neckline $${headShoulders.neckline.toFixed(2)}, measured move to $${headShoulders.target.toFixed(2)}`,
          moduleName: this.name,
          weight: this.weight,
        };
      }
    }

    const flag = this.detectFlag(bars);
    if (flag) {
      const last = bars[bars.length - 1];
      if (flag.direction === 'up') {
        return {
          direction: 'LONG',
          confidence: 0.65,
          entryZone: [flag.breakoutLevel, flag.breakoutLevel * 1.003],
          target1: flag.target1,
          target2: flag.target2,
          invalidation: flag.invalidation,
          explanation: `Bull flag — pole: +${flag.polePct.toFixed(1)}%, breakout ${flag.breakoutLevel.toFixed(2)}, target ${flag.target1.toFixed(2)}`,
          moduleName: this.name,
          weight: this.weight,
        };
      }
      if (flag.direction === 'down') {
        return {
          direction: 'SHORT',
          confidence: 0.62,
          entryZone: [flag.breakoutLevel * 0.997, flag.breakoutLevel],
          target1: flag.target1,
          target2: flag.target2,
          invalidation: flag.invalidation,
          explanation: `Bear flag — pole: ${flag.polePct.toFixed(1)}%, breakdown ${flag.breakoutLevel.toFixed(2)}, target ${flag.target1.toFixed(2)}`,
          moduleName: this.name,
          weight: this.weight,
        };
      }
      void last;
    }

    const triangle = this.detectTriangle(bars);
    if (triangle) {
      const dir = triangle.direction;
      return {
        direction: dir === 'up' ? 'LONG' : 'SHORT',
        confidence: 0.60,
        entryZone: dir === 'up'
          ? [triangle.breakout, triangle.breakout * 1.003]
          : [triangle.breakout * 0.997, triangle.breakout],
        target1: triangle.target1,
        target2: triangle.target2,
        invalidation: triangle.invalidation,
        explanation: `${triangle.type} triangle ${dir === 'up' ? 'breakout' : 'breakdown'} — target $${triangle.target1.toFixed(2)}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  private detectFlag(bars: OHLCV[]): {
    direction: 'up' | 'down'; breakoutLevel: number; target1: number;
    target2: number; invalidation: number; polePct: number;
  } | null {
    if (bars.length < 25) return null;

    // Pole: big move in bars[-25:-10]
    const pole = bars.slice(-25, -10);
    const poleOpen = pole[0].close;
    const poleClose = pole[pole.length - 1].close;
    const poleMove = (poleClose - poleOpen) / poleOpen;

    // Flag: tight consolidation in last 10 bars
    const flag = bars.slice(-10);
    const flagHigh = Math.max(...flag.map(b => b.high));
    const flagLow = Math.min(...flag.map(b => b.low));
    const flagRange = (flagHigh - flagLow) / flagLow;

    // Must be tight flag (<3% range) after big pole (>4% move)
    if (flagRange > 0.03) return null;

    if (poleMove > 0.04) {
      // Bull flag
      const last = bars[bars.length - 1];
      if (last.close > flagHigh * 0.999) { // breaking out
        const poleHeight = poleClose - poleOpen;
        return {
          direction: 'up',
          breakoutLevel: flagHigh,
          target1: flagHigh + poleHeight * 0.75,
          target2: flagHigh + poleHeight,
          invalidation: flagLow,
          polePct: poleMove * 100,
        };
      }
    }

    if (poleMove < -0.04) {
      // Bear flag
      const last = bars[bars.length - 1];
      if (last.close < flagLow * 1.001) { // breaking down
        const poleHeight = poleOpen - poleClose;
        return {
          direction: 'down',
          breakoutLevel: flagLow,
          target1: flagLow - poleHeight * 0.75,
          target2: flagLow - poleHeight,
          invalidation: flagHigh,
          polePct: poleMove * 100,
        };
      }
    }

    return null;
  }

  private detectTriangle(bars: OHLCV[]): {
    direction: 'up' | 'down'; breakout: number; target1: number;
    target2: number; invalidation: number; type: string;
  } | null {
    const recent = bars.slice(-25);
    if (recent.length < 20) return null;

    const highs = recent.map(b => b.high);
    const lows = recent.map(b => b.low);
    const last = recent[recent.length - 1];

    // Descending highs + flat lows = ascending triangle (bullish)
    const highRange = Math.max(...highs.slice(0, 12)) - Math.max(...highs.slice(13));
    const lowRange = Math.abs(Math.min(...lows.slice(0, 12)) - Math.min(...lows.slice(13)));

    if (highRange > 0 && lowRange < highRange * 0.3) {
      // Converging from top = ascending triangle
      const apex = Math.max(...highs.slice(0, 5));
      const base = Math.min(...lows);
      const height = apex - base;
      if (last.close > Math.max(...highs.slice(-5)) * 0.999) {
        return {
          direction: 'up', type: 'Ascending',
          breakout: Math.max(...highs.slice(-5)),
          target1: Math.max(...highs.slice(-5)) + height * 0.75,
          target2: Math.max(...highs.slice(-5)) + height,
          invalidation: base,
        };
      }
    }

    // Flat highs + rising lows = descending triangle (bearish)
    const highFlat = Math.abs(Math.max(...highs.slice(0, 12)) - Math.max(...highs.slice(13))) / Math.max(...highs);
    const lowRising = Math.min(...lows.slice(13)) - Math.min(...lows.slice(0, 12));

    if (highFlat < 0.02 && lowRising > 0) {
      const apex = Math.max(...highs);
      const base = Math.min(...lows.slice(-5));
      const height = apex - base;
      if (last.close < Math.min(...lows.slice(-5)) * 1.001) {
        return {
          direction: 'down', type: 'Descending',
          breakout: Math.min(...lows.slice(-5)),
          target1: Math.min(...lows.slice(-5)) - height * 0.75,
          target2: Math.min(...lows.slice(-5)) - height,
          invalidation: apex,
        };
      }
    }

    return null;
  }

  private detectHeadShoulders(bars: OHLCV[]): {
    direction: 'up' | 'down'; headHigh: number; neckline: number; target: number;
  } | null {
    const recent = bars.slice(-30);
    if (recent.length < 25) return null;

    const highs = recent.map(b => b.high);
    const lows = recent.map(b => b.low);

    // Split into 3 sections
    const s1 = highs.slice(0, 10);
    const s2 = highs.slice(10, 20);
    const s3 = highs.slice(20, 30);

    const p1 = Math.max(...s1);
    const p2 = Math.max(...s2);
    const p3 = Math.max(...s3);

    // H&S: middle peak highest, shoulders roughly equal (within 5%)
    if (p2 > p1 && p2 > p3 && Math.abs(p1 - p3) / p2 < 0.05) {
      const neckline = Math.min(...lows.slice(5, 25));
      if (recent[recent.length - 1].close < neckline) {
        return {
          direction: 'down',
          headHigh: p2,
          neckline,
          target: neckline - (p2 - neckline),
        };
      }
    }

    // Inverse H&S: middle trough lowest, shoulders roughly equal
    const l1 = Math.min(...lows.slice(0, 10));
    const l2 = Math.min(...lows.slice(10, 20));
    const l3 = Math.min(...lows.slice(20, 30));

    if (l2 < l1 && l2 < l3 && Math.abs(l1 - l3) / Math.abs(l2) < 0.05) {
      const neckline = Math.max(...highs.slice(5, 25));
      if (recent[recent.length - 1].close > neckline) {
        return {
          direction: 'up',
          headHigh: l2,
          neckline,
          target: neckline + (neckline - l2),
        };
      }
    }

    return null;
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-30);
    const triangle = this.detectTriangle(bars);
    if (triangle) {
      return [{ price: triangle.breakout, type: triangle.direction === 'up' ? 'resistance' : 'support', strength: 0.80, label: `${triangle.type} Triangle` }];
    }
    return [];
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL', confidence: 0, entryZone: [0, 0],
      target1: 0, invalidation: 0, explanation: 'No classical pattern',
      moduleName: this.name, weight: this.weight,
    };
  }

  getConfidence(): number { return 0.63; }
  getWeight(): number { return this.weight; }
  getExplanation(): string { return 'Classical Patterns — flags, triangles, H&S with measured move targets'; }
}
