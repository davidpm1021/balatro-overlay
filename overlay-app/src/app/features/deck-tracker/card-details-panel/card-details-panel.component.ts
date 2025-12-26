import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { Suit, Rank, Enhancement, Edition, Seal } from '../../../../../../shared/models';
import { CardWithLocation } from '../deck-tracker.component';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

const ENHANCEMENT_LABELS: Record<Enhancement, string> = {
  none: 'Base',
  bonus: 'Bonus',
  mult: 'Mult',
  wild: 'Wild',
  glass: 'Glass',
  steel: 'Steel',
  stone: 'Stone',
  gold: 'Gold',
  lucky: 'Lucky'
};

const ENHANCEMENT_TOOLTIPS: Record<Enhancement, string> = {
  none: 'No enhancement',
  bonus: '+30 Chips',
  mult: '+4 Mult',
  wild: 'Can be used as any suit',
  glass: 'x2 Mult, 1 in 4 chance to destroy after scoring',
  steel: 'x1.5 Mult while in hand',
  stone: '+50 Chips, no rank or suit',
  gold: '$3 when held at end of round',
  lucky: '1 in 5 chance for +20 Mult, 1 in 15 chance to win $20'
};

const EDITION_LABELS: Record<Edition, string> = {
  none: '',
  foil: 'Foil',
  holographic: 'Holo',
  polychrome: 'Poly',
  negative: 'Neg'
};

const EDITION_TOOLTIPS: Record<Edition, string> = {
  none: '',
  foil: '+50 Chips',
  holographic: '+10 Mult',
  polychrome: 'x1.5 Mult',
  negative: '+1 Joker slot'
};

const SEAL_LABELS: Record<Seal, string> = {
  none: '',
  gold: 'Gold Seal',
  red: 'Red Seal',
  blue: 'Blue Seal',
  purple: 'Purple Seal'
};

const SEAL_TOOLTIPS: Record<Seal, string> = {
  none: '',
  gold: 'Earn $3 when this card is played and scores',
  red: 'Retrigger this card once',
  blue: 'Creates a Planet card if held at end of round (must have room)',
  purple: 'Creates a Tarot card when discarded (must have room)'
};

const LOCATION_LABELS: Record<string, string> = {
  deck: 'In Deck',
  hand: 'In Hand',
  discarded: 'Discarded',
  played: 'In Play'
};

