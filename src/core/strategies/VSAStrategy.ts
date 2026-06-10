import { IStrategyModule, StrategySignal, OHLCVData, MarketContext, PriceLevel } from '@core/types';

/**
 * Volume Spread Analysis — Tom Williams / Wyckoff bar-by-bar logic
 * Climax bars, No Demand, No Supply, Stopping Volume, Effort vs Result
 */
export class VSAStrategy implements IStrategyModule {
  name = 'mod_vsa';
  weight = 1.45;

  analyze(data: OHLCVData, _ctx: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 30) return this.neutral();

    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    const recent = bars.slice(-20);

    const avgVol = recent.reduce((s, b) => s + b.volume, 0) / recent.length;
    const avgRange = recent.reduce((s, b) => s + (b.high - b.low), 0) / recent.length;

    const spread = last.high - last.low;
    const closePos = spread > 0 ? (last.close - last.low) / spread : 0.5; // 0=low, 1=high
    const isWideBar = spread > avgRange * 1.4;
    const isNarrowBar = spread < avgRange * 0.6;
    const isHighVol = last.volume > avgVol * 1.8;
    const isLowVol = last.volume < avgVol * 0.7;
    const isUpBar = last.close > last.open;
    const isDownBar = last.close < last.open;

    // ── Buying Climax: wide range + ultra high vol + close mid/low (distribution) ──
    if (isWideBar && isHighVol && closePos < 0.35 && isUpBar) {
      return {
        direction: 'SHORT',
        confidence: 0.73,
        entryZone: [last.close * 0.998, last.close * 1.002],
        target1: last.close * 0.955,
        target2: last.close * 0.92,
        invalidation: last.high * 1.003,
        explanation: 'VSA Buying Climax — wide bar + ultra high vol + close near low: professional distribution',
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Selling Climax: wide down bar + ultra high vol + close mid/high (accumulation) ──
    if (isWideBar && isHighVol && closePos > 0.65 && isDownBar) {
      return {
        direction: 'LONG',
        confidence: 0.73,
        entryZone: [last.close * 0.998, last.close * 1.002],
        target1: last.close * 1.045,
        target2: last.close * 1.09,
        invalidation: last.low * 0.997,
        explanation: 'VSA Selling Climax — wide down bar + ultra high vol + close near high: absorption',
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Stopping Volume: high vol + small range + close near high on down bar ──
    if (isHighVol && isNarrowBar && closePos > 0.6 && isDownBar) {
      return {
        direction: 'LONG',
        confidence: 0.67,
        entryZone: [last.close, last.close * 1.01],
        target1: last.close * 1.04,
        target2: last.close * 1.08,
        invalidation: last.low * 0.995,
        explanation: 'VSA Stopping Volume — high vol + narrow range + close high: supply absorbed, demand entering',
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── No Demand: narrow up bar + low vol + close mid/low (weakness) ──
    if (isNarrowBar && isLowVol && isUpBar && closePos < 0.5 && prev.close > last.close * 0.995) {
      return {
        direction: 'SHORT',
        confidence: 0.62,
        entryZone: [last.close * 0.999, last.close * 1.001],
        target1: last.close * 0.96,
        target2: last.close * 0.93,
        invalidation: last.high * 1.005,
        explanation: 'VSA No Demand — narrow up bar + low vol: no professional buying, markdown likely',
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── No Supply: narrow down bar + low vol + close mid/high (strength) ──
    if (isNarrowBar && isLowVol && isDownBar && closePos > 0.5) {
      return {
        direction: 'LONG',
        confidence: 0.62,
        entryZone: [last.close * 0.999, last.close * 1.001],
        target1: last.close * 1.04,
        target2: last.close * 1.08,
        invalidation: last.low * 0.995,
        explanation: 'VSA No Supply — narrow down bar + low vol: sellers exhausted, markup imminent',
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Effort vs Result: high vol + tiny range (absorption at level) ──
    if (isHighVol && isNarrowBar) {
      const trend5 = bars.slice(-6, -1).reduce((s, b, i, a) => i === 0 ? 0 : s + (b.close - a[i-1].close), 0);
      if (trend5 > 0) {
        return {
          direction: 'SHORT',
          confidence: 0.58,
          entryZone: [last.close * 0.998, last.close * 1.002],
          target1: last.close * 0.96,
          target2: last.close * 0.93,
          invalidation: last.high * 1.004,
          explanation: 'VSA Effort vs Result — high vol, no progress in uptrend: distribution absorption',
          moduleName: this.name, weight: this.weight,
        };
      }
    }

    return this.neutral();
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars;
    if (bars.length < 20) return [];
    const levels: PriceLevel[] = [];
    const avgVol = bars.slice(-20).reduce((s, b) => s + b.volume, 0) / 20;

    for (let i = bars.length - 15; i < bars.length; i++) {
      const b = bars[i];
      if (b.volume > avgVol * 2) {
        levels.push({ price: b.close, type: 'liquidity', strength: 0.8, label: 'VSA High Volume Node' });
      }
    }
    return levels;
  }

  getConfidence() { return 0.66; }
  getWeight() { return this.weight; }
  getExplanation() { return 'VSA — climax bars, no demand/supply, stopping volume, effort vs result'; }

  private neutral(): StrategySignal {
    return { direction: 'NEUTRAL', confidence: 0, entryZone: [0,0], target1: 0, invalidation: 0, explanation: 'No VSA signal', moduleName: this.name, weight: this.weight };
  }
}
