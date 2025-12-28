import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { JokerState } from '../../../../../shared/models/joker.model';

@Component({
  selector: 'app-synergy-joker-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="synergy-joker-card" [class]="cardClasses()">
      <div class="joker-name" [title]="joker().name">{{ joker().name }}</div>

      @if (joker().isScaling && joker().scalingValue !== undefined) {
        <div class="scaling-value" [class]="scalingClass()">
          {{ scalingPrefix() }}{{ formatScalingValue() }}
        </div>
      }

      @if (isOrphan()) {
        <div class="orphan-hint">{{ orphanGuidance() }}</div>
      }
    </div>
  `,
  styles: [`
    .synergy-joker-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 12px;
      border-radius: 6px;
      background: rgba(30, 30, 50, 0.95);
      border: 2px solid;
      min-width: 80px;
      max-width: 100px;
      gap: 4px;
      transition: all 200ms ease-out;
    }

    .synergy-joker-card:hover {
      background: rgba(40, 40, 60, 0.95);
      transform: translateY(-2px);
    }

    /* Rarity border colors */
    .synergy-joker-card.rarity-common { border-color: #6b7280; }
    .synergy-joker-card.rarity-uncommon { border-color: #22c55e; }
    .synergy-joker-card.rarity-rare { border-color: #3b82f6; }
    .synergy-joker-card.rarity-legendary {
      border-color: #ffd700;
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
    }

    /* Orphan styling */
    .synergy-joker-card.orphan {
      opacity: 0.7;
      border-style: dashed;
    }

    .joker-name {
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .scaling-value {
      font-size: 12px;
      font-weight: 700;
      text-shadow: 0 0 6px currentColor;
    }

    .scaling-value.type-additive { color: #4dabf7; }
    .scaling-value.type-multiplicative { color: #e74c3c; }
    .scaling-value.type-exponential { color: #ffd700; }

    .orphan-hint {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.5);
      text-align: center;
      line-height: 1.2;
      margin-top: 2px;
    }
  `]
})
export class SynergyJokerCardComponent {
  readonly joker = input.required<JokerState>();
  readonly isOrphan = input<boolean>(false);
  readonly guidance = input<string>('');

  readonly cardClasses = computed(() => {
    const classes = [`rarity-${this.joker().rarity}`];
    if (this.isOrphan()) {
      classes.push('orphan');
    }
    return classes.join(' ');
  });

  readonly scalingClass = computed(() => {
    const type = this.joker().scalingType ?? 'additive';
    return `type-${type}`;
  });

  readonly scalingPrefix = computed(() => {
    const type = this.joker().scalingType;
    if (type === 'multiplicative') return 'x';
    if (type === 'exponential') return '^';
    return '+';
  });

  formatScalingValue(): string {
    const value = this.joker().scalingValue;
    if (value === undefined) return '0';
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(2);
  }

  readonly orphanGuidance = computed(() => {
    if (this.guidance()) return this.guidance();

    const j = this.joker();
    if (j.sellValue >= 5) return 'High sell value';
    return 'Looking for partner';
  });
}
