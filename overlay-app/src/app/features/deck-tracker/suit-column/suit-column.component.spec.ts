import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuitColumnComponent } from './suit-column.component';
import { CardLocation } from '../deck-tracker.component';
import { Rank, Suit } from '../../../../../../shared/models';

describe('SuitColumnComponent', () => {
  let component: SuitColumnComponent;
  let fixture: ComponentFixture<SuitColumnComponent>;

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

  describe('card locations', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('suit', 'hearts');
    });

    it('should return deck as default location when cardLocations is empty', () => {
      fixture.componentRef.setInput('cardLocations', new Map<Rank, CardLocation>());
      fixture.detectChanges();

      expect(component.getCardLocation('A')).toBe('deck');
      expect(component.getCardLocation('K')).toBe('deck');
    });

    it('should return correct location from cardLocations map', () => {
      const locations = new Map<Rank, CardLocation>([
        ['A', 'hand'],
        ['K', 'discarded'],
        ['Q', 'played'],
        ['J', 'deck']
      ]);
      fixture.componentRef.setInput('cardLocations', locations);
      fixture.detectChanges();

      expect(component.getCardLocation('A')).toBe('hand');
      expect(component.getCardLocation('K')).toBe('discarded');
      expect(component.getCardLocation('Q')).toBe('played');
      expect(component.getCardLocation('J')).toBe('deck');
    });

    it('should return deck for ranks not in the map', () => {
      const locations = new Map<Rank, CardLocation>([
        ['A', 'hand']
      ]);
      fixture.componentRef.setInput('cardLocations', locations);
      fixture.detectChanges();

      expect(component.getCardLocation('2')).toBe('deck');
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
