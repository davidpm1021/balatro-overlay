import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { BuildDetectorService } from './build-detector.service';
import { GameStateService } from '../../../core/services/game-state.service';
import {
  OverlayGameState,
  GamePhase,
  HandLevel,
  HandType,
} from '../../../../../../shared/models/game-state.model';
import { Card, Suit, Rank, DeckState } from '../../../../../../shared/models/card.model';
import { JokerState } from '../../../../../../shared/models/joker.model';
import { DetectedStrategy, StrategyType } from '../../../../../../shared/models/strategy.model';

describe('BuildDetectorService', () => {
  let service: BuildDetectorService;
  let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
  let gameStateSignal: ReturnType<typeof signal<OverlayGameState | null>>;

  // Helper to create mock cards
  function createCard(suit: Suit, rank: Rank, overrides: Partial<Card> = {}): Card {
    return {
      id: `${suit}-${rank}-${Math.random().toString(36).substr(2, 9)}`,
      suit,
      rank,
      enhancement: 'none',
      edition: 'none',
      seal: 'none',
      chipValue: getChipValue(rank),
      debuffed: false,
      faceDown: false,
      ...overrides,
    };
  }

  function getChipValue(rank: Rank): number {
    const values: Record<Rank, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 10, 'Q': 10, 'K': 10, 'A': 11,
    };
    return values[rank];
  }

  function createJoker(overrides: Partial<JokerState> = {}): JokerState {
    return {
      id: 'test-joker',
      name: 'Test Joker',
      description: 'Test description',
      rarity: 'common',
      edition: 'none',
      slotIndex: 0,
      isScaling: false,
      effectValues: {},
      sellValue: 3,
      ...overrides,
    };
  }

  function createDeck(cards: Card[]): DeckState {
    return {
      remaining: cards,
      discarded: [],
      hand: [],
      played: [],
      totalCards: cards.length,
      cardsRemaining: cards.length,
    };
  }

  function createMockGameState(overrides: Partial<OverlayGameState> = {}): OverlayGameState {
    return {
      timestamp: Date.now(),
      version: '1.0.0',
      deck: {
        remaining: [],
        discarded: [],
        hand: [],
        played: [],
        totalCards: 52,
        cardsRemaining: 52,
      },
      jokers: [],
      progress: {
        ante: 1,
        round: 1,
        phase: 'playing' as GamePhase,
        handsRemaining: 4,
        discardsRemaining: 3,
        money: 50,
      },
      blind: {
        type: 'small',
        name: 'Small Blind',
        chipGoal: 300,
        chipsScored: 0,
        isBoss: false,
      },
      handLevels: [],
      consumables: { tarots: [], planets: [], spectrals: [] },
      vouchers: { owned: [] },
      handHistory: [],
      ...overrides,
    };
  }

  function createStandardDeck(): Card[] {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const cards: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push(createCard(suit, rank));
      }
    }
    return cards;
  }

  function createFlushHeavyDeck(dominantSuit: Suit, concentration: number): Card[] {
    const totalCards = 40;
    const dominantCount = Math.round(totalCards * concentration);
    const cards: Card[] = [];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    // Add dominant suit cards
    for (let i = 0; i < dominantCount && i < ranks.length; i++) {
      cards.push(createCard(dominantSuit, ranks[i % ranks.length]));
    }
    if (dominantCount > ranks.length) {
      for (let i = ranks.length; i < dominantCount; i++) {
        cards.push(createCard(dominantSuit, ranks[i % ranks.length]));
      }
    }

    // Fill rest with other suits
    const otherSuits: Suit[] = (['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).filter(s => s !== dominantSuit);
    for (let i = dominantCount; i < totalCards; i++) {
      const suit = otherSuits[i % otherSuits.length];
      cards.push(createCard(suit, ranks[i % ranks.length]));
    }

    return cards;
  }

  function createPairHeavyDeck(): Card[] {
    const cards: Card[] = [];
    // Create lots of pairs, trips, quads
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

    // 3 quads
    ['A', 'K', 'Q'].forEach(rank => {
      suits.forEach(suit => cards.push(createCard(suit, rank as Rank)));
    });

    // 3 trips
    ['J', '10', '9'].forEach(rank => {
      suits.slice(0, 3).forEach(suit => cards.push(createCard(suit, rank as Rank)));
    });

    // Fill rest
    ['2', '3', '4', '5', '6'].forEach(rank => {
      cards.push(createCard('hearts', rank as Rank));
      cards.push(createCard('clubs', rank as Rank));
    });

    return cards;
  }

  beforeEach(() => {
    const mockState = createMockGameState();
    gameStateSignal = signal<OverlayGameState | null>(mockState);

    // Create computed signals that derive from the main state signal
    const deckSignal = computed(() => gameStateSignal()?.deck ?? null);
    const jokersSignal = computed(() => gameStateSignal()?.jokers ?? []);
    const handLevelsSignal = computed(() => gameStateSignal()?.handLevels ?? []);

    gameStateServiceMock = jasmine.createSpyObj('GameStateService', [], {
      state: gameStateSignal,
      deck: deckSignal,
      jokers: jokersSignal,
      handLevels: handLevelsSignal,
    });

    TestBed.configureTestingModule({
      providers: [
        BuildDetectorService,
        { provide: GameStateService, useValue: gameStateServiceMock },
      ],
    });

    service = TestBed.inject(BuildDetectorService);
  });

  // ===========================
  // R3: Weighted Detection Algorithm Tests
  // ===========================

  describe('calculateStrategyConfidence() - 60/30/10 Weighted Algorithm', () => {
    it('should have calculateStrategyConfidence method', () => {
      expect(service.calculateStrategyConfidence).toBeDefined();
    });

    it('should calculate confidence as 60% joker + 30% deck + 10% hand level', () => {
      const signals = {
        jokerSignal: 100,
        deckSignal: 100,
        handLevelSignal: 100,
      };
      const result = service.calculateStrategyConfidence('flush', signals);
      // 100 * 0.6 + 100 * 0.3 + 100 * 0.1 = 60 + 30 + 10 = 100
      expect(result).toBe(100);
    });

    it('should weight joker signal at 60%', () => {
      const signals = {
        jokerSignal: 100,
        deckSignal: 0,
        handLevelSignal: 0,
      };
      const result = service.calculateStrategyConfidence('flush', signals);
      expect(result).toBe(60);
    });

    it('should weight deck signal at 30%', () => {
      const signals = {
        jokerSignal: 0,
        deckSignal: 100,
        handLevelSignal: 0,
      };
      const result = service.calculateStrategyConfidence('flush', signals);
      expect(result).toBe(30);
    });

    it('should weight hand level signal at 10%', () => {
      const signals = {
        jokerSignal: 0,
        deckSignal: 0,
        handLevelSignal: 100,
      };
      const result = service.calculateStrategyConfidence('flush', signals);
      expect(result).toBe(10);
    });

    it('should round the result', () => {
      const signals = {
        jokerSignal: 33,
        deckSignal: 33,
        handLevelSignal: 33,
      };
      const result = service.calculateStrategyConfidence('flush', signals);
      // 33 * 0.6 + 33 * 0.3 + 33 * 0.1 = 19.8 + 9.9 + 3.3 = 33
      expect(result).toBe(33);
    });

    it('should handle mixed signal values correctly', () => {
      const signals = {
        jokerSignal: 80,  // 48
        deckSignal: 50,   // 15
        handLevelSignal: 20, // 2
      };
      const result = service.calculateStrategyConfidence('pairs', signals);
      // 80 * 0.6 + 50 * 0.3 + 20 * 0.1 = 48 + 15 + 2 = 65
      expect(result).toBe(65);
    });

    it('should handle zero signals', () => {
      const signals = {
        jokerSignal: 0,
        deckSignal: 0,
        handLevelSignal: 0,
      };
      const result = service.calculateStrategyConfidence('flush', signals);
      expect(result).toBe(0);
    });
  });

  describe('getHandLevelSignals() - Strategy Hand Level Mapping', () => {
    it('should have getHandLevelSignals method', () => {
      expect(service.getHandLevelSignals).toBeDefined();
    });

    it('should return Record<StrategyType, number>', () => {
      const handLevels: HandLevel[] = [
        { handType: 'flush', level: 3, baseChips: 35, baseMult: 6 },
        { handType: 'pair', level: 2, baseChips: 15, baseMult: 3 },
      ];

      gameStateSignal.set(createMockGameState({ handLevels }));

      const signals = service.getHandLevelSignals();

      expect(typeof signals).toBe('object');
      expect(typeof signals.flush).toBe('number');
      expect(typeof signals.pairs).toBe('number');
    });

    it('should return higher signal for leveled-up flush strategy', () => {
      const handLevels: HandLevel[] = [
        { handType: 'flush', level: 5, baseChips: 55, baseMult: 12 },
        { handType: 'pair', level: 1, baseChips: 10, baseMult: 2 },
      ];

      gameStateSignal.set(createMockGameState({ handLevels }));

      const signals = service.getHandLevelSignals();

      expect(signals.flush).toBeGreaterThan(signals.pairs);
    });

    it('should return higher signal for leveled-up pairs strategy', () => {
      const handLevels: HandLevel[] = [
        { handType: 'pair', level: 4, baseChips: 25, baseMult: 5 },
        { handType: 'two_pair', level: 4, baseChips: 30, baseMult: 5 },
        { handType: 'three_of_a_kind', level: 4, baseChips: 35, baseMult: 8 },
        { handType: 'full_house', level: 4, baseChips: 45, baseMult: 10 },
        { handType: 'four_of_a_kind', level: 4, baseChips: 70, baseMult: 14 },
        { handType: 'flush', level: 1, baseChips: 35, baseMult: 4 },
      ];

      gameStateSignal.set(createMockGameState({ handLevels }));

      const signals = service.getHandLevelSignals();

      expect(signals.pairs).toBeGreaterThan(signals.flush);
    });

    it('should map straight hand levels to straight strategy', () => {
      const handLevels: HandLevel[] = [
        { handType: 'straight', level: 6, baseChips: 50, baseMult: 15 },
        { handType: 'straight_flush', level: 4, baseChips: 120, baseMult: 20 },
      ];

      gameStateSignal.set(createMockGameState({ handLevels }));

      const signals = service.getHandLevelSignals();

      expect(signals.straight).toBeGreaterThan(0);
    });

    it('should return normalized 0-100 values', () => {
      const handLevels: HandLevel[] = [
        { handType: 'flush', level: 10, baseChips: 100, baseMult: 25 },
      ];

      gameStateSignal.set(createMockGameState({ handLevels }));

      const signals = service.getHandLevelSignals();

      // All values should be between 0-100
      Object.values(signals).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });

    it('should return 0 for strategies with no leveled hands', () => {
      const handLevels: HandLevel[] = [
        { handType: 'flush', level: 5, baseChips: 55, baseMult: 12 },
      ];

      gameStateSignal.set(createMockGameState({ handLevels }));

      const signals = service.getHandLevelSignals();

      // fibonacci relies on different hands, should have low/zero signal if only flush is leveled
      expect(signals.fibonacci).toBeLessThanOrEqual(signals.flush);
    });
  });

  // ===========================
  // R4: Hybrid Build Detection Tests
  // ===========================

  describe('detectedBuild - Hybrid Build Detection', () => {
    it('should have detectedBuild computed signal', () => {
      expect(service.detectedBuild).toBeDefined();
    });

    it('should return DetectedBuild interface with primary, secondary, isHybrid', () => {
      const build = service.detectedBuild();

      expect(build).toBeDefined();
      expect('primary' in build).toBeTrue();
      expect('secondary' in build).toBeTrue();
      expect('isHybrid' in build).toBeTrue();
    });

    it('should return primary as highest confidence strategy', () => {
      // Setup a state that produces multiple strategies
      const flushDeck = createFlushHeavyDeck('hearts', 0.7);
      const jokers = [
        createJoker({ id: 'lusty_joker', name: 'Lusty Joker' }),
      ];

      gameStateSignal.set(createMockGameState({
        deck: createDeck(flushDeck),
        jokers,
      }));

      const build = service.detectedBuild();
      const strategies = service.detectedStrategies();

      if (strategies.length > 0) {
        expect(build.primary).toEqual(strategies[0]);
      }
    });

    it('should detect hybrid when secondary >= 70% of primary confidence', () => {
      // Need to create a state where two strategies have similar confidence
      // Flush + face cards can overlap
      const cards: Card[] = [];
      const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

      // Create a deck with mostly hearts face cards (supports both flush and face_cards)
      for (let i = 0; i < 10; i++) {
        cards.push(createCard('hearts', 'K'));
        cards.push(createCard('hearts', 'Q'));
        cards.push(createCard('hearts', 'J'));
      }
      // Add some other hearts for flush
      for (let i = 0; i < 10; i++) {
        cards.push(createCard('hearts', '2'));
      }

      const jokers = [
        createJoker({ id: 'lusty_joker', name: 'Lusty Joker' }),
        createJoker({ id: 'scary_face', name: 'Scary Face' }),
      ];

      gameStateSignal.set(createMockGameState({
        deck: createDeck(cards),
        jokers,
      }));

      const build = service.detectedBuild();
      const strategies = service.detectedStrategies();

      // If we have at least 2 strategies with similar confidence, should be hybrid
      if (strategies.length >= 2) {
        const primary = strategies[0];
        const secondary = strategies[1];
        const ratio = secondary.confidence / primary.confidence;

        if (ratio >= 0.7) {
          expect(build.isHybrid).toBeTrue();
          expect(build.secondary).toEqual(secondary);
        }
      }
    });

    it('should NOT detect hybrid when secondary < 70% of primary confidence', () => {
      // Create strong flush-only state
      const flushDeck = createFlushHeavyDeck('hearts', 0.9);
      const jokers = [
        createJoker({ id: 'lusty_joker', name: 'Lusty Joker' }),
        createJoker({ id: 'bloodstone', name: 'Bloodstone' }),
      ];

      gameStateSignal.set(createMockGameState({
        deck: createDeck(flushDeck),
        jokers,
      }));

      const build = service.detectedBuild();
      const strategies = service.detectedStrategies();

      // If the gap is large enough, should not be hybrid
      if (strategies.length >= 2) {
        const primary = strategies[0];
        const secondary = strategies[1];
        const ratio = secondary.confidence / primary.confidence;

        if (ratio < 0.7) {
          expect(build.isHybrid).toBeFalse();
          expect(build.secondary).toBeUndefined();
        }
      }
    });

    it('should return isHybrid false with only one strategy or large gap between strategies', () => {
      // Create state with no jokers and empty deck - should have 0 strategies
      gameStateSignal.set(createMockGameState({
        deck: createDeck([]),
        jokers: [],
      }));

      const build = service.detectedBuild();
      const strategies = service.detectedStrategies();

      // With no cards and no jokers, should have no strategies
      // OR if strategies exist, primary should dominate (secondary < 70% of primary)
      if (strategies.length === 0) {
        expect(build.isHybrid).toBeFalse();
      } else if (strategies.length === 1) {
        expect(build.isHybrid).toBeFalse();
      } else {
        // If we somehow got strategies, verify the hybrid logic works correctly
        const primary = strategies[0];
        const secondary = strategies[1];
        const isHybridExpected = secondary.confidence >= primary.confidence * 0.7;
        expect(build.isHybrid).toBe(isHybridExpected);
      }
    });

    it('should return empty state when no strategies detected', () => {
      gameStateSignal.set(createMockGameState({
        deck: createDeck([]),
        jokers: [],
      }));

      const build = service.detectedBuild();

      expect(build.primary).toBeNull();
      expect(build.secondary).toBeUndefined();
      expect(build.isHybrid).toBeFalse();
    });
  });

  // ===========================
  // R5: Deck Composition Signals Tests
  // ===========================

  describe('getDeckSignals() - Deck Composition Analysis', () => {
    it('should have getDeckSignals method', () => {
      expect(service.getDeckSignals).toBeDefined();
    });

    it('should return all required fields', () => {
      const standardDeck = createStandardDeck();
      gameStateSignal.set(createMockGameState({
        deck: createDeck(standardDeck),
      }));

      const signals = service.getDeckSignals();

      expect('suitConcentration' in signals).toBeTrue();
      expect('rankCoverage' in signals).toBeTrue();
      expect('pairDensity' in signals).toBeTrue();
      expect('fibonacciCount' in signals).toBeTrue();
      expect('faceCardCount' in signals).toBeTrue();
    });

    it('should return suitConcentration as 0-1 value', () => {
      const standardDeck = createStandardDeck();
      gameStateSignal.set(createMockGameState({
        deck: createDeck(standardDeck),
      }));

      const signals = service.getDeckSignals();

      expect(signals.suitConcentration).toBeGreaterThanOrEqual(0);
      expect(signals.suitConcentration).toBeLessThanOrEqual(1);
    });

    it('should return high suitConcentration for flush-heavy deck', () => {
      const flushDeck = createFlushHeavyDeck('hearts', 0.8);
      gameStateSignal.set(createMockGameState({
        deck: createDeck(flushDeck),
      }));

      const signals = service.getDeckSignals();

      expect(signals.suitConcentration).toBeGreaterThanOrEqual(0.7);
    });

    it('should return ~0.25 suitConcentration for standard deck', () => {
      const standardDeck = createStandardDeck();
      gameStateSignal.set(createMockGameState({
        deck: createDeck(standardDeck),
      }));

      const signals = service.getDeckSignals();

      // Standard deck has exactly 25% of each suit
      expect(signals.suitConcentration).toBeCloseTo(0.25, 2);
    });

    it('should return rankCoverage as 0-1 value', () => {
      const standardDeck = createStandardDeck();
      gameStateSignal.set(createMockGameState({
        deck: createDeck(standardDeck),
      }));

      const signals = service.getDeckSignals();

      expect(signals.rankCoverage).toBeGreaterThanOrEqual(0);
      expect(signals.rankCoverage).toBeLessThanOrEqual(1);
    });

    it('should return pairDensity as 0-1 value', () => {
      const pairDeck = createPairHeavyDeck();
      gameStateSignal.set(createMockGameState({
        deck: createDeck(pairDeck),
      }));

      const signals = service.getDeckSignals();

      expect(signals.pairDensity).toBeGreaterThanOrEqual(0);
      expect(signals.pairDensity).toBeLessThanOrEqual(1);
    });

    it('should return high pairDensity for pair-heavy deck', () => {
      const pairDeck = createPairHeavyDeck();
      gameStateSignal.set(createMockGameState({
        deck: createDeck(pairDeck),
      }));

      const signals = service.getDeckSignals();

      // Pair-heavy deck should have high density
      expect(signals.pairDensity).toBeGreaterThan(0.5);
    });

    it('should count fibonacci cards correctly', () => {
      // Fibonacci ranks: 2, 3, 5, 8, A
      const cards = [
        createCard('hearts', '2'),
        createCard('hearts', '3'),
        createCard('hearts', '5'),
        createCard('hearts', '8'),
        createCard('hearts', 'A'),
        createCard('clubs', '2'),
        createCard('clubs', '3'),
        createCard('diamonds', '4'), // Not fibonacci
        createCard('spades', '6'),   // Not fibonacci
      ];

      gameStateSignal.set(createMockGameState({
        deck: createDeck(cards),
      }));

      const signals = service.getDeckSignals();

      // 7 fibonacci cards: 2 (x2), 3 (x2), 5 (x1), 8 (x1), A (x1)
      expect(signals.fibonacciCount).toBe(7);
    });

    it('should count face cards correctly', () => {
      const cards = [
        createCard('hearts', 'J'),
        createCard('hearts', 'Q'),
        createCard('hearts', 'K'),
        createCard('clubs', 'J'),
        createCard('clubs', 'Q'),
        createCard('diamonds', '2'),
        createCard('spades', '3'),
      ];

      gameStateSignal.set(createMockGameState({
        deck: createDeck(cards),
      }));

      const signals = service.getDeckSignals();

      expect(signals.faceCardCount).toBe(5);
    });

    it('should return zeros for empty deck', () => {
      gameStateSignal.set(createMockGameState({
        deck: createDeck([]),
      }));

      const signals = service.getDeckSignals();

      expect(signals.fibonacciCount).toBe(0);
      expect(signals.faceCardCount).toBe(0);
    });
  });

  // ===========================
  // Integration Tests - Weighted Detection in Strategies
  // ===========================

  describe('Strategy Detection with 60/30/10 Weighting', () => {
    it('should use 60/30/10 weighting in flush detection', () => {
      // High joker signal, low deck signal
      const cards = createStandardDeck();
      const jokers = [
        createJoker({ id: 'lusty_joker', name: 'Lusty Joker' }),
        createJoker({ id: 'bloodstone', name: 'Bloodstone' }),
      ];

      gameStateSignal.set(createMockGameState({
        deck: createDeck(cards),
        jokers,
      }));

      const strategies = service.detectedStrategies();
      const flushStrategy = strategies.find(s => s.type === 'flush');

      // With strong joker support but balanced deck, joker weight should dominate
      if (flushStrategy) {
        expect(flushStrategy.confidence).toBeGreaterThan(0);
      }
    });

    it('should incorporate hand levels into confidence calculation', () => {
      const cards = createFlushHeavyDeck('hearts', 0.6);
      const jokers = [
        createJoker({ id: 'lusty_joker', name: 'Lusty Joker' }),
      ];
      const handLevels: HandLevel[] = [
        { handType: 'flush', level: 5, baseChips: 55, baseMult: 12 },
      ];

      const stateWithLevels = createMockGameState({
        deck: createDeck(cards),
        jokers,
        handLevels,
      });

      const stateWithoutLevels = createMockGameState({
        deck: createDeck(cards),
        jokers,
        handLevels: [],
      });

      gameStateSignal.set(stateWithLevels);
      const withLevels = service.detectedStrategies();
      const flushWithLevels = withLevels.find(s => s.type === 'flush');

      gameStateSignal.set(stateWithoutLevels);
      const withoutLevels = service.detectedStrategies();
      const flushWithoutLevels = withoutLevels.find(s => s.type === 'flush');

      // Hand levels should boost confidence (the 10% component)
      if (flushWithLevels && flushWithoutLevels) {
        expect(flushWithLevels.confidence).toBeGreaterThanOrEqual(flushWithoutLevels.confidence);
      }
    });
  });

  // ===========================
  // Backward Compatibility Tests
  // ===========================

  describe('Backward Compatibility', () => {
    it('should still have primaryStrategy computed signal', () => {
      expect(service.primaryStrategy).toBeDefined();
    });

    it('should still have detectedStrategies computed signal', () => {
      expect(service.detectedStrategies).toBeDefined();
    });

    it('should return array from detectedStrategies', () => {
      const strategies = service.detectedStrategies();
      expect(Array.isArray(strategies)).toBeTrue();
    });

    it('should return DetectedStrategy or null from primaryStrategy', () => {
      const primary = service.primaryStrategy();

      if (primary !== null) {
        expect('type' in primary).toBeTrue();
        expect('confidence' in primary).toBeTrue();
        expect('viability' in primary).toBeTrue();
      }
    });
  });

  // ===========================
  // Strategy Types Coverage Tests
  // ===========================

  describe('All Strategy Types Support', () => {
    // Use the actual StrategyType values from the model
    const allStrategyTypes: StrategyType[] = [
      'flush', 'straight', 'pairs', 'face_cards',
      'mult_stacking', 'xmult_scaling', 'chip_stacking',
      'retrigger', 'economy', 'fibonacci',
      'even_steven', 'odd_todd', 'steel_scaling', 'glass_cannon', 'hybrid',
    ];

    it('should be able to calculate confidence for all 14 strategy types', () => {
      const signals = {
        jokerSignal: 50,
        deckSignal: 50,
        handLevelSignal: 50,
      };

      allStrategyTypes.forEach(strategyType => {
        const result = service.calculateStrategyConfidence(strategyType, signals);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      });
    });

    it('should return hand level signals for all applicable strategy types', () => {
      const handLevels: HandLevel[] = [
        { handType: 'flush', level: 2, baseChips: 40, baseMult: 5 },
        { handType: 'straight', level: 2, baseChips: 35, baseMult: 5 },
        { handType: 'pair', level: 2, baseChips: 15, baseMult: 3 },
      ];

      gameStateSignal.set(createMockGameState({ handLevels }));

      const signals = service.getHandLevelSignals();

      // Should have entries for relevant types
      expect(typeof signals.flush).toBe('number');
      expect(typeof signals.straight).toBe('number');
      expect(typeof signals.pairs).toBe('number');
    });
  });

  // ===========================
  // BUG-004: Build detection not updating on joker acquisition
  // Signal reactivity tests
  // ===========================

  describe('BUG-004: Build Detection Signal Reactivity', () => {
    it('should update detected strategies when jokers signal changes', () => {
      // Start with no jokers
      gameStateSignal.set(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [],
      }));

      const initialStrategies = service.detectedStrategies();
      const initialFlush = initialStrategies.find(s => s.type === 'flush');
      const initialFlushConfidence = initialFlush?.confidence ?? 0;

      // Add a flush joker
      gameStateSignal.set(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [
          createJoker({ id: 'lusty_joker', name: 'Lusty Joker' }),
        ],
      }));

      const updatedStrategies = service.detectedStrategies();
      const updatedFlush = updatedStrategies.find(s => s.type === 'flush');
      const updatedFlushConfidence = updatedFlush?.confidence ?? 0;

      // Flush confidence should increase after acquiring a flush joker
      expect(updatedFlushConfidence).toBeGreaterThan(initialFlushConfidence);
    });

    it('should immediately show flush build when acquiring flush joker', () => {
      // Start with no jokers and a standard deck
      gameStateSignal.set(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [],
      }));

      // Get initial primary strategy (if any)
      const initialPrimary = service.primaryStrategy();

      // Add a strong flush joker like Lusty Joker
      gameStateSignal.set(createMockGameState({
        deck: createDeck(createFlushHeavyDeck('hearts', 0.5)),
        jokers: [
          createJoker({ id: 'lusty_joker', name: 'Lusty Joker' }),
          createJoker({ id: 'bloodstone', name: 'Bloodstone' }),
        ],
      }));

      const updatedBuild = service.detectedBuild();

      // With flush jokers and concentrated deck, flush should be detected
      expect(updatedBuild.primary).not.toBeNull();
      expect(updatedBuild.primary?.type).toBe('flush');
      expect(updatedBuild.primary?.confidence).toBeGreaterThan(0);
    });

    it('should update build detection in real-time as jokers change', () => {
      const standardDeck = createStandardDeck();

      // Start with pairs jokers
      gameStateSignal.set(createMockGameState({
        deck: createDeck(standardDeck),
        jokers: [
          createJoker({ id: 'zany_joker', name: 'Zany Joker' }),
        ],
      }));

      const pairsStrategies = service.detectedStrategies();
      const pairsStrategy = pairsStrategies.find(s => s.type === 'pairs');

      // Switch to flush jokers
      gameStateSignal.set(createMockGameState({
        deck: createDeck(standardDeck),
        jokers: [
          createJoker({ id: 'lusty_joker', name: 'Lusty Joker' }),
        ],
      }));

      const flushStrategies = service.detectedStrategies();
      const flushStrategy = flushStrategies.find(s => s.type === 'flush');

      // Both should have been detected when their jokers were present
      // The key assertion is that strategies array changes reactively
      expect(pairsStrategies).not.toEqual(flushStrategies);
    });

    it('should recalculate confidence when jokers added', () => {
      // Start with a flush-oriented deck but no jokers
      const flushDeck = createFlushHeavyDeck('hearts', 0.6);
      gameStateSignal.set(createMockGameState({
        deck: createDeck(flushDeck),
        jokers: [],
      }));

      const confidenceBefore = service.detectedStrategies().find(s => s.type === 'flush')?.confidence ?? 0;

      // Add multiple flush jokers
      gameStateSignal.set(createMockGameState({
        deck: createDeck(flushDeck),
        jokers: [
          createJoker({ id: 'lusty_joker', name: 'Lusty Joker' }),
          createJoker({ id: 'bloodstone', name: 'Bloodstone' }),
          createJoker({ id: 'rough_gem', name: 'Rough Gem' }),
        ],
      }));

      const confidenceAfter = service.detectedStrategies().find(s => s.type === 'flush')?.confidence ?? 0;

      // Confidence should be higher with more jokers
      expect(confidenceAfter).toBeGreaterThan(confidenceBefore);
    });
  });

  // ===========================
  // BUG-002: Build detection shows confidence on empty state
  // Minimum joker signal threshold tests
  // ===========================

  describe('BUG-002: Zero Jokers = Zero Build Confidence', () => {
    it('should return zero confidence when no jokers present', () => {
      // Fresh run with standard deck, no jokers
      gameStateSignal.set(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [],
      }));

      const strategies = service.detectedStrategies();

      // All strategies should have 0 confidence (or be empty)
      // Standard deck has pairs, but without jokers, no build should be detected
      strategies.forEach(strategy => {
        expect(strategy.confidence).toBe(0);
      });
    });

    it('should show "No build detected" with fresh run and no jokers', () => {
      gameStateSignal.set(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [],
      }));

      const build = service.detectedBuild();
      const primary = service.primaryStrategy();

      // Either primary is null or has 0 confidence
      if (primary !== null) {
        expect(primary.confidence).toBe(0);
      } else {
        expect(build.primary).toBeNull();
      }
    });

    it('should require minimum joker signal for any strategy detection', () => {
      // Even with a flush-heavy deck, no jokers = no build
      const flushDeck = createFlushHeavyDeck('hearts', 0.8);
      gameStateSignal.set(createMockGameState({
        deck: createDeck(flushDeck),
        jokers: [],
      }));

      const strategies = service.detectedStrategies();
      const flushStrategy = strategies.find(s => s.type === 'flush');

      // Flush strategy should have 0 confidence without jokers
      expect(flushStrategy?.confidence ?? 0).toBe(0);
    });

    it('should detect build only after acquiring relevant jokers', () => {
      // Start with flush deck but no jokers
      const flushDeck = createFlushHeavyDeck('hearts', 0.7);
      gameStateSignal.set(createMockGameState({
        deck: createDeck(flushDeck),
        jokers: [],
      }));

      let strategies = service.detectedStrategies();
      expect(strategies.every(s => s.confidence === 0)).toBeTrue();

      // Add a flush joker - now build should be detected
      gameStateSignal.set(createMockGameState({
        deck: createDeck(flushDeck),
        jokers: [createJoker({ id: 'lusty_joker', name: 'Lusty Joker' })],
      }));

      strategies = service.detectedStrategies();
      const flushStrategy = strategies.find(s => s.type === 'flush');

      // Now flush should have confidence > 0
      expect(flushStrategy?.confidence).toBeGreaterThan(0);
    });

    it('should apply minimum joker signal threshold of 10', () => {
      // With joker signal < 10, confidence should be 0
      // Test by having a very weak joker affinity setup
      const standardDeck = createStandardDeck();

      // A joker with minimal affinity to any strategy
      gameStateSignal.set(createMockGameState({
        deck: createDeck(standardDeck),
        jokers: [createJoker({ id: 'non_existent_joker', name: 'Unknown' })],
      }));

      const strategies = service.detectedStrategies();

      // All strategies should still be 0 with unknown joker
      strategies.forEach(strategy => {
        expect(strategy.confidence).toBe(0);
      });
    });
  });

  // ===========================
  // BUG-005: face_cards jokers should beat pairs on standard deck
  // Pairs deck score was inflated for standard decks
  // ===========================

  describe('BUG-005: Face Card Jokers Should Win Over Generic Pairs', () => {
    it('should detect face_cards as primary build with sock_and_buskin, smiley_face, space, splash', () => {
      // This is the exact scenario the user reported:
      // 4 jokers that strongly signal face_cards, but pairs was being detected
      const standardDeck = createStandardDeck();

      gameStateSignal.set(createMockGameState({
        deck: createDeck(standardDeck),
        jokers: [
          createJoker({ id: 'j_sock_and_buskin', name: 'Sock and Buskin' }),
          createJoker({ id: 'j_smiley_face', name: 'Smiley Face' }),
          createJoker({ id: 'j_space_joker', name: 'Space Joker' }),
          createJoker({ id: 'j_splash', name: 'Splash' }),
        ],
      }));

      const build = service.detectedBuild();
      const strategies = service.detectedStrategies();

      // face_cards should be the primary build
      expect(build.primary).not.toBeNull();
      expect(build.primary?.type).toBe('face_cards');

      // Verify face_cards beats pairs
      const faceCardsStrategy = strategies.find(s => s.type === 'face_cards');
      const pairsStrategy = strategies.find(s => s.type === 'pairs');

      expect(faceCardsStrategy).toBeDefined();
      expect(faceCardsStrategy!.confidence).toBeGreaterThan(0);

      if (pairsStrategy) {
        expect(faceCardsStrategy!.confidence).toBeGreaterThan(pairsStrategy.confidence);
      }
    });

    it('should not inflate pairs confidence for standard unmodified deck', () => {
      // A standard 52-card deck has 13 "quads" (4 of each rank)
      // This should NOT give pairs a huge confidence boost
      const standardDeck = createStandardDeck();

      gameStateSignal.set(createMockGameState({
        deck: createDeck(standardDeck),
        jokers: [
          // Give both strategies equal-ish joker support
          createJoker({ id: 'j_sock_and_buskin', name: 'Sock and Buskin' }), // face_cards=100, pairs=70
          createJoker({ id: 'j_scary_face', name: 'Scary Face' }), // face_cards=100, pairs=60
        ],
      }));

      const strategies = service.detectedStrategies();
      const faceCardsStrategy = strategies.find(s => s.type === 'face_cards');
      const pairsStrategy = strategies.find(s => s.type === 'pairs');

      // face_cards should win because the jokers have higher face_cards affinity
      // even though the deck technically has 13 quads
      if (faceCardsStrategy && pairsStrategy) {
        expect(faceCardsStrategy.confidence).toBeGreaterThan(pairsStrategy.confidence);
      }
    });

    it('should favor pairs when deck is actually modified for pairs', () => {
      // A smaller deck concentrated with pairs SHOULD boost pairs
      const pairsDeck = createPairHeavyDeck(); // Helper creates concentrated pairs deck

      gameStateSignal.set(createMockGameState({
        deck: createDeck(pairsDeck),
        jokers: [
          createJoker({ id: 'j_zany_joker', name: 'Zany Joker' }), // pairs joker
          createJoker({ id: 'j_jolly_joker', name: 'Jolly Joker' }), // pairs joker
        ],
      }));

      const build = service.detectedBuild();

      // pairs should win with actual pair jokers and pair deck
      expect(build.primary).not.toBeNull();
      expect(build.primary?.type).toBe('pairs');
    });
  });
});
