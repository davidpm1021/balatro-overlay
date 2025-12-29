import { Injectable, computed, inject, signal } from '@angular/core';
import { SynergyGraphService } from './synergy-graph.service';
import { BuildDetectorService } from './build-detector.service';
import { JokerExplainerService, JokerExplanation } from './joker-explainer.service';
import { GameStateService } from '../../../core/services/game-state.service';
import {
  OverlayGameState,
  ShopItem,
  BlindState,
} from '../../../../../../shared/models/game-state.model';
import { JokerState } from '../../../../../../shared/models/joker.model';
import { DetectedStrategy } from '../../../../../../shared/models/strategy.model';
import jokerDataJson from '../../../data/jokers-complete.json';
import bossDataJson from '../../../data/bosses-complete.json';

export interface ShopRecommendation {
  item: ShopItem;
  score: number;
  reasons: string[];
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  synergiesWithOwned: string[];
}

/**
 * Single reason bullet with category and importance
 */
export interface ReasonBullet {
  category: 'tier' | 'synergy' | 'build_fit' | 'boss_prep' | 'economy' | 'timing' | 'general';
  text: string;
  importance: 'high' | 'medium' | 'low';
}

/**
 * Score breakdown showing contribution of each factor
 */
export interface ScoreBreakdown {
  baseTierScore: number;
  synergyBonus: number;
  antiSynergyPenalty: number;
  buildFitBonus: number;
  bossCounterBonus: number;
  economyPenalty: number;
  lateGameAdjustment: number;
  totalScore: number;
}

/**
 * Build context for the shop item
 */
export interface BuildContext {
  buildType: string;
  buildName: string;
  buildConfidence: number;
  fitsPercentage: number;
  fitDescription: string;
}

/**
 * Detailed analysis of a shop item
 */
export interface ShopItemAnalysis {
  recommendation: 'buy' | 'consider' | 'skip';
  whyBuy: ReasonBullet[];
  whySkip: ReasonBullet[];
  whyConsider: ReasonBullet[];
  scoreBreakdown: ScoreBreakdown;
  buildContext: BuildContext | null;
  jokerExplanation: JokerExplanation | null;
}

/**
 * Enhanced shop recommendation with expanded analysis
 */
export interface EnhancedShopRecommendation extends ShopRecommendation {
  analysis: ShopItemAnalysis;
}

export interface BoosterCardRecommendation {
  cardId: string;
  cardName: string;
  score: number;
  reasons: string[];
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Reroll recommendation for shop
 */
export interface RerollRecommendation {
  shouldReroll: boolean;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

// Interface matching jokers-complete.json structure
interface JokerJsonData {
  id: string;
  name: string;
  rarity: string;
  cost: number;
  effect: string;
  scoringType: string;
  values: {
    chips: number;
    mult: number;
    xmult: number;
    money: number;
    retriggers: number;
  };
  trigger: {
    when: string;
    condition: string;
    scaling: boolean;
    scalingRate: string | null;
  };
  position: {
    sensitive: boolean;
    requirement: string;
    copyable: boolean;
  };
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  tierByAnte: {
    early: 'S' | 'A' | 'B' | 'C' | 'D';
    mid: 'S' | 'A' | 'B' | 'C' | 'D';
    late: 'S' | 'A' | 'B' | 'C' | 'D';
  };
  builds: {
    flush: number;
    pairs: number;
    straights: number;
    face_cards: number;
    xmult_scaling: number;
    retrigger: number;
    economy: number;
  };
  synergies: {
    strong: string[];
    medium: string[];
    antiSynergy: string[];
  };
  bossCounters: string[];
  bossWeaknesses: string[];
  alwaysBuy: boolean;
  trapJoker: boolean;
  // BUG-008: Activation probability for conditional jokers
  // 1.0 = always activates, 0.25 = activates ~25% of hands
  activationProbability?: number;
}

interface BossBlindJsonData {
  id: string;
  name: string;
  ante: number;
  effect: string;
  category: string;
  difficulty: string;
  hardCounters: string[];
  softCounters: string[];
  debuffs: {
    suits: string[];
    ranks: string[];
    cardTypes: string[];
  };
}

// Tier score mappings
const TIER_SCORES: Record<string, number> = {
  'S': 95,
  'A': 80,
  'B': 60,
  'C': 40,
  'D': 20,
  'F': 10,
};

@Injectable({ providedIn: 'root' })
export class ShopAdvisorService {
  private readonly synergyGraph = inject(SynergyGraphService);
  private readonly buildDetector = inject(BuildDetectorService);
  private readonly gameStateService = inject(GameStateService);
  private readonly jokerExplainer = inject(JokerExplainerService);

  private readonly gameState = signal<OverlayGameState | null>(null);

  // Load joker data from JSON
  private readonly jokerData = signal<Map<string, JokerJsonData>>(this.loadJokerData());
  private readonly bossData = signal<Map<string, BossBlindJsonData>>(this.loadBossData());

  // Computed values
  readonly currentAnte = computed(() => this.gameState()?.progress.ante ?? 1);
  readonly currentPhase = computed(() => this.gameState()?.progress.phase ?? 'menu');
  readonly ownedJokers = computed(() => this.gameState()?.jokers ?? []);
  readonly shopItems = computed(() => this.gameState()?.shop?.items ?? []);
  readonly currentBlind = computed(() => this.gameState()?.blind ?? null);
  readonly money = computed(() => this.gameState()?.progress.money ?? 0);

  // Build detection for display
  readonly primaryBuild = computed(() => this.buildDetector.primaryStrategy());
  readonly allBuilds = computed(() => this.buildDetector.detectedStrategies());

