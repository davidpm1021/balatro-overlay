import { Injectable, computed, signal } from '@angular/core';
import {
  Card,
  Rank,
  Suit,
  Enhancement,
  Edition,
  HandType,
  HandLevel,
  JokerState,
} from '../../../../../shared/models';
import scoringReference from '../../data/scoring-reference.json';

/**
 * Individual step in score calculation for breakdown display
 */
export interface ScoreStep {
  source: string;
  sourceId?: string;
  type: 'base' | 'card_chips' | 'enhancement' | 'edition' | 'held_effect' | 'joker_chips' | 'joker_mult' | 'joker_xmult';
  chips: number;
  mult: number;
  xmult: number;
  runningChips: number;
  runningMult: number;
  description?: string;
}

/**
 * Score projection for hands with random elements (Lucky cards, etc.)
 */
export interface ScoreProjection {
  min: number;
  avg: number;
  max: number;
  luckyTriggers: number;
  expectedLuckyTriggers: number;
}

/**
 * Context for scoring - cards in hand, played cards, game state
 */
export interface ScoringContext {
  playedCards: Card[];
  heldCards: Card[];
  jokers: JokerState[];
  handType: HandType;
  handLevel: number;
  discardsRemaining?: number;
  handsRemaining?: number;
  money?: number;
  deckSize?: number;
  isLastHand?: boolean;
  ante?: number;
}

/**
 * Reference data types
 */
interface BaseHandData {
  baseChips: number;
  baseMult: number;
  chipsPerLevel: number;
  multPerLevel: number;
}

interface EnhancementData {
  chips: number;
  mult: number;
  xmult: number;
  heldInHand?: boolean;
  luckyMult?: number;
  luckyChance?: number;
  breakChance?: number;
  noRank?: boolean;
  money?: number;
}

interface EditionData {
  chips: number;
  mult: number;
  xmult: number;
}

interface JokerEffect {
  chips?: number;
  mult?: number | { min: number; max: number };
  xmult?: number;
  condition?: string;
  effect?: string;
  chance?: number;
  handSize?: number;
  discards?: number;
  hands?: number;
  money?: number;
  destroyChance?: number;
}

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11,
};

const FIBONACCI_RANKS: Rank[] = ['A', '2', '3', '5', '8'];
const EVEN_RANKS: Rank[] = ['2', '4', '6', '8', '10'];
const ODD_RANKS: Rank[] = ['A', '3', '5', '7', '9'];
const FACE_RANKS: Rank[] = ['J', 'Q', 'K'];

@Injectable({ providedIn: 'root' })
export class ScoreEngineService {
  private readonly baseHands = scoringReference.baseHands as Record<string, BaseHandData>;
  private readonly cardChips = scoringReference.cardChips as Record<string, number>;
  private readonly enhancements = scoringReference.enhancements as Record<string, EnhancementData>;
  private readonly editions = scoringReference.editions as Record<string, EditionData>;
  private readonly jokerEffects = scoringReference.jokerEffects as Record<string, JokerEffect>;

  /**
   * Calculate the final score for a hand
   */
  calculateScore(context: ScoringContext): number {
    const breakdown = this.calculateBreakdown(context);
    const lastStep = breakdown[breakdown.length - 1];
    return Math.floor(lastStep.runningChips * lastStep.runningMult);
  }

