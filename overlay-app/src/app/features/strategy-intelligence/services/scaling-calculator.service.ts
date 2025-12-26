import { Injectable, inject, computed, signal } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { ScalingHealth, Warning, WarningSeverity } from '../../../../../../shared/models/strategy.model';
import { HandType, HandLevel, BlindType } from '../../../../../../shared/models/game-state.model';
import { Card, Enhancement, Edition, Rank } from '../../../../../../shared/models/card.model';
import { JokerState } from '../../../../../../shared/models/joker.model';

/**
 * Blind chip requirements by ante
 * Index 0 = ante 1, index 7 = ante 8
 */
interface AnteRequirements {
  small: number;
  big: number;
  boss: number;
}

const BLIND_REQUIREMENTS: AnteRequirements[] = [
  { small: 100, big: 150, boss: 300 },        // Ante 1
  { small: 450, big: 600, boss: 800 },        // Ante 2
  { small: 1200, big: 1600, boss: 2000 },     // Ante 3
  { small: 3000, big: 4000, boss: 5000 },     // Ante 4
  { small: 6000, big: 8000, boss: 11000 },    // Ante 5
  { small: 12000, big: 16000, boss: 20000 },  // Ante 6
  { small: 24000, big: 32000, boss: 35000 },  // Ante 7
  { small: 36000, big: 48000, boss: 50000 },  // Ante 8
];

/**
 * Base hand values (level 1)
 */
const BASE_HAND_VALUES: Record<HandType, { chips: number; mult: number }> = {
  high_card: { chips: 5, mult: 1 },
  pair: { chips: 10, mult: 2 },
  two_pair: { chips: 20, mult: 2 },
  three_of_a_kind: { chips: 30, mult: 3 },
  straight: { chips: 30, mult: 4 },
  flush: { chips: 35, mult: 4 },
  full_house: { chips: 40, mult: 4 },
  four_of_a_kind: { chips: 60, mult: 7 },
  straight_flush: { chips: 100, mult: 8 },
  royal_flush: { chips: 100, mult: 8 },
  five_of_a_kind: { chips: 120, mult: 12 },
  flush_house: { chips: 140, mult: 14 },
  flush_five: { chips: 160, mult: 16 },
};

/**
 * Chip values by rank
 */
const RANK_CHIPS: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11,
};

/**
 * Scaling projection for a future ante
 */
export interface ScalingProjection {
  ante: number;
  requirement: number;
  projectedMax: number;
  canBeat: boolean;
  margin: number;       // Positive = excess, negative = shortfall
  marginPercent: number;
}

/**
 * Comparison result for current vs requirement
 */
export interface BlindComparison {
  currentMax: number;
  requirement: number;
  canBeat: boolean;
  margin: number;
  marginPercent: number;
  handsNeeded: number;  // How many hands of max score needed to beat blind
}

@Injectable({ providedIn: 'root' })
export class ScalingCalculatorService {
  private gameState = inject(GameStateService);

  /**
   * All cards in the current deck
   */
  private allDeckCards = computed(() => {
    const deck = this.gameState.deck();
    if (!deck) return [];
    return [
      ...deck.remaining,
      ...deck.hand,
      ...deck.discarded,
      ...deck.played,
    ];
  });

  /**
   * Current jokers
   */
  private jokers = computed(() => this.gameState.jokers());

  /**
   * Hand levels from game state
   */
  private handLevels = computed(() => this.gameState.handLevels());

  /**
   * Current ante (1-8)
   */
  private currentAnte = computed(() => this.gameState.currentAnte());

  /**
   * Current blind info
   */
  private currentBlind = computed(() => this.gameState.blind());

  /**
   * Calculate the maximum potential score with current deck/jokers
   * This estimates the best possible hand score
   */
  maxPotentialScore = computed(() => {
    const cards = this.allDeckCards();
    const jokers = this.jokers();
    const levels = this.handLevels();

    if (cards.length === 0) return 0;

    return this.calculateMaxPotentialScore(cards, jokers, levels);
  });

  /**
   * Current blind requirement
   */
  currentRequirement = computed(() => {
    const blind = this.currentBlind();
    if (!blind) return 0;
    return blind.chipGoal;
  });

  /**
   * Compare current max to upcoming blind
   */
  blindComparison = computed<BlindComparison | null>(() => {
    const maxScore = this.maxPotentialScore();
    const requirement = this.currentRequirement();
    const handsRemaining = this.gameState.handsRemaining();

    if (requirement === 0) return null;

    const margin = maxScore - requirement;
    const canBeat = maxScore >= requirement;

    return {
      currentMax: maxScore,
      requirement,
      canBeat,
      margin,
      marginPercent: requirement > 0 ? (margin / requirement) * 100 : 0,
      handsNeeded: maxScore > 0 ? Math.ceil(requirement / maxScore) : Infinity,
    };
  });