  /**
   * Load joker data from JSON file into a map for fast lookup
   */
  private loadJokerData(): Map<string, JokerJsonData> {
    const map = new Map<string, JokerJsonData>();
    const data = jokerDataJson as { jokers: JokerJsonData[] };
    for (const joker of data.jokers) {
      map.set(joker.id, joker);
      // Also map with j_ prefix for compatibility
      map.set(`j_${joker.id}`, joker);
    }
    return map;
  }

  /**
   * Load boss data from JSON file into a map for fast lookup
   */
  private loadBossData(): Map<string, BossBlindJsonData> {
    const map = new Map<string, BossBlindJsonData>();
    const data = bossDataJson as { bossBlinds: BossBlindJsonData[] };
    for (const boss of data.bossBlinds) {
      map.set(boss.id, boss);
      map.set(boss.name.toLowerCase(), boss);
      map.set(boss.name, boss);
    }
    return map;
  }

  /**
   * Get joker data from JSON by ID
   */
  getJokerFromJson(jokerId: string): JokerJsonData | null {
    return this.jokerData().get(jokerId) ?? this.jokerData().get(jokerId.replace('j_', '')) ?? null;
  }

  /**
   * Get boss data from JSON by name or ID
   */
  getBossFromJson(bossNameOrId: string): BossBlindJsonData | null {
    const normalized = bossNameOrId.toLowerCase().replace(/\s+/g, '_');
    return this.bossData().get(bossNameOrId) ??
           this.bossData().get(normalized) ??
           this.bossData().get(bossNameOrId.toLowerCase()) ??
           null;
  }

  /**
   * Update the game state from external source
   */
  updateState(state: OverlayGameState): void {
    this.gameState.set(state);
    // Also update build detector
    this.buildDetector['gameState'].state.set(state);
  }

  /**
   * Get shop recommendations sorted by score
   */
  getShopRecommendations(): ShopRecommendation[] {
    const items = this.shopItems();
    const ante = this.currentAnte();
    const owned = this.ownedJokers();
    const blind = this.currentBlind();
    const money = this.money();
    const build = this.primaryBuild();

    console.log('[ShopAdvisor] === Scoring Context ===');
    console.log('[ShopAdvisor] Ante:', ante);
    console.log('[ShopAdvisor] Money:', money);
    console.log('[ShopAdvisor] Owned Jokers:', owned.map(j => j.name).join(', ') || 'None');
    console.log('[ShopAdvisor] Current/Next Blind:', blind?.name || 'Unknown');
    console.log('[ShopAdvisor] Detected Build:', build ? `${build.type} (${build.confidence}%)` : 'None');
    console.log('[ShopAdvisor] ======================');

    const recommendations = items
      .filter(item => !item.sold)
      .map(item => this.scoreShopItem(item, ante, owned, blind, build, money))
      .sort((a, b) => b.score - a.score);

    console.log('[ShopAdvisor] Final Recommendations:');
    recommendations.forEach(r => {
      console.log(`  ${r.item.name}: ${r.score} (${r.tier}) - ${r.reasons.slice(0, 2).join(', ')}`);
    });

    return recommendations;
  }

  /**
   * Get enhanced shop recommendations with detailed analysis
   * This is the main entry point for the enhanced shop advisor UI
   */
  getEnhancedShopRecommendations(): EnhancedShopRecommendation[] {
    const items = this.shopItems();
    const ante = this.currentAnte();
    const owned = this.ownedJokers();
    const blind = this.currentBlind();
    const money = this.money();
    const build = this.primaryBuild();

    const recommendations = items
      .filter(item => !item.sold)
      .map(item => this.scoreEnhancedShopItem(item, ante, owned, blind, build, money))
      .sort((a, b) => b.score - a.score);

    return recommendations;
  }

  /**
   * Score a shop item with enhanced analysis
   */
  private scoreEnhancedShopItem(
    item: ShopItem,
    ante: number,
    ownedJokers: JokerState[],
    blind: BlindState | null,
    build: DetectedStrategy | null,
    money: number
  ): EnhancedShopRecommendation {
    // Get base recommendation
    const baseRec = this.scoreShopItem(item, ante, ownedJokers, blind, build, money);

    // Calculate score breakdown
    const scoreBreakdown = this.calculateScoreBreakdown(item, ante, ownedJokers, blind, build, money);

    // Get build context
    const buildContext = this.getBuildContext(item, build);

    // Get joker explanation (only for jokers)
    const jokerExplanation = item.type === 'joker'
      ? this.jokerExplainer.getExplanation(item.id)
      : null;

    // Determine recommendation type
    const recommendation = this.getRecommendationType(baseRec.score);

    // Generate reason bullets
    const whyBuy = this.generateWhyBuyBullets(item, scoreBreakdown, build, blind, ownedJokers, ante);
    const whySkip = this.generateWhySkipBullets(item, scoreBreakdown, build, blind, ante, money);
    const whyConsider = this.generateWhyConsiderBullets(item, scoreBreakdown, build);

    const analysis: ShopItemAnalysis = {
      recommendation,
      whyBuy,
      whySkip,
      whyConsider,
      scoreBreakdown,
      buildContext,
      jokerExplanation,
    };

    return {
      ...baseRec,
      analysis,
    };
  }

