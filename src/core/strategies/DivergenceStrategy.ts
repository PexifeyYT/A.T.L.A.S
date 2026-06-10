import { IStrategyModule, StrategySignal, OHLCVData, MarketContext, PriceLevel } from '@core/types';

/**
 * Divergence Strategy — RSI & MACD
 * Regular divergence = reversal signal
 * Hidden divergence = trend continuation (higher probability in trending markets)
 * Only valid in extreme RSI zones (<40 or >60), never in mid-range noise
 */
export class DivergenceStrategy implements IStrategyModule {
  name = 'mod_divergence';
  weight = 1.28;

  analyze(data: OHLCVData, _ctx: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 40) return this.neutral();

    const last = bars[bars.length - 1];
    const rsiArr = this.calcRSIArray(bars, 14);
    const rsiNow = rsiArr[rsiArr.length - 1];

    // Find prior swing in price and RSI (look back 5-25 bars)
    const lookback = 25;
    const priceWindow = bars.slice(-lookback);
    const rsiWindow = rsiArr.slice(-lookback);

    // ── Regular Bullish Divergence: price lower low + RSI higher low ──
    // Only valid if RSI < 45 (oversold area)
    if (rsiNow < 45) {
      const priceMin1Idx = this.findMinIdx(priceWindow.map(b => b.low), 5, lookback - 1);
      const priceMin2Idx = this.findMinIdx(priceWindow.map(b => b.low), 0, priceMin1Idx - 3);
      if (priceMin1Idx > 0 && priceMin2Idx >= 0) {
        const price1 = priceWindow[priceMin1Idx].low;
        const price2 = priceWindow[priceMin2Idx].low;
        const rsi1 = rsiWindow[priceMin1Idx];
        const rsi2 = rsiWindow[priceMin2Idx];
        if (price1 < price2 && rsi1 > rsi2 + 3) {
          return {
            direction: 'LONG',
            confidence: 0.70,
            entryZone: [last.close * 0.998, last.close * 1.002],
            target1: last.close * 1.055,
            target2: last.close * 1.11,
            invalidation: last.low * 0.994,
            explanation: `Regular Bullish Divergence — price made lower low (${price2.toFixed(2)}→${price1.toFixed(2)}) but RSI higher low (${rsi2.toFixed(0)}→${rsi1.toFixed(0)}): reversal signal`,
            moduleName: this.name, weight: this.weight,
          };
        }
      }
    }

    // ── Regular Bearish Divergence: price higher high + RSI lower high ──
    // Only valid if RSI > 55 (overbought area)
    if (rsiNow > 55) {
      const priceMax1Idx = this.findMaxIdx(priceWindow.map(b => b.high), 5, lookback - 1);
      const priceMax2Idx = this.findMaxIdx(priceWindow.map(b => b.high), 0, priceMax1Idx - 3);
      if (priceMax1Idx > 0 && priceMax2Idx >= 0) {
        const price1 = priceWindow[priceMax1Idx].high;
        const price2 = priceWindow[priceMax2Idx].high;
        const rsi1 = rsiWindow[priceMax1Idx];
        const rsi2 = rsiWindow[priceMax2Idx];
        if (price1 > price2 && rsi1 < rsi2 - 3) {
          return {
            direction: 'SHORT',
            confidence: 0.70,
            entryZone: [last.close * 0.998, last.close * 1.002],
            target1: last.close * 0.945,
            target2: last.close * 0.89,
            invalidation: last.high * 1.006,
            explanation: `Regular Bearish Divergence — price higher high (${price2.toFixed(2)}→${price1.toFixed(2)}) but RSI lower high (${rsi2.toFixed(0)}→${rsi1.toFixed(0)}): reversal signal`,
            moduleName: this.name, weight: this.weight,
          };
        }
      }
    }

