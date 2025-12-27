import { Injectable, inject, computed, signal } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { DetectedStrategy, StrategyType } from '../../../../../../shared/models';
import { Card, Suit, Rank } from '../../../../../../shared/models';
import { JokerState } from '../../../../../../shared/models';
import { HandLevel, HandType } from '../../../../../../shared/models';

/**
 * Build affinity from jokers-complete.json
 */
interface JokerBuildAffinity {
  id: string;
  name: string;
  builds: Partial<Record<StrategyType, number>>; // 0-100 affinity per build
  wantsSuits?: Suit[];
  wantsRanks?: Rank[];
}

/**
 * Loaded joker data structure
 */
interface JokersCompleteData {
  jokers: Array<{
    id: string;
    name: string;
    strategies?: Array<{ strategy: StrategyType; affinity: number }>;
    builds?: Partial<Record<StrategyType, number>>;
    wantsSuits?: Suit[];
    wantsRanks?: Rank[];
  }>;
}

/**
 * Build detection result with hybrid support
 */
export interface BuildDetectionResult {
  primary: DetectedStrategy;
  secondary: DetectedStrategy | null;
  isHybrid: boolean;
  hybridLabel: string | null; // e.g., "Flush/Sets Hybrid"
  allBuilds: DetectedStrategy[];
}

/**
 * Signal breakdown for transparency
 */
interface SignalBreakdown {
  jokerSignal: number;
  deckSignal: number;
  handLevelSignal: number;
  combined: number;
}

// Hand types that contribute to "sets" builds
const SETS_HAND_TYPES: HandType[] = ['three_of_a_kind', 'four_of_a_kind', 'full_house', 'five_of_a_kind'];

// Hand types that contribute to "pairs" builds
const PAIRS_HAND_TYPES: HandType[] = ['pair', 'two_pair', 'full_house'];

// Hand types that contribute to "flush" builds
const FLUSH_HAND_TYPES: HandType[] = ['flush', 'straight_flush', 'flush_house', 'flush_five'];

// Hand types that contribute to "straight" builds
const STRAIGHT_HAND_TYPES: HandType[] = ['straight', 'straight_flush'];

// Display names for strategies
const STRATEGY_DISPLAY_NAMES: Record<StrategyType, string> = {
  flush: 'Flush',
  straight: 'Straight',
  pairs: 'Sets', // Rename to "Sets" for clarity
  mult_stacking: 'Mult Stack',
  xmult_scaling: 'xMult Scale',
  chip_stacking: 'Chip Stack',
  fibonacci: 'Fibonacci',
  even_steven: 'Even Steven',
  odd_todd: 'Odd Todd',
  face_cards: 'Face Cards',
  steel_scaling: 'Steel',
  glass_cannon: 'Glass Cannon',
  retrigger: 'Retrigger',
  economy: 'Economy',
  hybrid: 'Hybrid',
};

@Injectable({ providedIn: 'root' })
export class BuildDetectorV2Service {
  private gameState = inject(GameStateService);

  // Loaded joker data - will be populated from JSON
  private jokerData = signal<Map<string, JokerBuildAffinity>>(new Map());
  private dataLoaded = signal(false);

  constructor() {
    this.loadJokerData();
  }

  /**
   * Load joker build affinities from JSON
   */
  private async loadJokerData(): Promise<void> {
    try {
      // Try to load jokers-complete.json first
      const response = await fetch('/assets/data/jokers-complete.json');
      if (response.ok) {
        const data: JokersCompleteData = await response.json();
        this.parseJokerData(data);
      } else {
        // Fallback to joker-synergies.json
        const fallbackResponse = await fetch('/assets/data/joker-synergies.json');
        if (fallbackResponse.ok) {
          const data: JokersCompleteData = await fallbackResponse.json();
          this.parseJokerData(data);
        }
      }
    } catch (error) {
      console.warn('[BuildDetectorV2] Failed to load joker data, using defaults:', error);
      this.loadDefaultJokerData();
    }
    this.dataLoaded.set(true);
  }

  /**
   * Parse joker data into lookup map
   */
  private parseJokerData(data: JokersCompleteData): void {
    const map = new Map<string, JokerBuildAffinity>();

    for (const joker of data.jokers) {
      let builds: Partial<Record<StrategyType, number>> = {};

      // Handle both formats: strategies array or builds object
      if (joker.builds) {
        builds = joker.builds;
      } else if (joker.strategies) {
        for (const s of joker.strategies) {
          builds[s.strategy] = s.affinity;
        }
      }

      map.set(joker.id, {
        id: joker.id,
        name: joker.name,
        builds,
        wantsSuits: joker.wantsSuits,
        wantsRanks: joker.wantsRanks,
      });
    }

    this.jokerData.set(map);
  }

