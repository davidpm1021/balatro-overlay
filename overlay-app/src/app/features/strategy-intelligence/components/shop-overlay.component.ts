/**
 * Shop Overlay Component
 *
 * Displays shop item recommendations with scores, badges, and reasoning.
 * Shows during the shop phase to help players make informed decisions.
 */

import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../core/services/game-state.service';
import { ShopAdvisorService, ScoredShopItem } from '../services/shop-advisor.service';
import { BuildDetectorService } from '../services/build-detector.service';

@Component({
  selector: 'app-shop-overlay',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isInShop()) {
      <div class="shop-overlay">
        <div class="header">
          <h3 class="title">Shop Advisor</h3>
          @if (detectedStrategy()) {
            <span class="strategy-badge">
              {{ detectedStrategy() }}
            </span>
          }
        </div>

        @if (scoredItems().length === 0) {
          <div class="empty-state">
            <p>No jokers in shop</p>
          </div>
        } @else {
          <div class="items-list">
            @for (item of scoredItems(); track item.itemId) {
              <div
                class="shop-item"
                [class.priority]="item.isPriority"
                [class.expanded]="expandedItemId() === item.itemId"
                (click)="toggleExpanded(item.itemId)"
              >
                <!-- Main row -->
                <div class="item-main">
                  <div class="item-info">
                    <span class="item-name">{{ item.itemName }}</span>
                    <span class="item-cost">\${{ item.item.cost }}</span>
                  </div>

                  <div class="item-score-area">
                    @if (item.isPriority) {
                      <span class="buy-badge">BUY!</span>
                    }
                    <div class="score-circle" [class]="getScoreClass(item.score)">
                      {{ item.score }}
                    </div>
                  </div>
                </div>

                <!-- Summary reason -->
                <div class="item-reason">
                  {{ item.reason }}
                </div>

                <!-- Synergies preview -->
                @if (item.synergyWith && item.synergyWith.length > 0) {
                  <div class="synergy-preview">
                    <span class="synergy-icon">+</span>
                    {{ item.synergyWith.slice(0, 2).join(', ') }}
                    @if (item.synergyWith.length > 2) {
                      <span class="more">+{{ item.synergyWith.length - 2 }} more</span>
                    }
                  </div>
                }

                <!-- Expanded details -->
                @if (expandedItemId() === item.itemId) {
                  <div class="item-details">
                    <div class="breakdown">
                      <div class="breakdown-row">
                        <span class="breakdown-label">Base value</span>
                        <span class="breakdown-value positive">+{{ item.breakdown.baseScore }}</span>
                      </div>
                      @if (item.breakdown.synergyScore > 0) {
                        <div class="breakdown-row">
                          <span class="breakdown-label">Synergy</span>
                          <span class="breakdown-value positive">+{{ item.breakdown.synergyScore }}</span>
                        </div>
                      }
                      @if (item.breakdown.strategyScore > 0) {
                        <div class="breakdown-row">
                          <span class="breakdown-label">Strategy fit</span>
                          <span class="breakdown-value positive">+{{ item.breakdown.strategyScore }}</span>
                        </div>
                      }
                      @if (item.breakdown.utilityScore > 0) {
                        <div class="breakdown-row">
                          <span class="breakdown-label">Utility</span>
                          <span class="breakdown-value positive">+{{ item.breakdown.utilityScore }}</span>
                        </div>
                      }
                      @if (item.breakdown.economyPenalty > 0) {
                        <div class="breakdown-row">
                          <span class="breakdown-label">Penalties</span>
                          <span class="breakdown-value negative">-{{ item.breakdown.economyPenalty }}</span>
                        </div>
                      }
                    </div>

                    @if (item.breakdown.reasons.length > 1) {
                      <div class="reasons-list">
                        @for (reason of item.breakdown.reasons.slice(1); track reason) {
                          <div class="reason-item">{{ reason }}</div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Quick summary -->
        @if (bestItem()) {
          <div class="quick-summary">
            <span class="summary-label">Best pick:</span>
            <span class="summary-value">{{ bestItem()!.itemName }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .shop-overlay {
      background: rgba(20, 20, 35, 0.95);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.9);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .strategy-badge {
      font-size: 10px;
      padding: 2px 8px;
      background: rgba(139, 92, 246, 0.3);
      border: 1px solid rgba(139, 92, 246, 0.5);
      border-radius: 12px;
      color: #a78bfa;
    }

    .empty-state {
      text-align: center;
      padding: 20px;
      color: rgba(255, 255, 255, 0.5);
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .shop-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 10px;
      cursor: pointer;
      transition: all 150ms ease-out;
    }

    .shop-item:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .shop-item.priority {
      background: rgba(34, 197, 94, 0.08);
      border-color: rgba(34, 197, 94, 0.3);
    }

    .shop-item.priority:hover {
      background: rgba(34, 197, 94, 0.12);
    }

    .shop-item.expanded {
      background: rgba(255, 255, 255, 0.06);
    }

    .item-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .item-name {
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-cost {
      font-size: 11px;
      color: #d4af37;
    }

    .item-score-area {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .buy-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #fff;
      border-radius: 4px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .score-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      border: 2px solid;
    }

    .score-circle.score-high {
      background: rgba(34, 197, 94, 0.2);
      border-color: #22c55e;
      color: #4ade80;
    }

    .score-circle.score-medium {
      background: rgba(234, 179, 8, 0.2);
      border-color: #eab308;
      color: #facc15;
    }

    .score-circle.score-low {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #f87171;
    }

    .item-reason {
      margin-top: 6px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      line-height: 1.3;
    }

    .synergy-preview {
      margin-top: 4px;
      font-size: 10px;
      color: #4ade80;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .synergy-icon {
      font-weight: 700;
    }

    .more {
      color: rgba(255, 255, 255, 0.4);
    }

    .item-details {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .breakdown {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .breakdown-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }

    .breakdown-label {
      color: rgba(255, 255, 255, 0.5);
    }

    .breakdown-value {
      font-weight: 600;
    }

    .breakdown-value.positive {
      color: #4ade80;
    }

    .breakdown-value.negative {
      color: #f87171;
    }

    .reasons-list {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .reason-item {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      padding-left: 8px;
      border-left: 2px solid rgba(255, 255, 255, 0.1);
    }

    .quick-summary {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }

    .summary-label {
      color: rgba(255, 255, 255, 0.5);
    }

    .summary-value {
      color: #4ade80;
      font-weight: 600;
    }
  `]
})
export class ShopOverlayComponent {
  private readonly gameState = inject(GameStateService);
  private readonly shopAdvisor = inject(ShopAdvisorService);
  private readonly buildDetector = inject(BuildDetectorService);

  readonly expandedItemId = signal<string | null>(null);

  readonly isInShop = this.gameState.isInShop;

  readonly scoredItems = this.shopAdvisor.scoredItems;

  readonly bestItem = this.shopAdvisor.bestItem;

  readonly detectedStrategy = computed(() => {
    const primary = this.buildDetector.primaryStrategy();
    if (!primary || primary.confidence < 30) return null;
    return this.formatStrategyName(primary.type);
  });

  toggleExpanded(itemId: string): void {
    this.expandedItemId.update(current =>
      current === itemId ? null : itemId
    );
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
  }

  private formatStrategyName(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
