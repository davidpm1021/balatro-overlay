import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { NgClass } from '@angular/common';
import {
  EnhancedShopRecommendation,
  ReasonBullet,
  ScoreBreakdown,
} from '../services/shop-advisor.service';

/**
 * Expandable detail view for shop items showing:
 * - WHY BUY / WHY SKIP bullets
 * - WHAT IT DOES section (joker explanation)
 * - SCORE BREAKDOWN section
 * - Build context
 */
@Component({
  selector: 'app-shop-item-detail',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shop-item-detail">
      <!-- Reason Bullets (WHY BUY / WHY SKIP / WHY CONSIDER) -->
      <div class="reasons-section mt-2">
        @if (analysis().recommendation === 'buy' && analysis().whyBuy.length > 0) {
          <div class="why-buy">
            <div class="section-label text-[10px] font-semibold text-green-400/80 mb-1">WHY BUY:</div>
            @for (bullet of analysis().whyBuy; track bullet.text) {
              <div
                class="why-buy-bullet flex items-start gap-1.5 text-[10px] text-white/70 mb-0.5"
                [ngClass]="getImportanceClasses(bullet.importance)">
                <span class="bullet-marker text-green-400">*</span>
                <span>{{ bullet.text }}</span>
              </div>
            }
          </div>
        }

        @if (analysis().recommendation === 'skip' && analysis().whySkip.length > 0) {
          <div class="why-skip">
            <div class="section-label text-[10px] font-semibold text-red-400/80 mb-1">WHY SKIP:</div>
            @for (bullet of analysis().whySkip; track bullet.text) {
              <div
                class="why-skip-bullet flex items-start gap-1.5 text-[10px] text-white/70 mb-0.5"
                [ngClass]="getImportanceClasses(bullet.importance)">
                <span class="bullet-marker text-red-400">*</span>
                <span>{{ bullet.text }}</span>
              </div>
            }
          </div>
        }

        @if (analysis().recommendation === 'consider' && analysis().whyConsider.length > 0) {
          <div class="why-consider">
            <div class="section-label text-[10px] font-semibold text-yellow-400/80 mb-1">CONSIDER:</div>
            @for (bullet of analysis().whyConsider; track bullet.text) {
              <div
                class="why-consider-bullet flex items-start gap-1.5 text-[10px] text-white/70 mb-0.5"
                [ngClass]="getImportanceClasses(bullet.importance)">
                <span class="bullet-marker text-yellow-400">*</span>
                <span>{{ bullet.text }}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Build Context Badge -->
      @if (analysis().buildContext) {
        <div class="build-context mt-2 text-[10px] px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
          <span class="text-blue-300">{{ analysis().buildContext!.fitDescription }}</span>
        </div>
      }

      <!-- Expand Button -->
      <button
        class="expand-button mt-2 text-[10px] text-white/40 hover:text-white/60 transition-colors"
        (click)="toggleExpand()">
        @if (expanded()) {
          [Collapse]
        } @else {
          [Details >]
        }
      </button>

      <!-- Expanded Section -->
      @if (expanded()) {
        <div class="expanded-content mt-3 pt-3 border-t border-white/10">
          <!-- WHAT IT DOES (Joker Explanation) -->
          @if (analysis().jokerExplanation) {
            <div class="what-it-does mb-3">
              <div class="section-label text-[10px] font-semibold text-purple-400/80 mb-1">WHAT IT DOES:</div>
              <div class="effect text-[10px] text-white/80 mb-1">
                {{ analysis().jokerExplanation!.effect }}
              </div>
              <div class="implication text-[10px] text-purple-300/80 italic mb-1">
                {{ analysis().jokerExplanation!.implication }}
              </div>
              @if (analysis().jokerExplanation!.tips.length > 0) {
                <div class="tips mt-1">
                  @for (tip of analysis().jokerExplanation!.tips.slice(0, 2); track tip) {
                    <div class="tip text-[9px] text-white/50">- {{ tip }}</div>
                  }
                </div>
              }
            </div>
          }

          <!-- SCORE BREAKDOWN -->
          <div class="score-breakdown">
            <div class="section-label text-[10px] font-semibold text-cyan-400/80 mb-1">SCORE BREAKDOWN:</div>
            <div class="breakdown-items text-[10px] font-mono">
              <div class="breakdown-row flex justify-between text-white/60">
                <span>Base ({{ getTierLabel() }}):</span>
                <span class="text-white/80">+{{ breakdown().baseTierScore }}</span>
              </div>

              @if (breakdown().synergyBonus > 0) {
                <div class="breakdown-row flex justify-between text-white/60">
                  <span>Synergy:</span>
                  <span class="text-green-400">+{{ breakdown().synergyBonus }}</span>
                </div>
              }

              @if (breakdown().antiSynergyPenalty > 0) {
                <div class="breakdown-row flex justify-between text-white/60">
                  <span>Anti-synergy:</span>
                  <span class="text-red-400">-{{ breakdown().antiSynergyPenalty }}</span>
                </div>
              }

              @if (breakdown().buildFitBonus > 0) {
                <div class="breakdown-row flex justify-between text-white/60">
                  <span>Build fit:</span>
                  <span class="text-green-400">+{{ breakdown().buildFitBonus }}</span>
                </div>
              }

              @if (breakdown().bossCounterBonus !== 0) {
                <div class="breakdown-row flex justify-between text-white/60">
                  <span>Boss {{ breakdown().bossCounterBonus > 0 ? 'counter' : 'weakness' }}:</span>
                  <span [ngClass]="breakdown().bossCounterBonus > 0 ? 'text-green-400' : 'text-red-400'">
                    {{ breakdown().bossCounterBonus > 0 ? '+' : '' }}{{ breakdown().bossCounterBonus }}
                  </span>
                </div>
              }

              @if (breakdown().economyPenalty > 0) {
                <div class="breakdown-row flex justify-between text-white/60">
                  <span>Interest penalty:</span>
                  <span class="text-red-400">-{{ breakdown().economyPenalty }}</span>
                </div>
              }

              @if (breakdown().lateGameAdjustment !== 0) {
                <div class="breakdown-row flex justify-between text-white/60">
                  <span>Late game:</span>
                  <span [ngClass]="breakdown().lateGameAdjustment > 0 ? 'text-green-400' : 'text-red-400'">
                    {{ breakdown().lateGameAdjustment > 0 ? '+' : '' }}{{ breakdown().lateGameAdjustment }}
                  </span>
                </div>
              }

              <div class="breakdown-divider border-t border-white/20 my-1"></div>

              <div class="breakdown-row flex justify-between text-white/80 font-semibold">
                <span>Total:</span>
                <span [ngClass]="getTotalScoreClasses()">
                  {{ breakdown().totalScore }}{{ breakdown().totalScore >= 100 ? ' (capped)' : '' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .shop-item-detail {
      font-size: 10px;
    }

    .bullet-marker {
      flex-shrink: 0;
      line-height: 1.4;
    }

    .section-label {
      letter-spacing: 0.05em;
    }

    .breakdown-row {
      padding: 1px 0;
    }

    .importance-high {
      color: rgba(255, 255, 255, 0.85);
    }

    .importance-medium {
      color: rgba(255, 255, 255, 0.65);
    }

    .importance-low {
      color: rgba(255, 255, 255, 0.5);
    }
  `]
})
export class ShopItemDetailComponent {
  /** The enhanced shop recommendation to display */
  recommendation = input.required<EnhancedShopRecommendation>();

  /** Whether the detail view is expanded */
  expanded = input<boolean>(false);

  /** Emits when expand/collapse is toggled */
  expandToggle = output<boolean>();

  /** Computed analysis for convenience */
  analysis = computed(() => this.recommendation().analysis);

  /** Computed score breakdown for convenience */
  breakdown = computed(() => this.recommendation().analysis.scoreBreakdown);

  /**
   * Toggle the expanded state
   */
  toggleExpand(): void {
    this.expandToggle.emit(!this.expanded());
  }

  /**
   * Get CSS classes for importance level
   */
  getImportanceClasses(importance: 'high' | 'medium' | 'low'): Record<string, boolean> {
    return {
      'importance-high': importance === 'high',
      'importance-medium': importance === 'medium',
      'importance-low': importance === 'low',
    };
  }

  /**
   * Get tier label from base score
   */
  getTierLabel(): string {
    const baseScore = this.breakdown().baseTierScore;
    if (baseScore >= 95) return 'S-Tier';
    if (baseScore >= 80) return 'A-Tier';
    if (baseScore >= 60) return 'B-Tier';
    if (baseScore >= 40) return 'C-Tier';
    if (baseScore >= 20) return 'D-Tier';
    return 'F-Tier';
  }

  /**
   * Get CSS classes for total score display
   */
  getTotalScoreClasses(): Record<string, boolean> {
    const score = this.breakdown().totalScore;
    return {
      'text-yellow-300': score >= 85,
      'text-green-400': score >= 70 && score < 85,
      'text-blue-400': score >= 55 && score < 70,
      'text-white/70': score >= 40 && score < 55,
      'text-orange-400': score >= 25 && score < 40,
      'text-red-400': score < 25,
    };
  }
}
