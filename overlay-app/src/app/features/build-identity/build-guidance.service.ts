import { Injectable, inject, computed } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';
import { DetectedStrategy, StrategyType } from '../../../../../shared/models/strategy.model';
import { Card, Suit, Rank } from '../../../../../shared/models/card.model';
import { JokerState } from '../../../../../shared/models/joker.model';

/**
 * Guidance information for a detected build
 */
export interface BuildGuidance {
  buildName: string;
  description: string;
  whatThisMeans: string[];
  strongestAsset: {
    type: 'suit' | 'rank' | 'count';
    value: string;
    display: string;
  } | null;
  supportingJokers: string[];
  jokersNeeded: number;
}

/**
 * Display state for the build identity panel
 */
export interface BuildIdentityDisplay {
  primary: {
    type: StrategyType;
    confidence: number;
    guidance: BuildGuidance;
  } | null;
  secondary?: {
    type: StrategyType;
    confidence: number;
    guidance: BuildGuidance;
  };
  isHybrid: boolean;
  hybridAdvice?: string;
}

/**
 * Content definition for build types
 */
interface BuildContentEntry {
  name: string;
  description: string;
  whatThisMeans: string[];
  assetType: 'suit' | 'rank' | 'count' | null;
}

/**
 * Static content for all build types
 */
export const BUILD_CONTENT: Record<StrategyType, BuildContentEntry> = {
  flush: {
    name: 'Flush Build',
    description: "You're building around playing 5 cards of the same suit.",
    whatThisMeans: [
      'Play 5 cards of the same suit',
      'Keep cards of your strongest suit',
      'Discard off-suit cards freely',
    ],
    assetType: 'suit',
  },
  pairs: {
    name: 'Pairs Build',
    description: "You're building around pairs, three-of-a-kind, and multiples.",
    whatThisMeans: [
      'Play pairs, trips, or quads for big multipliers',
      'Keep duplicate ranks in your deck',
      'Look for jokers that trigger on multiples',
    ],
    assetType: 'rank',
  },
  straight: {
    name: 'Straights Build',
    description: "You're building around sequential card plays.",
    whatThisMeans: [
      'Play 5 consecutive ranks (e.g., 5-6-7-8-9)',
      'Keep connected cards together',
      'Avoid gaps in your rank coverage',
    ],
    assetType: null,
  },
  mult_stacking: {
    name: 'Mult Stacking',
    description: "You're stacking +mult jokers for consistent multipliers.",
    whatThisMeans: [
      'Each +mult joker adds to your base multiplier',
      'Works with any hand type',
      'Stack more +mult jokers for bigger scores',
    ],
    assetType: null,
  },
  xmult_scaling: {
    name: 'xMult Scaling',
    description: "You're using xMult jokers for exponential score growth.",
    whatThisMeans: [
      'xMult jokers multiply your score exponentially',
      'Trigger conditions matter - play the right hands',
      'Essential for beating late-game antes',
    ],
    assetType: null,
  },
  face_cards: {
    name: 'Face Cards Build',
    description: "You're building around Kings, Queens, and Jacks.",
    whatThisMeans: [
      'Prioritize playing face cards (J, Q, K)',
      'Keep face cards, remove number cards',
      'Face card jokers multiply with each other',
    ],
    assetType: 'count',
  },
  fibonacci: {
    name: 'Fibonacci Build',
    description: "You're using Fibonacci ranks (A, 2, 3, 5, 8) with special jokers.",
    whatThisMeans: [
      'Only Ace, 2, 3, 5, 8 count for fibonacci jokers',
      'Remove other ranks to increase fibonacci density',
      'Fibonacci joker is essential for this build',
    ],
    assetType: 'count',
  },
  chip_stacking: {
    name: 'Chip Stacking',
    description: "You're accumulating raw chips for high base scores.",
    whatThisMeans: [
      'Stack jokers that add +chips',
      'High chip base makes multipliers more effective',
      'Works well with any hand type',
    ],
    assetType: null,
  },
  retrigger: {
    name: 'Retrigger Build',
    description: "You're using jokers that retrigger card effects.",
    whatThisMeans: [
      'Retrigger jokers make cards score multiple times',
      'Pair with high-value individual cards',
      'Position matters - leftmost cards often retrigger',
    ],
    assetType: null,
  },
  economy: {
    name: 'Economy Focus',
    description: "You're focused on generating money.",
    whatThisMeans: [
      'Build up cash reserves for interest',
      'Economy jokers help in early-mid game',
      'Transition to scoring jokers late game',
    ],
    assetType: null,
  },
  even_steven: {
    name: 'Even Cards Build',
    description: "You're playing around even-numbered cards (2,4,6,8,10).",
    whatThisMeans: [
      'Keep even ranks: 2, 4, 6, 8, 10',
      'Remove odd ranks from your deck',
      'Even Steven joker is core to this build',
    ],
    assetType: 'count',
  },
  odd_todd: {
    name: 'Odd Cards Build',
    description: "You're playing around odd-numbered cards (A,3,5,7,9).",
    whatThisMeans: [
      'Keep odd ranks: A, 3, 5, 7, 9',
      'Remove even ranks from your deck',
      'Odd Todd joker is core to this build',
    ],
    assetType: 'count',
  },
  steel_scaling: {
    name: 'Steel Cards Build',
    description: "You're using Steel cards for xMult scaling.",
    whatThisMeans: [
      'Steel cards give xMult when held (not played)',
      'Add steel enhancement to valuable cards',
      'More steel cards = exponential scaling',
    ],
    assetType: 'count',
  },
  glass_cannon: {
    name: 'Glass Cannon Build',
    description: 'High risk, high reward with Glass cards.',
    whatThisMeans: [
      'Glass cards give x2 mult but can break',
      'High variance but huge potential',
      'Works best with card duplication effects',
    ],
    assetType: 'count',
  },
  hybrid: {
    name: 'Hybrid Build',
    description: 'You have multiple viable strategies.',
    whatThisMeans: [
      'Consider focusing on one build for consistency',
      'Or maintain flexibility with versatile jokers',
      'Watch for opportunities to commit',
    ],
    assetType: null,
  },
};

