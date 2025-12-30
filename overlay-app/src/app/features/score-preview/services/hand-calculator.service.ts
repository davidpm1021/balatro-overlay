import { Injectable } from '@angular/core';
import {
  Card,
  Rank,
  Suit,
  HandType,
  HandLevel,
  BlindState,
  ScoreBreakdown,
  JokerEffect,
  JokerState,
} from '../../../../../../shared/models';

// Rank values for comparison and chip calculation
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

const RANK_ORDER: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Default hand values (used when handLevels not available from game)
const DEFAULT_HAND_VALUES: Record<HandType, { chips: number; mult: number }> = {
  high_card: { chips: 5, mult: 1 },
  pair: { chips: 10, mult: 2 },
  two_pair: { chips: 20, mult: 2 },
  three_of_a_kind: { chips: 30, mult: 3 },
  straight: { chips: 30, mult: 4 },
  flush: { chips: 35, mult: 4 },
  full_house: { chips: 40, mult: 4 },
  four_of_a_kind: { chips: 60, mult: 7 },
  straight_flush: { chips: 100, mult: 8 },
  royal_flush: { chips: 100, mult: 8 },
  five_of_a_kind: { chips: 120, mult: 12 },
  flush_house: { chips: 140, mult: 14 },
  flush_five: { chips: 160, mult: 16 },
};

export interface HandDetectionResult {
  handType: HandType;
  scoringCards: Card[];
}

@Injectable({ providedIn: 'root' })
export class HandCalculatorService {
  /**
   * Detect the poker hand type from a set of cards.
   * Returns the best hand type and which cards contribute to scoring.
   */
  detectHandType(cards: Card[]): HandDetectionResult {
    if (cards.length === 0) {
      return { handType: 'high_card', scoringCards: [] };
    }

    // Get counts and check for flush/straight
    const rankCounts = this.getRankCounts(cards);
    const suitCounts = this.getSuitCounts(cards);
    const isFlush = this.checkFlush(cards, suitCounts);
    const straightResult = this.checkStraight(cards);

    // Count pairs, trips, quads
    const counts = Object.values(rankCounts);
    const hasFive = counts.includes(5);
    const hasFour = counts.includes(4);
    const hasTrips = counts.includes(3);
    const pairCount = counts.filter(c => c === 2).length;

    // Detect hand type (highest to lowest priority)
    if (hasFive && isFlush) {
      return { handType: 'flush_five', scoringCards: this.getScoringCardsForRank(cards, rankCounts, 5) };
    }
    if (hasTrips && pairCount >= 1 && isFlush) {
      return { handType: 'flush_house', scoringCards: this.getFullHouseCards(cards, rankCounts) };
    }
    if (hasFive) {
      return { handType: 'five_of_a_kind', scoringCards: this.getScoringCardsForRank(cards, rankCounts, 5) };
    }
    if (isFlush && straightResult.isStraight) {
      const isRoyal = this.isRoyalStraight(straightResult.straightCards);
      return {
        handType: isRoyal ? 'royal_flush' : 'straight_flush',
        scoringCards: straightResult.straightCards
      };
    }
    if (hasFour) {
      return { handType: 'four_of_a_kind', scoringCards: this.getScoringCardsForRank(cards, rankCounts, 4) };
    }
    if (hasTrips && pairCount >= 1) {
      return { handType: 'full_house', scoringCards: this.getFullHouseCards(cards, rankCounts) };
    }
    if (isFlush) {
      return { handType: 'flush', scoringCards: this.getFlushCards(cards, suitCounts) };
    }
    if (straightResult.isStraight) {
      return { handType: 'straight', scoringCards: straightResult.straightCards };
    }
    if (hasTrips) {
      return { handType: 'three_of_a_kind', scoringCards: this.getScoringCardsForRank(cards, rankCounts, 3) };
    }
    if (pairCount >= 2) {
      return { handType: 'two_pair', scoringCards: this.getTwoPairCards(cards, rankCounts) };
    }
    if (pairCount === 1) {
      return { handType: 'pair', scoringCards: this.getScoringCardsForRank(cards, rankCounts, 2) };
    }

    // High card - only highest card scores
    const highCard = this.getHighCard(cards);
    return { handType: 'high_card', scoringCards: highCard ? [highCard] : [] };
  }

