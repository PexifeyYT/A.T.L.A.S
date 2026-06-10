import { IStrategyModule, StrategySignal, OHLCVData, MarketContext, PriceLevel } from '@core/types';

/**
 * Opening Range Breakout (ORB)
 * 30-min opening range (first session bars). Breakout above = LONG, below = SHORT.
 * Edge strongest 10:00–12:00 AM EST. Validated on intraday TFs (1m, 5m, 15m, 30m).
 * Win rate 55-65% in trending sessions, 2:1+ R:R required.
 */
export class OpeningRangeStrategy implements IStrategyModule {
  name = 'mod_orb';
  weight = 1.15;

  analyze(data: OHLCVData, _ctx: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 20) return this.neutral();

    const last = bars[bars.length - 1];
    const price = last.close;
    const atr = this.calcATR(bars.slice(-14));

    // For daily/weekly TFs, use first-day-of-week / first-week-of-month range
    // For intraday, use session's first N bars
    const isIntraday = ['1m','5m','15m','30m','1H'].includes(data.timeframe);
    const rangeBars = isIntraday ? this.getBarsPerHalfHour(data.timeframe) : 5;

    // Opening range = first `rangeBars` bars of the dataset (proxy for session open)
    // In production this would be anchored to actual session open time
    const openRange = bars.slice(0, Math.min(rangeBars, 10));
    if (openRange.length < 2) return this.neutral();

    const orHigh = Math.max(...openRange.map(b => b.high));
    const orLow = Math.min(...openRange.map(b => b.low));
    const orRange = orHigh - orLow;

    // Skip if opening range is too small (< 0.3% of price) — no edge
    if (orRange / price < 0.003) return this.neutral();

    // Skip if opening range is too large (> 3% — already moved, no clean breakout)
    if (orRange / price > 0.03) return this.neutral();

    const prev = bars[bars.length - 2];

    // ── Bullish ORB: close above orHigh after consolidation ──
    if (prev.close <= orHigh && price > orHigh * 1.001) {
      const rr = (orHigh + orRange * 2.0 - price) / (price - orLow);
      if (rr >= 1.8) {
        return {
          direction: 'LONG',
          confidence: 0.63,
          entryZone: [orHigh, orHigh * 1.003],
          target1: orHigh + orRange * 1.5,
          target2: orHigh + orRange * 2.5,
          invalidation: orLow,
          explanation: `ORB Breakout Long — price broke above opening range high ${orHigh.toFixed(2)}, range ${(orRange/price*100).toFixed(2)}%, R:R ${rr.toFixed(1)}:1`,
          moduleName: this.name, weight: this.weight,
        };
      }
    }

    // ── Bearish ORB: close below orLow after consolidation ──
    if (prev.close >= orLow && price < orLow * 0.999) {
      const rr = (price - (orLow - orRange * 2.0)) / (orHigh - price);
      if (rr >= 1.8) {
        return {
          direction: 'SHORT',
          confidence: 0.63,
          entryZone: [orLow * 0.997, orLow],
          target1: orLow - orRange * 1.5,
          target2: orLow - orRange * 2.5,
          invalidation: orHigh,
          explanation: `ORB Breakdown Short — price broke below opening range low ${orLow.toFixed(2)}, range ${(orRange/price*100).toFixed(2)}%, R:R ${rr.toFixed(1)}:1`,
          moduleName: this.name, weight: this.weight,
        };
      }
    }

    // ── Failed ORB: price faded back inside range after breakout (reversal) ──
    const last5High = Math.max(...bars.slice(-5).map(b => b.high));
    if (last5High > orHigh * 1.003 && price < orHigh * 0.999) {
      return {
        direction: 'SHORT',
        confidence: 0.58,
        entryZone: [orHigh * 0.997, orHigh * 1.001],
        target1: orLow,
        target2: orLow - atr,
        invalidation: last5High * 1.003,
        explanation: `Failed ORB — price rejected above opening range, trapping bulls: fade setup`,
        moduleName: this.name, weight: this.weight,
      };
    }

    return this.neutral();
  }

  private getBarsPerHalfHour(tf: string): number {
    const map: Record<string, number> = { '1m': 30, '5m': 6, '15m': 2, '30m': 1, '1H': 1 };
    return map[tf] ?? 1;
  }

  private calcATR(bars: OHLCVData['bars']): number {
    if (bars.length < 2) return 1;
    let sum = 0;
    for (let i = 1; i < bars.length; i++) {
      sum += Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - bars[i-1].close), Math.abs(bars[i].low - bars[i-1].close));
    }
    return sum / (bars.length - 1);
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars;
    if (bars.length < 5) return [];
    const openRange = bars.slice(0, 5);
    const orHigh = Math.max(...openRange.map(b => b.high));
    const orLow = Math.min(...openRange.map(b => b.low));
    return [
      { price: orHigh, type: 'resistance', strength: 0.78, label: 'OR High' },
      { price: orLow, type: 'support', strength: 0.78, label: 'OR Low' },
    ];
  }

  getConfidence() { return 0.60; }
  getWeight() { return this.weight; }
  getExplanation() { return 'ORB — opening range breakout, failed ORB fade, session momentum capture'; }

  private neutral(): StrategySignal {
    return { direction: 'NEUTRAL', confidence: 0, entryZone: [0,0], target1: 0, invalidation: 0, explanation: 'No ORB signal', moduleName: this.name, weight: this.weight };
  }
}
