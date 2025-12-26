import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { GameStateService } from '../../core/services';
import { JokerCardComponent } from './joker-card.component';

@Component({
  selector: 'app-joker-bar',
  imports: [JokerCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="joker-bar balatro-panel">
      <!-- Header -->
      <div class="header">
        <span class="section-header">Jokers</span>
        <span class="count">{{ jokerCount() }}<span class="count-total">/{{ maxJokers }}</span></span>
      </div>

      <!-- Joker list -->
      @if (hasJokers()) {
        <div class="joker-list">
          @for (joker of sortedJokers(); track joker.id) {
            <app-joker-card [joker]="joker" />
          }
        </div>
      } @else {
        <div class="empty-state">
          No jokers yet
        </div>
      }
    </section>
  `,
  styles: [`
    .joker-bar {
      padding: 8px;
      width: 100%;
      box-sizing: border-box;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .section-header {
      font-size: 12px;
    }

    .count {
      font-size: 14px;
      font-weight: 600;
      color: #d4af37;
    }

    .count-total {
      color: rgba(255, 255, 255, 0.4);
      font-weight: 400;
    }

    .joker-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 400px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }

    .joker-list::-webkit-scrollbar {
      width: 4px;
    }

    .joker-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .joker-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }

    .empty-state {
      text-align: center;
      padding: 16px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 11px;
    }
  `]
})
export class JokerBarComponent {
  private gameState = inject(GameStateService);

  readonly maxJokers = 5;

  readonly jokers = this.gameState.jokers;

  readonly jokerCount = computed(() => this.jokers().length);

  readonly hasJokers = computed(() => this.jokers().length > 0);

  readonly sortedJokers = computed(() => {
    return [...this.jokers()].sort((a, b) => a.slotIndex - b.slotIndex);
  });
}
