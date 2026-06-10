import { IStrategyModule, StrategySignal, OHLCVData, MarketContext, PriceLevel } from '@core/types';

/**
 * Market Profile Strategy — POC, Value Area High/Low, Poor Highs/Lows
 * Builds volume histogram. Price at VAL = bullish, VAH = bearish.
 * Poor highs/lows = unfinished auctions, price returns to correct them.
 */
export class MarketProfileStrategy implements IStrategyModule {
  name = 'mod_market_profile';
  weight = 1.42;

  analyze(data: OHLCVData, _ctx: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 50) return this.neutral();

    const last = bars[bars.length - 1];
    const price = last.close;
    const profile = this.buildProfile(bars.slice(-100));
    const { poc, vah, val, priceRange } = profile;
    const tolerance = priceRange * 0.008; // 0.8% tolerance for zone proximity

    // ── Price at VAL (value area low) — high probability long ──
    if (Math.abs(price - val) < tolerance && price < poc) {
      return {
        direction: 'LONG',
        confidence: 0.72,
        entryZone: [val * 0.998, val * 1.003],
        target1: poc,
        target2: vah,
        invalidation: val * 0.990,
        explanation: `Market Profile: price at VAL ${val.toFixed(2)} — auction complete, expect rotation to POC ${poc.toFixed(2)} and VAH ${vah.toFixed(2)}`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Price at VAH (value area high) — high probability short ──
    if (Math.abs(price - vah) < tolerance && price > poc) {
      return {
        direction: 'SHORT',
        confidence: 0.72,
        entryZone: [vah * 0.997, vah * 1.002],
        target1: poc,
        target2: val,
        invalidation: vah * 1.010,
        explanation: `Market Profile: price at VAH ${vah.toFixed(2)} — auction complete, expect rotation to POC ${poc.toFixed(2)} and VAL ${val.toFixed(2)}`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Price broke above VAH with acceptance (3+ bars) — trend continuation long ──
    const barsAboveVAH = bars.slice(-5).filter(b => b.close > vah).length;
    if (barsAboveVAH >= 3 && price > vah * 1.002) {
      return {
        direction: 'LONG',
        confidence: 0.64,
        entryZone: [vah, vah * 1.005],
        target1: vah + priceRange * 0.5,
        target2: vah + priceRange,
        invalidation: poc,
        explanation: `Market Profile: price accepted above VAH ${vah.toFixed(2)} — value area migration, new higher value`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Price broke below VAL with acceptance — trend continuation short ──
    const barsBelowVAL = bars.slice(-5).filter(b => b.close < val).length;
    if (barsBelowVAL >= 3 && price < val * 0.998) {
      return {
        direction: 'SHORT',
        confidence: 0.64,
        entryZone: [val * 0.995, val],
        target1: val - priceRange * 0.5,
        target2: val - priceRange,
        invalidation: poc,
        explanation: `Market Profile: price accepted below VAL ${val.toFixed(2)} — value area migration, new lower value`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Poor High detection: multiple bars stacked at same high (unfinished auction, will return) ──
    const poorHigh = this.detectPoorHigh(bars.slice(-20));
    if (poorHigh && price < poorHigh * 0.99) {
      return {
        direction: 'LONG',
        confidence: 0.60,
        entryZone: [price * 0.998, price * 1.002],
        target1: poorHigh,
        target2: poorHigh * 1.02,
        invalidation: price * 0.988,
        explanation: `Market Profile: Poor High at ${poorHigh.toFixed(2)} — unfinished auction, price will return to correct`,
        moduleName: this.name, weight: this.weight,
      };
    }

    return this.neutral();
  }

  private buildProfile(bars: OHLCVData['bars']): { poc: number; vah: number; val: number; priceRange: number } {
    const allHighs = bars.map(b => b.high);
    const allLows = bars.map(b => b.low);
    const priceHigh = Math.max(...allHighs);
    const priceLow = Math.min(...allLows);
    const priceRange = priceHigh - priceLow;

    if (priceRange === 0) return { poc: bars[bars.length-1].close, vah: bars[bars.length-1].close, val: bars[bars.length-1].close, priceRange: 1 };

    const buckets = 50;
    const bucketSize = priceRange / buckets;
    const volumeAtBucket = new Array(buckets).fill(0);

    for (const bar of bars) {
      const vol = bar.volume;
      for (let b = 0; b < buckets; b++) {
        const bucketLow = priceLow + b * bucketSize;
        const bucketHigh = bucketLow + bucketSize;
        // Distribute volume proportionally within bar range
        const barRange = bar.high - bar.low;
        if (barRange === 0) {
          if (bar.close >= bucketLow && bar.close < bucketHigh) volumeAtBucket[b] += vol;
        } else {
          const overlap = Math.max(0, Math.min(bar.high, bucketHigh) - Math.max(bar.low, bucketLow));
          volumeAtBucket[b] += vol * (overlap / barRange);
        }
      }
    }

    const pocBucket = volumeAtBucket.indexOf(Math.max(...volumeAtBucket));
    const poc = priceLow + pocBucket * bucketSize + bucketSize / 2;

    // Value area = 70% of total volume, expanding from POC
    const totalVol = volumeAtBucket.reduce((s, v) => s + v, 0);
    const target = totalVol * 0.70;
    let vaVol = volumeAtBucket[pocBucket];
    let lower = pocBucket, upper = pocBucket;

    while (vaVol < target && (lower > 0 || upper < buckets - 1)) {
      const addLower = lower > 0 ? volumeAtBucket[lower - 1] : 0;
      const addUpper = upper < buckets - 1 ? volumeAtBucket[upper + 1] : 0;
      if (addUpper >= addLower) upper++; else lower--;
      vaVol += Math.max(addLower, addUpper);
    }

    return {
      poc,
      vah: priceLow + upper * bucketSize + bucketSize,
      val: priceLow + lower * bucketSize,
      priceRange,
    };
  }

  private detectPoorHigh(bars: OHLCVData['bars']): number | null {
    const highest = Math.max(...bars.map(b => b.high));
    const barsAtHigh = bars.filter(b => b.high >= highest * 0.998).length;
    if (barsAtHigh >= 2) return highest;
    return null;
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    if (data.bars.length < 50) return [];
    const { poc, vah, val } = this.buildProfile(data.bars.slice(-100));
    return [
      { price: poc, type: 'support', strength: 0.90, label: 'POC' },
      { price: vah, type: 'resistance', strength: 0.80, label: 'VAH' },
      { price: val, type: 'support', strength: 0.80, label: 'VAL' },
    ];
  }

  getConfidence() { return 0.68; }
  getWeight() { return this.weight; }
  getExplanation() { return 'Market Profile — POC/VAH/VAL auction theory, poor highs/lows, value area migration'; }

  private neutral(): StrategySignal {
    return { direction: 'NEUTRAL', confidence: 0, entryZone: [0,0], target1: 0, invalidation: 0, explanation: 'No market profile signal', moduleName: this.name, weight: this.weight };
  }
}
