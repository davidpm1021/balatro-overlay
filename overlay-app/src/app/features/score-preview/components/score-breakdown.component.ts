import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { ScoreBreakdown } from '../../../../../../shared/models';

const HAND_TYPE_LABELS: Record<string, string> = {
  high_card: 'High Card',
  pair: 'Pair',
  two_pair: 'Two Pair',
  three_of_a_kind: 'Three of a Kind',
  straight: 'Straight',
  flush: 'Flush',
  full_house: 'Full House',
  four_of_a_kind: 'Four of a Kind',
  straight_flush: 'Straight Flush',
  royal_flush: 'Royal Flush',
  five_of_a_kind: 'Five of a Kind',
  flush_house: 'Flush House',
  flush_five: 'Flush Five',
};

@Component({
  selector: 'app-score-breakdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="breakdown">
      <!-- Hand Type Header -->
      <div class="hand-type flex items-center justify-between mb-2">
        <span class="hand-name text-sm font-bold text-white">
          {{ handTypeLabel() }}
        </span>
        @if (breakdown().handLevel > 1) {
          <span class="level text-xs text-balatro-gold">
            Lvl {{ breakdown().handLevel }}
          </span>
        }
      </div>

      <!-- Base Calculation -->
      <div class="base-calc text-xs text-white/70 space-y-1">
        <div class="flex justify-between">
          <span>Base</span>
          <span>
            <span class="text-chips">{{ breakdown().baseChips }}</span>
            <span class="text-white/40"> x </span>
            <span class="text-mult">{{ breakdown().baseMult }}</span>
          </span>
        </div>

        @if (breakdown().cardChips > 0) {
          <div class="flex justify-between">
            <span>Cards</span>
            <span class="text-chips">+{{ breakdown().cardChips }}</span>
          </div>
        }
      </div>

      <!-- Joker Effects -->
      @if (breakdown().jokerEffects.length > 0) {
        <div class="joker-effects mt-2 pt-2 border-t border-white/10 text-xs space-y-1">
          @for (effect of breakdown().jokerEffects; track effect.jokerId) {
            <div class="flex justify-between text-white/70">
              <span class="truncate max-w-[120px]" [title]="effect.jokerName">
                {{ effect.jokerName }}
              </span>
              <span [class]="getEffectClass(effect.effectType)">
                {{ formatEffect(effect) }}
              </span>
            </div>
          }
        </div>
      }

      <!-- Final Score -->
      <div class="final-score mt-3 pt-2 border-t border-white/20">
        <div class="flex items-center justify-between">
          <span class="text-xs text-white/50">=</span>
          <div class="score-calc text-sm">
            <span class="text-chips font-medium">{{ breakdown().totalChips }}</span>
            <span class="text-white/40"> x </span>
            <span class="text-mult font-medium">{{ formatMult(breakdown().totalMult) }}</span>
            <span class="text-white/40"> = </span>
            <span class="text-balatro-gold font-bold text-base">
              {{ formatScore(breakdown().finalScore) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hand-name {
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }
  `]
})
export class ScoreBreakdownComponent {
  breakdown = input.required<ScoreBreakdown>();

  readonly handTypeLabel = computed(() =>
    HAND_TYPE_LABELS[this.breakdown().handType] ?? this.breakdown().handType
  );

  getEffectClass(effectType: string): string {
    switch (effectType) {
      case 'chips': return 'text-chips';
      case 'mult': return 'text-mult';
      case 'xmult': return 'text-xmult';
      default: return 'text-white/70';
    }
  }

  formatEffect(effect: { effectType: string; value: number }): string {
    switch (effect.effectType) {
      case 'chips': return `+${effect.value}`;
      case 'mult': return `+${effect.value}`;
      case 'xmult': return `x${effect.value}`;
      default: return String(effect.value);
    }
  }

  formatMult(mult: number): string {
    return mult % 1 === 0 ? String(mult) : mult.toFixed(1);
  }

  formatScore(score: number): string {
    if (score >= 1_000_000) {
      return (score / 1_000_000).toFixed(1) + 'M';
    }
    if (score >= 1_000) {
      return (score / 1_000).toFixed(1) + 'K';
    }
    return String(score);
  }
}
