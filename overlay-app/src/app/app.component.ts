import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { GameStateService } from './core/services';
import { DeckTrackerComponent } from './features/deck-tracker';
import { JokerBarComponent } from './features/joker-display';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, DeckTrackerComponent, JokerBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private gameState = inject(GameStateService);

  // Local UI state
  clickThroughEnabled = signal(true);

  // Expose service signals
  isConnected = this.gameState.isConnected;
  phase = this.gameState.phase;

  toggleClickThrough(): void {
    const newState = !this.clickThroughEnabled();
    this.clickThroughEnabled.set(newState);
    this.gameState.setClickThrough(newState);
  }

  minimize(): void {
    this.gameState.minimizeOverlay();
  }
}
