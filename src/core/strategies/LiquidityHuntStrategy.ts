import { IStrategyModule, StrategySignal, OHLCVData, MarketContext, PriceLevel } from '@core/types';

/**
 * Liquidity Hunt / Stop Hunt Strategy
 * Institutions sweep liquidity (equal highs/lows, prior swing H/L) before reversing.
 * Sweep = wick beyond level + close back inside = strong reversal signal.
 * Combines with FVG and order block for confluence entries.
 */
export class LiquidityHuntStrategy implements IStrategyModule {
  name = 'mod_liquidity_hunt';
  weight = 1.48;

  analyze(data: OHLCVData, _ctx: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 30) return this.neutral();

    const last = bars[bars.length - 1];
    const atr = this.calcATR(bars.slice(-14));

    // ── Find equal highs / swing high liquidity pool ──
    const swingHigh = this.findSwingHigh(bars.slice(-30));
    const swingLow = this.findSwingLow(bars.slice(-30));

    // ── Bullish liquidity sweep: wick below swing low + close above ──
    // Price temporarily dips below equal lows (stop hunt), then closes back above = reversal LONG
    if (swingLow && last.low < swingLow.price * 0.998 && last.close > swingLow.price) {
      const wickSize = swingLow.price - last.low;
      const wickRatio = wickSize / atr;
      if (wickRatio > 0.5) { // meaningful wick, not noise
        return {
          direction: 'LONG',
          confidence: 0.76 + Math.min(wickRatio * 0.02, 0.08),
          entryZone: [last.close * 0.999, last.close * 1.002],
          target1: last.close + atr * 2.5,
          target2: last.close + atr * 5,
          invalidation: last.low * 0.997,
          explanation: `Liquidity Sweep Long — wick swept below swing low ${swingLow.price.toFixed(2)}, trapped shorts, close reclaimed: reversal confirmed`,
          moduleName: this.name, weight: this.weight,
        };
      }
    }

    // ── Bearish liquidity sweep: wick above swing high + close below ──
    if (swingHigh && last.high > swingHigh.price * 1.002 && last.close < swingHigh.price) {
      const wickSize = last.high - swingHigh.price;
      const wickRatio = wickSize / atr;
      if (wickRatio > 0.5) {
        return {
          direction: 'SHORT',
          confidence: 0.76 + Math.min(wickRatio * 0.02, 0.08),
          entryZone: [last.close * 0.998, last.close * 1.001],
          target1: last.close - atr * 2.5,
          target2: last.close - atr * 5,
          invalidation: last.high * 1.003,
          explanation: `Liquidity Sweep Short — wick swept above swing high ${swingHigh.price.toFixed(2)}, trapped longs, close rejected: reversal confirmed`,
          moduleName: this.name, weight: this.weight,
        };
      }
    }

