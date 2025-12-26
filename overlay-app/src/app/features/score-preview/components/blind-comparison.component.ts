import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { ScoreBreakdown } from '../../../../../../shared/models';

@Component({
  selector: 'app-blind-comparison',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="blind-comparison rounded px-2 py-1.5"
      [ngClass]="containerClasses()">
      <div class="flex items-center justify-between">
        <div class="status flex items-center gap-1.5">
          <span class="icon text-sm">{{ statusIcon() }}</span>
          <span class="text-xs font-medium">{{ statusText() }}</span>
        </div>
        <div class="margin text-xs">
          @if (breakdown().willBeat) {
            <span class="text-green-400">+{{ formatNumber(breakdown().margin) }}</span>
          } @else {
            <span class="text-red-400">{{ formatNumber(breakdown().margin) }}</span>
          }
        </div>
      </div>

      @if (breakdown().blindGoal > 0) {
        <div class="progress-bar mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            class="progress h-full rounded-full transition-all duration-300"
            [ngClass]="progressClasses()"
            [style.width.%]="progressPercent()">
          </div>
        </div>
        <div class="goal-text mt-1 text-[10px] text-white/40 text-right">
          {{ formatNumber(breakdown().finalScore) }} / {{ formatNumber(breakdown().blindGoal) }}
        </div>
      }
    </div>
  `,
  styles: [`
    .blind-comparison {
      background: rgba(0, 0, 0, 0.2);
    }
  `]
})
export class BlindComparisonComponent {
  breakdown = input.required<ScoreBreakdown>();

  readonly containerClasses = computed(() => ({
    'border': true,
    'border-green-500/30': this.breakdown().willBeat,
    'border-red-500/30': !this.breakdown().willBeat,
  }));

  readonly progressClasses = computed(() => ({
    'bg-green-500': this.breakdown().willBeat,
    'bg-red-500': !this.breakdown().willBeat,
  }));

  readonly statusIcon = computed(() =>
    this.breakdown().willBeat ? '>' : '!'
  );

  readonly statusText = computed(() => {
    if (this.breakdown().blindGoal === 0) {
      return 'No blind';
    }
    return this.breakdown().willBeat ? 'Beats blind' : 'Need more';
  });

  readonly progressPercent = computed(() => {
    const { finalScore, blindGoal } = this.breakdown();
    if (blindGoal === 0) return 100;
    return Math.min(100, (finalScore / blindGoal) * 100);
  });

  formatNumber(num: number): string {
    const absNum = Math.abs(num);
    if (absNum >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (absNum >= 1_000) {
      return (num / 1_000).toFixed(1) + 'K';
    }
    return String(num);
  }
}