    // ── Hidden Bullish Divergence: price higher low + RSI lower low (uptrend continuation) ──
    if (rsiNow < 50 && rsiNow > 30) {
      const priceMin1Idx = this.findMinIdx(priceWindow.map(b => b.low), 5, lookback - 1);
      const priceMin2Idx = this.findMinIdx(priceWindow.map(b => b.low), 0, priceMin1Idx - 3);
      if (priceMin1Idx > 0 && priceMin2Idx >= 0) {
        const price1 = priceWindow[priceMin1Idx].low;
        const price2 = priceWindow[priceMin2Idx].low;
        const rsi1 = rsiWindow[priceMin1Idx];
        const rsi2 = rsiWindow[priceMin2Idx];
        if (price1 > price2 * 1.003 && rsi1 < rsi2 - 2) {
          return {
            direction: 'LONG',
            confidence: 0.67,
            entryZone: [last.close * 0.998, last.close * 1.002],
            target1: last.close * 1.05,
            target2: last.close * 1.10,
            invalidation: last.low * 0.993,
            explanation: `Hidden Bullish Divergence — price higher low but RSI lower low: uptrend continuation confirmed`,
            moduleName: this.name, weight: this.weight,
          };
        }
      }
    }

    // ── Hidden Bearish Divergence: price lower high + RSI higher high (downtrend continuation) ──
    if (rsiNow > 50 && rsiNow < 70) {
      const priceMax1Idx = this.findMaxIdx(priceWindow.map(b => b.high), 5, lookback - 1);
      const priceMax2Idx = this.findMaxIdx(priceWindow.map(b => b.high), 0, priceMax1Idx - 3);
      if (priceMax1Idx > 0 && priceMax2Idx >= 0) {
        const price1 = priceWindow[priceMax1Idx].high;
        const price2 = priceWindow[priceMax2Idx].high;
        const rsi1 = rsiWindow[priceMax1Idx];
        const rsi2 = rsiWindow[priceMax2Idx];
        if (price1 < price2 * 0.997 && rsi1 > rsi2 + 2) {
          return {
            direction: 'SHORT',
            confidence: 0.67,
            entryZone: [last.close * 0.998, last.close * 1.002],
            target1: last.close * 0.950,
            target2: last.close * 0.900,
            invalidation: last.high * 1.005,
            explanation: `Hidden Bearish Divergence — price lower high but RSI higher high: downtrend continuation confirmed`,
            moduleName: this.name, weight: this.weight,
          };
        }
      }
    }

    return this.neutral();
  }

  private calcRSIArray(bars: OHLCVData['bars'], period: number): number[] {
    const result: number[] = new Array(period).fill(50);
    if (bars.length < period + 1) return result;
    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
      const d = bars[i].close - bars[i-1].close;
      if (d > 0) avgGain += d; else avgLoss += Math.abs(d);
    }
    avgGain /= period; avgLoss /= period;
    const k = 1 / period;
    for (let i = period; i < bars.length; i++) {
      const d = bars[i].close - bars[i-1].close;
      const gain = d > 0 ? d : 0;
      const loss = d < 0 ? Math.abs(d) : 0;
      avgGain = avgGain * (1 - k) + gain * k;
      avgLoss = avgLoss * (1 - k) + loss * k;
      result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
    }
    return result;
  }

  private findMinIdx(arr: number[], from: number, to: number): number {
    let minVal = Infinity, minIdx = -1;
    for (let i = Math.max(0, from); i <= Math.min(arr.length - 1, to); i++) {
      if (arr[i] < minVal) { minVal = arr[i]; minIdx = i; }
    }
    return minIdx;
  }

  private findMaxIdx(arr: number[], from: number, to: number): number {
    let maxVal = -Infinity, maxIdx = -1;
    for (let i = Math.max(0, from); i <= Math.min(arr.length - 1, to); i++) {
      if (arr[i] > maxVal) { maxVal = arr[i]; maxIdx = i; }
    }
    return maxIdx;
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars;
    if (bars.length < 20) return [];
    return [
      { price: Math.min(...bars.slice(-14).map(b => b.low)), type: 'support', strength: 0.65, label: 'Divergence Low' },
      { price: Math.max(...bars.slice(-14).map(b => b.high)), type: 'resistance', strength: 0.65, label: 'Divergence High' },
    ];
  }

  getConfidence() { return 0.68; }
  getWeight() { return this.weight; }
  getExplanation() { return 'RSI/MACD divergence — regular (reversal) and hidden (continuation), only in extreme zones'; }

  private neutral(): StrategySignal {
    return { direction: 'NEUTRAL', confidence: 0, entryZone: [0,0], target1: 0, invalidation: 0, explanation: 'No divergence signal', moduleName: this.name, weight: this.weight };
  }
}
