import { Injectable, inject, computed } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { HandCalculatorService, HandDetectionResult } from '../../score-preview/services/hand-calculator.service';
import { BuildDetectorService, DetectedBuild } from '../../strategy-intelligence/services/build-detector.service';
import {
  Card,
  DeckState,
  BlindState,
  HandType,
  Suit,
  Rank,
  HandLevel,
  JokerState,
} from '../../../../../../shared/models';
import { StrategyType, DetectedStrategy } from '../../../../../../shared/models';

/**
 * Hand type display labels
 */
const HAND_TYPE_LABELS: Record<HandType, string> = {
  high_card: 'High Card',
  pair: 'Pair',
  two_pair: 'Two Pair',
  three_of_a_kind: 'Three of a Kind',
  straight: 'Straight',
  flush: 'Flush',
  full_house: 'Full House',
  four_of_a_kind: 'Four of a Kind',
  straight_flush: 'Straight Flush',
  royal_flush: 'Royal Flush',
  five_of_a_kind: 'Five of a Kind',
  flush_house: 'Flush House',
  flush_five: 'Flush Five',
};

/**
 * Discard reason templates
 */
const DISCARD_REASONS = {
  off_suit: 'Off-suit for your {suit} flush build',
  no_pairs: "No duplicates - can't form pairs",
  breaks_sequence: "Doesn't connect for straights",
  not_face_card: 'Not a face card (your build uses J, Q, K)',
  low_value: 'Low value, expendable',
  not_in_best_hand: 'Not part of best playable hand',
};

/**
 * Keep reason templates
 */
const KEEP_REASONS = {
  forms_best_hand: 'Part of your best hand',
  matches_build: 'Matches your {build} build',
  has_enhancement: 'Has {enhancement} enhancement',
  has_edition: 'Has {edition} edition',
  has_seal: 'Has {seal} seal',
  high_value: 'High value card',
};

/**
 * Analyzed card with action recommendation
 */
export interface AnalyzedCard {
  card: Card;
  action: 'play' | 'keep' | 'discard';
  reason: string;
  isPartOfBestHand: boolean;
}

/**
 * Complete hand analysis result
 */
export interface HandAnalysis {
  bestHand: {
    handType: HandType;
    handTypeLabel: string;
    cards: Card[];
    projectedScore: number;
    beatsBlind: boolean;
    margin: number;
  };
  analyzedCards: AnalyzedCard[];
  cardsToPlay: AnalyzedCard[];
  cardsToDiscard: AnalyzedCard[];
  cardsToKeep: AnalyzedCard[];
  buildContext: {
    buildType: StrategyType | null;
    buildName: string;
  };
}

/**
 * Suit display names
 */
const SUIT_DISPLAY: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

/**
 * Build type display names
 */
const BUILD_TYPE_DISPLAY: Record<StrategyType, string> = {
  flush: 'Flush',
  straight: 'Straight',
  pairs: 'Pairs',
  mult_stacking: 'Mult Stacking',
  xmult_scaling: 'xMult Scaling',
  chip_stacking: 'Chip Stacking',
  fibonacci: 'Fibonacci',
  even_steven: 'Even Steven',
  odd_todd: 'Odd Todd',
  face_cards: 'Face Cards',
  steel_scaling: 'Steel Scaling',
  glass_cannon: 'Glass Cannon',
  retrigger: 'Retrigger',
  economy: 'Economy',
  hybrid: 'Hybrid',
};

/**
 * Rank values for card comparison
 */
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/**
 * Face card ranks
 */
const FACE_RANKS: Rank[] = ['J', 'Q', 'K'];

/**
 * Fibonacci ranks
 */
const FIBONACCI_RANKS: Rank[] = ['2', '3', '5', '8', 'A'];

@Injectable({ providedIn: 'root' })
export class HandAnalyzerService {
  private gameState = inject(GameStateService);
  private handCalculator = inject(HandCalculatorService);
  private buildDetector = inject(BuildDetectorService);

  /**
   * Current hand from game state
   */
  private currentHand = this.gameState.hand;

  /**
   * Current blind from game state
   */
  private currentBlind = this.gameState.blind;

  /**
   * Current hand levels from game state
   */
  private handLevels = this.gameState.handLevels;

