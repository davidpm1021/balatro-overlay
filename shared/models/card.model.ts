/**
 * Card-related type definitions for Balatro Overlay
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/**
 * Starting deck types available in Balatro
 */
export type DeckType =
  | 'red'        // +1 discard
  | 'blue'       // +1 hand per round
  | 'yellow'     // +$10 starting money
  | 'green'      // No interest, +$1 per hand/discard remaining at end of round
  | 'black'      // +1 joker slot, -1 hand per round
  | 'magic'      // Starts with Crystal Ball voucher + Ectoplasm
  | 'nebula'     // Starts with Telescope voucher, -1 consumable slot
  | 'ghost'      // Starts with Hex spectral, spectral cards appear more often
  | 'abandoned'  // No face cards (J, Q, K)
  | 'checkered'  // Only 2 suits (spades/hearts)
  | 'zodiac'     // Starts with Tarot Merchant, Planet Merchant, Overstock vouchers
  | 'painted'    // +2 hand size, -1 joker slot
  | 'anaglyph'   // Double tag after every boss blind
  | 'plasma'     // Chips and mult merge (balanced)
  | 'erratic'    // All ranks and suits randomized
  | 'challenge'; // Challenge deck (custom rules)

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export type Enhancement =
  | 'none'
  | 'bonus'
  | 'mult'
  | 'wild'
  | 'glass'
  | 'steel'
  | 'stone'
  | 'gold'
  | 'lucky';

export type Edition = 'none' | 'foil' | 'holographic' | 'polychrome' | 'negative';

export type Seal = 'none' | 'gold' | 'red' | 'blue' | 'purple';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  enhancement: Enhancement;
  edition: Edition;
  seal: Seal;

  // Computed chip value (base + modifiers)
  chipValue: number;

  // True when card is selected/highlighted in Balatro
  highlighted?: boolean;

  // Card states
  debuffed: boolean;
  faceDown: boolean;
}

export interface DeckComposition {
  bySuit: Record<Suit, number>;
  byRank: Record<Rank, number>;
  enhancements: Record<Enhancement | 'none', number>;
  editions: Record<Edition | 'none', number>;
  seals: Record<Seal | 'none', number>;
}

export interface DeckState {
  remaining: Card[];
  hand: Card[];
  discarded: Card[];
  played: Card[];  // Cards currently in play area

  // IDs of currently selected (highlighted) cards in hand
  selected: string[];

  // Counts for quick access
  totalCards: number;
  cardsRemaining: number;

  // Composition summary for probability calculations
  composition: DeckComposition;
}
