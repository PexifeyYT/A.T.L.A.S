import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
  OHLCV,
} from '@core/types';

/**
 * TJR Strategy Constitution
 * HTF bias → LTF market structure break → OB/FVG entry → minimum 2.5:1 R:R
 */
export class TJRStrategy implements IStrategyModule {
  name = 'mod_tjr';
  weight = 1.71;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 50) return this.neutralSignal();

    // Step 1: HTF bias — use last 50 bars trend
    const htfBias = this.getHTFBias(bars.slice(-50));

    // Step 2: LTF structure — recent 20 bars
    const ltf = bars.slice(-20);
    const ltfStructure = this.getLTFStructure(ltf);

    if (!ltfStructure || ltfStructure !== htfBias) return this.neutralSignal();

    // Step 3: Find OB or FVG entry
    const entry = this.findBestEntry(bars.slice(-15), htfBias);
    if (!entry) return this.neutralSignal();

    const allHighs = bars.slice(-50).map(b => b.high);
    const allLows = bars.slice(-50).map(b => b.low);
    const structureHigh = Math.max(...allHighs);
    const structureLow = Math.min(...allLows);

    if (htfBias === 'up') {
      const stopLoss = Math.min(entry.low, structureLow) * 0.999;
      const risk = entry.mid - stopLoss;
      if (risk <= 0) return this.neutralSignal();

      const t1 = entry.mid + risk * 2.5;
      const t2 = entry.mid + risk * 4.0;
      const rr = (t1 - entry.mid) / risk;

      if (rr < 2.5) return this.neutralSignal();

      return {
        direction: 'LONG',
        confidence: Math.min(0.7 + Math.min(rr / 20, 0.15), 0.88),
        entryZone: [entry.low, entry.high],
        target1: t1,
        target2: t2,
        invalidation: stopLoss,
        explanation: `TJR LONG — HTF uptrend + LTF BOS + ${entry.type} @ ${entry.mid.toFixed(2)}, R:R ${rr.toFixed(1)}:1`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (htfBias === 'down') {
      const stopLoss = Math.max(entry.high, structureHigh) * 1.001;
      const risk = stopLoss - entry.mid;
      if (risk <= 0) return this.neutralSignal();

      const t1 = entry.mid - risk * 2.5;
      const t2 = entry.mid - risk * 4.0;
      const rr = (entry.mid - t1) / risk;

      if (rr < 2.5) return this.neutralSignal();

      return {
        direction: 'SHORT',
        confidence: Math.min(0.65 + Math.min(rr / 20, 0.15), 0.82),
        entryZone: [entry.low, entry.high],
        target1: t1,
        target2: t2,
        invalidation: stopLoss,
        explanation: `TJR SHORT — HTF downtrend + LTF CHoCH + ${entry.type} @ ${entry.mid.toFixed(2)}, R:R ${rr.toFixed(1)}:1`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  private getHTFBias(bars: OHLCV[]): 'up' | 'down' | 'neutral' {
    if (bars.length < 20) return 'neutral';
    const firstHalf = bars.slice(0, Math.floor(bars.length / 2));
    const secondHalf = bars.slice(Math.floor(bars.length / 2));
    const h1Avg = firstHalf.reduce((s, b) => s + b.close, 0) / firstHalf.length;
    const h2Avg = secondHalf.reduce((s, b) => s + b.close, 0) / secondHalf.length;
    const delta = (h2Avg - h1Avg) / h1Avg;
    if (delta > 0.005) return 'up';
    if (delta < -0.005) return 'down';
    return 'neutral';
  }

  private getLTFStructure(bars: OHLCV[]): 'up' | 'down' | null {
    if (bars.length < 4) return null;
    const last = bars[bars.length - 1];
    const prev = bars.slice(0, -1);
    const prevHighMax = Math.max(...prev.map(b => b.high));
    const prevLowMin = Math.min(...prev.map(b => b.low));

    if (last.close > prevHighMax) return 'up';
    if (last.close < prevLowMin) return 'down';
    return null;
  }

  private findBestEntry(bars: OHLCV[], direction: 'up' | 'down'): { low: number; high: number; mid: number; type: string } | null {
    // Try to find FVG first
    for (let i = bars.length - 3; i >= 0; i--) {
      const c1 = bars[i], c3 = bars[i + 2];
      if (!c1 || !c3) continue;
      if (direction === 'up' && c1.high < c3.low) {
        const low = c1.high, high = c3.low;
        return { low, high, mid: (low + high) / 2, type: 'FVG' };
      }
      if (direction === 'down' && c1.low > c3.high) {
        const low = c3.high, high = c1.low;
        return { low, high, mid: (low + high) / 2, type: 'FVG' };
      }
    }

    // Fall back to OB
    for (let i = bars.length - 2; i >= bars.length - 6; i--) {
      const b = bars[i];
      if (!b) continue;
      if (direction === 'up' && b.close < b.open) {
        return { low: b.low, high: b.high, mid: (b.low + b.high) / 2, type: 'OB' };
      }
      if (direction === 'down' && b.close > b.open) {
        return { low: b.low, high: b.high, mid: (b.low + b.high) / 2, type: 'OB' };
      }
    }

    return null;
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-50);
    const levels: PriceLevel[] = [];
    const bias = this.getHTFBias(bars);
    if (bias === 'neutral') return levels;
    const entry = this.findBestEntry(bars.slice(-15), bias);
    if (entry) {
      levels.push({ price: entry.mid, type: entry.type === 'FVG' ? 'support' : 'orderblock', strength: 0.85, label: `TJR ${entry.type}` });
    }
    return levels;
  }

  private neutralSignal(): StrategySignal {
    return { direction: 'NEUTRAL', confidence: 0, entryZone: [0, 0], target1: 0, invalidation: 0, explanation: 'No TJR setup', moduleName: this.name, weight: this.weight };
  }

  getConfidence(): number { return 0.75; }
  getWeight(): number { return this.weight; }
  getExplanation(): string { return 'TJR: HTF bias → LTF BOS/CHoCH → FVG/OB entry → 2.5+ R:R'; }
}