  /**
   * Calculate score breakdown showing all contributing factors
   */
  private calculateScoreBreakdown(
    item: ShopItem,
    ante: number,
    ownedJokers: JokerState[],
    blind: BlindState | null,
    build: DetectedStrategy | null,
    money: number
  ): ScoreBreakdown {
    if (item.type !== 'joker') {
      // Non-joker items get simplified breakdown
      const baseScore = this.getNonJokerBaseScore(item.type);
      return {
        baseTierScore: baseScore,
        synergyBonus: 0,
        antiSynergyPenalty: 0,
        buildFitBonus: build && build.confidence >= 60 ? 8 : 0,
        bossCounterBonus: 0,
        economyPenalty: this.checkInterestThreshold(item.cost, money),
        lateGameAdjustment: 0,
        totalScore: this.scoreNonJokerItem(item, ante, money, build).score,
      };
    }

    const jokerJson = this.getJokerFromJson(item.id);
    if (!jokerJson) {
      return {
        baseTierScore: 50,
        synergyBonus: 0,
        antiSynergyPenalty: 0,
        buildFitBonus: 0,
        bossCounterBonus: 0,
        economyPenalty: 0,
        lateGameAdjustment: 0,
        totalScore: 50,
      };
    }

    // Calculate individual components
    const phase = this.getAntePhase(ante);
    const tierForPhase = jokerJson.tierByAnte[phase] ?? jokerJson.tier;
    let baseTierScore = TIER_SCORES[tierForPhase] ?? 50;
    if (jokerJson.alwaysBuy) {
      baseTierScore += 10;
    }

    // Synergy calculation
    const { synergyBonus, antiSynergyPenalty } = this.calculateSynergyValues(
      item.id, jokerJson, ownedJokers
    );

    // Build fit bonus
    const buildFitBonus = this.calculateBuildFitValue(jokerJson, build);

    // Boss counter bonus
    const bossCounterBonus = this.calculateBossCounterValue(jokerJson, blind);

    // Economy penalty
    const economyPenalty = this.checkInterestThreshold(item.cost, money);

    // Late game adjustment
    let lateGameAdjustment = 0;
    if (ante >= 6 && jokerJson.scoringType === 'economy') {
      lateGameAdjustment = -Math.min(20, (ante - 5) * 10);
    }
    if (ante >= 6 && jokerJson.scoringType === 'xmult') {
      lateGameAdjustment = 15;
    }

    const totalScore = Math.max(0, Math.min(100, Math.round(
      baseTierScore + synergyBonus - antiSynergyPenalty +
      buildFitBonus + bossCounterBonus - economyPenalty + lateGameAdjustment
    )));

    return {
      baseTierScore,
      synergyBonus,
      antiSynergyPenalty,
      buildFitBonus,
      bossCounterBonus,
      economyPenalty,
      lateGameAdjustment,
      totalScore,
    };
  }

  /**
   * Calculate synergy values separately for breakdown
   */
  private calculateSynergyValues(
    jokerId: string,
    jokerJson: JokerJsonData,
    ownedJokers: JokerState[]
  ): { synergyBonus: number; antiSynergyPenalty: number } {
    if (ownedJokers.length === 0) {
      return { synergyBonus: 0, antiSynergyPenalty: 0 };
    }

    let synergyBonus = 0;
    let antiSynergyPenalty = 0;
    const ownedIds = new Set(ownedJokers.map(j => j.id.replace('j_', '')));

    // Check strong synergies (+15 each)
    for (const strongSynergy of jokerJson.synergies.strong) {
      if (ownedIds.has(strongSynergy) || ownedIds.has(strongSynergy.replace('j_', ''))) {
        synergyBonus += 15;
      }
    }

    // Check medium synergies (+8 each)
    for (const mediumSynergy of jokerJson.synergies.medium) {
      if (ownedIds.has(mediumSynergy) || ownedIds.has(mediumSynergy.replace('j_', ''))) {
        synergyBonus += 8;
      }
    }

    // Check anti-synergies (-10 each)
    for (const antiSynergy of jokerJson.synergies.antiSynergy) {
      if (ownedIds.has(antiSynergy) || ownedIds.has(antiSynergy.replace('j_', ''))) {
        antiSynergyPenalty += 10;
      }
    }

    // Also check synergies from synergy graph service
    const synergies = this.synergyGraph.getSynergies(jokerId);
    for (const synergy of synergies) {
      if (ownedIds.has(synergy.jokerId) || ownedIds.has(synergy.jokerId.replace('j_', ''))) {
        const bonus = synergy.strength === 'strong' ? 15 : synergy.strength === 'medium' ? 8 : 3;
        synergyBonus += bonus;
      }
    }

    // Cap values
    synergyBonus = Math.min(30, synergyBonus);
    antiSynergyPenalty = Math.min(20, antiSynergyPenalty);

    return { synergyBonus, antiSynergyPenalty };
  }

  /**
   * Calculate build fit value separately for breakdown
   * This mirrors the logic in applyBuildFitBonusFromJson
   */
  private calculateBuildFitValue(
    jokerJson: JokerJsonData,
    build: DetectedStrategy | null
  ): number {
    if (!build || build.confidence < 40) return 0;

    const buildTypeMap: Record<string, keyof typeof jokerJson.builds> = {
      'flush': 'flush',
      'pairs': 'pairs',
      'straights': 'straights',
      'straight': 'straights',
      'face_cards': 'face_cards',
      'xmult_scaling': 'xmult_scaling',
      'retrigger': 'retrigger',
      'economy': 'economy',
    };

    const buildKey = buildTypeMap[build.type];
    if (!buildKey) return 0;

    const buildAffinity = jokerJson.builds[buildKey] ?? 0;

    if (build.confidence >= 70) {
      if (buildAffinity >= 70) {
        return Math.round((buildAffinity - 50) * 0.5);
      } else if (buildAffinity <= 30) {
        return -Math.round((30 - buildAffinity) * 0.4);
      }
    } else if (build.confidence >= 50) {
      if (buildAffinity >= 60) {
        return Math.round(buildAffinity * 0.35);
      }
    } else {
      if (buildAffinity >= 80) {
        return Math.round(buildAffinity * 0.25);
      }
    }

    return 0;
  }

