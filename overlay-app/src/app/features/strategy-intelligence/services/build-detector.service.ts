/**
 * Build Detector Service
 *
 * Analyzes current game state to detect the player's strategy/build type.
 * Used by shop advisor to recommend items that fit the detected strategy.
 *
 * TODO: Full implementation with deck analysis and hand history
 */

import { Injectable, inject, computed, signal } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import {
  StrategyType,
  DetectedStrategy,
  StrategyAnalysis
} from '../../../../../../shared/models/strategy.model';
import { JokerState } from '../../../../../../shared/models/joker.model';
import { JOKER_DESCRIPTIONS } from '../../joker-display/joker-descriptions';

interface StrategyIndicator {
  type: StrategyType;
  weight: number;
  reason: string;
}

/**
 * Map joker IDs to the strategies they support.
 */
const JOKER_STRATEGY_MAP: Record<string, StrategyType[]> = {
  // Flush strategies
  'j_lusty_joker': ['flush'],
  'j_greedy_joker': ['flush'],
  'j_wrathful_joker': ['flush'],
  'j_gluttonous_joker': ['flush'],
  'j_droll': ['flush'],
  'j_crafty': ['flush'],
  'j_tribe': ['flush'],
  'j_four_fingers': ['flush', 'straight'],
  'j_smeared': ['flush'],
  'j_blackboard': ['flush', 'xmult_scaling'],
  'j_bloodstone': ['flush'],
  'j_rough_gem': ['flush'],
  'j_arrowhead': ['flush'],
  'j_onyx_agate': ['flush'],
  'j_flower_pot': ['flush', 'xmult_scaling'],
  'j_ancient': ['flush'],
  'j_seeing_double': ['flush'],

  // Straight strategies
  'j_crazy': ['straight'],
  'j_devious': ['straight'],
  'j_order': ['straight'],
  'j_runner': ['straight'],
  'j_shortcut': ['straight'],
  'j_superposition': ['straight'],

  // Pair/set strategies
  'j_jolly': ['pairs'],
  'j_sly': ['pairs'],
  'j_duo': ['pairs'],
  'j_trousers': ['pairs'],
  'j_zany': ['pairs'],
  'j_wily': ['pairs'],
  'j_trio': ['pairs'],
  'j_mad': ['pairs'],
  'j_clever': ['pairs'],
  'j_family': ['pairs'],

  // Mult stacking
  'j_joker': ['mult_stacking'],
  'j_abstract': ['mult_stacking'],
  'j_misprint': ['mult_stacking'],
  'j_mystic_summit': ['mult_stacking'],
  'j_scholar': ['mult_stacking'],
  'j_fibonacci': ['mult_stacking', 'fibonacci'],
  'j_even_steven': ['mult_stacking', 'even_steven'],
  'j_odd_todd': ['mult_stacking', 'odd_todd'],
  'j_smiley': ['mult_stacking', 'face_cards'],
  'j_scary_face': ['chip_stacking', 'face_cards'],
  'j_walkie_talkie': ['mult_stacking'],

  // xMult scaling
  'j_cavendish': ['xmult_scaling'],
  'j_photograph': ['xmult_scaling', 'face_cards'],
  'j_baron': ['xmult_scaling', 'face_cards'],
  'j_triboulet': ['xmult_scaling', 'face_cards'],
  'j_loyalty_card': ['xmult_scaling'],
  'j_acrobat': ['xmult_scaling'],
  'j_card_sharp': ['xmult_scaling'],
  'j_constellation': ['xmult_scaling'],
  'j_madness': ['xmult_scaling'],
  'j_vampire': ['xmult_scaling'],
  'j_obelisk': ['xmult_scaling'],
  'j_hologram': ['xmult_scaling'],
  'j_lucky_cat': ['xmult_scaling'],
  'j_glass': ['xmult_scaling', 'glass_cannon'],
  'j_campfire': ['xmult_scaling'],
  'j_throwback': ['xmult_scaling'],

  // Chip stacking
  'j_blue_joker': ['chip_stacking'],
  'j_banner': ['chip_stacking'],
  'j_ice_cream': ['chip_stacking'],
  'j_stone': ['chip_stacking'],
  'j_bull': ['chip_stacking', 'economy'],
  'j_stuntman': ['chip_stacking'],
  'j_wee': ['chip_stacking'],
  'j_hiker': ['chip_stacking'],
  'j_castle': ['chip_stacking'],
  'j_square': ['chip_stacking'],

  // Face cards
  'j_pareidolia': ['face_cards'],
  'j_business': ['face_cards', 'economy'],
  'j_sock_and_buskin': ['face_cards', 'retrigger'],
  'j_reserved_parking': ['face_cards', 'economy'],
  'j_faceless': ['face_cards', 'economy'],
  'j_shoot_the_moon': ['face_cards'],
  'j_midas_mask': ['face_cards', 'economy'],

  // Retrigger
  'j_mime': ['retrigger'],
  'j_dusk': ['retrigger'],
  'j_hanging_chad': ['retrigger'],
  'j_hack': ['retrigger'],
  'j_seltzer': ['retrigger'],

  // Steel scaling
  'j_steel_joker': ['steel_scaling'],

  // Economy
  'j_golden': ['economy'],
  'j_to_the_moon': ['economy'],
  'j_cloud_9': ['economy'],
  'j_rocket': ['economy'],
  'j_delayed_grat': ['economy'],
  'j_egg': ['economy'],
  'j_gift': ['economy'],
  'j_matador': ['economy'],
  'j_satellite': ['economy'],
  'j_trading': ['economy'],
  'j_mail': ['economy'],
  'j_chaos': ['economy'],
  'j_credit_card': ['economy'],
  'j_bootstraps': ['economy', 'mult_stacking'],

  // Special
  'j_ride_the_bus': ['mult_stacking'],
  'j_green_joker': ['mult_stacking'],
  'j_red_card': ['mult_stacking'],
  'j_fortune_teller': ['mult_stacking'],
  'j_flash': ['mult_stacking'],
  'j_supernova': ['mult_stacking'],
  'j_gros_michel': ['mult_stacking'],
  'j_popcorn': ['mult_stacking'],
  'j_erosion': ['mult_stacking'],
  'j_swashbuckler': ['mult_stacking'],
  'j_half': ['mult_stacking', 'fibonacci'],
  'j_raised_fist': ['mult_stacking'],
  'j_stencil': ['xmult_scaling'],

  // Legendary
  'j_canio': ['face_cards', 'xmult_scaling'],
  'j_chicot': ['hybrid'],
  'j_perkeo': ['hybrid'],
  'j_yorick': ['xmult_scaling']
};

