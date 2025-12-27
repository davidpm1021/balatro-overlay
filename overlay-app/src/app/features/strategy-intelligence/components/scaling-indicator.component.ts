import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { ScalingCalculatorService, BlindComparison, ScalingProjection } from '../services/scaling-calculator.service';
import { ScalingHealth, Warning } from '../../../../../../shared/models/strategy.model';

@Component({
  selector: 'app-scaling-indicator',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scaling-indicator rounded-lg p-3 bg-black/30 border border-white/10">
      <!-- Header with health badge -->
      <div class="header flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-white/70">Scaling</span>
        <div
          class="health-badge px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
          [ngClass]="healthBadgeClasses()">
          {{ scalingHealth() }}
        </div>
      </div>

      <!-- Current blind comparison -->
      @if (comparison(); as comp) {
        <div class="current-blind mb-3">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="text-white/50">Max vs Blind</span>
            <span [ngClass]="comp.canBeat ? 'text-green-400' : 'text-red-400'">
              {{ formatNumber(comp.currentMax) }} / {{ formatNumber(comp.requirement) }}
            </span>
          </div>

          <!-- Progress bar -->
          <div class="progress-container h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              class="progress h-full rounded-full transition-all duration-500"
              [ngClass]="progressBarClasses()"
              [style.width.%]="progressPercent()">
            </div>
          </div>

          <!-- Margin indicator -->
          <div class="mt-1 text-[10px] text-right">
            @if (comp.canBeat) {
              <span class="text-green-400/70">+{{ formatNumber(comp.margin) }} surplus</span>
            } @else {
              <span class="text-red-400/70">{{ formatNumber(comp.margin) }} short</span>
            }
          </div>
        </div>
      }

      <!-- Future projections mini-chart -->
      @if (projections().length > 0) {
        <div class="projections mb-3">
          <div class="text-[10px] text-white/40 mb-1">Ante Projections</div>
          <div class="flex gap-1 items-end h-6">
            @for (proj of projections(); track proj.ante) {
              <div
                class="projection-bar flex-1 rounded-t transition-all duration-300"
                [ngClass]="getProjectionBarClass(proj)"
                [style.height.%]="getProjectionBarHeight(proj)"
                [attr.title]="'Ante ' + proj.ante + ': ' + (proj.canBeat ? 'OK' : 'Risk')">
              </div>
            }
          </div>
          <div class="flex justify-between text-[8px] text-white/30 mt-0.5">
            <span>A{{ projections()[0]?.ante }}</span>
            <span>A{{ projections()[projections().length - 1]?.ante }}</span>
          </div>
        </div>
      }

      <!-- Warnings -->
      @if (warnings().length > 0) {
        <div class="warnings space-y-1.5">
          @for (warning of warnings().slice(0, 2); track warning.message) {
            <div
              class="warning rounded px-2 py-1.5 text-[10px]"
              [ngClass]="getWarningClasses(warning)">
              <div class="flex items-start gap-1.5">
                <span class="icon mt-0.5">{{ getWarningIcon(warning) }}</span>
                <div class="flex-1">
                  <div class="font-medium">{{ warning.message }}</div>
                  @if (warning.action) {
                    <div class="text-white/50 mt-0.5">{{ warning.action }}</div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- No data state -->
      @if (!comparison() && projections().length === 0) {
        <div class="text-xs text-white/40 text-center py-2">
          No game data
        </div>
      }
    </div>
  `,
  styles: [`
    .scaling-indicator {
      backdrop-filter: blur(4px);
    }

    .projection-bar {
      min-height: 4px;
    }
  `]
})
export class ScalingIndicatorComponent {
  private scalingService = inject(ScalingCalculatorService);

  readonly scalingHealth = computed(() => this.scalingService.scalingHealth());
  readonly comparison = computed(() => this.scalingService.blindComparison());
  readonly projections = computed(() => this.scalingService.scalingCurve());
  readonly warnings = computed(() => this.scalingService.scalingWarnings());

  readonly healthBadgeClasses = computed(() => {
    const health = this.scalingHealth();
    return {
      'bg-green-500/20 text-green-400 border border-green-500/30': health === 'strong',
      'bg-blue-500/20 text-blue-400 border border-blue-500/30': health === 'adequate',
      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30': health === 'weak',
      'bg-red-500/20 text-red-400 border border-red-500/30': health === 'critical',
    };
  });

  readonly progressBarClasses = computed(() => {
    const comp = this.comparison();
    if (!comp) return {};

    const percent = this.progressPercent();

    if (comp.canBeat) {
      return {
        'bg-gradient-to-r from-green-500 to-green-400': percent >= 150,
        'bg-green-500': percent >= 100 && percent < 150,
      };
    } else {
      return {
        'bg-red-500': percent < 50,
        'bg-yellow-500': percent >= 50 && percent < 100,
      };
    }
  });

  readonly progressPercent = computed(() => {
    const comp = this.comparison();
    if (!comp || comp.requirement === 0) return 0;
    return Math.min(200, (comp.currentMax / comp.requirement) * 100);
  });

  getProjectionBarClass(proj: ScalingProjection): Record<string, boolean> {
    return {
      'bg-green-500/60': proj.canBeat && proj.marginPercent >= 50,
      'bg-green-500/40': proj.canBeat && proj.marginPercent < 50,
      'bg-yellow-500/50': !proj.canBeat && proj.marginPercent > -30,
      'bg-red-500/50': !proj.canBeat && proj.marginPercent <= -30,
    };
  }

  getProjectionBarHeight(proj: ScalingProjection): number {
    // Scale based on margin percent
    // 100% margin = full height, -100% = minimum height
    const percent = Math.max(-100, Math.min(200, proj.marginPercent));
    return Math.max(15, ((percent + 100) / 300) * 100);
  }

  getWarningClasses(warning: Warning): Record<string, boolean> {
    return {
      'bg-red-500/10 border border-red-500/20 text-red-300': warning.severity === 'critical',
      'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300': warning.severity === 'caution',
      'bg-blue-500/10 border border-blue-500/20 text-blue-300': warning.severity === 'info',
    };
  }

  getWarningIcon(warning: Warning): string {
    switch (warning.severity) {
      case 'critical': return '!';
      case 'caution': return '~';
      case 'info': return 'i';
      default: return '*';
    }
  }

  formatNumber(num: number): string {
    const absNum = Math.abs(num);
    if (absNum >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (absNum >= 1_000) {
      return (num / 1_000).toFixed(1) + 'K';
    }
    return String(Math.round(num));
  }
}