  /**
   * Calculate detailed breakdown of score calculation
   * Order: Base -> Card Chips -> Enhancements -> Editions -> Held Effects -> Jokers
   */
  calculateBreakdown(context: ScoringContext): ScoreStep[] {
    const steps: ScoreStep[] = [];
    let chips = 0;
    let mult = 0;

    // 1. Base hand chips + mult
    const baseData = this.getHandBaseValues(context.handType, context.handLevel);
    chips = baseData.chips;
    mult = baseData.mult;

    steps.push({
      source: `${this.formatHandType(context.handType)} (Lv.${context.handLevel})`,
      type: 'base',
      chips: baseData.chips,
      mult: baseData.mult,
      xmult: 1,
      runningChips: chips,
      runningMult: mult,
    });

    // 2. Card chips (left to right) - only scoring cards
    const scoringCards = this.getScoringCards(context.playedCards, context.handType);
    for (const card of scoringCards) {
      if (card.debuffed) continue;

      const cardChipValue = this.getCardChips(card);
      if (cardChipValue > 0) {
        chips += cardChipValue;
        steps.push({
          source: `${card.rank}${this.getSuitSymbol(card.suit)}`,
          sourceId: card.id,
          type: 'card_chips',
          chips: cardChipValue,
          mult: 0,
          xmult: 1,
          runningChips: chips,
          runningMult: mult,
        });
      }
    }

    // 3. Card enhancements (left to right)
    for (const card of scoringCards) {
      if (card.debuffed) continue;

      const enhData = this.enhancements[card.enhancement];
      if (enhData && (enhData.chips > 0 || enhData.mult > 0)) {
        chips += enhData.chips;
        mult += enhData.mult;
        steps.push({
          source: `${card.rank}${this.getSuitSymbol(card.suit)} ${card.enhancement}`,
          sourceId: card.id,
          type: 'enhancement',
          chips: enhData.chips,
          mult: enhData.mult,
          xmult: 1,
          runningChips: chips,
          runningMult: mult,
          description: `${card.enhancement} enhancement`,
        });
      }
    }

    // 4. Card editions (left to right) - chips and mult only, xmult later
    for (const card of scoringCards) {
      if (card.debuffed) continue;

      const editionData = this.editions[card.edition];
      if (editionData && (editionData.chips > 0 || editionData.mult > 0)) {
        chips += editionData.chips;
        mult += editionData.mult;
        steps.push({
          source: `${card.rank}${this.getSuitSymbol(card.suit)} ${card.edition}`,
          sourceId: card.id,
          type: 'edition',
          chips: editionData.chips,
          mult: editionData.mult,
          xmult: 1,
          runningChips: chips,
          runningMult: mult,
          description: `${card.edition} edition`,
        });
      }
    }

    // 5. Glass card xMult (scored cards)
    for (const card of scoringCards) {
      if (card.debuffed) continue;
      if (card.enhancement === 'glass') {
        mult *= 2;
        steps.push({
          source: `${card.rank}${this.getSuitSymbol(card.suit)} Glass`,
          sourceId: card.id,
          type: 'enhancement',
          chips: 0,
          mult: 0,
          xmult: 2,
          runningChips: chips,
          runningMult: mult,
          description: 'Glass x2 Mult',
        });
      }
    }

    // 6. Card edition xMult (polychrome)
    for (const card of scoringCards) {
      if (card.debuffed) continue;
      const editionData = this.editions[card.edition];
      if (editionData && editionData.xmult > 1) {
        mult *= editionData.xmult;
        steps.push({
          source: `${card.rank}${this.getSuitSymbol(card.suit)} ${card.edition}`,
          sourceId: card.id,
          type: 'edition',
          chips: 0,
          mult: 0,
          xmult: editionData.xmult,
          runningChips: chips,
          runningMult: mult,
          description: `${card.edition} x${editionData.xmult} Mult`,
        });
      }
    }

    // 7. Held-in-hand effects (Steel cards, Baron, Shoot the Moon)
    const heldEffects = this.calculateHeldEffects(context);
    for (const effect of heldEffects) {
      if (effect.xmult > 1) {
        mult *= effect.xmult;
      } else {
        chips += effect.chips;
        mult += effect.mult;
      }
      steps.push({
        source: effect.source,
        sourceId: effect.sourceId,
        type: 'held_effect',
        chips: effect.chips,
        mult: effect.mult,
        xmult: effect.xmult,
        runningChips: chips,
        runningMult: mult,
        description: effect.description,
      });
    }

    // 8. Joker effects (LEFT TO RIGHT - order matters!)
    // First pass: +chips
    for (const joker of context.jokers) {
      const jokerChips = this.getJokerChips(joker, context);
      if (jokerChips > 0) {
        chips += jokerChips;
        steps.push({
          source: joker.name,
          sourceId: joker.id,
          type: 'joker_chips',
          chips: jokerChips,
          mult: 0,
          xmult: 1,
          runningChips: chips,
          runningMult: mult,
        });
      }
    }

    // Second pass: +mult
    for (const joker of context.jokers) {
      const jokerMult = this.getJokerMult(joker, context);
      if (jokerMult > 0) {
        mult += jokerMult;
        steps.push({
          source: joker.name,
          sourceId: joker.id,
          type: 'joker_mult',
          chips: 0,
          mult: jokerMult,
          xmult: 1,
          runningChips: chips,
          runningMult: mult,
        });
      }
    }

    // Third pass: xMult (multiplicative)
    for (const joker of context.jokers) {
      const jokerXMult = this.getJokerXMult(joker, context);
      if (jokerXMult > 1) {
        mult *= jokerXMult;
        steps.push({
          source: joker.name,
          sourceId: joker.id,
          type: 'joker_xmult',
          chips: 0,
          mult: 0,
          xmult: jokerXMult,
          runningChips: chips,
          runningMult: mult,
        });
      }
    }

    // Joker edition chips and mult (foil = +50 chips, holographic = +10 mult)
    for (const joker of context.jokers) {
      const editionData = this.editions[joker.edition];
      if (editionData && (editionData.chips > 0 || editionData.mult > 0)) {
        chips += editionData.chips;
        mult += editionData.mult;
        steps.push({
          source: `${joker.name} (${joker.edition})`,
          sourceId: joker.id,
          type: 'edition',
          chips: editionData.chips,
          mult: editionData.mult,
          xmult: 1,
          runningChips: chips,
          runningMult: mult,
        });
      }
    }

    // Joker edition xMult (polychrome = x1.5)
    for (const joker of context.jokers) {
      const editionData = this.editions[joker.edition];
      if (editionData && editionData.xmult > 1) {
        mult *= editionData.xmult;
        steps.push({
          source: `${joker.name} (${joker.edition})`,
          sourceId: joker.id,
          type: 'joker_xmult',
          chips: 0,
          mult: 0,
          xmult: editionData.xmult,
          runningChips: chips,
          runningMult: mult,
        });
      }
    }

    return steps;
  }

