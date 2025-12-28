import { Component, ChangeDetectionStrategy, inject, computed, effect, signal } from '@angular/core';
import { NgClass, UpperCasePipe } from '@angular/common';
import { GameStateService, PhaseVisibilityService } from '../../../core/services';
import {
  ShopAdvisorService,
  EnhancedShopRecommendation,
} from '../services/shop-advisor.service';
import { ShopItemDetailComponent } from './shop-item-detail.component';

@Component({
  selector: 'app-shop-overlay',
  imports: [NgClass, UpperCasePipe, ShopItemDetailComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible() && recommendations().length > 0) {
      <div class="shop-overlay rounded-lg p-3 bg-black/30 border border-white/10 mt-2">
        <!-- Header with build detection -->
        <div class="header flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-white/70">Shop Advisor</span>
          @if (primaryBuild(); as build) {
            <div class="build-badge flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                 [ngClass]="getBuildBadgeClasses(build.confidence)">
              <span>{{ formatBuildType(build.type) }}</span>
              <span class="opacity-70">{{ build.confidence }}%</span>
            </div>
          }
        </div>

        <!-- Context info bar -->
        <div class="context-bar flex items-center gap-2 mb-2 text-[10px] text-white/50">
          <span>Ante {{ currentAnte() }}</span>
          @if (ownedJokerCount() > 0) {
            <span class="text-white/30">|</span>
            <span>{{ ownedJokerCount() }} joker(s)</span>
          }
          @if (currentBlind(); as blind) {
            @if (blind.isBoss) {
              <span class="text-white/30">|</span>
              <span class="text-yellow-400/70">{{ blind.name }}</span>
            }
          }
        </div>

        <div class="items space-y-2">
          @for (rec of recommendations(); track rec.item.id) {
            <div
              class="item rounded px-2 py-1.5 border"
              [ngClass]="getItemClasses(rec)">
              <!-- Item Header Row -->
              <div class="item-header flex items-start gap-2">
                <!-- Tier badge -->
                <div
                  class="tier-badge w-6 h-6 flex items-center justify-center rounded text-xs font-bold shrink-0"
                  [ngClass]="getTierClasses(rec.tier)">
                  {{ rec.tier }}
                </div>

                <!-- Item info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-white truncate">{{ rec.item.name }}</span>
                    <span class="text-[10px] text-yellow-400/70">\${{ rec.item.cost }}</span>
                  </div>

                  <!-- Type badge + score -->
                  <div class="flex items-center gap-1 mt-0.5">
                    <span
                      class="text-[9px] px-1 py-0.5 rounded uppercase"
                      [ngClass]="getTypeBadgeClasses(rec.item.type)">
                      {{ rec.item.type }}
                    </span>
                    <span class="text-[10px]" [ngClass]="getScoreClasses(rec.score)">
                      {{ rec.score }}/100
                    </span>
                    <!-- Recommendation badge -->
                    <span
                      class="text-[9px] px-1 py-0.5 rounded ml-1"
                      [ngClass]="getRecommendationBadgeClasses(rec.analysis.recommendation)">
                      {{ rec.analysis.recommendation | uppercase }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Synergies (shown always if present) -->
              @if (rec.synergiesWithOwned.length > 0) {
                <div class="synergies mt-1 ml-8 text-[10px] text-green-400/70">
                  + {{ rec.synergiesWithOwned.slice(0, 2).join(', ') }}
                </div>
              }

              <!-- Enhanced Detail Component -->
              <div class="detail-section ml-8">
                <app-shop-item-detail
                  [recommendation]="rec"
                  [expanded]="isItemExpanded(rec.item.id)"
                  (expandToggle)="toggleItemExpanded(rec.item.id, $event)"
                />
              </div>
            </div>
          }
        </div>

        <!-- Reroll info -->
        @if (rerollCost()) {
          <div class="reroll mt-2 pt-2 border-t border-white/10 flex justify-between text-[10px] text-white/40">
            <span>Reroll: \${{ rerollCost() }}</span>
            @if (rerollsUsed() > 0) {
              <span>{{ rerollsUsed() }} used</span>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .shop-overlay {
      backdrop-filter: blur(4px);
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .build-badge {
      backdrop-filter: blur(2px);
    }
  `]
})
export class ShopOverlayComponent {
  private gameState = inject(GameStateService);
  private shopAdvisor = inject(ShopAdvisorService);
  private visibilityService = inject(PhaseVisibilityService);

  readonly isVisible = this.visibilityService.isPanelVisible('shop-advisor');
  readonly rerollCost = computed(() => this.gameState.shop()?.rerollCost ?? 0);
  readonly rerollsUsed = computed(() => this.gameState.shop()?.rerollsUsed ?? 0);
  readonly currentAnte = computed(() => this.gameState.state()?.progress.ante ?? 1);
  readonly currentBlind = computed(() => this.gameState.state()?.blind ?? null);
  readonly ownedJokerCount = computed(() => this.gameState.jokers().length);

  // Build detection from shop advisor
  readonly primaryBuild = this.shopAdvisor.primaryBuild;

  // Track which items are expanded
  private expandedItems = signal<Set<string>>(new Set());

  readonly recommendations = computed<EnhancedShopRecommendation[]>(() => {
    return this.shopAdvisor.getEnhancedShopRecommendations();
  });

  constructor() {
    // Keep ShopAdvisorService in sync with game state
    effect(() => {
      const state = this.gameState.state();
      if (state) {
        this.shopAdvisor.updateState(state);
      }
    });
  }

  /**
   * Check if an item is expanded
   */
  isItemExpanded(itemId: string): boolean {
    return this.expandedItems().has(itemId);
  }

  /**
   * Toggle item expanded state
   */
  toggleItemExpanded(itemId: string, expanded: boolean): void {
    const current = new Set(this.expandedItems());
    if (expanded) {
      current.add(itemId);
    } else {
      current.delete(itemId);
    }
    this.expandedItems.set(current);
  }

  formatBuildType(type: string): string {
    const typeMap: Record<string, string> = {
      'flush': 'Flush',
      'pairs': 'Pairs',
      'mult_stacking': '+Mult',
      'xmult_scaling': 'xMult',
      'fibonacci': 'Fib',
      'face_cards': 'Face',
      'straight': 'Straight',
      'economy': 'Econ',
    };
    return typeMap[type] ?? type;
  }

  getBuildBadgeClasses(confidence: number): Record<string, boolean> {
    return {
      'bg-green-500/20 text-green-300 border border-green-500/30': confidence >= 70,
      'bg-blue-500/20 text-blue-300 border border-blue-500/30': confidence >= 50 && confidence < 70,
      'bg-gray-500/20 text-gray-300 border border-gray-500/30': confidence < 50,
    };
  }

  getItemClasses(rec: EnhancedShopRecommendation): Record<string, boolean> {
    return {
      'bg-yellow-500/5 border-yellow-500/30': rec.tier === 'S',
      'bg-green-500/5 border-green-500/20': rec.tier === 'A',
      'bg-blue-500/5 border-blue-500/20': rec.tier === 'B',
      'bg-white/5 border-white/10': rec.tier === 'C',
      'bg-orange-500/5 border-orange-500/20': rec.tier === 'D',
      'bg-red-500/5 border-red-500/20': rec.tier === 'F',
    };
  }

  getTierClasses(tier: string): Record<string, boolean> {
    return {
      'bg-yellow-500/30 text-yellow-200 border border-yellow-500/40': tier === 'S',
      'bg-green-500/20 text-green-300 border border-green-500/30': tier === 'A',
      'bg-blue-500/20 text-blue-300 border border-blue-500/30': tier === 'B',
      'bg-gray-500/20 text-gray-300 border border-gray-500/30': tier === 'C',
      'bg-orange-500/20 text-orange-300 border border-orange-500/30': tier === 'D',
      'bg-red-500/20 text-red-300 border border-red-500/30': tier === 'F',
    };
  }

  getTypeBadgeClasses(type: string): Record<string, boolean> {
    return {
      'bg-purple-500/20 text-purple-300': type === 'joker',
      'bg-blue-500/20 text-blue-300': type === 'planet',
      'bg-yellow-500/20 text-yellow-300': type === 'tarot',
      'bg-pink-500/20 text-pink-300': type === 'spectral',
      'bg-green-500/20 text-green-300': type === 'voucher',
      'bg-orange-500/20 text-orange-300': type === 'booster',
    };
  }

  getScoreClasses(score: number): Record<string, boolean> {
    return {
      'text-yellow-300 font-semibold': score >= 85,
      'text-green-400': score >= 70 && score < 85,
      'text-blue-400': score >= 55 && score < 70,
      'text-white/50': score >= 40 && score < 55,
      'text-orange-400': score >= 25 && score < 40,
      'text-red-400': score < 25,
    };
  }

  getRecommendationBadgeClasses(recommendation: 'buy' | 'consider' | 'skip'): Record<string, boolean> {
    return {
      'bg-green-500/30 text-green-300': recommendation === 'buy',
      'bg-yellow-500/30 text-yellow-300': recommendation === 'consider',
      'bg-red-500/30 text-red-300': recommendation === 'skip',
    };
  }
}
