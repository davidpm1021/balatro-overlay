/**
 * Strategy Intelligence Feature
 *
 * Provides intelligent game analysis and recommendations:
 * - Build detection based on owned jokers
 * - Joker synergy analysis
 * - Shop item scoring and recommendations
 */

// Services
export { SynergyGraphService } from './services/synergy-graph.service';
export { BuildDetectorService } from './services/build-detector.service';
export { ShopAdvisorService, ScoredShopItem, ScoreBreakdown } from './services/shop-advisor.service';

// Components
export { ShopOverlayComponent } from './components/shop-overlay.component';

// Re-export relevant types from shared
export type {
  JokerSynergy,
  JokerSynergyRelation,
  StrategyAffinity,
  StrategyDefinition,
} from '../../../../../shared/models/synergy.model';
