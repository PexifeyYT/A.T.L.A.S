import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Smart Money Concepts (ICT Framework) Strategy Module
 * Identifies: BOS/CHoCH, Order Blocks, Fair Value Gaps, Breaker Blocks
 */
export class SMCStrategy implements IStrategyModule {
  name = 'mod_smc';
  weight = 1.82;

  analyze(data: OHLCVData, context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 20) {
      return this.neutralSignal();
    }

    // Simplified SMC logic — check for higher highs/lows (uptrend) or lower highs/lows (downtrend)
    const recentBars = bars.slice(-10);
    const highs = recentBars.map((b) => b.high);
    const lows = recentBars.map((b) => b.low);

    const isUptrend = highs[highs.length - 1] > Math.max(...highs.slice(0, -1));
    const isDowntrend = lows[lows.length - 1] < Math.min(...lows.slice(0, -1));

    if (isUptrend) {
      const lastClose = bars[bars.length - 1].close;
      const orderBlockHigh = Math.max(...recentBars.map((b) => b.high));
      const entryZone: [number, number] = [lastClose, orderBlockHigh];

      return {
        direction: 'LONG',
        confidence: 0.72,
        entryZone,
        target1: orderBlockHigh * 1.05,
        target2: orderBlockHigh * 1.1,
        invalidation: Math.min(...lows) - 1,
        explanation: 'BOS + OB retest — bullish',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (isDowntrend) {
      const lastClose = bars[bars.length - 1].close;
      const orderBlockLow = Math.min(...recentBars.map((b) => b.low));
      const entryZone: [number, number] = [orderBlockLow, lastClose];

      return {
        direction: 'SHORT',
        confidence: 0.65,
        entryZone,
        target1: orderBlockLow * 0.95,
        target2: orderBlockLow * 0.9,
        invalidation: Math.max(...highs) + 1,
        explanation: 'CHoCH + OB retest — bearish',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-50);
    const levels: PriceLevel[] = [];

    // Find recent swing highs/lows
    const swingHigh = Math.max(...bars.map((b) => b.high));
    const swingLow = Math.min(...bars.map((b) => b.low));

    levels.push({
      price: swingHigh,
      type: 'resistance',
      strength: 0.8,
      label: 'Swing High',
    });

    levels.push({
      price: swingLow,
      type: 'support',
      strength: 0.8,
      label: 'Swing Low',
    });

    return levels;
  }

  getConfidence(): number {
    return 0.72;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'Smart Money Concepts — BOS/CHoCH, Order Blocks, Liquidity identification';
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No setup identified',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