  /**
   * Project score range for hands with random elements
   */
  projectScore(context: ScoringContext): ScoreProjection {
    // Count Lucky cards in scoring cards
    const scoringCards = this.getScoringCards(context.playedCards, context.handType);
    const luckyCards = scoringCards.filter(c => c.enhancement === 'lucky' && !c.debuffed);
    const luckyCount = luckyCards.length;

    // Check for Oops! All 6s (doubles probabilities)
    const hasOops = context.jokers.some(j => j.id === 'j_oops');
    const luckyChance = hasOops ? 0.4 : 0.2;

    // Base calculation (no lucky triggers)
    const baseScore = this.calculateScore(context);

    if (luckyCount === 0) {
      return { min: baseScore, avg: baseScore, max: baseScore, luckyTriggers: 0, expectedLuckyTriggers: 0 };
    }

    // Calculate with all lucky triggers for max
    const luckyMult = 20;
    const maxExtraMult = luckyCount * luckyMult;

    // Get base values
    const breakdown = this.calculateBreakdown(context);
    const lastStep = breakdown[breakdown.length - 1];
    const baseMult = lastStep.runningMult;
    const baseChips = lastStep.runningChips;

    const minScore = baseScore;
    const maxScore = Math.floor(baseChips * (baseMult + maxExtraMult));
    const expectedTriggers = luckyCount * luckyChance;
    const avgExtraMult = expectedTriggers * luckyMult;
    const avgScore = Math.floor(baseChips * (baseMult + avgExtraMult));

    return {
      min: minScore,
      avg: avgScore,
      max: maxScore,
      luckyTriggers: luckyCount,
      expectedLuckyTriggers: expectedTriggers,
    };
  }

  /**
   * Get base chips and mult for a hand type at a given level
   */
  getHandBaseValues(handType: HandType, level: number): { chips: number; mult: number } {
    const data = this.baseHands[handType];
    if (!data) {
      return { chips: 0, mult: 0 };
    }

    const levelBonus = Math.max(0, level - 1);
    return {
      chips: data.baseChips + levelBonus * data.chipsPerLevel,
      mult: data.baseMult + levelBonus * data.multPerLevel,
    };
  }

  /**
   * Get chip value for a card (base rank + stone bonus)
   */
  private getCardChips(card: Card): number {
    if (card.enhancement === 'stone') {
      return 50; // Stone cards have flat 50 chips, no rank
    }
    return RANK_VALUES[card.rank] || 0;
  }

  /**
   * Determine which cards score based on hand type
   */
  private getScoringCards(playedCards: Card[], handType: HandType): Card[] {
    // For most hands, all played cards score
    // This is a simplified version - full implementation would need hand detection
    return playedCards.filter(c => !c.faceDown);
  }

