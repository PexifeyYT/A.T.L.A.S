import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Volume Profile Strategy
 * Identifies POC (Point of Control), VAH/VAL, volume concentration zones
 */
export class VolumeProfileStrategy implements IStrategyModule {
  name = 'mod_volume_profile';
  weight = 1.54;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 30) {
      return this.neutralSignal();
    }

    const profile = this.buildVolumeProfile(bars);
    const lastBar = bars[bars.length - 1];

    // If price is above POC, trend is bullish
    if (lastBar.close > profile.poc) {
      return {
        direction: 'LONG',
        confidence: 0.68,
        entryZone: [profile.val, profile.vah],
        target1: profile.poc * 1.04,
        target2: profile.poc * 1.08,
        invalidation: profile.val - 1,
        explanation: `Volume Profile bullish — price above POC ${profile.poc.toFixed(2)}, support at VAL`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // If price is below POC, trend is bearish
    if (lastBar.close < profile.poc) {
      return {
        direction: 'SHORT',
        confidence: 0.65,
        entryZone: [profile.vah, profile.val],
        target1: profile.poc * 0.96,
        target2: profile.poc * 0.92,
        invalidation: profile.vah + 1,
        explanation: `Volume Profile bearish — price below POC ${profile.poc.toFixed(2)}, resistance at VAH`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-50);
    const profile = this.buildVolumeProfile(bars);

    return [
      {
        price: profile.poc,
        type: 'resistance',
        strength: 0.85,
        label: `POC ${profile.poc.toFixed(2)}`,
      },
      {
        price: profile.vah,
        type: 'resistance',
        strength: 0.7,
        label: `VAH ${profile.vah.toFixed(2)}`,
      },
      {
        price: profile.val,
        type: 'support',
        strength: 0.7,
        label: `VAL ${profile.val.toFixed(2)}`,
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
    return 'Volume Profile — POC magnet, VAH/VAL zones, volume concentration areas';
  }

  private buildVolumeProfile(bars: any[]) {
    // Simplified: calculate weighted prices by volume
    const totalVolume = bars.reduce((sum, b) => sum + b.volume, 0);
    const vwap = bars.reduce((sum, b) => sum + (b.close * b.volume), 0) / totalVolume;

    // POC approximation: weighted average of closes
    const closesPriceWeighted = bars.map((b) => ({
      price: b.close,
      weight: b.volume / totalVolume,
    }));

    const poc = closesPriceWeighted.reduce((sum, x) => sum + x.price * x.weight, 0);

    // VAH = highest close, VAL = lowest close in period
    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);
    const vah = Math.max(...highs);
    const val = Math.min(...lows);

    return { poc, vah, val, vwap };
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No volume profile signal',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
