import { Prediction, PredictionOutcome } from '../types';

interface PatternCandidate {
  moduleCombination: string[];
  accuracy: number;
  sampleCount: number;
  description: string;
}

/**
 * PatternDiscovery - Finds new patterns from winning predictions
 * Runs after every 50 scored predictions to discover emerging patterns
 */
export class PatternDiscovery {
  private readonly MIN_ACCURACY = 0.70;
  private readonly MIN_SAMPLES = 10;

  discover(
    predictions: Prediction[],
    outcomes: Map<string, PredictionOutcome>,
  ): PatternCandidate[] {
    const winners = predictions.filter((p) => {
      const outcome = outcomes.get(p.id);
      return outcome && outcome.score >= 8;
    });

    if (winners.length < this.MIN_SAMPLES) {
      return [];
    }

    // Find frequent module combinations in winners
    const combinations = this.findFrequentCombinations(winners);
    const discovered: PatternCandidate[] = [];

    for (const [combo, winPredictions] of combinations.entries()) {
      if (winPredictions.length < this.MIN_SAMPLES) continue;

      // Check accuracy of this combo across all predictions
      const allWithCombo = predictions.filter((p) =>
        this.hasAllModules(p.modulesAgreed, combo.split(',')),
      );

      if (allWithCombo.length < this.MIN_SAMPLES) continue;

      const comboWins = allWithCombo.filter((p) => {
        const outcome = outcomes.get(p.id);
        return outcome && outcome.directionCorrect;
      }).length;

      const accuracy = comboWins / allWithCombo.length;

      if (accuracy >= this.MIN_ACCURACY) {
        discovered.push({
          moduleCombination: combo.split(','),
          accuracy,
          sampleCount: allWithCombo.length,
          description: `${combo.split(',').join(' + ')} confluence → ${(accuracy * 100).toFixed(1)}% win rate`,
        });
      }
    }

    return discovered.sort((a, b) => b.accuracy - a.accuracy);
  }

  private findFrequentCombinations(winners: Prediction[]): Map<string, Prediction[]> {
    const combos = new Map<string, Prediction[]>();

    // Check pairs of modules
    for (const pred of winners) {
      const modules = [...pred.modulesAgreed].sort();

      // Single modules
      for (const mod of modules) {
        const key = mod;
        if (!combos.has(key)) combos.set(key, []);
        combos.get(key)!.push(pred);
      }

      // Pairs
      for (let i = 0; i < modules.length; i++) {
        for (let j = i + 1; j < modules.length; j++) {
          const key = `${modules[i]},${modules[j]}`;
          if (!combos.has(key)) combos.set(key, []);
          combos.get(key)!.push(pred);
        }
      }

      // Triples
      for (let i = 0; i < modules.length; i++) {
        for (let j = i + 1; j < modules.length; j++) {
          for (let k = j + 1; k < modules.length; k++) {
            const key = `${modules[i]},${modules[j]},${modules[k]}`;
            if (!combos.has(key)) combos.set(key, []);
            combos.get(key)!.push(pred);
          }
        }
      }
    }

    return combos;
  }

  private hasAllModules(modules: string[], required: string[]): boolean {
    return required.every((r) => modules.includes(r));
  }
}
