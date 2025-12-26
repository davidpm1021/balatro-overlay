import { Injectable, inject, computed, signal } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { DetectedStrategy, StrategyType } from '../../../../../../shared/models';
import { Card, Suit, Rank } from '../../../../../../shared/models';
import { JokerState } from '../../../../../../shared/models';

/**
 * Joker affinity mapping - which strategies each joker supports
 */
interface JokerAffinity {
  strategies: Partial<Record<StrategyType, number>>; // 0-100 affinity
  suits?: Suit[];
  ranks?: Rank[];
}

/**
 * JOKER_AFFINITIES maps joker IDs to their strategy affinities.
 * Built from analyzing joker descriptions and effects.
 */
const JOKER_AFFINITIES: Record<string, JokerAffinity> = {
  // Flush-supporting jokers
  'j_greedy_joker': { strategies: { flush: 70 }, suits: ['diamonds'] },
  'j_lusty_joker': { strategies: { flush: 70 }, suits: ['hearts'] },
  'j_wrathful_joker': { strategies: { flush: 70 }, suits: ['spades'] },
  'j_gluttonous_joker': { strategies: { flush: 70 }, suits: ['clubs'] },
  'j_droll': { strategies: { flush: 80 } },
  'j_crafty': { strategies: { flush: 60 } },
  'j_tribe': { strategies: { flush: 90 } },
  'j_the_tribe': { strategies: { flush: 90 } },
  'j_smeared': { strategies: { flush: 95 } }, // Merges suits - dramatically improves flush viability
  'j_rough_gem': { strategies: { flush: 60 }, suits: ['diamonds'] },
  'j_bloodstone': { strategies: { flush: 60, xmult_scaling: 40 }, suits: ['hearts'] },
  'j_arrowhead': { strategies: { flush: 60 }, suits: ['spades'] },
  'j_onyx_agate': { strategies: { flush: 60 }, suits: ['clubs'] },
  'j_blackboard': { strategies: { flush: 50 }, suits: ['spades', 'clubs'] },
  'j_four_fingers': { strategies: { flush: 70, straight: 70 } },
  'j_flower_pot': { strategies: { flush: -30 } }, // Anti-flush, needs all suits

  // Pair/Set supporting jokers
  'j_jolly': { strategies: { pairs: 80 } },
  'j_zany': { strategies: { pairs: 85 } },
  'j_mad': { strategies: { pairs: 75 } },
  'j_sly': { strategies: { pairs: 60 } },
  'j_wily': { strategies: { pairs: 65 } },
  'j_clever': { strategies: { pairs: 60 } },
  'j_duo': { strategies: { pairs: 90, xmult_scaling: 60 } },
  'j_the_duo': { strategies: { pairs: 90, xmult_scaling: 60 } },
  'j_trio': { strategies: { pairs: 70, xmult_scaling: 85 } }, // Three of a kind xMult - wants trips, not pairs
  'j_the_trio': { strategies: { pairs: 70, xmult_scaling: 85 } },
  'j_family': { strategies: { pairs: 80, xmult_scaling: 90 } }, // Four of a kind xMult
  'j_the_family': { strategies: { pairs: 80, xmult_scaling: 90 } },
  'j_trousers': { strategies: { pairs: 70 } },
  'j_spare_trousers': { strategies: { pairs: 70 } },
  'j_card_sharp': { strategies: { pairs: 40 } },

  // +Mult stacking jokers
  'j_joker': { strategies: { mult_stacking: 50 } },
  'j_half': { strategies: { mult_stacking: 60 } },
  'j_mystic_summit': { strategies: { mult_stacking: 50 } },
  'j_gros_michel': { strategies: { mult_stacking: 70 } },
  'j_abstract': { strategies: { mult_stacking: 60 } },
  'j_misprint': { strategies: { mult_stacking: 40 } },
  'j_raised_fist': { strategies: { mult_stacking: 50 } },
  'j_green_joker': { strategies: { mult_stacking: 60 } },
  'j_popcorn': { strategies: { mult_stacking: 50 } },
  'j_flash': { strategies: { mult_stacking: 50 } },
  'j_flash_card': { strategies: { mult_stacking: 50 } },
  'j_bootstraps': { strategies: { mult_stacking: 60 } },
  'j_fortune_teller': { strategies: { mult_stacking: 50 } },
  'j_erosion': { strategies: { mult_stacking: 55 } },
  'j_swashbuckler': { strategies: { mult_stacking: 50 } },
  'j_ride_the_bus': { strategies: { mult_stacking: 60 } },
  'j_supernova': { strategies: { mult_stacking: 55 } },

  // xMult scaling jokers
  'j_cavendish': { strategies: { xmult_scaling: 90 } },
  'j_loyalty_card': { strategies: { xmult_scaling: 75 } },
  'j_photograph': { strategies: { xmult_scaling: 60, face_cards: 40 } },
  'j_steel_joker': { strategies: { xmult_scaling: 80 } },
  'j_constellation': { strategies: { xmult_scaling: 70 } },
  'j_madness': { strategies: { xmult_scaling: 65 } },
  'j_vampire': { strategies: { xmult_scaling: 70 } },
  'j_hologram': { strategies: { xmult_scaling: 75 } },
  'j_lucky_cat': { strategies: { xmult_scaling: 70 } },
  'j_glass': { strategies: { xmult_scaling: 75 } },
  'j_glass_joker': { strategies: { xmult_scaling: 75 } },
  'j_campfire': { strategies: { xmult_scaling: 65 } },
  'j_acrobat': { strategies: { xmult_scaling: 70 } },
  'j_throwback': { strategies: { xmult_scaling: 60 } },
  'j_obelisk': { strategies: { xmult_scaling: 70 } },
  'j_stencil': { strategies: { xmult_scaling: 50 } },
  'j_joker_stencil': { strategies: { xmult_scaling: 50 } },
  'j_baron': { strategies: { xmult_scaling: 75, face_cards: 80 } },
  'j_ancient': { strategies: { xmult_scaling: 60 } },
  'j_ancient_joker': { strategies: { xmult_scaling: 60 } },
  'j_ramen': { strategies: { xmult_scaling: 70 } },
  'j_blueprint': { strategies: { xmult_scaling: 40 } },
  'j_brainstorm': { strategies: { xmult_scaling: 40 } },
  'j_dusk': { strategies: { xmult_scaling: 50 } },
  'j_seltzer': { strategies: { xmult_scaling: 55 } },
  'j_drivers_license': { strategies: { xmult_scaling: 70 } },

  // Fibonacci jokers (2, 3, 5, 8, Ace)
  'j_fibonacci': { strategies: { fibonacci: 100 }, ranks: ['2', '3', '5', '8', 'A'] },
  'j_hack': { strategies: { fibonacci: 40 }, ranks: ['2', '3', '4', '5'] },
  'j_wee': { strategies: { fibonacci: 50 }, ranks: ['2'] },
  'j_wee_joker': { strategies: { fibonacci: 50 }, ranks: ['2'] },
  'j_scholar': { strategies: { fibonacci: 30 }, ranks: ['A'] },

  // Face card jokers (J, Q, K)
  'j_scary_face': { strategies: { face_cards: 80 } },
  'j_smiley': { strategies: { face_cards: 80 } },
  'j_business': { strategies: { face_cards: 60 } },
  'j_faceless': { strategies: { face_cards: 50 } },
  'j_reserved_parking': { strategies: { face_cards: 50 } },
  'j_pareidolia': { strategies: { face_cards: 70 } },
  'j_sock_and_buskin': { strategies: { face_cards: 85 } },
  'j_hanging_chad': { strategies: { face_cards: 40 } },
  'j_shoot_the_moon': { strategies: { face_cards: 75 }, ranks: ['Q'] },
  'j_triboulet': { strategies: { face_cards: 90, xmult_scaling: 70 }, ranks: ['K', 'Q'] },
  'j_midas_mask': { strategies: { face_cards: 60 } },
  'j_canio': { strategies: { face_cards: 80, xmult_scaling: 60 } },

  // Straight supporting jokers
  'j_crazy': { strategies: { straight: 80 } },
  'j_devious': { strategies: { straight: 60 } },
  'j_runner': { strategies: { straight: 75 } },
  'j_order': { strategies: { straight: 90 } },
  'j_the_order': { strategies: { straight: 90 } },
  'j_shortcut': { strategies: { straight: 70 } },
  'j_superposition': { strategies: { straight: 50 } },

  // Even/Odd jokers (related strategies)
  'j_even_steven': { strategies: { pairs: 30 }, ranks: ['2', '4', '6', '8', '10'] },
  'j_odd_todd': { strategies: { pairs: 30 }, ranks: ['A', '3', '5', '7', '9'] },
  'j_walkie_talkie': { strategies: { pairs: 20 }, ranks: ['4', '10'] },

  // Economy jokers (no direct build affinity)
  'j_golden': { strategies: {} },
  'j_egg': { strategies: {} },
  'j_credit_card': { strategies: {} },
  'j_cloud_9': { strategies: {} },
  'j_rocket': { strategies: {} },
  'j_to_the_moon': { strategies: {} },
  'j_delayed_grat': { strategies: {} },
  'j_delayed_gratification': { strategies: {} },
  'j_chaos': { strategies: {} },
  'j_chaos_the_clown': { strategies: {} },
};