  /**
   * Calculate boss counter value separately for breakdown
   */
  private calculateBossCounterValue(
    jokerJson: JokerJsonData,
    blind: BlindState | null
  ): number {
    if (!blind || !blind.isBoss) return 0;

    const bossId = blind.name.toLowerCase().replace(/\s+/g, '_');

    // Check if joker counters this boss (+20)
    if (jokerJson.bossCounters.includes('all') ||
        jokerJson.bossCounters.some(c => bossId.includes(c) || c.includes(bossId.replace('the_', '')))) {
      return 20;
    }

    // Check if joker is weak to this boss (-10)
    if (jokerJson.bossWeaknesses.some(w => bossId.includes(w) || w.includes(bossId.replace('the_', '')))) {
      return -10;
    }

    return 0;
  }

  /**
   * Get base score for non-joker item types
   */
  private getNonJokerBaseScore(type: string): number {
    const scores: Record<string, number> = {
      planet: 62,
      tarot: 58,
      spectral: 70,
      voucher: 72,
      booster: 55,
    };
    return scores[type] ?? 50;
  }

  /**
   * Determine recommendation type based on score
   */
  private getRecommendationType(score: number): 'buy' | 'consider' | 'skip' {
    if (score >= 70) return 'buy';
    if (score >= 50) return 'consider';
    return 'skip';
  }

  /**
   * Get build context for an item
   */
  private getBuildContext(
    item: ShopItem,
    build: DetectedStrategy | null
  ): BuildContext | null {
    if (!build || build.confidence < 50) return null;

    const buildNameMap: Record<string, string> = {
      flush: 'Flush Build',
      pairs: 'Pairs Build',
      straight: 'Straight Build',
      face_cards: 'Face Cards Build',
      xmult_scaling: 'xMult Scaling',
      mult_stacking: 'Mult Stacking',
      fibonacci: 'Fibonacci Build',
      economy: 'Economy Build',
    };

    let fitsPercentage = 0;
    let fitDescription = 'Works with any build';

    if (item.type === 'joker') {
      const jokerJson = this.getJokerFromJson(item.id);
      if (jokerJson) {
        const buildTypeMap: Record<string, keyof typeof jokerJson.builds> = {
          flush: 'flush',
          pairs: 'pairs',
          straights: 'straights',
          straight: 'straights',
          face_cards: 'face_cards',
          xmult_scaling: 'xmult_scaling',
          economy: 'economy',
        };
        const buildKey = buildTypeMap[build.type];
        if (buildKey) {
          fitsPercentage = jokerJson.builds[buildKey];
        }

        if (fitsPercentage >= 70) {
          fitDescription = `Fits your ${build.confidence}% ${build.type.replace('_', ' ')} build`;
        } else if (fitsPercentage >= 40) {
          fitDescription = `Partially fits your ${build.type.replace('_', ' ')} build`;
        } else if (fitsPercentage > 0) {
          fitDescription = `Weak fit for ${build.type.replace('_', ' ')} build`;
        } else {
          fitDescription = `Doesn't fit your ${build.type.replace('_', ' ')} build`;
        }
      }
    }

    return {
      buildType: build.type,
      buildName: buildNameMap[build.type] ?? build.type,
      buildConfidence: build.confidence,
      fitsPercentage,
      fitDescription,
    };
  }

  /**
   * Generate WHY BUY bullet points
   */
  private generateWhyBuyBullets(
    item: ShopItem,
    breakdown: ScoreBreakdown,
    build: DetectedStrategy | null,
    blind: BlindState | null,
    ownedJokers: JokerState[],
    ante: number
  ): ReasonBullet[] {
    const bullets: ReasonBullet[] = [];

    // Tier-based reason
    if (breakdown.baseTierScore >= 85) {
      bullets.push({
        category: 'tier',
        text: 'S-Tier: One of the best jokers in the game',
        importance: 'high',
      });
    } else if (breakdown.baseTierScore >= 70) {
      bullets.push({
        category: 'tier',
        text: 'A-Tier: Strong joker with reliable value',
        importance: 'medium',
      });
    }

    // Build fit reason
    if (build && build.confidence >= 50 && breakdown.buildFitBonus >= 20) {
      bullets.push({
        category: 'build_fit',
        text: `Fits your build: You're ${build.confidence}% ${build.type.replace('_', ' ')}`,
        importance: 'high',
      });
    }

    // Synergy reason
    if (breakdown.synergyBonus >= 15 && item.type === 'joker') {
      const synergies = this.findSynergiesWithOwned(item.id, ownedJokers);
      if (synergies.length > 0) {
        bullets.push({
          category: 'synergy',
          text: `Synergy: Works with your ${synergies[0]}`,
          importance: 'high',
        });
      }
    }

    // Boss preparation
    if (breakdown.bossCounterBonus > 0 && blind?.isBoss) {
      bullets.push({
        category: 'boss_prep',
        text: `Boss prep: Helps vs ${blind.name}`,
        importance: 'high',
      });
    }

    // Late game xMult boost
    if (ante >= 6 && breakdown.lateGameAdjustment > 0) {
      bullets.push({
        category: 'timing',
        text: 'Essential xMult for late game scaling',
        importance: 'high',
      });
    }

    // Always buy jokers
    const jokerJson = item.type === 'joker' ? this.getJokerFromJson(item.id) : null;
    if (jokerJson?.alwaysBuy) {
      bullets.push({
        category: 'general',
        text: 'Always buy: Top-tier value regardless of build',
        importance: 'high',
      });
    }

    return bullets.slice(0, 5);
  }