  /**
   * Load minimal default data for core jokers
   */
  private loadDefaultJokerData(): void {
    const defaults: JokerBuildAffinity[] = [
      // Flush jokers
      { id: 'j_lusty_joker', name: 'Lusty Joker', builds: { flush: 95 }, wantsSuits: ['hearts'] },
      { id: 'j_greedy_joker', name: 'Greedy Joker', builds: { flush: 95 }, wantsSuits: ['diamonds'] },
      { id: 'j_wrathful_joker', name: 'Wrathful Joker', builds: { flush: 95 }, wantsSuits: ['spades'] },
      { id: 'j_gluttonous_joker', name: 'Gluttonous Joker', builds: { flush: 95 }, wantsSuits: ['clubs'] },
      { id: 'j_smeared', name: 'Smeared Joker', builds: { flush: 100 } },
      { id: 'j_tribe', name: 'The Tribe', builds: { flush: 100, xmult_scaling: 80 } },
      { id: 'j_four_fingers', name: 'Four Fingers', builds: { flush: 100, straight: 100 } },

      // Sets/Pairs jokers
      { id: 'j_duo', name: 'The Duo', builds: { pairs: 100, xmult_scaling: 80 } },
      { id: 'j_trio', name: 'The Trio', builds: { pairs: 95, xmult_scaling: 85 } },
      { id: 'j_family', name: 'The Family', builds: { pairs: 100, xmult_scaling: 90 } },
      { id: 'j_jolly', name: 'Jolly Joker', builds: { pairs: 90 } },
      { id: 'j_zany', name: 'Zany Joker', builds: { pairs: 85 } },

      // Straight jokers
      { id: 'j_order', name: 'The Order', builds: { straight: 100, xmult_scaling: 85 } },
      { id: 'j_shortcut', name: 'Shortcut', builds: { straight: 100 } },
      { id: 'j_runner', name: 'Runner', builds: { straight: 100, chip_stacking: 90 } },

      // Face card jokers
      { id: 'j_triboulet', name: 'Triboulet', builds: { face_cards: 100, xmult_scaling: 100 } },
      { id: 'j_baron', name: 'Baron', builds: { face_cards: 100, xmult_scaling: 90 } },
      { id: 'j_photograph', name: 'Photograph', builds: { face_cards: 95, xmult_scaling: 80 } },
      { id: 'j_sock_and_buskin', name: 'Sock and Buskin', builds: { face_cards: 100, retrigger: 95 } },

      // xMult scaling
      { id: 'j_cavendish', name: 'Cavendish', builds: { xmult_scaling: 90 } },
      { id: 'j_steel_joker', name: 'Steel Joker', builds: { steel_scaling: 100, xmult_scaling: 85 } },
      { id: 'j_glass', name: 'Glass Joker', builds: { glass_cannon: 100, xmult_scaling: 75 } },
      { id: 'j_hologram', name: 'Hologram', builds: { xmult_scaling: 90 } },
      { id: 'j_constellation', name: 'Constellation', builds: { xmult_scaling: 85 } },

      // Fibonacci
      { id: 'j_fibonacci', name: 'Fibonacci', builds: { fibonacci: 100 }, wantsRanks: ['A', '2', '3', '5', '8'] },
      { id: 'j_hack', name: 'Hack', builds: { fibonacci: 60, retrigger: 90 }, wantsRanks: ['2', '3', '4', '5'] },
    ];

    const map = new Map<string, JokerBuildAffinity>();
    for (const joker of defaults) {
      map.set(joker.id, joker);
    }
    this.jokerData.set(map);
  }

  /**
   * All cards in the current deck (remaining + hand + discarded + played)
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
   * Current hand levels
   */
  private handLevels = computed(() => this.gameState.handLevels());