  /**
   * Calculate held-in-hand effects
   */
  private calculateHeldEffects(context: ScoringContext): Array<{
    source: string;
    sourceId?: string;
    chips: number;
    mult: number;
    xmult: number;
    description: string;
  }> {
    const effects: Array<{
      source: string;
      sourceId?: string;
      chips: number;
      mult: number;
      xmult: number;
      description: string;
    }> = [];

    // Steel cards in hand
    for (const card of context.heldCards) {
      if (card.debuffed) continue;
      if (card.enhancement === 'steel') {
        effects.push({
          source: `${card.rank}${this.getSuitSymbol(card.suit)} Steel`,
          sourceId: card.id,
          chips: 0,
          mult: 0,
          xmult: 1.5,
          description: 'Steel card x1.5 Mult',
        });
      }
    }

    // Baron (Kings held in hand)
    const hasBaronJoker = context.jokers.some(j => j.id === 'j_baron');
    if (hasBaronJoker) {
      const kingsHeld = context.heldCards.filter(c => c.rank === 'K' && !c.debuffed);
      for (const king of kingsHeld) {
        effects.push({
          source: `Baron (${king.rank}${this.getSuitSymbol(king.suit)})`,
          sourceId: king.id,
          chips: 0,
          mult: 0,
          xmult: 1.5,
          description: 'Baron: King held x1.5 Mult',
        });
      }
    }

    // Shoot the Moon (Queens held in hand)
    const hasShootMoon = context.jokers.some(j => j.id === 'j_shoot_the_moon');
    if (hasShootMoon) {
      const queensHeld = context.heldCards.filter(c => c.rank === 'Q' && !c.debuffed);
      for (const queen of queensHeld) {
        effects.push({
          source: `Shoot the Moon (${queen.rank}${this.getSuitSymbol(queen.suit)})`,
          sourceId: queen.id,
          chips: 0,
          mult: 13,
          xmult: 1,
          description: 'Shoot the Moon: Queen held +13 Mult',
        });
      }
    }

    // Raised Fist (lowest card held in hand)
    const hasRaisedFist = context.jokers.some(j => j.id === 'j_raised_fist');
    if (hasRaisedFist) {
      const nonDebuffedHeld = context.heldCards.filter(c => !c.debuffed && c.enhancement !== 'stone');
      if (nonDebuffedHeld.length > 0) {
        // Find lowest ranked card
        const lowestCard = nonDebuffedHeld.reduce((lowest, card) => {
          const cardValue = RANK_VALUES[card.rank];
          const lowestValue = RANK_VALUES[lowest.rank];
          return cardValue < lowestValue ? card : lowest;
        });
        // Raised Fist gives 2× the rank value as mult
        const raisedFistMult = RANK_VALUES[lowestCard.rank] * 2;
        effects.push({
          source: `Raised Fist (${lowestCard.rank}${this.getSuitSymbol(lowestCard.suit)})`,
          sourceId: lowestCard.id,
          chips: 0,
          mult: raisedFistMult,
          xmult: 1,
          description: `Raised Fist: Lowest held card gives +${raisedFistMult} Mult`,
        });
      }
    }

    return effects;
  }

  /**
   * Get chips from a joker based on its effect and conditions
   */
  private getJokerChips(joker: JokerState, context: ScoringContext): number {
    const effect = this.jokerEffects[joker.id];
    if (!effect || !effect.chips) return 0;

    const chips = typeof effect.chips === 'number' ? effect.chips : 0;

    if (!effect.condition) return chips;

    return this.evaluateJokerCondition(effect.condition, chips, joker, context, 'chips');
  }

  /**
   * Get mult from a joker based on its effect and conditions
   */
  private getJokerMult(joker: JokerState, context: ScoringContext): number {
    const effect = this.jokerEffects[joker.id];
    if (!effect) return 0;

    let baseMult = 0;
    if (typeof effect.mult === 'number') {
      baseMult = effect.mult;
    } else if (effect.mult && typeof effect.mult === 'object') {
      // Random mult (like Misprint)
      baseMult = (effect.mult.min + effect.mult.max) / 2;
    }

    if (baseMult === 0) return 0;
    if (!effect.condition) return baseMult;

    return this.evaluateJokerCondition(effect.condition, baseMult, joker, context, 'mult');
  }

