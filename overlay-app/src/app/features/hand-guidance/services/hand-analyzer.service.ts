import { Injectable, inject, computed } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { ScoreEngineService, ScoringContext } from '../../../core/services/score-engine.service';
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
  debuffed: 'Debuffed - scores 0 chips',
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
  matches_secondary_build: 'Supports your {build} hybrid',
  face_card_jokers: 'Face card - synergizes with your jokers',
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
 * Hand strength classification
 */
export type HandStrength = 'weak' | 'medium' | 'strong' | 'excellent';

/**
 * Strategy recommendation result
 */
export interface StrategyRecommendation {
  primaryAction: 'play' | 'discard';
  confidence: 'low' | 'medium' | 'high';
  reason: string;
  handStrength: HandStrength;
  improvementPotential: number; // 0-100 estimate of how much better hand could be
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
  strategy: StrategyRecommendation;
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
  private scoreEngine = inject(ScoreEngineService);
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

    // Get hand level for the detected hand type
    const handLevels = this.handLevels();
    const handLevelEntry = handLevels.find(hl => hl.handType === handType);
    const handLevel = handLevelEntry?.level ?? 1;

    // Get held cards (cards in hand that aren't being played)
    const playedCardIds = new Set(scoringCards.map(c => c.id));
    const heldCards = hand.filter(c => !playedCardIds.has(c.id));

    // Build scoring context for accurate score calculation
    const scoringContext: ScoringContext = {
      playedCards: scoringCards,
      heldCards: heldCards,
      jokers: this.jokers(),
      handType: handType,
      handLevel: handLevel,
      discardsRemaining: this.gameState.discardsRemaining(),
      handsRemaining: this.gameState.handsRemaining(),
      money: this.gameState.money(),
      isLastHand: this.gameState.handsRemaining() === 1,
    };

    // Calculate projected score using comprehensive score engine
    const projectedScore = this.scoreEngine.calculateScore(scoringContext);

    const blindGoal = blind?.chipGoal ?? 0;
    const beatsBlind = projectedScore >= blindGoal;
    const margin = projectedScore - blindGoal;

    // Analyze each card in hand
    const analyzedCards = this.analyzeCards(hand, scoringCards, build);

    // Categorize cards by action
    const cardsToPlay = analyzedCards.filter(ac => ac.action === 'play');
    const cardsToDiscard = analyzedCards.filter(ac => ac.action === 'discard');
    const cardsToKeep = analyzedCards.filter(ac => ac.action === 'keep');

    // Get build context
    const buildContext = this.getBuildContext(build);

    // Evaluate strategy: should we play or discard?
    const strategy = this.evaluateDiscardStrategy(
      handType,
      projectedScore,
      blindGoal,
      beatsBlind,
      this.gameState.discardsRemaining(),
      this.gameState.handsRemaining(),
      cardsToDiscard.length,
      build
    );

