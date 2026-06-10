import { IStrategyModule, StrategySignal, OHLCVData, MarketContext, PriceLevel } from '@core/types';

/**
 * VWAP + Anchored VWAP Strategy
 * Institutional benchmark — reclaim/rejection, mean reversion from std dev extensions
 */
export class VWAPStrategy implements IStrategyModule {
  name = 'mod_vwap';
  weight = 1.38;

  analyze(data: OHLCVData, _ctx: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 20) return this.neutral();

    const { vwap, std } = this.calcVWAP(bars.slice(-100));
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    const price = last.close;

    const deviationPct = (price - vwap) / vwap;
    const band2 = std * 2;

    // ── Price crosses above VWAP (reclaim) ──
    if (prev.close < vwap && price > vwap && Math.abs(deviationPct) < 0.02) {
      return {
        direction: 'LONG',
        confidence: 0.68,
        entryZone: [vwap * 0.999, vwap * 1.001],
        target1: vwap + band2,
        target2: vwap + band2 * 1.5,
        invalidation: vwap * 0.995,
        explanation: `VWAP Reclaim — price crossed above VWAP ${vwap.toFixed(2)}: institutional buying confirmed`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Price crosses below VWAP (rejection) ──
    if (prev.close > vwap && price < vwap && Math.abs(deviationPct) < 0.02) {
      return {
        direction: 'SHORT',
        confidence: 0.68,
        entryZone: [vwap * 0.999, vwap * 1.001],
        target1: vwap - band2,
        target2: vwap - band2 * 1.5,
        invalidation: vwap * 1.005,
        explanation: `VWAP Rejection — price broke below VWAP ${vwap.toFixed(2)}: institutions distributing`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Extended 2+ std dev above VWAP — mean reversion short ──
    if (price > vwap + band2 * 1.1) {
      return {
        direction: 'SHORT',
        confidence: 0.65,
        entryZone: [price * 0.998, price * 1.002],
        target1: vwap + band2 * 0.5,
        target2: vwap,
        invalidation: last.high * 1.004,
        explanation: `VWAP +2σ Extension — price ${((deviationPct)*100).toFixed(1)}% above VWAP: mean reversion setup`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Extended 2+ std dev below VWAP — mean reversion long ──
    if (price < vwap - band2 * 1.1) {
      return {
        direction: 'LONG',
        confidence: 0.65,
        entryZone: [price * 0.998, price * 1.002],
        target1: vwap - band2 * 0.5,
        target2: vwap,
        invalidation: last.low * 0.996,
        explanation: `VWAP -2σ Extension — price ${((deviationPct)*100).toFixed(1)}% below VWAP: mean reversion setup`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Price at VWAP support (above VWAP, touching back) ──
    if (price > vwap && price < vwap * 1.004 && prev.close > vwap * 1.004) {
      return {
        direction: 'LONG',
        confidence: 0.60,
        entryZone: [vwap * 0.998, vwap * 1.002],
        target1: vwap + band2,
        target2: vwap + band2 * 1.6,
        invalidation: vwap * 0.993,
        explanation: 'VWAP Pullback Long — price testing VWAP from above: support bounce',
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Price at VWAP resistance (below VWAP, testing from below) ──
    if (price < vwap && price > vwap * 0.996 && prev.close < vwap * 0.996) {
      return {
        direction: 'SHORT',
        confidence: 0.60,
        entryZone: [vwap * 0.998, vwap * 1.002],
        target1: vwap - band2,
        target2: vwap - band2 * 1.6,
        invalidation: vwap * 1.007,
        explanation: 'VWAP Resistance Test — price testing VWAP from below: rejection expected',
        moduleName: this.name, weight: this.weight,
      };
    }

    return this.neutral();
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    if (data.bars.length < 20) return [];
    const { vwap, std } = this.calcVWAP(data.bars.slice(-100));
    return [
      { price: vwap, type: 'support', strength: 0.85, label: 'VWAP' },
      { price: vwap + std * 2, type: 'resistance', strength: 0.72, label: 'VWAP +2σ' },
      { price: vwap - std * 2, type: 'support', strength: 0.72, label: 'VWAP -2σ' },
    ];
  }

  private calcVWAP(bars: OHLCVData['bars']): { vwap: number; std: number } {
    let cumPV = 0, cumV = 0;
    const tpArr: number[] = [];
    for (const b of bars) {
      const tp = (b.high + b.low + b.close) / 3;
      tpArr.push(tp);
      cumPV += tp * b.volume;
      cumV += b.volume;
    }
    const vwap = cumV > 0 ? cumPV / cumV : bars[bars.length - 1].close;
    const variance = tpArr.reduce((s, tp) => s + (tp - vwap) ** 2, 0) / tpArr.length;
    return { vwap, std: Math.sqrt(variance) };
  }

  getConfidence() { return 0.64; }
  getWeight() { return this.weight; }
  getExplanation() { return 'VWAP — institutional benchmark reclaim/rejection, 2σ mean reversion extensions'; }

  private neutral(): StrategySignal {
    return { direction: 'NEUTRAL', confidence: 0, entryZone: [0,0], target1: 0, invalidation: 0, explanation: 'No VWAP signal', moduleName: this.name, weight: this.weight };
  }
}
