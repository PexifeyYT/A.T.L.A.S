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
    // Use recent price momentum as a proxy for risk appetite
    // Strong upward price momentum = risk-on (DXY typically weak in this env)
    const r20 = bars.slice(-20);
    const r5 = bars.slice(-5);
    const avg20 = r20.reduce((s: number, b: any) => s + b.close, 0) / r20.length;
    const avg5 = r5.reduce((s: number, b: any) => s + b.close, 0) / r5.length;
    // Positive = price above average = risk-on = DXY "weak"
    return (avg5 - avg20) / avg20;
  }

  private detectRiskRegime(bars: any[]): 'risk-on' | 'risk-off' | 'neutral' {
    const recent = bars.slice(-30);
    // Volatility: ATR vs price ratio
    let atrSum = 0;
    for (let i = 1; i < recent.length; i++) {
      atrSum += Math.max(
        recent[i].high - recent[i].low,
        Math.abs(recent[i].high - recent[i - 1].close),
        Math.abs(recent[i].low - recent[i - 1].close),
      );
    }
    const atrPct = (atrSum / (recent.length - 1)) / recent[recent.length - 1].close;

    // Volume: compare recent 5 bar avg vol to 30 bar avg vol
    const avgVol30 = recent.reduce((s: number, b: any) => s + b.volume, 0) / recent.length;
    const avgVol5 = recent.slice(-5).reduce((s: number, b: any) => s + b.volume, 0) / 5;
    const volRatio = avgVol5 / (avgVol30 || 1);

    const trend = bars[bars.length - 1].close > recent[0].close;

    // Risk-off: high vol, high ATR, downtrending
    if (atrPct > 0.02 && !trend && volRatio > 1.2) return 'risk-off';
    // Risk-on: low ATR, uptrending, stable volume
    if (atrPct < 0.012 && trend && volRatio < 1.3) return 'risk-on';
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
