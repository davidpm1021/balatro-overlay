/**
 * Joker-related type definitions for Balatro Overlay
 */

import { Edition } from './card.model';

export type JokerRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface JokerState {
  id: string;           // Internal ID (e.g., "j_lusty_joker")
  name: string;         // Display name
  description: string;  // Effect description
  rarity: JokerRarity;
  edition: Edition;

  // Position in joker slots (0-indexed)
  slotIndex: number;

  // Scaling joker values
  isScaling: boolean;
  scalingValue?: number;       // Current accumulated value
  scalingType?: 'additive' | 'multiplicative' | 'exponential';

  // Effect values (varies by joker)
  effectValues: Record<string, number>;

  // Cost for selling
  sellValue: number;
}

export interface JokerData {
  id: string;
  name: string;
  description: string;
  rarity: JokerRarity;
  baseCost: number;
  baseSellValue: number;

  // Effect formula (for UI display)
  effectFormula?: string;
}