  /**
   * Main detection result with hybrid support
   */
  detectedBuild = computed<BuildDetectionResult>(() => {
    const cards = this.allDeckCards();
    const jokers = this.jokers();
    const handLevels = this.handLevels();

    // Calculate signals for each build type
    const buildScores = new Map<StrategyType, SignalBreakdown>();

    const buildTypes: StrategyType[] = [
      'flush', 'straight', 'pairs', 'mult_stacking', 'xmult_scaling',
      'chip_stacking', 'fibonacci', 'even_steven', 'odd_todd',
      'face_cards', 'steel_scaling', 'glass_cannon', 'retrigger', 'economy',
    ];

    for (const buildType of buildTypes) {
      const jokerSignal = this.calculateJokerSignal(jokers, buildType);
      const deckSignal = this.calculateDeckSignal(cards, buildType);
      const handLevelSignal = this.calculateHandLevelSignal(handLevels, buildType);

      // Combine: jokerSignal * 0.6 + deckSignal * 0.3 + handLevel * 0.1
      const combined = (jokerSignal * 0.6) + (deckSignal * 0.3) + (handLevelSignal * 0.1);

      buildScores.set(buildType, {
        jokerSignal,
        deckSignal,
        handLevelSignal,
        combined,
      });
    }

    // Convert to DetectedStrategy array and sort by combined score
    const allBuilds = this.convertToDetectedStrategies(buildScores, cards, jokers);
    allBuilds.sort((a, b) => b.confidence - a.confidence);

    // Filter out zero-confidence builds
    const validBuilds = allBuilds.filter(b => b.confidence > 0);

    if (validBuilds.length === 0) {
      return this.createEmptyResult();
    }

    const primary = validBuilds[0];
    const secondary = validBuilds.length > 1 ? validBuilds[1] : null;

    // Check for hybrid: second-highest > 70% of highest
    let isHybrid = false;
    let hybridLabel: string | null = null;

    if (secondary && primary.confidence > 0) {
      const ratio = secondary.confidence / primary.confidence;
      if (ratio >= 0.70) {
        isHybrid = true;
        const primaryName = STRATEGY_DISPLAY_NAMES[primary.type];
        const secondaryName = STRATEGY_DISPLAY_NAMES[secondary.type];
        hybridLabel = `${primaryName}/${secondaryName} Hybrid`;
      }
    }

    return {
      primary,
      secondary,
      isHybrid,
      hybridLabel,
      allBuilds: validBuilds,
    };
  });

  /**
   * Primary strategy for backward compatibility
   */
  primaryStrategy = computed<DetectedStrategy | null>(() => {
    return this.detectedBuild().primary ?? null;
  });

  /**
   * All detected strategies sorted by confidence
   */
  detectedStrategies = computed<DetectedStrategy[]>(() => {
    return this.detectedBuild().allBuilds;
  });

  /**
   * Calculate joker signal: sum of build affinities for owned jokers
   */
  private calculateJokerSignal(jokers: JokerState[], buildType: StrategyType): number {
    const data = this.jokerData();
    if (data.size === 0 || jokers.length === 0) return 0;

    let totalAffinity = 0;
    let matchingJokers = 0;

    for (const joker of jokers) {
      const jokerInfo = data.get(joker.id);
      if (jokerInfo?.builds[buildType]) {
        totalAffinity += jokerInfo.builds[buildType]!;
        matchingJokers++;
      }
    }

    if (matchingJokers === 0) return 0;

    // Average affinity with bonus for multiple matching jokers
    const avgAffinity = totalAffinity / matchingJokers;
    const countBonus = Math.min(30, matchingJokers * 10);

    return Math.min(100, avgAffinity + countBonus);
  }

  /**
   * Calculate deck signal based on card distribution
   */
  private calculateDeckSignal(cards: Card[], buildType: StrategyType): number {
    if (cards.length === 0) return 0;

    switch (buildType) {
      case 'flush':
        return this.calculateFlushDeckSignal(cards);
      case 'straight':
        return this.calculateStraightDeckSignal(cards);
      case 'pairs':
        return this.calculatePairsDeckSignal(cards);
      case 'fibonacci':
        return this.calculateFibonacciDeckSignal(cards);
      case 'face_cards':
        return this.calculateFaceCardsDeckSignal(cards);
      case 'even_steven':
        return this.calculateEvenDeckSignal(cards);
      case 'odd_todd':
        return this.calculateOddDeckSignal(cards);
      default:
        // Build types that don't depend on deck composition
        return 0;
    }
  }

  /**
   * Calculate hand level signal based on leveled-up hand types
   */
  private calculateHandLevelSignal(handLevels: HandLevel[], buildType: StrategyType): number {
    if (handLevels.length === 0) return 0;

    let relevantHandTypes: HandType[] = [];

    switch (buildType) {
      case 'flush':
        relevantHandTypes = FLUSH_HAND_TYPES;
        break;
      case 'straight':
        relevantHandTypes = STRAIGHT_HAND_TYPES;
        break;
      case 'pairs':
        relevantHandTypes = [...PAIRS_HAND_TYPES, ...SETS_HAND_TYPES];
        break;
      default:
        return 0;
    }

    // Sum levels above 1 for relevant hand types
    let totalLevelBonus = 0;
    for (const hl of handLevels) {
      if (relevantHandTypes.includes(hl.handType) && hl.level > 1) {
        totalLevelBonus += (hl.level - 1) * 10; // 10 points per level above 1
      }
    }

    return Math.min(100, totalLevelBonus);
  }

