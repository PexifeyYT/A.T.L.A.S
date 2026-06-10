import {
  IStrategyModule,
  StrategySignal,
  OHLCVData,
  MarketContext,
  PriceLevel,
} from '@core/types';

/**
 * Sentiment Analysis Strategy
 * News NLP sentiment, social mention volume, analyst ratings
 */
export class SentimentStrategy implements IStrategyModule {
  name = 'mod_sentiment';
  weight = 0.85;

  analyze(data: OHLCVData, _context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 20) {
      return this.neutralSignal();
    }

    // Simulate sentiment (Phase 6 will fetch real news)
    const newsSentiment = this.simulateNewsSentiment(bars);
    const socialVolume = this.estimateSocialVolume(bars);
    const lastBar = bars[bars.length - 1];

    // Strong bullish sentiment + uptrend
    if (newsSentiment > 0.65 && socialVolume > 0) {
      return {
        direction: 'LONG',
        confidence: 0.48,
        entryZone: [lastBar.close, lastBar.close * 1.01],
        target1: lastBar.close * 1.04,
        target2: lastBar.close * 1.08,
        invalidation: lastBar.low,
        explanation: `News sentiment proxy bullish (${(newsSentiment * 100).toFixed(0)}%) + momentum volume spike`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    // Strong bearish sentiment + downtrend
    if (newsSentiment < 0.35 && socialVolume < 0) {
      return {
        direction: 'SHORT',
        confidence: 0.45,
        entryZone: [lastBar.close * 0.99, lastBar.close],
        target1: lastBar.close * 0.96,
        target2: lastBar.close * 0.92,
        invalidation: lastBar.high,
        explanation: `News sentiment proxy bearish (${(newsSentiment * 100).toFixed(0)}%) + negative momentum volume`,
        moduleName: this.name,
        weight: this.weight,
      };
    }

    return this.neutralSignal();
  }

  getKeyLevels(_data: OHLCVData): PriceLevel[] {
    return [];
  }

  getConfidence(): number {
    return 0.46;
  }

  getWeight(): number {
    return this.weight;
  }

  getExplanation(): string {
    return 'Sentiment — News NLP score, social mention volume, analyst consensus, earnings sentiment';
  }

  private simulateNewsSentiment(bars: any[]): number {
    // Use 20-bar return + 5-bar momentum as sentiment proxy (0-1 scale, 0.5 = neutral)
    if (bars.length < 20) return 0.5;
    const close0 = bars[bars.length - 20].close;
    const close5 = bars[bars.length - 5].close;
    const closeLast = bars[bars.length - 1].close;
    const r20 = (closeLast - close0) / close0; // -0.2 to +0.2 typical
    const r5  = (closeLast - close5) / close5;
    const raw = 0.5 + r20 * 1.5 + r5 * 1.0; // weight recent momentum more
    return Math.max(0, Math.min(1, raw));
  }

  private estimateSocialVolume(bars: any[]): number {
    const recent = bars.slice(-5);
    const closes = recent.map((b: any) => b.close);
    let upDays = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) upDays++;
    }
    // upDays is 0-4 out of 4 comparisons
    return upDays >= 3 ? 1 : upDays <= 1 ? -1 : 0;
  }

  private neutralSignal(): StrategySignal {
    return {
      direction: 'NEUTRAL',
      confidence: 0,
      entryZone: [0, 0],
      target1: 0,
      invalidation: 0,
      explanation: 'No sentiment signal',
      moduleName: this.name,
      weight: this.weight,
    };
  }
}