@Injectable({ providedIn: 'root' })
export class BuildDetectorService {
  private readonly gameState = inject(GameStateService);

  /**
   * Detected strategies sorted by confidence.
   */
  readonly detectedStrategies = computed(() => this.analyzeStrategies());

  /**
   * Primary detected strategy (highest confidence).
   */
  readonly primaryStrategy = computed(() => {
    const strategies = this.detectedStrategies();
    return strategies.length > 0 ? strategies[0] : null;
  });

  /**
   * Analyze current game state and detect likely strategies.
   */
  private analyzeStrategies(): DetectedStrategy[] {
    const jokers = this.gameState.jokers();
    const indicators = this.collectIndicators(jokers);
    const strategies = this.aggregateIndicators(indicators);

    return strategies
      .filter(s => s.confidence > 10) // Filter out very weak signals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Top 3 strategies
  }

  /**
   * Collect strategy indicators from owned jokers.
   */
  private collectIndicators(jokers: JokerState[]): StrategyIndicator[] {
    const indicators: StrategyIndicator[] = [];

    for (const joker of jokers) {
      const strategies = JOKER_STRATEGY_MAP[joker.id];
      if (strategies) {
        for (const strategy of strategies) {
          indicators.push({
            type: strategy,
            weight: this.getJokerWeight(joker),
            reason: `Has ${joker.name}`
          });
        }
      }
    }

    return indicators;
  }

  /**
   * Get weight for a joker based on rarity and scaling.
   */
  private getJokerWeight(joker: JokerState): number {
    let weight = 10;

    // Rarity bonus
    switch (joker.rarity) {
      case 'uncommon': weight += 5; break;
      case 'rare': weight += 10; break;
      case 'legendary': weight += 20; break;
    }

    // Scaling jokers are more important to the build
    if (joker.isScaling) {
      weight += 15;
      // High scaling value means heavily invested
      if (joker.scalingValue && joker.scalingValue > 20) {
        weight += 10;
      }
    }

    return weight;
  }

