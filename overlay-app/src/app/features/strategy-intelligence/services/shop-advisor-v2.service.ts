import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GameStateService } from '../../../core/services/game-state.service';
import { BuildDetectorService } from './build-detector.service';
import { JokerState } from '../../../../../../shared/models/joker.model';
import { ShopItem } from '../../../../../../shared/models/game-state.model';

// ============================================================================
// Data Types from JSON files
// ============================================================================

interface JokerData {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
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
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  tierByAnte: {
    early: 'S' | 'A' | 'B' | 'C' | 'D';
    mid: 'S' | 'A' | 'B' | 'C' | 'D';
    late: 'S' | 'A' | 'B' | 'C' | 'D';
  };
  builds: Record<string, number>;
  synergies: {
    strong: string[];
    medium: string[];
    antiSynergy: string[];
  };
  bossCounters: string[];
  bossWeaknesses: string[];
  alwaysBuy: boolean;
  trapJoker: boolean;
  position?: {
    sensitive: boolean;
    requirement: string;
    copyable: boolean;
  };
}

interface BossData {
  id: string;
  name: string;
  ante: number;
  effect: string;
  category: string;
  difficulty: string;
  hardCounters: string[];
  softCounters: string[];
  synergisticJokers: string[];
}

interface JokersDataFile {
  version: string;
  jokers: JokerData[];
}

interface BossesDataFile {
  version: string;
  bossBlinds: BossData[];
  bossBlindsByAnte: Record<string, string[]>;
}

// ============================================================================
// Output Types
// ============================================================================

export interface ScoredJoker {
  joker: JokerData;
  score: number;
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  reasoning: string;
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  baseScore: number;
  synergyBonus: number;
  buildFitBonus: number;
  anteAdjustment: number;
  bossPreparation: number;
  economyPenalty: number;
  specialCase?: string;
}

export interface ShopRecommendationV2 {
  item: ShopItem;
  score: number;
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  reasoning: string;
  breakdown: ScoreBreakdown;
  synergiesWithOwned: string[];
}

type GamePhase = 'early' | 'mid' | 'late';

// ============================================================================
// Constants
// ============================================================================

const TIER_SCORES: Record<string, number> = {
  S: 95,
  A: 80,
  B: 60,
  C: 40,
  D: 20,
};

const SYNERGY_BONUS = {
  strong: 15,
  medium: 8,
  antiSynergy: -10,
};

const BUILD_FIT_MULTIPLIER = 0.3;

const ECONOMY_ANTE_ADJUSTMENT = {
  early: 20,  // Ante 1-2: economy jokers get +20
  late: -30,  // Ante 6+: economy jokers get -30
};

const INTEREST_THRESHOLD = 25;

// Gros Michel special scoring by ante
const GROS_MICHEL_SCORES: Record<number, number> = {
  1: 85,
  2: 80,
  3: 70,
  4: 55,
  5: 40,
};

