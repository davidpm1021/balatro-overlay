import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameStateService } from '../../core/services';
import { HandCalculatorService } from './services/hand-calculator.service';
import { ScoreBreakdownComponent } from './components/score-breakdown.component';
import { BlindComparisonComponent } from './components/blind-comparison.component';

@Component({
  selector: 'app-score-preview',
  imports: [ScoreBreakdownComponent, BlindComparisonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score-preview bg-balatro-panel rounded-lg p-3">
      <div class="header flex items-center justify-between mb-2">
        <span class="text-xs text-white/70 font-semibold uppercase tracking-wide">
          Score Preview
        </span>
        @if (selectedCount() > 0) {
          <span class="text-xs text-balatro-accent">{{ selectedCount() }} cards</span>
        }
      </div>

      @if (selectedCount() === 0) {
        <div class="empty-state text-center py-4 text-white/40 text-sm">
          Select cards to preview score
        </div>
      } @else if (scoreBreakdown()) {
        <div class="score-content space-y-3">
          <app-score-breakdown [breakdown]="scoreBreakdown()!" />
          <app-blind-comparison [breakdown]="scoreBreakdown()!" />
        </div>
      }
    </div>
  `,
  styles: [`
    .score-preview {
      min-height: 120px;
    }
  `]
})
export class ScorePreviewComponent {
  private readonly gameState = inject(GameStateService);
  private readonly calculator = inject(HandCalculatorService);

  readonly selectedCards = this.gameState.selectedCards;
  readonly jokers = this.gameState.jokers;
  readonly handLevels = this.gameState.handLevels;
  readonly blind = this.gameState.blind;

  readonly selectedCount = computed(() => this.selectedCards().length);

  readonly scoreBreakdown = computed(() => {
    const cards = this.selectedCards();
    if (cards.length === 0) {
      return null;
    }

    return this.calculator.calculateScore(
      cards,
      this.jokers(),
      this.handLevels(),
      this.blind()
    );
  });
}
