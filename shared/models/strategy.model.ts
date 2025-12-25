/**
 * Strategy Intelligence Engine type definitions
 */

import { Suit, Rank, Enhancement } from './card.model';

export type StrategyType =
  | 'flush'           // One suit focus
  | 'straight'        // Sequences
  | 'pairs'           // Pair/two-pair/full house focus
  | 'mult_stacking'   // +mult jokers
  | 'xmult_scaling'   // x-mult jokers
  | 'chip_stacking'   // +chips focus
  | 'fibonacci'       // 2,3,5,8,A cards
  | 'even_steven'     // Even cards only
  | 'odd_todd'        // Odd cards only
  | 'face_cards'      // J,Q,K focus
  | 'steel_scaling'   // Steel card multiplication
  | 'glass_cannon'    // Glass card high risk
  | 'retrigger'       // Card retrigger effects
  | 'economy'         // Money generation
  | 'hybrid';         // Mixed approach

export type ScalingHealth = 'strong' | 'adequate' | 'weak' | 'critical';

export type WarningSeverity = 'info' | 'caution' | 'critical';

export type OpportunityType = 'synergy' | 'upgrade' | 'pivot';

export type SynergyStrength = 'strong' | 'medium' | 'weak';

/**
 * Detected strategy from current game state
 */
export interface DetectedStrategy {
  type: StrategyType;
  confidence: number;        // 0-100
  viability: number;         // Can this win? 0-100
  requirements: string[];    // What you need to make it work
  currentStrength: number;   // How built-out is it now (0-100)

  // For suit-specific strategies
  suit?: Suit;

  // For joker-specific strategies
  keyJokers?: string[];
}

/**
 * Warning about potential issues
 */
export interface Warning {
  severity: WarningSeverity;
  message: string;
  action?: string;  // What to do about it
}

/**
 * Opportunity for improvement
 */
export interface Opportunity {
  type: OpportunityType;
  message: string;
  value: number;  // How good is this opportunity (0-100)
}

/**
 * Shop item recommendation
 */
export interface ShopRecommendation {
  itemId: string;
  itemName: string;
  score: number;           // 0-100, how good for YOUR run
  reason: string;          // "Synergizes with Lusty Joker"
  isPriority: boolean;     // "Buy this!"
  synergyWith?: string[];  // Which of your jokers it combos with
}

/**
 * Joker recommendation for what to look for
 */
export interface JokerRecommendation {
  jokerId: string;
  jokerName: string;
  reason: string;
  priority: number;  // 0-100
}

/**
 * Complete strategy analysis output
 */
export interface StrategyAnalysis {
  // What the engine detected
  detected: DetectedStrategy[];
  primary: DetectedStrategy;           // Strongest current build

  // Recommendations
  shopPriority: ShopRecommendation[];  // What to buy
  jokersToFind: JokerRecommendation[]; // What to look for
  cardsToKeep: string[];               // Card IDs to protect
  cardsToTrash: string[];              // Safe to remove

  // Projections
  currentMaxScore: number;             // Best possible hand now
  projectedAnte: number;               // How far can this build go
  scalingHealth: ScalingHealth;

  // Warnings and opportunities
  warnings: Warning[];
  opportunities: Opportunity[];
}
