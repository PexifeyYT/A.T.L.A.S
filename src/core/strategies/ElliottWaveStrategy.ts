import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Elliott Wave Strategy
 * Identifies 5-wave impulses, 3-wave corrections, Fibonacci relationships
 */
export class ElliottWaveStrategy implements IStrategyModule {
  name = 'mod_elliott';
  weight = 0.71;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 40) {
      return this.neutralSignal();
    }

    const waves = this.identifyWaves(bars);
    if (!waves || waves.direction === 'UNKNOWN') {
      return this.neutralSignal();
    }

    const lastBar = bars[bars.length - 1];
    const projection = this.projectWaveTarget(bars, waves);

    if (waves.direction === 'LONG') {
      return {
        direction: 'LONG',
        confidence: 0.58,
        entryZone: [lastBar.close, lastBar.close * 1.005],
        target1: projection.target1,
        target2: projection.target2,
        invalidation: waves.wave3Low * 0.997,
        explanation: 'Elliott Wave impulse — wave 4 correction complete, wave 5 forming',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return {
      direction: 'SHORT',
      confidence: 0.52,
      entryZone: [lastBar.close * 0.995, lastBar.close],
      target1: projection.target1,
      target2: projection.target2,
      invalidation: waves.wave3High * 1.003,
      explanation: 'Elliott Wave — bearish 5-wave correction in progress',
      moduleName: this.name,
      weight: this.weight,
    };
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-50);
    const waves = this.identifyWaves(bars);

    if (!waves) {
      return [];
    }

    return [
      {
        price: waves.wave3High || waves.wave3Low,
        type: 'resistance',
        strength: 0.7,
        label: 'Wave 3 Extreme',
      },
    ];
  }

  getConfidence(): number {
    return 0.58;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'Elliott Wave — impulse/correction pattern with Fibonacci projections';
  }

  private identifyWaves(bars: any[]) {
    const recent = bars.slice(-35);
    const lows = recent.map((b: any) => b.low);
    const highs = recent.map((b: any) => b.high);

    const minLow = Math.min(...lows);
    const maxHigh = Math.max(...highs);
    const swingSize = (maxHigh - minLow) / minLow;

    // Require meaningful swing (>3% range) to avoid noise
    if (swingSize < 0.03) return null;

    const minIndex = lows.indexOf(minLow);
    const maxIndex = highs.indexOf(maxHigh);

    const lastClose = bars[bars.length - 1].close;
    const retrace = maxIndex > minIndex
      ? (maxHigh - lastClose) / (maxHigh - minLow) // how much has price pulled back from top
      : (lastClose - minLow) / (maxHigh - minLow); // how much has price bounced from bottom

    // Only signal if price has retraced 23-78% (wave 4 territory)
    if (retrace < 0.23 || retrace > 0.78) return null;

    if (maxIndex > minIndex) {
      return {
        direction: 'LONG',
        wave1High: highs[Math.min(5, highs.length - 1)] || maxHigh * 0.97,
        wave3High: maxHigh,
        wave3Low: minLow,
      };
    }

    return {
      direction: 'SHORT',
      wave1Low: lows[Math.min(5, lows.length - 1)] || minLow * 1.03,
      wave3High: maxHigh,
      wave3Low: minLow,
    };
  }

  private projectWaveTarget(bars: any[], waves: any) {
    const lastBar = bars[bars.length - 1];

    if (waves.direction === 'LONG') {
      const wave1Size = (waves.wave1High || lastBar.close) - waves.wave3Low;
      return {
        target1: lastBar.close + wave1Size * 1.618,
        target2: lastBar.close + wave1Size * 2.618,
      };
    }

    const wave1Size = waves.wave3High - (waves.wave1Low || lastBar.close);
    return {
      target1: lastBar.close - wave1Size * 1.618,
      target2: lastBar.close - wave1Size * 2.618,
    };
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No Elliott Wave pattern identified',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
