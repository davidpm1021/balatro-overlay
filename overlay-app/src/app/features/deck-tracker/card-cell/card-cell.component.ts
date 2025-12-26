import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { Suit, Rank } from '../../../../../../shared/models';
import { CardWithLocation } from '../deck-tracker.component';

@Component({
  selector: 'app-card-cell',
  template: `
    <div
      class="card-cell"
      [class]="cellClasses()"
      [class.compact]="compact()"
      (click)="onClick()">
      @if (hasModification()) {
        <span class="mod-indicator" [class]="modIndicatorClass()"></span>
      }
      <span class="rank-text">{{ rank() }}</span>
      @if (cardCount() > 1) {
        <span class="count-badge">×{{ cardCount() }}</span>
      }
    </div>
  `,
  styles: [`
    .card-cell {
      width: 100%;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      transition: all 300ms ease-out;
      position: relative;
      cursor: pointer;
    }
    .card-cell.compact {
      height: 20px;
      font-size: 12px;
      border-radius: 3px;
    }
    .card-cell:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .card-cell.selected {
      box-shadow: 0 0 0 2px var(--balatro-gold);
    }
    .card-cell.in-deck {
      text-shadow: 0 0 6px currentColor;
    }
    .card-cell.empty {
      opacity: 0.15;
      transform: scale(0.9);
    }
    .card-cell.dimmed {
      opacity: 0.25;
      transform: scale(0.95);
    }
    .card-cell.location-discarded {
      opacity: 0.6;
      background: rgba(212, 175, 55, 0.25);
      box-shadow: inset 0 0 0 1px rgba(212, 175, 55, 0.6);
      transform: scale(1);
    }
    .card-cell.location-hand {
      opacity: 0.8;
      background: rgba(74, 158, 255, 0.25);
      box-shadow: inset 0 0 0 1px rgba(74, 158, 255, 0.6);
      transform: scale(1);
    }
    .card-cell.location-played {
      opacity: 0.7;
      background: rgba(69, 232, 69, 0.25);
      box-shadow: inset 0 0 0 1px rgba(69, 232, 69, 0.6);
      transform: scale(1);
    }
    .rank-text {
      position: relative;
      z-index: 1;
    }
    .mod-indicator {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .card-cell.compact .mod-indicator {
      width: 4px;
      height: 4px;
      top: 2px;
      left: 2px;
    }
    .mod-indicator.has-enhancement {
      background: linear-gradient(135deg, #4dabf7, #e74c3c);
    }
    .mod-indicator.has-edition {
      background: linear-gradient(135deg, #c0c0c0, #ffd700);
    }
    .mod-indicator.has-seal {
      background: #d4af37;
    }
    .mod-indicator.has-multiple-mods {
      background: linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
    }
    .count-badge {
      position: absolute;
      bottom: 1px;
      right: 2px;
      font-size: 9px;
      font-weight: 700;
      color: var(--balatro-gold);
      background: rgba(0, 0, 0, 0.6);
      padding: 0 3px;
      border-radius: 2px;
      line-height: 1.2;
    }
    .card-cell.compact .count-badge {
      font-size: 7px;
      padding: 0 2px;
      bottom: 0;
      right: 1px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardCellComponent {
  readonly rank = input.required<Rank>();
  readonly suit = input.required<Suit>();
  readonly cards = input<CardWithLocation[]>([]);
  readonly showLocationHighlight = input<boolean>(false);
  readonly isSelected = input<boolean>(false);
  readonly compact = input<boolean>(false);

  readonly cellClicked = output<void>();

  readonly cardCount = computed(() => this.cards().length);

  readonly hasModification = computed(() => {
    return this.cards().some(c =>
      c.enhancement !== 'none' ||
      c.edition !== 'none' ||
      c.seal !== 'none'
    );
  });

  readonly modIndicatorClass = computed(() => {
    const cards = this.cards();
    let hasEnhancement = false;
    let hasEdition = false;
    let hasSeal = false;

    for (const card of cards) {
      if (card.enhancement !== 'none') hasEnhancement = true;
      if (card.edition !== 'none') hasEdition = true;
      if (card.seal !== 'none') hasSeal = true;
    }

    const modCount = [hasEnhancement, hasEdition, hasSeal].filter(Boolean).length;
    if (modCount > 1) return 'has-multiple-mods';
    if (hasEnhancement) return 'has-enhancement';
    if (hasEdition) return 'has-edition';
    if (hasSeal) return 'has-seal';
    return '';
  });

  /**
   * Determines the primary location for display purposes.
   * Priority: hand > played > discarded > deck
   */
  readonly primaryLocation = computed(() => {
    const cards = this.cards();
    if (cards.length === 0) return null;
    if (cards.some(c => c.location === 'hand')) return 'hand';
    if (cards.some(c => c.location === 'played')) return 'played';
    if (cards.some(c => c.location === 'discarded')) return 'discarded';
    if (cards.some(c => c.location === 'deck')) return 'deck';
    return null;
  });

  readonly cellClasses = computed(() => {
    const suitColors: Record<Suit, string> = {
      hearts: 'text-suit-hearts',
      diamonds: 'text-suit-diamonds',
      clubs: 'text-suit-clubs',
      spades: 'text-suit-spades'
    };

    const cards = this.cards();
    const isEmpty = cards.length === 0;
    const hasCardsInDeck = cards.some(c => c.location === 'deck');
    const showHighlight = this.showLocationHighlight();
    const loc = this.primaryLocation();

    const classes = [suitColors[this.suit()]];

    if (this.isSelected()) {
      classes.push('selected');
    }

    if (isEmpty) {
      classes.push('empty');
    } else if (hasCardsInDeck) {
      classes.push('in-deck');
    } else {
      // No cards in deck - show location highlighting
      if (showHighlight && loc) {
        classes.push(`location-${loc}`);
      } else {
        classes.push('dimmed');
      }
    }

    return classes.join(' ');
  });

  onClick(): void {
    if (this.cards().length > 0) {
      this.cellClicked.emit();
    }
  }
}
