import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ShopItemDetailComponent } from './shop-item-detail.component';
import {
  EnhancedShopRecommendation,
  ReasonBullet,
  ScoreBreakdown,
  BuildContext,
  ShopItemAnalysis,
} from '../services/shop-advisor.service';
import { JokerExplanation } from '../services/joker-explainer.service';
import { ShopItem } from '../../../../../../shared/models/game-state.model';

describe('ShopItemDetailComponent', () => {
  let component: ShopItemDetailComponent;
  let fixture: ComponentFixture<ShopItemDetailComponent>;

  const createMockRecommendation = (overrides: Partial<EnhancedShopRecommendation> = {}): EnhancedShopRecommendation => {
    const mockScoreBreakdown: ScoreBreakdown = {
      baseTierScore: 95,
      synergyBonus: 15,
      antiSynergyPenalty: 0,
      buildFitBonus: 30,
      bossCounterBonus: 0,
      economyPenalty: 0,
      lateGameAdjustment: 0,
      totalScore: 92,
    };

    const mockWhyBuy: ReasonBullet[] = [
      { category: 'tier', text: 'S-Tier: One of the best jokers in the game', importance: 'high' },
      { category: 'build_fit', text: "Fits your build: You're 72% flush", importance: 'high' },
    ];

    const mockAnalysis: ShopItemAnalysis = {
      recommendation: 'buy',
      whyBuy: mockWhyBuy,
      whySkip: [],
      whyConsider: [],
      scoreBreakdown: mockScoreBreakdown,
      buildContext: {
        buildType: 'flush',
        buildName: 'Flush Build',
        buildConfidence: 72,
        fitsPercentage: 100,
        fitDescription: 'Fits your 72% flush build',
      },
      jokerExplanation: {
        effect: 'Every played card counts as every suit',
        implication: 'ANY 5 cards = flush!',
        tips: ['Combine with flush jokers'],
      },
    };

    const mockItem: ShopItem = {
      id: 'splash',
      name: 'Splash',
      type: 'joker',
      cost: 6,
      sold: false,
    };

    return {
      item: mockItem,
      score: 92,
      reasons: ['S-tier', 'Fits flush build'],
      tier: 'S',
      synergiesWithOwned: ['Tribal'],
      analysis: mockAnalysis,
      ...overrides,
    };
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShopItemDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShopItemDetailComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('WHY BUY Display', () => {
    it('should display WHY BUY bullets for buy recommendations', () => {
      const rec = createMockRecommendation();
      fixture.componentRef.setInput('recommendation', rec);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const bullets = compiled.querySelectorAll('.why-buy-bullet');

      expect(bullets.length).toBeGreaterThan(0);
    });

    it('should show tier category badge for tier reasons', () => {
      const rec = createMockRecommendation();
      fixture.componentRef.setInput('recommendation', rec);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const text = compiled.textContent;

      expect(text).toContain('S-Tier');
    });
  });

  describe('WHY SKIP Display', () => {
    it('should display WHY SKIP bullets for skip recommendations', () => {
      const rec = createMockRecommendation({
        score: 35,
        tier: 'D',
        analysis: {
          recommendation: 'skip',
          whyBuy: [],
          whySkip: [
            { category: 'timing', text: 'Economy joker, falls off late game', importance: 'medium' },
            { category: 'economy', text: 'Drops below $25 interest threshold', importance: 'medium' },
          ],
          whyConsider: [],
          scoreBreakdown: {
            baseTierScore: 40,
            synergyBonus: 0,
            antiSynergyPenalty: 0,
            buildFitBonus: 0,
            bossCounterBonus: 0,
            economyPenalty: 5,
            lateGameAdjustment: -10,
            totalScore: 35,
          },
          buildContext: null,
          jokerExplanation: null,
        },
      });
      fixture.componentRef.setInput('recommendation', rec);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const text = compiled.textContent;

      expect(text).toContain('Economy joker');
    });
  });

  describe('WHAT IT DOES Section', () => {
    it('should display joker explanation when available', () => {
      const rec = createMockRecommendation();
      fixture.componentRef.setInput('recommendation', rec);
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const text = compiled.textContent;

      expect(text).toContain('Every played card counts as every suit');
      expect(text).toContain('ANY 5 cards = flush!');
    });

    it('should not display WHAT IT DOES for items without joker explanation', () => {
      const rec = createMockRecommendation({
        analysis: {
          ...createMockRecommendation().analysis,
          jokerExplanation: null,
        },
      });
      fixture.componentRef.setInput('recommendation', rec);
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const whatItDoesSection = compiled.querySelector('.what-it-does');

      expect(whatItDoesSection).toBeNull();
    });
  });

  describe('SCORE BREAKDOWN Section', () => {
    it('should display score breakdown when expanded', () => {
      const rec = createMockRecommendation();
      fixture.componentRef.setInput('recommendation', rec);
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const text = compiled.textContent;

      expect(text).toContain('Base');
      expect(text).toContain('+95');
    });

    it('should show synergy bonus when present', () => {
      const rec = createMockRecommendation();
      fixture.componentRef.setInput('recommendation', rec);
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const text = compiled.textContent;

      expect(text).toContain('Synergy');
      expect(text).toContain('+15');
    });
  });

  describe('Build Context Display', () => {
    it('should display build context when available', () => {
      const rec = createMockRecommendation();
      fixture.componentRef.setInput('recommendation', rec);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const text = compiled.textContent;

      expect(text).toContain('flush');
    });

    it('should not display build context when null', () => {
      const rec = createMockRecommendation({
        analysis: {
          ...createMockRecommendation().analysis,
          buildContext: null,
        },
      });
      fixture.componentRef.setInput('recommendation', rec);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const buildContextSection = compiled.querySelector('.build-context');

      expect(buildContextSection).toBeNull();
    });
  });

  describe('Expand/Collapse', () => {
    it('should emit expandToggle when details button clicked', () => {
      const rec = createMockRecommendation();
      fixture.componentRef.setInput('recommendation', rec);
      fixture.componentRef.setInput('expanded', false);
      fixture.detectChanges();

      let emittedValue: boolean | undefined;
      component.expandToggle.subscribe((val: boolean) => {
        emittedValue = val;
      });

      const button = fixture.nativeElement.querySelector('.expand-button');
      if (button) {
        button.click();
        fixture.detectChanges();
        expect(emittedValue).toBe(true);
      }
    });
  });

  describe('Importance Styling', () => {
    it('should apply high importance styling to high importance bullets', () => {
      const rec = createMockRecommendation();
      fixture.componentRef.setInput('recommendation', rec);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const highImportance = compiled.querySelector('.importance-high');

      expect(highImportance).not.toBeNull();
    });
  });
});