@Component({
  selector: 'app-card-details-panel',
  template: `
    <div class="details-panel balatro-card">
      <div class="panel-header">
        <span class="card-title" [class]="suitColorClass()">
          {{ rank() }}{{ suitSymbol() }}
        </span>
        <span class="card-count">({{ cards().length }} card{{ cards().length > 1 ? 's' : '' }})</span>
        <button class="close-btn" (click)="close.emit()" title="Close">×</button>
      </div>
      <div class="card-list">
        @for (card of cards(); track card.id) {
          <div class="card-entry" [class.debuffed]="card.debuffed">
            <div class="card-mods">
              @if (card.enhancement !== 'none') {
                <span class="mod-tag" [class]="'enhancement-' + card.enhancement"
                      [title]="getEnhancementTooltip(card.enhancement)">
                  {{ getEnhancementLabel(card.enhancement) }}
                </span>
              }
              @if (card.edition !== 'none') {
                <span class="mod-tag" [class]="'edition-' + card.edition"
                      [title]="getEditionTooltip(card.edition)">
                  {{ getEditionLabel(card.edition) }}
                </span>
              }
              @if (card.seal !== 'none') {
                <span class="mod-tag" [class]="'seal-' + card.seal"
                      [title]="getSealTooltip(card.seal)">
                  {{ getSealLabel(card.seal) }}
                </span>
              }
              @if (card.enhancement === 'none' && card.edition === 'none' && card.seal === 'none') {
                <span class="mod-tag base" title="No modifications">Base</span>
              }
            </div>
            <div class="card-state">
              <span class="location" [class]="'location-' + card.location">
                {{ getLocationLabel(card.location) }}
              </span>
              @if (card.debuffed) {
                <span class="debuff-indicator">Debuffed</span>
              }
              @if (card.faceDown) {
                <span class="facedown-indicator">Face Down</span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .details-panel {
      margin-top: 12px;
      padding: 12px;
      font-size: 12px;
    }
    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      margin-bottom: 10px;
    }
    .card-title {
      font-size: 20px;
      font-weight: 700;
      text-shadow: 0 0 8px currentColor;
    }
    .card-count {
      color: rgba(255, 255, 255, 0.5);
      flex: 1;
      font-size: 12px;
    }
    .close-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: rgba(255, 255, 255, 0.6);
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.9);
    }
    .card-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card-entry {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    .card-entry.debuffed {
      opacity: 0.6;
      background: rgba(128, 128, 128, 0.15);
    }
    .card-mods {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .mod-tag {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .mod-tag.base {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.5);
    }
    /* Enhancement colors */
    .mod-tag.enhancement-bonus {
      background: rgba(77, 171, 247, 0.3);
      color: #4dabf7;
    }
    .mod-tag.enhancement-mult {
      background: rgba(231, 76, 60, 0.3);
      color: #e74c3c;
    }
    .mod-tag.enhancement-wild {
      background: linear-gradient(90deg, rgba(231, 76, 60, 0.3), rgba(77, 171, 247, 0.3));
      color: #fff;
    }
    .mod-tag.enhancement-glass {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .mod-tag.enhancement-steel {
      background: rgba(138, 138, 138, 0.3);
      color: #aaa;
    }
    .mod-tag.enhancement-stone {
      background: rgba(107, 91, 79, 0.4);
      color: #a99;
    }
    .mod-tag.enhancement-gold {
      background: rgba(212, 175, 55, 0.3);
      color: #d4af37;
    }
    .mod-tag.enhancement-lucky {
      background: rgba(69, 232, 69, 0.3);
      color: #45e845;
    }
    /* Edition colors */
    .mod-tag.edition-foil {
      background: linear-gradient(135deg, rgba(192, 192, 192, 0.4), rgba(255, 255, 255, 0.2));
      color: #c0c0c0;
      border: 1px solid rgba(192, 192, 192, 0.5);
    }
    .mod-tag.edition-holographic {
      background: linear-gradient(90deg,
        rgba(255, 100, 100, 0.3),
        rgba(255, 255, 100, 0.3),
        rgba(100, 255, 100, 0.3),
        rgba(100, 255, 255, 0.3),
        rgba(100, 100, 255, 0.3)
      );
      color: #fff;
    }
    .mod-tag.edition-polychrome {
      background: linear-gradient(135deg,
        rgba(255, 100, 150, 0.4),
        rgba(150, 100, 255, 0.4),
        rgba(100, 200, 255, 0.4)
      );
      color: #fff;
    }
    .mod-tag.edition-negative {
      background: rgba(0, 0, 0, 0.6);
      color: #aaa;
      border: 1px solid rgba(100, 100, 100, 0.5);
    }
    /* Seal colors */
    .mod-tag.seal-gold {
      background: rgba(212, 175, 55, 0.3);
      color: #d4af37;
    }
    .mod-tag.seal-red {
      background: rgba(231, 76, 60, 0.3);
      color: #e74c3c;
    }
    .mod-tag.seal-blue {
      background: rgba(77, 171, 247, 0.3);
      color: #4dabf7;
    }
    .mod-tag.seal-purple {
      background: rgba(155, 89, 182, 0.3);
      color: #9b59b6;
    }
    .card-state {
      display: flex;
      gap: 8px;
      font-size: 11px;
    }
    .location {
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 500;
    }
    .location.location-deck {
      color: rgba(255, 255, 255, 0.6);
    }
    .location.location-hand {
      color: #4dabf7;
      background: rgba(77, 171, 247, 0.15);
    }
    .location.location-discarded {
      color: #d4af37;
      background: rgba(212, 175, 55, 0.15);
    }
    .location.location-played {
      color: #45e845;
      background: rgba(69, 232, 69, 0.15);
    }
    .debuff-indicator,
    .facedown-indicator {
      color: rgba(200, 100, 100, 0.8);
      font-style: italic;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardDetailsPanelComponent {
  readonly cards = input.required<CardWithLocation[]>();
  readonly suit = input.required<Suit>();
  readonly rank = input.required<Rank>();

  readonly close = output<void>();

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

  getEnhancementLabel(enhancement: Enhancement): string {
    return ENHANCEMENT_LABELS[enhancement];
  }

  getEnhancementTooltip(enhancement: Enhancement): string {
    return ENHANCEMENT_TOOLTIPS[enhancement];
  }

  getEditionLabel(edition: Edition): string {
    return EDITION_LABELS[edition];
  }

  getEditionTooltip(edition: Edition): string {
    return EDITION_TOOLTIPS[edition];
  }

  getSealLabel(seal: Seal): string {
    return SEAL_LABELS[seal];
  }

  getSealTooltip(seal: Seal): string {
    return SEAL_TOOLTIPS[seal];
  }

  getLocationLabel(location: string): string {
    return LOCATION_LABELS[location] ?? location;
  }
}