  /**
   * Get xMult from a joker based on its effect and conditions
   */
  private getJokerXMult(joker: JokerState, context: ScoringContext): number {
    const effect = this.jokerEffects[joker.id];
    if (!effect || !effect.xmult) return 1;

    // Scaling jokers use their scalingValue
    if (joker.isScaling && joker.scalingValue !== undefined) {
      // For scaling xMult jokers, the xmult in effect is the increment per trigger
      const baseXMult = 1 + (effect.xmult * joker.scalingValue);
      return baseXMult;
    }

    if (!effect.condition) return 1 + effect.xmult;

    return this.evaluateJokerCondition(effect.condition, effect.xmult, joker, context, 'xmult');
  }

  /**
   * Evaluate joker conditions and return the effect value if met
   */
  private evaluateJokerCondition(
    condition: string,
    value: number,
    joker: JokerState,
    context: ScoringContext,
    effectType: 'chips' | 'mult' | 'xmult'
  ): number {
    const scoringCards = this.getScoringCards(context.playedCards, context.handType);
    const defaultReturn = effectType === 'xmult' ? 1 : 0;

    switch (condition) {
      // Suit conditions
      case 'diamond_scored':
        const diamonds = scoringCards.filter(c => c.suit === 'diamonds' && !c.debuffed);
        return diamonds.length > 0 ? value * diamonds.length : defaultReturn;

      case 'heart_scored':
        const hearts = scoringCards.filter(c => c.suit === 'hearts' && !c.debuffed);
        return hearts.length > 0 ? value * hearts.length : defaultReturn;

      case 'spade_scored':
        const spades = scoringCards.filter(c => c.suit === 'spades' && !c.debuffed);
        return spades.length > 0 ? value * spades.length : defaultReturn;

      case 'club_scored':
        const clubs = scoringCards.filter(c => c.suit === 'clubs' && !c.debuffed);
        return clubs.length > 0 ? value * clubs.length : defaultReturn;

      // Hand type conditions
      case 'pair_in_hand':
      case 'two_pair_in_hand':
      case 'three_of_a_kind_in_hand':
      case 'straight_in_hand':
      case 'flush_in_hand':
      case 'four_of_a_kind_in_hand':
        return this.handTypeMatches(condition, context.handType)
          ? (effectType === 'xmult' ? 1 + value : value)
          : defaultReturn;

      // Rank conditions
      case 'face_card_scored':
        const faceCards = scoringCards.filter(c => FACE_RANKS.includes(c.rank) && !c.debuffed);
        return faceCards.length > 0 ? value * faceCards.length : defaultReturn;

      case 'fibonacci_card_scored':
        const fibCards = scoringCards.filter(c => FIBONACCI_RANKS.includes(c.rank) && !c.debuffed);
        return fibCards.length > 0 ? value * fibCards.length : defaultReturn;

      case 'even_card_scored':
        const evenCards = scoringCards.filter(c => EVEN_RANKS.includes(c.rank) && !c.debuffed);
        return evenCards.length > 0 ? value * evenCards.length : defaultReturn;

      case 'odd_card_scored':
        const oddCards = scoringCards.filter(c => ODD_RANKS.includes(c.rank) && !c.debuffed);
        return oddCards.length > 0 ? value * oddCards.length : defaultReturn;

      case 'ace_scored':
        const aces = scoringCards.filter(c => c.rank === 'A' && !c.debuffed);
        return aces.length > 0 ? value * aces.length : defaultReturn;

      case '10_or_4_scored':
        const tens_fours = scoringCards.filter(c => (c.rank === '10' || c.rank === '4') && !c.debuffed);
        return tens_fours.length > 0 ? value * tens_fours.length : defaultReturn;

      case 'first_face_card':
        const firstFace = scoringCards.find(c => FACE_RANKS.includes(c.rank) && !c.debuffed);
        return firstFace ? (effectType === 'xmult' ? 1 + value : value) : defaultReturn;

      case 'king_or_queen_scored':
        const kingsQueens = scoringCards.filter(c => (c.rank === 'K' || c.rank === 'Q') && !c.debuffed);
        return kingsQueens.length > 0
          ? (effectType === 'xmult' ? Math.pow(1 + value, kingsQueens.length) : value * kingsQueens.length)
          : defaultReturn;

      // Game state conditions
      case 'per_discard_remaining':
        return (context.discardsRemaining || 0) * value;

      case 'zero_discards_remaining':
        return context.discardsRemaining === 0
          ? (effectType === 'xmult' ? 1 + value : value)
          : defaultReturn;

      case 'final_hand_of_round':
        return context.isLastHand
          ? (effectType === 'xmult' ? 1 + value : value)
          : defaultReturn;

      case 'hand_lte_3_cards':
        return context.playedCards.length <= 3
          ? (effectType === 'xmult' ? 1 + value : value)
          : defaultReturn;

      case 'per_joker':
        return context.jokers.length * value;

      case 'per_money':
        return Math.floor((context.money || 0) * value);

      case 'per_5_money':
        return Math.floor((context.money || 0) / 5) * value;

      case 'per_remaining_deck':
        return (context.deckSize || 0) * value;

      case 'all_held_black':
        const allBlack = context.heldCards.every(c => c.suit === 'spades' || c.suit === 'clubs');
        return allBlack && context.heldCards.length > 0
          ? (effectType === 'xmult' ? 1 + value : value)
          : defaultReturn;

      case 'per_king_held':
        const kingsHeld = context.heldCards.filter(c => c.rank === 'K' && !c.debuffed);
        return kingsHeld.length > 0
          ? (effectType === 'xmult' ? Math.pow(1 + value, kingsHeld.length) : value * kingsHeld.length)
          : defaultReturn;

      case 'per_queen_held':
        const queensHeld = context.heldCards.filter(c => c.rank === 'Q' && !c.debuffed);
        return queensHeld.length * value;

      case 'per_uncommon_joker':
        const uncommonJokers = context.jokers.filter(j => j.rarity === 'uncommon');
        return uncommonJokers.length > 0
          ? (effectType === 'xmult' ? Math.pow(1 + value, uncommonJokers.length) : value * uncommonJokers.length)
          : defaultReturn;

      case '16_enhanced_cards_in_deck':
        // This would need deck state - for now return the xmult if condition assumed met
        return effectType === 'xmult' ? 1 + value : value;

      case 'club_and_other_suit_played':
        const hasClub = scoringCards.some(c => c.suit === 'clubs' && !c.debuffed);
        const hasOther = scoringCards.some(c => c.suit !== 'clubs' && !c.debuffed);
        return hasClub && hasOther
          ? (effectType === 'xmult' ? 1 + value : value)
          : defaultReturn;

      case 'each_suit_played':
        const suits = new Set(scoringCards.filter(c => !c.debuffed).map(c => c.suit));
        return suits.size === 4
          ? (effectType === 'xmult' ? 1 + value : value)
          : defaultReturn;

      case 'same_hand_type_this_round':
        // Would need round history - assume condition met for now
        return effectType === 'xmult' ? 1 + value : value;

      // Scaling conditions - use scalingValue from joker state
      case 'scaling_no_face_played':
      case 'scaling_straight_played':
      case 'scaling_4_card_hands':
      case 'scaling_consecutive_non_most_played':
      case 'scaling_planet_used':
      case 'scaling_card_added_to_deck':
      case 'scaling_eat_enhancement':
      case 'scaling_skip_booster':
      case 'scaling_sell_card':
      case 'scaling_blind_skipped':
      case 'scaling_lucky_triggered':
      case 'scaling_per_reroll':
      case 'scaling_face_card_destroyed':
      case 'scaling_2_scored':
      case 'scaling_jack_discarded':
      case 'scaling_per_23_discards':
      case 'scaling_per_hand_per_discard':
        if (joker.isScaling && joker.scalingValue !== undefined) {
          return effectType === 'xmult'
            ? 1 + (value * joker.scalingValue)
            : value * joker.scalingValue;
        }
        return defaultReturn;

      // Raised Fist: Double the rank of lowest held card → Mult
      case 'double_lowest_held_rank':
        const nonDebuffedHeld = context.heldCards.filter(c => !c.debuffed && c.enhancement !== 'stone');
        if (nonDebuffedHeld.length === 0) return defaultReturn;
        // Find lowest ranked card
        const lowestCard = nonDebuffedHeld.reduce((lowest, card) => {
          const cardValue = RANK_VALUES[card.rank];
          const lowestValue = RANK_VALUES[lowest.rank];
          return cardValue < lowestValue ? card : lowest;
        });
        // Raised Fist gives 2× the rank value as mult
        const raisedFistMult = RANK_VALUES[lowestCard.rank] * 2;
        return effectType === 'mult' ? raisedFistMult : defaultReturn;

      default:
        // Unknown condition - DON'T apply effect (safer than over-projecting)
        return defaultReturn;
    }
  }

