import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Suit, Rank } from '../../../../../../shared/models';
import { CardLocation } from '../deck-tracker.component';

@Component({
  selector: 'app-card-cell',
  standalone: true,
  template: `
    <div
      class="card-cell w-6 h-5 flex items-center justify-center text-xs font-mono font-bold rounded-sm transition-all duration-200"
      [class]="cellClasses()">
      {{ rank() }}
    </div>
  `,
  styles: [`
    .card-cell {
      background: rgba(255, 255, 255, 0.05);
    }
    .card-cell.in-deck {
      text-shadow: 0 0 4px currentColor;
    }
    .card-cell.location-discarded {
      background: rgba(255, 215, 0, 0.15);
      box-shadow: inset 0 0 0 1px rgba(255, 215, 0, 0.4);
    }
    .card-cell.location-hand {
      background: rgba(74, 158, 255, 0.15);
      box-shadow: inset 0 0 0 1px rgba(74, 158, 255, 0.4);
    }
    .card-cell.location-played {
      background: rgba(68, 255, 68, 0.15);
      box-shadow: inset 0 0 0 1px rgba(68, 255, 68, 0.4);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardCellComponent {
  readonly rank = input.required<Rank>();
  readonly suit = input.required<Suit>();
  readonly location = input<CardLocation>('deck');
  readonly showLocationHighlight = input<boolean>(false);

  readonly cellClasses = computed(() => {
    const suitColors: Record<Suit, string> = {
      hearts: 'text-suit-hearts',
      diamonds: 'text-suit-diamonds',
      clubs: 'text-suit-clubs',
      spades: 'text-suit-spades'
    };

    const loc = this.location();
    const isInDeck = loc === 'deck';
    const showHighlight = this.showLocationHighlight();

    const classes = [suitColors[this.suit()]];

    if (isInDeck) {
      classes.push('opacity-100', 'in-deck');
    } else {
      classes.push('opacity-30');
      // Show location-specific highlighting when toggle is on
      if (showHighlight) {
        classes.push(`location-${loc}`);
      }
    }

    return classes.join(' ');
  });
}
