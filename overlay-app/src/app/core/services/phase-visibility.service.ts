import { Injectable, computed, signal, inject, Signal } from '@angular/core';
import { GameStateService } from './game-state.service';
import { GamePhase } from '../../../../../shared/models';

/**
 * Panel identifiers for visibility management
 */
export type PanelId =
  | 'deck-tracker'
  | 'hand-guidance'
  | 'build-identity'
  | 'synergy-display'
  | 'shop-advisor';

/**
 * Configuration for when a panel should be visible
 */
export interface PanelConfig {
  showInPhases: GamePhase[];
  defaultWhenUnknown: boolean;
}

/**
 * Panel visibility configurations by panel ID
 */
export const PANEL_CONFIGS: Record<PanelId, PanelConfig> = {
  'deck-tracker': {
    showInPhases: ['playing', 'scoring'],
    defaultWhenUnknown: false,
  },
  'hand-guidance': {
    showInPhases: ['playing', 'scoring'],
    defaultWhenUnknown: false,
  },
  'build-identity': {
    showInPhases: ['blind_select', 'playing', 'scoring', 'shop', 'booster', 'game_over', 'victory'],
    defaultWhenUnknown: true,
  },
  'synergy-display': {
    showInPhases: ['shop', 'booster', 'playing', 'scoring'],
    defaultWhenUnknown: false,
  },
  'shop-advisor': {
    showInPhases: ['shop'],
    defaultWhenUnknown: false,
  },
};

const STORAGE_KEY = 'panel-visibility-overrides';

/**
 * All known game phases - used to determine if a phase is truly unknown
 */
const KNOWN_PHASES: GamePhase[] = [
  'menu',
  'blind_select',
  'playing',
  'scoring',
  'shop',
  'booster',
  'game_over',
  'victory',
];

/**
 * Service to control panel visibility based on game phase.
 *
 * Panels are shown/hidden based on the current game phase to reduce clutter
 * and show only relevant information. Users can override the default behavior
 * for each panel.
 */
@Injectable({ providedIn: 'root' })
export class PhaseVisibilityService {
  private gameState = inject(GameStateService);

  /**
   * User overrides for panel visibility.
   * null = use phase-based default
   * true = always show
   * false = always hide
   */
  private overrides = signal<Record<PanelId, boolean | null>>({
    'deck-tracker': null,
    'hand-guidance': null,
    'build-identity': null,
    'synergy-display': null,
    'shop-advisor': null,
  });

  /**
   * Cache of computed signals for panel visibility
   */
  private visibilityCache = new Map<PanelId, Signal<boolean>>();

  constructor() {
    this.loadOverrides();
  }

  /**
   * Get a computed signal that indicates whether a panel should be visible.
   * The signal reacts to both phase changes and override changes.
   *
   * @param panelId The panel to check visibility for
   * @returns A signal that returns true if the panel should be visible
   */
  isPanelVisible(panelId: PanelId): Signal<boolean> {
    // Return cached signal if available
    const cached = this.visibilityCache.get(panelId);
    if (cached) {
      return cached;
    }

    // Create new computed signal
    const visibilitySignal = computed(() => {
      const override = this.overrides()[panelId];
      if (override !== null) {
        return override;
      }

      const currentPhase = this.gameState.phase();
      const config = PANEL_CONFIGS[panelId];

      if (!config) {
        return true;
      }

      // Check if phase is in the show list
      if (config.showInPhases.includes(currentPhase as GamePhase)) {
        return true;
      }

      // Check if phase is known - if known but not in show list, hide
      if (KNOWN_PHASES.includes(currentPhase as GamePhase)) {
        return false;
      }

      // Truly unknown phase - use defaultWhenUnknown
      return config.defaultWhenUnknown;
    });

    // Cache and return
    this.visibilityCache.set(panelId, visibilitySignal);
    return visibilitySignal;
  }

  /**
   * Set a user override for a panel's visibility.
   *
   * @param panelId The panel to override
   * @param visible true = always show, false = always hide, null = use phase default
   */
  setOverride(panelId: PanelId, visible: boolean | null): void {
    this.overrides.update(current => ({ ...current, [panelId]: visible }));
    this.persistOverrides();
  }

  /**
   * Get the current override value for a panel.
   *
   * @param panelId The panel to check
   * @returns The current override value (true, false, or null)
   */
  getOverride(panelId: PanelId): boolean | null {
    return this.overrides()[panelId];
  }

  /**
   * Reset all overrides to phase-based defaults.
   */
  resetOverrides(): void {
    this.overrides.set({
      'deck-tracker': null,
      'hand-guidance': null,
      'build-identity': null,
      'synergy-display': null,
      'shop-advisor': null,
    });
    this.persistOverrides();
  }

  /**
   * Persist overrides to localStorage
   */
  private persistOverrides(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.overrides()));
    } catch {
      // Ignore storage errors (e.g., quota exceeded, private browsing)
    }
  }

  /**
   * Load overrides from localStorage
   */
  private loadOverrides(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.overrides.set({ ...this.overrides(), ...parsed });
      }
    } catch {
      // Ignore parse errors, use defaults
    }
  }
}
