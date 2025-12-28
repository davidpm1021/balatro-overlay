import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SynergyDisplayService } from './synergy-display.service';
import { GameStateService } from '../../core/services/game-state.service';
import { SynergyGraphService } from '../strategy-intelligence/services/synergy-graph.service';
import { JokerState } from '../../../../../shared/models/joker.model';
import { SynergyStrength } from '../../../../../shared/models/strategy.model';

describe('SynergyDisplayService', () => {
  let service: SynergyDisplayService;
  let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
  let synergyGraphServiceMock: jasmine.SpyObj<SynergyGraphService>;
  let jokersSignal: ReturnType<typeof signal<JokerState[]>>;

  function createJoker(id: string, name: string, overrides: Partial<JokerState> = {}): JokerState {
    return {
      id,
      name,
      description: 'Test description',
      rarity: 'common',
      edition: 'none',
      slotIndex: 0,
      isScaling: false,
      effectValues: {},
      sellValue: 3,
      ...overrides,
    };
  }

  beforeEach(() => {
    jokersSignal = signal<JokerState[]>([]);

    gameStateServiceMock = jasmine.createSpyObj('GameStateService', [], {
      jokers: jokersSignal.asReadonly(),
    });

    synergyGraphServiceMock = jasmine.createSpyObj('SynergyGraphService', [
      'findSynergiesBetween',
      'calculateSynergyScore',
      'getJoker',
      'getSynergies',
    ]);

    // Default mock implementations
    synergyGraphServiceMock.findSynergiesBetween.and.returnValue([]);
    synergyGraphServiceMock.calculateSynergyScore.and.returnValue(0);
    synergyGraphServiceMock.getJoker.and.returnValue(null);
    synergyGraphServiceMock.getSynergies.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        SynergyDisplayService,
        { provide: GameStateService, useValue: gameStateServiceMock },
        { provide: SynergyGraphService, useValue: synergyGraphServiceMock },
      ],
    });

    service = TestBed.inject(SynergyDisplayService);
  });

  describe('groups', () => {
    it('should return empty array when no jokers', () => {
      jokersSignal.set([]);
      expect(service.groups()).toEqual([]);
    });

    it('should create direct synergy group for jokers with explicit synergies', () => {
      const joker1 = createJoker('j_lusty_joker', 'Lusty Joker', { slotIndex: 0 });
      const joker2 = createJoker('j_bloodstone', 'Bloodstone', { slotIndex: 1 });

      jokersSignal.set([joker1, joker2]);

      synergyGraphServiceMock.findSynergiesBetween.and.returnValue([
        {
          jokerA: 'j_lusty_joker',
          jokerB: 'j_bloodstone',
          strength: 'strong' as SynergyStrength,
          reason: 'Both scale with Hearts scored',
        },
      ]);

      synergyGraphServiceMock.getJoker.and.callFake((id: string) => {
        if (id === 'j_lusty_joker') {
          return {
            id: 'j_lusty_joker',
            name: 'Lusty Joker',
            synergiesWith: [],
            strategies: [{ strategy: 'flush', affinity: 95 }],
            wantsSuits: ['hearts'],
            isScaling: false,
            generatesMoney: false,
            costEfficiency: 70,
            tags: ['suit', 'hearts'],
          } as any;
        }
        if (id === 'j_bloodstone') {
          return {
            id: 'j_bloodstone',
            name: 'Bloodstone',
            synergiesWith: [],
            strategies: [{ strategy: 'flush', affinity: 90 }],
            wantsSuits: ['hearts'],
            isScaling: false,
            generatesMoney: false,
            costEfficiency: 70,
            tags: ['suit', 'hearts'],
          } as any;
        }
        return null;
      });

      const groups = service.groups();

      expect(groups.length).toBe(1);
      expect(groups[0].type).toBe('direct');
      expect(groups[0].jokerIds).toContain('j_lusty_joker');
      expect(groups[0].jokerIds).toContain('j_bloodstone');
      expect(groups[0].strength).toBe('strong');
    });

    it('should place jokers with no connections in orphan group', () => {
      const joker1 = createJoker('j_egg', 'Egg', { slotIndex: 0 });

      jokersSignal.set([joker1]);

      synergyGraphServiceMock.findSynergiesBetween.and.returnValue([]);
      synergyGraphServiceMock.getJoker.and.returnValue({
        id: 'j_egg',
        name: 'Egg',
        synergiesWith: [],
        strategies: [{ strategy: 'economy', affinity: 100 }],
        isScaling: false,
        generatesMoney: true,
        costEfficiency: 50,
        tags: ['economy'],
      } as any);

      const groups = service.groups();

      expect(groups.length).toBe(1);
      expect(groups[0].type).toBe('orphan');
      expect(groups[0].jokerIds).toContain('j_egg');
      expect(groups[0].strength).toBeNull();
    });

    it('should handle single joker as orphan', () => {
      const joker1 = createJoker('j_joker', 'Joker', { slotIndex: 0 });

      jokersSignal.set([joker1]);

      synergyGraphServiceMock.findSynergiesBetween.and.returnValue([]);

      const groups = service.groups();

      expect(groups.length).toBe(1);
      expect(groups[0].type).toBe('orphan');
    });

    it('should prioritize direct synergies over strategy groups', () => {
      const joker1 = createJoker('j_lusty_joker', 'Lusty Joker', { slotIndex: 0 });
      const joker2 = createJoker('j_bloodstone', 'Bloodstone', { slotIndex: 1 });
      const joker3 = createJoker('j_tribe', 'Tribe', { slotIndex: 2 });

      jokersSignal.set([joker1, joker2, joker3]);

      // Only lusty and bloodstone have direct synergy
      synergyGraphServiceMock.findSynergiesBetween.and.returnValue([
        {
          jokerA: 'j_lusty_joker',
          jokerB: 'j_bloodstone',
          strength: 'strong' as SynergyStrength,
          reason: 'Both scale with Hearts scored',
        },
      ]);

      synergyGraphServiceMock.getJoker.and.callFake((id: string) => {
        // All have flush affinity >= 70
        return {
          id,
          name: id,
          synergiesWith: [],
          strategies: [{ strategy: 'flush', affinity: 90 }],
          wantsSuits: ['hearts'],
          isScaling: false,
          generatesMoney: false,
          costEfficiency: 70,
          tags: ['flush'],
        } as any;
      });

      const groups = service.groups();

      // Should have direct group (lusty + bloodstone) and orphan (tribe alone, not enough for strategy group)
      const directGroup = groups.find(g => g.type === 'direct');
      expect(directGroup).toBeTruthy();
      expect(directGroup!.jokerIds).toContain('j_lusty_joker');
      expect(directGroup!.jokerIds).toContain('j_bloodstone');
      expect(directGroup!.jokerIds).not.toContain('j_tribe');
    });

    it('should correctly identify strongest connection in cluster', () => {
      const joker1 = createJoker('j_a', 'Joker A', { slotIndex: 0 });
      const joker2 = createJoker('j_b', 'Joker B', { slotIndex: 1 });
      const joker3 = createJoker('j_c', 'Joker C', { slotIndex: 2 });

      jokersSignal.set([joker1, joker2, joker3]);

      // 2 strong + 1 medium connections
      synergyGraphServiceMock.findSynergiesBetween.and.returnValue([
        { jokerA: 'j_a', jokerB: 'j_b', strength: 'strong' as SynergyStrength, reason: 'Reason 1' },
        { jokerA: 'j_b', jokerB: 'j_c', strength: 'medium' as SynergyStrength, reason: 'Reason 2' },
      ]);

      synergyGraphServiceMock.getJoker.and.returnValue({
        id: 'test',
        name: 'Test',
        synergiesWith: [],
        strategies: [],
        isScaling: false,
        generatesMoney: false,
        costEfficiency: 70,
        tags: [],
      } as any);

      const groups = service.groups();

      expect(groups.length).toBe(1);
      expect(groups[0].strength).toBe('strong');
    });

    it('should create strategy group for jokers sharing strategy affinity >= 70', () => {
      const joker1 = createJoker('j_a', 'Joker A', { slotIndex: 0 });
      const joker2 = createJoker('j_b', 'Joker B', { slotIndex: 1 });

      jokersSignal.set([joker1, joker2]);

      // No direct synergies
      synergyGraphServiceMock.findSynergiesBetween.and.returnValue([]);

      // Both have high flush affinity
      synergyGraphServiceMock.getJoker.and.callFake((id: string) => ({
        id,
        name: id,
        synergiesWith: [],
        strategies: [{ strategy: 'flush', affinity: 80 }],
        isScaling: false,
        generatesMoney: false,
        costEfficiency: 70,
        tags: ['flush'],
      } as any));

      const groups = service.groups();

      expect(groups.length).toBe(1);
      expect(groups[0].type).toBe('strategy');
      expect(groups[0].strategyType).toBe('flush');
    });
  });

  describe('totalSynergyScore', () => {
    it('should return 0 when no jokers', () => {
      jokersSignal.set([]);
      expect(service.totalSynergyScore()).toBe(0);
    });

    it('should return score from SynergyGraphService', () => {
      const joker1 = createJoker('j_a', 'Joker A', { slotIndex: 0 });
      const joker2 = createJoker('j_b', 'Joker B', { slotIndex: 1 });

      jokersSignal.set([joker1, joker2]);
      synergyGraphServiceMock.calculateSynergyScore.and.returnValue(20);

      expect(service.totalSynergyScore()).toBe(20);
      expect(synergyGraphServiceMock.calculateSynergyScore).toHaveBeenCalledWith(['j_a', 'j_b']);
    });
  });

  describe('getOrphanGuidance', () => {
    it('should return economy guidance for money-generating jokers', () => {
      synergyGraphServiceMock.getJoker.and.returnValue({
        id: 'j_egg',
        name: 'Egg',
        synergiesWith: [],
        strategies: [],
        isScaling: false,
        generatesMoney: true,
        costEfficiency: 50,
        tags: ['economy'],
      } as any);

      const guidance = service.getOrphanGuidance('j_egg', 3);
      expect(guidance).toContain('Economy');
    });

    it('should return sellable guidance for high sell value jokers', () => {
      synergyGraphServiceMock.getJoker.and.returnValue({
        id: 'j_test',
        name: 'Test',
        synergiesWith: [],
        strategies: [],
        isScaling: false,
        generatesMoney: false,
        costEfficiency: 50,
        tags: [],
      } as any);

      const guidance = service.getOrphanGuidance('j_test', 6);
      expect(guidance.toLowerCase()).toContain('sell');
    });

    it('should return waiting guidance for jokers with potential synergies', () => {
      synergyGraphServiceMock.getJoker.and.returnValue({
        id: 'j_test',
        name: 'Test',
        synergiesWith: [],
        strategies: [],
        isScaling: false,
        generatesMoney: false,
        costEfficiency: 50,
        tags: [],
      } as any);
      synergyGraphServiceMock.getSynergies.and.returnValue([
        { jokerId: 'j_other', strength: 'strong', reason: 'Test' },
      ]);

      const guidance = service.getOrphanGuidance('j_test', 3);
      expect(guidance.toLowerCase()).toContain('partner');
    });
  });
});
