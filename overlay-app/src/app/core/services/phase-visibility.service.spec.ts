import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PhaseVisibilityService, PanelId, PANEL_CONFIGS } from './phase-visibility.service';
import { GameStateService } from './game-state.service';
import { GamePhase } from '../../../../../shared/models';

describe('PhaseVisibilityService', () => {
  let service: PhaseVisibilityService;
  let mockGameState: jasmine.SpyObj<GameStateService>;
  let phaseSignal: ReturnType<typeof signal<GamePhase>>;

  beforeEach(() => {
    phaseSignal = signal<GamePhase>('menu');
    mockGameState = jasmine.createSpyObj('GameStateService', [], {
      phase: phaseSignal,
    });

    // Clear localStorage before each test
    localStorage.removeItem('panel-visibility-overrides');

    TestBed.configureTestingModule({
      providers: [
        PhaseVisibilityService,
        { provide: GameStateService, useValue: mockGameState },
      ],
    });

    service = TestBed.inject(PhaseVisibilityService);
  });

  afterEach(() => {
    localStorage.removeItem('panel-visibility-overrides');
  });

  describe('isPanelVisible', () => {
    describe('deck-tracker panel', () => {
      it('should be hidden in menu phase', () => {
        phaseSignal.set('menu');
        const visible = service.isPanelVisible('deck-tracker');
        expect(visible()).toBe(false);
      });

      it('should be visible in playing phase', () => {
        phaseSignal.set('playing');
        const visible = service.isPanelVisible('deck-tracker');
        expect(visible()).toBe(true);
      });

      it('should be visible in scoring phase', () => {
        phaseSignal.set('scoring');
        const visible = service.isPanelVisible('deck-tracker');
        expect(visible()).toBe(true);
      });

      it('should be hidden in shop phase', () => {
        phaseSignal.set('shop');
        const visible = service.isPanelVisible('deck-tracker');
        expect(visible()).toBe(false);
      });

      it('should be hidden in blind_select phase', () => {
        phaseSignal.set('blind_select');
        const visible = service.isPanelVisible('deck-tracker');
        expect(visible()).toBe(false);
      });
    });

    describe('hand-guidance panel', () => {
      it('should be hidden in menu phase', () => {
        phaseSignal.set('menu');
        const visible = service.isPanelVisible('hand-guidance');
        expect(visible()).toBe(false);
      });

      it('should be visible in playing phase', () => {
        phaseSignal.set('playing');
        const visible = service.isPanelVisible('hand-guidance');
        expect(visible()).toBe(true);
      });

      it('should be visible in scoring phase', () => {
        phaseSignal.set('scoring');
        const visible = service.isPanelVisible('hand-guidance');
        expect(visible()).toBe(true);
      });

      it('should be hidden in shop phase', () => {
        phaseSignal.set('shop');
        const visible = service.isPanelVisible('hand-guidance');
        expect(visible()).toBe(false);
      });
    });

    describe('build-identity panel', () => {
      it('should be hidden in menu phase', () => {
        phaseSignal.set('menu');
        const visible = service.isPanelVisible('build-identity');
        expect(visible()).toBe(false);
      });

      it('should be visible in blind_select phase', () => {
        phaseSignal.set('blind_select');
        const visible = service.isPanelVisible('build-identity');
        expect(visible()).toBe(true);
      });

      it('should be visible in playing phase', () => {
        phaseSignal.set('playing');
        const visible = service.isPanelVisible('build-identity');
        expect(visible()).toBe(true);
      });

      it('should be visible in shop phase', () => {
        phaseSignal.set('shop');
        const visible = service.isPanelVisible('build-identity');
        expect(visible()).toBe(true);
      });

      it('should be visible in booster phase', () => {
        phaseSignal.set('booster');
        const visible = service.isPanelVisible('build-identity');
        expect(visible()).toBe(true);
      });

      it('should be visible in game_over phase', () => {
        phaseSignal.set('game_over');
        const visible = service.isPanelVisible('build-identity');
        expect(visible()).toBe(true);
      });

      it('should be visible in victory phase', () => {
        phaseSignal.set('victory');
        const visible = service.isPanelVisible('build-identity');
        expect(visible()).toBe(true);
      });

      it('should default to visible for unknown phases', () => {
        // Force an unknown phase
        phaseSignal.set('unknown_phase' as GamePhase);
        const visible = service.isPanelVisible('build-identity');
        expect(visible()).toBe(true);
      });
    });

    describe('synergy-display panel', () => {
      it('should be hidden in menu phase', () => {
        phaseSignal.set('menu');
        const visible = service.isPanelVisible('synergy-display');
        expect(visible()).toBe(false);
      });

      it('should be visible in shop phase', () => {
        phaseSignal.set('shop');
        const visible = service.isPanelVisible('synergy-display');
        expect(visible()).toBe(true);
      });

      it('should be visible in booster phase', () => {
        phaseSignal.set('booster');
        const visible = service.isPanelVisible('synergy-display');
        expect(visible()).toBe(true);
      });

      it('should be visible in playing phase', () => {
        phaseSignal.set('playing');
        const visible = service.isPanelVisible('synergy-display');
        expect(visible()).toBe(true);
      });

      it('should be hidden in blind_select phase', () => {
        phaseSignal.set('blind_select');
        const visible = service.isPanelVisible('synergy-display');
        expect(visible()).toBe(false);
      });
    });

    describe('shop-advisor panel', () => {
      it('should be hidden in menu phase', () => {
        phaseSignal.set('menu');
        const visible = service.isPanelVisible('shop-advisor');
        expect(visible()).toBe(false);
      });

      it('should be visible only in shop phase', () => {
        phaseSignal.set('shop');
        const visible = service.isPanelVisible('shop-advisor');
        expect(visible()).toBe(true);
      });

      it('should be hidden in playing phase', () => {
        phaseSignal.set('playing');
        const visible = service.isPanelVisible('shop-advisor');
        expect(visible()).toBe(false);
      });

      it('should be visible in booster phase (for Buffoon packs)', () => {
        phaseSignal.set('booster');
        const visible = service.isPanelVisible('shop-advisor');
        expect(visible()).toBe(true);
      });
    });
  });

  describe('user overrides', () => {
    it('should allow user to always show a panel', () => {
      phaseSignal.set('shop');
      service.setOverride('deck-tracker', true);

      const visible = service.isPanelVisible('deck-tracker');
      expect(visible()).toBe(true);
    });

    it('should allow user to always hide a panel', () => {
      phaseSignal.set('playing');
      service.setOverride('deck-tracker', false);

      const visible = service.isPanelVisible('deck-tracker');
      expect(visible()).toBe(false);
    });

    it('should allow user to reset to auto (null)', () => {
      phaseSignal.set('playing');
      service.setOverride('deck-tracker', false);
      expect(service.isPanelVisible('deck-tracker')()).toBe(false);

      service.setOverride('deck-tracker', null);
      expect(service.isPanelVisible('deck-tracker')()).toBe(true);
    });

    it('should return current override value', () => {
      expect(service.getOverride('deck-tracker')).toBeNull();

      service.setOverride('deck-tracker', true);
      expect(service.getOverride('deck-tracker')).toBe(true);

      service.setOverride('deck-tracker', false);
      expect(service.getOverride('deck-tracker')).toBe(false);
    });

    it('should reset all overrides', () => {
      service.setOverride('deck-tracker', true);
      service.setOverride('hand-guidance', false);
      service.setOverride('shop-advisor', true);

      service.resetOverrides();

      expect(service.getOverride('deck-tracker')).toBeNull();
      expect(service.getOverride('hand-guidance')).toBeNull();
      expect(service.getOverride('shop-advisor')).toBeNull();
    });

    it('should apply override regardless of phase', () => {
      // Force always show
      service.setOverride('shop-advisor', true);

      phaseSignal.set('playing');
      expect(service.isPanelVisible('shop-advisor')()).toBe(true);

      phaseSignal.set('menu');
      expect(service.isPanelVisible('shop-advisor')()).toBe(true);

      // Force always hide
      service.setOverride('build-identity', false);

      phaseSignal.set('playing');
      expect(service.isPanelVisible('build-identity')()).toBe(false);

      phaseSignal.set('shop');
      expect(service.isPanelVisible('build-identity')()).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist overrides to localStorage', () => {
      service.setOverride('deck-tracker', true);
      service.setOverride('hand-guidance', false);

      const stored = localStorage.getItem('panel-visibility-overrides');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed['deck-tracker']).toBe(true);
      expect(parsed['hand-guidance']).toBe(false);
    });

    it('should load overrides from localStorage on initialization', () => {
      const overrides = {
        'deck-tracker': true,
        'hand-guidance': false,
        'build-identity': null,
        'synergy-display': null,
        'shop-advisor': true,
      };
      localStorage.setItem('panel-visibility-overrides', JSON.stringify(overrides));

      // Reset TestBed to create a fresh service that loads from localStorage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PhaseVisibilityService,
          { provide: GameStateService, useValue: { phase: signal<GamePhase>('menu') } },
        ],
      });

      const newService = TestBed.inject(PhaseVisibilityService);

      expect(newService.getOverride('deck-tracker')).toBe(true);
      expect(newService.getOverride('hand-guidance')).toBe(false);
      expect(newService.getOverride('shop-advisor')).toBe(true);
    });

    it('should clear localStorage when resetting overrides', () => {
      service.setOverride('deck-tracker', true);
      expect(localStorage.getItem('panel-visibility-overrides')).not.toBeNull();

      service.resetOverrides();

      const stored = localStorage.getItem('panel-visibility-overrides');
      const parsed = JSON.parse(stored!);
      expect(parsed['deck-tracker']).toBeNull();
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorage.setItem('panel-visibility-overrides', 'invalid json');

      // Should not throw, should use defaults
      expect(() => {
        const newService = TestBed.inject(PhaseVisibilityService);
        const visible = newService.isPanelVisible('deck-tracker');
        expect(visible).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('reactive updates', () => {
    it('should update visibility when phase changes', () => {
      const visible = service.isPanelVisible('deck-tracker');

      phaseSignal.set('menu');
      expect(visible()).toBe(false);

      phaseSignal.set('playing');
      expect(visible()).toBe(true);

      phaseSignal.set('shop');
      expect(visible()).toBe(false);

      phaseSignal.set('scoring');
      expect(visible()).toBe(true);
    });

    it('should return the same signal instance for same panel', () => {
      const visible1 = service.isPanelVisible('deck-tracker');
      const visible2 = service.isPanelVisible('deck-tracker');

      // They should be the same reference (cached)
      expect(visible1).toBe(visible2);
    });
  });

  describe('PANEL_CONFIGS export', () => {
    it('should export PANEL_CONFIGS for external use', () => {
      expect(PANEL_CONFIGS).toBeDefined();
      expect(PANEL_CONFIGS['deck-tracker']).toBeDefined();
      expect(PANEL_CONFIGS['hand-guidance']).toBeDefined();
      expect(PANEL_CONFIGS['build-identity']).toBeDefined();
      expect(PANEL_CONFIGS['synergy-display']).toBeDefined();
      expect(PANEL_CONFIGS['shop-advisor']).toBeDefined();
    });

    it('should have correct phase configurations', () => {
      expect(PANEL_CONFIGS['deck-tracker'].showInPhases).toContain('playing');
      expect(PANEL_CONFIGS['deck-tracker'].showInPhases).toContain('scoring');
      expect(PANEL_CONFIGS['deck-tracker'].showInPhases).not.toContain('shop');

      expect(PANEL_CONFIGS['shop-advisor'].showInPhases).toContain('shop');
      expect(PANEL_CONFIGS['shop-advisor'].showInPhases).not.toContain('playing');
    });
  });
});
