import { Injectable, computed, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';
import { Card, Suit, Rank } from '../../../../../shared/models';
import {
  SuitProbabilities,
  FlushProbabilities,
  OutsAnalysis,
  OutsCalculationParams,
  ProbabilityAnalysis,
  HypergeometricResult,
  Out
} from './probability.models';
import { calculateHypergeometric, hypergeometricAtLeast } from './probability.utils';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

@Injectable({
  providedIn: 'root'
})
export class ProbabilityService {
  private gameState = inject(GameStateService);

  /**
   * Deck state from game.
   */
  private readonly deckState = computed(() => this.gameState.deck());

  /**
   * Cards remaining in deck (excludes hand).
   */
  readonly remainingCards = computed<Card[]>(() => {
    const deck = this.deckState();
    return deck?.remaining ?? [];
  });

  /**
   * Count of wild cards in remaining deck.
   */
  readonly wildCardCount = computed<number>(() => {
    return this.remainingCards().filter((c) => c.enhancement === 'wild').length;
  });

  /**
   * Count of each suit in remaining deck.
   * Wild cards count for ALL suits.
   */
  readonly suitCounts = computed<Record<Suit, number>>(() => {
    const cards = this.remainingCards();

    const counts: Record<Suit, number> = {
      hearts: 0,
      diamonds: 0,
      clubs: 0,
      spades: 0
    };

    for (const card of cards) {
      if (card.enhancement === 'wild') {
        // Wild cards count for ALL suits
        counts.hearts++;
        counts.diamonds++;
        counts.clubs++;
        counts.spades++;
      } else {
        counts[card.suit]++;
      }
    }

    return counts;
  });

  /**
   * Count of each rank in remaining deck.
   */
  readonly rankCounts = computed<Map<Rank, number>>(() => {
    const cards = this.remainingCards();
    const counts = new Map<Rank, number>();

    for (const card of cards) {
      counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
    }

    return counts;
  });

  /**
   * Probability of drawing at least one of each suit in the next draw.
   */
  readonly suitProbabilities = computed<SuitProbabilities>(() => {
    const deck = this.deckState();
    if (!deck || deck.cardsRemaining === 0) {
      return { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
    }

    const total = deck.cardsRemaining;
    const counts = this.suitCounts();

    return {
      hearts: Math.min(1, counts.hearts / total),
      diamonds: Math.min(1, counts.diamonds / total),
      clubs: Math.min(1, counts.clubs / total),
      spades: Math.min(1, counts.spades / total)
    };
  });

  /**
   * Flush completion probabilities based on current hand.
   */
  readonly flushProbabilities = computed<FlushProbabilities>(() => {
    const deck = this.deckState();
    const hand = deck?.hand ?? [];

    if (!deck) {
      return {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0,
        bestSuit: null,
        bestProbability: 0
      };
    }

    // Count suits in hand (including wilds)
    const handSuitCounts = this.countSuitsInCards(hand);
    const results: Record<Suit, number> = {
      hearts: 0,
      diamonds: 0,
      clubs: 0,
      spades: 0
    };

    for (const suit of SUITS) {
      const inHand = handSuitCounts[suit];
      const needed = Math.max(0, 5 - inHand);

      if (needed === 0) {
        results[suit] = 1; // Already have flush
      } else if (deck.cardsRemaining > 0) {
        const remaining = deck.cardsRemaining;
        const available = this.suitCounts()[suit];
        const draws = Math.max(0, 5 - hand.length); // Cards still to draw

        if (draws >= needed && available >= needed) {
          results[suit] = hypergeometricAtLeast(remaining, available, draws, needed);
        }
      }
    }

    // Find best suit
    let bestSuit: Suit | null = null;
    let bestProbability = 0;
    for (const suit of SUITS) {
      if (results[suit] > bestProbability) {
        bestProbability = results[suit];
        bestSuit = suit;
      }
    }

    return {
      ...results,
      bestSuit,
      bestProbability
    };
  });

  /**
   * Complete probability analysis for current game state.
   */
  readonly analysis = computed<ProbabilityAnalysis | null>(() => {
    const deck = this.deckState();
    if (!deck) return null;

    return {
      deckSize: deck.totalCards,
      cardsRemaining: deck.cardsRemaining,
      suitProbabilities: this.suitProbabilities(),
      flushOdds: this.flushProbabilities(),
      rankDistribution: this.rankCounts(),
      wildCardCount: this.wildCardCount()
    };
  });

  /**
   * Calculate outs for completing a specific hand.
   */
  calculateOuts(params: OutsCalculationParams): OutsAnalysis {
    const deck = this.deckState();
    if (!deck || deck.cardsRemaining === 0) {
      return {
        outs: [],
        outsCount: 0,
        drawOneOutProbability: 0,
        drawWithMultipleChances: 0,
        effectiveOuts: 0
      };
    }

    const outs = this.findOuts(params.handCards, params.targetHand, deck.remaining);
    const wildCount = this.wildCardCount();
    // Wild cards that aren't already in outs list
    const additionalWilds = deck.remaining.filter(
      (c) => c.enhancement === 'wild' && !outs.some((o) => o.card.suit === c.suit && o.card.rank === c.rank)
    ).length;
    const effectiveOuts = outs.length + additionalWilds;

    const drawOneProb = deck.cardsRemaining > 0 ? effectiveOuts / deck.cardsRemaining : 0;

    const drawMultipleProb =
      params.drawsRemaining > 0 && deck.cardsRemaining > 0
        ? hypergeometricAtLeast(deck.cardsRemaining, effectiveOuts, Math.min(params.drawsRemaining, deck.cardsRemaining), 1)
        : 0;

    return {
      outs,
      outsCount: outs.length,
      drawOneOutProbability: drawOneProb,
      drawWithMultipleChances: drawMultipleProb,
      effectiveOuts
    };
  }

  /**
   * General hypergeometric calculation for custom scenarios.
   */
  calculateProbability(successCards: number, draws: number, desiredSuccesses: number): HypergeometricResult {
    const deck = this.deckState();
    const totalCards = deck?.cardsRemaining ?? 0;

    if (totalCards === 0) {
      return {
        exactProbability: 0,
        atLeastProbability: 0,
        atMostProbability: 0,
        expectedValue: 0
      };
    }

    return calculateHypergeometric(totalCards, successCards, draws, desiredSuccesses);
  }

  /**
   * Count suits in a set of cards (hand or other).
   * Wild cards count for all suits.
   */
  private countSuitsInCards(cards: Card[]): Record<Suit, number> {
    const counts: Record<Suit, number> = {
      hearts: 0,
      diamonds: 0,
      clubs: 0,
      spades: 0
    };

    for (const card of cards) {
      if (card.enhancement === 'wild') {
        // Wild counts for all suits
        counts.hearts++;
        counts.diamonds++;
        counts.clubs++;
        counts.spades++;
      } else {
        counts[card.suit]++;
      }
    }

    return counts;
  }

  /**
   * Find outs for a specific target hand.
   */
  private findOuts(hand: Card[], targetHand: string, remaining: Card[]): Out[] {
    switch (targetHand) {
      case 'flush':
        return this.findFlushOuts(hand, remaining);
      case 'straight':
        return this.findStraightOuts(hand, remaining);
      case 'pair':
        return this.findPairOuts(hand, remaining);
      case 'three_of_a_kind':
        return this.findThreeOfAKindOuts(hand, remaining);
      case 'full_house':
        return this.findFullHouseOuts(hand, remaining);
      default:
        return [];
    }
  }

  /**
   * Find cards that complete a flush (5 of same suit).
   */
  private findFlushOuts(hand: Card[], remaining: Card[]): Out[] {
    const suitCounts = this.countSuitsInCards(hand);

    // Find suits with 4 cards (need 1 more for flush)
    const flushSuits: Suit[] = [];
    for (const suit of SUITS) {
      if (suitCounts[suit] >= 4) {
        flushSuits.push(suit);
      }
    }

    if (flushSuits.length === 0) {
      return [];
    }

    // Return cards matching any of the flush suits (or wild)
    return remaining
      .filter((c) => flushSuits.includes(c.suit) || c.enhancement === 'wild')
      .map((c) => ({
        card: { suit: c.suit, rank: c.rank },
        completesHand: 'flush'
      }));
  }

  /**
   * Find cards that complete a straight (5 consecutive ranks).
   */
  private findStraightOuts(hand: Card[], remaining: Card[]): Out[] {
    // Get unique rank values in hand
    const handRanks = [...new Set(hand.map((c) => RANK_VALUES[c.rank]))].sort((a, b) => a - b);

    const neededRanks: number[] = [];

    // Check for standard straights (5 consecutive)
    for (let startRank = 2; startRank <= 10; startRank++) {
      const straightRanks = [startRank, startRank + 1, startRank + 2, startRank + 3, startRank + 4];
      const missing = straightRanks.filter((r) => !handRanks.includes(r));

      if (missing.length === 1) {
        neededRanks.push(missing[0]);
      }
    }

    // Check wheel (A-2-3-4-5, where A can be low)
    const wheelRanks = [14, 2, 3, 4, 5]; // A is 14
    const wheelMissing = wheelRanks.filter((r) => !handRanks.includes(r));
    if (wheelMissing.length === 1) {
      neededRanks.push(wheelMissing[0]);
    }

    // Create reverse lookup
    const valueToRank = Object.fromEntries(Object.entries(RANK_VALUES).map(([k, v]) => [v, k as Rank]));

    return remaining
      .filter((c) => neededRanks.includes(RANK_VALUES[c.rank]) || c.enhancement === 'wild')
      .map((c) => ({
        card: { suit: c.suit, rank: c.rank },
        completesHand: 'straight'
      }));
  }

  /**
   * Find cards that make a pair (2 of same rank).
   */
  private findPairOuts(hand: Card[], remaining: Card[]): Out[] {
    const rankCounts = new Map<Rank, number>();
    for (const card of hand) {
      rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1);
    }

    // Find ranks that appear exactly once (need 1 more for pair)
    const singleRanks = [...rankCounts.entries()].filter(([_, count]) => count === 1).map(([rank]) => rank);

    return remaining
      .filter((c) => singleRanks.includes(c.rank) || c.enhancement === 'wild')
      .map((c) => ({
        card: { suit: c.suit, rank: c.rank },
        completesHand: 'pair'
      }));
  }

  /**
   * Find cards that make three of a kind (3 of same rank).
   */
  private findThreeOfAKindOuts(hand: Card[], remaining: Card[]): Out[] {
    const rankCounts = new Map<Rank, number>();
    for (const card of hand) {
      rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1);
    }

    // Find ranks with exactly 2 (need 1 more for three of a kind)
    const pairRanks = [...rankCounts.entries()].filter(([_, count]) => count === 2).map(([rank]) => rank);

    return remaining
      .filter((c) => pairRanks.includes(c.rank) || c.enhancement === 'wild')
      .map((c) => ({
        card: { suit: c.suit, rank: c.rank },
        completesHand: 'three_of_a_kind'
      }));
  }

  /**
   * Find cards that complete a full house (3 of one rank + 2 of another).
   */
  private findFullHouseOuts(hand: Card[], remaining: Card[]): Out[] {
    const rankCounts = new Map<Rank, number>();
    for (const card of hand) {
      rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1);
    }

    const counts = [...rankCounts.values()];
    const hasTriplet = counts.includes(3);
    const hasPair = counts.includes(2);

    const outs: Out[] = [];

    if (hasTriplet && !hasPair) {
      // Need to make a pair from singles
      const singleRanks = [...rankCounts.entries()].filter(([_, count]) => count === 1).map(([rank]) => rank);

      for (const card of remaining) {
        if (singleRanks.includes(card.rank) || card.enhancement === 'wild') {
          outs.push({
            card: { suit: card.suit, rank: card.rank },
            completesHand: 'full_house'
          });
        }
      }
    } else if (hasPair && !hasTriplet) {
      // Need to upgrade a pair to triplet
      const pairRanks = [...rankCounts.entries()].filter(([_, count]) => count === 2).map(([rank]) => rank);

      for (const card of remaining) {
        if (pairRanks.includes(card.rank) || card.enhancement === 'wild') {
          outs.push({
            card: { suit: card.suit, rank: card.rank },
            completesHand: 'full_house'
          });
        }
      }
    }

    return outs;
  }
}
