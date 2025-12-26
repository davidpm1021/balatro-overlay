import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardCellComponent } from './card-cell.component';
import { CardWithLocation, CardLocation } from '../deck-tracker.component';
import { Suit, Rank } from '../../../../../../shared/models';

describe('CardCellComponent', () => {
  let component: CardCellComponent;
  let fixture: ComponentFixture<CardCellComponent>;

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
      imports: [CardCellComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CardCellComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('rank', 'A');
    fixture.componentRef.setInput('suit', 'hearts');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('suit colors', () => {
    it('should apply hearts color class', () => {
      fixture.componentRef.setInput('rank', 'K');
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.componentRef.setInput('cards', [createCard('hearts', 'K', 'deck')]);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('text-suit-hearts');
    });

    it('should apply diamonds color class', () => {
      fixture.componentRef.setInput('rank', 'Q');
      fixture.componentRef.setInput('suit', 'diamonds');
      fixture.componentRef.setInput('cards', [createCard('diamonds', 'Q', 'deck')]);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('text-suit-diamonds');
    });

    it('should apply clubs color class', () => {
      fixture.componentRef.setInput('rank', 'J');
      fixture.componentRef.setInput('suit', 'clubs');
      fixture.componentRef.setInput('cards', [createCard('clubs', 'J', 'deck')]);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('text-suit-clubs');
    });

    it('should apply spades color class', () => {
      fixture.componentRef.setInput('rank', '10');
      fixture.componentRef.setInput('suit', 'spades');
      fixture.componentRef.setInput('cards', [createCard('spades', '10', 'deck')]);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('text-suit-spades');
    });
  });

  describe('card location states', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'hearts');
    });

    it('should show in-deck class when cards are in deck', () => {
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'deck')]);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('in-deck');
      expect(classes).not.toContain('dimmed');
    });

    it('should show dimmed class when cards not in deck and highlight is off', () => {
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'discarded')]);
      fixture.componentRef.setInput('showLocationHighlight', false);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('dimmed');
      expect(classes).not.toContain('in-deck');
    });

    it('should show empty class when no cards', () => {
      fixture.componentRef.setInput('cards', []);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('empty');
    });
  });

  describe('location highlighting', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'hearts');
    });

    it('should not show location highlight when showLocationHighlight is false', () => {
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'discarded')]);
      fixture.componentRef.setInput('showLocationHighlight', false);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).not.toContain('location-discarded');
    });

    it('should show discarded highlight when showLocationHighlight is true', () => {
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'discarded')]);
      fixture.componentRef.setInput('showLocationHighlight', true);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('location-discarded');
    });

    it('should show hand highlight when showLocationHighlight is true', () => {
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'hand')]);
      fixture.componentRef.setInput('showLocationHighlight', true);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('location-hand');
    });

    it('should show played highlight when showLocationHighlight is true', () => {
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'played')]);
      fixture.componentRef.setInput('showLocationHighlight', true);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('location-played');
    });

    it('should not show location class for cards in deck even with highlight on', () => {
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'deck')]);
      fixture.componentRef.setInput('showLocationHighlight', true);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).not.toContain('location-deck');
      expect(classes).toContain('in-deck');
    });
  });

  describe('rank display', () => {
    it('should display the rank in the template', () => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'spades');
      fixture.componentRef.setInput('cards', [createCard('spades', 'A', 'deck')]);
      fixture.detectChanges();

      const element = fixture.nativeElement.querySelector('.rank-text');
      expect(element.textContent.trim()).toBe('A');
    });

    it('should display 10 correctly', () => {
      fixture.componentRef.setInput('rank', '10');
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.componentRef.setInput('cards', [createCard('hearts', '10', 'deck')]);
      fixture.detectChanges();

      const element = fixture.nativeElement.querySelector('.rank-text');
      expect(element.textContent.trim()).toBe('10');
    });
  });

  describe('card count badge', () => {
    it('should not show count badge when only one card', () => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'deck')]);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.count-badge');
      expect(badge).toBeNull();
    });

    it('should show count badge when multiple cards', () => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.componentRef.setInput('cards', [
        createCard('hearts', 'A', 'deck'),
        { ...createCard('hearts', 'A', 'hand'), id: 'hearts-A-2' }
      ]);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.count-badge');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toContain('×2');
    });
  });

  describe('modification indicators', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'hearts');
    });

    it('should not show mod indicator for base cards', () => {
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'deck')]);
      fixture.detectChanges();

      const indicator = fixture.nativeElement.querySelector('.mod-indicator');
      expect(indicator).toBeNull();
    });

    it('should show mod indicator for cards with enhancement', () => {
      const card = createCard('hearts', 'A', 'deck');
      card.enhancement = 'bonus';
      fixture.componentRef.setInput('cards', [card]);
      fixture.detectChanges();

      const indicator = fixture.nativeElement.querySelector('.mod-indicator');
      expect(indicator).not.toBeNull();
    });

    it('should show mod indicator for cards with edition', () => {
      const card = createCard('hearts', 'A', 'deck');
      card.edition = 'foil';
      fixture.componentRef.setInput('cards', [card]);
      fixture.detectChanges();

      const indicator = fixture.nativeElement.querySelector('.mod-indicator');
      expect(indicator).not.toBeNull();
    });

    it('should show mod indicator for cards with seal', () => {
      const card = createCard('hearts', 'A', 'deck');
      card.seal = 'gold';
      fixture.componentRef.setInput('cards', [card]);
      fixture.detectChanges();

      const indicator = fixture.nativeElement.querySelector('.mod-indicator');
      expect(indicator).not.toBeNull();
    });
  });

  describe('selection', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'deck')]);
    });

    it('should not have selected class when not selected', () => {
      fixture.componentRef.setInput('isSelected', false);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).not.toContain('selected');
    });

    it('should have selected class when selected', () => {
      fixture.componentRef.setInput('isSelected', true);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('selected');
    });
  });

  describe('click handling', () => {
    it('should emit cellClicked when clicked with cards', () => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.componentRef.setInput('cards', [createCard('hearts', 'A', 'deck')]);
      fixture.detectChanges();

      let clicked = false;
      component.cellClicked.subscribe(() => clicked = true);

      component.onClick();
      expect(clicked).toBe(true);
    });

    it('should not emit cellClicked when clicked with no cards', () => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.componentRef.setInput('cards', []);
      fixture.detectChanges();

      let clicked = false;
      component.cellClicked.subscribe(() => clicked = true);

      component.onClick();
      expect(clicked).toBe(false);
    });
  });
});