  /**
   * Project scaling curve for future antes
   */
  scalingCurve = computed<ScalingProjection[]>(() => {
    const currentAnte = this.currentAnte();
    const maxScore = this.maxPotentialScore();
    const jokers = this.jokers();

    if (currentAnte === 0) return [];

    return this.projectScalingCurve(currentAnte, maxScore, jokers);
  });

  /**
   * Calculate scaling health based on projections
   */
  scalingHealth = computed<ScalingHealth>(() => {
    return this.getScalingHealth(this.scalingCurve(), this.currentAnte());
  });

  /**
   * Get warnings about scaling issues
   */
  scalingWarnings = computed<Warning[]>(() => {
    return this.getScalingWarnings(
      this.scalingCurve(),
      this.blindComparison(),
      this.jokers(),
      this.currentAnte()
    );
  });

  /**
   * Calculate the maximum potential score
   */
  calculateMaxPotentialScore(
    cards: Card[],
    jokers: JokerState[],
    handLevels: HandLevel[]
  ): number {
    // Find the best possible hand type
    const bestHandType = this.findBestPossibleHand(cards);
    const handLevel = handLevels.find(h => h.handType === bestHandType);

    // Get base values
    const baseValues = BASE_HAND_VALUES[bestHandType];
    const level = handLevel?.level ?? 1;

    // Calculate leveled base values
    // Each level adds chips and mult (roughly +10 chips, +1-2 mult per level)
    const leveledChips = baseValues.chips + (level - 1) * 10;
    const leveledMult = baseValues.mult + (level - 1) * 2;

    // Calculate card chips from best 5 cards
    const cardChips = this.estimateBestCardChips(cards, bestHandType);

    // Apply joker effects
    const jokerMods = this.calculateJokerEffects(jokers, bestHandType, cards);

    // Calculate final score
    // Formula: (base chips + card chips + joker chips) * (base mult + joker mult) * x-mult
    const totalChips = leveledChips + cardChips + jokerMods.addedChips;
    const totalMult = leveledMult + jokerMods.addedMult;
    const xMult = jokerMods.xMult;

    return Math.floor(totalChips * totalMult * xMult);
  }

  /**
   * Project scaling curve for future antes
   */
  projectScalingCurve(
    currentAnte: number,
    currentMaxScore: number,
    jokers: JokerState[]
  ): ScalingProjection[] {
    const projections: ScalingProjection[] = [];

    // Calculate scaling factor based on joker composition
    const scalingFactor = this.estimateScalingFactor(jokers);

    for (let ante = currentAnte; ante <= 8; ante++) {
      const anteIndex = ante - 1;
      if (anteIndex >= BLIND_REQUIREMENTS.length) break;

      const requirement = BLIND_REQUIREMENTS[anteIndex].boss; // Use boss as benchmark

      // Project score growth (assumes some scaling per ante)
      const antesFromCurrent = ante - currentAnte;
      const projectedMax = Math.floor(
        currentMaxScore * Math.pow(scalingFactor, antesFromCurrent)
      );

      const margin = projectedMax - requirement;
      const canBeat = projectedMax >= requirement;

      projections.push({
        ante,
        requirement,
        projectedMax,
        canBeat,
        margin,
        marginPercent: requirement > 0 ? (margin / requirement) * 100 : 0,
      });
    }

    return projections;
  }

  /**
   * Get scaling health assessment
   */
  getScalingHealth(projections: ScalingProjection[], currentAnte: number): ScalingHealth {
    if (projections.length === 0) return 'adequate';

    // Count how many future antes we can beat
    const futureProjections = projections.filter(p => p.ante > currentAnte);
    const beatable = futureProjections.filter(p => p.canBeat).length;
    const total = futureProjections.length;

    if (total === 0) return 'adequate';

    const beatableRatio = beatable / total;

    // Check current margin
    const currentProjection = projections.find(p => p.ante === currentAnte);
    const currentMarginPercent = currentProjection?.marginPercent ?? 0;

    // Assess health
    if (beatableRatio >= 0.9 && currentMarginPercent > 50) {
      return 'strong';
    } else if (beatableRatio >= 0.6 || currentMarginPercent > 20) {
      return 'adequate';
    } else if (beatableRatio >= 0.3 || currentMarginPercent > 0) {
      return 'weak';
    } else {
      return 'critical';
    }
  }

