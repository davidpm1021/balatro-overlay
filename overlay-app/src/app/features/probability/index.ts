/**
 * Probability calculator feature module exports.
 */

// Service
export { ProbabilityService } from './probability.service';

// Models
export {
  HypergeometricResult,
  SuitProbabilities,
  FlushProbabilities,
  Out,
  OutsAnalysis,
  OutsCalculationParams,
  ProbabilityAnalysis
} from './probability.models';

// Utilities (for direct use if needed)
export {
  binomialCoefficient,
  hypergeometricPMF,
  hypergeometricCDF,
  hypergeometricAtLeast,
  hypergeometricExpectedValue,
  calculateHypergeometric
} from './probability.utils';
