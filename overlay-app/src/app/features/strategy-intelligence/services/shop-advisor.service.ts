/**
 * Shop Advisor Service
 *
 * Scores shop items for the current run based on:
 * - Synergy with owned jokers
 * - Fit with detected strategy
 * - General value/utility
 *
 * Provides recommendations with reasoning for each score.
 */

import { Injectable, inject, computed } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { SynergyGraphService } from './synergy-graph.service';
import { BuildDetectorService } from './build-detector.service';
import { ShopRecommendation, StrategyType } from '../../../../../../shared/models/strategy.model';
import { ShopItem } from '../../../../../../shared/models/game-state.model';
import { JokerState } from '../../../../../../shared/models/joker.model';
import { JOKER_DESCRIPTIONS } from '../../joker-display/joker-descriptions';

export interface ScoredShopItem extends ShopRecommendation {
  item: ShopItem;
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  baseScore: number;
  synergyScore: number;
  strategyScore: number;
  utilityScore: number;
  economyPenalty: number;
  reasons: string[];
}

/**
 * High-value jokers that are good in almost any run.
 */
const UNIVERSALLY_GOOD_JOKERS: Record<string, { score: number; reason: string }> = {
  'j_blueprint': { score: 25, reason: 'Blueprint copies joker abilities' },
  'j_brainstorm': { score: 25, reason: 'Brainstorm copies leftmost joker' },
  'j_chicot': { score: 30, reason: 'Disables all Boss Blind effects' },
  'j_perkeo': { score: 25, reason: 'Creates Negative consumable copies' },
  'j_invisible': { score: 20, reason: 'Can duplicate your best joker' },
  'j_four_fingers': { score: 20, reason: 'Enables 4-card flushes and straights' },
  'j_shortcut': { score: 18, reason: 'Makes straights much easier' },
  'j_hack': { score: 20, reason: 'Retriggers low cards for extra scoring' },
  'j_mime': { score: 18, reason: 'Retriggers held card abilities' },
  'j_dusk': { score: 18, reason: 'Retriggers all cards on final hand' },
  'j_oops': { score: 15, reason: 'Doubles all luck-based triggers' },
  'j_chaos': { score: 12, reason: 'Free reroll each shop' },
  'j_golden': { score: 10, reason: 'Steady income generation' },
  'j_to_the_moon': { score: 12, reason: 'Interest on held money' },
  'j_cavendish': { score: 22, reason: 'x3 Mult is very powerful' },
  'j_loyalty_card': { score: 18, reason: 'x4 Mult every 6 hands' },
  'j_acrobat': { score: 15, reason: 'x3 Mult on final hand' },
  'j_sock_and_buskin': { score: 20, reason: 'Retriggers all face cards' }
};

/**
 * Jokers that are risky or situational.
 */
const SITUATIONAL_JOKERS: Record<string, { penalty: number; reason: string }> = {
  'j_ceremonial': { penalty: 15, reason: 'Destroys a joker when acquired' },
  'j_madness': { penalty: 20, reason: 'Destroys random jokers' },
  'j_ramen': { penalty: 10, reason: 'Loses value when discarding' },
  'j_ice_cream': { penalty: 10, reason: 'Loses value over time' },
  'j_popcorn': { penalty: 10, reason: 'Loses value each round' },
  'j_turtle_bean': { penalty: 8, reason: 'Hand size shrinks over time' },
  'j_stencil': { penalty: 10, reason: 'Needs empty joker slots' },
  'j_mr_bones': { penalty: 5, reason: 'Only useful when about to lose' }
};

/**
 * Strategy-joker affinity mapping for scoring.
 */
const STRATEGY_JOKER_MAP: Partial<Record<StrategyType, string[]>> = {
  flush: ['j_droll', 'j_crafty', 'j_tribe', 'j_four_fingers', 'j_lusty_joker', 'j_greedy_joker', 'j_wrathful_joker', 'j_gluttonous_joker'],
  pairs: ['j_jolly', 'j_zany', 'j_mad', 'j_duo', 'j_trio', 'j_family', 'j_sly', 'j_wily', 'j_clever'],
  mult_stacking: ['j_joker', 'j_half', 'j_abstract', 'j_gros_michel', 'j_green_joker', 'j_ride_the_bus', 'j_supernova'],
  xmult_scaling: ['j_cavendish', 'j_loyalty_card', 'j_photograph', 'j_steel_joker', 'j_constellation', 'j_hologram', 'j_lucky_cat'],
  fibonacci: ['j_fibonacci', 'j_hack', 'j_wee', 'j_scholar'],
  face_cards: ['j_scary_face', 'j_smiley', 'j_pareidolia', 'j_sock_and_buskin', 'j_baron', 'j_triboulet'],
  straight: ['j_crazy', 'j_devious', 'j_order', 'j_runner', 'j_shortcut', 'j_four_fingers'],
};