  /**
   * Generate WHY SKIP bullet points
   */
  private generateWhySkipBullets(
    item: ShopItem,
    breakdown: ScoreBreakdown,
    build: DetectedStrategy | null,
    blind: BlindState | null,
    ante: number,
    money: number
  ): ReasonBullet[] {
    const bullets: ReasonBullet[] = [];

    // Tier-based reason
    if (breakdown.baseTierScore <= 40) {
      bullets.push({
        category: 'tier',
        text: 'Low-tier: Weak effect compared to alternatives',
        importance: 'medium',
      });
    }

    // Build mismatch
    if (build && build.confidence >= 50 && breakdown.buildFitBonus === 0 && item.type === 'joker') {
      bullets.push({
        category: 'build_fit',
        text: `No synergy with your ${build.type.replace('_', ' ')} build`,
        importance: 'medium',
      });
    }

    // Anti-synergy
    if (breakdown.antiSynergyPenalty > 0) {
      bullets.push({
        category: 'synergy',
        text: 'Anti-synergy with your current jokers',
        importance: 'high',
      });
    }

    // Boss weakness
    if (breakdown.bossCounterBonus < 0 && blind?.isBoss) {
      bullets.push({
        category: 'boss_prep',
        text: `Weak vs upcoming boss: ${blind.name}`,
        importance: 'high',
      });
    }

    // Economy warning
    if (breakdown.economyPenalty > 0) {
      const remaining = money - item.cost;
      bullets.push({
        category: 'economy',
        text: `Drops below $25 interest threshold ($${remaining} remaining)`,
        importance: 'medium',
      });
    }

    // Late game economy falloff
    if (ante >= 6 && breakdown.lateGameAdjustment < 0) {
      bullets.push({
        category: 'timing',
        text: 'Economy joker, falls off late game',
        importance: 'medium',
      });
    }

    // Trap joker warning
    const jokerJson = item.type === 'joker' ? this.getJokerFromJson(item.id) : null;
    if (jokerJson?.trapJoker) {
      bullets.push({
        category: 'general',
        text: 'Trap joker: Looks good but underperforms',
        importance: 'high',
      });
    }

    return bullets.slice(0, 5);
  }

  /**
   * Generate WHY CONSIDER bullet points (for mid-tier items)
   */
  private generateWhyConsiderBullets(
    item: ShopItem,
    breakdown: ScoreBreakdown,
    build: DetectedStrategy | null
  ): ReasonBullet[] {
    const bullets: ReasonBullet[] = [];

    // Situational value
    if (breakdown.baseTierScore >= 50 && breakdown.baseTierScore < 70) {
      bullets.push({
        category: 'tier',
        text: 'Solid mid-tier: Good but not essential',
        importance: 'medium',
      });
    }

    // Partial build fit
    if (build && breakdown.buildFitBonus > 0 && breakdown.buildFitBonus < 20) {
      bullets.push({
        category: 'build_fit',
        text: `Partial fit for ${build.type.replace('_', ' ')} build`,
        importance: 'low',
      });
    }

    // Some synergies
    if (breakdown.synergyBonus > 0 && breakdown.synergyBonus < 15) {
      bullets.push({
        category: 'synergy',
        text: 'Weak synergy with owned jokers',
        importance: 'low',
      });
    }

    // General advice
    if (bullets.length === 0) {
      bullets.push({
        category: 'general',
        text: 'Depends on your priorities and current needs',
        importance: 'low',
      });
    }

    return bullets.slice(0, 3);
  }

  /**
   * Score a specific joker by ID with current context
   */
  scoreJoker(jokerId: string): number {
    const jokerJson = this.getJokerFromJson(jokerId);
    if (!jokerJson) return 50; // Default for unknown jokers

    return this.calculateJokerScore(
      jokerId,
      jokerJson,
      this.currentAnte(),
      this.ownedJokers(),
      this.currentBlind(),
      this.primaryBuild(),
      this.money()
    );
  }

  /**
   * Score booster pack contents
   */
  scoreBoosterContents(cards: Array<{ id: string; name: string; type: string }>): BoosterCardRecommendation[] {
    const ante = this.currentAnte();
    const owned = this.ownedJokers();
    const blind = this.currentBlind();
    const build = this.primaryBuild();
    const money = this.money();

    return cards
      .map(card => {
        if (card.type === 'joker') {
          const jokerJson = this.getJokerFromJson(card.id);
          const score = jokerJson
            ? this.calculateJokerScore(card.id, jokerJson, ante, owned, blind, build, money)
            : 50;

          return {
            cardId: card.id,
            cardName: card.name,
            score,
            reasons: this.getJokerReasons(card.id, jokerJson, ante, owned, blind, build, money),
            tier: this.scoreToTier(score),
          };
        }
        return this.scoreConsumable(card, ante);
      })
      .sort((a, b) => b.score - a.score);
  }

  isInBoosterPhase(): boolean {
    return this.currentPhase() === 'booster';
  }

