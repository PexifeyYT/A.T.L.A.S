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
        invalidation: lastBar.low - 1,
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
        invalidation: lastBar.high + 1,
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

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACD(bars: any[]) {
    const ema12 = this.calculateEMA(bars, 12);
    const ema26 = this.calculateEMA(bars, 26);
    const macd = ema12 - ema26;

    // Signal = 9 EMA of MACD
    const macdHistory = bars.map((_, idx) => {
      const subset = bars.slice(0, idx + 1);
      const e12 = this.calculateEMA(subset, 12);
      const e26 = this.calculateEMA(subset, 26);
      return e12 - e26;
    });

    const signal = this.calculateEMA(macdHistory.map((m) => ({ close: m })), 9);

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

  private calculateEMA(data: any[], period: number): number {
    if (data.length < period) {
      return data.reduce((sum, item) => sum + (item.close || item), 0) / data.length;
    }

    const closes = data.slice(-period).map((item) => item.close || item);
    const sma = closes.reduce((a, b) => a + b, 0) / period;
    const multiplier = 2 / (period + 1);

    let ema = sma;
    for (let i = period; i < data.length; i++) {
      const close = data[i].close || data[i];
      ema = close * multiplier + ema * (1 - multiplier);
    }

    return ema;
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
