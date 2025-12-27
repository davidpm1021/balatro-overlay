import { Injectable, computed, inject, signal } from '@angular/core';
import { SynergyGraphService } from './synergy-graph.service';
import { BuildDetectorService } from './build-detector.service';
import {
  OverlayGameState,
  ShopItem,
  GamePhase,
} from '../../../../../../shared/models/game-state.model';
import { JokerState } from '../../../../../../shared/models/joker.model';

export interface ShopRecommendation {
  item: ShopItem;
  score: number;
  reasons: string[];
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  synergiesWithOwned: string[];
}

export interface BoosterCardRecommendation {
  cardId: string;
  cardName: string;
  score: number;
  reasons: string[];
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
}

interface JokerData {
  id: string;
  name: string;
  tier?: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  basePriority?: number;
  earlyGameBonus?: number;
  lateGamePenalty?: number;
  generatesMoney?: boolean;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class ShopAdvisorService {
  private readonly synergyGraph = inject(SynergyGraphService);
  private readonly buildDetector = inject(BuildDetectorService);

  private readonly gameState = signal<OverlayGameState | null>(null);

  // Computed values
  readonly currentAnte = computed(() => this.gameState()?.progress.ante ?? 1);
  readonly currentPhase = computed(() => this.gameState()?.progress.phase ?? 'menu');
  readonly ownedJokers = computed(() => this.gameState()?.jokers ?? []);
  readonly shopItems = computed(() => this.gameState()?.shop?.items ?? []);

  /**
   * Update the game state from external source
   */
  updateState(state: OverlayGameState): void {
    this.gameState.set(state);
  }

  /**
   * Get shop recommendations sorted by score
   */
  getShopRecommendations(): ShopRecommendation[] {
    const items = this.shopItems();
    const ante = this.currentAnte();
    const owned = this.ownedJokers();

    return items
      .filter(item => !item.sold)
      .map(item => this.scoreShopItem(item, ante, owned))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Score a specific joker by ID with current context
   */
  scoreJoker(jokerId: string): number {
    const jokerData = this.synergyGraph.getJoker(jokerId) as JokerData | null;
    if (!jokerData) return 50; // Unknown joker, neutral score

    return this.calculateJokerScore(
      jokerData,
      this.currentAnte(),
      this.ownedJokers()
    );
  }

  /**
   * Score booster pack contents (Buffoon, Arcana, etc.)
   */
  scoreBoosterContents(cards: Array<{ id: string; name: string; type: string }>): BoosterCardRecommendation[] {
    const ante = this.currentAnte();
    const owned = this.ownedJokers();

    return cards
      .map(card => {
        if (card.type === 'joker') {
          const jokerData = this.synergyGraph.getJoker(card.id) as JokerData | null;
          const score = jokerData
            ? this.calculateJokerScore(jokerData, ante, owned)
            : 50;
          const reasons = this.getJokerReasons(jokerData, ante, owned);

          return {
            cardId: card.id,
            cardName: card.name,
            score,
            reasons,
            tier: this.scoreToTier(score),
          };
        }

        // Tarot/Planet/Spectral scoring
        return this.scoreConsumable(card, ante);
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Check if we're in a booster selection phase
   */
  isInBoosterPhase(): boolean {
    return this.currentPhase() === 'booster';
  }

  private scoreShopItem(
    item: ShopItem,
    ante: number,
    ownedJokers: JokerState[]
  ): ShopRecommendation {
    if (item.type === 'joker') {
      const jokerData = this.synergyGraph.getJoker(item.id) as JokerData | null;
      const score = jokerData
        ? this.calculateJokerScore(jokerData, ante, ownedJokers)
        : 50;
      const reasons = this.getJokerReasons(jokerData, ante, ownedJokers);
      const synergies = this.findSynergiesWithOwned(item.id, ownedJokers);

      return {
        item,
        score,
        reasons,
        tier: this.scoreToTier(score),
        synergiesWithOwned: synergies,
      };
    }

    // Non-joker items get basic scoring
    return this.scoreNonJokerItem(item, ante);
  }

  private calculateJokerScore(
    joker: JokerData,
    ante: number,
    ownedJokers: JokerState[]
  ): number {
    let score = joker.basePriority ?? 50;

    // Apply ante-based adjustments
    score = this.applyAnteModifiers(score, joker, ante);

    // Check synergies with owned jokers
    score += this.calculateSynergyBonus(joker.id, ownedJokers);

    // Check build fit
    score += this.calculateBuildFitBonus(joker);

    // Special handling for copy jokers (Blueprint/Brainstorm)
    if (this.isCopyJoker(joker.id) && ownedJokers.length > 0) {
      score = Math.max(score, 85); // Always valuable with jokers to copy

      // Extra bonus if we have strong xMult jokers
      const hasStrongTarget = ownedJokers.some(j =>
        this.isStrongCopyTarget(j.id)
      );
      if (hasStrongTarget) {
        score = Math.max(score, 90);
      }
    }

    // Clamp score to 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private applyAnteModifiers(
    baseScore: number,
    joker: JokerData,
    ante: number
  ): number {
    let score = baseScore;
    const isEarlyGame = ante <= 2;
    const isLateGame = ante >= 6;

    // Early game bonuses
    if (isEarlyGame && joker.earlyGameBonus) {
      score += joker.earlyGameBonus;
    }

    // Late game penalties for economy jokers
    if (isLateGame && joker.lateGamePenalty) {
      score -= joker.lateGamePenalty;
    }

    // Economy jokers scale down as ante increases
    if (joker.generatesMoney) {
      const econoScaling = this.getEconomyScaling(ante);
      score = score * econoScaling;
    }

    // Example: Gros Michel at Ante 1 scores ~75+, at Ante 6 scores ~30
    // This is handled by earlyGameBonus + lateGamePenalty in the JSON

    return score;
  }

  private getEconomyScaling(ante: number): number {
    // Economy value decreases as the game progresses
    // Ante 1-2: 100%, Ante 3-4: 80%, Ante 5-6: 60%, Ante 7+: 40%
    if (ante <= 2) return 1.0;
    if (ante <= 4) return 0.8;
    if (ante <= 6) return 0.6;
    return 0.4;
  }

  private calculateSynergyBonus(
    jokerId: string,
    ownedJokers: JokerState[]
  ): number {
    const ownedIds = ownedJokers.map(j => j.id);
    const synergies = this.synergyGraph.getSynergies(jokerId);

    let bonus = 0;
    for (const synergy of synergies) {
      if (ownedIds.includes(synergy.jokerId)) {
        switch (synergy.strength) {
          case 'strong':
            bonus += 10;
            break;
          case 'medium':
            bonus += 5;
            break;
          case 'weak':
            bonus += 2;
            break;
        }
      }
    }

    return Math.min(bonus, 25); // Cap synergy bonus at 25
  }

  private calculateBuildFitBonus(joker: JokerData): number {
    const detectedBuild = this.buildDetector.primaryStrategy();
    if (!detectedBuild) return 0;

    const jokerData = this.synergyGraph.getJoker(joker.id);
    if (!jokerData) return 0;

    const strategyMatch = jokerData.strategies.find(
      s => s.strategy === detectedBuild.type
    );

    if (strategyMatch) {
      // Scale bonus by affinity (0-100) -> 0-15 bonus
      return Math.round(strategyMatch.affinity * 0.15);
    }

    return 0;
  }

  private isCopyJoker(jokerId: string): boolean {
    return jokerId === 'j_blueprint' || jokerId === 'j_brainstorm';
  }

  private isStrongCopyTarget(jokerId: string): boolean {
    const joker = this.synergyGraph.getJoker(jokerId) as JokerData | null;
    if (!joker) return false;

    // Strong copy targets: S-tier jokers, xMult jokers
    return (
      joker.tier === 'S' ||
      joker.tier === 'A' ||
      (joker.tags?.includes('xmult') ?? false)
    );
  }

  private getJokerReasons(
    joker: JokerData | null,
    ante: number,
    ownedJokers: JokerState[]
  ): string[] {
    const reasons: string[] = [];
    if (!joker) return reasons;

    // Tier rating
    if (joker.tier) {
      reasons.push(`${joker.tier}-tier joker`);
    }

    // Ante-based reasons
    if (ante <= 2 && joker.earlyGameBonus) {
      reasons.push('Strong early game');
    }
    if (ante >= 6 && joker.lateGamePenalty) {
      reasons.push('Less valuable late game');
    }

    // Economy reason
    if (joker.generatesMoney) {
      if (ante <= 2) {
        reasons.push('Economy boost for early scaling');
      } else {
        reasons.push('Economy (diminishing returns)');
      }
    }

    // Copy joker bonus
    if (this.isCopyJoker(joker.id) && ownedJokers.length > 0) {
      reasons.push('Can copy your existing jokers');
    }

    // Synergy reasons
    const synergies = this.findSynergiesWithOwned(joker.id, ownedJokers);
    if (synergies.length > 0) {
      reasons.push(`Synergizes with: ${synergies.slice(0, 3).join(', ')}`);
    }

    return reasons;
  }

  private findSynergiesWithOwned(
    jokerId: string,
    ownedJokers: JokerState[]
  ): string[] {
    const ownedIds = new Set(ownedJokers.map(j => j.id));
    const synergies = this.synergyGraph.getSynergies(jokerId);

    return synergies
      .filter(s => ownedIds.has(s.jokerId))
      .map(s => {
        const joker = this.synergyGraph.getJoker(s.jokerId);
        return joker?.name ?? s.jokerId;
      });
  }

  private scoreNonJokerItem(item: ShopItem, ante: number): ShopRecommendation {
    let score = 50;
    const reasons: string[] = [];

    switch (item.type) {
      case 'planet':
        // Planets are good for leveling hands
        score = 60;
        reasons.push('Levels up poker hand');
        break;

      case 'tarot':
        // Tarots are situational
        score = 55;
        reasons.push('Card modification');
        break;

      case 'spectral':
        // Spectrals are powerful but risky
        score = 65;
        reasons.push('Powerful effect');
        break;

      case 'voucher':
        // Vouchers provide permanent upgrades
        score = 70;
        reasons.push('Permanent upgrade');
        if (ante <= 3) {
          score += 10;
          reasons.push('Early vouchers compound value');
        }
        break;

      case 'booster':
        // Boosters provide options
        score = 55;
        reasons.push('Multiple choices');
        break;
    }

    return {
      item,
      score,
      reasons,
      tier: this.scoreToTier(score),
      synergiesWithOwned: [],
    };
  }

  private scoreConsumable(
    card: { id: string; name: string; type: string },
    ante: number
  ): BoosterCardRecommendation {
    let score = 50;
    const reasons: string[] = [];

    if (card.type === 'planet') {
      score = 60;
      reasons.push('Levels up poker hand');
    } else if (card.type === 'tarot') {
      score = 55;
      reasons.push('Card modification');
    } else if (card.type === 'spectral') {
      score = 70;
      reasons.push('Powerful effect');
    }

    return {
      cardId: card.id,
      cardName: card.name,
      score,
      reasons,
      tier: this.scoreToTier(score),
    };
  }

  private scoreToTier(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'S';
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    if (score >= 45) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }
}
