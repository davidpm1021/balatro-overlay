import { Injectable, inject, computed, signal } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { DetectedStrategy, StrategyType } from '../../../../../../shared/models';
import { Card, Suit, Rank } from '../../../../../../shared/models';
import { JokerState } from '../../../../../../shared/models';
import { HandType, HandLevel } from '../../../../../../shared/models';

/**
 * Signal inputs for weighted confidence calculation
 */
export interface StrategySignals {
  jokerSignal: number;    // 0-100
  deckSignal: number;     // 0-100
  handLevelSignal: number; // 0-100
}

/**
 * Detected build with hybrid support
 */
export interface DetectedBuild {
  primary: DetectedStrategy | null;
  secondary?: DetectedStrategy;
  isHybrid: boolean;
}

/**
 * Deck composition signals for strategy detection
 */
export interface DeckSignals {
  suitConcentration: number;  // 0-1 - max percentage of any single suit
  rankCoverage: number;       // 0-1 - percentage of ranks with 2+ cards
  pairDensity: number;        // 0-1 - density of duplicate ranks
  fibonacciCount: number;     // raw count of fibonacci cards
  faceCardCount: number;      // raw count of face cards
}

// Import joker data from consolidated source
import jokersData from '../../../data/jokers-complete.json';

/**
 * Joker entry from the JSON database
 */
interface JokerDataEntry {
  id: string;
  name: string;
  builds: {
    flush: number;
    pairs: number;
    straights: number;
    face_cards: number;
    xmult_scaling: number;
    retrigger: number;
    economy: number;
  };
}

/**
 * Internal affinity structure derived from joker data
 */
interface JokerAffinity {
  strategies: Partial<Record<StrategyType, number>>;
  suits?: Suit[];
  ranks?: Rank[];
}

/**
 * Fibonacci ranks for detection
 */
const FIBONACCI_RANKS: Rank[] = ['2', '3', '5', '8', 'A'];

/**
 * Face card ranks for detection
 */
const FACE_RANKS: Rank[] = ['J', 'Q', 'K'];

/**
 * Minimum joker signal threshold for build detection
 * If joker signal is below this, confidence will be 0
 * This prevents deck composition alone from triggering build detection
 */
const MIN_JOKER_SIGNAL_THRESHOLD = 10;

/**
 * Map of joker IDs to their suit affinities (for suit-specific jokers)
 */
const SUIT_AFFINITIES: Record<string, Suit[]> = {
  greedy_joker: ['diamonds'],
  lusty_joker: ['hearts'],
  wrathful_joker: ['spades'],
  gluttonous_joker: ['clubs'],
  rough_gem: ['diamonds'],
  bloodstone: ['hearts'],
  arrowhead: ['spades'],
  onyx_agate: ['clubs'],
  blackboard: ['spades', 'clubs'],
};

/**
 * Map of joker IDs to their rank affinities (for rank-specific jokers)
 */
const RANK_AFFINITIES: Record<string, Rank[]> = {
  fibonacci: ['2', '3', '5', '8', 'A'],
  hack: ['2', '3', '4', '5'],
  wee_joker: ['2'],
  scholar: ['A'],
  even_steven: ['2', '4', '6', '8', '10'],
  odd_todd: ['A', '3', '5', '7', '9'],
  walkie_talkie: ['4', '10'],
  triboulet: ['K', 'Q'],
  shoot_the_moon: ['Q'],
};

/**
 * Build joker affinity map from jokers-complete.json
 * Maps joker IDs to their strategy affinities
 */
function buildJokerAffinities(): Record<string, JokerAffinity> {
  const affinities: Record<string, JokerAffinity> = {};

  for (const joker of (jokersData as { jokers: JokerDataEntry[] }).jokers) {
    const builds = joker.builds;
    if (!builds) continue;

    const strategies: Partial<Record<StrategyType, number>> = {};

    // Map from JSON field names to StrategyType values
    if (builds.flush > 0) strategies.flush = builds.flush;
    if (builds.pairs > 0) strategies.pairs = builds.pairs;
    if (builds.straights > 0) strategies.straight = builds.straights; // Note: straights -> straight
    if (builds.face_cards > 0) strategies.face_cards = builds.face_cards;
    if (builds.xmult_scaling > 0) strategies.xmult_scaling = builds.xmult_scaling;
    if (builds.retrigger > 0) strategies.retrigger = builds.retrigger;
    if (builds.economy > 0) strategies.economy = builds.economy;

    // Only add if there are any strategies
    if (Object.keys(strategies).length > 0) {
      affinities[joker.id] = {
        strategies,
        suits: SUIT_AFFINITIES[joker.id],
        ranks: RANK_AFFINITIES[joker.id],
      };
    }
  }

  return affinities;
}

