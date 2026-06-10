import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
  OHLCV,
} from '@core/types';

export class OrderFlowStrategy implements IStrategyModule {
  name = 'mod_orderflow';
  weight = 0.68;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 20) return this.neutralSignal();

    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];

    // Relative delta: bullish/bearish volume imbalance over last 10 bars
    const recent = bars.slice(-10);
    const { deltaPct, buyVol, sellVol } = this.calculateRelativeDelta(recent);

    // Absorption: high volume + small candle range (trapped traders)
    const absorption = this.detectAbsorption(bars.slice(-8));

    const strongBuy = deltaPct > 0.65 && last.close > prev.close; // >65% buy volume
    const strongSell = deltaPct < 0.35 && last.close < prev.close; // <35% buy volume

    if (strongBuy) {
      const atr = this.atr(bars.slice(-14));
      return {
        direction: 'LONG',
        confidence: 0.50 + Math.min((deltaPct - 0.65) * 0.5, 0.12),
        entryZone: [last.close, last.close * 1.005],
        target1: last.close + atr * 2,
        target2: last.close + atr * 3.5,
        invalidation: last.low - atr * 0.5,
        explanation: `Order flow: ${(deltaPct * 100).toFixed(0)}% buy volume (${this.formatVol(buyVol)} vs ${this.formatVol(sellVol)}) — bullish accumulation`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (strongSell) {
      const atr = this.atr(bars.slice(-14));
      return {
        direction: 'SHORT',
        confidence: 0.48 + Math.min((0.35 - deltaPct) * 0.5, 0.10),
        entryZone: [last.close * 0.995, last.close],
        target1: last.close - atr * 2,
        target2: last.close - atr * 3.5,
        invalidation: last.high + atr * 0.5,
        explanation: `Order flow: ${((1 - deltaPct) * 100).toFixed(0)}% sell volume (${this.formatVol(sellVol)} vs ${this.formatVol(buyVol)}) — bearish distribution`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (absorption) {
      const atr = this.atr(bars.slice(-14));
      return {
        direction: absorption.direction === 'bullish' ? 'LONG' : 'SHORT',
        confidence: 0.46,
        entryZone: absorption.direction === 'bullish' ? [absorption.low, absorption.mid] : [absorption.mid, absorption.high],
        target1: absorption.direction === 'bullish' ? last.close + atr * 2 : last.close - atr * 2,
        target2: absorption.direction === 'bullish' ? last.close + atr * 3 : last.close - atr * 3,
        invalidation: absorption.direction === 'bullish' ? absorption.low - atr : absorption.high + atr,
        explanation: `${absorption.direction === 'bullish' ? 'Seller' : 'Buyer'} absorption — high vol (${this.formatVol(absorption.volume)}) with ${(absorption.rangeRatio * 100).toFixed(0)}% normal range = trapped ${absorption.direction === 'bullish' ? 'sellers' : 'buyers'}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  private calculateRelativeDelta(bars: OHLCV[]): { deltaPct: number; buyVol: number; sellVol: number } {
    let buyVol = 0;
    let sellVol = 0;
    for (const bar of bars) {
      const range = bar.high - bar.low || 0.0001;
      const buyRatio = (bar.close - bar.low) / range; // close position in bar
      buyVol += bar.volume * buyRatio;
      sellVol += bar.volume * (1 - buyRatio);
    }
    const total = buyVol + sellVol || 1;
    return { deltaPct: buyVol / total, buyVol, sellVol };
  }

  private detectAbsorption(bars: OHLCV[]): {
    direction: 'bullish' | 'bearish'; low: number; high: number; mid: number;
    volume: number; rangeRatio: number;
  } | null {
    const avgRange = bars.reduce((s, b) => s + (b.high - b.low), 0) / bars.length;
    const avgVol = bars.reduce((s, b) => s + b.volume, 0) / bars.length;

    for (const bar of bars.slice(-3)) {
      const range = bar.high - bar.low;
      const rangeRatio = range / (avgRange || range);
      if (rangeRatio < 0.5 && bar.volume > avgVol * 1.5) {
        const direction = bar.close > (bar.open ?? bar.close) ? 'bullish' : 'bearish';
        return {
          direction,
          low: bar.low, high: bar.high,
          mid: (bar.low + bar.high) / 2,
          volume: bar.volume, rangeRatio,
        };
      }
    }
    return null;
  }

  private atr(bars: OHLCV[]): number {
    if (bars.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < bars.length; i++) {
      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      sum += Math.max(hl, hc, lc);
    }
    return sum / (bars.length - 1);
  }

  private formatVol(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toFixed(0);
  }

  getKeyLevels(): PriceLevel[] { return []; }
  getConfidence(): number { return 0.48; }
  getWeight(): number { return this.weight; }
  getExplanation(): string { return 'Order Flow — relative delta, absorption zones, volume imbalance'; }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL', confidence: 0, entryZone: [0, 0],
      target1: 0, invalidation: 0, explanation: 'No order flow signal',
      moduleName: this.name, weight: this.weight,
    };
  }
}
