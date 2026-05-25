export class QualityGateOrchestrator {
  buildGates(hasPackageJson: boolean, hasTsConfig: boolean, complexity: string) {
    return [];
  }
}
export const qualityGates = new QualityGateOrchestrator();