  private scoreShopItem(
    item: ShopItem,
    ante: number,
    ownedJokers: JokerState[],
    blind: BlindState | null,
    build: DetectedStrategy | null,
    money: number
  ): ShopRecommendation {
    if (item.type === 'joker') {
      const jokerJson = this.getJokerFromJson(item.id);
      const score = this.calculateJokerScore(item.id, jokerJson, ante, ownedJokers, blind, build, money, item.cost);
      const reasons = this.getJokerReasons(item.id, jokerJson, ante, ownedJokers, blind, build, money, item.cost);
      const synergies = this.findSynergiesWithOwned(item.id, ownedJokers);

      return {
        item,
        score,
        reasons,
        tier: this.scoreToTier(score),
        synergiesWithOwned: synergies,
      };
    }

    return this.scoreNonJokerItem(item, ante, money, build);
  }

  private calculateJokerScore(
    jokerId: string,
    jokerJson: JokerJsonData | null,
    ante: number,
    ownedJokers: JokerState[],
    blind: BlindState | null,
    build: DetectedStrategy | null,
    money: number,
    cost: number = 0
  ): number {
    if (!jokerJson) {
      return 50; // Default for unknown jokers
    }

    const debugReasons: string[] = [];

    // 1. BASE SCORE from tierByAnte
    const phase = this.getAntePhase(ante);
    const tierForPhase = jokerJson.tierByAnte[phase] ?? jokerJson.tier;
    let score = TIER_SCORES[tierForPhase] ?? 50;
    debugReasons.push(`Base(${tierForPhase}): ${score}`);

    // 1.5 "Always Buy" jokers get a boost (+10)
    if (jokerJson.alwaysBuy) {
      score += 10;
      debugReasons.push('AlwaysBuy+10');
    }

    // 2. SYNERGY BONUS from owned jokers
    score = this.applySynergyBonusFromJson(score, jokerId, jokerJson, ownedJokers, debugReasons);

    // 3. BUILD FIT BONUS
    score = this.applyBuildFitBonusFromJson(score, jokerJson, build, debugReasons);

    // 4. BOSS PREPARATION
    score = this.applyBossPreparationFromJson(score, jokerJson, blind, debugReasons);

    // 5. ECONOMY PENALTY (interest threshold)
    if (cost > 0) {
      const interestPenalty = this.checkInterestThreshold(cost, money);
      if (interestPenalty > 0) {
        score -= interestPenalty;
        debugReasons.push(`Interest-${interestPenalty}`);
      }
    }

    // 6. LATE GAME ADJUSTMENTS for economy jokers
    if (ante >= 6 && jokerJson.scoringType === 'economy') {
      const latePenalty = Math.min(20, (ante - 5) * 10);
      score -= latePenalty;
      debugReasons.push(`LateEcon-${latePenalty}`);
    }

    // 7. LATE GAME BOOST for xMult
    if (ante >= 6 && jokerJson.scoringType === 'xmult') {
      score += 15;
      debugReasons.push('LateXMult+15');
    }

    // 8. BUG-008: ACTIVATION PROBABILITY PENALTY for conditional jokers
    const activationProb = jokerJson.activationProbability ?? 1.0;
    if (activationProb < 1.0) {
      // Penalize conditional jokers - use sqrt to soften the penalty
      // Only apply penalty to the portion above base 50
      const penalty = Math.round((score - 50) * (1 - Math.sqrt(activationProb)));
      if (penalty > 0) {
        score -= penalty;
        debugReasons.push(`CondPenalty-${penalty}(${Math.round(activationProb * 100)}%)`);
      }
    }

    // Clamp to 0-100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    console.log(`[ShopAdvisor] ${jokerId}: ${debugReasons.join(' -> ')} = ${finalScore}`);

    return finalScore;
  }

  private getAntePhase(ante: number): 'early' | 'mid' | 'late' {
    if (ante <= 2) return 'early';
    if (ante <= 4) return 'mid';
    return 'late';
  }

  private applySynergyBonusFromJson(
    score: number,
    jokerId: string,
    jokerJson: JokerJsonData,
    ownedJokers: JokerState[],
    debug: string[]
  ): number {
    if (ownedJokers.length === 0) return score;

    let synergyBonus = 0;
    const ownedIds = new Set(ownedJokers.map(j => j.id.replace('j_', '')));

    // Check strong synergies (+15 each)
    for (const strongSynergy of jokerJson.synergies.strong) {
      if (ownedIds.has(strongSynergy) || ownedIds.has(strongSynergy.replace('j_', ''))) {
        synergyBonus += 15;
      }
    }

    // Check medium synergies (+8 each)
    for (const mediumSynergy of jokerJson.synergies.medium) {
      if (ownedIds.has(mediumSynergy) || ownedIds.has(mediumSynergy.replace('j_', ''))) {
        synergyBonus += 8;
      }
    }

    // Check anti-synergies (-10 each)
    let antiSynergyPenalty = 0;
    for (const antiSynergy of jokerJson.synergies.antiSynergy) {
      if (ownedIds.has(antiSynergy) || ownedIds.has(antiSynergy.replace('j_', ''))) {
        antiSynergyPenalty += 10;
      }
    }

    // Also check synergies from synergy graph service
    const synergies = this.synergyGraph.getSynergies(jokerId);
    for (const synergy of synergies) {
      if (ownedIds.has(synergy.jokerId) || ownedIds.has(synergy.jokerId.replace('j_', ''))) {
        const bonus = synergy.strength === 'strong' ? 15 : synergy.strength === 'medium' ? 8 : 3;
        synergyBonus += bonus;
      }
    }

    // Cap synergy bonus at +30
    synergyBonus = Math.min(30, synergyBonus);
    // Cap anti-synergy penalty at -20
    antiSynergyPenalty = Math.min(20, antiSynergyPenalty);

    if (synergyBonus > 0) {
      debug.push(`Syn+${synergyBonus}`);
    }
    if (antiSynergyPenalty > 0) {
      debug.push(`Anti-${antiSynergyPenalty}`);
    }

    return score + synergyBonus - antiSynergyPenalty;
  }

