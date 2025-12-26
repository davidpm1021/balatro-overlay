/**
 * Card-related type definitions for Balatro Overlay
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

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

  // Card states
  debuffed: boolean;
  faceDown: boolean;
}

export interface DeckState {
  remaining: Card[];
  hand: Card[];
  discarded: Card[];
  played: Card[];  // Cards currently in play area

  // Counts for quick access
  totalCards: number;
  cardsRemaining: number;
}
