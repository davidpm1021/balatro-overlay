import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { GameStateService } from '../../core/services';
import { Suit, Rank, Card } from '../../../../../shared/models';
import { SuitColumnComponent } from './suit-column/suit-column.component';
import { CardDetailsPanelComponent } from './card-details-panel/card-details-panel.component';

const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const ALL_RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

export type CardLocation = 'deck' | 'hand' | 'discarded' | 'played';

export interface CardWithLocation extends Card {
  location: CardLocation;
}

export interface SelectedCell {
  suit: Suit;
  rank: Rank;
}

@Component({
  selector: 'app-deck-tracker',
  imports: [SuitColumnComponent, CardDetailsPanelComponent, NgClass],
  template: `
    <div class="deck-tracker balatro-panel" [class.has-details]="hasSelection()">
      <div class="header">
        <span class="section-header">Deck</span>
        <div class="header-right">
          <button
            type="button"
            (click)="toggleDiscardView()"
            [ngClass]="toggleButtonClasses()"
            title="Toggle discard pile highlight">
            {{ showDiscard() ? '👁' : '○' }}
          </button>
          <span class="count">{{ remainingCount() }}<span class="count-total">/{{ totalCount() }}</span></span>
        </div>
      </div>
      <div class="suit-grid" [class.compact]="hasSelection()">
        @for (suit of suits; track suit) {
          <app-suit-column
            [suit]="suit"
            [cardsBySuit]="cardsBySuitAndRank()[suit]"
            [showDiscard]="showDiscard()"
            [selectedCell]="selectedCell()"
            [compact]="hasSelection()"
            (cellClicked)="onCellClicked($event)" />
        }
      </div>
      @if (showDiscard() && !hasSelection()) {
        <div class="legend">
          <span class="legend-item">
            <span class="legend-box legend-discarded"></span>Disc
          </span>
          <span class="legend-item">
            <span class="legend-box legend-hand"></span>Hand
          </span>
          <span class="legend-item">
            <span class="legend-box legend-played"></span>Play
          </span>
        </div>
      }
      @if (hasSelection()) {
        <app-card-details-panel
          [cards]="selectedCards()"
          [suit]="selectedCell()!.suit"
          [rank]="selectedCell()!.rank"
          (close)="clearSelection()" />
      }
    </div>
  `,
  styles: [`
    .deck-tracker {
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
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toggle-btn {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 300ms ease-out;
      border: none;
      cursor: pointer;
    }
    .toggle-btn-active {
      background-color: rgba(212, 175, 55, 0.3);
      color: #d4af37;
    }
    .toggle-btn-inactive {
      background-color: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.5);
    }
    .toggle-btn-inactive:hover {
      background-color: rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.7);
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
    .suit-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      width: 100%;
      transition: all 300ms ease-out;
    }
    .suit-grid.compact {
      gap: 2px;
    }
    .legend {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .legend-box {
      width: 8px;
      height: 8px;
      border-radius: 2px;
    }
    .legend-discarded {
      background-color: rgba(212, 175, 55, 0.6);
    }
    .legend-hand {
      background-color: rgba(74, 158, 255, 0.6);
    }
    .legend-played {
      background-color: rgba(69, 232, 69, 0.6);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeckTrackerComponent {
  private readonly gameState = inject(GameStateService);

  readonly suits = ALL_SUITS;
  readonly showDiscard = signal(false);
  readonly selectedCell = signal<SelectedCell | null>(null);

  readonly deck = this.gameState.deck;

  readonly remainingCount = computed(() => this.deck()?.cardsRemaining ?? 52);
  readonly totalCount = computed(() => this.deck()?.totalCards ?? 52);

  /**
   * Groups all cards by suit and rank, preserving multiple instances
   * and tracking their locations.
   */
  readonly cardsBySuitAndRank = computed(() => {
    const deck = this.deck();
    const result: Record<Suit, Map<Rank, CardWithLocation[]>> = {
      hearts: new Map(),
      diamonds: new Map(),
      clubs: new Map(),
      spades: new Map()
    };

    // Initialize empty arrays for all rank+suit combos
    for (const suit of ALL_SUITS) {
      for (const rank of ALL_RANKS) {
        result[suit].set(rank, []);
      }
    }

    if (!deck) {
      return result;
    }

    // Helper to add cards with location
    const addCards = (cards: Card[], location: CardLocation) => {
      for (const card of cards) {
        const arr = result[card.suit].get(card.rank) ?? [];
        arr.push({ ...card, location });
        result[card.suit].set(card.rank, arr);
      }
    };

    // Add cards from each pile with their locations
    addCards(deck.remaining, 'deck');
    addCards(deck.hand, 'hand');
    addCards(deck.discarded, 'discarded');
    addCards(deck.played, 'played');

    return result;
  });

  /**
   * Gets all cards for the currently selected cell
   */
  readonly selectedCards = computed(() => {
    const cell = this.selectedCell();
    if (!cell) return [];

    const suitMap = this.cardsBySuitAndRank()[cell.suit];
    return suitMap.get(cell.rank) ?? [];
  });

  /**
   * Whether there's an active selection with cards to show
   */
  readonly hasSelection = computed(() => {
    return this.selectedCell() !== null && this.selectedCards().length > 0;
  });

  readonly toggleButtonClasses = computed(() => ({
    'toggle-btn': true,
    'toggle-btn-active': this.showDiscard(),
    'toggle-btn-inactive': !this.showDiscard()
  }));

  toggleDiscardView(): void {
    this.showDiscard.update(v => !v);
  }

  onCellClicked(cell: SelectedCell): void {
    const current = this.selectedCell();
    // Toggle off if clicking same cell
    if (current && current.suit === cell.suit && current.rank === cell.rank) {
      this.selectedCell.set(null);
    } else {
      this.selectedCell.set(cell);
    }
  }

  clearSelection(): void {
    this.selectedCell.set(null);
  }
}
