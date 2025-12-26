import { Injectable, computed, signal } from '@angular/core';
import {
  JokerSynergy,
  JokerSynergyRelation,
  StrategyAffinity,
} from '../../../../../../shared/models/synergy.model';
import { StrategyType, SynergyStrength } from '../../../../../../shared/models/strategy.model';
import { Suit, Rank, Enhancement } from '../../../../../../shared/models/card.model';
import synergyData from '../data/joker-synergies.json';

interface SynergyDataFile {
  version: string;
  jokers: JokerSynergy[];
  strategyDefinitions: Record<string, {
    description: string;
    requiredTags?: string[];
    requiredRanks?: Rank[];
    requiredEnhancements?: Enhancement[];
    minSuitConcentration?: number;
  }>;
}

interface SynergyMatch {
  jokerA: string;
  jokerB: string;
  strength: SynergyStrength;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class SynergyGraphService {
  private readonly data = signal<SynergyDataFile>(synergyData as SynergyDataFile);

  // Computed indexes for fast lookups
  private readonly jokerMap = computed(() => {
    const map = new Map<string, JokerSynergy>();
    for (const joker of this.data().jokers) {
      map.set(joker.id, joker);
    }
    return map;
  });

  private readonly tagIndex = computed(() => {
    const index = new Map<string, Set<string>>();
    for (const joker of this.data().jokers) {
      for (const tag of joker.tags) {
        if (!index.has(tag)) {
          index.set(tag, new Set());
        }
        index.get(tag)!.add(joker.id);
      }
    }
    return index;
  });

  private readonly strategyIndex = computed(() => {
    const index = new Map<StrategyType, JokerSynergy[]>();
    for (const joker of this.data().jokers) {
      for (const strat of joker.strategies) {
        if (!index.has(strat.strategy)) {
          index.set(strat.strategy, []);
        }
        index.get(strat.strategy)!.push(joker);
      }
    }
    // Sort by affinity descending
    for (const [strategy, jokers] of index) {
      jokers.sort((a, b) => {
        const affinityA = a.strategies.find(s => s.strategy === strategy)?.affinity ?? 0;
        const affinityB = b.strategies.find(s => s.strategy === strategy)?.affinity ?? 0;
        return affinityB - affinityA;
      });
    }
    return index;
  });

  // Public computed values
  readonly allJokers = computed(() => this.data().jokers);
  readonly jokerCount = computed(() => this.data().jokers.length);
  readonly version = computed(() => this.data().version);
  readonly availableStrategies = computed(() => Object.keys(this.data().strategyDefinitions) as StrategyType[]);

  /**
   * Get a joker by ID
   */
  getJoker(id: string): JokerSynergy | null {
    return this.jokerMap().get(id) ?? null;
  }

  /**
   * Get all synergies for a joker
   */
  getSynergies(jokerId: string): JokerSynergyRelation[] {
    const joker = this.getJoker(jokerId);
    if (!joker) return [];
    return joker.synergiesWith;
  }

  /**
   * Get jokers that work well with a given strategy
   */
  getJokersForStrategy(strategyType: StrategyType, minAffinity = 50): JokerSynergy[] {
    const jokers = this.strategyIndex().get(strategyType) ?? [];
    return jokers.filter(j => {
      const affinity = j.strategies.find(s => s.strategy === strategyType)?.affinity ?? 0;
      return affinity >= minAffinity;
    });
  }

  /**
   * Find all synergies between a set of joker IDs
   * Returns synergy pairs between owned jokers
   */
  findSynergiesBetween(jokerIds: string[]): SynergyMatch[] {
    const matches: SynergyMatch[] = [];
    const idSet = new Set(jokerIds);

    for (const id of jokerIds) {
      const joker = this.getJoker(id);
      if (!joker) continue;

      for (const synergy of joker.synergiesWith) {
        // Only include if we own both jokers and haven't already added this pair
        if (idSet.has(synergy.jokerId)) {
          const pairKey = [id, synergy.jokerId].sort().join('-');
          const alreadyAdded = matches.some(
            m => [m.jokerA, m.jokerB].sort().join('-') === pairKey
          );
          if (!alreadyAdded) {
            matches.push({
              jokerA: id,
              jokerB: synergy.jokerId,
              strength: synergy.strength,
              reason: synergy.reason,
            });
          }
        }
      }
    }

    // Sort by strength: strong > medium > weak
    const strengthOrder: Record<SynergyStrength, number> = {
      strong: 3,
      medium: 2,
      weak: 1,
    };
    matches.sort((a, b) => strengthOrder[b.strength] - strengthOrder[a.strength]);

    return matches;
  }

  /**
   * Get jokers by tag
   */
  getJokersByTag(tag: string): JokerSynergy[] {
    const ids = this.tagIndex().get(tag);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.getJoker(id))
      .filter((j): j is JokerSynergy => j !== null);
  }