  /**
   * Calculate the full score breakdown for a hand.
   */
  calculateScore(
    cards: Card[],
    jokers: JokerState[],
    handLevels: HandLevel[],
    blind: BlindState | null
  ): ScoreBreakdown {
    const detection = this.detectHandType(cards);
    const { handType, scoringCards } = detection;

    // Get base chips and mult from hand level (or defaults)
    const handLevel = handLevels.find(hl => hl.handType === handType);
    const level = handLevel?.level ?? 1;
    const baseChips = handLevel?.baseChips ?? DEFAULT_HAND_VALUES[handType].chips;
    const baseMult = handLevel?.baseMult ?? DEFAULT_HAND_VALUES[handType].mult;

    // Calculate card chip contribution
    let cardChips = 0;
    for (const card of scoringCards) {
      cardChips += this.getCardChipValue(card);
    }

    // Apply card enhancements to chips and mult
    let totalChips = baseChips + cardChips;
    let totalMult = baseMult;

    for (const card of scoringCards) {
      const enhancement = this.getEnhancementEffect(card);
      totalChips += enhancement.chips;
      totalMult += enhancement.mult;
    }

    // Apply card editions
    for (const card of scoringCards) {
      const edition = this.getEditionEffect(card);
      totalChips += edition.chips;
      totalMult += edition.addMult;
      totalMult *= edition.xMult;
    }

    // Apply joker effects
    const jokerEffects: JokerEffect[] = [];
    for (const joker of jokers) {
      const effect = this.getJokerEffect(joker, scoringCards, handType);
      if (effect) {
        jokerEffects.push(effect);
        if (effect.effectType === 'chips') {
          totalChips += effect.value;
        } else if (effect.effectType === 'mult') {
          totalMult += effect.value;
        } else if (effect.effectType === 'xmult') {
          totalMult *= effect.value;
        }
      }
    }

    const finalScore = Math.floor(totalChips * totalMult);
    const blindGoal = blind?.chipGoal ?? 0;

    return {
      handType,
      handLevel: level,
      baseChips,
      baseMult,
      cardChips,
      jokerEffects,
      totalChips: Math.floor(totalChips),
      totalMult: Math.round(totalMult * 10) / 10,
      finalScore,
      blindGoal,
      willBeat: finalScore >= blindGoal,
      margin: finalScore - blindGoal,
    };
  }

  // --- Private helper methods ---

  private getRankCounts(cards: Card[]): Record<Rank, number> {
    const counts: Partial<Record<Rank, number>> = {};
    for (const card of cards) {
      const rank = this.getEffectiveRank(card);
      counts[rank] = (counts[rank] ?? 0) + 1;
    }
    return counts as Record<Rank, number>;
  }

  private getSuitCounts(cards: Card[]): Record<Suit, number> {
    const counts: Partial<Record<Suit, number>> = {};
    for (const card of cards) {
      counts[card.suit] = (counts[card.suit] ?? 0) + 1;
    }
    return counts as Record<Suit, number>;
  }

  private getEffectiveRank(card: Card): Rank {
    // Stone cards have no rank for hand detection
    if (card.enhancement === 'stone') {
      return card.rank; // Still count for chips but not for hand type
    }
    return card.rank;
  }

  private checkFlush(cards: Card[], suitCounts: Record<Suit, number>): boolean {
    // Need 5+ cards of same suit (wild cards count as any suit)
    const wildCount = cards.filter(c => c.enhancement === 'wild').length;
    for (const suit of Object.keys(suitCounts) as Suit[]) {
      const suitCards = cards.filter(c => c.suit === suit || c.enhancement === 'wild');
      if (suitCards.length >= 5) {
        return true;
      }
    }
    return false;
  }

  private getFlushCards(cards: Card[], suitCounts: Record<Suit, number>): Card[] {
    // Find the flush suit and return those cards
    for (const suit of Object.keys(suitCounts) as Suit[]) {
      const suitCards = cards.filter(c => c.suit === suit || c.enhancement === 'wild');
      if (suitCards.length >= 5) {
        return suitCards.slice(0, 5);
      }
    }
    return [];
  }

  private checkStraight(cards: Card[]): { isStraight: boolean; straightCards: Card[] } {
    if (cards.length < 5) {
      return { isStraight: false, straightCards: [] };
    }

    // Get unique ranks sorted by value
    const sortedCards = [...cards].sort((a, b) =>
      RANK_ORDER[b.rank] - RANK_ORDER[a.rank]
    );

    // Check for 5 consecutive ranks
    for (let i = 0; i <= sortedCards.length - 5; i++) {
      const slice = sortedCards.slice(i, i + 5);
      if (this.isConsecutive(slice)) {
        return { isStraight: true, straightCards: slice };
      }
    }

    // Check for A-2-3-4-5 (wheel)
    const hasAce = cards.some(c => c.rank === 'A');
    const has2 = cards.some(c => c.rank === '2');
    const has3 = cards.some(c => c.rank === '3');
    const has4 = cards.some(c => c.rank === '4');
    const has5 = cards.some(c => c.rank === '5');

    if (hasAce && has2 && has3 && has4 && has5) {
      const wheelCards = cards.filter(c =>
        c.rank === 'A' || c.rank === '2' || c.rank === '3' || c.rank === '4' || c.rank === '5'
      ).slice(0, 5);
      return { isStraight: true, straightCards: wheelCards };
    }

    return { isStraight: false, straightCards: [] };
  }

