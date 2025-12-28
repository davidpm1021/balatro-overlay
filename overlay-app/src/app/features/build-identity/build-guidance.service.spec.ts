import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BuildGuidanceService, BuildGuidance, BUILD_CONTENT } from './build-guidance.service';
import { GameStateService } from '../../core/services/game-state.service';
import { DetectedStrategy, StrategyType } from '../../../../../shared/models/strategy.model';
import { Card, Suit, Rank, DeckState } from '../../../../../shared/models/card.model';
import { JokerState } from '../../../../../shared/models/joker.model';

describe('BuildGuidanceService', () => {
  let service: BuildGuidanceService;
  let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
  let deckSignal: ReturnType<typeof signal<DeckState | null>>;

  function createCard(suit: Suit, rank: Rank): Card {
    return {
      id: `${suit}_${rank}`,
      suit,
      rank,
      enhancement: 'none',
      edition: 'none',
      seal: 'none',
      chipValue: 10,
      debuffed: false,
      faceDown: false,
    };
  }

  function createJoker(id: string, name: string): JokerState {
    return {
      id,
      name,
      description: 'Test joker',
      rarity: 'common',
      edition: 'none',
      slotIndex: 0,
      isScaling: false,
      effectValues: {},
      sellValue: 3,
    };
  }

  function createDetectedStrategy(
    type: StrategyType,
    confidence: number,
    overrides: Partial<DetectedStrategy> = {}
  ): DetectedStrategy {
    return {
      type,
      confidence,
      viability: 80,
      requirements: [],
      currentStrength: 60,
      ...overrides,
    };
  }

  function createDeckState(cards: Card[]): DeckState {
    return {
      remaining: cards,
      hand: [],
      discarded: [],
      played: [],
      totalCards: cards.length,
      cardsRemaining: cards.length,
    };
  }

  beforeEach(() => {
    deckSignal = signal<DeckState | null>(null);

    gameStateServiceMock = jasmine.createSpyObj('GameStateService', [], {
      deck: deckSignal.asReadonly(),
    });

    TestBed.configureTestingModule({
      providers: [
        BuildGuidanceService,
        { provide: GameStateService, useValue: gameStateServiceMock },
      ],
    });

    service = TestBed.inject(BuildGuidanceService);
  });

  describe('BUILD_CONTENT constant', () => {
    it('should have content for all 14 strategy types plus hybrid', () => {
      const requiredTypes: StrategyType[] = [
        'flush',
        'pairs',
        'straight',
        'mult_stacking',
        'xmult_scaling',
        'face_cards',
        'fibonacci',
        'chip_stacking',
        'retrigger',
        'economy',
        'even_steven',
        'odd_todd',
        'steel_scaling',
        'glass_cannon',
        'hybrid',
      ];

      for (const type of requiredTypes) {
        expect(BUILD_CONTENT[type]).toBeDefined(`Missing BUILD_CONTENT for ${type}`);
        expect(BUILD_CONTENT[type].name).toBeTruthy(`Missing name for ${type}`);
        expect(BUILD_CONTENT[type].description).toBeTruthy(`Missing description for ${type}`);
        expect(BUILD_CONTENT[type].whatThisMeans.length).toBeGreaterThanOrEqual(
          2,
          `${type} should have at least 2 bullet points`
        );
      }
    });

    it('should have correct assetType for suit-based builds', () => {
      expect(BUILD_CONTENT.flush.assetType).toBe('suit');
    });

    it('should have correct assetType for rank-based builds', () => {
      expect(BUILD_CONTENT.pairs.assetType).toBe('rank');
    });

    it('should have correct assetType for count-based builds', () => {
      expect(BUILD_CONTENT.face_cards.assetType).toBe('count');
      expect(BUILD_CONTENT.fibonacci.assetType).toBe('count');
      expect(BUILD_CONTENT.even_steven.assetType).toBe('count');
      expect(BUILD_CONTENT.odd_todd.assetType).toBe('count');
      expect(BUILD_CONTENT.steel_scaling.assetType).toBe('count');
      expect(BUILD_CONTENT.glass_cannon.assetType).toBe('count');
    });

    it('should have null assetType for joker-driven builds', () => {
      expect(BUILD_CONTENT.mult_stacking.assetType).toBeNull();
      expect(BUILD_CONTENT.xmult_scaling.assetType).toBeNull();
      expect(BUILD_CONTENT.retrigger.assetType).toBeNull();
      expect(BUILD_CONTENT.economy.assetType).toBeNull();
    });
  });

  describe('getGuidance', () => {
    it('should return guidance with build name and description', () => {
      const strategy = createDetectedStrategy('flush', 72);
      const jokers: JokerState[] = [];

      const guidance = service.getGuidance('flush', strategy, jokers);

      expect(guidance.buildName).toBe('Flush Build');
      expect(guidance.description).toContain('5 cards of the same suit');
    });

    it('should return whatThisMeans with 2-3 bullet points', () => {
      const strategy = createDetectedStrategy('pairs', 65);
      const jokers: JokerState[] = [];

      const guidance = service.getGuidance('pairs', strategy, jokers);

      expect(guidance.whatThisMeans.length).toBeGreaterThanOrEqual(2);
      expect(guidance.whatThisMeans.length).toBeLessThanOrEqual(3);
    });

    it('should return strongestAsset for flush build based on deck composition', () => {
      // Set up deck with more hearts than other suits
      const cards: Card[] = [
        ...Array(15).fill(null).map((_, i) => createCard('hearts', '2')),
        ...Array(10).fill(null).map((_, i) => createCard('spades', '3')),
        ...Array(8).fill(null).map((_, i) => createCard('diamonds', '4')),
        ...Array(7).fill(null).map((_, i) => createCard('clubs', '5')),
      ];
      deckSignal.set(createDeckState(cards));

      const strategy = createDetectedStrategy('flush', 72, { suit: 'hearts' });
      const jokers: JokerState[] = [];

      const guidance = service.getGuidance('flush', strategy, jokers);

      expect(guidance.strongestAsset).toBeTruthy();
      expect(guidance.strongestAsset!.type).toBe('suit');
      expect(guidance.strongestAsset!.value).toBe('hearts');
      expect(guidance.strongestAsset!.display).toContain('Hearts');
      expect(guidance.strongestAsset!.display).toContain('15');
    });

    it('should return strongestAsset for pairs build showing best rank', () => {
      // Set up deck with 4 Kings (most duplicates)
      const cards: Card[] = [
        createCard('hearts', 'K'),
        createCard('spades', 'K'),
        createCard('diamonds', 'K'),
        createCard('clubs', 'K'),
        createCard('hearts', 'Q'),
        createCard('spades', 'Q'),
      ];
      deckSignal.set(createDeckState(cards));

      const strategy = createDetectedStrategy('pairs', 65);
      const jokers: JokerState[] = [];

      const guidance = service.getGuidance('pairs', strategy, jokers);

      expect(guidance.strongestAsset).toBeTruthy();
      expect(guidance.strongestAsset!.type).toBe('rank');
      expect(guidance.strongestAsset!.value).toBe('K');
      expect(guidance.strongestAsset!.display).toContain('King');
      expect(guidance.strongestAsset!.display).toContain('4');
    });

    it('should return strongestAsset for face_cards build showing count', () => {
      const cards: Card[] = [
        createCard('hearts', 'K'),
        createCard('spades', 'K'),
        createCard('diamonds', 'Q'),
        createCard('clubs', 'J'),
        createCard('hearts', '2'),
        createCard('spades', '3'),
      ];
      deckSignal.set(createDeckState(cards));

      const strategy = createDetectedStrategy('face_cards', 70);
      const jokers: JokerState[] = [];

      const guidance = service.getGuidance('face_cards', strategy, jokers);

      expect(guidance.strongestAsset).toBeTruthy();
      expect(guidance.strongestAsset!.type).toBe('count');
      expect(guidance.strongestAsset!.display).toContain('4');
      expect(guidance.strongestAsset!.display.toLowerCase()).toContain('face');
    });

    it('should return strongestAsset for fibonacci build showing count', () => {
      // Fibonacci ranks: A, 2, 3, 5, 8
      const cards: Card[] = [
        createCard('hearts', 'A'),
        createCard('spades', '2'),
        createCard('diamonds', '3'),
        createCard('clubs', '5'),
        createCard('hearts', '8'),
        createCard('spades', '6'),  // Not fibonacci
      ];
      deckSignal.set(createDeckState(cards));

      const strategy = createDetectedStrategy('fibonacci', 75);
      const jokers: JokerState[] = [];

      const guidance = service.getGuidance('fibonacci', strategy, jokers);

      expect(guidance.strongestAsset).toBeTruthy();
      expect(guidance.strongestAsset!.type).toBe('count');
      expect(guidance.strongestAsset!.display).toContain('5');
      expect(guidance.strongestAsset!.display.toLowerCase()).toContain('fibonacci');
    });

    it('should return null strongestAsset for mult_stacking (no asset type)', () => {
      const strategy = createDetectedStrategy('mult_stacking', 60);
      const jokers: JokerState[] = [];

      const guidance = service.getGuidance('mult_stacking', strategy, jokers);

      expect(guidance.strongestAsset).toBeNull();
    });

    it('should return supporting jokers (max 3)', () => {
      const strategy = createDetectedStrategy('flush', 72, {
        keyJokers: ['j_lusty_joker', 'j_bloodstone', 'j_tribe', 'j_smeared_joker'],
      });
      const jokers: JokerState[] = [
        createJoker('j_lusty_joker', 'Lusty Joker'),
        createJoker('j_bloodstone', 'Bloodstone'),
        createJoker('j_tribe', 'The Tribe'),
        createJoker('j_smeared_joker', 'Smeared Joker'),
      ];

      const guidance = service.getGuidance('flush', strategy, jokers);

      expect(guidance.supportingJokers.length).toBeLessThanOrEqual(3);
      expect(guidance.supportingJokers).toContain('Lusty Joker');
    });

    it('should calculate jokersNeeded correctly', () => {
      const strategy = createDetectedStrategy('flush', 72, {
        keyJokers: ['j_lusty_joker'],
      });
      const jokers: JokerState[] = [createJoker('j_lusty_joker', 'Lusty Joker')];

      const guidance = service.getGuidance('flush', strategy, jokers);

      expect(guidance.jokersNeeded).toBeGreaterThanOrEqual(0);
      expect(guidance.jokersNeeded).toBeLessThanOrEqual(3);
    });

    it('should return 0 jokersNeeded when strategy has 3+ supporting jokers', () => {
      const strategy = createDetectedStrategy('flush', 90, {
        keyJokers: ['j_lusty_joker', 'j_bloodstone', 'j_tribe'],
      });
      const jokers: JokerState[] = [
        createJoker('j_lusty_joker', 'Lusty Joker'),
        createJoker('j_bloodstone', 'Bloodstone'),
        createJoker('j_tribe', 'The Tribe'),
      ];

      const guidance = service.getGuidance('flush', strategy, jokers);

      expect(guidance.jokersNeeded).toBe(0);
    });
  });

  describe('getHybridAdvice', () => {
    it('should suggest committing when confidences are close', () => {
      const advice = service.getHybridAdvice(75, 70);

      expect(advice.toLowerCase()).toContain('commit');
    });

    it('should suggest keeping both when secondary is strong backup', () => {
      const advice = service.getHybridAdvice(80, 56);

      expect(advice.toLowerCase()).toMatch(/backup|secondary|maintain/);
    });
  });

  describe('strongestSuit calculation', () => {
    it('should find the strongest suit from deck', () => {
      const cards: Card[] = [
        createCard('hearts', '2'),
        createCard('hearts', '3'),
        createCard('hearts', '4'),
        createCard('spades', '5'),
        createCard('diamonds', '6'),
      ];
      deckSignal.set(createDeckState(cards));

      const strategy = createDetectedStrategy('flush', 60);
      const guidance = service.getGuidance('flush', strategy, []);

      expect(guidance.strongestAsset?.value).toBe('hearts');
    });

    it('should handle tie by preferring specified suit from strategy', () => {
      const cards: Card[] = [
        createCard('hearts', '2'),
        createCard('hearts', '3'),
        createCard('spades', '4'),
        createCard('spades', '5'),
      ];
      deckSignal.set(createDeckState(cards));

      const strategy = createDetectedStrategy('flush', 60, { suit: 'spades' });
      const guidance = service.getGuidance('flush', strategy, []);

      expect(guidance.strongestAsset?.value).toBe('spades');
    });
  });

  describe('strongestRank calculation', () => {
    it('should find the rank with most duplicates', () => {
      const cards: Card[] = [
        createCard('hearts', 'A'),
        createCard('spades', 'A'),
        createCard('diamonds', 'A'),
        createCard('clubs', 'K'),
        createCard('hearts', 'K'),
      ];
      deckSignal.set(createDeckState(cards));

      const strategy = createDetectedStrategy('pairs', 60);
      const guidance = service.getGuidance('pairs', strategy, []);

      expect(guidance.strongestAsset?.value).toBe('A');
      expect(guidance.strongestAsset?.display).toContain('Ace');
    });
  });

  describe('edge cases', () => {
    it('should handle empty deck gracefully', () => {
      deckSignal.set(createDeckState([]));

      const strategy = createDetectedStrategy('flush', 50);
      const guidance = service.getGuidance('flush', strategy, []);

      expect(guidance.buildName).toBeTruthy();
      expect(guidance.whatThisMeans.length).toBeGreaterThan(0);
    });

    it('should handle null deck gracefully', () => {
      deckSignal.set(null);

      const strategy = createDetectedStrategy('pairs', 50);
      const guidance = service.getGuidance('pairs', strategy, []);

      expect(guidance.buildName).toBeTruthy();
    });

    it('should handle strategy with no keyJokers', () => {
      const strategy = createDetectedStrategy('flush', 50);
      delete (strategy as any).keyJokers;

      const guidance = service.getGuidance('flush', strategy, []);

      expect(guidance.supportingJokers).toEqual([]);
      expect(guidance.jokersNeeded).toBeGreaterThan(0);
    });
  });
});
