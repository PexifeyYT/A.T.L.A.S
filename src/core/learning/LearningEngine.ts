import { PredictionOutcome, Prediction } from '@core/types';

/**
 * Learning Engine - Updates module weights based on prediction outcomes
 * Self-improvement loop: continuously learns which strategies perform best
 */
export class LearningEngine {
  private moduleWeights: Map<string, number> = new Map();
  private readonly learningRate = 0.05;
  private readonly minWeight = 0.1;
  private readonly maxWeight = 2.0;

  initializeWeights(moduleNames: string[], initialWeights: Map<string, number>): void {
    for (const moduleName of moduleNames) {
      this.moduleWeights.set(
        moduleName,
        initialWeights.get(moduleName) || 1.0,
      );
    }
  }

  updateWeight(moduleName: string, outcome: PredictionOutcome): void {
    const currentWeight = this.moduleWeights.get(moduleName) || 1.0;

    // Calculate reward: -1 to +1 based on outcome
    const reward = this.calculateReward(outcome);

    // Update weight: w_new = w_old + (learning_rate * reward)
    const newWeight = currentWeight + this.learningRate * reward;

    // Clamp weight between min and max
    const clampedWeight = Math.max(
      this.minWeight,
      Math.min(newWeight, this.maxWeight),
    );

    this.moduleWeights.set(moduleName, clampedWeight);
  }

  getWeight(moduleName: string): number {
    return this.moduleWeights.get(moduleName) || 1.0;
  }

  getAllWeights(): Map<string, number> {
    return new Map(this.moduleWeights);
  }

  private calculateReward(outcome: PredictionOutcome): number {
    let score = 0;

    // Direction correct: +0.5
    if (outcome.directionCorrect) score += 0.5;
    else score -= 0.5;

    // Target 1 hit: +0.2
    if (outcome.target1Hit) score += 0.2;

    // Target 2 hit: +0.3
    if (outcome.target2Hit) score += 0.3;

    // Invalidation hit (early exit): -0.2
    if (outcome.invalidationHit) score -= 0.2;

    // Entry respected: +0.1
    if (outcome.entryRespected) score += 0.1;

    return Math.max(-1, Math.min(1, score));
  }
}
