import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Wyckoff Method Strategy
 * Identifies accumulation/distribution phases, spring/upthrust, composite man logic
 */
export class WyckoffStrategy implements IStrategyModule {
  name = 'mod_wyckoff';
  weight = 1.6;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 30) {
      return this.neutralSignal();
    }

    const phase = this.identifyPhase(bars);

    if (phase === 'accumulation') {
      // Look for spring (test below consolidation, close above)
      if (this.detectSpring(bars)) {
        const lastBar = bars[bars.length - 1];
        return {
          direction: 'LONG',
          confidence: 0.72,
          entryZone: [lastBar.close, lastBar.close * 1.01],
          target1: lastBar.close * 1.08,
          target2: lastBar.close * 1.15,
          invalidation: Math.min(...bars.slice(-10).map((b) => b.low)) - 1,
          explanation: 'Wyckoff spring — accumulation complete, ready for uptrend',
          moduleName: this.name,
          weight: this.weight,
        };
      }

      return this.neutralSignal();
    }

    if (phase === 'distribution') {
      // Look for upthrust (test above consolidation, close below)
      if (this.detectUpthrust(bars)) {
        const lastBar = bars[bars.length - 1];
        return {
          direction: 'SHORT',
          confidence: 0.65,
          entryZone: [lastBar.close * 0.99, lastBar.close],
          target1: lastBar.close * 0.92,
          target2: lastBar.close * 0.85,
          invalidation: Math.max(...bars.slice(-10).map((b) => b.high)) + 1,
          explanation: 'Wyckoff upthrust — distribution complete, weakness ahead',
          moduleName: this.name,
          weight: this.weight,
        };
      }

      return this.neutralSignal();
    }

    return this.neutralSignal();
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-50);
    const levels: PriceLevel[] = [];

    const consolidationHigh = Math.max(...bars.slice(-30).map((b) => b.high));
    const consolidationLow = Math.min(...bars.slice(-30).map((b) => b.low));

    levels.push({
      price: consolidationHigh,
      type: 'resistance',
      strength: 0.75,
      label: 'Wyckoff Consolidation High',
    });

    levels.push({
      price: consolidationLow,
      type: 'support',
      strength: 0.75,
      label: 'Wyckoff Consolidation Low',
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
    return 'Wyckoff Method — Accumulation/distribution phase with spring/upthrust detection';
  }

  private identifyPhase(bars: any[]): 'accumulation' | 'distribution' | 'trending' {
    const recent = bars.slice(-40);

    // Simple logic: if recent volatility is low and we're near the low, accumulation
    const lastClose = bars[bars.length - 1].close;
    const low = Math.min(...recent.map((b) => b.low));
    const high = Math.max(...recent.map((b) => b.high));

    if (lastClose < low + (high - low) * 0.4) {
      return 'accumulation';
    }

    if (lastClose > low + (high - low) * 0.6) {
      return 'distribution';
    }

    return 'trending';
  }

  private detectSpring(bars: any[]): boolean {
    const recent = bars.slice(-8);

    // Spring: bar that goes below consolidation low, but closes above previous support
    if (recent.length < 3) return false;

    const consolidationLow = Math.min(...bars.slice(-30).map((b) => b.low));
    const lastBar = bars[bars.length - 1];
    const prevBar = bars[bars.length - 2];

    return lastBar.low < consolidationLow && lastBar.close > prevBar.close;
  }

  private detectUpthrust(bars: any[]): boolean {
    const consolidationHigh = Math.max(...bars.slice(-30).map((b) => b.high));
    const lastBar = bars[bars.length - 1];
    const prevBar = bars[bars.length - 2];

    return lastBar.high > consolidationHigh && lastBar.close < prevBar.close;
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No Wyckoff setup identified',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