  /**
   * Get specific warnings about scaling issues
   */
  getScalingWarnings(
    projections: ScalingProjection[],
    comparison: BlindComparison | null,
    jokers: JokerState[],
    currentAnte: number
  ): Warning[] {
    const warnings: Warning[] = [];

    // Check if current blind is beatable
    if (comparison && !comparison.canBeat) {
      warnings.push({
        severity: 'critical',
        message: `Cannot beat current blind (need ${this.formatNumber(comparison.requirement)}, max ${this.formatNumber(comparison.currentMax)})`,
        action: comparison.handsNeeded > 4
          ? 'Need significant scoring improvement'
          : `Need ${comparison.handsNeeded} max-score hands`,
      });
    }

    // Check future antes
    const failingAnte = projections.find(p => p.ante > currentAnte && !p.canBeat);
    if (failingAnte) {
      const severity: WarningSeverity =
        failingAnte.ante === currentAnte + 1 ? 'critical' : 'caution';

      const shortfall = Math.abs(failingAnte.margin);
      const multiplierNeeded = failingAnte.requirement / failingAnte.projectedMax;

      warnings.push({
        severity,
        message: `May not beat Ante ${failingAnte.ante} boss (${this.formatNumber(failingAnte.requirement)} required)`,
        action: multiplierNeeded > 2
          ? `Need ${multiplierNeeded.toFixed(1)}x more damage - find xMult jokers`
          : `Short by ${this.formatNumber(shortfall)} - upgrade hands or find mult`,
      });
    }

    // Check for xMult presence
    const hasXMult = jokers.some(j =>
      j.effectValues['xmult'] !== undefined || j.scalingType === 'multiplicative'
    );

    if (!hasXMult && currentAnte >= 4) {
      warnings.push({
        severity: 'caution',
        message: 'No xMult jokers detected',
        action: 'Look for jokers like Obelisk, Steel Joker, or Hologram',
      });
    }

    // Check for scaling jokers
    const scalingJokers = jokers.filter(j => j.isScaling);
    if (scalingJokers.length === 0 && currentAnte >= 3) {
      warnings.push({
        severity: 'info',
        message: 'No scaling jokers in build',
        action: 'Scaling jokers help in late game (Ride the Bus, Green Joker)',
      });
    }

    return warnings;
  }

  /**
   * Get requirement for a specific ante and blind type
   */
  getRequirementForAnte(ante: number, blindType: BlindType): number {
    const anteIndex = ante - 1;
    if (anteIndex < 0 || anteIndex >= BLIND_REQUIREMENTS.length) {
      return 0;
    }
    return BLIND_REQUIREMENTS[anteIndex][blindType];
  }

  /**
   * Compare current score capability to a specific requirement
   */
  compareToRequirements(maxScore: number, requirement: number): BlindComparison {
    const margin = maxScore - requirement;
    return {
      currentMax: maxScore,
      requirement,
      canBeat: maxScore >= requirement,
      margin,
      marginPercent: requirement > 0 ? (margin / requirement) * 100 : 0,
      handsNeeded: maxScore > 0 ? Math.ceil(requirement / maxScore) : Infinity,
    };
  }

  /**
   * Find the best possible hand type from available cards
   */
  private findBestPossibleHand(cards: Card[]): HandType {
    if (cards.length < 5) return 'high_card';

    const rankCounts = this.getRankCounts(cards);
    const suitCounts = this.getSuitCounts(cards);

    const maxOfRank = Math.max(...Object.values(rankCounts));
    const maxOfSuit = Math.max(...Object.values(suitCounts));
    const uniqueRanks = Object.keys(rankCounts).length;

    // Check for five of a kind (requires wild cards or special circumstances)
    if (maxOfRank >= 5) return 'five_of_a_kind';

    // Check for flush five
    if (maxOfSuit >= 5 && maxOfRank >= 5) return 'flush_five';

    // Check for flush house
    if (maxOfSuit >= 5 && maxOfRank >= 3 && this.hasPair(rankCounts)) {
      return 'flush_house';
    }

    // Check for four of a kind
    if (maxOfRank >= 4) return 'four_of_a_kind';

    // Check for full house
    if (maxOfRank >= 3 && this.hasPair(rankCounts, 3)) return 'full_house';

    // Check for flush
    const hasFlush = maxOfSuit >= 5;

    // Check for straight
    const hasStraight = this.canMakeStraight(cards);

    // Check for straight flush / royal flush
    if (hasFlush && hasStraight) {
      // Simplified: assume best case
      return 'straight_flush';
    }

    if (hasFlush) return 'flush';
    if (hasStraight) return 'straight';

    // Three of a kind
    if (maxOfRank >= 3) return 'three_of_a_kind';

    // Two pair
    if (this.countPairs(rankCounts) >= 2) return 'two_pair';

    // Pair
    if (maxOfRank >= 2) return 'pair';

    return 'high_card';
  }

