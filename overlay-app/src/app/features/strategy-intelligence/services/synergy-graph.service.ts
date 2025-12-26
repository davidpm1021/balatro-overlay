/**
 * Synergy Graph Service
 *
 * Manages joker synergy relationships and calculates synergy scores
 * between jokers in the player's collection and potential purchases.
 *
 * TODO: Full implementation with synergy data loading from JSON
 */

import { Injectable, signal, computed } from '@angular/core';
import { JokerSynergy, JokerSynergyRelation } from '../../../../../../shared/models/synergy.model';
import { SynergyStrength } from '../../../../../../shared/models/strategy.model';
import { JokerState } from '../../../../../../shared/models/joker.model';

export interface SynergyScore {
  jokerId: string;
  score: number;
  relations: JokerSynergyRelation[];
}

const SYNERGY_STRENGTH_VALUES: Record<SynergyStrength, number> = {
  strong: 30,
  medium: 20,
  weak: 10
};

/**
 * Built-in synergy database for common joker combinations.
 * This is a subset - full data would be loaded from JSON.
 */
const JOKER_SYNERGIES: Record<string, Partial<JokerSynergy>> = {
  // Suit-based jokers synergize with each other
  'j_lusty_joker': {
    synergiesWith: [
      { jokerId: 'j_bloodstone', strength: 'strong', reason: 'Both benefit from Hearts' },
      { jokerId: 'j_droll', strength: 'medium', reason: 'Flush hands with Hearts' },
      { jokerId: 'j_tribe', strength: 'medium', reason: 'Flush hands with Hearts' }
    ],
    tags: ['suit-hearts', 'mult-add']
  },
  'j_greedy_joker': {
    synergiesWith: [
      { jokerId: 'j_rough_gem', strength: 'strong', reason: 'Both benefit from Diamonds' },
      { jokerId: 'j_droll', strength: 'medium', reason: 'Flush hands with Diamonds' },
      { jokerId: 'j_tribe', strength: 'medium', reason: 'Flush hands with Diamonds' }
    ],
    tags: ['suit-diamonds', 'mult-add']
  },
  'j_wrathful_joker': {
    synergiesWith: [
      { jokerId: 'j_arrowhead', strength: 'strong', reason: 'Both benefit from Spades' },
      { jokerId: 'j_blackboard', strength: 'strong', reason: 'Spades for dark suit bonus' },
      { jokerId: 'j_droll', strength: 'medium', reason: 'Flush hands with Spades' }
    ],
    tags: ['suit-spades', 'mult-add']
  },
  'j_gluttonous_joker': {
    synergiesWith: [
      { jokerId: 'j_onyx_agate', strength: 'strong', reason: 'Both benefit from Clubs' },
      { jokerId: 'j_blackboard', strength: 'strong', reason: 'Clubs for dark suit bonus' },
      { jokerId: 'j_seeing_double', strength: 'medium', reason: 'Club requirement' }
    ],
    tags: ['suit-clubs', 'mult-add']
  },
  // Pair-based jokers
  'j_jolly': {
    synergiesWith: [
      { jokerId: 'j_sly', strength: 'strong', reason: 'Both trigger on Pair' },
      { jokerId: 'j_duo', strength: 'strong', reason: 'Both need Pair hands' },
      { jokerId: 'j_trousers', strength: 'medium', reason: 'Two Pair contains pairs' }
    ],
    tags: ['hand-pair', 'mult-add']
  },
  'j_duo': {
    synergiesWith: [
      { jokerId: 'j_jolly', strength: 'strong', reason: 'Both trigger on Pair' },
      { jokerId: 'j_sly', strength: 'strong', reason: 'Both need Pair hands' }
    ],
    tags: ['hand-pair', 'mult-x']
  },
  // Straight-based jokers
  'j_crazy': {
    synergiesWith: [
      { jokerId: 'j_devious', strength: 'strong', reason: 'Both trigger on Straight' },
      { jokerId: 'j_order', strength: 'strong', reason: 'Both need Straight hands' },
      { jokerId: 'j_runner', strength: 'strong', reason: 'Runner scales on Straights' },
      { jokerId: 'j_four_fingers', strength: 'strong', reason: 'Easier Straights' },
      { jokerId: 'j_shortcut', strength: 'strong', reason: 'Easier Straights' }
    ],
    tags: ['hand-straight', 'mult-add']
  },
  'j_order': {
    synergiesWith: [
      { jokerId: 'j_crazy', strength: 'strong', reason: 'Both need Straights' },
      { jokerId: 'j_devious', strength: 'strong', reason: 'Both need Straights' },
      { jokerId: 'j_runner', strength: 'strong', reason: 'Runner grows with Straights' }
    ],
    tags: ['hand-straight', 'mult-x']
  },
  // Flush-based jokers
  'j_droll': {
    synergiesWith: [
      { jokerId: 'j_crafty', strength: 'strong', reason: 'Both trigger on Flush' },
      { jokerId: 'j_tribe', strength: 'strong', reason: 'Both need Flush hands' },
      { jokerId: 'j_four_fingers', strength: 'strong', reason: 'Easier Flushes' }
    ],
    tags: ['hand-flush', 'mult-add']
  },
  'j_tribe': {
    synergiesWith: [
      { jokerId: 'j_droll', strength: 'strong', reason: 'Both need Flushes' },
      { jokerId: 'j_crafty', strength: 'strong', reason: 'Both need Flushes' }
    ],
    tags: ['hand-flush', 'mult-x']
  },
  // Three of a Kind
  'j_zany': {
    synergiesWith: [
      { jokerId: 'j_wily', strength: 'strong', reason: 'Both trigger on Three of a Kind' },
      { jokerId: 'j_trio', strength: 'strong', reason: 'Both need Three of a Kind' }
    ],
    tags: ['hand-three', 'mult-add']
  },
  'j_trio': {
    synergiesWith: [
      { jokerId: 'j_zany', strength: 'strong', reason: 'Both need Three of a Kind' },
      { jokerId: 'j_wily', strength: 'strong', reason: 'Both need Three of a Kind' }
    ],
    tags: ['hand-three', 'mult-x']
  },
  // Scaling jokers
  'j_ride_the_bus': {
    synergiesWith: [
      { jokerId: 'j_pareidolia', strength: 'strong', reason: 'Pareidolia makes all cards face cards - breaks Bus!' },
      { jokerId: 'j_fibonacci', strength: 'medium', reason: 'Fibonacci ranks avoid face cards' }
    ],
    tags: ['scaling', 'mult-add', 'no-face']
  },
  'j_fibonacci': {
    synergiesWith: [
      { jokerId: 'j_scholar', strength: 'medium', reason: 'Aces are Fibonacci' },
      { jokerId: 'j_even_steven', strength: 'medium', reason: '2, 8 overlap' },
      { jokerId: 'j_odd_todd', strength: 'medium', reason: '3, 5, A overlap' }
    ],
    tags: ['fibonacci', 'mult-add']
  },
  // Face card jokers
  'j_scary_face': {
    synergiesWith: [
      { jokerId: 'j_smiley', strength: 'strong', reason: 'Both benefit from face cards' },
      { jokerId: 'j_photograph', strength: 'strong', reason: 'Both trigger on face cards' },
      { jokerId: 'j_sock_and_buskin', strength: 'strong', reason: 'Retrigger face cards' },
      { jokerId: 'j_pareidolia', strength: 'strong', reason: 'All cards become face cards' },
      { jokerId: 'j_baron', strength: 'strong', reason: 'Kings are face cards' },
      { jokerId: 'j_triboulet', strength: 'strong', reason: 'Kings/Queens are face cards' }
    ],
    tags: ['face-cards', 'chips-add']
  },
  'j_pareidolia': {
    synergiesWith: [
      { jokerId: 'j_scary_face', strength: 'strong', reason: 'All cards give face bonus' },
      { jokerId: 'j_smiley', strength: 'strong', reason: 'All cards give face bonus' },
      { jokerId: 'j_business', strength: 'strong', reason: 'More money chances' },
      { jokerId: 'j_sock_and_buskin', strength: 'strong', reason: 'All cards retrigger' }
    ],
    tags: ['face-cards', 'enabler']
  },
  // Economy jokers
  'j_golden': {
    synergiesWith: [
      { jokerId: 'j_to_the_moon', strength: 'strong', reason: 'More money = more interest' },
      { jokerId: 'j_bull', strength: 'medium', reason: 'More money = more chips' },
      { jokerId: 'j_bootstraps', strength: 'medium', reason: 'More money = more mult' }
    ],
    tags: ['economy', 'money']
  },
  'j_to_the_moon': {
    synergiesWith: [
      { jokerId: 'j_golden', strength: 'strong', reason: 'Generates money to earn interest on' },
      { jokerId: 'j_cloud_9', strength: 'medium', reason: 'Both generate money' },
      { jokerId: 'j_rocket', strength: 'medium', reason: 'Both generate money' }
    ],
    tags: ['economy', 'interest']
  },
  // Retrigger jokers
  'j_sock_and_buskin': {
    synergiesWith: [
      { jokerId: 'j_pareidolia', strength: 'strong', reason: 'Retrigger ALL cards' },
      { jokerId: 'j_scary_face', strength: 'strong', reason: 'Retrigger face cards for more chips' },
      { jokerId: 'j_smiley', strength: 'strong', reason: 'Retrigger face cards for more mult' },
      { jokerId: 'j_triboulet', strength: 'strong', reason: 'Retrigger Kings/Queens' }
    ],
    tags: ['retrigger', 'face-cards']
  },
  'j_hanging_chad': {
    synergiesWith: [
      { jokerId: 'j_photograph', strength: 'strong', reason: 'Retrigger first face card' },
      { jokerId: 'j_scholar', strength: 'strong', reason: 'Retrigger Aces' }
    ],
    tags: ['retrigger', 'first-card']
  },
  'j_dusk': {
    synergiesWith: [
      { jokerId: 'j_acrobat', strength: 'strong', reason: 'Both trigger on final hand' },
      { jokerId: 'j_hack', strength: 'medium', reason: 'More retriggers on 2-5' }
    ],
    tags: ['retrigger', 'final-hand']
  },
  // xMult jokers
  'j_cavendish': {
    synergiesWith: [
      { jokerId: 'j_oops', strength: 'strong', reason: 'Lower destruction chance' },
      { jokerId: 'j_loyalty_card', strength: 'medium', reason: 'Both provide xMult' }
    ],
    tags: ['mult-x', 'risky']
  },
  'j_photograph': {
    synergiesWith: [
      { jokerId: 'j_scary_face', strength: 'strong', reason: 'Both trigger on face cards' },
      { jokerId: 'j_hanging_chad', strength: 'strong', reason: 'Retrigger first face card' },
      { jokerId: 'j_pareidolia', strength: 'strong', reason: 'First card always face' }
    ],
    tags: ['mult-x', 'face-cards', 'first-card']
  },
  // Copy jokers
  'j_blueprint': {
    synergiesWith: [
      { jokerId: 'j_brainstorm', strength: 'strong', reason: 'Copy chain potential' }
    ],
    tags: ['copy', 'position-right']
  },
  'j_brainstorm': {
    synergiesWith: [
      { jokerId: 'j_blueprint', strength: 'strong', reason: 'Copy chain potential' }
    ],
    tags: ['copy', 'position-left']
  },
  // Special synergies
  'j_four_fingers': {
    synergiesWith: [
      { jokerId: 'j_crazy', strength: 'strong', reason: 'Easier Straights' },
      { jokerId: 'j_order', strength: 'strong', reason: 'Easier Straights' },
      { jokerId: 'j_droll', strength: 'strong', reason: 'Easier Flushes' },
      { jokerId: 'j_tribe', strength: 'strong', reason: 'Easier Flushes' },
      { jokerId: 'j_seance', strength: 'strong', reason: 'Easier Straight Flush' }
    ],
    tags: ['enabler', 'hand-modifier']
  },
  'j_shortcut': {
    synergiesWith: [
      { jokerId: 'j_crazy', strength: 'strong', reason: 'Easier Straights' },
      { jokerId: 'j_order', strength: 'strong', reason: 'Easier Straights' },
      { jokerId: 'j_runner', strength: 'strong', reason: 'More Straights = more chips' }
    ],
    tags: ['enabler', 'hand-modifier', 'straight']
  }
};

