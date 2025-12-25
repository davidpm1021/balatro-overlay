/**
 * Core game state type definitions for Balatro Overlay
 * This is the main interface exported by the Lua bridge mod
 */

import { Card, DeckState, Suit, Rank, Edition } from './card.model';
import { JokerState, JokerRarity } from './joker.model';

export type GamePhase =
  | 'menu'
  | 'blind_select'
  | 'playing'
  | 'scoring'
  | 'shop'
  | 'booster'
  | 'game_over'
  | 'victory';

export type BlindType = 'small' | 'big' | 'boss';

export type HandType =
  | 'high_card'
  | 'pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush'
  | 'five_of_a_kind'
  | 'flush_house'
  | 'flush_five';

export interface BlindState {
  type: BlindType;
  name: string;           // e.g., "The Psychic", "Small Blind"
  chipGoal: number;       // Chips needed to beat
  chipsScored: number;    // Current progress
  effect?: string;        // Boss blind effect description
  isBoss: boolean;
}

export interface ProgressState {
  ante: number;           // Current ante (1-8)
  round: number;          // Current round within ante
  phase: GamePhase;
  handsRemaining: number;
  discardsRemaining: number;
  money: number;
  runSeed?: string;       // For run tracking
}

export interface HandLevel {
  handType: HandType;
  level: number;
  baseChips: number;
  baseMult: number;
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'joker' | 'tarot' | 'planet' | 'spectral' | 'voucher' | 'booster';
  cost: number;
  sold: boolean;
}

export interface ShopState {
  items: ShopItem[];
  rerollCost: number;
  rerollsUsed: number;
}

export type BoosterPackType =
  | 'standard'
  | 'arcana'
  | 'celestial'
  | 'spectral'
  | 'buffoon';

export interface BoosterCardBase {
  type: string;
  id: string;
  name: string;
  edition?: Edition;
}

export interface BoosterPlayingCard extends BoosterCardBase {
  type: 'card';
  suit: Suit;
  rank: Rank;
  enhancement: string;
  seal: string;
  chipValue: number;
}

export interface BoosterJokerCard extends BoosterCardBase {
  type: 'joker';
  rarity: JokerRarity;
}

export interface BoosterConsumableCard extends BoosterCardBase {
  type: 'tarot' | 'planet' | 'spectral';
}

export type BoosterCard = BoosterPlayingCard | BoosterJokerCard | BoosterConsumableCard;

export interface BoosterState {
  packType: BoosterPackType;
  cards: BoosterCard[];
  selectLimit: number;  // How many cards can be selected
}

export interface ConsumableState {
  tarots: { id: string; name: string }[];
  planets: { id: string; name: string }[];
  spectrals: { id: string; name: string }[];
}

export interface VoucherState {
  owned: string[];  // Voucher IDs
}

/**
 * Complete game state exported by the Lua bridge mod
 * Updated every 100ms when game is active
 */
export interface OverlayGameState {
  // Metadata
  timestamp: number;      // Unix timestamp of export
  version: string;        // Mod version for compatibility

  // Core state
  deck: DeckState;
  jokers: JokerState[];
  progress: ProgressState;
  blind: BlindState;

  // Secondary state
  handLevels: HandLevel[];
  consumables: ConsumableState;
  vouchers: VoucherState;

  // Shop (only populated during shop phase)
  shop?: ShopState;

  // Booster pack (only populated when opening packs)
  booster?: BoosterState;

  // Hand history for strategy detection
  handHistory: PlayedHand[];
}

export interface PlayedHand {
  cards: Card[];
  handType: HandType;
  baseScore: number;
  finalScore: number;
  timestamp: number;
}

/**
 * Calculated score breakdown for display
 */
export interface ScoreBreakdown {
  handType: HandType;
  handLevel: number;

  // Base values from hand
  baseChips: number;
  baseMult: number;

  // Card contributions
  cardChips: number;

  // Joker effects (applied in order)
  jokerEffects: JokerEffect[];

  // Totals
  totalChips: number;
  totalMult: number;
  finalScore: number;

  // Comparison to blind
  blindGoal: number;
  willBeat: boolean;
  margin: number;  // Positive = excess, negative = shortfall
}

export interface JokerEffect {
  jokerId: string;
  jokerName: string;
  effectType: 'chips' | 'mult' | 'xmult';
  value: number;
  condition?: string;  // Why it triggered
}