  private applyBuildFitBonusFromJson(
    score: number,
    jokerJson: JokerJsonData,
    build: DetectedStrategy | null,
    debug: string[]
  ): number {
    if (!build || build.confidence < 40) return score;

    // Map build type to JSON builds field
    const buildTypeMap: Record<string, keyof typeof jokerJson.builds> = {
      'flush': 'flush',
      'pairs': 'pairs',
      'straights': 'straights',
      'straight': 'straights',
      'face_cards': 'face_cards',
      'xmult_scaling': 'xmult_scaling',
      'retrigger': 'retrigger',
      'economy': 'economy',
    };

    const buildKey = buildTypeMap[build.type];
    if (!buildKey) return score;

    const buildAffinity = jokerJson.builds[buildKey] ?? 0;

    // When build is established, weight build fit MUCH more heavily
    // High confidence build (70%+): jokers should primarily be judged by build fit
    // - High affinity (70+): significant bonus
    // - Low affinity (0-30): significant penalty (doesn't fit your build)
    // - Medium affinity (30-70): small adjustment

    if (build.confidence >= 70) {
      // Strong build - build fit matters most
      if (buildAffinity >= 70) {
        const bonus = Math.round((buildAffinity - 50) * 0.5); // +10 to +25
        score += bonus;
        debug.push(`Build+${bonus}`);
      } else if (buildAffinity <= 30) {
        // Penalty for jokers that don't fit the build
        const penalty = Math.round((30 - buildAffinity) * 0.4); // -4 to -12
        score -= penalty;
        debug.push(`NoFit-${penalty}`);
      }
    } else if (build.confidence >= 50) {
      // Medium build - moderate build fit bonus
      if (buildAffinity >= 60) {
        const bonus = Math.round(buildAffinity * 0.35); // up to +35
        score += bonus;
        debug.push(`Build+${bonus}`);
      }
    } else {
      // Weak build - small bonus only for strong fits
      if (buildAffinity >= 80) {
        const bonus = Math.round(buildAffinity * 0.25);
        score += bonus;
        debug.push(`Build+${bonus}`);
      }
    }

    return score;
  }

  private applyBossPreparationFromJson(
    score: number,
    jokerJson: JokerJsonData,
    blind: BlindState | null,
    debug: string[]
  ): number {
    if (!blind || !blind.isBoss) return score;

    const bossId = blind.name.toLowerCase().replace(/\s+/g, '_');

    // Check if joker counters this boss (+20)
    if (jokerJson.bossCounters.includes('all') ||
        jokerJson.bossCounters.some(c => bossId.includes(c) || c.includes(bossId.replace('the_', '')))) {
      score += 20;
      debug.push(`Counters${blind.name}+20`);
    }

    // Check if joker is weak to this boss (-10)
    if (jokerJson.bossWeaknesses.some(w => bossId.includes(w) || w.includes(bossId.replace('the_', '')))) {
      score -= 10;
      debug.push(`WeakTo${blind.name}-10`);
    }

    return score;
  }

  private getJokerReasons(
    jokerId: string,
    jokerJson: JokerJsonData | null,
    ante: number,
    ownedJokers: JokerState[],
    blind: BlindState | null,
    build: DetectedStrategy | null,
    money: number,
    cost: number = 0
  ): string[] {
    const reasons: string[] = [];

    if (!jokerJson) {
      reasons.push('Unknown joker');
      return reasons;
    }

    // Tier
    const phase = this.getAntePhase(ante);
    const tierForPhase = jokerJson.tierByAnte[phase] ?? jokerJson.tier;
    reasons.push(`${tierForPhase}-tier`);

    // Always buy jokers
    if (jokerJson.alwaysBuy) {
      reasons.push('Always buy!');
    }

    // Trap joker warning
    if (jokerJson.trapJoker) {
      reasons.push('Trap - be careful');
    }

    // Ante context
    if (phase === 'late' && jokerJson.scoringType === 'economy') {
      reasons.push('Economy falls off late');
    }
    if (phase === 'late' && jokerJson.scoringType === 'xmult') {
      reasons.push('Essential xMult for late');
    }

    // Build fit
    if (build && build.confidence >= 50) {
      const buildTypeMap: Record<string, keyof typeof jokerJson.builds> = {
        'flush': 'flush',
        'pairs': 'pairs',
        'face_cards': 'face_cards',
      };
      const buildKey = buildTypeMap[build.type];
      if (buildKey && jokerJson.builds[buildKey] >= 70) {
        reasons.push(`Fits ${build.type} build`);
      }
    }

    // Synergies
    const synergies = this.findSynergiesWithOwned(jokerId, ownedJokers);
    if (synergies.length > 0) {
      reasons.push(`Synergy: ${synergies.slice(0, 2).join(', ')}`);
    }

    // Boss awareness
    if (blind?.isBoss) {
      const bossId = blind.name.toLowerCase().replace(/\s+/g, '_');
      if (jokerJson.bossCounters.includes('all') ||
          jokerJson.bossCounters.some(c => bossId.includes(c))) {
        reasons.push(`Counters ${blind.name}`);
      }
      if (jokerJson.bossWeaknesses.some(w => bossId.includes(w))) {
        reasons.push(`Weak vs ${blind.name}`);
      }
    }

    // Interest threshold warning
    if (cost > 0) {
      const remaining = money - cost;
      if (remaining < 25 && remaining >= 0) {
        reasons.push(`Drops below $25 interest threshold`);
      }
    }

    return reasons.slice(0, 4);
  }