@Injectable({ providedIn: 'root' })
export class SynergyGraphService {
  private readonly synergyData = signal<Record<string, Partial<JokerSynergy>>>(JOKER_SYNERGIES);

  /**
   * Get synergy data for a specific joker.
   */
  getSynergyData(jokerId: string): Partial<JokerSynergy> | null {
    const data = this.synergyData();
    return data[jokerId] ?? null;
  }

  /**
   * Calculate synergy score between a candidate joker and owned jokers.
   * Returns a score from 0-100 based on how well the jokers work together.
   */
  calculateSynergyScore(candidateId: string, ownedJokers: JokerState[]): SynergyScore {
    const candidateSynergies = this.getSynergyData(candidateId);
    const relations: JokerSynergyRelation[] = [];
    let totalScore = 0;

    // Check direct synergies from candidate to owned jokers
    if (candidateSynergies?.synergiesWith) {
      for (const synergy of candidateSynergies.synergiesWith) {
        const hasJoker = ownedJokers.some(j => j.id === synergy.jokerId);
        if (hasJoker) {
          relations.push(synergy);
          totalScore += SYNERGY_STRENGTH_VALUES[synergy.strength];
        }
      }
    }

    // Check reverse synergies (owned jokers that synergize with candidate)
    for (const owned of ownedJokers) {
      const ownedSynergies = this.getSynergyData(owned.id);
      if (ownedSynergies?.synergiesWith) {
        const reverseRelation = ownedSynergies.synergiesWith.find(
          s => s.jokerId === candidateId
        );
        if (reverseRelation && !relations.some(r => r.jokerId === owned.id)) {
          relations.push({
            jokerId: owned.id,
            strength: reverseRelation.strength,
            reason: reverseRelation.reason
          });
          totalScore += SYNERGY_STRENGTH_VALUES[reverseRelation.strength];
        }
      }
    }

    // Check tag-based synergies
    const candidateTags = candidateSynergies?.tags ?? [];
    for (const owned of ownedJokers) {
      const ownedData = this.getSynergyData(owned.id);
      const ownedTags = ownedData?.tags ?? [];

      // Find matching tags
      const matchingTags = candidateTags.filter(t => ownedTags.includes(t));
      if (matchingTags.length > 0 && !relations.some(r => r.jokerId === owned.id)) {
        const tagScore = matchingTags.length * 5;
        totalScore += tagScore;
        relations.push({
          jokerId: owned.id,
          strength: matchingTags.length >= 2 ? 'medium' : 'weak',
          reason: `Shared tags: ${matchingTags.join(', ')}`
        });
      }
    }

    // Normalize score to 0-100 (cap at 100)
    const normalizedScore = Math.min(100, totalScore);

    return {
      jokerId: candidateId,
      score: normalizedScore,
      relations
    };
  }