    // ── Equal highs sweep (double top pattern — liquidity at equal highs) ──
    const equalHighs = this.findEqualLevels(bars.slice(-25), 'high');
    if (equalHighs && last.high > equalHighs * 1.001 && last.close < equalHighs * 0.999) {
      return {
        direction: 'SHORT',
        confidence: 0.70,
        entryZone: [last.close * 0.998, last.close * 1.001],
        target1: last.close - atr * 2,
        target2: last.close - atr * 4,
        invalidation: last.high * 1.003,
        explanation: `Equal Highs Sweep — price swept liquidity above ${equalHighs.toFixed(2)}, flushed stops above double top: short setup`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Equal lows sweep (double bottom — liquidity at equal lows) ──
    const equalLows = this.findEqualLevels(bars.slice(-25), 'low');
    if (equalLows && last.low < equalLows * 0.999 && last.close > equalLows * 1.001) {
      return {
        direction: 'LONG',
        confidence: 0.70,
        entryZone: [last.close * 0.999, last.close * 1.002],
        target1: last.close + atr * 2,
        target2: last.close + atr * 4,
        invalidation: last.low * 0.997,
        explanation: `Equal Lows Sweep — price swept liquidity below ${equalLows.toFixed(2)}, flushed stops below double bottom: long setup`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Previous session high/low sweep ──
    const prevHigh = Math.max(...bars.slice(-10, -1).map(b => b.high));
    const prevLow = Math.min(...bars.slice(-10, -1).map(b => b.low));

    if (last.high > prevHigh * 1.001 && last.close < prevHigh * 0.999 && (prevHigh - last.close) > atr * 0.4) {
      return {
        direction: 'SHORT',
        confidence: 0.65,
        entryZone: [last.close * 0.998, last.close * 1.002],
        target1: last.close - atr * 1.8,
        target2: last.close - atr * 3.5,
        invalidation: last.high * 1.003,
        explanation: `Session High Sweep — price took out prior high ${prevHigh.toFixed(2)}, rejected: stop hunt complete`,
        moduleName: this.name, weight: this.weight,
      };
    }

    if (last.low < prevLow * 0.999 && last.close > prevLow * 1.001 && (last.close - prevLow) > atr * 0.4) {
      return {
        direction: 'LONG',
        confidence: 0.65,
        entryZone: [last.close * 0.998, last.close * 1.002],
        target1: last.close + atr * 1.8,
        target2: last.close + atr * 3.5,
        invalidation: last.low * 0.997,
        explanation: `Session Low Sweep — price took out prior low ${prevLow.toFixed(2)}, reclaimed: stop hunt complete`,
        moduleName: this.name, weight: this.weight,
      };
    }

    return this.neutral();
  }

  private findSwingHigh(bars: OHLCVData['bars']): { price: number; idx: number } | null {
    let maxH = -Infinity, maxIdx = -1;
    for (let i = 3; i < bars.length - 3; i++) {
      if (bars[i].high > bars[i-1].high && bars[i].high > bars[i+1].high &&
          bars[i].high > bars[i-2].high && bars[i].high > bars[i+2].high) {
        if (bars[i].high > maxH) { maxH = bars[i].high; maxIdx = i; }
      }
    }
    return maxIdx >= 0 ? { price: maxH, idx: maxIdx } : null;
  }

  private findSwingLow(bars: OHLCVData['bars']): { price: number; idx: number } | null {
    let minL = Infinity, minIdx = -1;
    for (let i = 3; i < bars.length - 3; i++) {
      if (bars[i].low < bars[i-1].low && bars[i].low < bars[i+1].low &&
          bars[i].low < bars[i-2].low && bars[i].low < bars[i+2].low) {
        if (bars[i].low < minL) { minL = bars[i].low; minIdx = i; }
      }
    }
    return minIdx >= 0 ? { price: minL, idx: minIdx } : null;
  }

  private findEqualLevels(bars: OHLCVData['bars'], side: 'high' | 'low'): number | null {
    const levels = bars.map(b => side === 'high' ? b.high : b.low);
    for (let i = 0; i < levels.length - 3; i++) {
      for (let j = i + 3; j < levels.length; j++) {
        if (Math.abs(levels[i] - levels[j]) / levels[i] < 0.002) return levels[i];
      }
    }
    return null;
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
    if (bars.length < 20) return [];
    const levels: PriceLevel[] = [];
    const sh = this.findSwingHigh(bars.slice(-30));
    const sl = this.findSwingLow(bars.slice(-30));
    if (sh) levels.push({ price: sh.price, type: 'liquidity', strength: 0.85, label: 'Swing High Liquidity' });
    if (sl) levels.push({ price: sl.price, type: 'liquidity', strength: 0.85, label: 'Swing Low Liquidity' });
    const eqH = this.findEqualLevels(bars.slice(-25), 'high');
    const eqL = this.findEqualLevels(bars.slice(-25), 'low');
    if (eqH) levels.push({ price: eqH, type: 'liquidity', strength: 0.80, label: 'Equal Highs' });
    if (eqL) levels.push({ price: eqL, type: 'liquidity', strength: 0.80, label: 'Equal Lows' });
    return levels;
  }

  getConfidence() { return 0.72; }
  getWeight() { return this.weight; }
  getExplanation() { return 'Liquidity Hunt — stop sweeps at swing H/L, equal highs/lows, session extremes, wick reversals'; }

  private neutral(): StrategySignal {
    return { direction: 'NEUTRAL', confidence: 0, entryZone: [0,0], target1: 0, invalidation: 0, explanation: 'No liquidity sweep', moduleName: this.name, weight: this.weight };
  }
}