  /**
   * Get jokers that want a specific suit
   */
  getJokersWantingSuit(suit: Suit): JokerSynergy[] {
    return this.data().jokers.filter(j => j.wantsSuits?.includes(suit));
  }

  /**
   * Get jokers that want specific ranks
   */
  getJokersWantingRanks(ranks: Rank[]): JokerSynergy[] {
    return this.data().jokers.filter(j =>
      j.wantsRanks?.some(r => ranks.includes(r))
    );
  }

  /**
   * Get jokers that want specific enhancements
   */
  getJokersWantingEnhancements(enhancements: Enhancement[]): JokerSynergy[] {
    return this.data().jokers.filter(j =>
      j.wantsEnhancements?.some(e => enhancements.includes(e))
    );
  }

  /**
   * Get all scaling jokers
   */
  getScalingJokers(): JokerSynergy[] {
    return this.data().jokers.filter(j => j.isScaling);
  }

  /**
   * Get all economy jokers
   */
  getEconomyJokers(): JokerSynergy[] {
    return this.data().jokers.filter(j => j.generatesMoney);
  }

  /**
   * Calculate synergy score for a set of jokers
   * Higher score = better synergies
   */
  calculateSynergyScore(jokerIds: string[]): number {
    const matches = this.findSynergiesBetween(jokerIds);

    const strengthScores: Record<SynergyStrength, number> = {
      strong: 10,
      medium: 5,
      weak: 2,
    };

    return matches.reduce((sum, match) => sum + strengthScores[match.strength], 0);
  }

  /**
   * Get recommended jokers to look for based on current jokers
   * Returns jokers that would synergize well
   */
  getRecommendedJokers(currentJokerIds: string[], limit = 5): Array<{
    joker: JokerSynergy;
    synergyCount: number;
    reasons: string[];
  }> {
    const currentSet = new Set(currentJokerIds);
    const recommendations = new Map<string, { joker: JokerSynergy; reasons: string[] }>();

    for (const id of currentJokerIds) {
      const joker = this.getJoker(id);
      if (!joker) continue;

      for (const synergy of joker.synergiesWith) {
        // Skip if we already have this joker
        if (currentSet.has(synergy.jokerId)) continue;

        const targetJoker = this.getJoker(synergy.jokerId);
        if (!targetJoker) continue;

        if (!recommendations.has(synergy.jokerId)) {
          recommendations.set(synergy.jokerId, {
            joker: targetJoker,
            reasons: [],
          });
        }
        recommendations.get(synergy.jokerId)!.reasons.push(
          `${synergy.strength} synergy with ${joker.name}: ${synergy.reason}`
        );
      }
    }

    return Array.from(recommendations.values())
      .map(rec => ({
        joker: rec.joker,
        synergyCount: rec.reasons.length,
        reasons: rec.reasons,
      }))
      .sort((a, b) => b.synergyCount - a.synergyCount)
      .slice(0, limit);
  }

  /**
   * Get strategy definition by type
   */
  getStrategyDefinition(strategyType: StrategyType) {
    return this.data().strategyDefinitions[strategyType] ?? null;
  }

  /**
   * Check if joker data exists for an ID
   */
  hasJoker(id: string): boolean {
    return this.jokerMap().has(id);
  }
}