// ============================================================================
// Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class ShopAdvisorV2Service {
  private readonly http = inject(HttpClient);
  private readonly gameState = inject(GameStateService);
  private readonly buildDetector = inject(BuildDetectorService);

  // Data signals
  private readonly jokersData = signal<Map<string, JokerData>>(new Map());
  private readonly bossesData = signal<Map<string, BossData>>(new Map());
  private readonly bossesByAnte = signal<Record<string, string[]>>({});
  private readonly dataLoaded = signal(false);

  // Game state computed
  private readonly currentAnte = computed(() => this.gameState.state()?.progress.ante ?? 1);
  private readonly currentMoney = computed(() => this.gameState.state()?.progress.money ?? 0);
  private readonly ownedJokers = computed(() => this.gameState.jokers());
  private readonly shopItems = computed(() => this.gameState.state()?.shop?.items ?? []);
  private readonly upcomingBoss = computed(() => this.gameState.blind()?.name ?? null);

  // Current game phase
  readonly gamePhase = computed<GamePhase>(() => {
    const ante = this.currentAnte();
    if (ante <= 2) return 'early';
    if (ante <= 5) return 'mid';
    return 'late';
  });

  // Detected build for build fit bonus
  private readonly detectedBuild = computed(() => {
    const primary = this.buildDetector.primaryStrategy();
    return primary?.type ?? null;
  });

  constructor() {
    this.loadData();
  }

  // ============================================================================
  // Data Loading
  // ============================================================================

  private async loadData(): Promise<void> {
    try {
      const [jokersResponse, bossesResponse] = await Promise.all([
        this.http.get<JokersDataFile>('/assets/data/jokers-complete.json').toPromise(),
        this.http.get<BossesDataFile>('/assets/data/bosses-complete.json').toPromise(),
      ]);

      if (jokersResponse) {
        const jokerMap = new Map<string, JokerData>();
        for (const joker of jokersResponse.jokers) {
          jokerMap.set(joker.id, joker);
        }
        this.jokersData.set(jokerMap);
      }

      if (bossesResponse) {
        const bossMap = new Map<string, BossData>();
        for (const boss of bossesResponse.bossBlinds) {
          bossMap.set(boss.id, boss);
        }
        this.bossesData.set(bossMap);
        this.bossesByAnte.set(bossesResponse.bossBlindsByAnte);
      }

      this.dataLoaded.set(true);
    } catch (error) {
      console.error('Failed to load shop advisor data:', error);
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get shop recommendations sorted by score
   */
  getShopRecommendations(): ShopRecommendationV2[] {
    if (!this.dataLoaded()) return [];

    const items = this.shopItems();
    const owned = this.ownedJokers();

    return items
      .filter(item => !item.sold && item.type === 'joker')
      .map(item => this.scoreShopItem(item, owned))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Score a specific joker by ID
   */
  scoreJokerById(jokerId: string): ScoredJoker | null {
    const jokerData = this.jokersData().get(jokerId);
    if (!jokerData) return null;

    return this.scoreJoker(jokerData, this.ownedJokers());
  }

  /**
   * Get all scored jokers from data (for tier list display)
   */
  getAllScoredJokers(): ScoredJoker[] {
    if (!this.dataLoaded()) return [];

    const owned = this.ownedJokers();
    return Array.from(this.jokersData().values())
      .map(joker => this.scoreJoker(joker, owned))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Check if data is loaded
   */
  isReady(): boolean {
    return this.dataLoaded();
  }

  // ============================================================================
  // Scoring Logic
  // ============================================================================

  private scoreShopItem(item: ShopItem, ownedJokers: JokerState[]): ShopRecommendationV2 {
    const jokerData = this.jokersData().get(item.id);

    if (!jokerData) {
      // Unknown joker - return neutral score
      return {
        item,
        score: 50,
        tier: 'C',
        reasoning: `${item.name}: 50 — Unknown joker`,
        breakdown: {
          baseScore: 50,
          synergyBonus: 0,
          buildFitBonus: 0,
          anteAdjustment: 0,
          bossPreparation: 0,
          economyPenalty: 0,
        },
        synergiesWithOwned: [],
      };
    }

    const scored = this.scoreJoker(jokerData, ownedJokers);
    const synergies = this.findSynergiesWithOwned(jokerData, ownedJokers);

    return {
      item,
      score: scored.score,
      tier: scored.tier,
      reasoning: scored.reasoning,
      breakdown: scored.breakdown,
      synergiesWithOwned: synergies,
    };
  }

  private scoreJoker(joker: JokerData, ownedJokers: JokerState[]): ScoredJoker {
    const ante = this.currentAnte();
    const phase = this.gamePhase();
    const money = this.currentMoney();
    const build = this.detectedBuild();
    const boss = this.upcomingBoss();

    // Check for special cases first
    if (joker.id === 'gros_michel') {
      return this.scoreGrosMichel(joker, ante, ownedJokers);
    }

    if (joker.id === 'blueprint') {
      return this.scoreBlueprint(joker, ownedJokers);
    }

    // Standard scoring
    const breakdown = this.calculateBreakdown(joker, phase, ownedJokers, build, boss, money);
    const totalScore = this.calculateTotalScore(breakdown);
    const clampedScore = Math.max(0, Math.min(100, Math.round(totalScore)));

    return {
      joker,
      score: clampedScore,
      tier: this.scoreToTier(clampedScore),
      reasoning: this.buildReasoningString(joker, clampedScore, breakdown, ownedJokers, boss),
      breakdown,
    };
  }

  private calculateBreakdown(
    joker: JokerData,
    phase: GamePhase,
    ownedJokers: JokerState[],
    detectedBuild: string | null,
    upcomingBoss: string | null,
    currentMoney: number
  ): ScoreBreakdown {
    // 1. Base score from tier
    const tierForPhase = joker.tierByAnte[phase];
    const baseScore = TIER_SCORES[tierForPhase] ?? 50;

    // 2. Synergy bonus
    const synergyBonus = this.calculateSynergyBonus(joker, ownedJokers);

    // 3. Build fit bonus
    const buildFitBonus = this.calculateBuildFitBonus(joker, detectedBuild);

    // 4. Ante adjustment for economy jokers
    const anteAdjustment = this.calculateAnteAdjustment(joker, phase);

    // 5. Boss preparation bonus
    const bossPreparation = this.calculateBossPreparation(joker, upcomingBoss);

    // 6. Economy penalty (if buying drops below $25 interest threshold)
    const economyPenalty = this.calculateEconomyPenalty(joker, currentMoney);

    return {
      baseScore,
      synergyBonus,
      buildFitBonus,
      anteAdjustment,
      bossPreparation,
      economyPenalty,
    };
  }

  private calculateTotalScore(breakdown: ScoreBreakdown): number {
    return (
      breakdown.baseScore +
      breakdown.synergyBonus +
      breakdown.buildFitBonus +
      breakdown.anteAdjustment +
      breakdown.bossPreparation -
      breakdown.economyPenalty
    );
  }

  // ============================================================================
  // Bonus Calculations
  // ============================================================================

  private calculateSynergyBonus(joker: JokerData, ownedJokers: JokerState[]): number {
    const ownedIds = new Set(ownedJokers.map(j => j.id));
    let bonus = 0;

    // Strong synergies
    for (const synergyId of joker.synergies.strong) {
      if (ownedIds.has(synergyId)) {
        bonus += SYNERGY_BONUS.strong;
      }
    }

    // Medium synergies
    for (const synergyId of joker.synergies.medium) {
      if (ownedIds.has(synergyId)) {
        bonus += SYNERGY_BONUS.medium;
      }
    }

    // Anti-synergies
    for (const antiId of joker.synergies.antiSynergy) {
      if (ownedIds.has(antiId)) {
        bonus += SYNERGY_BONUS.antiSynergy;
      }
    }

    // Cap synergy bonus at 30
    return Math.min(30, Math.max(-20, bonus));
  }

  private calculateBuildFitBonus(joker: JokerData, detectedBuild: string | null): number {
    if (!detectedBuild) return 0;

    // Map strategy types to build keys
    const buildKey = this.mapStrategyToBuildKey(detectedBuild);
    if (!buildKey) return 0;

    const buildAffinity = joker.builds[buildKey] ?? 0;
    return Math.round(buildAffinity * BUILD_FIT_MULTIPLIER);
  }

  private mapStrategyToBuildKey(strategy: string): string | null {
    const mapping: Record<string, string> = {
      flush: 'flush',
      pairs: 'pairs',
      straight: 'straights',
      face_cards: 'face_cards',
      xmult_scaling: 'xmult_scaling',
      retrigger: 'retrigger',
      economy: 'economy',
      mult_stacking: 'xmult_scaling',
      chip_stacking: 'flush',
    };
    return mapping[strategy] ?? null;
  }

  private calculateAnteAdjustment(joker: JokerData, phase: GamePhase): number {
    // Check if this is an economy joker
    const isEconomyJoker =
      joker.scoringType === 'money' ||
      joker.values.money > 0 ||
      (joker.builds.economy ?? 0) >= 70;

    if (!isEconomyJoker) return 0;

    if (phase === 'early') {
      return ECONOMY_ANTE_ADJUSTMENT.early;
    } else if (phase === 'late') {
      return ECONOMY_ANTE_ADJUSTMENT.late;
    }

    return 0;
  }

  private calculateBossPreparation(joker: JokerData, upcomingBoss: string | null): number {
    if (!upcomingBoss) return 0;

    // Normalize boss name to ID format
    const bossId = upcomingBoss.toLowerCase().replace(/ /g, '_');

    // Check if this joker counters the upcoming boss
    if (joker.bossCounters.includes(bossId)) {
      return 15;
    }

    // Check boss data for soft counters
    const bossData = this.bossesData().get(bossId);
    if (bossData) {
      if (bossData.hardCounters.includes(joker.id)) {
        return 20;
      }
      if (bossData.synergisticJokers.includes(joker.id)) {
        return 10;
      }
    }

    // Check if joker is weak to this boss
    if (joker.bossWeaknesses.includes(bossId)) {
      return -10;
    }

    return 0;
  }

  private calculateEconomyPenalty(joker: JokerData, currentMoney: number): number {
    const costAfterBuy = currentMoney - joker.cost;

    // Penalty if buying drops us below $25 interest threshold
    if (currentMoney >= INTEREST_THRESHOLD && costAfterBuy < INTEREST_THRESHOLD) {
      const dollarsBelow = INTEREST_THRESHOLD - costAfterBuy;
      // $1 penalty per dollar below threshold, max 10
      return Math.min(10, dollarsBelow);
    }

    return 0;
  }

  // ============================================================================
  // Special Cases
  // ============================================================================

  private scoreGrosMichel(joker: JokerData, ante: number, ownedJokers: JokerState[]): ScoredJoker {
    // Gros Michel has fixed scores by ante
    const baseScore = GROS_MICHEL_SCORES[Math.min(ante, 5)] ?? 40;

    // Still add synergy bonus
    const synergyBonus = this.calculateSynergyBonus(joker, ownedJokers);

    const totalScore = Math.max(0, Math.min(100, baseScore + synergyBonus));

    const breakdown: ScoreBreakdown = {
      baseScore,
      synergyBonus,
      buildFitBonus: 0,
      anteAdjustment: 0,
      bossPreparation: 0,
      economyPenalty: 0,
      specialCase: `Gros Michel ante ${ante} scoring`,
    };

    const synergiesFound = this.findSynergiesWithOwned(joker, ownedJokers);
    let reasoning = `${joker.name}: ${totalScore} — Ante ${ante} value`;
    if (synergiesFound.length > 0) {
      reasoning += `, +${synergyBonus} ${synergiesFound[0]} synergy`;
    }
    if (ante >= 4) {
      reasoning += `, high destruction risk`;
    }

    return {
      joker,
      score: totalScore,
      tier: this.scoreToTier(totalScore),
      reasoning,
      breakdown,
    };
  }

  private scoreBlueprint(joker: JokerData, ownedJokers: JokerState[]): ScoredJoker {
    // Blueprint's value depends on what's to its right
    // We approximate by looking at the best copyable joker owned

    let bestCopyScore = 0;
    let bestCopyName = '';

    for (const owned of ownedJokers) {
      const ownedData = this.jokersData().get(owned.id);
      if (!ownedData) continue;

      // Check if copyable
      if (ownedData.position?.copyable === false) continue;

      // Get the joker's base score
      const phase = this.gamePhase();
      const tierScore = TIER_SCORES[ownedData.tierByAnte[phase]] ?? 50;

      if (tierScore > bestCopyScore) {
        bestCopyScore = tierScore;
        bestCopyName = ownedData.name;
      }
    }

    // Blueprint base value + value from best copy target
    const baseScore = 70; // Blueprint has inherent value
    const copyBonus = bestCopyScore > 0 ? Math.round((bestCopyScore - 50) * 0.5) : 0;
    const synergyBonus = this.calculateSynergyBonus(joker, ownedJokers);

    const totalScore = Math.max(0, Math.min(100, baseScore + copyBonus + synergyBonus));

    const breakdown: ScoreBreakdown = {
      baseScore,
      synergyBonus: synergyBonus + copyBonus,
      buildFitBonus: 0,
      anteAdjustment: 0,
      bossPreparation: 0,
      economyPenalty: 0,
      specialCase: bestCopyName ? `Copies ${bestCopyName}` : 'No copy target',
    };

    let reasoning = `${joker.name}: ${totalScore} — S-tier copy joker`;
    if (bestCopyName) {
      reasoning += `, copies ${bestCopyName}`;
    } else if (ownedJokers.length === 0) {
      reasoning += `, no jokers to copy yet`;
    }

    return {
      joker,
      score: totalScore,
      tier: this.scoreToTier(totalScore),
      reasoning,
      breakdown,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private findSynergiesWithOwned(joker: JokerData, ownedJokers: JokerState[]): string[] {
    const ownedIds = new Set(ownedJokers.map(j => j.id));
    const synergies: string[] = [];

    for (const synergyId of joker.synergies.strong) {
      if (ownedIds.has(synergyId)) {
        const synergyData = this.jokersData().get(synergyId);
        synergies.push(synergyData?.name ?? synergyId);
      }
    }

    for (const synergyId of joker.synergies.medium) {
      if (ownedIds.has(synergyId)) {
        const synergyData = this.jokersData().get(synergyId);
        synergies.push(synergyData?.name ?? synergyId);
      }
    }

    return synergies;
  }

  private buildReasoningString(
    joker: JokerData,
    score: number,
    breakdown: ScoreBreakdown,
    ownedJokers: JokerState[],
    upcomingBoss: string | null
  ): string {
    const parts: string[] = [];

    // Tier
    const phase = this.gamePhase();
    const tier = joker.tierByAnte[phase];
    parts.push(`${tier}-tier`);

    // Synergies
    if (breakdown.synergyBonus > 0) {
      const synergies = this.findSynergiesWithOwned(joker, ownedJokers);
      if (synergies.length > 0) {
        parts.push(`+${breakdown.synergyBonus} ${synergies[0]} synergy`);
      }
    } else if (breakdown.synergyBonus < 0) {
      parts.push(`anti-synergy penalty`);
    }

    // Build fit
    if (breakdown.buildFitBonus > 0) {
      const build = this.detectedBuild();
      parts.push(`+${breakdown.buildFitBonus} ${build} fit`);
    }

    // Ante adjustment
    if (breakdown.anteAdjustment > 0) {
      parts.push(`early game economy`);
    } else if (breakdown.anteAdjustment < 0) {
      parts.push(`late game economy penalty`);
    }

    // Boss counter
    if (breakdown.bossPreparation > 0 && upcomingBoss) {
      parts.push(`counters ${upcomingBoss}`);
    } else if (breakdown.bossPreparation < 0 && upcomingBoss) {
      parts.push(`weak vs ${upcomingBoss}`);
    }

    // Economy penalty
    if (breakdown.economyPenalty > 0) {
      parts.push(`breaks interest`);
    }

    return `${joker.name}: ${score} — ${parts.join(', ')}`;
  }

  private scoreToTier(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'S';
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    if (score >= 45) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  // ============================================================================
  // Direct Data Access
  // ============================================================================

  /**
   * Get joker data by ID
   */
  getJokerData(id: string): JokerData | undefined {
    return this.jokersData().get(id);
  }

  /**
   * Get boss data by ID
   */
  getBossData(id: string): BossData | undefined {
    return this.bossesData().get(id);
  }

  /**
   * Get possible bosses for an ante
   */
  getPossibleBosses(ante: number): BossData[] {
    const bossIds = this.bossesByAnte()[String(ante)] ?? [];
    return bossIds
      .map(id => this.bossesData().get(id))
      .filter((b): b is BossData => b !== undefined);
  }
}