/**
 * Computed joker affinities from the consolidated database
 */
const JOKER_AFFINITIES = buildJokerAffinities();

@Injectable({ providedIn: 'root' })
export class BuildDetectorService {
  private gameState = inject(GameStateService);

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
   * Detected strategies, ranked by confidence
   */
  detectedStrategies = computed<DetectedStrategy[]>(() => {
    const cards = this.allDeckCards();
    const jokers = this.jokers();

    if (cards.length === 0 && jokers.length === 0) {
      return [];
    }

    const strategies: DetectedStrategy[] = [];

    // Analyze each strategy type
    strategies.push(this.analyzeFlush(cards, jokers));
    strategies.push(this.analyzePairs(cards, jokers));
    strategies.push(this.analyzeMultStacking(jokers));
    strategies.push(this.analyzeXMultScaling(jokers));
    strategies.push(this.analyzeFibonacci(cards, jokers));
    strategies.push(this.analyzeFaceCards(cards, jokers));

    // Sort by confidence descending
    return strategies
      .filter(s => s.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence);
  });

  /**
   * Primary detected strategy (highest confidence)
   */
  primaryStrategy = computed<DetectedStrategy | null>(() => {
    const strategies = this.detectedStrategies();
    return strategies.length > 0 ? strategies[0] : null;
  });

  /**
   * Detected build with hybrid support
   * Hybrid is detected when secondary strategy >= 70% of primary confidence
   */
  detectedBuild = computed<DetectedBuild>(() => {
    const strategies = this.detectedStrategies();

    if (strategies.length === 0) {
      return { primary: null, secondary: undefined, isHybrid: false };
    }

    const primary = strategies[0];
    const secondary = strategies[1];

    // Hybrid if secondary exists and is >= 70% of primary confidence
    const isHybrid = secondary !== undefined &&
                     primary.confidence > 0 &&
                     secondary.confidence >= primary.confidence * 0.7;

    return {
      primary,
      secondary: isHybrid ? secondary : undefined,
      isHybrid,
    };
  });

  /**
   * Calculate strategy confidence using 60/30/10 weighted formula
   * @param strategyType - The strategy type being evaluated
   * @param signals - Object containing joker, deck, and hand level signals (0-100 each)
   * @returns Weighted confidence score (0-100)
   */
  calculateStrategyConfidence(
    strategyType: StrategyType,
    signals: StrategySignals
  ): number {
    return Math.round(
      signals.jokerSignal * 0.6 +
      signals.deckSignal * 0.3 +
      signals.handLevelSignal * 0.1
    );
  }

  /**
   * Get hand level signals mapped to strategy types
   * Maps Balatro hand types to strategy types and returns normalized 0-100 values
   */
  getHandLevelSignals(): Record<StrategyType, number> {
    const handLevels = this.gameState.handLevels();

    // Initialize all strategies to 0
    const signals: Record<StrategyType, number> = {
      flush: 0,
      straight: 0,
      pairs: 0,
      face_cards: 0,
      mult_stacking: 0,
      xmult_scaling: 0,
      chip_stacking: 0,
      retrigger: 0,
      economy: 0,
      fibonacci: 0,
      even_steven: 0,
      odd_todd: 0,
      steel_scaling: 0,
      glass_cannon: 0,
      hybrid: 0,
    };

    if (!handLevels || handLevels.length === 0) {
      return signals;
    }

    // Map hand types to strategies
    const handTypeToStrategy: Partial<Record<HandType, StrategyType[]>> = {
      flush: ['flush'],
      straight: ['straight'],
      straight_flush: ['flush', 'straight'],
      royal_flush: ['flush', 'straight'],
      pair: ['pairs'],
      two_pair: ['pairs'],
      three_of_a_kind: ['pairs'],
      full_house: ['pairs'],
      four_of_a_kind: ['pairs'],
      five_of_a_kind: ['pairs'],
      flush_house: ['flush', 'pairs'],
      flush_five: ['flush', 'pairs'],
    };

    // Calculate signals based on hand levels
    // Level 1 = base (0 points), each level above 1 = +12 points (capped at 100)
    for (const handLevel of handLevels) {
      const strategies = handTypeToStrategy[handLevel.handType];
      if (strategies) {
        const levelBonus = Math.min(100, Math.max(0, (handLevel.level - 1) * 12));
        for (const strategy of strategies) {
          signals[strategy] = Math.max(signals[strategy], levelBonus);
        }
      }
    }

    return signals;
  }

