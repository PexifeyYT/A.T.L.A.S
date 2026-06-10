import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Intermarket Analysis Strategy
 * DXY/equity correlation, bond yield impact, sector rotation, risk-on/off regime
 */
export class IntermarketStrategy implements IStrategyModule {
  name = 'mod_intermarket';
  weight = 0.95;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 50) {
      return this.neutralSignal();
    }

    // Simulate intermarket data (Phase 6 will fetch real DXY, bond yields)
    const dxyStrength = this.simulateDXYTrend(bars);
    const riskRegime = this.detectRiskRegime(bars);
    const lastBar = bars[bars.length - 1];

    // DXY weak, risk-on = bullish equities
    if (dxyStrength < -0.02 && riskRegime === 'risk-on') {
      return {
        direction: 'LONG',
        confidence: 0.55,
        entryZone: [lastBar.close, lastBar.close * 1.01],
        target1: lastBar.close * 1.04,
        target2: lastBar.close * 1.08,
        invalidation: lastBar.low * 0.98,
        explanation: 'Intermarket: DXY weakening + risk-on regime = equity tailwinds',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // DXY strong, risk-off = bearish equities
    if (dxyStrength > 0.02 && riskRegime === 'risk-off') {
      return {
        direction: 'SHORT',
        confidence: 0.52,
        entryZone: [lastBar.close * 0.99, lastBar.close],
        target1: lastBar.close * 0.96,
        target2: lastBar.close * 0.92,
        invalidation: lastBar.high * 1.02,
        explanation: 'Intermarket: DXY strengthening + risk-off regime = equity headwinds',
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Mixed conditions = neutral
    return this.neutralSignal();
  }

  getKeyLevels(): PriceLevel[] {
    return [];
  }

  getConfidence(): number {
    return 0.54;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'Intermarket — DXY/equity correlation, bond yield impact, sector rotation, risk regime';
  }

  private simulateDXYTrend(bars: any[]): number {
    // Inverse correlation: when DXY strong, equities weak
    // Simplified: estimate based on price volatility
    const recent = bars.slice(-20);
    const avgClose =
      recent.reduce((sum, b) => sum + b.close, 0) / recent.length;

    return (bars[bars.length - 1].close - avgClose) / avgClose;
  }

  private detectRiskRegime(bars: any[]): 'risk-on' | 'risk-off' | 'neutral' {
    // Simplified: detect based on volatility and direction
    const recent = bars.slice(-30);
    const volatility = (Math.max(...recent.map((b) => b.high)) -
      Math.min(...recent.map((b) => b.low))) /
      Math.min(...recent.map((b) => b.low));

    const trend = bars[bars.length - 1].close > recent[0].close;

    if (volatility > 0.08 && !trend) return 'risk-off';
    if (volatility < 0.05 && trend) return 'risk-on';

    return 'neutral';
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No intermarket signal',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
