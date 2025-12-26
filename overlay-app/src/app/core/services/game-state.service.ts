import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { OverlayGameState } from '../../../../../shared/models';

declare global {
  interface Window {
    electronAPI?: {
      onGameStateUpdate: (callback: (gameState: OverlayGameState) => void) => void;
      setClickThrough: (enabled: boolean) => void;
      setOpacity: (opacity: number) => void;
      minimizeOverlay: () => void;
      restoreOverlay: () => void;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private platformId = inject(PLATFORM_ID);

  // Main state signal
  state = signal<OverlayGameState | null>(null);

  // Derived computed signals
  isConnected = computed(() => this.state() !== null);
  phase = computed(() => this.state()?.progress.phase ?? 'menu');
  isInGame = computed(() => this.phase() !== 'menu');
  currentAnte = computed(() => this.state()?.progress.ante ?? 0);

  // Deck state
  deck = computed(() => this.state()?.deck ?? null);
  deckRemaining = computed(() => this.state()?.deck.remaining ?? []);
  hand = computed(() => this.state()?.deck.hand ?? []);
  discarded = computed(() => this.state()?.deck.discarded ?? []);
  selectedCards = computed(() => this.hand().filter(c => c.highlighted));

  // Jokers
  jokers = computed(() => this.state()?.jokers ?? []);

  // Progress
  progress = computed(() => this.state()?.progress ?? null);
  handsRemaining = computed(() => this.state()?.progress.handsRemaining ?? 0);
  discardsRemaining = computed(() => this.state()?.progress.discardsRemaining ?? 0);
  money = computed(() => this.state()?.progress.money ?? 0);

  // Blind
  blind = computed(() => this.state()?.blind ?? null);

  // Hand levels
  handLevels = computed(() => this.state()?.handLevels ?? []);

  // Shop
  shop = computed(() => this.state()?.shop ?? null);
  isInShop = computed(() => this.phase() === 'shop');

  // Playing state
  isPlaying = computed(() => this.phase() === 'playing' || this.phase() === 'scoring');

  constructor() {
    this.initElectronListener();
  }

  private initElectronListener(): void {
    if (isPlatformBrowser(this.platformId) && window.electronAPI) {
      window.electronAPI.onGameStateUpdate((gameState: OverlayGameState) => {
        this.state.set(gameState);
      });
    }
  }

  // Methods update the signal
  updateState(newState: OverlayGameState): void {
    this.state.set(newState);
  }

  // Overlay controls
  setClickThrough(enabled: boolean): void {
    window.electronAPI?.setClickThrough(enabled);
  }

  setOpacity(opacity: number): void {
    window.electronAPI?.setOpacity(opacity);
  }

  minimizeOverlay(): void {
    window.electronAPI?.minimizeOverlay();
  }

  restoreOverlay(): void {
    window.electronAPI?.restoreOverlay();
  }
}
