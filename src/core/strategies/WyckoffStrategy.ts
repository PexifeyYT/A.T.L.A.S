import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
  OHLCV,
} from '@core/types';

export class WyckoffStrategy implements IStrategyModule {
  name = 'mod_wyckoff';
  weight = 1.6;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 50) return this.neutralSignal();

    const recent = bars.slice(-50);
    const phase = this.identifyPhase(recent);
    const last = recent[recent.length - 1];

    const rangeHigh = Math.max(...recent.map(b => b.high));
    const rangeLow = Math.min(...recent.map(b => b.low));

    if (phase === 'accumulation') {
      const spring = this.detectSpring(recent, rangeLow);
      if (!spring) return this.neutralSignal();

      const stopLoss = spring.springLow - last.close * 0.002;
      const risk = last.close - stopLoss;
      const t1 = last.close + risk * 2.0;
      const t2 = rangeHigh + (rangeHigh - rangeLow) * 0.5;

      return {
        direction: 'LONG',
        confidence: 0.70 + (spring.volumeConfirm ? 0.08 : 0),
        entryZone: [spring.springLow, spring.springLow * 1.005],
        target1: t1,
        target2: t2,
        invalidation: stopLoss,
        explanation: `Wyckoff Spring — accumulation phase, price reclaimed ${rangeLow.toFixed(2)}, volume ${spring.volumeConfirm ? 'dry-up confirmed' : 'moderate'}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    if (phase === 'distribution') {
      const upthrust = this.detectUpthrust(recent, rangeHigh);
      if (!upthrust) return this.neutralSignal();

      const stopLoss = upthrust.thrustHigh + last.close * 0.002;
      const risk = stopLoss - last.close;
      const t1 = last.close - risk * 2.0;
      const t2 = rangeLow - (rangeHigh - rangeLow) * 0.5;

      return {
        direction: 'SHORT',
        confidence: 0.65 + (upthrust.volumeConfirm ? 0.07 : 0),
        entryZone: [upthrust.thrustHigh, upthrust.thrustHigh * 0.995],
        target1: t1,
        target2: t2,
        invalidation: stopLoss,
        explanation: `Wyckoff UTAD — distribution phase, rejection at ${rangeHigh.toFixed(2)}, volume climax ${upthrust.volumeConfirm ? 'confirmed' : 'moderate'}`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  private identifyPhase(bars: OHLCV[]): 'accumulation' | 'distribution' | 'trending' {
    const last = bars[bars.length - 1];
    const rangeHigh = Math.max(...bars.map(b => b.high));
    const rangeLow = Math.min(...bars.map(b => b.low));
    const rangeSize = rangeHigh - rangeLow;

    // Price position in range
    const pos = (last.close - rangeLow) / rangeSize;

    // Volume trend: compare first vs second half avg volume
    const firstHalf = bars.slice(0, 25);
    const secondHalf = bars.slice(25);
    const v1Avg = firstHalf.reduce((s, b) => s + b.volume, 0) / firstHalf.length;
    const v2Avg = secondHalf.reduce((s, b) => s + b.volume, 0) / secondHalf.length;
    const volDecline = v2Avg < v1Avg * 0.8;

    // Range contraction: recent 10 bars ATR vs full ATR
    const fullATR = bars.reduce((s, b) => s + (b.high - b.low), 0) / bars.length;
    const recentATR = bars.slice(-10).reduce((s, b) => s + (b.high - b.low), 0) / 10;
    const contracted = recentATR < fullATR * 0.7;

    if (pos < 0.35 && (volDecline || contracted)) return 'accumulation';
    if (pos > 0.65 && (volDecline || contracted)) return 'distribution';
    return 'trending';
  }

  private detectSpring(bars: OHLCV[], rangeLow: number): { springLow: number; volumeConfirm: boolean } | null {
    const avgVol = bars.reduce((s, b) => s + b.volume, 0) / bars.length;
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];

    // Spring: wick below range low but close above; or last bar dipped below and recovered
    const hadSpike = bars.slice(-5).some(b => b.low < rangeLow * 0.999);
    if (!hadSpike) return null;

    // Close must be bullish (above previous close or above open)
    if (last.close <= prev.close * 0.995) return null;

    const springBar = bars.slice(-5).find(b => b.low < rangeLow);
    if (!springBar) return null;

    const volumeConfirm = springBar.volume < avgVol * 0.8; // volume dry-up on spring
    return { springLow: springBar.low, volumeConfirm };
  }

  private detectUpthrust(bars: OHLCV[], rangeHigh: number): { thrustHigh: number; volumeConfirm: boolean } | null {
    const avgVol = bars.reduce((s, b) => s + b.volume, 0) / bars.length;
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];

    const hadSpike = bars.slice(-5).some(b => b.high > rangeHigh * 1.001);
    if (!hadSpike) return null;

    if (last.close >= prev.close * 1.005) return null;

    const thrustBar = bars.slice(-5).find(b => b.high > rangeHigh);
    if (!thrustBar) return null;

    const volumeConfirm = thrustBar.volume > avgVol * 1.5; // volume climax on upthrust
    return { thrustHigh: thrustBar.high, volumeConfirm };
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars.slice(-50);
    const rangeHigh = Math.max(...bars.map(b => b.high));
    const rangeLow = Math.min(...bars.map(b => b.low));

    return [
      { price: rangeHigh, type: 'resistance', strength: 0.75, label: 'Wyckoff Range High' },
      { price: rangeLow, type: 'support', strength: 0.75, label: 'Wyckoff Range Low' },
    ];
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL', confidence: 0, entryZone: [0, 0],
      target1: 0, invalidation: 0, explanation: 'No Wyckoff setup',
      moduleName: this.name, weight: this.weight,
    };
  }

  getConfidence(): number { return 0.72; }
  getWeight(): number { return this.weight; }
  getExplanation(): string { return 'Wyckoff — accumulation spring / distribution UTAD with volume confirmation'; }
}
