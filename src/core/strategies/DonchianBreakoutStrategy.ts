import { IStrategyModule, StrategySignal, OHLCVData, MarketContext, PriceLevel } from '@core/types';

/**
 * Donchian Channel Breakout — Turtle Trading System
 * System 1: 20-day breakout entry, 10-day exit
 * System 2: 55-day breakout entry, 20-day exit
 * ATR-based position sizing. 30-40% win rate but winners 3-5x losers.
 * Performs best: trending markets, commodities, crypto, major indices
 */
export class DonchianBreakoutStrategy implements IStrategyModule {
  name = 'mod_donchian';
  weight = 1.08;

  analyze(data: OHLCVData, ctx: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 60) return this.neutral();

    const last = bars[bars.length - 1];
    const price = last.close;
    const atr = this.calcATR(bars.slice(-14));

    // System 1: 20-bar channel
    const ch20 = this.calcChannel(bars, 20);
    // System 2: 55-bar channel (higher conviction)
    const ch55 = this.calcChannel(bars, 55);

    const prev = bars[bars.length - 2];

    // ── System 2 Long — 55-bar high breakout (highest conviction) ──
    if (prev.close <= ch55.high && price > ch55.high) {
      return {
        direction: 'LONG',
        confidence: 0.70,
        entryZone: [price, price * 1.003],
        target1: price + atr * 3,
        target2: price + atr * 6,
        invalidation: price - atr * 2,
        explanation: `Turtle System 2 Long — 55-bar high breakout at ${ch55.high.toFixed(2)}: major trend signal, ATR stop 2× = ${(price - atr*2).toFixed(2)}`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── System 2 Short — 55-bar low breakdown ──
    if (prev.close >= ch55.low && price < ch55.low) {
      return {
        direction: 'SHORT',
        confidence: 0.70,
        entryZone: [price * 0.997, price],
        target1: price - atr * 3,
        target2: price - atr * 6,
        invalidation: price + atr * 2,
        explanation: `Turtle System 2 Short — 55-bar low breakdown at ${ch55.low.toFixed(2)}: major downtrend signal, ATR stop 2× = ${(price + atr*2).toFixed(2)}`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── System 1 Long — 20-bar high breakout ──
    if (prev.close <= ch20.high && price > ch20.high && ctx.macroTrend !== 'DOWNTREND') {
      return {
        direction: 'LONG',
        confidence: 0.62,
        entryZone: [price, price * 1.002],
        target1: price + atr * 2,
        target2: price + atr * 4,
        invalidation: price - atr * 2,
        explanation: `Turtle System 1 Long — 20-bar high breakout at ${ch20.high.toFixed(2)}, macro not bearish: trend entry`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── System 1 Short — 20-bar low breakdown ──
    if (prev.close >= ch20.low && price < ch20.low && ctx.macroTrend !== 'UPTREND') {
      return {
        direction: 'SHORT',
        confidence: 0.62,
        entryZone: [price * 0.998, price],
        target1: price - atr * 2,
        target2: price - atr * 4,
        invalidation: price + atr * 2,
        explanation: `Turtle System 1 Short — 20-bar low breakdown at ${ch20.low.toFixed(2)}, macro not bullish: trend entry`,
        moduleName: this.name, weight: this.weight,
      };
    }

    // ── Inside channel — channel compression, potential expansion ──
    const ch20Range = ch20.high - ch20.low;
    const histAvgRange = this.avgChannelRange(bars, 20, 60);
    if (ch20Range < histAvgRange * 0.55) {
      // Compression — bias toward current trend
      if (ctx.macroTrend === 'UPTREND') {
        return {
          direction: 'LONG',
          confidence: 0.52,
          entryZone: [price * 0.998, price * 1.002],
          target1: ch20.high,
          target2: ch20.high + ch20Range,
          invalidation: ch20.low * 0.997,
          explanation: `Donchian Compression — channel ${(ch20Range/price*100).toFixed(1)}% of normal size, uptrend bias: await expansion`,
          moduleName: this.name, weight: this.weight,
        };
      }
    }

    return this.neutral();
  }

  private calcChannel(bars: OHLCVData['bars'], period: number): { high: number; low: number } {
    const window = bars.slice(-period - 1, -1); // exclude last bar
    return { high: Math.max(...window.map(b => b.high)), low: Math.min(...window.map(b => b.low)) };
  }

  private avgChannelRange(bars: OHLCVData['bars'], period: number, lookback: number): number {
    let sum = 0, count = 0;
    for (let i = lookback; i > period; i -= 5) {
      const window = bars.slice(-i, -i + period);
      if (window.length < period) continue;
      sum += Math.max(...window.map(b => b.high)) - Math.min(...window.map(b => b.low));
      count++;
    }
    return count > 0 ? sum / count : bars[bars.length-1].close * 0.05;
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
    if (bars.length < 60) return [];
    const ch20 = this.calcChannel(bars, 20);
    const ch55 = this.calcChannel(bars, 55);
    return [
      { price: ch20.high, type: 'resistance', strength: 0.72, label: '20-Bar High' },
      { price: ch20.low, type: 'support', strength: 0.72, label: '20-Bar Low' },
      { price: ch55.high, type: 'resistance', strength: 0.82, label: '55-Bar High' },
      { price: ch55.low, type: 'support', strength: 0.82, label: '55-Bar Low' },
    ];
  }

  getConfidence() { return 0.63; }
  getWeight() { return this.weight; }
  getExplanation() { return 'Donchian Turtle — 20/55-bar channel breakouts, ATR stops, trend-following with compression detection'; }

  private neutral(): StrategySignal {
    return { direction: 'NEUTRAL', confidence: 0, entryZone: [0,0], target1: 0, invalidation: 0, explanation: 'No Donchian signal', moduleName: this.name, weight: this.weight };
  }
}