  private findSynergiesWithOwned(jokerId: string, ownedJokers: JokerState[]): string[] {
    const ownedIds = new Set(ownedJokers.map(j => j.id));
    const ownedIdsNoPrefix = new Set(ownedJokers.map(j => j.id.replace('j_', '')));
    const synergies = this.synergyGraph.getSynergies(jokerId);

    const matchingNames: string[] = [];

    for (const s of synergies) {
      if (ownedIds.has(s.jokerId) || ownedIdsNoPrefix.has(s.jokerId.replace('j_', ''))) {
        const joker = this.synergyGraph.getJoker(s.jokerId);
        matchingNames.push(joker?.name ?? s.jokerId);
      }
    }

    // Also check JSON synergies
    const jokerJson = this.getJokerFromJson(jokerId);
    if (jokerJson) {
      for (const strongSyn of jokerJson.synergies.strong) {
        if (ownedIdsNoPrefix.has(strongSyn) || ownedIds.has(`j_${strongSyn}`)) {
          const synJoker = this.getJokerFromJson(strongSyn);
          if (synJoker && !matchingNames.includes(synJoker.name)) {
            matchingNames.push(synJoker.name);
          }
        }
      }
    }

    return matchingNames;
  }

  private scoreNonJokerItem(
    item: ShopItem,
    ante: number,
    money: number,
    build: DetectedStrategy | null
  ): ShopRecommendation {
    let score = 50;
    const reasons: string[] = [];

    switch (item.type) {
      case 'planet':
        score = 62;
        reasons.push('Hand level up');
        if (build && build.confidence >= 60) {
          score += 8;
          reasons.push('Supports build');
        }
        break;

      case 'tarot':
        score = 58;
        reasons.push('Card modification');
        if (ante <= 3) {
          score += 5;
          reasons.push('Good for building deck');
        }
        break;

      case 'spectral':
        score = 70;
        reasons.push('Powerful effect');
        break;

      case 'voucher':
        score = 72;
        reasons.push('Permanent upgrade');
        if (ante <= 3) {
          score += 12;
          reasons.push('Early vouchers compound');
        }
        // Check affordability
        if (item.cost > money) {
          score -= 10;
          reasons.push("Can't afford");
        }
        break;

      case 'booster':
        score = 55;
        reasons.push('Options');
        if (item.name.includes('Buffoon')) {
          score += 8;
          reasons.push('Joker pack');
        }
        break;
    }

    // Interest threshold check
    const interestPenalty = this.checkInterestThreshold(item.cost, money);
    if (interestPenalty > 0) {
      score -= interestPenalty;
      reasons.push(`Drops below $25 threshold`);
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
      reasons.push('Levels up hand');
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
    if (score >= 85) return 'S';
    if (score >= 70) return 'A';
    if (score >= 55) return 'B';
    if (score >= 40) return 'C';
    if (score >= 25) return 'D';
    return 'F';
  }

  /**
   * Check if purchase would drop money below interest threshold ($25)
   * Returns penalty points if threshold would be broken
   */
  checkInterestThreshold(cost: number, currentMoney: number): number {
    const INTEREST_THRESHOLD = 25;
    const remaining = currentMoney - cost;

    if (remaining >= INTEREST_THRESHOLD) {
      return 0; // No penalty, still above threshold
    }

    if (remaining < 0) {
      return 10; // Can't afford, max penalty
    }

    // Calculate how far below threshold
    const belowThreshold = INTEREST_THRESHOLD - remaining;
    return Math.min(10, belowThreshold);
  }

  /**
   * BUG-009: Check if an item cost is affordable
   */
  isAffordable(cost: number): boolean {
    return cost <= this.money();
  }

  /**
   * BUG-015: Get recommendation on whether to reroll the shop
   */
  getRerollRecommendation(): RerollRecommendation {
    const currentMoney = this.money();
    const rerollCost = this.gameState()?.shop?.rerollCost ?? 5;
    const recommendations = this.getShopRecommendations();
    const bestScore = recommendations.length > 0 ? recommendations[0].score : 0;

    // Can't afford reroll
    if (currentMoney < rerollCost) {
      return {
        shouldReroll: false,
        reason: `Can't afford reroll ($${rerollCost})`,
        confidence: 'high',
      };
    }

    // Great option available - don't reroll
    if (bestScore >= 75) {
      return {
        shouldReroll: false,
        reason: 'Great option available!',
        confidence: 'high',
      };
    }

    // Would break interest threshold
    const INTEREST_THRESHOLD = 25;
    if (currentMoney >= INTEREST_THRESHOLD && currentMoney - rerollCost < INTEREST_THRESHOLD) {
      return {
        shouldReroll: false,
        reason: 'Reroll would break $25 interest',
        confidence: 'medium',
      };
    }

    // Weak shop and money to spare - recommend reroll
    if (bestScore < 50 && currentMoney > INTEREST_THRESHOLD + rerollCost) {
      return {
        shouldReroll: true,
        reason: `Weak shop (best: ${bestScore}), reroll`,
        confidence: 'high',
      };
    }

    // Good enough option, no need to reroll
    if (bestScore >= 60) {
      return {
        shouldReroll: false,
        reason: 'Good option available',
        confidence: 'medium',
      };
    }

    // Mediocre shop, could go either way
    return {
      shouldReroll: false,
      reason: 'Shop is acceptable',
      confidence: 'low',
    };
  }
}
