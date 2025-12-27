/**
 * Joker synergy data structures for Strategy Intelligence Engine
 */

import { Suit, Rank, Enhancement } from './card.model';
import { StrategyType, SynergyStrength } from './strategy.model';

/**
 * Synergy relationship between jokers
 */
export interface JokerSynergyRelation {
  jokerId: string;
  strength: SynergyStrength;
  reason: string;
}

/**
 * Strategy affinity for a joker
 */
export interface StrategyAffinity {
  strategy: StrategyType;
  affinity: number;  // 0-100
}

/**
 * Complete joker synergy data
 */
export interface JokerSynergy {
  id: string;                    // e.g., "j_lusty_joker"
  name: string;

  // Tier rating from strategy guide
  tier?: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  basePriority?: number;         // Base shop priority (0-100)
  earlyGameBonus?: number;       // Bonus priority at Ante 1-2
  lateGamePenalty?: number;      // Penalty at Ante 6+

  // Direct synergies with other jokers
  synergiesWith: JokerSynergyRelation[];

  // Strategy affinities
  strategies: StrategyAffinity[];

  // Card preferences
  wantsSuits?: Suit[];
  wantsRanks?: Rank[];
  wantsEnhancements?: Enhancement[];

  // Scaling info
  isScaling: boolean;
  scalingType?: 'additive' | 'multiplicative' | 'exponential';
  scalingCap?: number;

  // Economy
  generatesMoney: boolean;
  costEfficiency: number;  // Value relative to price (0-100)

  // Tags for flexible matching
  tags: string[];
}

/**
 * Strategy definition for build detection
 */
export interface StrategyDefinition {
  type: StrategyType;
  name: string;
  description: string;

  // Detection criteria
  minSuitConcentration?: number;     // For flush (e.g., 0.4 = 40% one suit)
  requiredRanks?: Rank[];            // For fibonacci, even/odd
  requiredEnhancements?: Enhancement[];
  requiredTags?: string[];           // Joker tags to look for

  // Scoring weights
  jokerWeight: number;    // How much jokers matter (0-1)
  deckWeight: number;     // How much deck composition matters (0-1)
  historyWeight: number;  // How much play history matters (0-1)
}

/**
 * Tier list entry for meta ranking
 */
export interface TierListEntry {
  jokerId: string;
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  notes?: string;
  lastUpdated: string;  // ISO date
}

/**
 * Blind requirement data for scaling calculations
 */
export interface BlindRequirement {
  ante: number;
  smallBlind: number;
  bigBlind: number;
  bossBlind: number;
}
