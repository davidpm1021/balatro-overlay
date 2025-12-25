import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { GameStateService } from '../../core/services';
import { Suit, Rank, Card } from '../../../../../shared/models';
import { SuitColumnComponent } from './suit-column/suit-column.component';

const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const ALL_RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

export type CardLocation = 'deck' | 'hand' | 'discarded' | 'played';

export interface CardLocationMap {
  [key: string]: CardLocation;
}

@Component({
  selector: 'app-deck-tracker',
  standalone: true,
  imports: [SuitColumnComponent, NgClass],
  template: `
    <div class="deck-tracker bg-balatro-panel rounded-lg p-3">
      <div class="header flex items-center justify-between mb-2">
        <span class="text-xs text-white/70 font-semibold uppercase tracking-wide">Deck</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="toggleDiscardView()"
            [ngClass]="toggleButtonClasses()"
            title="Toggle discard pile highlight">
            {{ showDiscard() ? '🗑️ ' + discardedCount() : '🗑️' }}
          </button>
          <span class="text-xs text-balatro-accent">{{ remainingCount() }}/{{ totalCount() }}</span>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-2">
        @for (suit of suits; track suit) {
          <app-suit-column
            [suit]="suit"
            [cardLocations]="cardLocationsBySuit()[suit]"
            [showDiscard]="showDiscard()" />
        }
      </div>
      @if (showDiscard()) {
        <div class="legend flex items-center justify-center gap-3 mt-2 pt-2 border-t border-white/10 text-[10px] text-white/50">
          <span class="flex items-center gap-1">
            <span class="legend-box legend-discarded"></span> Discarded
          </span>
          <span class="flex items-center gap-1">
            <span class="legend-box legend-hand"></span> In Hand
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toggle-btn {
      font-size: 0.75rem;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      transition: background-color 0.2s, color 0.2s;
    }
    .toggle-btn-active {
      background-color: #4a9eff;
      color: white;
    }
    .toggle-btn-inactive {
      background-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
    }
    .toggle-btn-inactive:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    .legend-box {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 0.125rem;
    }
    .legend-discarded {
      background-color: rgba(255, 215, 0, 0.6);
    }
    .legend-hand {
      background-color: rgba(74, 158, 255, 0.6);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeckTrackerComponent {
  private readonly gameState = inject(GameStateService);

  readonly suits = ALL_SUITS;
  readonly showDiscard = signal(false);

  readonly deck = this.gameState.deck;

  readonly remainingCount = computed(() => this.deck()?.cardsRemaining ?? 52);
  readonly totalCount = computed(() => this.deck()?.totalCards ?? 52);
  readonly discardedCount = computed(() => this.deck()?.discarded.length ?? 0);

  readonly cardLocationsBySuit = computed(() => {
    const deck = this.deck();
    const result: Record<Suit, Map<Rank, CardLocation>> = {
      hearts: new Map(),
      diamonds: new Map(),
      clubs: new Map(),
      spades: new Map()
    };

    if (!deck) {
      return result;
    }

    // Build location maps for each pile
    const addCards = (cards: Card[], location: CardLocation) => {
      for (const card of cards) {
        result[card.suit].set(card.rank, location);
      }
    };

    // Start with all cards in deck
    for (const suit of ALL_SUITS) {
      for (const rank of ALL_RANKS) {
        result[suit].set(rank, 'deck');
      }
    }

    // Override with actual locations (order matters - later overrides earlier)
    addCards(deck.discarded, 'discarded');
    addCards(deck.played, 'played');
    addCards(deck.hand, 'hand');

    return result;
  });

  readonly toggleButtonClasses = computed(() => ({
    'toggle-btn': true,
    'toggle-btn-active': this.showDiscard(),
    'toggle-btn-inactive': !this.showDiscard()
  }));

  toggleDiscardView(): void {
    this.showDiscard.update(v => !v);
  }
}
