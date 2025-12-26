import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeckTrackerComponent, CardLocation } from './deck-tracker.component';
import { GameStateService } from '../../core/services';
import { signal, WritableSignal } from '@angular/core';
import { DeckState, Card, Suit, Rank, DeckComposition } from '../../../../../shared/models';

describe('DeckTrackerComponent', () => {
  let component: DeckTrackerComponent;
  let fixture: ComponentFixture<DeckTrackerComponent>;
  let mockDeckSignal: WritableSignal<DeckState | null>;

  const createCard = (suit: Suit, rank: Rank): Card => ({
    id: `${suit}-${rank}`,
    suit,
    rank,
    enhancement: 'none',
    edition: 'none',
    seal: 'none',
    chipValue: 10,
    debuffed: false,
    faceDown: false
  });

  const createFullDeck = (): Card[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const cards: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push(createCard(suit, rank));
      }
    }
    return cards;
  };

  const emptyComposition: DeckComposition = {
    bySuit: { hearts: 0, diamonds: 0, clubs: 0, spades: 0 },
    byRank: { '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0, 'J': 0, 'Q': 0, 'K': 0, 'A': 0 },
    enhancements: { none: 0, bonus: 0, mult: 0, wild: 0, glass: 0, steel: 0, stone: 0, gold: 0, lucky: 0 },
    editions: { none: 0, foil: 0, holographic: 0, polychrome: 0, negative: 0 },
    seals: { none: 0, gold: 0, red: 0, blue: 0, purple: 0 }
  };

  const createDeckState = (partial: Partial<DeckState>): DeckState => ({
    remaining: [],
    hand: [],
    discarded: [],
    played: [],
    selected: [],
    totalCards: 52,
    cardsRemaining: 52,
    composition: emptyComposition,
    ...partial
  });

  beforeEach(async () => {
    mockDeckSignal = signal<DeckState | null>(null);

    const mockGameStateService = {
      deck: mockDeckSignal.asReadonly()
    };

    await TestBed.configureTestingModule({
      imports: [DeckTrackerComponent],
      providers: [
        { provide: GameStateService, useValue: mockGameStateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeckTrackerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have showDiscard as false initially', () => {
      fixture.detectChanges();
      expect(component.showDiscard()).toBe(false);
    });

    it('should have all four suits', () => {
      expect(component.suits).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
    });
  });

  describe('card counts', () => {
    it('should show 52/52 when deck is null', () => {
      fixture.detectChanges();
      expect(component.remainingCount()).toBe(52);
      expect(component.totalCount()).toBe(52);
    });

    it('should show correct remaining count from deck state', () => {
      mockDeckSignal.set(createDeckState({
        remaining: createFullDeck().slice(0, 40),
        cardsRemaining: 40
      }));
      fixture.detectChanges();

      expect(component.remainingCount()).toBe(40);
      expect(component.totalCount()).toBe(52);
    });

  });

  describe('toggle discard view', () => {
    it('should toggle showDiscard from false to true', () => {
      fixture.detectChanges();
      expect(component.showDiscard()).toBe(false);

      component.toggleDiscardView();
      expect(component.showDiscard()).toBe(true);
    });

    it('should toggle showDiscard from true to false', () => {
      fixture.detectChanges();
      component.toggleDiscardView();
      expect(component.showDiscard()).toBe(true);

      component.toggleDiscardView();
      expect(component.showDiscard()).toBe(false);
    });
  });

  describe('toggle button classes', () => {
    it('should have inactive classes when showDiscard is false', () => {
      fixture.detectChanges();
      const classes = component.toggleButtonClasses();

      expect(classes['toggle-btn']).toBe(true);
      expect(classes['toggle-btn-inactive']).toBe(true);
      expect(classes['toggle-btn-active']).toBe(false);
    });

    it('should have active classes when showDiscard is true', () => {
      fixture.detectChanges();
      component.toggleDiscardView();
      const classes = component.toggleButtonClasses();

      expect(classes['toggle-btn']).toBe(true);
      expect(classes['toggle-btn-active']).toBe(true);
      expect(classes['toggle-btn-inactive']).toBe(false);
    });
  });

  describe('cards by suit and rank', () => {
    it('should return empty arrays when deck is null', () => {
      fixture.detectChanges();
      const cardsBySuit = component.cardsBySuitAndRank();

      // When deck is null, arrays are initialized but empty
      expect(cardsBySuit.hearts.get('A')?.length).toBe(0);
      expect(cardsBySuit.diamonds.get('K')?.length).toBe(0);
    });

    it('should populate all 13 ranks per suit when deck state exists', () => {
      mockDeckSignal.set(createDeckState({
        remaining: createFullDeck()
      }));
      fixture.detectChanges();
      const cardsBySuit = component.cardsBySuitAndRank();

      expect(cardsBySuit.hearts.size).toBe(13);
      expect(cardsBySuit.diamonds.size).toBe(13);
      expect(cardsBySuit.clubs.size).toBe(13);
      expect(cardsBySuit.spades.size).toBe(13);

      // All should be in 'deck' location when full deck
      const aceOfHearts = cardsBySuit.hearts.get('A');
      expect(aceOfHearts?.length).toBe(1);
      expect(aceOfHearts?.[0].location).toBe('deck');
    });

    it('should mark cards in hand correctly', () => {
      mockDeckSignal.set(createDeckState({
        remaining: createFullDeck().filter(c => !(c.suit === 'hearts' && c.rank === 'A')),
        hand: [createCard('hearts', 'A')],
        cardsRemaining: 51
      }));
      fixture.detectChanges();

      const cardsBySuit = component.cardsBySuitAndRank();
      const aceOfHearts = cardsBySuit.hearts.get('A');
      expect(aceOfHearts?.length).toBe(1);
      expect(aceOfHearts?.[0].location).toBe('hand');
    });

    it('should mark cards in discard correctly', () => {
      mockDeckSignal.set(createDeckState({
        remaining: createFullDeck().filter(c => !(c.suit === 'spades' && c.rank === 'K')),
        discarded: [createCard('spades', 'K')],
        cardsRemaining: 51
      }));
      fixture.detectChanges();

      const cardsBySuit = component.cardsBySuitAndRank();
      const kingOfSpades = cardsBySuit.spades.get('K');
      expect(kingOfSpades?.length).toBe(1);
      expect(kingOfSpades?.[0].location).toBe('discarded');
    });

    it('should mark cards in play correctly', () => {
      mockDeckSignal.set(createDeckState({
        remaining: createFullDeck().filter(c => !(c.suit === 'diamonds' && c.rank === 'Q')),
        played: [createCard('diamonds', 'Q')],
        cardsRemaining: 51
      }));
      fixture.detectChanges();

      const cardsBySuit = component.cardsBySuitAndRank();
      const queenOfDiamonds = cardsBySuit.diamonds.get('Q');
      expect(queenOfDiamonds?.length).toBe(1);
      expect(queenOfDiamonds?.[0].location).toBe('played');
    });

    it('should track multiple cards with same rank+suit', () => {
      // Test case: two Aces of Hearts (one in hand, one in discard)
      const aceOfHearts1 = { ...createCard('hearts', 'A'), id: 'hearts-A-1' };
      const aceOfHearts2 = { ...createCard('hearts', 'A'), id: 'hearts-A-2' };
      mockDeckSignal.set(createDeckState({
        hand: [aceOfHearts1],
        discarded: [aceOfHearts2],
        cardsRemaining: 0
      }));
      fixture.detectChanges();

      const cardsBySuit = component.cardsBySuitAndRank();
      const acesOfHearts = cardsBySuit.hearts.get('A');
      expect(acesOfHearts?.length).toBe(2);
      expect(acesOfHearts?.some(c => c.location === 'hand')).toBe(true);
      expect(acesOfHearts?.some(c => c.location === 'discarded')).toBe(true);
    });
  });

  describe('cell selection', () => {
    beforeEach(() => {
      mockDeckSignal.set(createDeckState({
        remaining: createFullDeck()
      }));
      fixture.detectChanges();
    });

    it('should have no selection initially', () => {
      expect(component.selectedCell()).toBeNull();
    });

    it('should select a cell when clicked', () => {
      component.onCellClicked({ suit: 'hearts', rank: 'A' });
      expect(component.selectedCell()).toEqual({ suit: 'hearts', rank: 'A' });
    });

    it('should deselect when clicking the same cell', () => {
      component.onCellClicked({ suit: 'hearts', rank: 'A' });
      component.onCellClicked({ suit: 'hearts', rank: 'A' });
      expect(component.selectedCell()).toBeNull();
    });

    it('should switch selection when clicking a different cell', () => {
      component.onCellClicked({ suit: 'hearts', rank: 'A' });
      component.onCellClicked({ suit: 'spades', rank: 'K' });
      expect(component.selectedCell()).toEqual({ suit: 'spades', rank: 'K' });
    });

    it('should clear selection with clearSelection()', () => {
      component.onCellClicked({ suit: 'hearts', rank: 'A' });
      component.clearSelection();
      expect(component.selectedCell()).toBeNull();
    });

    it('should return selected cards for the selected cell', () => {
      component.onCellClicked({ suit: 'hearts', rank: 'A' });
      const selectedCards = component.selectedCards();
      expect(selectedCards.length).toBe(1);
      expect(selectedCards[0].suit).toBe('hearts');
      expect(selectedCards[0].rank).toBe('A');
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      mockDeckSignal.set(createDeckState({
        remaining: createFullDeck()
      }));
      fixture.detectChanges();
    });

    it('should display remaining/total count', () => {
      const countSpan = fixture.nativeElement.querySelector('.count');
      expect(countSpan.textContent).toContain('52');
      expect(countSpan.textContent).toContain('/52');
    });

    it('should render 4 suit columns', () => {
      const columns = fixture.nativeElement.querySelectorAll('app-suit-column');
      expect(columns.length).toBe(4);
    });

    it('should not show legend when showDiscard is false', () => {
      const legend = fixture.nativeElement.querySelector('.legend');
      expect(legend).toBeNull();
    });

    it('should show legend when showDiscard is true', () => {
      component.toggleDiscardView();
      fixture.detectChanges();

      const legend = fixture.nativeElement.querySelector('.legend');
      expect(legend).not.toBeNull();
      expect(legend.textContent).toContain('Disc');
      expect(legend.textContent).toContain('Hand');
      expect(legend.textContent).toContain('Play');
    });

    it('should show eye icon in button when toggled on', () => {
      mockDeckSignal.set(createDeckState({
        remaining: createFullDeck().slice(0, 47),
        discarded: [createCard('hearts', 'A'), createCard('hearts', 'K'), createCard('hearts', 'Q')],
        cardsRemaining: 47
      }));
      component.toggleDiscardView();
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      // Button now shows eye icon when active, circle when inactive
      expect(button.textContent).toContain('👁');
    });
  });
});
