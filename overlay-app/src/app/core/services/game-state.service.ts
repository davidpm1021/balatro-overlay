import { Injectable, signal, computed } from '@angular/core';
import { OverlayGameState, GamePhase, BlindState, DeckState } from '../../../../../shared/models';
import { JokerState } from '../../../../../shared/models';

declare global {
  interface Window {
    electronAPI?: {
      onGameStateUpdate: (callback: (gameState: OverlayGameState) => void) => void;
      toggleClickThrough: () => void;
      setOpacity: (opacity: number) => void;
      minimize: () => void;
      restore: () => void;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  // Main state signal
  private _state = signal<OverlayGameState | null>(null);

  // Exposed as readonly
  readonly state = this._state.asReadonly();

  // Derived signals for convenience
  readonly isConnected = computed(() => this._state() !== null);

  readonly phase = computed(() => this._state()?.progress.phase ?? 'menu');

  readonly deck = computed(() => this._state()?.deck ?? null);

  readonly jokers = computed(() => this._state()?.jokers ?? []);

  readonly blind = computed(() => this._state()?.blind ?? null);

  readonly progress = computed(() => this._state()?.progress ?? null);

  readonly handLevels = computed(() => this._state()?.handLevels ?? []);

  readonly shop = computed(() => this._state()?.shop ?? null);

  readonly isInShop = computed(() => this.phase() === 'shop');

  readonly isPlaying = computed(() => this.phase() === 'playing' || this.phase() === 'scoring');

  constructor() {
    this.initElectronListener();
  }

  private initElectronListener(): void {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onGameStateUpdate((gameState: OverlayGameState) => {
        this._state.set(gameState);
      });
    }
  }

  // Overlay controls
  toggleClickThrough(): void {
    window.electronAPI?.toggleClickThrough();
  }

  setOpacity(opacity: number): void {
    window.electronAPI?.setOpacity(opacity);
  }

  minimize(): void {
    window.electronAPI?.minimize();
  }

  restore(): void {
    window.electronAPI?.restore();
  }
}