  private isConsecutive(cards: Card[]): boolean {
    const values = cards.map(c => RANK_ORDER[c.rank]);
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] - values[i] !== 1) {
        return false;
      }
    }
    return true;
  }

  private isRoyalStraight(cards: Card[]): boolean {
    const ranks = new Set(cards.map(c => c.rank));
    return ranks.has('A') && ranks.has('K') && ranks.has('Q') && ranks.has('J') && ranks.has('10');
  }

  private getScoringCardsForRank(cards: Card[], rankCounts: Record<Rank, number>, count: number): Card[] {
    for (const rank of Object.keys(rankCounts) as Rank[]) {
      if (rankCounts[rank] === count) {
        return cards.filter(c => c.rank === rank);
      }
    }
    return [];
  }

  private getTwoPairCards(cards: Card[], rankCounts: Record<Rank, number>): Card[] {
    const pairRanks = (Object.keys(rankCounts) as Rank[])
      .filter(rank => rankCounts[rank] === 2)
      .sort((a, b) => RANK_ORDER[b] - RANK_ORDER[a])
      .slice(0, 2);

    return cards.filter(c => pairRanks.includes(c.rank));
  }

  private getFullHouseCards(cards: Card[], rankCounts: Record<Rank, number>): Card[] {
    // Find the three-of-a-kind rank (highest if multiple)
    const tripsRank = (Object.keys(rankCounts) as Rank[])
      .filter(rank => rankCounts[rank] >= 3)
      .sort((a, b) => RANK_ORDER[b] - RANK_ORDER[a])[0];

    // Find the pair rank (highest that isn't the trips)
    const pairRank = (Object.keys(rankCounts) as Rank[])
      .filter(rank => rank !== tripsRank && rankCounts[rank] >= 2)
      .sort((a, b) => RANK_ORDER[b] - RANK_ORDER[a])[0];

    // Get exactly 3 cards of trips rank and 2 of pair rank
    const tripsCards = cards.filter(c => c.rank === tripsRank).slice(0, 3);
    const pairCards = cards.filter(c => c.rank === pairRank).slice(0, 2);

    return [...tripsCards, ...pairCards];
  }

  private getHighCard(cards: Card[]): Card | null {
    if (cards.length === 0) return null;
    return cards.reduce((highest, card) =>
      RANK_ORDER[card.rank] > RANK_ORDER[highest.rank] ? card : highest
    );
  }

  private getCardChipValue(card: Card): number {
    // Debuffed cards contribute 0 chips
    if (card.debuffed) {
      return 0;
    }
    // Stone cards give +50 chips but no rank value
    if (card.enhancement === 'stone') {
      return 50;
    }
    return RANK_VALUES[card.rank];
  }

  private getEnhancementEffect(card: Card): { chips: number; mult: number } {
    // Debuffed cards contribute no enhancement effects
    if (card.debuffed) {
      return { chips: 0, mult: 0 };
    }
    switch (card.enhancement) {
      case 'bonus': return { chips: 30, mult: 0 };
      case 'mult': return { chips: 0, mult: 4 };
      case 'glass': return { chips: 0, mult: 0 }; // x2 mult handled separately
      case 'steel': return { chips: 0, mult: 0 }; // x1.5 mult per steel in hand
      case 'gold': return { chips: 0, mult: 0 }; // $3 on scoring
      case 'lucky': return { chips: 0, mult: 0 }; // 1/5 +20 mult, 1/15 $20
      default: return { chips: 0, mult: 0 };
    }
  }

  private getEditionEffect(card: Card): { chips: number; addMult: number; xMult: number } {
    // Debuffed cards contribute no edition effects
    if (card.debuffed) {
      return { chips: 0, addMult: 0, xMult: 1 };
    }
    switch (card.edition) {
      case 'foil': return { chips: 50, addMult: 0, xMult: 1 };
      case 'holographic': return { chips: 0, addMult: 10, xMult: 1 };
      case 'polychrome': return { chips: 0, addMult: 0, xMult: 1.5 };
      default: return { chips: 0, addMult: 0, xMult: 1 };
    }
  }

  private getJokerEffect(
    joker: JokerState,
    scoringCards: Card[],
    handType: HandType
  ): JokerEffect | null {
    // Simplified joker effects - in reality each joker has unique logic
    // This provides a basic framework for common joker types
    const { id, name, effectValues } = joker;

    // Check for common effect patterns in effectValues
    if (effectValues['chips']) {
      return {
        jokerId: id,
        jokerName: name,
        effectType: 'chips',
        value: effectValues['chips'],
      };
    }

    if (effectValues['mult']) {
      return {
        jokerId: id,
        jokerName: name,
        effectType: 'mult',
        value: effectValues['mult'],
      };
    }

    if (effectValues['x_mult'] || effectValues['xmult']) {
      return {
        jokerId: id,
        jokerName: name,
        effectType: 'xmult',
        value: effectValues['x_mult'] ?? effectValues['xmult'] ?? 1,
      };
    }

    // Joker has no simple chip/mult effect
    return null;
  }
}