  /**
   * Estimate chip value from best scoring cards
   */
  private estimateBestCardChips(cards: Card[], handType: HandType): number {
    // Get cards sorted by chip value (highest first)
    const sortedCards = [...cards].sort((a, b) => b.chipValue - a.chipValue);

    // Take top 5 cards that would be in the hand
    const scoringCards = sortedCards.slice(0, 5);

    let totalChips = 0;
    for (const card of scoringCards) {
      let cardChips = card.chipValue || RANK_CHIPS[card.rank] || 0;

      // Enhancement bonuses
      if (card.enhancement === 'bonus') {
        cardChips += 30;
      } else if (card.enhancement === 'stone') {
        cardChips += 50;
      }

      // Edition bonuses (foil adds chips)
      if (card.edition === 'foil') {
        cardChips += 50;
      }

      totalChips += cardChips;
    }

    return totalChips;
  }

  /**
   * Calculate joker effect contributions
   */
  private calculateJokerEffects(
    jokers: JokerState[],
    handType: HandType,
    cards: Card[]
  ): { addedChips: number; addedMult: number; xMult: number } {
    let addedChips = 0;
    let addedMult = 0;
    let xMult = 1;

    for (const joker of jokers) {
      // Add direct chips
      if (joker.effectValues['chips']) {
        addedChips += joker.effectValues['chips'];
      }

      // Add direct mult
      if (joker.effectValues['mult']) {
        addedMult += joker.effectValues['mult'];
      }

      // Apply x-mult (multiply together)
      if (joker.effectValues['xmult']) {
        xMult *= joker.effectValues['xmult'];
      }

      // Check for scaling value
      if (joker.isScaling && joker.scalingValue) {
        if (joker.scalingType === 'additive') {
          addedMult += joker.scalingValue;
        } else if (joker.scalingType === 'multiplicative') {
          xMult *= joker.scalingValue;
        }
      }

      // Edition bonuses on jokers
      if (joker.edition === 'foil') {
        addedChips += 50;
      } else if (joker.edition === 'holographic') {
        addedMult += 10;
      } else if (joker.edition === 'polychrome') {
        xMult *= 1.5;
      }
    }

    return { addedChips, addedMult, xMult };
  }

  /**
   * Estimate scaling factor based on joker composition
   */
  private estimateScalingFactor(jokers: JokerState[]): number {
    // Base factor - typical hand level upgrades provide ~1.3x per ante
    let factor = 1.3;

    // xMult jokers increase scaling significantly
    const xMultJokers = jokers.filter(
      j => j.effectValues['xmult'] !== undefined || j.scalingType === 'multiplicative'
    );
    factor += xMultJokers.length * 0.2;

    // Scaling jokers add to growth
    const scalingJokers = jokers.filter(j => j.isScaling);
    factor += scalingJokers.length * 0.15;

    // Polychrome edition adds scaling
    const polychromeJokers = jokers.filter(j => j.edition === 'polychrome');
    factor += polychromeJokers.length * 0.1;

    return Math.min(factor, 2.5); // Cap at 2.5x per ante
  }

  /**
   * Helper: Get rank counts from cards
   */
  private getRankCounts(cards: Card[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const card of cards) {
      counts[card.rank] = (counts[card.rank] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: Get suit counts from cards
   */
  private getSuitCounts(cards: Card[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const card of cards) {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: Check if there's a pair (excluding a specific rank count)
   */
  private hasPair(rankCounts: Record<string, number>, excludeCount?: number): boolean {
    return Object.values(rankCounts).some(
      count => count >= 2 && count !== excludeCount
    );
  }

  /**
   * Helper: Count pairs in rank distribution
   */
  private countPairs(rankCounts: Record<string, number>): number {
    return Object.values(rankCounts).filter(count => count >= 2).length;
  }

  /**
   * Helper: Check if a straight is possible
   */
  private canMakeStraight(cards: Card[]): boolean {
    const rankValues: Record<Rank, number> = {
      'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
      '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
    };

    const values = new Set(cards.map(c => rankValues[c.rank]));

    // Check for 5 consecutive values (including wheel: A-2-3-4-5)
    for (let start = 2; start <= 10; start++) {
      let consecutive = 0;
      for (let v = start; v < start + 5; v++) {
        if (values.has(v)) consecutive++;
      }
      if (consecutive >= 5) return true;
    }

    // Check wheel (A-2-3-4-5)
    if (values.has(14) && values.has(2) && values.has(3) && values.has(4) && values.has(5)) {
      return true;
    }

    // Check broadway (10-J-Q-K-A)
    if (values.has(10) && values.has(11) && values.has(12) && values.has(13) && values.has(14)) {
      return true;
    }

    return false;
  }

  /**
   * Format large numbers for display
   */
  private formatNumber(n: number): string {
    if (n >= 1000000) {
      return (n / 1000000).toFixed(1) + 'M';
    } else if (n >= 1000) {
      return (n / 1000).toFixed(1) + 'K';
    }
    return n.toLocaleString();
  }
}
