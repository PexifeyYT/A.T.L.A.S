import { Prediction, PredictionOutcome } from '../types';
import { MarketDataService } from '../data/MarketDataService';

export class OutcomeChecker {
  private marketDataService: MarketDataService;

  constructor(marketDataService: MarketDataService) {
    this.marketDataService = marketDataService;
  }

  async checkPrediction(prediction: Prediction): Promise<PredictionOutcome> {
    const data = await this.marketDataService.fetchOHLCV(
      prediction.symbol,
      prediction.timeframe,
      prediction.horizonBars + 10,
    );

    const barsAfter = data.bars.filter((b) => b.time > prediction.timestamp);

    if (barsAfter.length === 0) {
      return this.buildOutcome(prediction, false, false, false, false, false, 0);
    }

    const windowBars = barsAfter.slice(0, prediction.horizonBars);
    const highs = windowBars.map((b) => b.high);
    const lows = windowBars.map((b) => b.low);
    const maxHigh = highs.length > 0 ? Math.max(...highs) : 0;
    const minLow = lows.length > 0 ? Math.min(...lows) : Infinity;

    const isLong = prediction.direction === 'LONG';
    const lastClose = windowBars.length > 0 ? windowBars[windowBars.length - 1].close : 0;
    const firstClose = barsAfter.length > 0 ? barsAfter[0].close : prediction.entryZone[0];

    const directionCorrect = isLong ? lastClose > firstClose : lastClose < firstClose;
    const target1Hit = isLong ? maxHigh >= prediction.target1 : minLow <= prediction.target1;
    const target2Hit = isLong ? maxHigh >= prediction.target2 : minLow <= prediction.target2;
    const invalidationHit = isLong
      ? minLow <= prediction.invalidation
      : maxHigh >= prediction.invalidation;
    const entryRespected = isLong
      ? minLow >= prediction.entryZone[0] * 0.99
      : maxHigh <= prediction.entryZone[1] * 1.01;

    const actualReturn = isLong
      ? (lastClose - firstClose) / firstClose
      : (firstClose - lastClose) / firstClose;

    return this.buildOutcome(
      prediction,
      directionCorrect,
      target1Hit,
      target2Hit,
      invalidationHit,
      entryRespected,
      actualReturn,
    );
  }

  private buildOutcome(
    prediction: Prediction,
    directionCorrect: boolean,
    target1Hit: boolean,
    target2Hit: boolean,
    invalidationHit: boolean,
    entryRespected: boolean,
    actualReturn: number,
  ): PredictionOutcome {
    // Score: -3 to +11
    let score = 0;
    if (directionCorrect) score += 2;
    if (target1Hit) score += 3;
    if (target2Hit) score += 5;
    if (!invalidationHit) score += 1;
    if (invalidationHit) score -= 3;
    if (entryRespected) score += 1;

    return {
      predictionId: prediction.id,
      directionCorrect,
      target1Hit,
      target2Hit,
      invalidationHit,
      entryRespected,
      actualReturn,
      score,
    };
  }
}
