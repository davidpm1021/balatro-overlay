import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameStateService } from '../../core/services';
import { Suit, Rank } from '../../../../../shared/models';
import { SuitColumnComponent } from './suit-column/suit-column.component';

const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const ALL_RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

@Component({
  selector: 'app-deck-tracker',
  standalone: true,
  imports: [SuitColumnComponent],
  template: `
    <div class="deck-tracker bg-balatro-panel rounded-lg p-3">
      <div class="header flex items-center justify-between mb-2">
        <span class="text-xs text-white/70 font-semibold uppercase tracking-wide">Deck</span>
        <span class="text-xs text-balatro-accent">{{ remainingCount() }}/{{ totalCount() }}</span>
      </div>
      <div class="grid grid-cols-4 gap-2">
        @for (suit of suits; track suit) {
          <app-suit-column
            [suit]="suit"
            [drawnRanks]="drawnRanksBySuit()[suit]" />
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeckTrackerComponent {
  private readonly gameState = inject(GameStateService);

  readonly suits = ALL_SUITS;

  readonly deck = this.gameState.deck;

  readonly remainingCount = computed(() => this.deck()?.cardsRemaining ?? 52);

  readonly totalCount = computed(() => this.deck()?.totalCards ?? 52);

  readonly drawnRanksBySuit = computed(() => {
    const deck = this.deck();
    const result: Record<Suit, Set<Rank>> = {
      hearts: new Set<Rank>(),
      diamonds: new Set<Rank>(),
      clubs: new Set<Rank>(),
      spades: new Set<Rank>()
    };

    if (!deck) {
      return result;
    }

    // Build set of remaining cards for fast lookup
    const remainingSet = new Set(
      deck.remaining.map(card => `${card.suit}-${card.rank}`)
    );

    // For each possible card, check if it's NOT in remaining (meaning it's drawn)
    for (const suit of ALL_SUITS) {
      for (const rank of ALL_RANKS) {
        const key = `${suit}-${rank}`;
        if (!remainingSet.has(key)) {
          result[suit].add(rank);
        }
      }
    }

    return result;
  });
}
