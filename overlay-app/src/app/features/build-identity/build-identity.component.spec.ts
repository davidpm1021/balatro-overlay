import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { BuildIdentityComponent } from './build-identity.component';
import { BuildGuidanceService, BuildGuidance } from './build-guidance.service';
import { BuildDetectorService, DetectedBuild } from '../strategy-intelligence/services/build-detector.service';
import { GameStateService } from '../../core/services/game-state.service';
import { DetectedStrategy, StrategyType } from '../../../../../shared/models/strategy.model';
import { JokerState } from '../../../../../shared/models/joker.model';

describe('BuildIdentityComponent', () => {
  let component: BuildIdentityComponent;
  let fixture: ComponentFixture<BuildIdentityComponent>;
  let buildDetectorMock: jasmine.SpyObj<BuildDetectorService>;
  let buildGuidanceMock: jasmine.SpyObj<BuildGuidanceService>;
  let gameStateMock: jasmine.SpyObj<GameStateService>;
  let detectedBuildSignal: ReturnType<typeof signal<DetectedBuild>>;
  let jokersSignal: ReturnType<typeof signal<JokerState[]>>;

  function createDetectedStrategy(
    type: StrategyType,
    confidence: number,
    overrides: Partial<DetectedStrategy> = {}
  ): DetectedStrategy {
    return {
      type,
      confidence,
      viability: 80,
      requirements: [],
      currentStrength: 60,
      keyJokers: [],
      ...overrides,
    };
  }

  function createBuildGuidance(overrides: Partial<BuildGuidance> = {}): BuildGuidance {
    return {
      buildName: 'Flush Build',
      description: "You're building around playing 5 cards of the same suit.",
      whatThisMeans: [
        'Play 5 cards of the same suit',
        'Keep cards of your strongest suit',
        'Discard off-suit cards freely',
      ],
      strongestAsset: {
        type: 'suit',
        value: 'hearts',
        display: 'Hearts (15 cards)',
      },
      supportingJokers: ['Lusty Joker', 'Bloodstone'],
      jokersNeeded: 1,
      ...overrides,
    };
  }

  function createJoker(id: string, name: string): JokerState {
    return {
      id,
      name,
      description: 'Test joker',
      rarity: 'common',
      edition: 'none',
      slotIndex: 0,
      isScaling: false,
      effectValues: {},
      sellValue: 3,
    };
  }

  beforeEach(async () => {
    detectedBuildSignal = signal<DetectedBuild>({
      primary: null,
      secondary: undefined,
      isHybrid: false,
    });

    jokersSignal = signal<JokerState[]>([]);

    buildDetectorMock = jasmine.createSpyObj('BuildDetectorService', [], {
      detectedBuild: detectedBuildSignal.asReadonly(),
    });

    buildGuidanceMock = jasmine.createSpyObj('BuildGuidanceService', [
      'getGuidance',
      'getHybridAdvice',
    ]);
    buildGuidanceMock.getGuidance.and.returnValue(createBuildGuidance());
    buildGuidanceMock.getHybridAdvice.and.returnValue('Focus on your primary build.');

    gameStateMock = jasmine.createSpyObj('GameStateService', [], {
      jokers: jokersSignal.asReadonly(),
    });

    await TestBed.configureTestingModule({
      imports: [BuildIdentityComponent],
      providers: [
        { provide: BuildDetectorService, useValue: buildDetectorMock },
        { provide: BuildGuidanceService, useValue: buildGuidanceMock },
        { provide: GameStateService, useValue: gameStateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BuildIdentityComponent);
    component = fixture.componentInstance;
  });

  describe('empty state', () => {
    it('should show empty state when no build detected', () => {
      detectedBuildSignal.set({
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
    });

    it('should display appropriate message in empty state', () => {
      detectedBuildSignal.set({
        primary: null,
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      const emptyText = fixture.nativeElement.textContent;
      expect(emptyText.toLowerCase()).toContain('no build');
    });
  });

  describe('primary build display', () => {
    beforeEach(() => {
      const primary = createDetectedStrategy('flush', 72, {
        keyJokers: ['j_lusty_joker', 'j_bloodstone'],
        suit: 'hearts',
      });
      detectedBuildSignal.set({
        primary,
        secondary: undefined,
        isHybrid: false,
      });
      jokersSignal.set([
        createJoker('j_lusty_joker', 'Lusty Joker'),
        createJoker('j_bloodstone', 'Bloodstone'),
      ]);
      fixture.detectChanges();
    });

    it('should display build name prominently', () => {
      const buildName = fixture.debugElement.query(By.css('.build-name'));
      expect(buildName).toBeTruthy();
      expect(buildName.nativeElement.textContent).toContain('Flush Build');
    });

    it('should display confidence percentage', () => {
      const confidence = fixture.debugElement.query(By.css('.confidence'));
      expect(confidence).toBeTruthy();
      expect(confidence.nativeElement.textContent).toContain('72');
    });

    it('should display confidence progress bar', () => {
      const progressBar = fixture.debugElement.query(By.css('.progress-bar'));
      expect(progressBar).toBeTruthy();
    });

    it('should display "What This Means" section', () => {
      const whatSection = fixture.debugElement.query(By.css('.what-this-means'));
      expect(whatSection).toBeTruthy();
    });

    it('should display 2-3 bullet points', () => {
      const bullets = fixture.debugElement.queryAll(By.css('.bullet-point'));
      expect(bullets.length).toBeGreaterThanOrEqual(2);
      expect(bullets.length).toBeLessThanOrEqual(3);
    });

    it('should display strongest asset when available', () => {
      const strongestAsset = fixture.debugElement.query(By.css('.strongest-asset'));
      expect(strongestAsset).toBeTruthy();
      expect(strongestAsset.nativeElement.textContent).toContain('Hearts');
    });

    it('should display supporting jokers', () => {
      const supportingJokers = fixture.debugElement.query(By.css('.supporting-jokers'));
      expect(supportingJokers).toBeTruthy();
      expect(supportingJokers.nativeElement.textContent).toContain('Lusty Joker');
    });
  });

  describe('hybrid build display', () => {
    beforeEach(() => {
      const primary = createDetectedStrategy('flush', 75, {
        keyJokers: ['j_lusty_joker'],
        suit: 'hearts',
      });
      const secondary = createDetectedStrategy('mult_stacking', 60);

      buildGuidanceMock.getGuidance.and.callFake((type: StrategyType) => {
        if (type === 'flush') {
          return createBuildGuidance();
        }
        return createBuildGuidance({
          buildName: 'Mult Stacking',
          description: "You're stacking +mult jokers.",
          whatThisMeans: ['Stack +mult jokers', 'Works with any hand'],
          strongestAsset: null,
          supportingJokers: [],
          jokersNeeded: 2,
        });
      });

      detectedBuildSignal.set({
        primary,
        secondary,
        isHybrid: true,
      });
      fixture.detectChanges();
    });

    it('should display secondary build section when isHybrid', () => {
      const secondarySection = fixture.debugElement.query(By.css('.secondary-build'));
      expect(secondarySection).toBeTruthy();
    });

    it('should display secondary build name', () => {
      const secondaryName = fixture.debugElement.query(By.css('.secondary-build .build-name'));
      expect(secondaryName).toBeTruthy();
    });

    it('should display secondary confidence', () => {
      const secondaryConfidence = fixture.debugElement.query(By.css('.secondary-build .confidence'));
      expect(secondaryConfidence).toBeTruthy();
      expect(secondaryConfidence.nativeElement.textContent).toContain('60');
    });

    it('should display hybrid advice', () => {
      const hybridAdvice = fixture.debugElement.query(By.css('.hybrid-advice'));
      expect(hybridAdvice).toBeTruthy();
      expect(hybridAdvice.nativeElement.textContent).toContain('Focus');
    });
  });

  describe('no strongest asset', () => {
    it('should not display strongest asset section when null', () => {
      const primary = createDetectedStrategy('mult_stacking', 70);
      buildGuidanceMock.getGuidance.and.returnValue(
        createBuildGuidance({
          buildName: 'Mult Stacking',
          strongestAsset: null,
        })
      );

      detectedBuildSignal.set({
        primary,
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      const strongestAsset = fixture.debugElement.query(By.css('.strongest-asset'));
      expect(strongestAsset).toBeFalsy();
    });
  });

  describe('supporting jokers display', () => {
    it('should show max 3 joker names', () => {
      const primary = createDetectedStrategy('flush', 80, {
        keyJokers: ['j_a', 'j_b', 'j_c', 'j_d'],
      });
      buildGuidanceMock.getGuidance.and.returnValue(
        createBuildGuidance({
          supportingJokers: ['Joker A', 'Joker B', 'Joker C'],
        })
      );

      detectedBuildSignal.set({
        primary,
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      const jokerNames = fixture.debugElement.query(By.css('.joker-names'));
      const nameText = jokerNames.nativeElement.textContent;

      // Should only contain 3 joker names (comma-separated)
      const names = nameText.split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 0);
      expect(names.length).toBeLessThanOrEqual(3);
    });

    it('should indicate when more jokers would help', () => {
      const primary = createDetectedStrategy('flush', 60, {
        keyJokers: ['j_a'],
      });
      buildGuidanceMock.getGuidance.and.returnValue(
        createBuildGuidance({
          supportingJokers: ['Joker A'],
          jokersNeeded: 2,
        })
      );

      detectedBuildSignal.set({
        primary,
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      const jokersNeeded = fixture.debugElement.query(By.css('.jokers-needed'));
      expect(jokersNeeded).toBeTruthy();
    });

    it('should not show jokers needed indicator when at capacity', () => {
      const primary = createDetectedStrategy('flush', 90, {
        keyJokers: ['j_a', 'j_b', 'j_c'],
      });
      buildGuidanceMock.getGuidance.and.returnValue(
        createBuildGuidance({
          supportingJokers: ['Joker A', 'Joker B', 'Joker C'],
          jokersNeeded: 0,
        })
      );

      detectedBuildSignal.set({
        primary,
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      const jokersNeeded = fixture.debugElement.query(By.css('.jokers-needed'));
      expect(jokersNeeded).toBeFalsy();
    });
  });

  describe('progress bar styling', () => {
    it('should set progress bar width based on confidence', () => {
      const primary = createDetectedStrategy('flush', 72);
      detectedBuildSignal.set({
        primary,
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      const progressFill = fixture.debugElement.query(By.css('.progress-fill'));
      expect(progressFill).toBeTruthy();
      // The style should reflect the confidence percentage
      const style = progressFill.nativeElement.style.width;
      expect(style).toBe('72%');
    });
  });

  describe('component integration', () => {
    it('should call getGuidance with correct parameters', () => {
      const primary = createDetectedStrategy('flush', 72, {
        keyJokers: ['j_lusty_joker'],
        suit: 'hearts',
      });
      const jokers = [createJoker('j_lusty_joker', 'Lusty Joker')];

      jokersSignal.set(jokers);
      detectedBuildSignal.set({
        primary,
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      expect(buildGuidanceMock.getGuidance).toHaveBeenCalledWith('flush', primary, jokers);
    });

    it('should call getHybridAdvice for hybrid builds', () => {
      const primary = createDetectedStrategy('flush', 75);
      const secondary = createDetectedStrategy('pairs', 60);

      detectedBuildSignal.set({
        primary,
        secondary,
        isHybrid: true,
      });
      fixture.detectChanges();

      expect(buildGuidanceMock.getHybridAdvice).toHaveBeenCalledWith(75, 60);
    });
  });

  describe('change detection', () => {
    it('should update when detected build changes', () => {
      // Start with flush
      detectedBuildSignal.set({
        primary: createDetectedStrategy('flush', 72),
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      let buildName = fixture.debugElement.query(By.css('.build-name'));
      expect(buildName.nativeElement.textContent).toContain('Flush');

      // Change to pairs
      buildGuidanceMock.getGuidance.and.returnValue(
        createBuildGuidance({
          buildName: 'Pairs Build',
          description: "You're building around pairs.",
        })
      );
      detectedBuildSignal.set({
        primary: createDetectedStrategy('pairs', 65),
        secondary: undefined,
        isHybrid: false,
      });
      fixture.detectChanges();

      buildName = fixture.debugElement.query(By.css('.build-name'));
      expect(buildName.nativeElement.textContent).toContain('Pairs');
    });
  });
});
