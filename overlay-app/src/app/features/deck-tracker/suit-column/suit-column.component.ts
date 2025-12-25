import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Suit, Rank } from '../../../../../../shared/models';
import { CardCellComponent } from '../card-cell/card-cell.component';

const RANK_ORDER: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

@Component({
  selector: 'app-suit-column',
  standalone: true,
  imports: [CardCellComponent],
  template: `
    <div class="suit-column flex flex-col gap-0.5">
      <div class="suit-header text-center text-sm mb-1" [class]="suitColorClass()">
        {{ suitSymbol() }}
      </div>
      @for (rank of ranks; track rank) {
        <app-card-cell
          [rank]="rank"
          [suit]="suit()"
          [isDrawn]="isRankDrawn(rank)" />
      }
    </div>
  `,
  styles: [`
    .suit-header {
      text-shadow: 0 0 6px currentColor;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuitColumnComponent {
  readonly suit = input.required<Suit>();
  readonly drawnRanks = input<Set<Rank>>(new Set());

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

  isRankDrawn(rank: Rank): boolean {
    return this.drawnRanks().has(rank);
  }
}
