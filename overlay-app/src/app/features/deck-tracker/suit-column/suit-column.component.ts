import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { Suit, Rank } from '../../../../../../shared/models';
import { CardCellComponent } from '../card-cell/card-cell.component';
import { CardWithLocation, SelectedCell } from '../deck-tracker.component';

const RANK_ORDER: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

@Component({
  selector: 'app-suit-column',
  imports: [CardCellComponent],
  template: `
    <div class="suit-column" [class.compact]="compact()">
      <div class="suit-header" [class]="suitColorClass()">
        {{ suitSymbol() }}
      </div>
      <div class="cards">
        @for (rank of ranks; track rank) {
          <app-card-cell
            [rank]="rank"
            [suit]="suit()"
            [cards]="getCards(rank)"
            [showLocationHighlight]="showDiscard()"
            [isSelected]="isCellSelected(rank)"
            [compact]="compact()"
            (cellClicked)="onCellClicked(rank)" />
        }
      </div>
    </div>
  `,
  styles: [`
    .suit-column {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      width: 100%;
    }
    .suit-header {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 6px;
      text-shadow: 0 0 8px currentColor;
      text-align: center;
    }
    .suit-column.compact .suit-header {
      font-size: 16px;
      margin-bottom: 4px;
    }
    .cards {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .suit-column.compact .cards {
      gap: 1px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuitColumnComponent {
  readonly suit = input.required<Suit>();
  readonly cardsBySuit = input<Map<Rank, CardWithLocation[]>>(new Map());
  readonly showDiscard = input<boolean>(false);
  readonly selectedCell = input<SelectedCell | null>(null);
  readonly compact = input<boolean>(false);

  readonly cellClicked = output<SelectedCell>();

  readonly ranks = RANK_ORDER;

  readonly suitSymbol = computed(() => SUIT_SYMBOLS[this.suit()]);

  readonly suitColorClass = computed(() => {
    const suitColors: Record<Suit, string> = {
      hearts: 'text-suit-hearts',
      diamonds: 'text-suit-diamonds',
      clubs: 'text-suit-clubs',
      spades: 'text-suit-spades'
    };
    return suitColors[this.suit()];
  });

  getCards(rank: Rank): CardWithLocation[] {
    return this.cardsBySuit().get(rank) ?? [];
  }

  isCellSelected(rank: Rank): boolean {
    const sel = this.selectedCell();
    return sel !== null && sel.suit === this.suit() && sel.rank === rank;
  }

  onCellClicked(rank: Rank): void {
    this.cellClicked.emit({ suit: this.suit(), rank });
  }
}