  /**
   * Check if a condition matches the current hand type
   */
  private handTypeMatches(condition: string, handType: HandType): boolean {
    const handTypeMap: Record<string, HandType[]> = {
      'pair_in_hand': ['pair', 'two_pair', 'three_of_a_kind', 'full_house', 'four_of_a_kind', 'five_of_a_kind', 'flush_house', 'flush_five'],
      'two_pair_in_hand': ['two_pair', 'full_house', 'flush_house'],
      'three_of_a_kind_in_hand': ['three_of_a_kind', 'full_house', 'four_of_a_kind', 'five_of_a_kind', 'flush_house', 'flush_five'],
      'straight_in_hand': ['straight', 'straight_flush', 'royal_flush'],
      'flush_in_hand': ['flush', 'straight_flush', 'royal_flush', 'flush_house', 'flush_five'],
      'four_of_a_kind_in_hand': ['four_of_a_kind', 'five_of_a_kind', 'flush_five'],
    };

    const validTypes = handTypeMap[condition] || [];
    return validTypes.includes(handType);
  }

  /**
   * Format hand type for display
   */
  private formatHandType(handType: HandType): string {
    return handType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get suit symbol for display
   */
  private getSuitSymbol(suit: Suit): string {
    const symbols: Record<Suit, string> = {
      hearts: '\u2665',
      diamonds: '\u2666',
      clubs: '\u2663',
      spades: '\u2660',
    };
    return symbols[suit] || suit;
  }

  /**
   * Detect hand type from played cards
   */
  detectHandType(cards: Card[]): HandType {
    if (cards.length === 0) return 'high_card';

    const ranks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);

    const rankCounts = this.countOccurrences(ranks);
    const suitCounts = this.countOccurrences(suits);

    const maxRankCount = Math.max(...Object.values(rankCounts));
    const uniqueRanks = Object.keys(rankCounts).length;
    const isFlush = Object.values(suitCounts).some(count => count >= 5);
    const isStraight = this.checkStraight(ranks);

    // Five of a Kind
    if (maxRankCount >= 5) {
      if (isFlush) return 'flush_five';
      return 'five_of_a_kind';
    }

    // Straight Flush / Royal Flush
    if (isFlush && isStraight) {
      if (ranks.includes('A') && ranks.includes('K')) {
        return 'royal_flush';
      }
      return 'straight_flush';
    }

    // Four of a Kind
    if (maxRankCount === 4) return 'four_of_a_kind';

    // Full House
    const counts = Object.values(rankCounts);
    if (counts.includes(3) && counts.includes(2)) {
      if (isFlush) return 'flush_house';
      return 'full_house';
    }

    // Flush
    if (isFlush) return 'flush';

    // Straight
    if (isStraight) return 'straight';

    // Three of a Kind
    if (maxRankCount === 3) return 'three_of_a_kind';

    // Two Pair
    if (counts.filter(c => c === 2).length >= 2) return 'two_pair';

    // Pair
    if (maxRankCount === 2) return 'pair';

    return 'high_card';
  }

  private countOccurrences<T>(arr: T[]): Record<string, number> {
    return arr.reduce((acc, val) => {
      const key = String(val);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private checkStraight(ranks: Rank[]): boolean {
    const rankOrder: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const indices = ranks.map(r => rankOrder.indexOf(r)).filter(i => i !== -1);
    const sorted = [...new Set(indices)].sort((a, b) => a - b);

    if (sorted.length < 5) return false;

    // Check for 5 consecutive
    for (let i = 0; i <= sorted.length - 5; i++) {
      if (sorted[i + 4] - sorted[i] === 4) return true;
    }

    // Check for wheel (A-2-3-4-5)
    const wheel = [0, 1, 2, 3, 4];
    if (wheel.every(i => sorted.includes(i)) ||
        (sorted.includes(13) && [1, 2, 3, 4].every(i => sorted.includes(i)))) {
      return true;
    }

    return false;
  }
}
