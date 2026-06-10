import { Prediction, PredictionOutcome } from '@core/types';

/**
 * Prediction Tracker - Records all predictions and outcomes for learning loop
 * Phase 6 foundation: setup for self-improvement system
 */
export class PredictionTracker {
  private predictions: Map<string, Prediction> = new Map();
  private outcomes: Map<string, PredictionOutcome> = new Map();

  recordPrediction(prediction: Prediction): void {
    this.predictions.set(prediction.id, prediction);
  }

  recordOutcome(outcome: PredictionOutcome): void {
    this.outcomes.set(outcome.predictionId, outcome);
  }

  getPrediction(id: string): Prediction | undefined {
    return this.predictions.get(id);
  }

  getOutcome(id: string): PredictionOutcome | undefined {
    return this.outcomes.get(id);
  }

  getAllPredictions(): Prediction[] {
    return Array.from(this.predictions.values());
  }

  getAccuracy(lookback: number = 100): number {
    const recentPredictions = Array.from(this.predictions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, lookback);

    const withOutcomes = recentPredictions.filter((p) =>
      this.outcomes.has(p.id),
    );

    if (withOutcomes.length === 0) return 0;

    const wins = withOutcomes.filter((p) => {
      const outcome = this.outcomes.get(p.id);
      return outcome && outcome.directionCorrect;
    }).length;

    return wins / withOutcomes.length;
  }

  getModuleAccuracy(moduleName: string): number {
    const predictions = Array.from(this.predictions.values())
      .filter((p) => p.modulesAgreed.includes(moduleName));

    if (predictions.length === 0) return 0;

    const wins = predictions.filter((p) => {
      const outcome = this.outcomes.get(p.id);
      return outcome && outcome.directionCorrect;
    }).length;

    return wins / predictions.length;
  }

  clear(): void {
    this.predictions.clear();
    this.outcomes.clear();
  }
}
