import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../core/services/game-state.service';
import { ShopAdvisorService, ScoredBoosterJoker } from '../services';

@Component({
  selector: 'app-booster-overlay',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isInBooster() && scoredJokers().length > 0) {
      <div class="booster-overlay">
        <div class="header">
          <span class="pack-icon">🃏</span>
          <span class="title">{{ packTitle() }}</span>
        </div>

        <div class="joker-scores">
          @for (joker of scoredJokers(); track joker.itemId) {
            <div class="joker-score" [class.priority]="joker.isPriority" [class.best]="joker === bestJoker()">
              <div class="joker-header">
                <span class="joker-name">{{ joker.itemName }}</span>
                <span class="score" [class.high]="joker.score >= 70" [class.mid]="joker.score >= 40 && joker.score < 70" [class.low]="joker.score < 40">
                  {{ joker.score }}
                </span>
              </div>
              <div class="joker-reason">{{ joker.reason }}</div>
              @if (joker.synergyWith && joker.synergyWith.length > 0) {
                <div class="synergies">
                  <span class="synergy-label">Synergy:</span>
                  {{ joker.synergyWith.join(', ') }}
                </div>
              }
              @if (joker.isPriority) {
                <div class="priority-badge">★ PICK THIS</div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .booster-overlay {
      background: rgba(20, 20, 30, 0.95);
      border: 1px solid rgba(147, 51, 234, 0.5);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .pack-icon {
      font-size: 1.2rem;
    }

    .title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #c084fc;
    }

    .joker-scores {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .joker-score {
      background: rgba(40, 40, 50, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 10px;
      transition: border-color 0.2s;
    }

    .joker-score.best {
      border-color: rgba(34, 197, 94, 0.6);
      background: rgba(34, 197, 94, 0.1);
    }

    .joker-score.priority {
      border-color: rgba(250, 204, 21, 0.6);
    }

    .joker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .joker-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #f0f0f0;
    }

    .score {
      font-size: 0.9rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .score.high {
      background: rgba(34, 197, 94, 0.3);
      color: #4ade80;
    }

    .score.mid {
      background: rgba(250, 204, 21, 0.3);
      color: #fde047;
    }

    .score.low {
      background: rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .joker-reason {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-bottom: 4px;
    }

    .synergies {
      font-size: 0.7rem;
      color: #a78bfa;
    }

    .synergy-label {
      color: #6b7280;
    }

    .priority-badge {
      margin-top: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.15);
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
    }
  `]
})
export class BoosterOverlayComponent {
  private readonly gameState = inject(GameStateService);
  private readonly shopAdvisor = inject(ShopAdvisorService);

  readonly isInBooster = this.gameState.isInBooster;
  readonly packType = this.gameState.boosterPackType;
  readonly scoredJokers = this.shopAdvisor.scoredBoosterJokers;
  readonly bestJoker = this.shopAdvisor.bestBoosterJoker;

  readonly packTitle = computed(() => {
    const type = this.packType();
    if (type === 'buffoon') return 'Buffoon Pack - Pick a Joker';
    if (type === 'arcana') return 'Arcana Pack';
    if (type === 'celestial') return 'Celestial Pack';
    if (type === 'spectral') return 'Spectral Pack';
    if (type === 'standard') return 'Standard Pack';
    return 'Booster Pack';
  });
}