  /**
   * Get all jokers that would synergize well with the current collection.
   */
  getRecommendedJokers(ownedJokers: JokerState[]): string[] {
    const recommendations = new Set<string>();

    for (const owned of ownedJokers) {
      const synergies = this.getSynergyData(owned.id);
      if (synergies?.synergiesWith) {
        for (const synergy of synergies.synergiesWith) {
          // Don't recommend jokers we already have
          if (!ownedJokers.some(j => j.id === synergy.jokerId)) {
            recommendations.add(synergy.jokerId);
          }
        }
      }
    }

    return Array.from(recommendations);
  }

  /**
   * Check if adding a joker would create any anti-synergies.
   */
  checkAntiSynergies(candidateId: string, ownedJokers: JokerState[]): string[] {
    const warnings: string[] = [];

    // Check for known anti-synergies
    if (candidateId === 'j_pareidolia') {
      const hasRideTheBus = ownedJokers.some(j => j.id === 'j_ride_the_bus');
      if (hasRideTheBus) {
        warnings.push('Pareidolia breaks Ride the Bus (all cards become face cards)');
      }
    }

    if (candidateId === 'j_ride_the_bus') {
      const hasPareidolia = ownedJokers.some(j => j.id === 'j_pareidolia');
      if (hasPareidolia) {
        warnings.push('Ride the Bus is broken by Pareidolia');
      }
    }

    return warnings;
  }
}