  /**
   * Flush deck signal: suit concentration
   */
  private calculateFlushDeckSignal(cards: Card[]): number {
    const suitCounts = this.getSuitDistribution(cards);
    const maxCount = Math.max(...Object.values(suitCounts));
    const concentration = maxCount / cards.length;

    // 25% = 0, 50% = 50, 100% = 100
    return Math.min(100, Math.max(0, (concentration - 0.25) * (100 / 0.75)));
  }

  /**
   * Straight deck signal: rank coverage
   */
  private calculateStraightDeckSignal(cards: Card[]): number {
    const rankCounts = this.getRankDistribution(cards);
    const uniqueRanks = Object.values(rankCounts).filter(c => c > 0).length;

    // More unique ranks = better for straights
    // 13 unique ranks = 100, 8 = 60, 5 = 40
    return Math.min(100, (uniqueRanks / 13) * 100);
  }

  /**
   * Pairs/Sets deck signal: rank duplicates
   */
  private calculatePairsDeckSignal(cards: Card[]): number {
    const rankCounts = this.getRankDistribution(cards);

    let score = 0;
    for (const count of Object.values(rankCounts)) {
      if (count >= 4) score += 40; // Quad
      else if (count >= 3) score += 25; // Trip
      else if (count >= 2) score += 10; // Pair
    }

    return Math.min(100, score);
  }

  /**
   * Fibonacci deck signal: A,2,3,5,8 concentration
   */
  private calculateFibonacciDeckSignal(cards: Card[]): number {
    const fibRanks: Rank[] = ['A', '2', '3', '5', '8'];
    const rankCounts = this.getRankDistribution(cards);

    let fibCount = 0;
    for (const rank of fibRanks) {
      fibCount += rankCounts[rank] || 0;
    }

    const concentration = fibCount / cards.length;
    return Math.min(100, concentration * 200); // 50% = 100
  }

  /**
   * Face cards deck signal: J,Q,K concentration
   */
  private calculateFaceCardsDeckSignal(cards: Card[]): number {
    const faceRanks: Rank[] = ['J', 'Q', 'K'];
    const rankCounts = this.getRankDistribution(cards);

    let faceCount = 0;
    for (const rank of faceRanks) {
      faceCount += rankCounts[rank] || 0;
    }

    const concentration = faceCount / cards.length;
    // Standard deck = 23%, so 35%+ is good
    return Math.min(100, Math.max(0, (concentration - 0.15) * (100 / 0.35)));
  }

  /**
   * Even deck signal: 2,4,6,8,10 concentration
   */
  private calculateEvenDeckSignal(cards: Card[]): number {
    const evenRanks: Rank[] = ['2', '4', '6', '8', '10'];
    const rankCounts = this.getRankDistribution(cards);

    let evenCount = 0;
    for (const rank of evenRanks) {
      evenCount += rankCounts[rank] || 0;
    }

    const concentration = evenCount / cards.length;
    return Math.min(100, concentration * 200); // 50% = 100
  }

  /**
   * Odd deck signal: A,3,5,7,9 concentration
   */
  private calculateOddDeckSignal(cards: Card[]): number {
    const oddRanks: Rank[] = ['A', '3', '5', '7', '9'];
    const rankCounts = this.getRankDistribution(cards);

    let oddCount = 0;
    for (const rank of oddRanks) {
      oddCount += rankCounts[rank] || 0;
    }

    const concentration = oddCount / cards.length;
    return Math.min(100, concentration * 200); // 50% = 100
  }

  /**
   * Get suit distribution
   */
  private getSuitDistribution(cards: Card[]): Record<Suit, number> {
    const counts: Record<Suit, number> = {
      hearts: 0,
      diamonds: 0,
      clubs: 0,
      spades: 0,
    };

    for (const card of cards) {
      counts[card.suit]++;
    }

    return counts;
  }

