/**
 * Type definitions for probability calculations.
 */

import { Suit, Rank, Card } from '../../../../../shared/models';

/**
 * Result of a hypergeometric probability calculation.
 */
export interface HypergeometricResult {
  /** P(X = k) - probability of exactly k successes */
  exactProbability: number;

  /** P(X >= k) - probability of at least k successes */
  atLeastProbability: number;

  /** P(X <= k) - probability of at most k successes */
  atMostProbability: number;

  /** Expected value E[X] - expected number of successes */
  expectedValue: number;
}

/**
 * Probability of drawing specific suits in next draw.
 */
export interface SuitProbabilities {
  hearts: number;
  diamonds: number;
  clubs: number;
  spades: number;
}

/**
 * Probability for each suit to complete a flush (5 of same suit).
 */
export interface FlushProbabilities extends SuitProbabilities {
  /** Best suit to pursue for flush */
  bestSuit: Suit | null;

  /** Probability of best suit completing flush */
  bestProbability: number;
}

/**
 * An "out" is a card that completes a hand.
 */
export interface Out {
  /** Card suit and rank that would complete the hand */
  card: Pick<Card, 'suit' | 'rank'>;

  /** Type of hand this card completes */
  completesHand: string;
}

/**
 * Complete outs analysis for a target hand.
 */
export interface OutsAnalysis {
  /** List of cards that would complete the target hand */
  outs: Out[];

  /** Number of outs remaining in deck (not counting wilds) */
  outsCount: number;

  /** P(drawing at least 1 out in next single draw) */
  drawOneOutProbability: number;

  /** P(drawing at least 1 out with multiple draws remaining) */
  drawWithMultipleChances: number;

  /** Total outs including wild cards */
  effectiveOuts: number;
}

/**
 * Parameters for outs calculation.
 */
export interface OutsCalculationParams {
  /** Cards currently in hand */
  handCards: Card[];

  /** Target hand type to complete */
  targetHand: 'flush' | 'straight' | 'pair' | 'three_of_a_kind' | 'full_house';

  /** How many more draws available */
  drawsRemaining: number;
}

/**
 * Complete probability analysis for current game state.
 */
export interface ProbabilityAnalysis {
  /** Total cards the deck started with */
  deckSize: number;

  /** Cards remaining to draw */
  cardsRemaining: number;

  /** Suit probabilities for next draw */
  suitProbabilities: SuitProbabilities;

  /** Flush completion probabilities given current hand */
  flushOdds: FlushProbabilities;

  /** Rank distribution in remaining deck */
  rankDistribution: Map<Rank, number>;

  /** Wild card count (affects suit matching) */
  wildCardCount: number;
}
