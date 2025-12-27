import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ShopAdvisorService, ShopRecommendation } from './shop-advisor.service';
import { SynergyGraphService } from './synergy-graph.service';
import { BuildDetectorService } from './build-detector.service';
import { GameStateService } from '../../../core/services/game-state.service';
import {
  OverlayGameState,
  ShopItem,
  BlindState,
  GamePhase,
} from '../../../../../../shared/models/game-state.model';
import { JokerState } from '../../../../../../shared/models/joker.model';

describe('ShopAdvisorService', () => {
  let service: ShopAdvisorService;
  let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
  let synergyGraphServiceMock: jasmine.SpyObj<SynergyGraphService>;
  let buildDetectorServiceMock: jasmine.SpyObj<BuildDetectorService>;

  // Mock data
  const createMockGameState = (overrides: Partial<OverlayGameState> = {}): OverlayGameState => ({
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
      phase: 'shop' as GamePhase,
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
  });

  const createMockShopItem = (overrides: Partial<ShopItem> = {}): ShopItem => ({
    id: 'j_test',
    name: 'Test Joker',
    type: 'joker',
    cost: 5,
    sold: false,
    ...overrides,
  });

  const createMockJokerState = (overrides: Partial<JokerState> = {}): JokerState => ({
    id: 'j_test',
    name: 'Test Joker',
    rarity: 'common',
    description: 'Test description',
    edition: 'none',
    slotIndex: 0,
    isScaling: false,
    effectValues: {},
    sellValue: 3,
    ...overrides,
  });

  beforeEach(() => {
    // Create mocks
    const gameStateSignal = signal<OverlayGameState | null>(createMockGameState());
    gameStateServiceMock = jasmine.createSpyObj('GameStateService', [], {
      state: gameStateSignal,
    });

    synergyGraphServiceMock = jasmine.createSpyObj('SynergyGraphService', [
      'getSynergies',
      'getJoker',
    ]);
    synergyGraphServiceMock.getSynergies.and.returnValue([]);
    synergyGraphServiceMock.getJoker.and.returnValue(null);

    // Create a proper mock for BuildDetectorService that includes gameState property
    const buildDetectorGameState = {
      state: signal<OverlayGameState | null>(null),
    };
    buildDetectorServiceMock = {
      primaryStrategy: signal(null),
      detectedStrategies: signal([]),
      gameState: buildDetectorGameState,
    } as any;

    TestBed.configureTestingModule({
      providers: [
        ShopAdvisorService,
        { provide: GameStateService, useValue: gameStateServiceMock },
        { provide: SynergyGraphService, useValue: synergyGraphServiceMock },
        { provide: BuildDetectorService, useValue: buildDetectorServiceMock },
      ],
    });

    service = TestBed.inject(ShopAdvisorService);
  });

  describe('No Hardcoded Joker Data', () => {
    it('should NOT contain JOKER_KNOWLEDGE constant - service should use JSON data', () => {
      // This test verifies the refactoring requirement:
      // The service should NOT have inline hardcoded joker data
      // Instead it should load from jokers-complete.json

      // Test by checking that the service has a jokerData property or loadJokerData method
      // that loads from JSON, rather than a JOKER_KNOWLEDGE constant

      // For now, this test will fail because the current implementation has JOKER_KNOWLEDGE
      // After refactoring, the service should:
      // 1. Not have JOKER_KNOWLEDGE as a property
      // 2. Load joker data from JSON file

      // Check if service has methods to load/access JSON data
      const hasJokerDataLoader = (service as any).jokerData !== undefined ||
                                  (service as any).loadJokerData !== undefined ||
                                  (service as any).getJokerFromJson !== undefined;

      expect(hasJokerDataLoader).toBeTrue();
    });

    it('should load joker tier data from jokers-complete.json', () => {
      // After refactoring, the service should use tier data from JSON
      // Blueprint should have tier: "S" and tierByAnte from the JSON file

      const mockState = createMockGameState({
        shop: {
          items: [createMockShopItem({ id: 'blueprint', name: 'Blueprint', cost: 10 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(mockState);

      const score = service.scoreJoker('blueprint');

      // Blueprint is S-tier, should score high
      expect(score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('S-Tier Joker Scoring', () => {
    beforeEach(() => {
      // Set up a game state with shop containing S-tier jokers
      const mockState = createMockGameState({
        shop: {
          items: [
            createMockShopItem({ id: 'blueprint', name: 'Blueprint', cost: 10 }),
            createMockShopItem({ id: 'triboulet', name: 'Triboulet', cost: 20 }),
            createMockShopItem({ id: 'brainstorm', name: 'Brainstorm', cost: 10 }),
          ],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(mockState);
    });

    it('should score Blueprint >= 85', () => {
      const score = service.scoreJoker('blueprint');
      expect(score).toBeGreaterThanOrEqual(85);
    });

    it('should score Triboulet >= 85', () => {
      const score = service.scoreJoker('triboulet');
      expect(score).toBeGreaterThanOrEqual(85);
    });

    it('should score Brainstorm >= 85', () => {
      const score = service.scoreJoker('brainstorm');
      expect(score).toBeGreaterThanOrEqual(85);
    });

    it('should assign S tier to high-scoring jokers', () => {
      const recommendations = service.getShopRecommendations();
      const blueprintRec = recommendations.find(r => r.item.id === 'blueprint');

      expect(blueprintRec).toBeDefined();
      expect(blueprintRec!.tier).toBe('S');
    });
  });

  describe('Ante-Aware Scoring', () => {
    it('should score economy jokers higher in ante 1-2', () => {
      // Test at ante 1
      const earlyGameState = createMockGameState({
        progress: { ante: 1, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createMockShopItem({ id: 'golden_joker', name: 'Golden Joker', cost: 6 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(earlyGameState);
      const earlyScore = service.scoreJoker('golden_joker');

      // Test at ante 7
      const lateGameState = createMockGameState({
        progress: { ante: 7, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createMockShopItem({ id: 'golden_joker', name: 'Golden Joker', cost: 6 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(lateGameState);
      const lateScore = service.scoreJoker('golden_joker');

      // Economy jokers should score higher early game
      expect(earlyScore).toBeGreaterThan(lateScore);
    });

    it('should score economy jokers lower in ante 6+', () => {
      const lateGameState = createMockGameState({
        progress: { ante: 6, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createMockShopItem({ id: 'egg', name: 'Egg', cost: 4 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(lateGameState);
      const lateScore = service.scoreJoker('egg');

      // Egg should score below 50 in late game (economy joker penalty)
      expect(lateScore).toBeLessThan(50);
    });

    it('should score xMult jokers higher in ante 6+', () => {
      // Test at ante 2
      const earlyGameState = createMockGameState({
        progress: { ante: 2, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createMockShopItem({ id: 'cavendish', name: 'Cavendish', cost: 4 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(earlyGameState);
      const earlyScore = service.scoreJoker('cavendish');

      // Test at ante 7
      const lateGameState = createMockGameState({
        progress: { ante: 7, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createMockShopItem({ id: 'cavendish', name: 'Cavendish', cost: 4 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(lateGameState);
      const lateScore = service.scoreJoker('cavendish');

      // xMult jokers should score higher late game
      expect(lateScore).toBeGreaterThan(earlyScore);
    });

    it('should use tierByAnte from JSON data for score calculation', () => {
      // Vampire has tierByAnte: { early: "B", mid: "A", late: "S" }
      // Score should increase as ante increases

      const ante2State = createMockGameState({
        progress: { ante: 2, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createMockShopItem({ id: 'vampire', name: 'Vampire', cost: 7 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(ante2State);
      const ante2Score = service.scoreJoker('vampire');

      const ante6State = createMockGameState({
        progress: { ante: 6, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createMockShopItem({ id: 'vampire', name: 'Vampire', cost: 7 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(ante6State);
      const ante6Score = service.scoreJoker('vampire');

      // Vampire should score higher in late game (S tier) vs early (B tier)
      expect(ante6Score).toBeGreaterThan(ante2Score);
    });
  });

  describe('Synergy Detection', () => {
    it('should apply synergy bonus when owning a synergistic joker', () => {
      // Triboulet synergizes strongly with Baron
      synergyGraphServiceMock.getSynergies.and.callFake((jokerId: string) => {
        if (jokerId === 'baron') {
          return [{ jokerId: 'triboulet', strength: 'strong', reason: 'Both benefit from face cards' }];
        }
        return [];
      });

      // State with Triboulet owned
      const stateWithTriboulet = createMockGameState({
        jokers: [createMockJokerState({ id: 'triboulet', name: 'Triboulet' })],
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithTriboulet);
      const scoreWithSynergy = service.scoreJoker('baron');

      // State without Triboulet
      const stateWithoutTriboulet = createMockGameState({
        jokers: [],
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithoutTriboulet);
      const scoreWithoutSynergy = service.scoreJoker('baron');

      // Score should be higher with synergistic joker
      expect(scoreWithSynergy).toBeGreaterThan(scoreWithoutSynergy);
    });

    it('should apply +15 for strong synergies from JSON data', () => {
      // The service should read synergies.strong from jokers-complete.json
      // and apply +15 bonus for each strong synergy with owned jokers

      synergyGraphServiceMock.getSynergies.and.returnValue([
        { jokerId: 'triboulet', strength: 'strong', reason: 'Test synergy' },
      ]);

      const stateWithSynergy = createMockGameState({
        jokers: [createMockJokerState({ id: 'triboulet', name: 'Triboulet' })],
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithSynergy);
      const recommendations = service.getShopRecommendations();
      const baronRec = recommendations.find(r => r.item.id === 'baron');

      // Should have synergy bonus in the score breakdown
      expect(baronRec?.synergiesWithOwned.length).toBeGreaterThan(0);
    });

    it('should apply +8 for medium synergies', () => {
      synergyGraphServiceMock.getSynergies.and.returnValue([
        { jokerId: 'mime', strength: 'medium', reason: 'Test synergy' },
      ]);

      const stateWithMediumSynergy = createMockGameState({
        jokers: [createMockJokerState({ id: 'mime', name: 'Mime' })],
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithMediumSynergy);
      const scoreWithMediumSynergy = service.scoreJoker('baron');

      const stateWithoutSynergy = createMockGameState({
        jokers: [],
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithoutSynergy);
      const scoreWithoutSynergy = service.scoreJoker('baron');

      // Medium synergy should add approximately 8 points
      const difference = scoreWithMediumSynergy - scoreWithoutSynergy;
      expect(difference).toBeGreaterThanOrEqual(6);
      expect(difference).toBeLessThanOrEqual(10);
    });

    it('should apply -10 for anti-synergies from jokers-complete.json', () => {
      // The service should read synergies.antiSynergy from JSON
      // Vampire has antiSynergy with drivers_license

      // This test verifies the service uses the antiSynergy data from JSON
      const stateWithAntiSynergy = createMockGameState({
        jokers: [createMockJokerState({ id: 'drivers_license', name: "Driver's License" })],
        shop: {
          items: [createMockShopItem({ id: 'vampire', name: 'Vampire', cost: 7 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithAntiSynergy);
      const scoreWithAntiSynergy = service.scoreJoker('vampire');

      const stateWithoutAntiSynergy = createMockGameState({
        jokers: [],
        shop: {
          items: [createMockShopItem({ id: 'vampire', name: 'Vampire', cost: 7 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithoutAntiSynergy);
      const scoreWithoutAntiSynergy = service.scoreJoker('vampire');

      // Anti-synergy should reduce score
      expect(scoreWithAntiSynergy).toBeLessThan(scoreWithoutAntiSynergy);
    });

    it('should cap synergy bonus at +30 / anti-synergy at -20', () => {
      // Multiple strong synergies
      synergyGraphServiceMock.getSynergies.and.returnValue([
        { jokerId: 'triboulet', strength: 'strong', reason: 'Test' },
        { jokerId: 'mime', strength: 'strong', reason: 'Test' },
        { jokerId: 'sock_and_buskin', strength: 'strong', reason: 'Test' },
        { jokerId: 'pareidolia', strength: 'strong', reason: 'Test' },
      ]);

      const stateWithManySynergies = createMockGameState({
        jokers: [
          createMockJokerState({ id: 'triboulet', name: 'Triboulet' }),
          createMockJokerState({ id: 'mime', name: 'Mime' }),
          createMockJokerState({ id: 'sock_and_buskin', name: 'Sock and Buskin' }),
          createMockJokerState({ id: 'pareidolia', name: 'Pareidolia' }),
        ],
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithManySynergies);
      const scoreWithManySynergies = service.scoreJoker('baron');

      // 4 strong synergies = 60 points, but capped at 30
      const stateWithoutSynergies = createMockGameState({
        jokers: [],
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithoutSynergies);
      const scoreWithoutSynergies = service.scoreJoker('baron');

      // Max difference should be around 30 (capped)
      expect(scoreWithManySynergies - scoreWithoutSynergies).toBeLessThanOrEqual(35);
    });
  });

  describe('Boss Counter Integration', () => {
    it('should give +20 bonus for joker that counters upcoming boss', () => {
      // Luchador counters all bosses (bossCounters: ["all"])
      const stateWithBoss = createMockGameState({
        blind: {
          type: 'boss',
          name: 'The Wall',
          chipGoal: 10000,
          chipsScored: 0,
          isBoss: true,
          effect: 'Extra large blind',
        },
        shop: {
          items: [createMockShopItem({ id: 'luchador', name: 'Luchador', cost: 5 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithBoss);
      const scoreWithBossCounter = service.scoreJoker('luchador');

      const stateWithoutBoss = createMockGameState({
        blind: {
          type: 'small',
          name: 'Small Blind',
          chipGoal: 300,
          chipsScored: 0,
          isBoss: false,
        },
        shop: {
          items: [createMockShopItem({ id: 'luchador', name: 'Luchador', cost: 5 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithoutBoss);
      const scoreWithoutBoss = service.scoreJoker('luchador');

      // Boss counter should give significant bonus (+20)
      expect(scoreWithBossCounter).toBeGreaterThan(scoreWithoutBoss);
      expect(scoreWithBossCounter - scoreWithoutBoss).toBeGreaterThanOrEqual(15);
    });

    it('should give -10 penalty for joker weak to upcoming boss', () => {
      // Baron has bossWeaknesses: ["the_club", "the_goad", "the_window", "the_head"]
      const stateWithWeakness = createMockGameState({
        blind: {
          type: 'boss',
          name: 'The Club',
          chipGoal: 5000,
          chipsScored: 0,
          isBoss: true,
          effect: 'All Club cards are debuffed',
        },
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithWeakness);
      const scoreWithWeakness = service.scoreJoker('baron');

      const stateWithoutWeakness = createMockGameState({
        blind: {
          type: 'small',
          name: 'Small Blind',
          chipGoal: 300,
          chipsScored: 0,
          isBoss: false,
        },
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithoutWeakness);
      const scoreWithoutWeakness = service.scoreJoker('baron');

      // Weakness should reduce score
      expect(scoreWithWeakness).toBeLessThan(scoreWithoutWeakness);
    });

    it('should use bossCounters array from jokers-complete.json', () => {
      // The refactored service should read bossCounters from JSON
      // Chicot and Luchador should counter all bosses

      const stateWithChicot = createMockGameState({
        blind: {
          type: 'boss',
          name: 'Violet Vessel',
          chipGoal: 50000,
          chipsScored: 0,
          isBoss: true,
          effect: 'Very large blind',
        },
        shop: {
          items: [createMockShopItem({ id: 'chicot', name: 'Chicot', cost: 20 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithChicot);
      const recommendations = service.getShopRecommendations();
      const chicotRec = recommendations.find(r => r.item.id === 'chicot');

      // Chicot should get boss counter bonus (included in reasons)
      expect(chicotRec).toBeDefined();
      expect(chicotRec!.reasons.some(r =>
        r.toLowerCase().includes('boss') || r.toLowerCase().includes('counter')
      )).toBeTrue();
    });
  });

  describe('Interest Threshold Warning', () => {
    it('should apply penalty if purchase drops money below $25', () => {
      const stateNearThreshold = createMockGameState({
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 27 },
        shop: {
          items: [createMockShopItem({ id: 'j_test', name: 'Test Joker', cost: 5 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateNearThreshold);

      // Check that the service has an interest threshold method
      expect(service.checkInterestThreshold).toBeDefined();

      // Buying a $5 item with $27 leaves $22, which is $3 below threshold
      const penalty = service.checkInterestThreshold(5, 27);
      expect(penalty).toBeGreaterThan(0);
    });

    it('should not apply penalty if money stays above $25 after purchase', () => {
      const stateAboveThreshold = createMockGameState({
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createMockShopItem({ id: 'j_test', name: 'Test Joker', cost: 5 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateAboveThreshold);

      // Buying a $5 item with $50 leaves $45, well above threshold
      const penalty = service.checkInterestThreshold(5, 50);
      expect(penalty).toBe(0);
    });

    it('should calculate penalty as dollars below threshold (max 10)', () => {
      // $27 - $5 = $22, which is $3 below $25
      const penalty1 = service.checkInterestThreshold(5, 27);
      expect(penalty1).toBe(3);

      // $30 - $20 = $10, which is $15 below $25, capped at 10
      const penalty2 = service.checkInterestThreshold(20, 30);
      expect(penalty2).toBe(10);

      // $25 - $5 = $20, which is $5 below $25
      const penalty3 = service.checkInterestThreshold(5, 25);
      expect(penalty3).toBe(5);
    });

    it('should include interest penalty in score breakdown', () => {
      const stateNearThreshold = createMockGameState({
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 27 },
        shop: {
          items: [createMockShopItem({ id: 'cavendish', name: 'Cavendish', cost: 4 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateNearThreshold);

      const recommendations = service.getShopRecommendations();
      const cavendishRec = recommendations.find(r => r.item.id === 'cavendish');

      // Should have interest warning in reasons
      expect(cavendishRec?.reasons.some(r =>
        r.toLowerCase().includes('interest') || r.toLowerCase().includes('threshold') || r.toLowerCase().includes('$25')
      )).toBeTrue();
    });
  });

  describe('Build Fit Scoring', () => {
    it('should apply bonus when joker fits detected build', () => {
      (buildDetectorServiceMock as any).primaryStrategy = signal({
        type: 'flush',
        confidence: 70,
        reasons: ['Suit concentration detected'],
      });

      const stateWithBuild = createMockGameState({
        shop: {
          items: [createMockShopItem({ id: 'tribe', name: 'The Tribe', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithBuild);
      const scoreWithBuildFit = service.scoreJoker('tribe');

      // Reset build detector
      (buildDetectorServiceMock as any).primaryStrategy = signal(null);
      service.updateState(stateWithBuild);
      const scoreWithoutBuild = service.scoreJoker('tribe');

      // Flush joker should score higher when flush build is detected
      expect(scoreWithBuildFit).toBeGreaterThan(scoreWithoutBuild);
    });

    it('should use builds object from jokers-complete.json', () => {
      // Triboulet has high face_cards build affinity (100)
      (buildDetectorServiceMock as any).primaryStrategy = signal({
        type: 'face_cards',
        confidence: 80,
        reasons: ['Face card synergies detected'],
      });

      const stateWithFaceBuild = createMockGameState({
        shop: {
          items: [createMockShopItem({ id: 'triboulet', name: 'Triboulet', cost: 20 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(stateWithFaceBuild);
      const recommendations = service.getShopRecommendations();
      const tribouletRec = recommendations.find(r => r.item.id === 'triboulet');

      // Should have build fit reason
      expect(tribouletRec?.reasons.some(r =>
        r.toLowerCase().includes('build') || r.toLowerCase().includes('face')
      )).toBeTrue();
    });
  });

  describe('Score Formula Validation', () => {
    it('should clamp final score between 0 and 100', () => {
      // Create conditions for very low score
      const terribleState = createMockGameState({
        progress: { ante: 8, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 5 },
        jokers: [
          createMockJokerState({ id: 'drivers_license', name: "Driver's License" }),
        ],
        blind: {
          type: 'boss',
          name: 'The Plant',
          chipGoal: 100000,
          chipsScored: 0,
          isBoss: true,
          effect: 'All face cards are debuffed',
        },
        shop: {
          items: [createMockShopItem({ id: 'egg', name: 'Egg', cost: 4 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(terribleState);
      const lowScore = service.scoreJoker('egg');

      expect(lowScore).toBeGreaterThanOrEqual(0);
      expect(lowScore).toBeLessThanOrEqual(100);
    });

    it('should follow the score calculation formula from spec', () => {
      // BaseScore = TIER_SCORES[tierByAnte[phase]]
      // SynergyBonus = sum of synergies (capped)
      // BuildFitBonus = joker.builds[detectedBuild] * 0.3
      // BossPreparation = +20 for counter, -10 for weakness
      // EconomyPenalty = if purchase drops below $25

      // FINAL = clamp(0, 100, Base + Synergy + BuildFit + Boss - Economy)

      // This is a sanity check that the formula is implemented
      const mockState = createMockGameState({
        progress: { ante: 3, round: 1, phase: 'shop', handsRemaining: 4, discardsRemaining: 3, money: 50 },
        shop: {
          items: [createMockShopItem({ id: 'blueprint', name: 'Blueprint', cost: 10 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(mockState);

      const score = service.scoreJoker('blueprint');

      // Blueprint is S-tier in mid game, should score 85+
      expect(score).toBeGreaterThanOrEqual(85);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Recommendations Sorting', () => {
    it('should return shop items sorted by score descending', () => {
      const mockState = createMockGameState({
        shop: {
          items: [
            createMockShopItem({ id: 'egg', name: 'Egg', cost: 4 }),
            createMockShopItem({ id: 'blueprint', name: 'Blueprint', cost: 10 }),
            createMockShopItem({ id: 'joker', name: 'Joker', cost: 2 }),
          ],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(mockState);

      const recommendations = service.getShopRecommendations();

      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].score).toBeGreaterThanOrEqual(recommendations[i].score);
      }
    });

    it('should include synergy reasons in recommendation', () => {
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

      const mockState = createMockGameState({
        jokers: [createMockJokerState({ id: 'triboulet', name: 'Triboulet' })],
        shop: {
          items: [createMockShopItem({ id: 'baron', name: 'Baron', cost: 8 })],
          rerollCost: 5,
          rerollsUsed: 0,
        },
      });
      service.updateState(mockState);

      const recommendations = service.getShopRecommendations();
      const baronRec = recommendations.find(r => r.item.id === 'baron');

      expect(baronRec?.synergiesWithOwned.length).toBeGreaterThan(0);
    });
  });
});
