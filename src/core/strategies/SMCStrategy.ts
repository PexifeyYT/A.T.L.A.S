import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
  OHLCV,
} from '@core/types';

export class SMCStrategy implements IStrategyModule {
  name = 'mod_smc';
  weight = 1.82;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 50) return this.neutralSignal();

    const recent = bars.slice(-50);
    const last = recent[recent.length - 1];

    const swingHighs = this.findSwingHighs(recent, 5);
    const swingLows = this.findSwingLows(recent, 5);

    const bos = this.detectBOS(recent, swingHighs, swingLows);
    const fvg = this.detectFVG(recent);
    const ob = this.detectOrderBlock(recent, bos?.direction ?? null);

    if (!bos) return this.neutralSignal();

    const recentHighs = recent.slice(-20).map(b => b.high);
    const recentLows = recent.slice(-20).map(b => b.low);
    const structureHigh = Math.max(...recentHighs);
    const structureLow = Math.min(...recentLows);

    if (bos.direction === 'up') {
      const entry = ob ? [ob.low, ob.high] as [number, number] : [last.close * 0.995, last.close * 1.005] as [number, number];
      const risk = entry[0] - structureLow;
      if (risk <= 0) return this.neutralSignal();

      const t1 = structureHigh + risk * 0.5;
      const t2 = structureHigh + risk * 1.618;
      const rr = (t1 - entry[0]) / (entry[0] - structureLow);

      return {
        direction: 'LONG',
        confidence: Math.min(0.6 + (fvg ? 0.08 : 0) + (ob ? 0.07 : 0) + Math.min(rr / 10, 0.1), 0.88),
        entryZone: entry,
        target1: t1,
        target2: t2,
        invalidation: structureLow - last.close * 0.002,
        explanation: `SMC BOS bullish${ob ? ' + OB retest' : ''}${fvg ? ' + FVG' : ''} — entry ${entry[0].toFixed(2)}–${entry[1].toFixed(2)}, INV ${structureLow.toFixed(2)}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (bos.direction === 'down') {
      const entry = ob ? [ob.high, ob.low] as [number, number] : [last.close * 0.995, last.close * 1.005] as [number, number];
      const risk = structureHigh - entry[1];
      if (risk <= 0) return this.neutralSignal();

      const t1 = structureLow - risk * 0.5;
      const t2 = structureLow - risk * 1.618;
      const rr = (entry[1] - t1) / (structureHigh - entry[1]);

      return {
        direction: 'SHORT',
        confidence: Math.min(0.55 + (fvg ? 0.08 : 0) + (ob ? 0.07 : 0) + Math.min(rr / 10, 0.1), 0.82),
        entryZone: entry,
        target1: t1,
        target2: t2,
        invalidation: structureHigh + last.close * 0.002,
        explanation: `SMC CHoCH bearish${ob ? ' + OB retest' : ''}${fvg ? ' + FVG' : ''} — entry ${entry[1].toFixed(2)}, INV ${structureHigh.toFixed(2)}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  private findSwingHighs(bars: OHLCV[], lookback: number): number[] {
    const result: number[] = [];
    for (let i = lookback; i < bars.length - lookback; i++) {
      const highs = bars.slice(i - lookback, i + lookback + 1).map(b => b.high);
      if (bars[i].high === Math.max(...highs)) result.push(i);
    }
    return result;
  }

  private findSwingLows(bars: OHLCV[], lookback: number): number[] {
    const result: number[] = [];
    for (let i = lookback; i < bars.length - lookback; i++) {
      const lows = bars.slice(i - lookback, i + lookback + 1).map(b => b.low);
      if (bars[i].low === Math.min(...lows)) result.push(i);
    }
    return result;
  }

  private detectBOS(bars: OHLCV[], swingHighs: number[], swingLows: number[]): { direction: 'up' | 'down'; level: number } | null {
    const last = bars[bars.length - 1];

    // Bullish BOS: last close breaks above most recent swing high
    if (swingHighs.length >= 2) {
      const prevHigh = bars[swingHighs[swingHighs.length - 2]]?.high ?? 0;
      if (last.close > prevHigh && last.close > last.open) {
        return { direction: 'up', level: prevHigh };
      }
    }

    // Bearish CHoCH: last close breaks below most recent swing low
    if (swingLows.length >= 2) {
      const prevLow = bars[swingLows[swingLows.length - 2]]?.low ?? Infinity;
      if (last.close < prevLow && last.close < last.open) {
        return { direction: 'down', level: prevLow };
      }
    }

    return null;
  }

  private detectFVG(bars: OHLCV[]): { high: number; low: number; bullish: boolean } | null {
    for (let i = bars.length - 3; i >= bars.length - 10; i--) {
      if (i < 0) break;
      const c1 = bars[i], c3 = bars[i + 2];
      if (!c1 || !c3) continue;

      // Bullish FVG: c1.high < c3.low
      if (c1.high < c3.low) return { high: c3.low, low: c1.high, bullish: true };
      // Bearish FVG: c1.low > c3.high
      if (c1.low > c3.high) return { high: c1.low, low: c3.high, bullish: false };
    }
    return null;
  }

  private detectOrderBlock(bars: OHLCV[], direction: 'up' | 'down' | null): { high: number; low: number } | null {
    if (!direction) return null;
    for (let i = bars.length - 2; i >= bars.length - 8; i--) {
      const b = bars[i];
      if (!b) continue;
      if (direction === 'up' && b.close < b.open) {
        return { high: b.high, low: b.low };
      }
      if (direction === 'down' && b.close > b.open) {
        return { high: b.high, low: b.low };
      }
    }
    return null;
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-100);
    const levels: PriceLevel[] = [];

    const swingHighs = this.findSwingHighs(bars, 5);
    const swingLows = this.findSwingLows(bars, 5);

    swingHighs.slice(-3).forEach(i => {
      levels.push({ price: bars[i].high, type: 'resistance', strength: 0.8, label: 'SMC Swing High' });
    });
    swingLows.slice(-3).forEach(i => {
      levels.push({ price: bars[i].low, type: 'support', strength: 0.8, label: 'SMC Swing Low' });
    });

    const fvg = this.detectFVG(bars);
    if (fvg) {
      levels.push({ price: fvg.bullish ? fvg.low : fvg.high, type: fvg.bullish ? 'support' : 'resistance', strength: 0.75, label: 'FVG' });
    }

    return levels;
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL', confidence: 0, entryZone: [0, 0],
      target1: 0, invalidation: 0, explanation: 'No SMC setup',
      moduleName: this.name, weight: this.weight,
    };
  }

  getConfidence(): number { return 0.72; }
  getWeight(): number { return this.weight; }
  getExplanation(): string { return 'SMC — BOS/CHoCH, Order Blocks, FVGs'; }
}

