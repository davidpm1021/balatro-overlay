import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HandAnalyzerService, HandAnalysis, AnalyzedCard } from './hand-analyzer.service';
import { HandCalculatorService, HandDetectionResult } from '../../score-preview/services/hand-calculator.service';
import { ScoreEngineService } from '../../../core/services/score-engine.service';
import { BuildDetectorService, DetectedBuild } from '../../strategy-intelligence/services/build-detector.service';
import { GameStateService } from '../../../core/services/game-state.service';
import {
  Card,
  BlindState,
  HandType,
  HandLevel,
  JokerState,
  ScoreBreakdown,
  Suit,
  Rank,
} from '../../../../../../shared/models';
import { DetectedStrategy, StrategyType } from '../../../../../../shared/models';

describe('HandAnalyzerService', () => {
  let service: HandAnalyzerService;
  let gameStateMock: jasmine.SpyObj<GameStateService>;
  let handCalculatorMock: jasmine.SpyObj<HandCalculatorService>;
  let scoreEngineMock: jasmine.SpyObj<ScoreEngineService>;
  let buildDetectorMock: jasmine.SpyObj<BuildDetectorService>;

  let handSignal: ReturnType<typeof signal<Card[]>>;
  let blindSignal: ReturnType<typeof signal<BlindState | null>>;
  let handLevelsSignal: ReturnType<typeof signal<HandLevel[]>>;
  let jokersSignal: ReturnType<typeof signal<JokerState[]>>;
  let detectedBuildSignal: ReturnType<typeof signal<DetectedBuild>>;
  let discardsRemainingSignal: ReturnType<typeof signal<number>>;
  let handsRemainingSignal: ReturnType<typeof signal<number>>;
  let moneySignal: ReturnType<typeof signal<number>>;

  function createCard(
    id: string,
    suit: Suit,
    rank: Rank,
    overrides: Partial<Card> = {}
  ): Card {
    return {
      id,
      suit,
      rank,
      enhancement: 'none',
      edition: 'none',
      seal: 'none',
      chipValue: 0,
      debuffed: false,
      faceDown: false,
      ...overrides,
    };
  }

  function createBlind(chipGoal: number): BlindState {
    return {
      type: 'small',
      name: 'Small Blind',
      chipGoal,
      chipsScored: 0,
      isBoss: false,
    };
  }

  function createDetectedStrategy(
    type: StrategyType,
    confidence: number,
    suit?: Suit
  ): DetectedStrategy {
    return {
      type,
      confidence,
      viability: 80,
      requirements: [],
      currentStrength: 60,
      keyJokers: [],
      suit,
    };
  }

  function createScoreBreakdown(finalScore: number, blindGoal: number): ScoreBreakdown {
    return {
      handType: 'flush',
      handLevel: 1,
      baseChips: 35,
      baseMult: 4,
      cardChips: 50,
      jokerEffects: [],
      totalChips: 85,
      totalMult: 4,
      finalScore,
      blindGoal,
      willBeat: finalScore >= blindGoal,
      margin: finalScore - blindGoal,
    };
  }

  beforeEach(() => {
    handSignal = signal<Card[]>([]);
    blindSignal = signal<BlindState | null>(null);
    handLevelsSignal = signal<HandLevel[]>([]);
    jokersSignal = signal<JokerState[]>([]);
    discardsRemainingSignal = signal<number>(3);
    handsRemainingSignal = signal<number>(4);
    moneySignal = signal<number>(10);
    detectedBuildSignal = signal<DetectedBuild>({
      primary: null,
      secondary: undefined,
      isHybrid: false,
    });

    gameStateMock = jasmine.createSpyObj('GameStateService', [], {
      hand: handSignal.asReadonly(),
      blind: blindSignal.asReadonly(),
      handLevels: handLevelsSignal.asReadonly(),
      jokers: jokersSignal.asReadonly(),
      discardsRemaining: discardsRemainingSignal.asReadonly(),
      handsRemaining: handsRemainingSignal.asReadonly(),
      money: moneySignal.asReadonly(),
    });

    handCalculatorMock = jasmine.createSpyObj('HandCalculatorService', [
      'detectHandType',
      'calculateScore',
    ]);

    scoreEngineMock = jasmine.createSpyObj('ScoreEngineService', [
      'calculateScore',
    ]);

    buildDetectorMock = jasmine.createSpyObj('BuildDetectorService', [], {
      detectedBuild: detectedBuildSignal.asReadonly(),
    });

    TestBed.configureTestingModule({
      providers: [
        HandAnalyzerService,
        { provide: GameStateService, useValue: gameStateMock },
        { provide: HandCalculatorService, useValue: handCalculatorMock },
        { provide: ScoreEngineService, useValue: scoreEngineMock },
        { provide: BuildDetectorService, useValue: buildDetectorMock },
      ],
    });

    service = TestBed.inject(HandAnalyzerService);
  });

  describe('best hand detection', () => {
    it('should detect flush as best hand when 5 hearts are present', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('h2', 'hearts', 'K'),
        createCard('h3', 'hearts', 'Q'),
        createCard('h4', 'hearts', '9'),
        createCard('h5', 'hearts', '5'),
      ];

      const flushResult: HandDetectionResult = {
        handType: 'flush',
        scoringCards: hand,
      };

      handCalculatorMock.detectHandType.and.returnValue(flushResult);
      scoreEngineMock.calculateScore.and.returnValue(2450);

      handSignal.set(hand);
      blindSignal.set(createBlind(1800));

      const analysis = service.analyzeHand(hand, createBlind(1800), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      expect(analysis.bestHand.handType).toBe('flush');
      expect(analysis.bestHand.handTypeLabel).toBe('Flush');
      expect(analysis.bestHand.cards.length).toBe(5);
    });

    it('should detect pair as best hand when only pair is available', () => {
      const hand = [
        createCard('c1', 'hearts', 'K'),
        createCard('c2', 'spades', 'K'),
        createCard('c3', 'diamonds', '7'),
        createCard('c4', 'clubs', '3'),
        createCard('c5', 'hearts', '2'),
      ];

      const pairCards = [hand[0], hand[1]];
      const pairResult: HandDetectionResult = {
        handType: 'pair',
        scoringCards: pairCards,
      };

      handCalculatorMock.detectHandType.and.returnValue(pairResult);
      scoreEngineMock.calculateScore.and.returnValue(800);

      const analysis = service.analyzeHand(hand, createBlind(1200), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      expect(analysis.bestHand.handType).toBe('pair');
      expect(analysis.bestHand.handTypeLabel).toBe('Pair');
    });

    it('should select best combination from more than 5 cards', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('h2', 'hearts', 'K'),
        createCard('h3', 'hearts', 'Q'),
        createCard('h4', 'hearts', '9'),
        createCard('h5', 'hearts', '5'),
        createCard('s6', 'spades', '7'),
        createCard('d7', 'diamonds', '3'),
      ];

      // When called with flush combination
      handCalculatorMock.detectHandType.and.callFake((cards: Card[]) => {
        const hasAllHearts = cards.every(c => c.suit === 'hearts');
        if (hasAllHearts && cards.length === 5) {
          return { handType: 'flush' as HandType, scoringCards: cards };
        }
        return { handType: 'high_card' as HandType, scoringCards: [cards[0]] };
      });

      scoreEngineMock.calculateScore.and.returnValue(2450);

      const analysis = service.analyzeHand(hand, createBlind(1800), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      expect(analysis.bestHand.handType).toBe('flush');
    });
  });

  describe('blind comparison', () => {
    it('should indicate beats blind when score exceeds goal', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('h2', 'hearts', 'K'),
        createCard('h3', 'hearts', 'Q'),
        createCard('h4', 'hearts', '9'),
        createCard('h5', 'hearts', '5'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'flush',
        scoringCards: hand,
      });
      scoreEngineMock.calculateScore.and.returnValue(2450);

      const analysis = service.analyzeHand(hand, createBlind(1800), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      expect(analysis.bestHand.beatsBlind).toBe(true);
      expect(analysis.bestHand.margin).toBe(650);
    });

    it('should indicate does not beat blind when score is insufficient', () => {
      const hand = [
        createCard('c1', 'hearts', '5'),
        createCard('c2', 'spades', '3'),
        createCard('c3', 'diamonds', '7'),
        createCard('c4', 'clubs', '2'),
        createCard('c5', 'hearts', '4'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [hand[2]], // 7 is highest
      });
      scoreEngineMock.calculateScore.and.returnValue(42);

      const analysis = service.analyzeHand(hand, createBlind(1800), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      expect(analysis.bestHand.beatsBlind).toBe(false);
      expect(analysis.bestHand.margin).toBe(-1758);
    });

    it('should handle null blind gracefully', () => {
      const hand = [createCard('h1', 'hearts', 'A')];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: hand,
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const analysis = service.analyzeHand(hand, null, {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      expect(analysis.bestHand.beatsBlind).toBe(true);
      expect(analysis.bestHand.margin).toBe(100);
    });
  });

  describe('discard recommendations', () => {
    it('should recommend discarding off-suit cards for flush build', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('h2', 'hearts', 'K'),
        createCard('h3', 'hearts', 'Q'),
        createCard('h4', 'hearts', '9'),
        createCard('h5', 'hearts', '5'),
        createCard('s1', 'spades', '7'),
        createCard('c1', 'clubs', '3'),
      ];

      const flushCards = hand.slice(0, 5);

      handCalculatorMock.detectHandType.and.callFake((cards: Card[]) => {
        const heartsCount = cards.filter(c => c.suit === 'hearts').length;
        if (heartsCount >= 5) {
          return { handType: 'flush' as HandType, scoringCards: cards.filter(c => c.suit === 'hearts').slice(0, 5) };
        }
        return { handType: 'high_card' as HandType, scoringCards: [cards[0]] };
      });
      scoreEngineMock.calculateScore.and.returnValue(2450);

      const flushBuild = createDetectedStrategy('flush', 80, 'hearts');
      const analysis = service.analyzeHand(hand, createBlind(1800), {
        primary: flushBuild,
        secondary: undefined,
        isHybrid: false,
      });

      const discards = analysis.cardsToDiscard;
      expect(discards.length).toBe(2);
      expect(discards.some(d => d.card.id === 's1')).toBe(true);
      expect(discards.some(d => d.card.id === 'c1')).toBe(true);
      expect(discards[0].reason).toContain('Off-suit');
      expect(discards[0].reason).toContain('Hearts');
    });

    it('should recommend discarding non-face cards for face card build', () => {
      const hand = [
        createCard('h1', 'hearts', 'K'),
        createCard('h2', 'spades', 'Q'),
        createCard('h3', 'diamonds', 'J'),
        createCard('c1', 'clubs', '5'),
        createCard('c2', 'hearts', '3'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [hand[0]],
      });
      scoreEngineMock.calculateScore.and.returnValue(200);

      const faceBuild = createDetectedStrategy('face_cards', 70);
      const analysis = service.analyzeHand(hand, createBlind(1200), {
        primary: faceBuild,
        secondary: undefined,
        isHybrid: false,
      });

      const discards = analysis.cardsToDiscard;
      const discardIds = discards.map(d => d.card.id);

      expect(discardIds).toContain('c1');
      expect(discardIds).toContain('c2');
      expect(discards.some(d => d.reason.includes('Not a face card'))).toBe(true);
    });

    it('should provide generic reason when no build detected', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('s1', 'spades', '7'),
        createCard('d1', 'diamonds', '3'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [hand[0]],
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      const discards = analysis.cardsToDiscard;
      expect(discards.length).toBe(2);
      expect(discards.some(d => d.reason.includes('Not part of best'))).toBe(true);
    });
  });

  describe('keep recommendations', () => {
    it('should recommend keeping cards with enhancements', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('e1', 'spades', '5', { enhancement: 'mult' }),
        createCard('d1', 'diamonds', '3'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [hand[0]],
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      const keeps = analysis.cardsToKeep;
      expect(keeps.some(k => k.card.id === 'e1')).toBe(true);
      expect(keeps.find(k => k.card.id === 'e1')?.reason).toContain('mult');
      expect(keeps.find(k => k.card.id === 'e1')?.reason).toContain('enhancement');
    });

    it('should recommend keeping cards with editions', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('e1', 'spades', '5', { edition: 'foil' }),
        createCard('d1', 'diamonds', '3'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [hand[0]],
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      const keeps = analysis.cardsToKeep;
      expect(keeps.some(k => k.card.id === 'e1')).toBe(true);
      expect(keeps.find(k => k.card.id === 'e1')?.reason).toContain('foil');
      expect(keeps.find(k => k.card.id === 'e1')?.reason).toContain('edition');
    });

    it('should recommend keeping cards with seals', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('s1', 'spades', '5', { seal: 'gold' }),
        createCard('d1', 'diamonds', '3'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [hand[0]],
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      const keeps = analysis.cardsToKeep;
      expect(keeps.some(k => k.card.id === 's1')).toBe(true);
      expect(keeps.find(k => k.card.id === 's1')?.reason).toContain('gold');
      expect(keeps.find(k => k.card.id === 's1')?.reason).toContain('seal');
    });

    it('should recommend keeping cards matching build', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('h2', 'hearts', '7'),
        createCard('s1', 'spades', '3'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [hand[0]],
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const flushBuild = createDetectedStrategy('flush', 70, 'hearts');
      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: flushBuild,
        secondary: undefined,
        isHybrid: false,
      });

      const keeps = analysis.cardsToKeep;
      // h2 should be kept because it matches the hearts flush build
      expect(keeps.some(k => k.card.id === 'h2')).toBe(true);
      expect(keeps.find(k => k.card.id === 'h2')?.reason).toContain('Flush');
    });

    it('should recommend keeping high value cards', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('s1', 'spades', 'K'),
        createCard('d1', 'diamonds', '3'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [hand[0]],
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      // King should be kept as high value
      const keeps = analysis.cardsToKeep;
      expect(keeps.some(k => k.card.id === 's1')).toBe(true);
      expect(keeps.find(k => k.card.id === 's1')?.reason).toContain('High value');
    });
  });

  describe('build context integration', () => {
    it('should include build context in analysis', () => {
      const hand = [createCard('h1', 'hearts', 'A')];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: hand,
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const flushBuild = createDetectedStrategy('flush', 80, 'hearts');
      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: flushBuild,
        secondary: undefined,
        isHybrid: false,
      });

      expect(analysis.buildContext.buildType).toBe('flush');
      expect(analysis.buildContext.buildName).toBe('Flush');
    });

    it('should handle no build detected', () => {
      const hand = [createCard('h1', 'hearts', 'A')];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: hand,
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      expect(analysis.buildContext.buildType).toBeNull();
      expect(analysis.buildContext.buildName).toBe('No build detected');
    });
  });

  describe('card categorization', () => {
    it('should categorize all hand cards', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('h2', 'hearts', 'K'),
        createCard('s1', 'spades', '3'),
        createCard('d1', 'diamonds', '5'),
        createCard('c1', 'clubs', '7'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [hand[0]],
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      // Total categorized cards should equal hand size
      const totalCategorized =
        analysis.cardsToPlay.length +
        analysis.cardsToKeep.length +
        analysis.cardsToDiscard.length;

      expect(totalCategorized).toBe(hand.length);
      expect(analysis.analyzedCards.length).toBe(hand.length);
    });

    it('should mark cards in best hand as isPartOfBestHand', () => {
      const hand = [
        createCard('h1', 'hearts', 'A'),
        createCard('h2', 'hearts', 'K'),
        createCard('s1', 'spades', '3'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'pair',
        scoringCards: [hand[0], hand[1]],
      });
      scoreEngineMock.calculateScore.and.returnValue(200);

      const analysis = service.analyzeHand(hand, createBlind(500), {
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });

      const h1Analysis = analysis.analyzedCards.find(a => a.card.id === 'h1');
      const h2Analysis = analysis.analyzedCards.find(a => a.card.id === 'h2');
      const s1Analysis = analysis.analyzedCards.find(a => a.card.id === 's1');

      expect(h1Analysis?.isPartOfBestHand).toBe(true);
      expect(h2Analysis?.isPartOfBestHand).toBe(true);
      expect(s1Analysis?.isPartOfBestHand).toBe(false);
    });
  });

  describe('computed analysis signal', () => {
    it('should return null when hand is empty', () => {
      handSignal.set([]);

      const analysis = service.analysis();
      expect(analysis).toBeNull();
    });

    it('should update when hand changes', () => {
      const initialHand = [createCard('h1', 'hearts', 'A')];
      const newHand = [
        createCard('h1', 'hearts', 'A'),
        createCard('h2', 'hearts', 'K'),
      ];

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'high_card',
        scoringCards: [initialHand[0]],
      });
      scoreEngineMock.calculateScore.and.returnValue(100);

      handSignal.set(initialHand);
      const analysis1 = service.analysis();
      expect(analysis1?.analyzedCards.length).toBe(1);

      handCalculatorMock.detectHandType.and.returnValue({
        handType: 'pair',
        scoringCards: newHand,
      });

      handSignal.set(newHand);
      const analysis2 = service.analysis();
      expect(analysis2?.analyzedCards.length).toBe(2);
    });
  });
});
