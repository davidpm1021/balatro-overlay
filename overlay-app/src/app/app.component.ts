import { Component, ChangeDetectionStrategy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameStateService } from './core/services';
import { DeckTrackerComponent } from './features/deck-tracker';
import { SynergyDisplayComponent } from './features/synergy-display';
import { ShopOverlayComponent } from './features/strategy-intelligence';
import { BuildIdentityComponent } from './features/build-identity';
import { HandGuidanceComponent } from './features/hand-guidance';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, DeckTrackerComponent, SynergyDisplayComponent, ShopOverlayComponent, BuildIdentityComponent, HandGuidanceComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private gameState = inject(GameStateService);

  // Local UI state
  clickThroughEnabled = signal(true);
  collapsed = signal(false);
  showSettings = signal(false);
  opacity = signal(0.75);
  isHovering = signal(false);
  isDragging = signal(false);

  // Expose service signals
  isConnected = this.gameState.isConnected;
  phase = this.gameState.phase;
  currentAnte = this.gameState.currentAnte;
  currentRound = this.gameState.currentRound;
  handsRemaining = this.gameState.handsRemaining;
  discardsRemaining = this.gameState.discardsRemaining;

  // Double-click tracking for minimize
  private lastClickTime = 0;

  // Drag handling
  private boundDragMove = this.onDragMove.bind(this);
  private boundDragEnd = this.onDragEnd.bind(this);

  toggleClickThrough(): void {
    this.clickThroughEnabled.update(v => !v);
    this.gameState.toggleClickThrough();
  }

  minimize(): void {
    this.gameState.minimizeOverlay();
  }

  restore(): void {
    this.gameState.restoreOverlay();
  }

  toggleCollapsed(): void {
    const newCollapsed = !this.collapsed();
    this.collapsed.set(newCollapsed);
    if (newCollapsed) {
      this.minimize();
    } else {
      this.restore();
    }
  }

  toggleSettings(): void {
    this.showSettings.update(v => !v);
  }

  onOpacityChange(value: number): void {
    this.opacity.set(value);
    this.gameState.setOpacity(value);
  }

  onHeaderDoubleClick(): void {
    const now = Date.now();
    if (now - this.lastClickTime < 300) {
      this.toggleCollapsed();
    }
    this.lastClickTime = now;
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isHovering.set(true);
    // Disable click-through when hovering
    if (this.clickThroughEnabled()) {
      this.gameState.setClickThrough(false);
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHovering.set(false);
    // Re-enable click-through when leaving
    if (this.clickThroughEnabled()) {
      this.gameState.setClickThrough(true);
    }
  }

  // Drag handling for repositioning
  onDragStart(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
    this.gameState.startDrag(event.clientX, event.clientY);

    document.addEventListener('mousemove', this.boundDragMove);
    document.addEventListener('mouseup', this.boundDragEnd);
  }

  private onDragMove(event: MouseEvent): void {
    if (this.isDragging()) {
      this.gameState.dragMove(event.screenX, event.screenY);
    }
  }

  private onDragEnd(): void {
    this.isDragging.set(false);
    document.removeEventListener('mousemove', this.boundDragMove);
    document.removeEventListener('mouseup', this.boundDragEnd);
  }
}