/**
 * Rank display names for UI
 */
const RANK_DISPLAY_NAMES: Record<Rank, string> = {
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
  'J': 'Jack',
  'Q': 'Queen',
  'K': 'King',
  'A': 'Ace',
};

/**
 * Suit display names for UI
 */
const SUIT_DISPLAY_NAMES: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

/**
 * Fibonacci ranks
 */
const FIBONACCI_RANKS: Rank[] = ['A', '2', '3', '5', '8'];

/**
 * Face card ranks
 */
const FACE_RANKS: Rank[] = ['J', 'Q', 'K'];

/**
 * Even ranks
 */
const EVEN_RANKS: Rank[] = ['2', '4', '6', '8', '10'];

/**
 * Odd ranks
 */
const ODD_RANKS: Rank[] = ['A', '3', '5', '7', '9'];

@Injectable({ providedIn: 'root' })
export class BuildGuidanceService {
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
   * Get guidance for a detected strategy
   */
  getGuidance(
    strategyType: StrategyType,
    detectedStrategy: DetectedStrategy,
    jokers: JokerState[]
  ): BuildGuidance {
    const content = BUILD_CONTENT[strategyType];
    const cards = this.allDeckCards();

    // Get supporting jokers from strategy (max 3)
    const keyJokerIds = detectedStrategy.keyJokers ?? [];
    const supportingJokers = this.getSupportingJokerNames(keyJokerIds, jokers).slice(0, 3);

    // Calculate jokers needed (0-3 range)
    const jokersNeeded = Math.max(0, Math.min(3, 3 - keyJokerIds.length));

    // Calculate strongest asset based on build type
    const strongestAsset = this.calculateStrongestAsset(
      strategyType,
      content.assetType,
      cards,
      detectedStrategy.suit
    );

    return {
      buildName: content.name,
      description: content.description,
      whatThisMeans: content.whatThisMeans.slice(0, 3),
      strongestAsset,
      supportingJokers,
      jokersNeeded,
    };
  }

  /**
   * Get advice for hybrid builds
   */
  getHybridAdvice(primaryConfidence: number, secondaryConfidence: number): string {
    const ratio = secondaryConfidence / primaryConfidence;

    if (ratio >= 0.85) {
      // Very close - suggest committing
      return 'Consider committing to one build for maximum synergy.';
    } else if (ratio >= 0.7) {
      // Close but primary is stronger
      return 'Focus on your primary build, but keep the secondary as a backup option.';
    } else {
      // Primary is clearly dominant
      return 'Maintain your primary focus while the secondary provides flexibility.';
    }
  }