  /**
   * Get deck composition signals for strategy detection
   */
  getDeckSignals(): DeckSignals {
    const cards = this.allDeckCards();
    const totalCards = cards.length || 1;

    // Suit concentration
    const suitCounts = this.getSuitDistribution(cards);
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    const suitConcentration = maxSuitCount / totalCards;

    // Rank distribution for various signals
    const rankCounts = this.getRankDistribution(cards);

    // Rank coverage: how many ranks have 2+ cards (for pairs strategy)
    const ranksWithMultiples = Object.values(rankCounts).filter(c => c >= 2).length;
    const rankCoverage = ranksWithMultiples / 13; // 13 possible ranks

    // Pair density: weighted by how many duplicates exist
    let duplicateCards = 0;
    for (const count of Object.values(rankCounts)) {
      if (count >= 2) {
        duplicateCards += count;
      }
    }
    const pairDensity = totalCards > 0 ? duplicateCards / totalCards : 0;

    // Fibonacci count
    let fibonacciCount = 0;
    for (const rank of FIBONACCI_RANKS) {
      fibonacciCount += rankCounts[rank] || 0;
    }

    // Face card count
    let faceCardCount = 0;
    for (const rank of FACE_RANKS) {
      faceCardCount += rankCounts[rank] || 0;
    }

    return {
      suitConcentration,
      rankCoverage,
      pairDensity,
      fibonacciCount,
      faceCardCount,
    };
  }

