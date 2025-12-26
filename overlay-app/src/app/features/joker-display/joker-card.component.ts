import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JokerState, JokerRarity } from '../../../../../shared/models';
import { Edition } from '../../../../../shared/models/card.model';

@Component({
  selector: 'app-joker-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="joker-card relative flex flex-col items-center p-2 rounded-lg cursor-default transition-transform hover:scale-105"
      [class]="rarityClasses()"
      [title]="joker().description">

      <!-- Edition badge -->
      @if (joker().edition !== 'none') {
        <span class="edition-badge absolute -top-1 -right-1 text-[10px] px-1 rounded" [class]="editionClasses()">
          {{ editionLabel() }}
        </span>
      }

      <!-- Joker name -->
      <span class="joker-name text-xs font-medium text-white text-center leading-tight max-w-[80px] truncate" [title]="joker().name">
        {{ joker().name }}
      </span>

      <!-- Scaling value (if applicable) -->
      @if (joker().isScaling && joker().scalingValue !== undefined) {
        <div class="scaling-value mt-1 flex items-center gap-0.5">
          <span class="text-[10px] text-white/60">{{ scalingPrefix() }}</span>
          <span class="text-sm font-bold" [class]="scalingValueClasses()">
            {{ formatScalingValue() }}
          </span>
        </div>
      }

      <!-- Effect values summary -->
      @if (hasEffectValues()) {
        <div class="effect-values mt-1 text-[10px] text-white/70">
          {{ effectSummary() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .joker-card {
      min-width: 70px;
      background: rgba(40, 40, 55, 0.9);
      border: 2px solid;
    }

    .edition-badge {
      font-weight: 600;
    }

    .scaling-value {
      text-shadow: 0 0 8px currentColor;
    }

    /* Rarity border colors */
    .rarity-common { border-color: #6b7280; }
    .rarity-uncommon { border-color: #22c55e; }
    .rarity-rare { border-color: #3b82f6; }
    .rarity-legendary { border-color: #ffd700; box-shadow: 0 0 8px rgba(255, 215, 0, 0.4); }

    /* Edition styles */
    .edition-foil { background: linear-gradient(135deg, #c0c0c0, #e8e8e8); color: #333; }
    .edition-holographic { background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4); color: #fff; }
    .edition-polychrome { background: linear-gradient(135deg, #667eea, #764ba2, #f093fb); color: #fff; }
    .edition-negative { background: #1a1a2e; color: #fff; border: 1px solid #fff; }
  `]
})
export class JokerCardComponent {
  readonly joker = input.required<JokerState>();

  readonly rarityClasses = computed(() => {
    const rarity = this.joker().rarity;
    return `rarity-${rarity}`;
  });

  readonly editionClasses = computed(() => {
    const edition = this.joker().edition;
    return `edition-${edition}`;
  });

  readonly editionLabel = computed(() => {
    const labels: Record<Edition, string> = {
      'none': '',
      'foil': 'F',
      'holographic': 'H',
      'polychrome': 'P',
      'negative': 'N'
    };
    return labels[this.joker().edition];
  });

  readonly scalingPrefix = computed(() => {
    const type = this.joker().scalingType;
    if (type === 'multiplicative') return 'x';
    if (type === 'exponential') return '^';
    return '+';
  });

  readonly scalingValueClasses = computed(() => {
    const type = this.joker().scalingType;
    if (type === 'multiplicative') return 'text-balatro-red';
    if (type === 'exponential') return 'text-balatro-gold';
    return 'text-balatro-accent';
  });

  formatScalingValue(): string {
    const value = this.joker().scalingValue;
    if (value === undefined) return '';
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(1);
  }

  hasEffectValues(): boolean {
    const effects = this.joker().effectValues;
    return effects && Object.keys(effects).length > 0;
  }

  effectSummary(): string {
    const effects = this.joker().effectValues;
    if (!effects) return '';

    const parts: string[] = [];
    if (effects['chips']) parts.push(`+${effects['chips']} chips`);
    if (effects['mult']) parts.push(`+${effects['mult']} mult`);
    if (effects['xmult']) parts.push(`x${effects['xmult']}`);

    return parts.slice(0, 2).join(', ');
  }
}