  /**
   * Current jokers from game state
   */
  private jokers = this.gameState.jokers;

  /**
   * Detected build from build detector
   */
  private detectedBuild = this.buildDetector.detectedBuild;

  /**
   * Computed hand analysis - updates automatically when dependencies change
   */
  analysis = computed<HandAnalysis | null>(() => {
    const hand = this.currentHand();
    const blind = this.currentBlind();
    const build = this.detectedBuild();

    if (!hand || hand.length === 0) {
      return null;
    }

    return this.analyzeHand(hand, blind, build);
  });

  /**
   * Analyze the current hand and provide recommendations
   */
  analyzeHand(
    hand: Card[],
    blind: BlindState | null,
    build: DetectedBuild
  ): HandAnalysis {
    // Find the best hand using hand calculator
    const bestHandResult = this.findBestHand(hand);
    const { handType, scoringCards } = bestHandResult;

    // Calculate projected score
    const scoreBreakdown = this.handCalculator.calculateScore(
      scoringCards,
      this.jokers(),
      this.handLevels(),
      blind
    );

    const blindGoal = blind?.chipGoal ?? 0;
    const beatsBlind = scoreBreakdown.finalScore >= blindGoal;
    const margin = scoreBreakdown.finalScore - blindGoal;

    // Analyze each card in hand
    const analyzedCards = this.analyzeCards(hand, scoringCards, build);

    // Categorize cards by action
    const cardsToPlay = analyzedCards.filter(ac => ac.action === 'play');
    const cardsToDiscard = analyzedCards.filter(ac => ac.action === 'discard');
    const cardsToKeep = analyzedCards.filter(ac => ac.action === 'keep');

    // Get build context
    const buildContext = this.getBuildContext(build);

    return {
      bestHand: {
        handType,
        handTypeLabel: HAND_TYPE_LABELS[handType],
        cards: scoringCards,
        projectedScore: scoreBreakdown.finalScore,
        beatsBlind,
        margin,
      },
      analyzedCards,
      cardsToPlay,
      cardsToDiscard,
      cardsToKeep,
      buildContext,
    };
  }

  /**
   * Find the best possible hand from a set of cards
   */
  private findBestHand(cards: Card[]): HandDetectionResult {
    if (cards.length <= 5) {
      return this.handCalculator.detectHandType(cards);
    }

    // For more than 5 cards, we need to find the best 5-card combination
    const combinations = this.get5CardCombinations(cards);
    let bestResult: HandDetectionResult = { handType: 'high_card', scoringCards: [] };
    let bestScore = -1;

    for (const combo of combinations) {
      const result = this.handCalculator.detectHandType(combo);
      const score = this.getHandTypeScore(result.handType);

      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      } else if (score === bestScore) {
        // Same hand type - compare by card values for tiebreaker
        const currentTotal = this.getTotalCardValue(result.scoringCards);
        const bestTotal = this.getTotalCardValue(bestResult.scoringCards);
        if (currentTotal > bestTotal) {
          bestResult = result;
        }
      }
    }

