import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { GameStateService } from './core/services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private gameState = inject(GameStateService);

  readonly isConnected = this.gameState.isConnected;
  readonly phase = this.gameState.phase;

  toggleClickThrough(): void {
    this.gameState.toggleClickThrough();
  }

  minimize(): void {
    this.gameState.minimize();
  }
}
