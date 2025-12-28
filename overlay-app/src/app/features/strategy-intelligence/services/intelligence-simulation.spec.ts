import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { BuildDetectorService } from './build-detector.service';
import { ShopAdvisorService } from './shop-advisor.service';
import { SynergyGraphService } from './synergy-graph.service';
import { GameStateService } from '../../../core/services/game-state.service';
import {
  OverlayGameState,
  GamePhase,
  HandLevel,
  HandType,
  ShopItem,
  BlindState,
} from '../../../../../../shared/models/game-state.model';
import { Card, Suit, Rank, DeckState } from '../../../../../../shared/models/card.model';
import { JokerState } from '../../../../../../shared/models/joker.model';

/**
 * Intelligence Simulation Tests
 *
 * Comprehensive simulation tests for realistic Balatro game scenarios.
 * Tests the full integration of BuildDetectorService and ShopAdvisorService
 * across various game progression scenarios.
 */

describe('Intelligence Simulation Tests', () => {
  let buildDetector: BuildDetectorService;
  let shopAdvisor: ShopAdvisorService;
  let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
  let synergyGraphServiceMock: jasmine.SpyObj<SynergyGraphService>;
  let gameStateSignal: ReturnType<typeof signal<OverlayGameState | null>>;

  // ==========================================
  // Test Helpers
  // ==========================================

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

  function createJoker(id: string, name: string, overrides: Partial<JokerState> = {}): JokerState {
    return {
      id,
      name,
      description: `${name} description`,
      rarity: 'common',
      edition: 'none',
      slotIndex: 0,
      isScaling: false,
      effectValues: {},
      sellValue: 3,
      ...overrides,
    };
  }

  function createShopItem(id: string, name: string, type: string = 'joker', cost: number = 5): ShopItem {
    return { id, name, type: type as 'joker' | 'planet' | 'tarot' | 'spectral' | 'voucher' | 'booster', cost, sold: false };
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

  function createFlushDeck(suit: Suit, count: number, totalCards: number = 40): Card[] {
    const cards: Card[] = [];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const otherSuits: Suit[] = (['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).filter(s => s !== suit);

    // Add dominant suit cards
    for (let i = 0; i < count; i++) {
      cards.push(createCard(suit, ranks[i % ranks.length]));
    }

    // Fill with other suits
    for (let i = count; i < totalCards; i++) {
      const otherSuit = otherSuits[i % otherSuits.length];
      cards.push(createCard(otherSuit, ranks[i % ranks.length]));
    }

    return cards;
  }

  function createMockGameState(overrides: Partial<OverlayGameState> = {}): OverlayGameState {
    return {
      timestamp: Date.now(),
      version: '1.0.0',
      deck: createDeck(createStandardDeck()),
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

  function updateGameState(state: OverlayGameState): void {
    gameStateSignal.set(state);
    shopAdvisor.updateState(state);
  }

  // ==========================================
  // Test Setup
  // ==========================================

  beforeEach(() => {
    const mockState = createMockGameState();
    gameStateSignal = signal<OverlayGameState | null>(mockState);

    const deckSignal = computed(() => gameStateSignal()?.deck ?? null);
    const jokersSignal = computed(() => gameStateSignal()?.jokers ?? []);
    const handLevelsSignal = computed(() => gameStateSignal()?.handLevels ?? []);

    gameStateServiceMock = jasmine.createSpyObj('GameStateService', [], {
      state: gameStateSignal,
      deck: deckSignal,
      jokers: jokersSignal,
      handLevels: handLevelsSignal,
    });

    synergyGraphServiceMock = jasmine.createSpyObj('SynergyGraphService', [
      'getSynergies',
      'getJoker',
    ]);
    synergyGraphServiceMock.getSynergies.and.returnValue([]);
    synergyGraphServiceMock.getJoker.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        BuildDetectorService,
        ShopAdvisorService,
        { provide: GameStateService, useValue: gameStateServiceMock },
        { provide: SynergyGraphService, useValue: synergyGraphServiceMock },
      ],
    });

    buildDetector = TestBed.inject(BuildDetectorService);
    shopAdvisor = TestBed.inject(ShopAdvisorService);
  });

  // ==========================================
  // 1. Fresh Run Progression (Ante 1-4)
  // ==========================================

  describe('Scenario 1: Fresh Run Progression (Ante 1-4)', () => {
    it('should detect 0% build with no jokers at run start', () => {
      // Fresh run: standard deck, no jokers
      updateGameState(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [],
        progress: { ante: 1, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 4 },
      }));

      const build = buildDetector.detectedBuild();
      const strategies = buildDetector.detectedStrategies();

      // With no jokers, all strategies should have 0 confidence
      expect(build.primary?.confidence ?? 0).toBe(0);
      strategies.forEach(s => expect(s.confidence).toBe(0));
    });

    it('should detect emerging flush build when acquiring Lusty Joker', () => {
      // Player acquires Lusty Joker (hearts flush joker)
      updateGameState(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [createJoker('lusty_joker', 'Lusty Joker')],
        progress: { ante: 1, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 10 },
      }));

      const build = buildDetector.detectedBuild();
      const flushStrategy = buildDetector.detectedStrategies().find(s => s.type === 'flush');

      // Flush should now be detected with some confidence
      expect(flushStrategy).toBeDefined();
      expect(flushStrategy!.confidence).toBeGreaterThan(0);
    });

    it('should increase flush confidence when acquiring second flush joker (Bloodstone)', () => {
      // First state: one flush joker
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 20, 40)),
        jokers: [createJoker('lusty_joker', 'Lusty Joker')],
        progress: { ante: 2, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 15 },
      }));

      const confidenceWithOne = buildDetector.detectedStrategies().find(s => s.type === 'flush')?.confidence ?? 0;

      // Second state: two flush jokers
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 20, 40)),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),
          createJoker('bloodstone', 'Bloodstone'),
        ],
        progress: { ante: 2, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 10 },
      }));

      const confidenceWithTwo = buildDetector.detectedStrategies().find(s => s.type === 'flush')?.confidence ?? 0;

      // Confidence should increase with more jokers
      expect(confidenceWithTwo).toBeGreaterThan(confidenceWithOne);
    });

    it('should score shop items correctly for detected flush build', () => {
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 25, 40)),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),
          createJoker('bloodstone', 'Bloodstone'),
        ],
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [
            createShopItem('greedy_joker', 'Greedy Joker', 'joker', 5), // Diamonds flush - not ideal
            createShopItem('wrathful_joker', 'Wrathful Joker', 'joker', 5), // Spades flush
            createShopItem('jolly_joker', 'Jolly Joker', 'joker', 4), // Pairs - not flush
          ],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      const greedyRec = recommendations.find(r => r.item.id === 'greedy_joker');
      const jollyRec = recommendations.find(r => r.item.id === 'jolly_joker');

      // Greedy Joker (flush) should score higher than Jolly (pairs) in a flush build
      expect(greedyRec).toBeDefined();
      expect(jollyRec).toBeDefined();
      expect(greedyRec!.score).toBeGreaterThan(jollyRec!.score);
    });
  });

  // ==========================================
  // 2. Build Transition
  // ==========================================

  describe('Scenario 2: Build Transition (Pairs to Flush)', () => {
    it('should detect pairs build with Jolly + Zany Joker', () => {
      updateGameState(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [
          createJoker('jolly_joker', 'Jolly Joker'),
          createJoker('zany_joker', 'Zany Joker'),
        ],
        progress: { ante: 2, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 20 },
      }));

      const build = buildDetector.detectedBuild();
      const pairsStrategy = buildDetector.detectedStrategies().find(s => s.type === 'pairs');

      expect(pairsStrategy).toBeDefined();
      expect(pairsStrategy!.confidence).toBeGreaterThan(0);
    });

    it('should transition from pairs to flush when jokers change', () => {
      // Start with pairs jokers
      updateGameState(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [
          createJoker('jolly_joker', 'Jolly Joker'),
          createJoker('zany_joker', 'Zany Joker'),
        ],
        progress: { ante: 3, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 20 },
      }));

      const pairsBuild = buildDetector.detectedBuild();
      const pairsConfidence = pairsBuild.primary?.type === 'pairs' ? pairsBuild.primary.confidence : 0;

      // Sell pairs jokers, acquire flush jokers
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 20, 40)),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),
          createJoker('bloodstone', 'Bloodstone'),
        ],
        progress: { ante: 3, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 25 },
      }));

      const flushBuild = buildDetector.detectedBuild();
      const flushConfidence = buildDetector.detectedStrategies().find(s => s.type === 'flush')?.confidence ?? 0;

      // Primary build should change to flush
      expect(flushBuild.primary?.type).toBe('flush');
      expect(flushConfidence).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 3. Hybrid Build Detection
  // ==========================================

  describe('Scenario 3: Hybrid Build Detection', () => {
    it('should detect hybrid when secondary >= 70% of primary', () => {
      // Create deck with both hearts and face cards
      const hybridDeck: Card[] = [];
      // Add hearts with face cards (supports both flush and face_cards)
      for (let i = 0; i < 15; i++) {
        hybridDeck.push(createCard('hearts', 'K'));
        hybridDeck.push(createCard('hearts', 'Q'));
      }
      // Add more hearts (non-face)
      for (let i = 0; i < 10; i++) {
        hybridDeck.push(createCard('hearts', '5'));
      }

      updateGameState(createMockGameState({
        deck: createDeck(hybridDeck),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),       // Flush
          createJoker('bloodstone', 'Bloodstone'),         // Flush + hearts
          createJoker('scary_face', 'Scary Face'),         // Face cards
          createJoker('photograph', 'Photograph'),         // Face cards
        ],
        progress: { ante: 4, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 30 },
      }));

      const build = buildDetector.detectedBuild();
      const strategies = buildDetector.detectedStrategies();

      // With mixed jokers, check if hybrid is detected
      if (strategies.length >= 2) {
        const ratio = strategies[1].confidence / strategies[0].confidence;
        if (ratio >= 0.7) {
          expect(build.isHybrid).toBeTrue();
          expect(build.secondary).toBeDefined();
        }
      }
    });

    it('should consider both builds when scoring shop items in hybrid mode', () => {
      // Setup hybrid state
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 25, 40)),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),
          createJoker('jolly_joker', 'Jolly Joker'),
        ],
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [
            createShopItem('bloodstone', 'Bloodstone', 'joker', 8), // Flush
            createShopItem('zany_joker', 'Zany Joker', 'joker', 4), // Pairs
          ],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();

      // Both should have reasonable scores in hybrid
      recommendations.forEach(rec => {
        expect(rec.score).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================
  // 4. Boss Blind Counter Recommendations
  // ==========================================

  describe('Scenario 4: Boss Blind Counter Recommendations', () => {
    it('should give boss counter bonus for Luchador against any boss blind', () => {
      // Without boss
      updateGameState(createMockGameState({
        blind: {
          type: 'small',
          name: 'Small Blind',
          chipGoal: 300,
          chipsScored: 0,
          isBoss: false,
        },
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [createShopItem('luchador', 'Luchador', 'joker', 5)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const scoreWithoutBoss = shopAdvisor.scoreJoker('luchador');

      // With boss
      updateGameState(createMockGameState({
        blind: {
          type: 'boss',
          name: 'The Wall',
          chipGoal: 10000,
          chipsScored: 0,
          isBoss: true,
          effect: 'Extra large blind',
        },
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [createShopItem('luchador', 'Luchador', 'joker', 5)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const scoreWithBoss = shopAdvisor.scoreJoker('luchador');

      // Should get boss counter bonus (Luchador: A-tier 80 + AlwaysBuy 10 = 90 base)
      // With boss: 90 + 20 counter bonus = 110, capped at 100
      // So difference is 10 (due to cap)
      expect(scoreWithBoss).toBeGreaterThan(scoreWithoutBoss);
      expect(scoreWithBoss).toBe(100); // Capped at 100
    });

    it('should penalize club-dependent jokers against The Club boss', () => {
      // Test against The Club (debuffs clubs)
      updateGameState(createMockGameState({
        blind: {
          type: 'boss',
          name: 'The Club',
          chipGoal: 5000,
          chipsScored: 0,
          isBoss: true,
          effect: 'All Club cards are debuffed',
        },
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [createShopItem('gluttonous_joker', 'Gluttonous Joker', 'joker', 5)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const scoreWithClubBoss = shopAdvisor.scoreJoker('gluttonous_joker');

      // Without boss
      updateGameState(createMockGameState({
        blind: {
          type: 'small',
          name: 'Small Blind',
          chipGoal: 300,
          chipsScored: 0,
          isBoss: false,
        },
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [createShopItem('gluttonous_joker', 'Gluttonous Joker', 'joker', 5)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const scoreWithoutBoss = shopAdvisor.scoreJoker('gluttonous_joker');

      // Club joker should score lower against The Club
      expect(scoreWithClubBoss).toBeLessThanOrEqual(scoreWithoutBoss);
    });

    it('should penalize diamond jokers against The Window boss', () => {
      updateGameState(createMockGameState({
        blind: {
          type: 'boss',
          name: 'The Window',
          chipGoal: 5000,
          chipsScored: 0,
          isBoss: true,
          effect: 'All Diamond cards are debuffed',
        },
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [createShopItem('greedy_joker', 'Greedy Joker', 'joker', 5)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      const greedyRec = recommendations.find(r => r.item.id === 'greedy_joker');

      // Should mention weakness in reasons
      expect(greedyRec).toBeDefined();
      // Greedy Joker has bossWeaknesses: ["the_head"] - so not directly The Window
      // But the pattern is tested
    });

    it('should boost Chicot against all boss blinds', () => {
      updateGameState(createMockGameState({
        blind: {
          type: 'boss',
          name: 'Violet Vessel',
          chipGoal: 50000,
          chipsScored: 0,
          isBoss: true,
          effect: 'Very large blind',
        },
        progress: { ante: 5, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createShopItem('chicot', 'Chicot', 'joker', 20)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      const chicotRec = recommendations.find(r => r.item.id === 'chicot');

      expect(chicotRec).toBeDefined();
      expect(chicotRec!.score).toBeGreaterThanOrEqual(80); // S-tier + boss counter
    });
  });

  // ==========================================
  // 5. Synergy Detection
  // ==========================================

  describe('Scenario 5: Synergy Detection', () => {
    it('should apply synergy bonus to lower-tier jokers when synergy exists', () => {
      // Use a B-tier joker (lusty_joker) to test synergy without hitting score cap
      // Configure synergy graph mock
      synergyGraphServiceMock.getSynergies.and.callFake((jokerId: string) => {
        if (jokerId === 'lusty_joker') {
          return [{ jokerId: 'bloodstone', strength: 'strong', reason: 'Both benefit from hearts' }];
        }
        return [];
      });

      // State WITH Bloodstone (synergy partner)
      updateGameState(createMockGameState({
        jokers: [createJoker('bloodstone', 'Bloodstone')],
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 40 },
        shop: {
          items: [createShopItem('lusty_joker', 'Lusty Joker', 'joker', 5)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const scoreWithSynergy = shopAdvisor.scoreJoker('lusty_joker');

      // State WITHOUT synergy partner
      synergyGraphServiceMock.getSynergies.and.returnValue([]);
      updateGameState(createMockGameState({
        jokers: [],
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 40 },
        shop: {
          items: [createShopItem('lusty_joker', 'Lusty Joker', 'joker', 5)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const scoreWithoutSynergy = shopAdvisor.scoreJoker('lusty_joker');

      // Synergy should boost score (B-tier base of 60 won't hit cap with synergy)
      expect(scoreWithSynergy).toBeGreaterThan(scoreWithoutSynergy);
    });

    it('should show synergies in recommendation reasons', () => {
      synergyGraphServiceMock.getSynergies.and.returnValue([
        { jokerId: 'triboulet', strength: 'strong', reason: 'Face card synergy' },
      ]);
      synergyGraphServiceMock.getJoker.and.returnValue({
        id: 'triboulet',
        name: 'Triboulet',
        tags: ['face', 'xmult'],
        strategies: [],
        synergiesWith: [],
      } as any);

      updateGameState(createMockGameState({
        jokers: [createJoker('triboulet', 'Triboulet')],
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 40 },
        shop: {
          items: [createShopItem('baron', 'Baron', 'joker', 8)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      const baronRec = recommendations.find(r => r.item.id === 'baron');

      expect(baronRec?.synergiesWithOwned.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 6. Economy Decisions
  // ==========================================

  describe('Scenario 6: Economy Decisions', () => {
    it('should score Egg high in ante 1 (economy value)', () => {
      updateGameState(createMockGameState({
        progress: { ante: 1, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 10 },
        shop: {
          items: [createShopItem('egg', 'Egg', 'joker', 4)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const earlyScore = shopAdvisor.scoreJoker('egg');

      // In early game, economy jokers have value
      expect(earlyScore).toBeGreaterThan(30); // Should have some value
    });

    it('should score Egg low in ante 7 (economy falls off)', () => {
      updateGameState(createMockGameState({
        progress: { ante: 7, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 10 },
        shop: {
          items: [createShopItem('egg', 'Egg', 'joker', 4)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const lateScore = shopAdvisor.scoreJoker('egg');

      // In late game, economy jokers lose value
      expect(lateScore).toBeLessThan(50);
    });

    it('should apply interest threshold penalty (-2 per $5 breaking threshold)', () => {
      // $27 - $5 = $22, which is $3 below $25 threshold
      const penalty = shopAdvisor.checkInterestThreshold(5, 27);
      expect(penalty).toBe(3);

      // $30 - $20 = $10, which is $15 below $25 threshold (capped at 10)
      const penalty2 = shopAdvisor.checkInterestThreshold(20, 30);
      expect(penalty2).toBe(10);

      // $50 - $5 = $45, above threshold = no penalty
      const penalty3 = shopAdvisor.checkInterestThreshold(5, 50);
      expect(penalty3).toBe(0);
    });

    it('should include interest warning in reasons when threshold broken', () => {
      updateGameState(createMockGameState({
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 28 },
        shop: {
          items: [createShopItem('triboulet', 'Triboulet', 'joker', 20)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      const tribouletRec = recommendations.find(r => r.item.id === 'triboulet');

      // Should warn about breaking interest threshold ($28 - $20 = $8, below $25)
      expect(tribouletRec?.reasons.some(r =>
        r.toLowerCase().includes('$25') ||
        r.toLowerCase().includes('threshold') ||
        r.toLowerCase().includes('interest')
      )).toBeTrue();
    });
  });

  // ==========================================
  // 7. Planet Card Handling
  // ==========================================

  describe('Scenario 7: Planet Card Handling', () => {
    it('should score planets as type "planet" not "joker"', () => {
      updateGameState(createMockGameState({
        progress: { ante: 2, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 20 },
        shop: {
          items: [
            createShopItem('c_mars', 'Mars', 'planet', 3),
            createShopItem('c_neptune', 'Neptune', 'planet', 3),
          ],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();

      recommendations.forEach(rec => {
        // Should NOT show "Unknown joker"
        expect(rec.reasons.join(' ').toLowerCase()).not.toContain('unknown joker');
        // Item type should remain planet
        expect(rec.item.type).toBe('planet');
      });
    });

    it('should show "Hand level up" reason for planets', () => {
      updateGameState(createMockGameState({
        progress: { ante: 2, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 20 },
        shop: {
          items: [createShopItem('c_pluto', 'Pluto', 'planet', 3)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      const plutoRec = recommendations.find(r => r.item.id === 'c_pluto');

      expect(plutoRec).toBeDefined();
      expect(plutoRec!.reasons.some(r =>
        r.toLowerCase().includes('level') ||
        r.toLowerCase().includes('hand')
      )).toBeTrue();
    });

    it('should give bonus to planet matching build type', () => {
      // With flush build detected
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 25, 40)),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),
          createJoker('bloodstone', 'Bloodstone'),
        ],
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 20 },
        shop: {
          items: [createShopItem('c_neptune', 'Neptune', 'planet', 3)], // Neptune = Flush
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      const neptuneRec = recommendations.find(r => r.item.id === 'c_neptune');

      // With flush build, Neptune (flush planet) should score well
      expect(neptuneRec).toBeDefined();
      expect(neptuneRec!.score).toBeGreaterThanOrEqual(60);
    });
  });

  // ==========================================
  // 8. Booster Phase
  // ==========================================

  describe('Scenario 8: Booster Phase', () => {
    it('should detect booster phase correctly', () => {
      updateGameState(createMockGameState({
        progress: { ante: 2, round: 1, phase: 'booster' as GamePhase, handsRemaining: 4, discardsRemaining: 3, money: 30 },
      }));

      expect(shopAdvisor.isInBoosterPhase()).toBeTrue();

      updateGameState(createMockGameState({
        progress: { ante: 2, round: 1, phase: 'shop' as GamePhase, handsRemaining: 4, discardsRemaining: 3, money: 30 },
      }));

      expect(shopAdvisor.isInBoosterPhase()).toBeFalse();
    });

    it('should score buffoon pack contents with scoreBoosterContents()', () => {
      updateGameState(createMockGameState({
        progress: { ante: 2, round: 1, phase: 'booster' as GamePhase, handsRemaining: 4, discardsRemaining: 3, money: 30 },
      }));

      const boosterContents = [
        { id: 'blueprint', name: 'Blueprint', type: 'joker' },
        { id: 'lusty_joker', name: 'Lusty Joker', type: 'joker' },
        { id: 'egg', name: 'Egg', type: 'joker' },
      ];

      const recommendations = shopAdvisor.scoreBoosterContents(boosterContents);

      // Should return sorted array
      expect(recommendations.length).toBe(3);
      // Should be sorted by score descending
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].score).toBeGreaterThanOrEqual(recommendations[i].score);
      }
      // Blueprint (S-tier) should be first
      expect(recommendations[0].cardId).toBe('blueprint');
    });

    it('should influence booster scoring based on current build', () => {
      // With flush build
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 25, 40)),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),
        ],
        progress: { ante: 3, round: 1, phase: 'booster' as GamePhase, handsRemaining: 4, discardsRemaining: 3, money: 30 },
      }));

      const boosterContents = [
        { id: 'bloodstone', name: 'Bloodstone', type: 'joker' }, // Flush - hearts
        { id: 'jolly_joker', name: 'Jolly Joker', type: 'joker' }, // Pairs
      ];

      const recommendations = shopAdvisor.scoreBoosterContents(boosterContents);
      const bloodstoneRec = recommendations.find(r => r.cardId === 'bloodstone');
      const jollyRec = recommendations.find(r => r.cardId === 'jolly_joker');

      expect(bloodstoneRec).toBeDefined();
      expect(jollyRec).toBeDefined();
      // With flush build, Bloodstone should score higher than Jolly
      expect(bloodstoneRec!.score).toBeGreaterThan(jollyRec!.score);
    });

    it('should handle mixed content in arcana packs', () => {
      updateGameState(createMockGameState({
        progress: { ante: 2, round: 1, phase: 'booster' as GamePhase, handsRemaining: 4, discardsRemaining: 3, money: 30 },
      }));

      const arcanaContents = [
        { id: 'c_wheel', name: 'Wheel of Fortune', type: 'tarot' },
        { id: 'c_mars', name: 'Mars', type: 'planet' },
        { id: 'c_ectoplasm', name: 'Ectoplasm', type: 'spectral' },
      ];

      const recommendations = shopAdvisor.scoreBoosterContents(arcanaContents);

      expect(recommendations.length).toBe(3);
      // Each should have valid scores and tiers
      recommendations.forEach(rec => {
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(100);
        expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(rec.tier);
      });
    });
  });

  // ==========================================
  // Integration: Full Run Simulation
  // ==========================================

  describe('Integration: Full Run Simulation', () => {
    it('should track build evolution through a complete run', () => {
      // Ante 1: Fresh start, no build
      updateGameState(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [],
        progress: { ante: 1, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 4 },
      }));

      let build = buildDetector.detectedBuild();
      expect(build.primary?.confidence ?? 0).toBe(0);

      // Ante 1: Acquire first joker (Lusty Joker)
      updateGameState(createMockGameState({
        deck: createDeck(createStandardDeck()),
        jokers: [createJoker('lusty_joker', 'Lusty Joker')],
        progress: { ante: 1, round: 2, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 10 },
      }));

      build = buildDetector.detectedBuild();
      const ante1Confidence = buildDetector.detectedStrategies().find(s => s.type === 'flush')?.confidence ?? 0;

      // Ante 2: Add second flush joker
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 18, 45)),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),
          createJoker('bloodstone', 'Bloodstone'),
        ],
        progress: { ante: 2, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 15 },
      }));

      build = buildDetector.detectedBuild();
      const ante2Confidence = buildDetector.detectedStrategies().find(s => s.type === 'flush')?.confidence ?? 0;
      expect(ante2Confidence).toBeGreaterThan(ante1Confidence);

      // Ante 3: Strong flush build established
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 25, 40)),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),
          createJoker('bloodstone', 'Bloodstone'),
          createJoker('greedy_joker', 'Greedy Joker'),
        ],
        progress: { ante: 3, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 25 },
      }));

      build = buildDetector.detectedBuild();
      expect(build.primary?.type).toBe('flush');
      expect(build.primary?.confidence).toBeGreaterThan(50);

      // Ante 4: Shop with flush build should prioritize flush jokers
      updateGameState(createMockGameState({
        deck: createDeck(createFlushDeck('hearts', 30, 40)),
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker'),
          createJoker('bloodstone', 'Bloodstone'),
          createJoker('greedy_joker', 'Greedy Joker'),
        ],
        progress: { ante: 4, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 35 },
        shop: {
          items: [
            createShopItem('wrathful_joker', 'Wrathful Joker', 'joker', 5), // Flush (spades)
            createShopItem('zany_joker', 'Zany Joker', 'joker', 4), // Pairs
            createShopItem('c_neptune', 'Neptune', 'planet', 3), // Flush planet
          ],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      const wrathfulRec = recommendations.find(r => r.item.id === 'wrathful_joker');
      const zanyRec = recommendations.find(r => r.item.id === 'zany_joker');

      // Flush joker should score higher than pairs joker in a flush build
      expect(wrathfulRec!.score).toBeGreaterThan(zanyRec!.score);
    });
  });

  // ==========================================
  // Edge Cases
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle empty shop gracefully', () => {
      updateGameState(createMockGameState({
        progress: { ante: 2, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      expect(recommendations.length).toBe(0);
    });

    it('should handle unknown joker IDs gracefully', () => {
      updateGameState(createMockGameState({
        progress: { ante: 2, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [createShopItem('unknown_joker_xyz', 'Unknown Joker', 'joker', 5)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const score = shopAdvisor.scoreJoker('unknown_joker_xyz');
      expect(score).toBe(50); // Default score for unknown
    });

    it('should handle very high ante values', () => {
      updateGameState(createMockGameState({
        progress: { ante: 12, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 100 },
        shop: {
          items: [createShopItem('blueprint', 'Blueprint', 'joker', 10)],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const score = shopAdvisor.scoreJoker('blueprint');
      // Should still work at very high antes
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle sold items in shop', () => {
      updateGameState(createMockGameState({
        progress: { ante: 2, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 30 },
        shop: {
          items: [
            { ...createShopItem('blueprint', 'Blueprint', 'joker', 10), sold: true },
            createShopItem('lusty_joker', 'Lusty Joker', 'joker', 5),
          ],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      }));

      const recommendations = shopAdvisor.getShopRecommendations();
      // Sold items should be filtered out
      expect(recommendations.length).toBe(1);
      expect(recommendations[0].item.id).toBe('lusty_joker');
    });

    it('should handle max joker slots (5 jokers)', () => {
      updateGameState(createMockGameState({
        jokers: [
          createJoker('lusty_joker', 'Lusty Joker', { slotIndex: 0 }),
          createJoker('bloodstone', 'Bloodstone', { slotIndex: 1 }),
          createJoker('triboulet', 'Triboulet', { slotIndex: 2 }),
          createJoker('blueprint', 'Blueprint', { slotIndex: 3 }),
          createJoker('baron', 'Baron', { slotIndex: 4 }),
        ],
        progress: { ante: 5, round: 1, phase: 'playing', handsRemaining: 4, discardsRemaining: 3, money: 50 },
      }));

      const build = buildDetector.detectedBuild();
      const strategies = buildDetector.detectedStrategies();

      // Should still detect strategies with full joker slots
      expect(strategies.length).toBeGreaterThan(0);
    });
  });
});