    return bestResult;
  }

  /**
   * Generate all 5-card combinations from a set of cards
   */
  private get5CardCombinations(cards: Card[]): Card[][] {
    const combinations: Card[][] = [];

    const combine = (start: number, current: Card[]) => {
      if (current.length === 5) {
        combinations.push([...current]);
        return;
      }

      for (let i = start; i < cards.length; i++) {
        current.push(cards[i]);
        combine(i + 1, current);
        current.pop();
      }
    };

    combine(0, []);
    return combinations;
  }

  /**
   * Get numeric score for hand type (for comparison)
   */
  private getHandTypeScore(handType: HandType): number {
    const scores: Record<HandType, number> = {
      high_card: 1,
      pair: 2,
      two_pair: 3,
      three_of_a_kind: 4,
      straight: 5,
      flush: 6,
      full_house: 7,
      four_of_a_kind: 8,
      straight_flush: 9,
      royal_flush: 10,
      five_of_a_kind: 11,
      flush_house: 12,
      flush_five: 13,
    };
    return scores[handType];
  }

  /**
   * Get total card value for tiebreaking
   */
  private getTotalCardValue(cards: Card[]): number {
    return cards.reduce((sum, card) => sum + RANK_VALUES[card.rank], 0);
  }

  /**
   * Analyze each card and categorize as play/keep/discard
   */
  private analyzeCards(
    hand: Card[],
    bestHandCards: Card[],
    build: DetectedBuild
  ): AnalyzedCard[] {
    const bestHandIds = new Set(bestHandCards.map(c => c.id));

    return hand.map(card => {
      const isPartOfBestHand = bestHandIds.has(card.id);

      if (isPartOfBestHand) {
        return {
          card,
          action: 'play' as const,
          reason: KEEP_REASONS.forms_best_hand,
          isPartOfBestHand: true,
        };
      }

      // Check if card should be kept based on build/enhancements
      const keepReason = this.getKeepReason(card, build);
      if (keepReason) {
        return {
          card,
          action: 'keep' as const,
          reason: keepReason,
          isPartOfBestHand: false,
        };
      }

      // Otherwise, recommend discarding
      const discardReason = this.getDiscardReason(card, build);
      return {
        card,
        action: 'discard' as const,
        reason: discardReason,
        isPartOfBestHand: false,
      };
    });
  }

  /**
   * Determine if a card should be kept and why
   */
  private getKeepReason(card: Card, build: DetectedBuild): string | null {
    // Check for special card attributes first
    if (card.enhancement && card.enhancement !== 'none') {
      return KEEP_REASONS.has_enhancement.replace('{enhancement}', card.enhancement);
    }

    if (card.edition && card.edition !== 'none') {
      return KEEP_REASONS.has_edition.replace('{edition}', card.edition);
    }

    if (card.seal && card.seal !== 'none') {
      return KEEP_REASONS.has_seal.replace('{seal}', card.seal);
    }

    // Check build context
    if (build.primary) {
      const matchesBuild = this.cardMatchesBuild(card, build.primary);
      if (matchesBuild) {
        const buildName = BUILD_TYPE_DISPLAY[build.primary.type];
        return KEEP_REASONS.matches_build.replace('{build}', buildName);
      }
    }

    // Check if high value card (Ace, King)
    if (card.rank === 'A' || card.rank === 'K') {
      return KEEP_REASONS.high_value;
    }

    return null;
  }

  /**
   * Determine why a card should be discarded
   */
  private getDiscardReason(card: Card, build: DetectedBuild): string {
    if (build.primary) {
      const buildType = build.primary.type;
      const suit = build.primary.suit;

      switch (buildType) {
        case 'flush':
          if (suit && card.suit !== suit) {
            return DISCARD_REASONS.off_suit.replace('{suit}', SUIT_DISPLAY[suit]);
          }
          break;

        case 'face_cards':
          if (!FACE_RANKS.includes(card.rank)) {
            return DISCARD_REASONS.not_face_card;
          }
          break;

        case 'fibonacci':
          if (!FIBONACCI_RANKS.includes(card.rank)) {
            return DISCARD_REASONS.low_value;
          }
          break;

        case 'pairs':
          return DISCARD_REASONS.no_pairs;

        case 'straight':
          return DISCARD_REASONS.breaks_sequence;
      }
    }

    // Default reason
    return DISCARD_REASONS.not_in_best_hand;
  }

  /**
   * Check if a card matches the current build strategy
   */
  private cardMatchesBuild(card: Card, strategy: DetectedStrategy): boolean {
    switch (strategy.type) {
      case 'flush':
        return strategy.suit ? card.suit === strategy.suit : false;

      case 'pairs':
        // For pairs, any card could potentially match
        return true;

      case 'face_cards':
        return FACE_RANKS.includes(card.rank);

      case 'fibonacci':
        return FIBONACCI_RANKS.includes(card.rank);

      case 'straight':
        // For straights, keep all cards until more context is available
        return true;

      default:
        return false;
    }
  }

  /**
   * Get build context for display
   */
  private getBuildContext(build: DetectedBuild): { buildType: StrategyType | null; buildName: string } {
    if (!build.primary) {
      return { buildType: null, buildName: 'No build detected' };
    }

    return {
      buildType: build.primary.type,
      buildName: BUILD_TYPE_DISPLAY[build.primary.type],
    };
  }
}
