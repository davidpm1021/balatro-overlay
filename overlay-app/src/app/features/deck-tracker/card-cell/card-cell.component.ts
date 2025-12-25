import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Suit, Rank } from '../../../../../../shared/models';

@Component({
  selector: 'app-card-cell',
  standalone: true,
  template: `
    <div
      class="card-cell w-6 h-5 flex items-center justify-center text-xs font-mono font-bold rounded-sm transition-opacity duration-200"
      [class]="suitColorClass()"
      [class.opacity-30]="isDrawn()"
      [class.opacity-100]="!isDrawn()">
      {{ rank() }}
    </div>
  `,
  styles: [`
    .card-cell {
      background: rgba(255, 255, 255, 0.05);
    }
    .card-cell:not(.opacity-30) {
      text-shadow: 0 0 4px currentColor;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardCellComponent {
  readonly rank = input.required<Rank>();
  readonly suit = input.required<Suit>();
  readonly isDrawn = input<boolean>(false);

  readonly suitColorClass = computed(() => {
    const suitColors: Record<Suit, string> = {
      hearts: 'text-suit-hearts',
      diamonds: 'text-suit-diamonds',
      clubs: 'text-suit-clubs',
      spades: 'text-suit-spades'
    };
    return suitColors[this.suit()];
  });
}