/**
 * Fibonacci ranks for detection
 */
const FIBONACCI_RANKS: Rank[] = ['2', '3', '5', '8', 'A'];

/**
 * Face card ranks for detection
 */
const FACE_RANKS: Rank[] = ['J', 'Q', 'K'];

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
   * Analyze flush strategy potential
   */
  private analyzeFlush(cards: Card[], jokers: JokerState[]): DetectedStrategy {
    const suitCounts = this.getSuitDistribution(cards);
    const totalCards = cards.length || 1;

    // Check for Smeared Joker - merges hearts/diamonds and clubs/spades
    const hasSmeared = jokers.some(j => j.id === 'j_smeared');

    // Find dominant suit (accounting for Smeared Joker suit merging)
    let dominantSuit: Suit = 'hearts';
    let maxCount = 0;
    let effectiveSuitConcentration: number;

    if (hasSmeared) {
      // Smeared: Hearts + Diamonds count together, Clubs + Spades count together
      const redCount = suitCounts.hearts + suitCounts.diamonds;
      const blackCount = suitCounts.clubs + suitCounts.spades;

      if (redCount >= blackCount) {
        maxCount = redCount;
        dominantSuit = suitCounts.hearts >= suitCounts.diamonds ? 'hearts' : 'diamonds';
      } else {
        maxCount = blackCount;
        dominantSuit = suitCounts.spades >= suitCounts.clubs ? 'spades' : 'clubs';
      }
      effectiveSuitConcentration = maxCount / totalCards;
    } else {
      // Normal suit counting
      for (const [suit, count] of Object.entries(suitCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantSuit = suit as Suit;
        }
      }
      effectiveSuitConcentration = maxCount / totalCards;
    }

    // Joker affinity score
    const jokerScore = this.calculateJokerAffinity(jokers, 'flush', dominantSuit);

    // Base confidence from deck composition (40% of score)
    // 25% concentration = 0, 50% = 50, 75% = 100
    const deckScore = Math.min(100, Math.max(0, (effectiveSuitConcentration - 0.25) * 200));

    // Combined score: 40% deck, 60% jokers
    const confidence = Math.round(deckScore * 0.4 + jokerScore * 0.6);

    // Build reasoning
    const reasons: string[] = [];
    if (hasSmeared) {
      reasons.push('Smeared Joker merges suits');
    }
    if (effectiveSuitConcentration >= 0.4) {
      reasons.push(`${Math.round(effectiveSuitConcentration * 100)}% ${dominantSuit}${hasSmeared ? ' (effective)' : ''}`);
    }
    const flushJokers = this.getJokersForStrategy(jokers, 'flush');
    if (flushJokers.length > 0) {
      reasons.push(`${flushJokers.length} flush joker(s)`);
    }

    // Calculate current strength
    const currentStrength = Math.round(
      (effectiveSuitConcentration >= 0.5 ? 50 : effectiveSuitConcentration * 100) +
      (flushJokers.length * 15)
    );

    return {
      type: 'flush',
      confidence,
      viability: this.calculateViability('flush', confidence, jokers),
      requirements: this.getFlushRequirements(effectiveSuitConcentration, flushJokers),
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

    const confidence = Math.round(deckScore * 0.3 + jokerScore * 0.7);

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
    const confidence = jokerScore;

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
    const confidence = jokerScore;

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

    const confidence = Math.round(deckScore * 0.3 + jokerScore * 0.7);

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

    const confidence = Math.round(Math.max(0, deckScore) * 0.3 + jokerScore * 0.7);

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
