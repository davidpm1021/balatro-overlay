import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuitColumnComponent } from './suit-column.component';
import { CardWithLocation, CardLocation } from '../deck-tracker.component';
import { Rank, Suit, Card } from '../../../../../../shared/models';

describe('SuitColumnComponent', () => {
  let component: SuitColumnComponent;
  let fixture: ComponentFixture<SuitColumnComponent>;

  const createCard = (suit: Suit, rank: Rank, location: CardLocation): CardWithLocation => ({
    id: `${suit}-${rank}`,
    suit,
    rank,
    enhancement: 'none',
    edition: 'none',
    seal: 'none',
    chipValue: 10,
    debuffed: false,
    faceDown: false,
    location
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuitColumnComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SuitColumnComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('suit', 'hearts');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('suit symbols', () => {
    it('should display heart symbol for hearts', () => {
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.detectChanges();

      expect(component.suitSymbol()).toBe('♥');
    });

    it('should display diamond symbol for diamonds', () => {
      fixture.componentRef.setInput('suit', 'diamonds');
      fixture.detectChanges();

      expect(component.suitSymbol()).toBe('♦');
    });

    it('should display club symbol for clubs', () => {
      fixture.componentRef.setInput('suit', 'clubs');
      fixture.detectChanges();

      expect(component.suitSymbol()).toBe('♣');
    });

    it('should display spade symbol for spades', () => {
      fixture.componentRef.setInput('suit', 'spades');
      fixture.detectChanges();

      expect(component.suitSymbol()).toBe('♠');
    });
  });

  describe('suit color classes', () => {
    it('should apply hearts color class', () => {
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.detectChanges();

      expect(component.suitColorClass()).toBe('text-suit-hearts');
    });

    it('should apply diamonds color class', () => {
      fixture.componentRef.setInput('suit', 'diamonds');
      fixture.detectChanges();

      expect(component.suitColorClass()).toBe('text-suit-diamonds');
    });

    it('should apply clubs color class', () => {
      fixture.componentRef.setInput('suit', 'clubs');
      fixture.detectChanges();

      expect(component.suitColorClass()).toBe('text-suit-clubs');
    });

    it('should apply spades color class', () => {
      fixture.componentRef.setInput('suit', 'spades');
      fixture.detectChanges();

      expect(component.suitColorClass()).toBe('text-suit-spades');
    });
  });

  describe('rank order', () => {
    it('should have all 13 ranks in correct order', () => {
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.detectChanges();

      const expectedOrder: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
      expect(component.ranks).toEqual(expectedOrder);
    });
  });

  describe('card data', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('suit', 'hearts');
    });

    it('should return empty array when cardsBySuit is empty', () => {
      fixture.componentRef.setInput('cardsBySuit', new Map<Rank, CardWithLocation[]>());
      fixture.detectChanges();

      expect(component.getCards('A')).toEqual([]);
      expect(component.getCards('K')).toEqual([]);
    });

    it('should return correct cards from cardsBySuit map', () => {
      const cardsBySuit = new Map<Rank, CardWithLocation[]>([
        ['A', [createCard('hearts', 'A', 'hand')]],
        ['K', [createCard('hearts', 'K', 'discarded')]],
        ['Q', [createCard('hearts', 'Q', 'played')]],
        ['J', [createCard('hearts', 'J', 'deck')]]
      ]);
      fixture.componentRef.setInput('cardsBySuit', cardsBySuit);
      fixture.detectChanges();

      expect(component.getCards('A')[0].location).toBe('hand');
      expect(component.getCards('K')[0].location).toBe('discarded');
      expect(component.getCards('Q')[0].location).toBe('played');
      expect(component.getCards('J')[0].location).toBe('deck');
    });

    it('should return empty array for ranks not in the map', () => {
      const cardsBySuit = new Map<Rank, CardWithLocation[]>([
        ['A', [createCard('hearts', 'A', 'hand')]]
      ]);
      fixture.componentRef.setInput('cardsBySuit', cardsBySuit);
      fixture.detectChanges();

      expect(component.getCards('2')).toEqual([]);
    });

    it('should handle multiple cards with same rank', () => {
      const cardsBySuit = new Map<Rank, CardWithLocation[]>([
        ['A', [
          createCard('hearts', 'A', 'hand'),
          { ...createCard('hearts', 'A', 'discarded'), id: 'hearts-A-2' }
        ]]
      ]);
      fixture.componentRef.setInput('cardsBySuit', cardsBySuit);
      fixture.detectChanges();

      const cards = component.getCards('A');
      expect(cards.length).toBe(2);
      expect(cards[0].location).toBe('hand');
      expect(cards[1].location).toBe('discarded');
    });
  });

  describe('cell selection', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('suit', 'hearts');
    });

    it('should return false when no cell is selected', () => {
      fixture.componentRef.setInput('selectedCell', null);
      fixture.detectChanges();

      expect(component.isCellSelected('A')).toBe(false);
    });

    it('should return true when matching cell is selected', () => {
      fixture.componentRef.setInput('selectedCell', { suit: 'hearts', rank: 'A' });
      fixture.detectChanges();

      expect(component.isCellSelected('A')).toBe(true);
    });

    it('should return false when different rank is selected', () => {
      fixture.componentRef.setInput('selectedCell', { suit: 'hearts', rank: 'K' });
      fixture.detectChanges();

      expect(component.isCellSelected('A')).toBe(false);
    });

    it('should return false when different suit is selected', () => {
      fixture.componentRef.setInput('selectedCell', { suit: 'spades', rank: 'A' });
      fixture.detectChanges();

      expect(component.isCellSelected('A')).toBe(false);
    });
  });

  describe('showDiscard input', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('suit', 'hearts');
    });

    it('should default to false', () => {
      fixture.detectChanges();
      expect(component.showDiscard()).toBe(false);
    });

    it('should accept true value', () => {
      fixture.componentRef.setInput('showDiscard', true);
      fixture.detectChanges();
      expect(component.showDiscard()).toBe(true);
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('suit', 'spades');
      fixture.detectChanges();
    });

    it('should render suit header with symbol', () => {
      const header = fixture.nativeElement.querySelector('.suit-header');
      expect(header.textContent.trim()).toBe('♠');
    });

    it('should render 13 card cells', () => {
      const cells = fixture.nativeElement.querySelectorAll('app-card-cell');
      expect(cells.length).toBe(13);
    });
  });
});
