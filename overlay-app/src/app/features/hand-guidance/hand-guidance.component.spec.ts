import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { HandGuidanceComponent } from './hand-guidance.component';
import { HandAnalyzerService, HandAnalysis, AnalyzedCard } from './services/hand-analyzer.service';
import { GameStateService } from '../../core/services/game-state.service';
import { Card, BlindState, Suit, Rank, HandType } from '../../../../../shared/models';
import { StrategyType } from '../../../../../shared/models';

describe('HandGuidanceComponent', () => {
  let component: HandGuidanceComponent;
  let fixture: ComponentFixture<HandGuidanceComponent>;
  let handAnalyzerMock: jasmine.SpyObj<HandAnalyzerService>;
  let gameStateMock: jasmine.SpyObj<GameStateService>;
  let analysisSignal: ReturnType<typeof signal<HandAnalysis | null>>;
  let blindSignal: ReturnType<typeof signal<BlindState | null>>;

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

  function createAnalyzedCard(
    card: Card,
    action: 'play' | 'keep' | 'discard',
    reason: string,
    isPartOfBestHand: boolean
  ): AnalyzedCard {
    return { card, action, reason, isPartOfBestHand };
  }

  function createHandAnalysis(overrides: Partial<HandAnalysis> = {}): HandAnalysis {
    const defaultCards = [
      createCard('h1', 'hearts', 'A'),
      createCard('h2', 'hearts', 'K'),
      createCard('h3', 'hearts', 'Q'),
      createCard('h4', 'hearts', '9'),
      createCard('h5', 'hearts', '5'),
    ];

    return {
      bestHand: {
        handType: 'flush',
        handTypeLabel: 'Flush',
        cards: defaultCards,
        projectedScore: 2450,
        beatsBlind: true,
        margin: 650,
      },
      analyzedCards: defaultCards.map(c =>
        createAnalyzedCard(c, 'play', 'Part of your best hand', true)
      ),
      cardsToPlay: defaultCards.map(c =>
        createAnalyzedCard(c, 'play', 'Part of your best hand', true)
      ),
      cardsToDiscard: [],
      cardsToKeep: [],
      buildContext: {
        buildType: 'flush',
        buildName: 'Flush',
      },
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

  beforeEach(async () => {
    analysisSignal = signal<HandAnalysis | null>(null);
    blindSignal = signal<BlindState | null>(null);

    handAnalyzerMock = jasmine.createSpyObj('HandAnalyzerService', [], {
      analysis: analysisSignal.asReadonly(),
    });

    gameStateMock = jasmine.createSpyObj('GameStateService', [], {
      blind: blindSignal.asReadonly(),
    });

    await TestBed.configureTestingModule({
      imports: [HandGuidanceComponent],
      providers: [
        { provide: HandAnalyzerService, useValue: handAnalyzerMock },
        { provide: GameStateService, useValue: gameStateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HandGuidanceComponent);
    component = fixture.componentInstance;
  });

  describe('empty state', () => {
    it('should show empty state when no analysis available', () => {
      analysisSignal.set(null);
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
    });

    it('should display appropriate message in empty state', () => {
      analysisSignal.set(null);
      fixture.detectChanges();

      const emptyText = fixture.nativeElement.textContent;
      expect(emptyText.toLowerCase()).toContain('no cards');
    });
  });

  describe('best hand display', () => {
    beforeEach(() => {
      analysisSignal.set(createHandAnalysis());
      blindSignal.set(createBlind(1800));
      fixture.detectChanges();
    });

    it('should display best hand type label', () => {
      const handType = fixture.debugElement.query(By.css('.hand-type'));
      expect(handType).toBeTruthy();
      expect(handType.nativeElement.textContent).toContain('Flush');
    });

    it('should display cards in best hand', () => {
      const bestCards = fixture.debugElement.query(By.css('.best-hand-cards'));
      expect(bestCards).toBeTruthy();

      const cardDisplays = fixture.debugElement.queryAll(By.css('.best-hand-cards .card-display'));
      expect(cardDisplays.length).toBe(5);
    });

    it('should display projected score', () => {
      const scoreValue = fixture.debugElement.query(By.css('.score-value'));
      expect(scoreValue).toBeTruthy();
      expect(scoreValue.nativeElement.textContent).toContain('2');
    });

    it('should display card suit symbols', () => {
      const cardDisplays = fixture.debugElement.queryAll(By.css('.best-hand-cards .card-display'));
      const firstCardText = cardDisplays[0].nativeElement.textContent;
      // Should contain heart symbol (Unicode)
      expect(firstCardText).toMatch(/[\u2660\u2663\u2665\u2666]/);
    });
  });

  describe('blind comparison', () => {
    it('should show checkmark when beats blind', () => {
      analysisSignal.set(createHandAnalysis({
        bestHand: {
          handType: 'flush',
          handTypeLabel: 'Flush',
          cards: [],
          projectedScore: 2450,
          beatsBlind: true,
          margin: 650,
        },
      }));
      blindSignal.set(createBlind(1800));
      fixture.detectChanges();

      const beatsIndicator = fixture.debugElement.query(By.css('.result-indicator.beats'));
      expect(beatsIndicator).toBeTruthy();
      expect(beatsIndicator.nativeElement.textContent).toContain('BEATS');
    });

    it('should show X when does not beat blind', () => {
      analysisSignal.set(createHandAnalysis({
        bestHand: {
          handType: 'high_card',
          handTypeLabel: 'High Card',
          cards: [],
          projectedScore: 42,
          beatsBlind: false,
          margin: -1758,
        },
      }));
      blindSignal.set(createBlind(1800));
      fixture.detectChanges();

      const failsIndicator = fixture.debugElement.query(By.css('.result-indicator.fails'));
      expect(failsIndicator).toBeTruthy();
      expect(failsIndicator.nativeElement.textContent).toContain('SHORT');
    });

    it('should display margin when beats blind', () => {
      analysisSignal.set(createHandAnalysis({
        bestHand: {
          handType: 'flush',
          handTypeLabel: 'Flush',
          cards: [],
          projectedScore: 2450,
          beatsBlind: true,
          margin: 650,
        },
      }));
      blindSignal.set(createBlind(1800));
      fixture.detectChanges();

      const resultText = fixture.debugElement.query(By.css('.result-indicator')).nativeElement.textContent;
      expect(resultText).toContain('+');
      expect(resultText).toContain('650');
    });

    it('should display blind goal', () => {
      analysisSignal.set(createHandAnalysis());
      blindSignal.set(createBlind(1800));
      fixture.detectChanges();

      const blindLabel = fixture.debugElement.query(By.css('.blind-label'));
      expect(blindLabel).toBeTruthy();
      // Blind goal is formatted as 1.8K for thousands
      expect(blindLabel.nativeElement.textContent).toContain('1.8K');
    });
  });

  describe('discard recommendations', () => {
    it('should display discard section when cards to discard exist', () => {
      const discardCards = [
        createCard('s1', 'spades', '7'),
        createCard('c1', 'clubs', '3'),
      ];

      analysisSignal.set(createHandAnalysis({
        cardsToDiscard: [
          createAnalyzedCard(discardCards[0], 'discard', 'Off-suit for Hearts flush', false),
          createAnalyzedCard(discardCards[1], 'discard', 'Off-suit for Hearts flush', false),
        ],
      }));
      fixture.detectChanges();

      const discardSection = fixture.debugElement.query(By.css('.discard-section'));
      expect(discardSection).toBeTruthy();
    });

    it('should display discard reasons', () => {
      const discardCard = createCard('s1', 'spades', '7');

      analysisSignal.set(createHandAnalysis({
        cardsToDiscard: [
          createAnalyzedCard(discardCard, 'discard', 'Off-suit for Hearts flush', false),
        ],
      }));
      fixture.detectChanges();

      const reason = fixture.debugElement.query(By.css('.discard-section .reason'));
      expect(reason).toBeTruthy();
      expect(reason.nativeElement.textContent).toContain('Off-suit');
    });

    it('should display card symbols in discard list', () => {
      const discardCard = createCard('s1', 'spades', '7');

      analysisSignal.set(createHandAnalysis({
        cardsToDiscard: [
          createAnalyzedCard(discardCard, 'discard', 'Off-suit', false),
        ],
      }));
      fixture.detectChanges();

      const cardDisplay = fixture.debugElement.query(By.css('.discard-section .card-display'));
      expect(cardDisplay).toBeTruthy();
      expect(cardDisplay.nativeElement.textContent).toContain('7');
    });
  });

  describe('keep recommendations', () => {
    it('should display keep section when cards to keep exist', () => {
      const keepCard = createCard('h6', 'hearts', '7');

      analysisSignal.set(createHandAnalysis({
        cardsToKeep: [
          createAnalyzedCard(keepCard, 'keep', 'Matches your Flush build', false),
        ],
      }));
      fixture.detectChanges();

      const keepSection = fixture.debugElement.query(By.css('.keep-section'));
      expect(keepSection).toBeTruthy();
    });

    it('should display keep reasons grouped', () => {
      const keepCards = [
        createCard('h6', 'hearts', '7'),
        createCard('h7', 'hearts', '4'),
      ];

      analysisSignal.set(createHandAnalysis({
        cardsToKeep: [
          createAnalyzedCard(keepCards[0], 'keep', 'Matches your Flush build', false),
          createAnalyzedCard(keepCards[1], 'keep', 'Matches your Flush build', false),
        ],
      }));
      fixture.detectChanges();

      const reasons = fixture.debugElement.queryAll(By.css('.keep-reasons .reason'));
      // Should be deduplicated to one reason
      expect(reasons.length).toBe(1);
    });

    it('should display cards to keep', () => {
      const keepCard = createCard('h6', 'hearts', '7');

      analysisSignal.set(createHandAnalysis({
        cardsToKeep: [
          createAnalyzedCard(keepCard, 'keep', 'Matches build', false),
        ],
      }));
      fixture.detectChanges();

      const keepCards = fixture.debugElement.query(By.css('.keep-cards'));
      expect(keepCards).toBeTruthy();

      const cardDisplays = fixture.debugElement.queryAll(By.css('.keep-cards .card-display'));
      expect(cardDisplays.length).toBe(1);
    });
  });

  describe('no recommendations state', () => {
    it('should show play message when no discards or keeps', () => {
      analysisSignal.set(createHandAnalysis({
        cardsToDiscard: [],
        cardsToKeep: [],
      }));
      fixture.detectChanges();

      const noRecs = fixture.debugElement.query(By.css('.no-recommendations'));
      expect(noRecs).toBeTruthy();
      expect(noRecs.nativeElement.textContent.toLowerCase()).toContain('play');
    });
  });

  describe('build context', () => {
    it('should display build context when build detected', () => {
      analysisSignal.set(createHandAnalysis({
        buildContext: {
          buildType: 'flush',
          buildName: 'Flush',
        },
      }));
      fixture.detectChanges();

      const buildContext = fixture.debugElement.query(By.css('.build-context'));
      expect(buildContext).toBeTruthy();
      expect(buildContext.nativeElement.textContent).toContain('Flush');
    });

    it('should not display build context when no build', () => {
      analysisSignal.set(createHandAnalysis({
        buildContext: {
          buildType: null,
          buildName: 'No build detected',
        },
      }));
      fixture.detectChanges();

      const buildContext = fixture.debugElement.query(By.css('.build-context'));
      expect(buildContext).toBeFalsy();
    });
  });

  describe('score formatting', () => {
    it('should format large scores with K suffix', () => {
      analysisSignal.set(createHandAnalysis({
        bestHand: {
          handType: 'flush',
          handTypeLabel: 'Flush',
          cards: [],
          projectedScore: 15000,
          beatsBlind: true,
          margin: 5000,
        },
      }));
      blindSignal.set(createBlind(10000));
      fixture.detectChanges();

      const scoreValue = fixture.debugElement.query(By.css('.score-value'));
      expect(scoreValue.nativeElement.textContent).toContain('K');
    });

    it('should format very large scores with M suffix', () => {
      analysisSignal.set(createHandAnalysis({
        bestHand: {
          handType: 'flush_five',
          handTypeLabel: 'Flush Five',
          cards: [],
          projectedScore: 2500000,
          beatsBlind: true,
          margin: 1500000,
        },
      }));
      blindSignal.set(createBlind(1000000));
      fixture.detectChanges();

      const scoreValue = fixture.debugElement.query(By.css('.score-value'));
      expect(scoreValue.nativeElement.textContent).toContain('M');
    });
  });

  describe('suit colors', () => {
    it('should apply red color class to hearts', () => {
      const heartsCard = createCard('h1', 'hearts', 'A');

      analysisSignal.set(createHandAnalysis({
        bestHand: {
          handType: 'high_card',
          handTypeLabel: 'High Card',
          cards: [heartsCard],
          projectedScore: 100,
          beatsBlind: false,
          margin: -100,
        },
      }));
      fixture.detectChanges();

      const cardDisplay = fixture.debugElement.query(By.css('.best-hand-cards .card-display'));
      expect(cardDisplay.classes['suit-red']).toBe(true);
    });

    it('should apply black color class to spades', () => {
      const spadesCard = createCard('s1', 'spades', 'A');

      analysisSignal.set(createHandAnalysis({
        bestHand: {
          handType: 'high_card',
          handTypeLabel: 'High Card',
          cards: [spadesCard],
          projectedScore: 100,
          beatsBlind: false,
          margin: -100,
        },
      }));
      fixture.detectChanges();

      const cardDisplay = fixture.debugElement.query(By.css('.best-hand-cards .card-display'));
      expect(cardDisplay.classes['suit-black']).toBe(true);
    });
  });

  describe('component methods', () => {
    it('getSuitSymbol should return correct symbol for hearts', () => {
      const card = createCard('h1', 'hearts', 'A');
      const symbol = component.getSuitSymbol(card);
      expect(symbol).toBe('\u2665');
    });

    it('getSuitSymbol should return correct symbol for spades', () => {
      const card = createCard('s1', 'spades', 'A');
      const symbol = component.getSuitSymbol(card);
      expect(symbol).toBe('\u2660');
    });

    it('formatScore should handle negative numbers', () => {
      const formatted = component.formatScore(-1758);
      // Negative thousands are formatted with K suffix
      expect(formatted).toBe('-1.8K');
    });

    it('formatScore should format thousands', () => {
      const formatted = component.formatScore(2500);
      expect(formatted).toBe('2.5K');
    });

    it('getKeepReasonsGrouped should deduplicate reasons', () => {
      const keepCards = [
        createCard('h6', 'hearts', '7'),
        createCard('h7', 'hearts', '4'),
        createCard('h8', 'hearts', '2'),
      ];

      analysisSignal.set(createHandAnalysis({
        cardsToKeep: [
          createAnalyzedCard(keepCards[0], 'keep', 'Same reason', false),
          createAnalyzedCard(keepCards[1], 'keep', 'Same reason', false),
          createAnalyzedCard(keepCards[2], 'keep', 'Different reason', false),
        ],
      }));

      const reasons = component.getKeepReasonsGrouped();
      expect(reasons.length).toBe(2);
      expect(reasons).toContain('Same reason');
      expect(reasons).toContain('Different reason');
    });
  });

  describe('change detection', () => {
    it('should update when analysis changes', () => {
      // Start with flush
      analysisSignal.set(createHandAnalysis({
        bestHand: {
          handType: 'flush',
          handTypeLabel: 'Flush',
          cards: [],
          projectedScore: 2450,
          beatsBlind: true,
          margin: 650,
        },
      }));
      fixture.detectChanges();

      let handType = fixture.debugElement.query(By.css('.hand-type'));
      expect(handType.nativeElement.textContent).toContain('Flush');

      // Change to pair
      analysisSignal.set(createHandAnalysis({
        bestHand: {
          handType: 'pair',
          handTypeLabel: 'Pair',
          cards: [],
          projectedScore: 800,
          beatsBlind: false,
          margin: -1000,
        },
      }));
      fixture.detectChanges();

      handType = fixture.debugElement.query(By.css('.hand-type'));
      expect(handType.nativeElement.textContent).toContain('Pair');
    });
  });
});