  /**
   * Analyze flush strategy potential
   */
  private analyzeFlush(cards: Card[], jokers: JokerState[]): DetectedStrategy {
    const suitCounts = this.getSuitDistribution(cards);
    const totalCards = cards.length || 1;

    // Find dominant suit
    let dominantSuit: Suit = 'hearts';
    let maxCount = 0;
    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantSuit = suit as Suit;
      }
    }

    const suitConcentration = maxCount / totalCards;

    // Joker affinity score
    const jokerScore = this.calculateJokerAffinity(jokers, 'flush', dominantSuit);

    // Base confidence from deck composition (40% of score)
    // 25% concentration = 0, 50% = 50, 75% = 100
    const deckScore = Math.min(100, Math.max(0, (suitConcentration - 0.25) * 200));

    // Combined score: 40% deck, 60% jokers
    // BUT: If joker signal is below threshold, confidence is 0
    const rawConfidence = Math.round(deckScore * 0.4 + jokerScore * 0.6);
    const confidence = jokerScore < MIN_JOKER_SIGNAL_THRESHOLD ? 0 : rawConfidence;

    // Build reasoning
    const reasons: string[] = [];
    if (suitConcentration >= 0.4) {
      reasons.push(`${Math.round(suitConcentration * 100)}% ${dominantSuit}`);
    }
    const flushJokers = this.getJokersForStrategy(jokers, 'flush');
    if (flushJokers.length > 0) {
      reasons.push(`${flushJokers.length} flush joker(s)`);
    }

    // Calculate current strength
    const currentStrength = Math.round(
      (suitConcentration >= 0.5 ? 50 : suitConcentration * 100) +
      (flushJokers.length * 15)
    );

    return {
      type: 'flush',
      confidence,
      viability: this.calculateViability('flush', confidence, jokers),
      requirements: this.getFlushRequirements(suitConcentration, flushJokers),
      currentStrength: Math.min(100, currentStrength),
      suit: dominantSuit,
      keyJokers: flushJokers.map(j => j.id),
    };
  }

  /**
   * Analyze pairs/sets strategy potential
   */
  private analyzePairs(cards: Card[], jokers: JokerState[]): DetectedStrategy {
    const rankCounts = this.getRankDistribution(cards);

    // Count how many ranks have pairs, trips, quads
    let pairCount = 0;
    let tripCount = 0;
    let quadCount = 0;

    for (const count of Object.values(rankCounts)) {
      if (count >= 4) quadCount++;
      else if (count >= 3) tripCount++;
      else if (count >= 2) pairCount++;
    }

    // Joker affinity score
    const jokerScore = this.calculateJokerAffinity(jokers, 'pairs');

    // Base deck score from rank concentration
    const deckScore = Math.min(100, (quadCount * 30) + (tripCount * 20) + (pairCount * 10));

    // Combined score: 30% deck, 70% jokers
    // BUT: If joker signal is below threshold, confidence is 0
    const rawConfidence = Math.round(deckScore * 0.3 + jokerScore * 0.7);
    const confidence = jokerScore < MIN_JOKER_SIGNAL_THRESHOLD ? 0 : rawConfidence;

    const reasons: string[] = [];
    if (quadCount > 0) reasons.push(`${quadCount} quad(s)`);
    if (tripCount > 0) reasons.push(`${tripCount} trip(s)`);
    if (pairCount > 0) reasons.push(`${pairCount} pair(s)`);

    const pairJokers = this.getJokersForStrategy(jokers, 'pairs');
    if (pairJokers.length > 0) {
      reasons.push(`${pairJokers.length} pair joker(s)`);
    }

    return {
      type: 'pairs',
      confidence,
      viability: this.calculateViability('pairs', confidence, jokers),
      requirements: this.getPairsRequirements(pairJokers, quadCount + tripCount),
      currentStrength: Math.min(100, deckScore + pairJokers.length * 15),
      keyJokers: pairJokers.map(j => j.id),
    };
  }

  /**
   * Analyze +mult stacking strategy
   */
  private analyzeMultStacking(jokers: JokerState[]): DetectedStrategy {
    const jokerScore = this.calculateJokerAffinity(jokers, 'mult_stacking');
    const multJokers = this.getJokersForStrategy(jokers, 'mult_stacking');

    const reasons: string[] = [];
    if (multJokers.length > 0) {
      reasons.push(`${multJokers.length} +mult joker(s)`);
    }

    // Mult stacking is purely joker-driven
    // If joker signal is below threshold, confidence is 0
    const confidence = jokerScore < MIN_JOKER_SIGNAL_THRESHOLD ? 0 : jokerScore;

    return {
      type: 'mult_stacking',
      confidence,
      viability: this.calculateViability('mult_stacking', confidence, jokers),
      requirements: this.getMultStackingRequirements(multJokers),
      currentStrength: Math.min(100, multJokers.length * 20),
      keyJokers: multJokers.map(j => j.id),
    };
  }

  /**
   * Analyze xMult scaling strategy
   */
  private analyzeXMultScaling(jokers: JokerState[]): DetectedStrategy {
    const jokerScore = this.calculateJokerAffinity(jokers, 'xmult_scaling');
    const xmultJokers = this.getJokersForStrategy(jokers, 'xmult_scaling');

    const reasons: string[] = [];
    if (xmultJokers.length > 0) {
      reasons.push(`${xmultJokers.length} xMult joker(s)`);
    }

    // xMult is purely joker-driven
    // If joker signal is below threshold, confidence is 0
    const confidence = jokerScore < MIN_JOKER_SIGNAL_THRESHOLD ? 0 : jokerScore;

    return {
      type: 'xmult_scaling',
      confidence,
      viability: this.calculateViability('xmult_scaling', confidence, jokers),
      requirements: this.getXMultRequirements(xmultJokers),
      currentStrength: Math.min(100, xmultJokers.length * 25),
      keyJokers: xmultJokers.map(j => j.id),
    };
  }

  /**
   * Analyze Fibonacci strategy (2, 3, 5, 8, A)
   */
  private analyzeFibonacci(cards: Card[], jokers: JokerState[]): DetectedStrategy {
    const rankCounts = this.getRankDistribution(cards);
    const totalCards = cards.length || 1;

    // Count fibonacci cards
    let fibCount = 0;
    for (const rank of FIBONACCI_RANKS) {
      fibCount += rankCounts[rank] || 0;
    }

    const fibConcentration = fibCount / totalCards;

    const jokerScore = this.calculateJokerAffinity(jokers, 'fibonacci');
    const fibJokers = this.getJokersForStrategy(jokers, 'fibonacci');

    // Deck score: fibonacci concentration
    const deckScore = Math.min(100, fibConcentration * 200); // 50% = 100

    // Combined score: 30% deck, 70% jokers
    // BUT: If joker signal is below threshold, confidence is 0
    const rawConfidence = Math.round(deckScore * 0.3 + jokerScore * 0.7);
    const confidence = jokerScore < MIN_JOKER_SIGNAL_THRESHOLD ? 0 : rawConfidence;

    const reasons: string[] = [];
    if (fibConcentration >= 0.3) {
      reasons.push(`${Math.round(fibConcentration * 100)}% fibonacci cards`);
    }
    if (fibJokers.length > 0) {
      reasons.push(`${fibJokers.length} fibonacci joker(s)`);
    }

    return {
      type: 'fibonacci',
      confidence,
      viability: this.calculateViability('fibonacci', confidence, jokers),
      requirements: this.getFibonacciRequirements(fibJokers, fibConcentration),
      currentStrength: Math.min(100, deckScore + fibJokers.length * 25),
      keyJokers: fibJokers.map(j => j.id),
    };
  }

  /**
   * Analyze face cards strategy (J, Q, K)
   */
  private analyzeFaceCards(cards: Card[], jokers: JokerState[]): DetectedStrategy {
    const rankCounts = this.getRankDistribution(cards);
    const totalCards = cards.length || 1;

    // Count face cards
    let faceCount = 0;
    for (const rank of FACE_RANKS) {
      faceCount += rankCounts[rank] || 0;
    }

    const faceConcentration = faceCount / totalCards;

    const jokerScore = this.calculateJokerAffinity(jokers, 'face_cards');
    const faceJokers = this.getJokersForStrategy(jokers, 'face_cards');

    // Deck score: face card concentration
    // Standard deck has 12/52 = 23% face cards
    const deckScore = Math.min(100, (faceConcentration - 0.1) * 250);

    // Combined score: 30% deck, 70% jokers
    // BUT: If joker signal is below threshold, confidence is 0
    const rawConfidence = Math.round(Math.max(0, deckScore) * 0.3 + jokerScore * 0.7);
    const confidence = jokerScore < MIN_JOKER_SIGNAL_THRESHOLD ? 0 : rawConfidence;

    const reasons: string[] = [];
    if (faceConcentration >= 0.25) {
      reasons.push(`${Math.round(faceConcentration * 100)}% face cards`);
    }
    if (faceJokers.length > 0) {
      reasons.push(`${faceJokers.length} face card joker(s)`);
    }

    return {
      type: 'face_cards',
      confidence,
      viability: this.calculateViability('face_cards', confidence, jokers),
      requirements: this.getFaceCardRequirements(faceJokers, faceConcentration),
      currentStrength: Math.min(100, Math.max(0, deckScore) + faceJokers.length * 20),
      keyJokers: faceJokers.map(j => j.id),
    };
  }

  /**
   * Get suit distribution from cards
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
   * Get rank distribution from cards
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
   * Calculate joker affinity score for a strategy
   */
  private calculateJokerAffinity(
    jokers: JokerState[],
    strategy: StrategyType,
    preferredSuit?: Suit
  ): number {
    if (jokers.length === 0) return 0;

    let totalAffinity = 0;
    let matchingJokers = 0;

    for (const joker of jokers) {
      const affinity = JOKER_AFFINITIES[joker.id];
      if (affinity?.strategies[strategy]) {
        let score = affinity.strategies[strategy]!;

        // Bonus for suit-matching jokers
        if (preferredSuit && affinity.suits?.includes(preferredSuit)) {
          score = Math.min(100, score * 1.3);
        }

        totalAffinity += score;
        matchingJokers++;
      }
    }

    if (matchingJokers === 0) return 0;

    // Average affinity, boosted by having multiple matching jokers
    const avgAffinity = totalAffinity / matchingJokers;
    const jokerCountBonus = Math.min(30, matchingJokers * 10);

    return Math.min(100, Math.round(avgAffinity * 0.7 + jokerCountBonus));
  }

  /**
   * Get jokers that support a specific strategy
   */
  private getJokersForStrategy(jokers: JokerState[], strategy: StrategyType): JokerState[] {
    return jokers.filter(joker => {
      const affinity = JOKER_AFFINITIES[joker.id];
      return affinity?.strategies[strategy] && affinity.strategies[strategy]! >= 40;
    });
  }

  /**
   * Calculate viability score (can this build win?)
   */
  private calculateViability(
    strategy: StrategyType,
    confidence: number,
    jokers: JokerState[]
  ): number {
    // Base viability from confidence
    let viability = confidence * 0.6;

    // xMult jokers boost viability significantly
    const xmultJokers = this.getJokersForStrategy(jokers, 'xmult_scaling');
    viability += xmultJokers.length * 15;

    // Specific strategy boosts
    if (strategy === 'xmult_scaling' && xmultJokers.length >= 2) {
      viability += 20;
    }
    if (strategy === 'flush' && confidence >= 60) {
      viability += 10; // Flush is consistent
    }

    return Math.min(100, Math.round(viability));
  }

  /**
   * Get requirements for flush strategy
   */
  private getFlushRequirements(concentration: number, flushJokers: JokerState[]): string[] {
    const reqs: string[] = [];

    if (concentration < 0.5) {
      reqs.push('Remove off-suit cards');
    }
    if (flushJokers.length === 0) {
      reqs.push('Find flush-supporting joker');
    }
    if (concentration < 0.7) {
      reqs.push('Add more suit-matching cards');
    }

    return reqs.length > 0 ? reqs : ['Build is well-established'];
  }

  /**
   * Get requirements for pairs strategy
   */
  private getPairsRequirements(pairJokers: JokerState[], highSets: number): string[] {
    const reqs: string[] = [];

    if (pairJokers.length === 0) {
      reqs.push('Find pair/set joker (Duo, Trio, Family)');
    }
    if (highSets < 3) {
      reqs.push('Build more rank duplicates');
    }

    return reqs.length > 0 ? reqs : ['Build is well-established'];
  }

  /**
   * Get requirements for mult stacking
   */
  private getMultStackingRequirements(multJokers: JokerState[]): string[] {
    const reqs: string[] = [];

    if (multJokers.length < 2) {
      reqs.push('Find more +mult jokers');
    }
    if (multJokers.length < 4) {
      reqs.push('Stack additional mult sources');
    }

    return reqs.length > 0 ? reqs : ['Build is well-established'];
  }

  /**
   * Get requirements for xmult scaling
   */
  private getXMultRequirements(xmultJokers: JokerState[]): string[] {
    const reqs: string[] = [];

    if (xmultJokers.length < 1) {
      reqs.push('Find xMult joker');
    }
    if (xmultJokers.length < 2) {
      reqs.push('Add second xMult source');
    }

    return reqs.length > 0 ? reqs : ['Build is scaling well'];
  }

  /**
   * Get requirements for fibonacci strategy
   */
  private getFibonacciRequirements(fibJokers: JokerState[], concentration: number): string[] {
    const reqs: string[] = [];

    if (fibJokers.length === 0) {
      reqs.push('Need Fibonacci joker');
    }
    if (concentration < 0.4) {
      reqs.push('Remove non-fibonacci cards (4,6,7,9,10,J,Q,K)');
    }

    return reqs.length > 0 ? reqs : ['Build is well-established'];
  }

  /**
   * Get requirements for face cards strategy
   */
  private getFaceCardRequirements(faceJokers: JokerState[], concentration: number): string[] {
    const reqs: string[] = [];

    if (faceJokers.length === 0) {
      reqs.push('Find face card joker (Scary Face, Baron)');
    }
    if (concentration < 0.35) {
      reqs.push('Add more face cards to deck');
    }

    return reqs.length > 0 ? reqs : ['Build is well-established'];
  }
}