    return {
      bestHand: {
        handType,
        handTypeLabel: HAND_TYPE_LABELS[handType],
        cards: scoringCards,
        projectedScore,
        beatsBlind,
        margin,
      },
      analyzedCards,
      cardsToPlay,
      cardsToDiscard,
      cardsToKeep,
      buildContext,
      strategy,
    };
  }

  /**
   * Find the best possible hand from a set of cards
   * Uses actual projected score (with hand levels + jokers) instead of poker rank
   * Considers all valid hand sizes (1-5 cards) since a high-level pair might
   * outscore a low-level flush when combined with joker bonuses
   *
   * NOTE: Debuffed cards ARE included in hand detection (they form hand types)
   * but they contribute 0 chips when scored (handled by ScoreEngineService)
   */
  private findBestHand(cards: Card[]): HandDetectionResult {
    // Include ALL cards for hand type detection
    // In Balatro, debuffed cards DO count for hand type formation (full house, flush, etc.)
    // They just contribute 0 chips when scored - ScoreEngineService already handles this correctly
    const playableCards = cards;

    if (playableCards.length === 0) {
      return { handType: 'high_card', scoringCards: [] };
    }

    // Generate all valid combinations (1 to 5 cards)
    // A pair of Kings might outscore a flush if pair level is high + face card jokers
    const combinations = this.getAllValidCombinations(playableCards);
    let bestResult: HandDetectionResult = { handType: 'high_card', scoringCards: [] };
    let bestProjectedScore = -1;

    for (const combo of combinations) {
      const result = this.handCalculator.detectHandType(combo);
      // Calculate actual projected score with hand levels and jokers
      const projectedScore = this.calculateCombinationScore(combo, result.handType, cards);

      if (projectedScore > bestProjectedScore) {
        bestProjectedScore = projectedScore;
        bestResult = result;
      }
    }

    return bestResult;
  }

  /**
   * Calculate projected score for a hand combination
   * Considers hand levels and joker effects for accurate comparison
   */
  private calculateCombinationScore(
    playedCards: Card[],
    handType: HandType,
    allHandCards: Card[]
  ): number {
    const handLevels = this.handLevels();
    const handLevelEntry = handLevels.find(hl => hl.handType === handType);
    const handLevel = handLevelEntry?.level ?? 1;

    const playedCardIds = new Set(playedCards.map(c => c.id));
    const heldCards = allHandCards.filter(c => !playedCardIds.has(c.id));

    const scoringContext: ScoringContext = {
      playedCards: playedCards,
      heldCards: heldCards,
      jokers: this.jokers(),
      handType: handType,
      handLevel: handLevel,
      discardsRemaining: this.gameState.discardsRemaining(),
      handsRemaining: this.gameState.handsRemaining(),
      money: this.gameState.money(),
      isLastHand: this.gameState.handsRemaining() === 1,
    };

    return this.scoreEngine.calculateScore(scoringContext);
  }

  /**
   * Generate all valid hand combinations (1 to 5 cards)
   * Includes subsets of all sizes to find optimal scoring hand
   */
  private getAllValidCombinations(cards: Card[]): Card[][] {
    const combinations: Card[][] = [];
    const maxSize = Math.min(5, cards.length);

    const combine = (start: number, current: Card[]) => {
      if (current.length > 0 && current.length <= maxSize) {
        combinations.push([...current]);
      }

      if (current.length === maxSize) {
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

      // Cards that form the best hand should be played (even if debuffed)
      // In Balatro, debuffed cards DO count for hand type formation (full house, flush, etc.)
      // They just contribute 0 chips when scored
      if (isPartOfBestHand) {
        return {
          card,
          action: 'play' as const,
          reason: card.debuffed
            ? 'Forms best hand (debuffed - 0 chips but counts for hand type)'
            : KEEP_REASONS.forms_best_hand,
          isPartOfBestHand: true,
        };
      }

      // Debuffed cards NOT part of best hand should be discarded
      if (card.debuffed) {
        return {
          card,
          action: 'discard' as const,
          reason: DISCARD_REASONS.debuffed,
          isPartOfBestHand: false,
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

    // Check primary build context
    if (build.primary) {
      const matchesBuild = this.cardMatchesBuild(card, build.primary);
      if (matchesBuild) {
        const buildName = BUILD_TYPE_DISPLAY[build.primary.type];
        return KEEP_REASONS.matches_build.replace('{build}', buildName);
      }
    }

    // Check secondary build for hybrids
    if (build.isHybrid && build.secondary) {
      const matchesSecondary = this.cardMatchesBuild(card, build.secondary);
      if (matchesSecondary) {
        const buildName = BUILD_TYPE_DISPLAY[build.secondary.type];
        return KEEP_REASONS.matches_secondary_build.replace('{build}', buildName);
      }
    }

    // Joker-aware fallback: Check if we have face card jokers and this is a face card
    // This helps even if build detection isn't perfect
    if (FACE_RANKS.includes(card.rank) && this.hasFaceCardJokers()) {
      return KEEP_REASONS.face_card_jokers;
    }

    // Check if high value card (Ace, King)
    if (card.rank === 'A' || card.rank === 'K') {
      return KEEP_REASONS.high_value;
    }

    return null;
  }

  /**
   * Check if the player has jokers that benefit from face cards
   */
  private hasFaceCardJokers(): boolean {
    const jokers = this.jokers();
    if (!jokers || jokers.length === 0) return false;

    // Known face card joker IDs (both with and without j_ prefix)
    const faceCardJokerIds = [
      'sock_and_buskin', 'j_sock_and_buskin',
      'smiley_face', 'j_smiley_face',
      'scary_face', 'j_scary_face',
      'photograph', 'j_photograph',
      'baron', 'j_baron',
      'triboulet', 'j_triboulet',
      'business_card', 'j_business_card',
      'hanging_chad', 'j_hanging_chad',
      'shoot_the_moon', 'j_shoot_the_moon',
      'pareidolia', 'j_pareidolia',
    ];

    return jokers.some(j => faceCardJokerIds.includes(j.id));
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
   * Evaluate whether to play the current best hand or discard to improve
   * This is the core strategic decision engine
   */
  private evaluateDiscardStrategy(
    handType: HandType,
    projectedScore: number,
    blindGoal: number,
    beatsBlind: boolean,
    discardsRemaining: number,
    handsRemaining: number,
    discardableCards: number,
    build: DetectedBuild
  ): StrategyRecommendation {
    // Classify hand strength
    const handStrength = this.classifyHandStrength(handType, projectedScore, blindGoal);

    // Calculate improvement potential based on hand type and build
    const improvementPotential = this.calculateImprovementPotential(handType, discardableCards, build);

    // Decision logic
    let primaryAction: 'play' | 'discard' = 'play';
    let confidence: 'low' | 'medium' | 'high' = 'medium';
    let reason = '';

    // Case 1: No discards left - must play
    if (discardsRemaining === 0) {
      primaryAction = 'play';
      confidence = 'high';
      reason = 'No discards remaining - play your best hand';
    }
    // Case 2: Last hand - must score enough
    else if (handsRemaining === 1) {
      if (beatsBlind) {
        primaryAction = 'play';
        confidence = 'high';
        reason = 'Last hand and you beat the blind - play now!';
      } else {
        // Last hand but doesn't beat blind - risky discard
        if (handStrength === 'weak' && discardableCards > 0) {
          primaryAction = 'discard';
          confidence = 'low';
          reason = `Last hand but ${projectedScore.toLocaleString()} won't beat ${blindGoal.toLocaleString()} - discard to try for better`;
        } else {
          primaryAction = 'play';
          confidence = 'low';
          reason = 'Last hand - play and hope for joker effects';
        }
      }
    }
    // Case 3: Strong hand that beats blind - play it
    else if (beatsBlind && (handStrength === 'strong' || handStrength === 'excellent')) {
      primaryAction = 'play';
      confidence = 'high';
      reason = `${HAND_TYPE_LABELS[handType]} beats the blind comfortably`;
    }
    // Case 4: Beats blind but weak hand - consider playing to save discards
    else if (beatsBlind && handStrength === 'weak') {
      // If we have plenty of hands left, might be worth playing weak hands
      if (handsRemaining >= 3) {
        primaryAction = 'play';
        confidence = 'medium';
        reason = 'Beats blind - play to save discards for harder blinds';
      } else {
        primaryAction = 'play';
        confidence = 'medium';
        reason = 'Beats blind - take the safe play';
      }
    }
    // Case 5: Beats blind, medium hand - play
    else if (beatsBlind) {
      primaryAction = 'play';
      confidence = 'high';
      reason = `${HAND_TYPE_LABELS[handType]} beats the blind`;
    }
    // Case 6: Doesn't beat blind - evaluate discard vs play
    else {
      // How far off are we?
      const shortfall = blindGoal - projectedScore;
      const percentShort = (shortfall / blindGoal) * 100;

      if (handStrength === 'weak' && discardableCards > 0 && discardsRemaining > 0) {
        primaryAction = 'discard';
        confidence = improvementPotential > 50 ? 'high' : 'medium';
        reason = `${HAND_TYPE_LABELS[handType]} only scores ${projectedScore.toLocaleString()} - discard to improve`;
      } else if (handStrength === 'medium' && percentShort > 50 && discardsRemaining >= 2) {
        primaryAction = 'discard';
        confidence = 'medium';
        reason = `Need ${shortfall.toLocaleString()} more - worth trying to improve`;
      } else if (handsRemaining > 1) {
        // Multiple hands left - can play weak hand and try again
        primaryAction = 'play';
        confidence = 'medium';
        reason = `Play now - you have ${handsRemaining - 1} more hands to try`;
      } else {
        // Tough spot - low hands, doesn't beat blind
        if (discardableCards > 0 && discardsRemaining > 0) {
          primaryAction = 'discard';
          confidence = 'low';
          reason = `${projectedScore.toLocaleString()} isn't enough - discard and hope`;
        } else {
          primaryAction = 'play';
          confidence = 'low';
          reason = 'Best available option';
        }
      }
    }

    return {
      primaryAction,
      confidence,
      reason,
      handStrength,
      improvementPotential,
    };
  }

  /**
   * Classify the strength of a hand relative to expectations
   */
  private classifyHandStrength(handType: HandType, projectedScore: number, blindGoal: number): HandStrength {
    // Base hand type ranking
    const handRank = this.getHandTypeScore(handType);

    // How much we beat/miss the blind by
    const blindRatio = blindGoal > 0 ? projectedScore / blindGoal : 1;

    // Combine hand type rank with blind performance
    if (blindRatio >= 2 || handRank >= 8) {
      return 'excellent';
    } else if (blindRatio >= 1.2 || handRank >= 5) {
      return 'strong';
    } else if (blindRatio >= 0.7 || handRank >= 3) {
      return 'medium';
    } else {
      return 'weak';
    }
  }

  /**
   * Estimate the potential for improvement if we discard
   * Returns 0-100 indicating likelihood of significant improvement
   */
  private calculateImprovementPotential(
    currentHandType: HandType,
    discardableCards: number,
    build: DetectedBuild
  ): number {
    if (discardableCards === 0) return 0;

    const currentRank = this.getHandTypeScore(currentHandType);

    // Base potential from hand type - weaker hands have more room to improve
    let potential = Math.max(0, 80 - (currentRank * 10));

    // More discardable cards = more potential
    potential += Math.min(20, discardableCards * 5);

    // Build alignment increases potential (we know what we're looking for)
    if (build.primary && build.primary.confidence > 50) {
      potential += 10;
    }

    return Math.min(100, potential);
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
