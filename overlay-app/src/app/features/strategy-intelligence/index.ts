/**
 * Strategy Intelligence Feature
 *
 * Provides intelligent game analysis and recommendations:
 * - Build detection based on owned jokers
 * - Joker synergy analysis
 * - Shop item scoring and recommendations
 * - Scaling projections and warnings
 */

// Services
export * from './services';

// Components
export * from './components';

// Re-export relevant types from shared
export type {
  JokerSynergy,
  JokerSynergyRelation,
  StrategyAffinity,
  StrategyDefinition,
} from '../../../../../shared/models/synergy.model';
