/**
 * Synergy Display models for Spec 007
 */

import { StrategyType, SynergyStrength } from './strategy.model';

/**
 * Type of synergy grouping
 */
export type SynergyGroupType =
  | 'direct'    // Jokers with explicit synergiesWith relationships
  | 'strategy'  // Jokers sharing high affinity for same strategy
  | 'orphan';   // Jokers with no connections

/**
 * A group of jokers that synergize together
 */
export interface SynergyGroup {
  id: string;                          // Unique group identifier
  type: SynergyGroupType;              // How jokers are grouped
  label: string;                       // Display label (e.g., "Flush Synergy")
  explanation: string;                 // Always-visible explanation text
  jokerIds: string[];                  // Joker IDs in this group
  strength: SynergyStrength | null;    // Overall group strength (null for orphans)
  strategyType?: StrategyType;         // If grouped by strategy
}

/**
 * A synergy connection between two jokers
 */
export interface SynergyConnection {
  jokerA: string;
  jokerB: string;
  strength: SynergyStrength;
  reason: string;
}

/**
 * A cluster of directly connected jokers
 */
export interface DirectCluster {
  jokerIds: string[];
  connections: SynergyConnection[];
  strongestStrength: SynergyStrength;
  sharedStrategies: StrategyType[];
}
