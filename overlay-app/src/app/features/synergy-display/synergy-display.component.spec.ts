import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Signal } from '@angular/core';
import { SynergyDisplayComponent } from './synergy-display.component';
import { SynergyDisplayService } from './synergy-display.service';
import { GameStateService } from '../../core/services/game-state.service';
import { PhaseVisibilityService } from '../../core/services/phase-visibility.service';
import { JokerState } from '../../../../../shared/models/joker.model';
import { SynergyGroup } from '../../../../../shared/models/synergy-group.model';

describe('SynergyDisplayComponent', () => {
  let component: SynergyDisplayComponent;
  let fixture: ComponentFixture<SynergyDisplayComponent>;
  let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
  let synergyDisplayServiceMock: jasmine.SpyObj<SynergyDisplayService>;
  let jokersSignal: ReturnType<typeof signal<JokerState[]>>;
  let groupsSignal: ReturnType<typeof signal<SynergyGroup[]>>;
  let totalScoreSignal: ReturnType<typeof signal<number>>;

  function createJoker(id: string, name: string, slotIndex: number): JokerState {
    return {
      id,
      name,
      description: 'Test',
      rarity: 'common',
      edition: 'none',
      slotIndex,
      isScaling: false,
      effectValues: {},
      sellValue: 3,
    };
  }

  beforeEach(async () => {
    jokersSignal = signal<JokerState[]>([]);
    groupsSignal = signal<SynergyGroup[]>([]);
    totalScoreSignal = signal<number>(0);

    gameStateServiceMock = jasmine.createSpyObj('GameStateService', [], {
      jokers: jokersSignal.asReadonly(),
    });

    synergyDisplayServiceMock = jasmine.createSpyObj('SynergyDisplayService', ['getOrphanGuidance'], {
      groups: groupsSignal.asReadonly(),
      totalSynergyScore: totalScoreSignal.asReadonly(),
    });

    const mockVisibilityService = {
      isPanelVisible: (panelId: string): Signal<boolean> => signal(true).asReadonly()
    };

    await TestBed.configureTestingModule({
      imports: [SynergyDisplayComponent],
      providers: [
        { provide: GameStateService, useValue: gameStateServiceMock },
        { provide: SynergyDisplayService, useValue: synergyDisplayServiceMock },
        { provide: PhaseVisibilityService, useValue: mockVisibilityService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SynergyDisplayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render empty state when no jokers', () => {
    jokersSignal.set([]);
    groupsSignal.set([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('No jokers yet');
  });

  it('should display joker count', () => {
    const jokers = [
      createJoker('j_a', 'Joker A', 0),
      createJoker('j_b', 'Joker B', 1),
    ];
    jokersSignal.set(jokers);
    groupsSignal.set([{
      id: 'test',
      type: 'direct',
      label: 'Test Synergy',
      explanation: 'Test explanation',
      jokerIds: ['j_a', 'j_b'],
      strength: 'strong',
    }]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.count')?.textContent).toContain('2');
  });

  it('should render synergy groups', () => {
    const jokers = [
      createJoker('j_a', 'Joker A', 0),
      createJoker('j_b', 'Joker B', 1),
    ];
    jokersSignal.set(jokers);
    groupsSignal.set([{
      id: 'test',
      type: 'direct',
      label: 'Hearts Synergy',
      explanation: 'Both work with hearts',
      jokerIds: ['j_a', 'j_b'],
      strength: 'strong',
    }]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.groups-container')).toBeTruthy();
    expect(compiled.querySelector('app-synergy-group')).toBeTruthy();
  });

  it('should show synergy score when positive', () => {
    jokersSignal.set([createJoker('j_a', 'A', 0)]);
    groupsSignal.set([{
      id: 'orphan',
      type: 'orphan',
      label: 'No Synergy',
      explanation: 'Test',
      jokerIds: ['j_a'],
      strength: null,
    }]);
    totalScoreSignal.set(20);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.synergy-score')).toBeTruthy();
    expect(compiled.querySelector('.score-value')?.textContent).toContain('20');
  });

  it('should not show synergy score when zero', () => {
    jokersSignal.set([createJoker('j_a', 'A', 0)]);
    groupsSignal.set([{
      id: 'orphan',
      type: 'orphan',
      label: 'No Synergy',
      explanation: 'Test',
      jokerIds: ['j_a'],
      strength: null,
    }]);
    totalScoreSignal.set(0);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.synergy-score')).toBeFalsy();
  });

  describe('getJokersForGroup', () => {
    it('should return jokers sorted by slot index', () => {
      const jokers = [
        createJoker('j_b', 'B', 1),
        createJoker('j_a', 'A', 0),
        createJoker('j_c', 'C', 2),
      ];
      jokersSignal.set(jokers);

      const group: SynergyGroup = {
        id: 'test',
        type: 'direct',
        label: 'Test',
        explanation: 'Test',
        jokerIds: ['j_c', 'j_a', 'j_b'],
        strength: 'strong',
      };

      const result = component.getJokersForGroup(group);

      expect(result.length).toBe(3);
      expect(result[0].id).toBe('j_a');
      expect(result[1].id).toBe('j_b');
      expect(result[2].id).toBe('j_c');
    });

    it('should filter out jokers not in game state', () => {
      const jokers = [createJoker('j_a', 'A', 0)];
      jokersSignal.set(jokers);

      const group: SynergyGroup = {
        id: 'test',
        type: 'direct',
        label: 'Test',
        explanation: 'Test',
        jokerIds: ['j_a', 'j_b'], // j_b doesn't exist
        strength: 'strong',
      };

      const result = component.getJokersForGroup(group);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('j_a');
    });
  });

  describe('scoreClass', () => {
    it('should return score-excellent for score >= 30', () => {
      totalScoreSignal.set(30);
      expect(component.scoreClass()).toBe('score-excellent');
    });

    it('should return score-high for score >= 20', () => {
      totalScoreSignal.set(20);
      expect(component.scoreClass()).toBe('score-high');
    });

    it('should return score-medium for score >= 10', () => {
      totalScoreSignal.set(10);
      expect(component.scoreClass()).toBe('score-medium');
    });

    it('should return score-low for score < 10', () => {
      totalScoreSignal.set(5);
      expect(component.scoreClass()).toBe('score-low');
    });
  });
});