  /**
   * Get joker names from IDs
   */
  private getSupportingJokerNames(jokerIds: string[], jokers: JokerState[]): string[] {
    const jokerMap = new Map(jokers.map(j => [j.id, j.name]));
    return jokerIds
      .map(id => jokerMap.get(id))
      .filter((name): name is string => name !== undefined);
  }

  /**
   * Calculate the strongest asset for display
   */
  private calculateStrongestAsset(
    strategyType: StrategyType,
    assetType: 'suit' | 'rank' | 'count' | null,
    cards: Card[],
    preferredSuit?: Suit
  ): BuildGuidance['strongestAsset'] {
    if (!assetType || cards.length === 0) {
      return null;
    }

    switch (assetType) {
      case 'suit':
        return this.calculateStrongestSuit(cards, preferredSuit);
      case 'rank':
        return this.calculateStrongestRank(cards);
      case 'count':
        return this.calculateCountAsset(strategyType, cards);
      default:
        return null;
    }
  }

  /**
   * Calculate the strongest suit in the deck
   */
  private calculateStrongestSuit(
    cards: Card[],
    preferredSuit?: Suit
  ): BuildGuidance['strongestAsset'] {
    const suitCounts: Record<Suit, number> = {
      hearts: 0,
      diamonds: 0,
      clubs: 0,
      spades: 0,
    };

    for (const card of cards) {
      suitCounts[card.suit]++;
    }

    // Find the max count
    let maxCount = 0;
    let strongestSuit: Suit = preferredSuit ?? 'hearts';

    for (const [suit, count] of Object.entries(suitCounts)) {
      const suitKey = suit as Suit;
      if (count > maxCount || (count === maxCount && suitKey === preferredSuit)) {
        maxCount = count;
        strongestSuit = suitKey;
      }
    }

    return {
      type: 'suit',
      value: strongestSuit,
      display: `${SUIT_DISPLAY_NAMES[strongestSuit]} (${maxCount} cards)`,
    };
  }

  /**
   * Calculate the rank with most duplicates
   */
  private calculateStrongestRank(cards: Card[]): BuildGuidance['strongestAsset'] {
    const rankCounts: Record<Rank, number> = {
      '2': 0, '3': 0, '4': 0, '5': 0, '6': 0,
      '7': 0, '8': 0, '9': 0, '10': 0,
      'J': 0, 'Q': 0, 'K': 0, 'A': 0,
    };

    for (const card of cards) {
      rankCounts[card.rank]++;
    }

    let maxCount = 0;
    let strongestRank: Rank = 'A';

    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count > maxCount) {
        maxCount = count;
        strongestRank = rank as Rank;
      }
    }

    return {
      type: 'rank',
      value: strongestRank,
      display: `${RANK_DISPLAY_NAMES[strongestRank]} (${maxCount} copies)`,
    };
  }

  /**
   * Calculate count-based assets (face cards, fibonacci, etc.)
   */
  private calculateCountAsset(
    strategyType: StrategyType,
    cards: Card[]
  ): BuildGuidance['strongestAsset'] {
    let count = 0;
    let label = '';

    switch (strategyType) {
      case 'face_cards':
        count = cards.filter(c => FACE_RANKS.includes(c.rank)).length;
        label = 'face cards';
        break;
      case 'fibonacci':
        count = cards.filter(c => FIBONACCI_RANKS.includes(c.rank)).length;
        label = 'fibonacci cards';
        break;
      case 'even_steven':
        count = cards.filter(c => EVEN_RANKS.includes(c.rank)).length;
        label = 'even cards';
        break;
      case 'odd_todd':
        count = cards.filter(c => ODD_RANKS.includes(c.rank)).length;
        label = 'odd cards';
        break;
      case 'steel_scaling':
        count = cards.filter(c => c.enhancement === 'steel').length;
        label = 'steel cards';
        break;
      case 'glass_cannon':
        count = cards.filter(c => c.enhancement === 'glass').length;
        label = 'glass cards';
        break;
      default:
        return null;
    }

    return {
      type: 'count',
      value: String(count),
      display: `${count} ${label}`,
    };
  }
}
