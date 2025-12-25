import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ProbabilityService } from './probability.service';
import { GameStateService } from '../../core/services/game-state.service';
import { Card, DeckState, Suit, Rank, Enhancement } from '../../../../../shared/models';

/**
 * Helper to create test cards with defaults.
 */
function createCard(
  suit: Suit,
  rank: Rank,
  enhancement: Enhancement = 'none'
): Card {
  return {
    id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 6)}`,
    suit,
    rank,
    enhancement,
    edition: 'none',
    seal: 'none',
    chipValue: 0
  };
}

/**
 * Helper to create a test deck state.
 */
function createTestDeck(remaining: Card[], hand: Card[] = []): DeckState {
  return {
    remaining,
    hand,
    discarded: [],
    played: [],
    totalCards: remaining.length + hand.length,
    cardsRemaining: remaining.length
  };
}

describe('ProbabilityService', () => {
  let service: ProbabilityService;
  let deckSignal: WritableSignal<DeckState | null>;

  beforeEach(() => {
    deckSignal = signal<DeckState | null>(null);

    const mockGameState = {
      deck: deckSignal.asReadonly()
    };

    TestBed.configureTestingModule({
      providers: [
        ProbabilityService,
        { provide: GameStateService, useValue: mockGameState }
      ]
    });

    service = TestBed.inject(ProbabilityService);
  });

  describe('remainingCards', () => {
    it('should return empty array when deck is null', () => {
      expect(service.remainingCards()).toEqual([]);
    });

    it('should return remaining cards from deck', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('spades', 'K')
      ];
      deckSignal.set(createTestDeck(cards));

      expect(service.remainingCards()).toEqual(cards);
      expect(service.remainingCards().length).toBe(2);
    });
  });

  describe('wildCardCount', () => {
    it('should return 0 when deck is null', () => {
      expect(service.wildCardCount()).toBe(0);
    });

    it('should count wild cards in remaining deck', () => {
      const cards = [
        createCard('hearts', 'A', 'wild'),
        createCard('spades', 'K'),
        createCard('diamonds', 'Q', 'wild')
      ];
      deckSignal.set(createTestDeck(cards));

      expect(service.wildCardCount()).toBe(2);
    });

    it('should return 0 when no wild cards', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('spades', 'K')
      ];
      deckSignal.set(createTestDeck(cards));

      expect(service.wildCardCount()).toBe(0);
    });
  });

  describe('suitCounts', () => {
    it('should return zeros when deck is null', () => {
      const counts = service.suitCounts();
      expect(counts.hearts).toBe(0);
      expect(counts.diamonds).toBe(0);
      expect(counts.clubs).toBe(0);
      expect(counts.spades).toBe(0);
    });

    it('should count cards by suit', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('spades', 'Q'),
        createCard('diamonds', 'J')
      ];
      deckSignal.set(createTestDeck(cards));

      const counts = service.suitCounts();
      expect(counts.hearts).toBe(2);
      expect(counts.spades).toBe(1);
      expect(counts.diamonds).toBe(1);
      expect(counts.clubs).toBe(0);
    });

    it('should count wild cards for all suits', () => {
      const cards = [
        createCard('hearts', 'A', 'wild'),
        createCard('spades', 'K')
      ];
      deckSignal.set(createTestDeck(cards));

      const counts = service.suitCounts();
      // Wild cards count for ALL suits, regular cards count for their own suit
      // Wild (hearts base): counts for hearts, diamonds, clubs, spades (1 each)
      // K of spades: counts for spades only
      // Result: hearts=1, diamonds=1, clubs=1, spades=2
      expect(counts.hearts).toBe(1);
      expect(counts.spades).toBe(2);
      expect(counts.diamonds).toBe(1);
      expect(counts.clubs).toBe(1);
    });
  });

  describe('suitProbabilities', () => {
    it('should return 0 for all suits when deck is null', () => {
      const probs = service.suitProbabilities();
      expect(probs.hearts).toBe(0);
      expect(probs.spades).toBe(0);
      expect(probs.diamonds).toBe(0);
      expect(probs.clubs).toBe(0);
    });

    it('should return 0 for all suits when deck is empty', () => {
      deckSignal.set(createTestDeck([]));

      const probs = service.suitProbabilities();
      expect(probs.hearts).toBe(0);
      expect(probs.spades).toBe(0);
      expect(probs.diamonds).toBe(0);
      expect(probs.clubs).toBe(0);
    });

    it('should calculate suit draw probabilities', () => {
      // 4 cards: 2 hearts, 1 spade, 1 diamond
      const cards = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('spades', 'Q'),
        createCard('diamonds', 'J')
      ];
      deckSignal.set(createTestDeck(cards));

      const probs = service.suitProbabilities();
      expect(probs.hearts).toBe(0.5);
      expect(probs.spades).toBe(0.25);
      expect(probs.diamonds).toBe(0.25);
      expect(probs.clubs).toBe(0);
    });

    it('should handle wild cards in probability calculation', () => {
      // 2 cards: 1 wild (counts for all suits), 1 heart
      const cards = [
        createCard('hearts', 'A', 'wild'),
        createCard('hearts', 'K')
      ];
      deckSignal.set(createTestDeck(cards));

      const probs = service.suitProbabilities();
      // hearts: both cards count (wild + heart) = 2/2 = 1.0
      // others: only wild counts = 1/2 = 0.5
      expect(probs.hearts).toBe(1);
      expect(probs.spades).toBe(0.5);
      expect(probs.diamonds).toBe(0.5);
      expect(probs.clubs).toBe(0.5);
    });
  });

  describe('flushProbabilities', () => {
    it('should return zeros when deck is null', () => {
      const probs = service.flushProbabilities();
      expect(probs.bestSuit).toBeNull();
      expect(probs.bestProbability).toBe(0);
    });

    it('should identify best suit for flush', () => {
      // Hand has 4 hearts, deck has hearts remaining
      const hand = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('hearts', 'Q'),
        createCard('hearts', 'J')
      ];
      const remaining = [
        createCard('hearts', '10'),
        createCard('hearts', '9'),
        createCard('spades', 'A')
      ];
      deckSignal.set(createTestDeck(remaining, hand));

      const probs = service.flushProbabilities();
      expect(probs.bestSuit).toBe('hearts');
      expect(probs.bestProbability).toBeGreaterThan(0);
    });

    it('should return probability 1 when flush already in hand', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('hearts', 'Q'),
        createCard('hearts', 'J'),
        createCard('hearts', '10')
      ];
      deckSignal.set(createTestDeck([], hand));

      const probs = service.flushProbabilities();
      expect(probs.hearts).toBe(1);
    });

    it('should account for wild cards in hand for flush', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('hearts', 'Q'),
        createCard('spades', 'J', 'wild') // Wild counts as heart
      ];
      const remaining = [
        createCard('hearts', '10'),
        createCard('clubs', '2')
      ];
      deckSignal.set(createTestDeck(remaining, hand));

      const probs = service.flushProbabilities();
      // 4 hearts equivalent in hand, need 1 more, deck has 1 heart out of 2
      expect(probs.hearts).toBeGreaterThan(0);
    });
  });

  describe('calculateOuts', () => {
    it('should return empty outs when deck is null', () => {
      const result = service.calculateOuts({
        handCards: [],
        targetHand: 'flush',
        drawsRemaining: 1
      });

      expect(result.outsCount).toBe(0);
      expect(result.outs).toEqual([]);
      expect(result.drawOneOutProbability).toBe(0);
    });

    it('should find flush outs when 4 of a suit in hand', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('hearts', 'Q'),
        createCard('hearts', 'J')
      ];
      const remaining = [
        createCard('hearts', '10'),
        createCard('hearts', '9'),
        createCard('spades', 'A')
      ];
      deckSignal.set(createTestDeck(remaining, hand));

      const result = service.calculateOuts({
        handCards: hand,
        targetHand: 'flush',
        drawsRemaining: 1
      });

      expect(result.outsCount).toBe(2); // 10 of hearts, 9 of hearts
      expect(result.drawOneOutProbability).toBeCloseTo(2 / 3, 2);
    });

    it('should include wild cards as outs', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('hearts', 'Q'),
        createCard('hearts', 'J')
      ];
      const remaining = [
        createCard('spades', '10', 'wild'),
        createCard('spades', 'A')
      ];
      deckSignal.set(createTestDeck(remaining, hand));

      const result = service.calculateOuts({
        handCards: hand,
        targetHand: 'flush',
        drawsRemaining: 1
      });

      // The wild card counts as an out
      expect(result.effectiveOuts).toBeGreaterThanOrEqual(1);
    });

    it('should return 0 outs when less than 4 of a suit', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('spades', 'Q'),
        createCard('diamonds', 'J')
      ];
      const remaining = [
        createCard('hearts', '10'),
        createCard('clubs', '2')
      ];
      deckSignal.set(createTestDeck(remaining, hand));

      const result = service.calculateOuts({
        handCards: hand,
        targetHand: 'flush',
        drawsRemaining: 1
      });

      // Only 2 hearts in hand, need 3 more for flush - too many
      expect(result.outsCount).toBe(0);
    });

    it('should calculate pair outs correctly', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('spades', 'K'),
        createCard('clubs', 'Q'),
        createCard('diamonds', 'J')
      ];
      const remaining = [
        createCard('diamonds', 'A'),
        createCard('clubs', 'K'),
        createCard('hearts', '2')
      ];
      deckSignal.set(createTestDeck(remaining, hand));

      const result = service.calculateOuts({
        handCards: hand,
        targetHand: 'pair',
        drawsRemaining: 1
      });

      // Outs: A of diamonds, K of clubs (match ranks in hand)
      expect(result.outsCount).toBe(2);
    });

    it('should calculate three of a kind outs from a pair', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('spades', 'A'),
        createCard('clubs', 'Q'),
        createCard('diamonds', 'J')
      ];
      const remaining = [
        createCard('diamonds', 'A'),
        createCard('clubs', 'A'),
        createCard('hearts', '2')
      ];
      deckSignal.set(createTestDeck(remaining, hand));

      const result = service.calculateOuts({
        handCards: hand,
        targetHand: 'three_of_a_kind',
        drawsRemaining: 1
      });

      // Outs: any remaining Ace (2 aces left)
      expect(result.outsCount).toBe(2);
    });

    it('should calculate outs with multiple draws remaining', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('hearts', 'Q'),
        createCard('hearts', 'J')
      ];
      const remaining = [
        createCard('hearts', '10'),
        createCard('spades', 'A'),
        createCard('spades', 'K'),
        createCard('spades', 'Q')
      ];
      deckSignal.set(createTestDeck(remaining, hand));

      const result = service.calculateOuts({
        handCards: hand,
        targetHand: 'flush',
        drawsRemaining: 3
      });

      // 1 heart out of 4 remaining, 3 draws
      // P(at least 1) = 1 - P(0 in 3 draws) = 1 - C(3,0)*C(1,3)/C(4,3)
      expect(result.drawWithMultipleChances).toBeGreaterThan(result.drawOneOutProbability);
    });
  });

  describe('calculateProbability', () => {
    it('should return zeros when deck is null', () => {
      const result = service.calculateProbability(10, 5, 2);

      expect(result.exactProbability).toBe(0);
      expect(result.expectedValue).toBe(0);
    });

    it('should calculate custom hypergeometric probability', () => {
      const cards = Array(44)
        .fill(null)
        .map(() => createCard('hearts', '2'));
      deckSignal.set(createTestDeck(cards));

      const result = service.calculateProbability(10, 5, 2);

      expect(result.exactProbability).toBeGreaterThan(0);
      expect(result.atLeastProbability).toBeGreaterThan(0);
      expect(result.expectedValue).toBeGreaterThan(0);
    });
  });

  describe('analysis computed', () => {
    it('should return null when no deck state', () => {
      expect(service.analysis()).toBeNull();
    });

    it('should return complete analysis when deck available', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('spades', 'K')
      ];
      deckSignal.set(createTestDeck(cards));

      const analysis = service.analysis();
      expect(analysis).not.toBeNull();
      expect(analysis?.deckSize).toBe(2);
      expect(analysis?.cardsRemaining).toBe(2);
      expect(analysis?.suitProbabilities).toBeDefined();
      expect(analysis?.flushOdds).toBeDefined();
      expect(analysis?.rankDistribution).toBeDefined();
      expect(analysis?.wildCardCount).toBe(0);
    });
  });

  describe('rankCounts', () => {
    it('should count cards by rank', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('spades', 'A'),
        createCard('clubs', 'K'),
        createCard('diamonds', '2')
      ];
      deckSignal.set(createTestDeck(cards));

      const counts = service.rankCounts();
      expect(counts.get('A')).toBe(2);
      expect(counts.get('K')).toBe(1);
      expect(counts.get('2')).toBe(1);
      expect(counts.get('Q')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle deck with only wild cards', () => {
      const cards = [
        createCard('hearts', 'A', 'wild'),
        createCard('spades', 'K', 'wild')
      ];
      deckSignal.set(createTestDeck(cards));

      expect(service.wildCardCount()).toBe(2);
      // All suits should have equal probability (every card matches every suit)
      const probs = service.suitProbabilities();
      expect(probs.hearts).toBe(1);
      expect(probs.spades).toBe(1);
      expect(probs.diamonds).toBe(1);
      expect(probs.clubs).toBe(1);
    });

    it('should handle single card deck', () => {
      const cards = [createCard('hearts', 'A')];
      deckSignal.set(createTestDeck(cards));

      const probs = service.suitProbabilities();
      expect(probs.hearts).toBe(1);
      expect(probs.spades).toBe(0);
      expect(probs.diamonds).toBe(0);
      expect(probs.clubs).toBe(0);
    });

    it('should handle reactivity when deck changes', () => {
      const initialCards = [createCard('hearts', 'A')];
      deckSignal.set(createTestDeck(initialCards));

      expect(service.remainingCards().length).toBe(1);
      expect(service.suitProbabilities().hearts).toBe(1);

      // Change the deck
      const newCards = [
        createCard('spades', 'K'),
        createCard('spades', 'Q')
      ];
      deckSignal.set(createTestDeck(newCards));

      expect(service.remainingCards().length).toBe(2);
      expect(service.suitProbabilities().hearts).toBe(0);
      expect(service.suitProbabilities().spades).toBe(1);
    });
  });
});
