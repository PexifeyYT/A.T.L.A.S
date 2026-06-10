import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Momentum Oscillators Strategy
 * RSI divergence, MACD, Stochastic, MFI signals
 */
export class MomentumStrategy implements IStrategyModule {
  name = 'mod_momentum';
  weight = 1.18;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 30) {
      return this.neutralSignal();
    }

    const rsi = this.calculateRSI(bars, 14);
    const macd = this.calculateMACD(bars);
    const stoch = this.calculateStochastic(bars, 14);

    const lastBar = bars[bars.length - 1];

    // RSI oversold (< 30) = potential bounce
    if (rsi < 30 && stoch.k < 20) {
      return {
        direction: 'LONG',
        confidence: 0.62,
        entryZone: [lastBar.close, lastBar.close * 1.01],
        target1: lastBar.close * 1.05,
        target2: lastBar.close * 1.1,
        invalidation: lastBar.low * 0.997,
        explanation: 'RSI oversold + Stochastic low — momentum divergence, reversal pending',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // RSI overbought (> 70) = potential pullback
    if (rsi > 70 && stoch.k > 80) {
      return {
        direction: 'SHORT',
        confidence: 0.58,
        entryZone: [lastBar.close * 0.99, lastBar.close],
        target1: lastBar.close * 0.95,
        target2: lastBar.close * 0.9,
        invalidation: lastBar.high * 1.003,
        explanation: 'RSI overbought + Stochastic high — momentum divergence, pullback likely',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // MACD bullish cross
    const prevMACD = this.calculateMACD(bars.slice(0, -1));
    if (prevMACD.macd <= prevMACD.signal && macd.macd > macd.signal && rsi < 70) {
      return {
        direction: 'LONG',
        confidence: 0.65,
        entryZone: [lastBar.close, lastBar.close * 1.01],
        target1: lastBar.close * 1.06,
        target2: lastBar.close * 1.12,
        invalidation: Math.min(...bars.slice(-5).map((b) => b.low)),
        explanation: 'MACD bullish crossover — momentum gaining, RSI not yet overbought',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // MACD bearish cross
    if (prevMACD.macd >= prevMACD.signal && macd.macd < macd.signal && rsi > 30) {
      return {
        direction: 'SHORT',
        confidence: 0.62,
        entryZone: [lastBar.close * 0.99, lastBar.close],
        target1: lastBar.close * 0.94,
        target2: lastBar.close * 0.88,
        invalidation: Math.max(...bars.slice(-5).map((b) => b.high)),
        explanation: 'MACD bearish crossover — momentum weakening, RSI not yet oversold',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars;
    if (bars.length < 30) return [];

    const rsi = this.calculateRSI(bars, 14);

    const levels: PriceLevel[] = [];

    if (rsi < 30) {
      levels.push({
        price: Math.min(...bars.slice(-14).map((b) => b.low)),
        type: 'support',
        strength: 0.75,
        label: 'RSI Oversold Support',
      });
    }

    if (rsi > 70) {
      levels.push({
        price: Math.max(...bars.slice(-14).map((b) => b.high)),
        type: 'resistance',
        strength: 0.75,
        label: 'RSI Overbought Resistance',
      });
    }

    return levels;
  }

  getConfidence(): number {
    return 0.62;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'Momentum — RSI divergence, MACD crossovers, Stochastic extremes, mean reversion signals';
  }

  private calculateRSI(bars: any[], period: number): number {
    if (bars.length < period + 1) return 50;

    const closes = bars.slice(-period - 1).map((b) => b.close);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    if (avgGain === 0) return 0;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACD(bars: any[]) {
    if (bars.length < 26) return { macd: 0, signal: 0, histogram: 0 };

    // Incremental EMA12 and EMA26 — O(n) single pass
    const k12 = 2 / 13, k26 = 2 / 27;
    let ema12 = bars.slice(0, 12).reduce((s: number, b: any) => s + b.close, 0) / 12;
    let ema26 = bars.slice(0, 26).reduce((s: number, b: any) => s + b.close, 0) / 26;

    const macdLine: number[] = [];
    for (let i = 12; i < 26; i++) {
      ema12 = bars[i].close * k12 + ema12 * (1 - k12);
    }
    macdLine.push(ema12 - ema26);

    for (let i = 26; i < bars.length; i++) {
      ema12 = bars[i].close * k12 + ema12 * (1 - k12);
      ema26 = bars[i].close * k26 + ema26 * (1 - k26);
      macdLine.push(ema12 - ema26);
    }

    // Signal = 9 EMA of MACD line
    const k9 = 2 / 10;
    let signal = macdLine.slice(0, 9).reduce((s, v) => s + v, 0) / Math.min(9, macdLine.length);
    for (let i = 9; i < macdLine.length; i++) {
      signal = macdLine[i] * k9 + signal * (1 - k9);
    }

    const macd = macdLine[macdLine.length - 1];
    return { macd, signal, histogram: macd - signal };
  }

  private calculateStochastic(bars: any[], period: number) {
    const closes = bars.slice(-period).map((b) => b.close);
    const highs = bars.slice(-period).map((b) => b.high);
    const lows = bars.slice(-period).map((b) => b.low);

    const lowestLow = Math.min(...lows);
    const highestHigh = Math.max(...highs);
    const lastClose = closes[closes.length - 1];

    const k =
      ((lastClose - lowestLow) / (highestHigh - lowestLow)) * 100 || 50;

    return { k, d: k }; // Simplified D = K
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No momentum signal',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
