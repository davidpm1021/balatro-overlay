import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeckTrackerComponent, CardLocation } from './deck-tracker.component';
import { GameStateService } from '../../core/services';
import { signal, WritableSignal } from '@angular/core';
import { DeckState, Card, Suit, Rank } from '../../../../../shared/models';

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
    chipValue: 10
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
      mockDeckSignal.set({
        remaining: createFullDeck().slice(0, 40),
        hand: [],
        discarded: [],
        played: [],
        totalCards: 52,
        cardsRemaining: 40
      });
      fixture.detectChanges();

      expect(component.remainingCount()).toBe(40);
      expect(component.totalCount()).toBe(52);
    });

    it('should show discarded count', () => {
      const discardedCards = [createCard('hearts', 'A'), createCard('spades', 'K')];
      mockDeckSignal.set({
        remaining: createFullDeck().slice(0, 50),
        hand: [],
        discarded: discardedCards,
        played: [],
        totalCards: 52,
        cardsRemaining: 50
      });
      fixture.detectChanges();

      expect(component.discardedCount()).toBe(2);
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

  describe('card locations by suit', () => {
    it('should return empty maps when deck is null', () => {
      fixture.detectChanges();
      const locations = component.cardLocationsBySuit();

      // When deck is null, maps are empty (no cards tracked yet)
      expect(locations.hearts.size).toBe(0);
      expect(locations.diamonds.size).toBe(0);
      expect(locations.clubs.size).toBe(0);
      expect(locations.spades.size).toBe(0);
    });

    it('should populate all 13 cards per suit when deck state exists', () => {
      mockDeckSignal.set({
        remaining: createFullDeck(),
        hand: [],
        discarded: [],
        played: [],
        totalCards: 52,
        cardsRemaining: 52
      });
      fixture.detectChanges();
      const locations = component.cardLocationsBySuit();

      expect(locations.hearts.size).toBe(13);
      expect(locations.diamonds.size).toBe(13);
      expect(locations.clubs.size).toBe(13);
      expect(locations.spades.size).toBe(13);

      // All should be 'deck' when full deck
      expect(locations.hearts.get('A')).toBe('deck');
    });

    it('should mark cards in hand correctly', () => {
      mockDeckSignal.set({
        remaining: createFullDeck().filter(c => !(c.suit === 'hearts' && c.rank === 'A')),
        hand: [createCard('hearts', 'A')],
        discarded: [],
        played: [],
        totalCards: 52,
        cardsRemaining: 51
      });
      fixture.detectChanges();

      const locations = component.cardLocationsBySuit();
      expect(locations.hearts.get('A')).toBe('hand');
    });

    it('should mark cards in discard correctly', () => {
      mockDeckSignal.set({
        remaining: createFullDeck().filter(c => !(c.suit === 'spades' && c.rank === 'K')),
        hand: [],
        discarded: [createCard('spades', 'K')],
        played: [],
        totalCards: 52,
        cardsRemaining: 51
      });
      fixture.detectChanges();

      const locations = component.cardLocationsBySuit();
      expect(locations.spades.get('K')).toBe('discarded');
    });

    it('should mark cards in play correctly', () => {
      mockDeckSignal.set({
        remaining: createFullDeck().filter(c => !(c.suit === 'diamonds' && c.rank === 'Q')),
        hand: [],
        discarded: [],
        played: [createCard('diamonds', 'Q')],
        totalCards: 52,
        cardsRemaining: 51
      });
      fixture.detectChanges();

      const locations = component.cardLocationsBySuit();
      expect(locations.diamonds.get('Q')).toBe('played');
    });

    it('should prioritize hand over discarded for same card', () => {
      // Edge case: if a card appears in both (shouldn't happen in game, but test the logic)
      const aceOfHearts = createCard('hearts', 'A');
      mockDeckSignal.set({
        remaining: [],
        hand: [aceOfHearts],
        discarded: [aceOfHearts], // Same card in both
        played: [],
        totalCards: 52,
        cardsRemaining: 0
      });
      fixture.detectChanges();

      const locations = component.cardLocationsBySuit();
      // Hand is applied last, so it should win
      expect(locations.hearts.get('A')).toBe('hand');
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      mockDeckSignal.set({
        remaining: createFullDeck(),
        hand: [],
        discarded: [],
        played: [],
        totalCards: 52,
        cardsRemaining: 52
      });
      fixture.detectChanges();
    });

    it('should display remaining/total count', () => {
      const countSpan = fixture.nativeElement.querySelector('.text-balatro-accent');
      expect(countSpan.textContent).toContain('52/52');
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
      expect(legend.textContent).toContain('Discarded');
      expect(legend.textContent).toContain('In Hand');
    });

    it('should show discard count in button when toggled on', () => {
      mockDeckSignal.set({
        remaining: createFullDeck().slice(0, 47),
        hand: [],
        discarded: [createCard('hearts', 'A'), createCard('hearts', 'K'), createCard('hearts', 'Q')],
        played: [],
        totalCards: 52,
        cardsRemaining: 47
      });
      component.toggleDiscardView();
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('3');
    });
  });
});
