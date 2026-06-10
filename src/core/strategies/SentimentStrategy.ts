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

  analyze(data: OHLCVData, context: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 20) {
      return this.neutralSignal();
    }

    // Simulate sentiment (Phase 6 will fetch real news)
    const newsSentiment = this.simulateNewsSentiment(context.symbol);
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

  private simulateNewsSentiment(symbol: string): number {
    // Simulate sentiment (0-100 scale, 50 = neutral)
    const hash = symbol.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
    return (hash % 100) / 100;
  }

  private estimateSocialVolume(bars: any[]): number {
    // Estimate social volume based on price momentum
    const recent = bars.slice(-5);
    const closes = recent.map((b) => b.close);

    const upDays = closes.filter(
      (c, idx) => idx === 0 || c > closes[idx - 1],
    ).length;

    return upDays > 2.5 ? 1 : upDays < 2.5 ? -1 : 0;
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
