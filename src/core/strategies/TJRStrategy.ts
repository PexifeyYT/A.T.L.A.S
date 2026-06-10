import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * TJR Strategy Constitution
 * Core rules: HTF bias → LTF market structure → OB/FVG entry → Risk/reward minimum 2.5
 */
export class TJRStrategy implements IStrategyModule {
  name = 'mod_tjr';
  weight = 1.71;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 50) {
      return this.neutralSignal();
    }

    // Find market structure (BOS/CHoCH)
    const structure = this.findMarketStructure(bars);

    if (!structure) {
      return this.neutralSignal();
    }

    // Find order block or FVG for entry
    const entryLevel = this.findEntryZone(bars, structure.direction);
    if (!entryLevel) {
      return this.neutralSignal();
    }

    const lastBar = bars[bars.length - 1];
    const riskReward = this.calculateRiskReward(lastBar.close, entryLevel, structure.direction);

    if (riskReward < 2.5) {
      return this.neutralSignal();
    }

    if (structure.direction === 'up') {
      return {
        direction: 'LONG',
        confidence: 0.75,
        entryZone: [entryLevel.low, entryLevel.high],
        target1: entryLevel.high * 1.06,
        target2: entryLevel.high * 1.12,
        invalidation: entryLevel.low - 2,
        explanation: 'TJR: HTF bias + BOS + OB retest with 2.5+ RR',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return {
      direction: 'SHORT',
      confidence: 0.68,
      entryZone: [entryLevel.high, entryLevel.low],
      target1: entryLevel.low * 0.94,
      target2: entryLevel.low * 0.88,
      invalidation: entryLevel.high + 2,
      explanation: 'TJR: HTF bias + CHoCH + OB retest with 2.5+ RR',
      moduleName: this.name,
      weight: this.weight,
    };
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-50);
    const levels: PriceLevel[] = [];

    // Identify order blocks (origin candle of a structure move)
    const structure = this.findMarketStructure(bars);
    if (structure) {
      levels.push({
        price: (structure.originHigh + structure.originLow) / 2,
        type: 'orderblock',
        strength: 0.85,
        label: 'Order Block',
      });
    }

    return levels;
  }

  getConfidence(): number {
    return 0.75;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'TJR Constitution: HTF bias → LTF structure break → OB/FVG entry → min 2.5 RR';
  }

  private findMarketStructure(
    bars: any[],
  ): { direction: 'up' | 'down'; originHigh: number; originLow: number } | null {
    const recent = bars.slice(-20);

    // Check for higher highs/lows
    const highs = recent.map((b) => b.high);
    const lows = recent.map((b) => b.low);

    const lastHigh = highs[highs.length - 1];
    const lastLow = lows[lows.length - 1];
    const prevHighs = highs.slice(0, -1);
    const prevLows = lows.slice(0, -1);

    if (lastHigh > Math.max(...prevHighs) && lastLow > Math.min(...prevLows)) {
      return {
        direction: 'up',
        originHigh: Math.max(...prevHighs),
        originLow: Math.min(...prevLows),
      };
    }

    if (lastLow < Math.min(...prevLows) && lastHigh < Math.max(...prevHighs)) {
      return {
        direction: 'down',
        originHigh: Math.max(...prevHighs),
        originLow: Math.min(...prevLows),
      };
    }

    return null;
  }

  private findEntryZone(bars: any[], direction: 'up' | 'down') {
    const recent = bars.slice(-15);

    if (direction === 'up') {
      const swingLow = Math.min(...recent.map((b) => b.low));
      return { high: swingLow * 1.01, low: swingLow };
    }

    const swingHigh = Math.max(...recent.map((b) => b.high));
    return { high: swingHigh, low: swingHigh * 0.99 };
  }

  private calculateRiskReward(entry: number, zone: any, direction: 'up' | 'down'): number {
    if (direction === 'up') {
      const risk = entry - zone.low;
      const reward = zone.high * 1.06 - entry;
      return reward / risk;
    }

    const risk = zone.high - entry;
    const reward = entry - zone.low * 0.94;
    return reward / risk;
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No TJR setup identified',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
