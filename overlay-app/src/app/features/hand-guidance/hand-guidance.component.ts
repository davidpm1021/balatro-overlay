import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HandAnalyzerService, HandAnalysis, AnalyzedCard } from './services/hand-analyzer.service';
import { GameStateService } from '../../core/services/game-state.service';
import { PhaseVisibilityService } from '../../core/services/phase-visibility.service';
import { Card, Suit, Rank } from '../../../../../shared/models';

/**
 * Suit symbol mapping for display
 */
const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

/**
 * Suit color classes
 */
const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'suit-red',
  diamonds: 'suit-red',
  clubs: 'suit-black',
  spades: 'suit-black',
};

@Component({
  selector: 'app-hand-guidance',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible()) {
    <section class="hand-guidance balatro-panel">
      <header class="header">
        <span class="section-header">Hand Guidance</span>
      </header>

      @if (!analysis()) {
        <div class="empty-state">
          <p class="empty-title">No cards in hand</p>
          <p class="empty-hint">
            Draw cards to see hand analysis and recommendations.
          </p>
        </div>
      } @else {
        <!-- Best Play Section -->
        <div class="best-play-section">
          <div class="best-play-header">
            <span class="best-play-label">BEST PLAY:</span>
            <span class="hand-type">{{ analysis()!.bestHand.handTypeLabel }}</span>
          </div>

          <div class="best-hand-cards">
            @for (card of analysis()!.bestHand.cards; track card.id) {
              <span class="card-display" [class]="getSuitColorClass(card)">
                {{ getSuitSymbol(card) }}{{ card.rank }}
              </span>
            }
          </div>

          <div class="score-comparison">
            <div class="projected-score">
              <span class="score-label">PROJECTED:</span>
              <span class="score-value">{{ formatScore(analysis()!.bestHand.projectedScore) }}</span>
            </div>
            <div class="blind-comparison" [class.beats]="analysis()!.bestHand.beatsBlind" [class.fails]="!analysis()!.bestHand.beatsBlind">
              <span class="blind-label">Blind: {{ formatScore(blindGoal()) }}</span>
              @if (analysis()!.bestHand.beatsBlind) {
                <span class="result-indicator beats">
                  <span class="checkmark">&#10003;</span> BEATS (+{{ formatScore(analysis()!.bestHand.margin) }})
                </span>
              } @else {
                <span class="result-indicator fails">
                  <span class="x-mark">&#10007;</span> SHORT ({{ formatScore(analysis()!.bestHand.margin) }})
                </span>
              }
            </div>
          </div>
        </div>

        <!-- Recommendations Section -->
        <div class="recommendations-section">
          <div class="recommendation-header">RECOMMENDATION</div>

          @if (analysis()!.cardsToDiscard.length > 0) {
            <div class="discard-section">
              <span class="action-label discard-label">DISCARD:</span>
              @for (analyzed of analysis()!.cardsToDiscard; track analyzed.card.id) {
                <div class="card-recommendation">
                  <span class="card-display small" [class]="getSuitColorClass(analyzed.card)">
                    {{ getSuitSymbol(analyzed.card) }}{{ analyzed.card.rank }}
                  </span>
                  <span class="reason">{{ analyzed.reason }}</span>
                </div>
              }
            </div>
          }

          @if (analysis()!.cardsToKeep.length > 0) {
            <div class="keep-section">
              <span class="action-label keep-label">KEEP:</span>
              <div class="keep-cards">
                @for (analyzed of analysis()!.cardsToKeep; track analyzed.card.id) {
                  <span class="card-display small" [class]="getSuitColorClass(analyzed.card)">
                    {{ getSuitSymbol(analyzed.card) }}{{ analyzed.card.rank }}
                  </span>
                }
              </div>
              @if (getKeepReasonsGrouped().length > 0) {
                <div class="keep-reasons">
                  @for (reason of getKeepReasonsGrouped(); track reason) {
                    <span class="reason">{{ reason }}</span>
                  }
                </div>
              }
            </div>
          }

          @if (analysis()!.cardsToDiscard.length === 0 && analysis()!.cardsToKeep.length === 0) {
            <div class="no-recommendations">
              <p>All cards are part of your best hand - play them!</p>
            </div>
          }
        </div>

        <!-- Build Context -->
        @if (analysis()!.buildContext.buildType) {
          <div class="build-context">
            <span class="build-label">Build:</span>
            <span class="build-name">{{ analysis()!.buildContext.buildName }}</span>
          </div>
        }
      }
    </section>
    }
  `,
  styles: [`
    .hand-guidance {
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

    /* Best Play Section */
    .best-play-section {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }

    .best-play-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .best-play-label {
      font-size: 10px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .hand-type {
      font-size: 14px;
      font-weight: 700;
      color: #ffd700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .best-hand-cards {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .card-display {
      font-size: 14px;
      font-weight: 600;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      letter-spacing: 1px;
    }

    .card-display.small {
      font-size: 12px;
      padding: 2px 6px;
    }

    .suit-red {
      color: #ff6b6b;
    }

    .suit-black {
      color: #e0e0e0;
    }

    .score-comparison {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 10px;
    }

    .projected-score {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .score-label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .score-value {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }

    .blind-comparison {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
    }

    .blind-label {
      color: rgba(255, 255, 255, 0.6);
    }

    .result-indicator {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .result-indicator.beats {
      color: #4ade80;
    }

    .result-indicator.fails {
      color: #f87171;
    }

    .checkmark, .x-mark {
      font-size: 14px;
    }

    /* Recommendations Section */
    .recommendations-section {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }

    .recommendation-header {
      font-size: 10px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 10px;
    }

    .discard-section, .keep-section {
      margin-bottom: 12px;
    }

    .discard-section:last-child, .keep-section:last-child {
      margin-bottom: 0;
    }

    .action-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: block;
      margin-bottom: 6px;
    }

    .discard-label {
      color: #f87171;
    }

    .keep-label {
      color: #4ade80;
    }

    .card-recommendation {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }

    .reason {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
    }

    .keep-cards {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }

    .keep-reasons {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .keep-reasons .reason {
      padding-left: 4px;
    }

    .no-recommendations {
      text-align: center;
      padding: 8px;
    }

    .no-recommendations p {
      font-size: 12px;
      color: #4ade80;
      margin: 0;
    }

    /* Build Context */
    .build-context {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
    }

    .build-label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .build-name {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
    }
  `],
})
export class HandGuidanceComponent {
  private handAnalyzer = inject(HandAnalyzerService);
  private gameState = inject(GameStateService);
  private visibilityService = inject(PhaseVisibilityService);

  readonly isVisible = this.visibilityService.isPanelVisible('hand-guidance');

  /**
   * Current hand analysis from the analyzer service
   */
  analysis = this.handAnalyzer.analysis;

  /**
   * Current blind goal
   */
  blindGoal = computed(() => {
    const blind = this.gameState.blind();
    return blind?.chipGoal ?? 0;
  });

  /**
   * Get suit symbol for a card
   */
  getSuitSymbol(card: Card): string {
    return SUIT_SYMBOLS[card.suit];
  }

  /**
   * Get CSS class for suit color
   */
  getSuitColorClass(card: Card): string {
    return SUIT_COLORS[card.suit];
  }

  /**
   * Format score for display
   */
  formatScore(score: number): string {
    if (Math.abs(score) >= 1000000) {
      return (score / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(score) >= 1000) {
      return (score / 1000).toFixed(1) + 'K';
    }
    return score.toLocaleString();
  }

  /**
   * Group keep reasons to avoid repetition
   */
  getKeepReasonsGrouped(): string[] {
    const analysisValue = this.analysis();
    if (!analysisValue) return [];

    const reasons = new Set<string>();
    for (const analyzed of analysisValue.cardsToKeep) {
      reasons.add(analyzed.reason);
    }
    return Array.from(reasons);
  }
}
