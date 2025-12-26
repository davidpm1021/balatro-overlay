import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { JokerState } from '../../../../../shared/models';
import { Edition } from '../../../../../shared/models/card.model';
import { getJokerDescription, JokerDescription } from './joker-descriptions';

interface EditionBonus {
  label: string;
  description: string;
  cssClass: string;
}

const EDITION_INFO: Record<Edition, EditionBonus> = {
  'none': { label: '', description: '', cssClass: '' },
  'foil': { label: 'Foil', description: '+50 chips', cssClass: 'edition-foil' },
  'holographic': { label: 'Holo', description: '+10 mult', cssClass: 'edition-holo' },
  'polychrome': { label: 'Poly', description: 'x1.5 mult', cssClass: 'edition-poly' },
  'negative': { label: 'Neg', description: '+1 joker slot', cssClass: 'edition-neg' }
};

@Component({
  selector: 'app-joker-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="joker-card" [class]="cardClasses()">
      <!-- Header: Name + Rarity indicator -->
      <div class="card-header">
        <span class="joker-name" [title]="joker().name">{{ joker().name }}</span>
        <span class="rarity-dot" [class]="'rarity-' + joker().rarity"></span>
      </div>

      <!-- Main effect description -->
      <div class="description" [title]="fullDescription()">
        {{ effectDescription() }}
      </div>

      <!-- Condition (if any) -->
      @if (conditionText()) {
        <div class="condition">
          {{ conditionText() }}
        </div>
      }

      <!-- Scaling value for scaling jokers -->
      @if (showScalingValue()) {
        <div class="scaling-row">
          <span class="scaling-label">{{ scalingLabel() }}</span>
          <span class="scaling-value" [class]="scalingValueClass()">
            {{ scalingPrefix() }}{{ formatScalingValue() }}
          </span>
        </div>
      }

      <!-- Edition bonus (if any) -->
      @if (joker().edition !== 'none') {
        <div class="edition-row" [class]="editionInfo().cssClass">
          <span class="edition-label">{{ editionInfo().label }}</span>
          <span class="edition-bonus">{{ editionInfo().description }}</span>
        </div>
      }

      <!-- Sell value -->
      <div class="sell-row">
        <span class="sell-label">Sell:</span>
        <span class="sell-value">{{ '$' + joker().sellValue }}</span>
      </div>
    </div>
  `,
  styles: [`
    .joker-card {
      width: 100%;
      padding: 8px;
      border-radius: 6px;
      background: rgba(30, 30, 50, 0.95);
      border: 2px solid;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      transition: all 200ms ease-out;
      box-sizing: border-box;
    }
    .joker-card:hover {
      background: rgba(40, 40, 60, 0.95);
    }

    /* Rarity border colors */
    .joker-card.rarity-common { border-color: #6b7280; }
    .joker-card.rarity-uncommon { border-color: #22c55e; }
    .joker-card.rarity-rare { border-color: #3b82f6; }
    .joker-card.rarity-legendary {
      border-color: #ffd700;
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
    .joker-name {
      font-weight: 700;
      font-size: 12px;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .rarity-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .rarity-dot.rarity-common { background: #6b7280; }
    .rarity-dot.rarity-uncommon { background: #22c55e; }
    .rarity-dot.rarity-rare { background: #3b82f6; }
    .rarity-dot.rarity-legendary { background: #ffd700; }

    .description {
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.3;
      font-weight: 500;
    }

    .condition {
      color: rgba(255, 200, 100, 0.9);
      font-size: 10px;
      font-style: italic;
    }

    .scaling-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 3px 6px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    .scaling-label {
      color: rgba(255, 255, 255, 0.5);
      font-size: 10px;
    }
    .scaling-value {
      font-weight: 700;
      font-size: 13px;
      text-shadow: 0 0 6px currentColor;
    }
    .scaling-value.type-additive { color: #4dabf7; }
    .scaling-value.type-multiplicative { color: #e74c3c; }
    .scaling-value.type-exponential { color: #ffd700; }

    .edition-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 10px;
    }
    .edition-label {
      font-weight: 600;
    }
    .edition-bonus {
      font-weight: 500;
    }

    /* Edition styles */
    .edition-foil {
      background: linear-gradient(135deg, rgba(192, 192, 192, 0.3), rgba(232, 232, 232, 0.3));
      color: #e8e8e8;
    }
    .edition-holo {
      background: linear-gradient(135deg, rgba(255, 107, 107, 0.3), rgba(78, 205, 196, 0.3));
      color: #4ecdc4;
    }
    .edition-poly {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(240, 147, 251, 0.3));
      color: #f093fb;
    }
    .edition-neg {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .sell-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 10px;
    }
    .sell-label {
      color: rgba(255, 255, 255, 0.4);
    }
    .sell-value {
      color: #d4af37;
      font-weight: 600;
    }
  `]
})
export class JokerCardComponent {
  readonly joker = input.required<JokerState>();

  /**
   * Look up joker description from database.
   */
  readonly jokerData = computed((): JokerDescription | null => {
    return getJokerDescription(this.joker().id);
  });

  readonly cardClasses = computed(() => {
    return `rarity-${this.joker().rarity}`;
  });

  readonly editionInfo = computed(() => {
    return EDITION_INFO[this.joker().edition];
  });

  /**
   * The main effect description - prioritize database, then bridge mod, then fallback.
   */
  readonly effectDescription = computed(() => {
    const data = this.jokerData();
    if (data?.description) {
      return data.description;
    }

    // Fall back to bridge mod description
    const bridgeDesc = this.joker().description;
    if (bridgeDesc && bridgeDesc.length > 0) {
      return bridgeDesc;
    }

    // Final fallback: build from effectValues
    return this.fallbackDescription();
  });

  /**
   * Condition text (when/if triggers).
   */
  readonly conditionText = computed(() => {
    const data = this.jokerData();
    return data?.condition ?? null;
  });

  /**
   * Full description for tooltip.
   */
  readonly fullDescription = computed(() => {
    const effect = this.effectDescription();
    const condition = this.conditionText();
    const scaling = this.jokerData()?.scaling;

    let full = effect;
    if (condition) full += ` (${condition})`;
    if (scaling) full += ` [${scaling}]`;
    return full;
  });

  /**
   * Whether to show the scaling value row.
   */
  readonly showScalingValue = computed(() => {
    const j = this.joker();
    return j.isScaling && j.scalingValue !== undefined;
  });

  /**
   * Label for scaling value (based on what triggers it).
   */
  readonly scalingLabel = computed(() => {
    const data = this.jokerData();
    if (data?.scaling) {
      return data.scaling + ':';
    }
    return 'Current:';
  });

  readonly scalingPrefix = computed(() => {
    const type = this.joker().scalingType;
    if (type === 'multiplicative') return 'x';
    if (type === 'exponential') return '^';
    return '+';
  });

  readonly scalingValueClass = computed(() => {
    const type = this.joker().scalingType ?? 'additive';
    return `type-${type}`;
  });

  /**
   * Fallback description based on effectValues if nothing else available.
   */
  fallbackDescription(): string {
    const effects = this.joker().effectValues;
    if (!effects) return this.joker().name;

    const parts: string[] = [];
    if (effects['chips']) parts.push(`+${effects['chips']} chips`);
    if (effects['mult']) parts.push(`+${effects['mult']} mult`);
    if (effects['xmult']) parts.push(`x${effects['xmult']} mult`);

    return parts.length > 0 ? parts.join(', ') : this.joker().name;
  }

  formatScalingValue(): string {
    const value = this.joker().scalingValue;
    if (value === undefined) return '0';
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(2);
  }
}