  /**
   * Get rank distribution
   */
  private getRankDistribution(cards: Card[]): Record<Rank, number> {
    const counts: Record<Rank, number> = {
      '2': 0, '3': 0, '4': 0, '5': 0, '6': 0,
      '7': 0, '8': 0, '9': 0, '10': 0,
      'J': 0, 'Q': 0, 'K': 0, 'A': 0,
    };

    for (const card of cards) {
      counts[card.rank]++;
    }

    return counts;
  }

  /**
   * Convert score map to DetectedStrategy array
   */
  private convertToDetectedStrategies(
    scores: Map<StrategyType, SignalBreakdown>,
    cards: Card[],
    jokers: JokerState[]
  ): DetectedStrategy[] {
    const strategies: DetectedStrategy[] = [];

    for (const [type, breakdown] of scores) {
      const confidence = Math.round(breakdown.combined);
      if (confidence <= 0) continue;

      const strategy: DetectedStrategy = {
        type,
        confidence,
        viability: this.calculateViability(type, confidence, jokers),
        requirements: this.getRequirements(type, cards, jokers, breakdown),
        currentStrength: this.calculateCurrentStrength(type, cards, jokers),
        keyJokers: this.getKeyJokers(type, jokers),
      };

      // Add suit for flush builds
      if (type === 'flush' && cards.length > 0) {
        const suitCounts = this.getSuitDistribution(cards);
        let dominantSuit: Suit = 'hearts';
        let maxCount = 0;
        for (const [suit, count] of Object.entries(suitCounts)) {
          if (count > maxCount) {
            maxCount = count;
            dominantSuit = suit as Suit;
          }
        }
        strategy.suit = dominantSuit;
      }

      strategies.push(strategy);
    }

    return strategies;
  }

  /**
   * Calculate viability score
   */
  private calculateViability(type: StrategyType, confidence: number, jokers: JokerState[]): number {
    let viability = confidence * 0.6;

    // xMult jokers boost viability
    const data = this.jokerData();
    let xmultCount = 0;
    for (const joker of jokers) {
      const info = data.get(joker.id);
      if (info?.builds.xmult_scaling && info.builds.xmult_scaling >= 60) {
        xmultCount++;
      }
    }
    viability += xmultCount * 15;

    // Strategy-specific boosts
    if (type === 'flush' && confidence >= 60) viability += 10;
    if (type === 'pairs' && confidence >= 60) viability += 10;

    return Math.min(100, Math.round(viability));
  }

  /**
   * Get requirements for a build
   */
  private getRequirements(
    type: StrategyType,
    cards: Card[],
    jokers: JokerState[],
    breakdown: SignalBreakdown
  ): string[] {
    const reqs: string[] = [];

    if (breakdown.jokerSignal < 40) {
      reqs.push(`Find ${STRATEGY_DISPLAY_NAMES[type]} joker`);
    }
    if (breakdown.deckSignal < 30 && ['flush', 'pairs', 'fibonacci', 'face_cards'].includes(type)) {
      reqs.push('Improve deck composition');
    }
    if (breakdown.handLevelSignal < 20 && ['flush', 'straight', 'pairs'].includes(type)) {
      reqs.push('Level up relevant hand types');
    }

    return reqs.length > 0 ? reqs : ['Build is well-established'];
  }

  /**
   * Calculate current strength
   */
  private calculateCurrentStrength(type: StrategyType, cards: Card[], jokers: JokerState[]): number {
    const jokerSignal = this.calculateJokerSignal(jokers, type);
    const deckSignal = this.calculateDeckSignal(cards, type);

    return Math.min(100, Math.round((jokerSignal + deckSignal) / 2));
  }

  /**
   * Get key jokers for a build
   */
  private getKeyJokers(type: StrategyType, jokers: JokerState[]): string[] {
    const data = this.jokerData();
    const keyJokers: string[] = [];

    for (const joker of jokers) {
      const info = data.get(joker.id);
      if (info?.builds[type] && info.builds[type]! >= 60) {
        keyJokers.push(joker.id);
      }
    }

    return keyJokers;
  }

  /**
   * Create empty result when no build detected
   */
  private createEmptyResult(): BuildDetectionResult {
    const emptyStrategy: DetectedStrategy = {
      type: 'hybrid',
      confidence: 0,
      viability: 0,
      requirements: ['Build joker synergies', 'Focus deck composition'],
      currentStrength: 0,
    };

    return {
      primary: emptyStrategy,
      secondary: null,
      isHybrid: false,
      hybridLabel: null,
      allBuilds: [],
    };
  }

  /**
   * Get display name for a strategy type
   */
  getDisplayName(type: StrategyType): string {
    return STRATEGY_DISPLAY_NAMES[type] || type;
  }
}
