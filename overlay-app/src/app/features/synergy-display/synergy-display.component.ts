import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { GameStateService, PhaseVisibilityService } from '../../core/services';
import { SynergyDisplayService } from './synergy-display.service';
import { SynergyGroupComponent } from './synergy-group.component';
import { SynergyGroup } from '../../../../../shared/models/synergy-group.model';
import { JokerState } from '../../../../../shared/models/joker.model';

@Component({
  selector: 'app-synergy-display',
  imports: [SynergyGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible()) {
    <section class="synergy-display balatro-panel">
      <!-- Header -->
      <header class="header">
        <span class="section-header">Your Synergies</span>
        <span class="count">{{ jokerCount() }}<span class="count-total">/{{ maxJokers }}</span></span>
      </header>

      @if (groups().length === 0) {
        <div class="empty-state">
          <p class="empty-title">No jokers yet</p>
          <p class="empty-hint">
            Jokers you acquire will appear here, grouped by how they work together.
          </p>
        </div>
      } @else {
        <div class="groups-container">
          @for (group of groups(); track group.id) {
            <app-synergy-group
              [group]="group"
              [jokers]="getJokersForGroup(group)"
            />
          }
        </div>

        <!-- Synergy score summary -->
        @if (totalScore() > 0) {
          <div class="synergy-score">
            <span class="score-label">Synergy Score:</span>
            <span class="score-value" [class]="scoreClass()">{{ totalScore() }}</span>
          </div>
        }
      }
    </section>
    }
  `,
  styles: [`
    .synergy-display {
      padding: 8px;
      width: 100%;
      box-sizing: border-box;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .section-header {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }

    .count {
      font-size: 14px;
      font-weight: 600;
      color: #d4af37;
    }

    .count-total {
      color: rgba(255, 255, 255, 0.4);
      font-weight: 400;
    }

    .groups-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 450px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }

    .groups-container::-webkit-scrollbar {
      width: 4px;
    }

    .groups-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .groups-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
    }

    .empty-title {
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      margin: 0 0 8px 0;
    }

    .empty-hint {
      color: rgba(255, 255, 255, 0.4);
      font-size: 11px;
      line-height: 1.4;
      margin: 0;
    }

    .synergy-score {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
    }

    .score-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }

    .score-value {
      font-size: 14px;
      font-weight: 700;
    }

    .score-value.score-low {
      color: #94a3b8;
    }

    .score-value.score-medium {
      color: #38bdf8;
    }

    .score-value.score-high {
      color: #22c55e;
    }

    .score-value.score-excellent {
      color: #ffd700;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
    }
  `]
})
export class SynergyDisplayComponent {
  private gameStateService = inject(GameStateService);
  private synergyDisplayService = inject(SynergyDisplayService);
  private visibilityService = inject(PhaseVisibilityService);

  readonly isVisible = this.visibilityService.isPanelVisible('synergy-display');
  readonly maxJokers = 5;

  readonly groups = this.synergyDisplayService.groups;
  readonly totalScore = this.synergyDisplayService.totalSynergyScore;

  readonly jokerCount = computed(() => this.gameStateService.jokers().length);

  private readonly jokerMap = computed(() => {
    const map = new Map<string, JokerState>();
    for (const joker of this.gameStateService.jokers()) {
      map.set(joker.id, joker);
    }
    return map;
  });

  getJokersForGroup(group: SynergyGroup): JokerState[] {
    const map = this.jokerMap();
    return group.jokerIds
      .map(id => map.get(id))
      .filter((j): j is JokerState => j !== undefined)
      .sort((a, b) => a.slotIndex - b.slotIndex);
  }

  readonly scoreClass = computed(() => {
    const score = this.totalScore();
    if (score >= 30) return 'score-excellent';
    if (score >= 20) return 'score-high';
    if (score >= 10) return 'score-medium';
    return 'score-low';
  });
}
