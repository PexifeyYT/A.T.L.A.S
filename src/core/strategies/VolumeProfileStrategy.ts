import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
  OHLCV,
} from '@core/types';

export class VolumeProfileStrategy implements IStrategyModule {
  name = 'mod_volume_profile';
  weight = 1.54;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 30) return this.neutralSignal();

    const profile = this.buildVolumeProfile(bars.slice(-100));
    const last = bars[bars.length - 1];
    const rangeSize = profile.vah - profile.val;
    if (rangeSize <= 0) return this.neutralSignal();

    const distToPOC = Math.abs(last.close - profile.poc);
    const nearPOC = distToPOC < rangeSize * 0.05;

    // Price reclaimed POC from below (bullish)
    const prev = bars[bars.length - 2];
    if (prev.close < profile.poc && last.close > profile.poc) {
      const risk = last.close - profile.val;
      if (risk <= 0) return this.neutralSignal();
      return {
        direction: 'LONG',
        confidence: 0.68 + (nearPOC ? 0.05 : 0),
        entryZone: [profile.poc * 0.999, profile.poc * 1.001],
        target1: profile.vah,
        target2: profile.vah + rangeSize * 0.5,
        invalidation: profile.val - rangeSize * 0.05,
        explanation: `Vol Profile: price reclaimed POC ${profile.poc.toFixed(2)} — bullish. VAH target ${profile.vah.toFixed(2)}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Price rejected POC from above (bearish)
    if (prev.close > profile.poc && last.close < profile.poc) {
      const risk = profile.vah - last.close;
      if (risk <= 0) return this.neutralSignal();
      return {
        direction: 'SHORT',
        confidence: 0.65 + (nearPOC ? 0.05 : 0),
        entryZone: [profile.poc * 0.999, profile.poc * 1.001],
        target1: profile.val,
        target2: profile.val - rangeSize * 0.5,
        invalidation: profile.vah + rangeSize * 0.05,
        explanation: `Vol Profile: price failed POC ${profile.poc.toFixed(2)} — bearish. VAL target ${profile.val.toFixed(2)}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Price at VAL with VPVR support (reversal long)
    if (last.close < profile.val * 1.01 && last.close > profile.val * 0.99) {
      return {
        direction: 'LONG',
        confidence: 0.60,
        entryZone: [profile.val * 0.998, profile.val * 1.002],
        target1: profile.poc,
        target2: profile.vah,
        invalidation: profile.val * 0.97,
        explanation: `Vol Profile: price testing VAL ${profile.val.toFixed(2)} — high-volume support, POC reclaim target`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Price at VAH with VPVR resistance (reversal short)
    if (last.close > profile.vah * 0.99 && last.close < profile.vah * 1.01) {
      return {
        direction: 'SHORT',
        confidence: 0.60,
        entryZone: [profile.vah * 0.998, profile.vah * 1.002],
        target1: profile.poc,
        target2: profile.val,
        invalidation: profile.vah * 1.03,
        explanation: `Vol Profile: price testing VAH ${profile.vah.toFixed(2)} — high-volume resistance, POC target`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  private buildVolumeProfile(bars: OHLCV[]): { poc: number; vah: number; val: number } {
    if (bars.length === 0) return { poc: 0, vah: 0, val: 0 };

    const rangeHigh = Math.max(...bars.map(b => b.high));
    const rangeLow = Math.min(...bars.map(b => b.low));
    const numBuckets = 50;
    const bucketSize = (rangeHigh - rangeLow) / numBuckets;
    if (bucketSize <= 0) return { poc: bars[bars.length - 1].close, vah: rangeHigh, val: rangeLow };

    // Build volume histogram by price bucket
    const buckets = new Array(numBuckets).fill(0);
    for (const bar of bars) {
      const barRange = bar.high - bar.low || 0.0001;
      for (let b = 0; b < numBuckets; b++) {
        const bucketLow = rangeLow + b * bucketSize;
        const bucketHigh = bucketLow + bucketSize;
        // Volume distributed proportionally across bar range
        const overlap = Math.min(bar.high, bucketHigh) - Math.max(bar.low, bucketLow);
        if (overlap > 0) buckets[b] += bar.volume * (overlap / barRange);
      }
    }

    // POC = bucket with most volume
    const pocBucket = buckets.indexOf(Math.max(...buckets));
    const poc = rangeLow + (pocBucket + 0.5) * bucketSize;

    // VAH/VAL = 70% of total volume value area
    const totalVol = buckets.reduce((s, v) => s + v, 0);
    const target = totalVol * 0.70;
    let accumulated = buckets[pocBucket];
    let upper = pocBucket;
    let lower = pocBucket;

    while (accumulated < target && (upper < numBuckets - 1 || lower > 0)) {
      const upVol = upper + 1 < numBuckets ? buckets[upper + 1] : 0;
      const downVol = lower - 1 >= 0 ? buckets[lower - 1] : 0;
      if (upVol >= downVol && upper + 1 < numBuckets) { upper++; accumulated += buckets[upper]; }
      else if (lower - 1 >= 0) { lower--; accumulated += buckets[lower]; }
      else break;
    }

    const vah = rangeLow + (upper + 1) * bucketSize;
    const val = rangeLow + lower * bucketSize;

    return { poc, vah, val };
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const profile = this.buildVolumeProfile(data.bars.slice(-100));
    return [
      { price: profile.poc, type: 'resistance', strength: 0.85, label: `POC ${profile.poc.toFixed(2)}` },
      { price: profile.vah, type: 'resistance', strength: 0.70, label: `VAH ${profile.vah.toFixed(2)}` },
      { price: profile.val, type: 'support', strength: 0.70, label: `VAL ${profile.val.toFixed(2)}` },
    ];
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL', confidence: 0, entryZone: [0, 0],
      target1: 0, invalidation: 0, explanation: 'No volume profile signal',
      moduleName: this.name, weight: this.weight,
    };
  }

  getConfidence(): number { return 0.68; }
  getWeight(): number { return this.weight; }
  getExplanation(): string { return 'Volume Profile — binned VPVR, real POC/VAH/VAL, value area breakouts'; }
}
