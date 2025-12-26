import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services';
import { JokerCardComponent } from './joker-card.component';

@Component({
  selector: 'app-joker-bar',
  standalone: true,
  imports: [CommonModule, JokerCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="joker-bar bg-balatro-panel rounded-lg p-2">
      <!-- Header -->
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xs font-semibold text-white/80 uppercase tracking-wide">
          Jokers
        </h2>
        <span class="text-xs text-white/50">
          {{ jokerCount() }}/{{ maxJokers }}
        </span>
      </div>

      <!-- Joker list -->
      @if (hasJokers()) {
        <div class="joker-list flex gap-2 overflow-x-auto pb-1">
          @for (joker of sortedJokers(); track joker.id) {
            <app-joker-card [joker]="joker" />
          }
        </div>
      } @else {
        <div class="empty-state text-center py-4 text-white/40 text-xs">
          No jokers yet
        </div>
      }
    </section>
  `,
  styles: [`
    .joker-bar {
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .joker-list {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }

    .joker-list::-webkit-scrollbar {
      height: 4px;
    }

    .joker-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .joker-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
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