  /**
   * Aggregate indicators into strategy scores.
   */
  private aggregateIndicators(indicators: StrategyIndicator[]): DetectedStrategy[] {
    const strategyScores = new Map<StrategyType, { score: number; reasons: string[] }>();

    for (const indicator of indicators) {
      const existing = strategyScores.get(indicator.type) ?? { score: 0, reasons: [] };
      existing.score += indicator.weight;
      existing.reasons.push(indicator.reason);
      strategyScores.set(indicator.type, existing);
    }

    const strategies: DetectedStrategy[] = [];
    const maxScore = Math.max(...Array.from(strategyScores.values()).map(s => s.score), 1);

    for (const [type, data] of strategyScores) {
      const confidence = Math.min(100, Math.round((data.score / maxScore) * 100));
      strategies.push({
        type,
        confidence,
        viability: this.calculateViability(type, data.score),
        requirements: this.getRequirements(type),
        currentStrength: Math.min(100, data.score)
      });
    }

    return strategies;
  }

  /**
   * Calculate how viable a strategy is for winning.
   */
  private calculateViability(type: StrategyType, score: number): number {
    // Base viability from strategy type
    const baseViability: Record<StrategyType, number> = {
      flush: 70,
      straight: 60,
      pairs: 75,
      mult_stacking: 65,
      xmult_scaling: 85,
      chip_stacking: 50,
      fibonacci: 55,
      even_steven: 45,
      odd_todd: 45,
      face_cards: 70,
      steel_scaling: 75,
      glass_cannon: 60,
      retrigger: 80,
      economy: 40, // Economy alone won't win
      hybrid: 60
    };

    // Adjust based on how built-out it is
    const buildBonus = Math.min(20, score / 5);
    return Math.min(100, baseViability[type] + buildBonus);
  }

  /**
   * Get requirements for fully building a strategy.
   */
  private getRequirements(type: StrategyType): string[] {
    const requirements: Record<StrategyType, string[]> = {
      flush: ['Focus deck on one suit', 'Get flush-supporting jokers'],
      straight: ['Maintain rank variety', 'Consider Four Fingers or Shortcut'],
      pairs: ['Keep rank duplicates', 'Level up Two Pair / Full House'],
      mult_stacking: ['Collect +Mult jokers', 'Avoid weak chip-only jokers'],
      xmult_scaling: ['Prioritize xMult jokers', 'Build consistent triggers'],
      chip_stacking: ['Get high-chip jokers', 'Consider Blue Joker with large deck'],
      fibonacci: ['Keep A, 2, 3, 5, 8 cards', 'Remove other ranks'],
      even_steven: ['Keep 2, 4, 6, 8, 10 cards', 'Remove odd cards'],
      odd_todd: ['Keep A, 3, 5, 7, 9 cards', 'Remove even cards'],
      face_cards: ['Keep face cards', 'Get face card jokers'],
      steel_scaling: ['Add Steel cards', 'Protect Steel cards'],
      glass_cannon: ['Add Glass cards', 'High risk, high reward'],
      retrigger: ['Get retrigger jokers', 'Build around specific cards'],
      economy: ['Focus on money generation', 'Convert money to power later'],
      hybrid: ['Balance multiple synergies', 'Flexible approach']
    };

    return requirements[type];
  }

  /**
   * Get jokers that would help a specific strategy.
   */
  getJokersForStrategy(strategy: StrategyType): string[] {
    const jokers: string[] = [];

    for (const [jokerId, strategies] of Object.entries(JOKER_STRATEGY_MAP)) {
      if (strategies.includes(strategy)) {
        jokers.push(jokerId);
      }
    }

    return jokers;
  }

  /**
   * Check if a joker fits the detected strategy.
   */
  jokerFitsStrategy(jokerId: string, strategy?: StrategyType): boolean {
    const targetStrategy = strategy ?? this.primaryStrategy()?.type;
    if (!targetStrategy) return false;

    const jokerStrategies = JOKER_STRATEGY_MAP[jokerId];
    return jokerStrategies?.includes(targetStrategy) ?? false;
  }

  /**
   * Get strategy bonus for a joker (0-30 points).
   */
  getStrategyBonus(jokerId: string): number {
    const primary = this.primaryStrategy();
    if (!primary) return 0;

    const jokerStrategies = JOKER_STRATEGY_MAP[jokerId];
    if (!jokerStrategies) return 0;

    // Primary strategy match
    if (jokerStrategies.includes(primary.type)) {
      return 25 + Math.round(primary.confidence / 10);
    }

    // Check secondary strategies
    const detected = this.detectedStrategies();
    for (const strat of detected.slice(1)) {
      if (jokerStrategies.includes(strat.type)) {
        return 15 + Math.round(strat.confidence / 20);
      }
    }

    return 0;
  }
}
