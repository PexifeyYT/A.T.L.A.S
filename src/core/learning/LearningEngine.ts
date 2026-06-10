export class LearningEngine {
  private moduleWeights: Map<string, number> = new Map();

  initializeWeights(moduleNames: string[], initialWeights: Map<string, number>): void {
    for (const moduleName of moduleNames) {
      this.moduleWeights.set(
        moduleName,
        initialWeights.get(moduleName) ?? 1.0,
      );
    }
  }

  getWeight(moduleName: string): number {
    return this.moduleWeights.get(moduleName) || 1.0;
  }

  getAllWeights(): Map<string, number> {
    return new Map(this.moduleWeights);
  }
}
