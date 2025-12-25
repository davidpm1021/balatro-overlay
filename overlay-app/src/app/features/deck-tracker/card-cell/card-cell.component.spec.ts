import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardCellComponent } from './card-cell.component';
import { CardLocation } from '../deck-tracker.component';

describe('CardCellComponent', () => {
  let component: CardCellComponent;
  let fixture: ComponentFixture<CardCellComponent>;

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
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('text-suit-hearts');
    });

    it('should apply diamonds color class', () => {
      fixture.componentRef.setInput('rank', 'Q');
      fixture.componentRef.setInput('suit', 'diamonds');
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('text-suit-diamonds');
    });

    it('should apply clubs color class', () => {
      fixture.componentRef.setInput('rank', 'J');
      fixture.componentRef.setInput('suit', 'clubs');
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('text-suit-clubs');
    });

    it('should apply spades color class', () => {
      fixture.componentRef.setInput('rank', '10');
      fixture.componentRef.setInput('suit', 'spades');
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

    it('should show full opacity and in-deck class when location is deck', () => {
      fixture.componentRef.setInput('location', 'deck');
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('opacity-100');
      expect(classes).toContain('in-deck');
      expect(classes).not.toContain('opacity-30');
    });

    it('should show dimmed opacity when location is not deck', () => {
      fixture.componentRef.setInput('location', 'discarded');
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('opacity-30');
      expect(classes).not.toContain('opacity-100');
      expect(classes).not.toContain('in-deck');
    });

    it('should default to deck location', () => {
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('in-deck');
    });
  });

  describe('location highlighting', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('rank', 'A');
      fixture.componentRef.setInput('suit', 'hearts');
    });

    it('should not show location highlight when showLocationHighlight is false', () => {
      fixture.componentRef.setInput('location', 'discarded');
      fixture.componentRef.setInput('showLocationHighlight', false);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).not.toContain('location-discarded');
    });

    it('should show discarded highlight when showLocationHighlight is true', () => {
      fixture.componentRef.setInput('location', 'discarded');
      fixture.componentRef.setInput('showLocationHighlight', true);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('location-discarded');
    });

    it('should show hand highlight when showLocationHighlight is true', () => {
      fixture.componentRef.setInput('location', 'hand');
      fixture.componentRef.setInput('showLocationHighlight', true);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('location-hand');
    });

    it('should show played highlight when showLocationHighlight is true', () => {
      fixture.componentRef.setInput('location', 'played');
      fixture.componentRef.setInput('showLocationHighlight', true);
      fixture.detectChanges();

      const classes = component.cellClasses();
      expect(classes).toContain('location-played');
    });

    it('should not show location class for cards in deck even with highlight on', () => {
      fixture.componentRef.setInput('location', 'deck');
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
      fixture.detectChanges();

      const element = fixture.nativeElement.querySelector('.card-cell');
      expect(element.textContent.trim()).toBe('A');
    });

    it('should display 10 correctly', () => {
      fixture.componentRef.setInput('rank', '10');
      fixture.componentRef.setInput('suit', 'hearts');
      fixture.detectChanges();

      const element = fixture.nativeElement.querySelector('.card-cell');
      expect(element.textContent.trim()).toBe('10');
    });
  });
});