/**
 * Known anti-synergies between jokers.
 */
const ANTI_SYNERGIES: Record<string, { with: string; reason: string }[]> = {
  'j_pareidolia': [{ with: 'j_ride_the_bus', reason: 'All cards become face cards, breaking Bus' }],
  'j_ride_the_bus': [{ with: 'j_pareidolia', reason: 'Pareidolia makes all cards face cards' }],
};

/**
 * Priority threshold for "BUY!" badge.
 */
const PRIORITY_THRESHOLD = 80;

@Injectable({ providedIn: 'root' })
export class ShopAdvisorService {
  private readonly gameState = inject(GameStateService);
  private readonly synergyGraph = inject(SynergyGraphService);
  private readonly buildDetector = inject(BuildDetectorService);

  /**
   * Scored shop items, sorted by score descending.
   */
  readonly scoredItems = computed(() => {
    const shop = this.gameState.shop();
    if (!shop?.items) return [];

    const jokers = this.gameState.jokers();
    const money = this.gameState.money();

    return shop.items
      .filter(item => !item.sold && item.type === 'joker')
      .map(item => this.scoreShopItem(item, jokers, money))
      .sort((a, b) => b.score - a.score);
  });

  /**
   * Priority items (score >= 80).
   */
  readonly priorityItems = computed(() =>
    this.scoredItems().filter(item => item.isPriority)
  );

  /**
   * Best item in shop.
   */
  readonly bestItem = computed(() => {
    const items = this.scoredItems();
    return items.length > 0 ? items[0] : null;
  });

  /**
   * Score a single shop item.
   */
  scoreShopItem(item: ShopItem, ownedJokers: JokerState[], money: number): ScoredShopItem {
    const breakdown: ScoreBreakdown = {
      baseScore: 0,
      synergyScore: 0,
      strategyScore: 0,
      utilityScore: 0,
      economyPenalty: 0,
      reasons: []
    };

    // Only score jokers for now
    if (item.type !== 'joker') {
      return this.createResult(item, 0, breakdown, []);
    }

    const jokerId = item.id;
    const synergyWith: string[] = [];

    // 1. Base score from universal value
    const universalValue = UNIVERSALLY_GOOD_JOKERS[jokerId];
    if (universalValue) {
      breakdown.baseScore = universalValue.score;
      breakdown.reasons.push(universalValue.reason);
    } else {
      // Default base score
      breakdown.baseScore = 15;
    }

    // 2. Synergy score with owned jokers
    const ownedIds = ownedJokers.map(j => j.id);
    const allIds = [...ownedIds, jokerId];
    const synergyScore = this.synergyGraph.calculateSynergyScore(allIds);
    const currentScore = this.synergyGraph.calculateSynergyScore(ownedIds);
    const synergyGain = synergyScore - currentScore;
    breakdown.synergyScore = Math.round(Math.min(40, synergyGain * 4)); // Scale up

    // Get synergy details
    const synergies = this.synergyGraph.findSynergiesBetween(allIds);
    for (const synergy of synergies) {
      if (synergy.jokerA === jokerId || synergy.jokerB === jokerId) {
        const partnerId = synergy.jokerA === jokerId ? synergy.jokerB : synergy.jokerA;
        const partner = ownedJokers.find(j => j.id === partnerId);
        if (partner) {
          synergyWith.push(partner.name);
          breakdown.reasons.push(`Synergizes with ${partner.name}: ${synergy.reason}`);
        }
      }
    }

    // 3. Strategy fit score
    const strategyBonus = this.calculateStrategyBonus(jokerId);
    breakdown.strategyScore = strategyBonus;

    if (strategyBonus > 0) {
      const primary = this.buildDetector.primaryStrategy();
      if (primary) {
        breakdown.reasons.push(`Fits ${this.formatStrategyName(primary.type)} strategy`);
      }
    }

    // 4. Utility score based on joker effects
    breakdown.utilityScore = this.calculateUtilityScore(jokerId);

    // 5. Economy penalty if can't afford
    if (item.cost > money) {
      breakdown.economyPenalty = 10;
      breakdown.reasons.push(`Can't afford ($${item.cost} > $${money})`);
    } else if (item.cost > money * 0.8) {
      breakdown.economyPenalty = 5;
      breakdown.reasons.push('Would spend most of your money');
    }

    // 6. Situational penalties
    const situational = SITUATIONAL_JOKERS[jokerId];
    if (situational) {
      breakdown.economyPenalty += situational.penalty;
      breakdown.reasons.push(`Warning: ${situational.reason}`);
    }

    // 7. Check for anti-synergies
    const antiSynergies = this.checkAntiSynergies(jokerId, ownedJokers);
    if (antiSynergies.length > 0) {
      breakdown.economyPenalty += 20;
      for (const warning of antiSynergies) {
        breakdown.reasons.push(`Anti-synergy: ${warning}`);
      }
    }

    // Calculate final score
    const totalScore = Math.max(0, Math.min(100,
      breakdown.baseScore +
      breakdown.synergyScore +
      breakdown.strategyScore +
      breakdown.utilityScore -
      breakdown.economyPenalty
    ));

    return this.createResult(item, totalScore, breakdown, synergyWith);
  }

  /**
   * Calculate strategy bonus based on primary detected strategy.
   */
  private calculateStrategyBonus(jokerId: string): number {
    const primary = this.buildDetector.primaryStrategy();
    if (!primary || primary.confidence < 30) return 0;

    const strategyJokers = STRATEGY_JOKER_MAP[primary.type];
    if (!strategyJokers) return 0;

    if (strategyJokers.includes(jokerId)) {
      // Scale bonus by confidence
      return Math.round(20 + (primary.confidence / 10));
    }

    return 0;
  }

  /**
   * Check for anti-synergies between candidate and owned jokers.
   */
  private checkAntiSynergies(jokerId: string, ownedJokers: JokerState[]): string[] {
    const warnings: string[] = [];
    const antiSynergies = ANTI_SYNERGIES[jokerId];

    if (antiSynergies) {
      for (const anti of antiSynergies) {
        if (ownedJokers.some(j => j.id === anti.with)) {
          warnings.push(anti.reason);
        }
      }
    }

    return warnings;
  }

  /**
   * Calculate utility score based on joker effects.
   */
  private calculateUtilityScore(jokerId: string): number {
    let score = 0;
    const desc = JOKER_DESCRIPTIONS[jokerId];

    if (!desc) return 5; // Unknown joker gets small base score

    const description = desc.description.toLowerCase();

    // xMult is very valuable
    if (description.includes('x') && description.includes('mult')) {
      score += 10;
    }

    // +Mult is good
    if (description.includes('+') && description.includes('mult')) {
      score += 5;
    }

    // Scaling jokers are valuable if we're early enough
    if (desc.scaling) {
      score += 8;
    }

    // Retrigger effects are powerful
    if (description.includes('retrigger')) {
      score += 8;
    }

    // Money generation helps sustainability
    if (description.includes('earn') || description.includes('$')) {
      score += 3;
    }

    // Hand size is valuable
    if (description.includes('hand size')) {
      score += 5;
    }

    // Copy effects are very powerful
    if (description.includes('copy')) {
      score += 10;
    }

    return Math.min(20, score); // Cap at 20
  }

  /**
   * Create the final scored result.
   */
  private createResult(
    item: ShopItem,
    score: number,
    breakdown: ScoreBreakdown,
    synergyWith: string[]
  ): ScoredShopItem {
    // Generate summary reason
    let reason: string;
    if (breakdown.reasons.length > 0) {
      // Pick the most important reason
      reason = breakdown.reasons[0];
    } else if (score >= PRIORITY_THRESHOLD) {
      reason = 'Strong overall pick';
    } else if (score >= 60) {
      reason = 'Solid choice for this run';
    } else if (score >= 40) {
      reason = 'Situationally useful';
    } else {
      reason = 'Low priority';
    }

    return {
      itemId: item.id,
      itemName: item.name,
      score: Math.round(score),
      reason,
      isPriority: score >= PRIORITY_THRESHOLD,
      synergyWith: synergyWith.length > 0 ? synergyWith : undefined,
      item,
      breakdown
    };
  }

  /**
   * Format strategy type for display.
   */
  private formatStrategyName(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get detailed recommendation text for an item.
   */
  getDetailedRecommendation(item: ScoredShopItem): string {
    const lines: string[] = [];

    lines.push(`Score: ${item.score}/100`);
    lines.push('');

    if (item.isPriority) {
      lines.push('*** PRIORITY BUY ***');
      lines.push('');
    }

    lines.push('Breakdown:');
    lines.push(`  Base value: +${item.breakdown.baseScore}`);
    if (item.breakdown.synergyScore > 0) {
      lines.push(`  Synergy bonus: +${item.breakdown.synergyScore}`);
    }
    if (item.breakdown.strategyScore > 0) {
      lines.push(`  Strategy fit: +${item.breakdown.strategyScore}`);
    }
    if (item.breakdown.utilityScore > 0) {
      lines.push(`  Utility: +${item.breakdown.utilityScore}`);
    }
    if (item.breakdown.economyPenalty > 0) {
      lines.push(`  Penalties: -${item.breakdown.economyPenalty}`);
    }

    lines.push('');
    lines.push('Reasons:');
    for (const reason of item.breakdown.reasons) {
      lines.push(`  - ${reason}`);
    }

    if (item.synergyWith && item.synergyWith.length > 0) {
      lines.push('');
      lines.push(`Synergizes with: ${item.synergyWith.join(', ')}`);
    }

    return lines.join('\n');
  }
}
