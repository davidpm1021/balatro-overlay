import { Injectable, computed, inject } from '@angular/core';
import { GameStateService } from '../../core/services';
import { SynergyGraphService } from '../strategy-intelligence/services/synergy-graph.service';
import {
  SynergyGroup,
  SynergyGroupType,
  SynergyConnection,
  DirectCluster,
} from '../../../../../shared/models/synergy-group.model';
import { StrategyType, SynergyStrength } from '../../../../../shared/models/strategy.model';
import { JokerState } from '../../../../../shared/models/joker.model';

/**
 * Explanation templates for synergy groups
 */
const EXPLANATION_TEMPLATES: Record<string, string> = {
  // Suit-specific
  hearts: '{jokers} all gain power when you score Hearts. Play heart-heavy hands to trigger all of them.',
  diamonds: '{jokers} all benefit from Diamonds. Focus on diamond cards to maximize their effects.',
  clubs: '{jokers} all work with Clubs. Build around club cards for best results.',
  spades: '{jokers} all scale with Spades. Prioritize spade cards in your plays.',

  // Strategy-based
  flush: '{jokers} all reward flush plays. Play 5 cards of the same suit to trigger them.',
  pairs: '{jokers} work with pairs and multiples. Keep duplicate ranks in your deck.',
  straight: '{jokers} enhance straight hands. Look for sequential cards.',
  mult_stacking: '{jokers} add multiplier to your score. They stack together for big mult.',
  xmult_scaling: '{jokers} multiply your score exponentially. Essential for beating late antes.',
  chip_stacking: '{jokers} add raw chips. Good foundation for any build.',
  face_cards: '{jokers} trigger on face cards (J, Q, K). Prioritize keeping face cards.',
  fibonacci: '{jokers} work with Fibonacci ranks (A, 2, 3, 5, 8). Build around these cards.',
  retrigger: '{jokers} retrigger card effects. Pair with high-value scoring cards.',
  economy: '{jokers} generate money. Good for building up resources.',

  // Scaling
  scaling: '{jokers} both grow stronger over time. They\'re building toward late-game power.',

  // Generic fallback
  generic: '{jokers} work well together based on their effects.',

  // Orphan
  orphan_economy: 'Economy joker — generates money but doesn\'t boost your scoring synergies.',
  orphan_waiting: 'Looking for synergy partner. Check the shop for jokers that combo with this.',
  orphan_sellable: 'No synergies and decent sell value. Consider cashing out.',
  orphan_default: 'Doesn\'t connect with your other jokers. Consider selling or finding partners.',
};

/**
 * Strategy display names
 */
const STRATEGY_LABELS: Record<StrategyType, string> = {
  flush: 'Flush',
  straight: 'Straight',
  pairs: 'Pairs',
  mult_stacking: 'Mult Stacking',
  xmult_scaling: 'xMult Scaling',
  chip_stacking: 'Chip Stacking',
  fibonacci: 'Fibonacci',
  even_steven: 'Even Cards',
  odd_todd: 'Odd Cards',
  face_cards: 'Face Cards',
  steel_scaling: 'Steel Cards',
  glass_cannon: 'Glass Cannon',
  retrigger: 'Retrigger',
  economy: 'Economy',
  hybrid: 'Hybrid',
};

@Injectable({ providedIn: 'root' })
export class SynergyDisplayService {
  private gameStateService = inject(GameStateService);
  private synergyGraphService = inject(SynergyGraphService);

  /**
   * Main computed signal - groups update reactively when jokers change
   */
  readonly groups = computed((): SynergyGroup[] => {
    const jokers = this.gameStateService.jokers();
    if (jokers.length === 0) return [];

    const jokerIds = jokers.map(j => j.id);
    return this.computeSynergyGroups(jokerIds, jokers);
  });

  /**
   * Total synergy score for current jokers
   */
  readonly totalSynergyScore = computed(() => {
    const jokers = this.gameStateService.jokers();
    if (jokers.length === 0) return 0;
    return this.synergyGraphService.calculateSynergyScore(jokers.map(j => j.id));
  });

  /**
   * Compute synergy groups for a set of joker IDs
   */
  private computeSynergyGroups(jokerIds: string[], jokers: JokerState[]): SynergyGroup[] {
    const groups: SynergyGroup[] = [];
    const assigned = new Set<string>();
    let groupIdCounter = 0;

    // Build joker name lookup
    const jokerNames = new Map<string, string>();
    for (const j of jokers) {
      jokerNames.set(j.id, j.name);
    }

    // Step 1: Find direct synergy clusters
    const connections = this.findConnections(jokerIds);
    const directClusters = this.clusterByConnections(jokerIds, connections);

    for (const cluster of directClusters) {
      if (cluster.jokerIds.length < 2) continue; // Need at least 2 for a synergy

      const names = cluster.jokerIds
        .map(id => jokerNames.get(id) ?? id)
        .join(' and ');

      groups.push({
        id: `direct-${groupIdCounter++}`,
        type: 'direct',
        label: this.inferClusterLabel(cluster),
        explanation: this.generateDirectExplanation(cluster, jokerNames),
        jokerIds: cluster.jokerIds,
        strength: cluster.strongestStrength,
        strategyType: cluster.sharedStrategies[0],
      });

      cluster.jokerIds.forEach(id => assigned.add(id));
    }

    // Step 2: Group remaining by strategy
    const remaining = jokerIds.filter(id => !assigned.has(id));
    const strategyGroups = this.groupByStrategy(remaining);

    for (const stratGroup of strategyGroups) {
      if (stratGroup.jokerIds.length < 2) continue; // Need at least 2

      const names = stratGroup.jokerIds
        .map(id => jokerNames.get(id) ?? id)
        .join(' and ');

      groups.push({
        id: `strategy-${groupIdCounter++}`,
        type: 'strategy',
        label: `${STRATEGY_LABELS[stratGroup.strategy] ?? stratGroup.strategy} Jokers`,
        explanation: this.generateStrategyExplanation(stratGroup.strategy, names),
        jokerIds: stratGroup.jokerIds,
        strength: 'medium',
        strategyType: stratGroup.strategy,
      });

      stratGroup.jokerIds.forEach(id => assigned.add(id));
    }

    // Step 3: Orphans
    const orphans = jokerIds.filter(id => !assigned.has(id));
    if (orphans.length > 0) {
      groups.push({
        id: 'orphans',
        type: 'orphan',
        label: 'No Synergy',
        explanation: EXPLANATION_TEMPLATES['orphan_default'],
        jokerIds: orphans,
        strength: null,
      });
    }

    return groups;
  }

  /**
   * Find all synergy connections between jokers
   */
  private findConnections(jokerIds: string[]): SynergyConnection[] {
    const matches = this.synergyGraphService.findSynergiesBetween(jokerIds);
    return matches.map(m => ({
      jokerA: m.jokerA,
      jokerB: m.jokerB,
      strength: m.strength,
      reason: m.reason,
    }));
  }

  /**
   * Cluster jokers by their connections using union-find
   */
  private clusterByConnections(jokerIds: string[], connections: SynergyConnection[]): DirectCluster[] {
    if (connections.length === 0) return [];

    // Union-Find for clustering
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();

    const find = (x: string): string => {
      if (!parent.has(x)) {
        parent.set(x, x);
        rank.set(x, 0);
      }
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    };

    const union = (x: string, y: string) => {
      const px = find(x);
      const py = find(y);
      if (px === py) return;

      const rx = rank.get(px) ?? 0;
      const ry = rank.get(py) ?? 0;

      if (rx < ry) {
        parent.set(px, py);
      } else if (rx > ry) {
        parent.set(py, px);
      } else {
        parent.set(py, px);
        rank.set(px, rx + 1);
      }
    };

    // Initialize all jokers
    for (const id of jokerIds) {
      find(id);
    }

    // Union connected jokers
    for (const conn of connections) {
      union(conn.jokerA, conn.jokerB);
    }

    // Group by cluster root
    const clusters = new Map<string, {
      jokerIds: string[];
      connections: SynergyConnection[];
    }>();

    for (const id of jokerIds) {
      const root = find(id);
      if (!clusters.has(root)) {
        clusters.set(root, { jokerIds: [], connections: [] });
      }
      clusters.get(root)!.jokerIds.push(id);
    }

    // Assign connections to clusters
    for (const conn of connections) {
      const root = find(conn.jokerA);
      clusters.get(root)!.connections.push(conn);
    }

    // Build DirectCluster objects
    const result: DirectCluster[] = [];
    for (const cluster of clusters.values()) {
      if (cluster.connections.length === 0) continue;

      // Determine strongest strength
      const strengthOrder: Record<SynergyStrength, number> = {
        strong: 3,
        medium: 2,
        weak: 1,
      };
      let strongest: SynergyStrength = 'weak';
      for (const conn of cluster.connections) {
        if (strengthOrder[conn.strength] > strengthOrder[strongest]) {
          strongest = conn.strength;
        }
      }

      // Find shared strategies
      const sharedStrategies = this.findSharedStrategies(cluster.jokerIds);

      result.push({
        jokerIds: cluster.jokerIds,
        connections: cluster.connections,
        strongestStrength: strongest,
        sharedStrategies,
      });
    }

    return result;
  }

  /**
   * Find strategies shared by all jokers in a cluster
   */
  private findSharedStrategies(jokerIds: string[]): StrategyType[] {
    if (jokerIds.length === 0) return [];

    const strategyCounts = new Map<StrategyType, number>();

    for (const id of jokerIds) {
      const jokerData = this.synergyGraphService.getJoker(id);
      if (!jokerData) continue;

      for (const strat of jokerData.strategies) {
        if (strat.affinity >= 70) {
          strategyCounts.set(strat.strategy, (strategyCounts.get(strat.strategy) ?? 0) + 1);
        }
      }
    }

    // Return strategies present in at least 2 jokers
    const shared: StrategyType[] = [];
    for (const [strategy, count] of strategyCounts) {
      if (count >= 2) {
        shared.push(strategy);
      }
    }

    return shared;
  }

  /**
   * Group jokers by their primary strategy affinity
   */
  private groupByStrategy(jokerIds: string[]): Array<{
    strategy: StrategyType;
    jokerIds: string[];
  }> {
    const strategyJokers = new Map<StrategyType, string[]>();

    for (const id of jokerIds) {
      const jokerData = this.synergyGraphService.getJoker(id);
      if (!jokerData) continue;

      // Find highest affinity strategy
      let bestStrategy: StrategyType | null = null;
      let bestAffinity = 0;

      for (const strat of jokerData.strategies) {
        if (strat.affinity >= 70 && strat.affinity > bestAffinity) {
          bestAffinity = strat.affinity;
          bestStrategy = strat.strategy;
        }
      }

      if (bestStrategy) {
        if (!strategyJokers.has(bestStrategy)) {
          strategyJokers.set(bestStrategy, []);
        }
        strategyJokers.get(bestStrategy)!.push(id);
      }
    }

    // Convert to array
    const result: Array<{ strategy: StrategyType; jokerIds: string[] }> = [];
    for (const [strategy, ids] of strategyJokers) {
      if (ids.length >= 2) {
        result.push({ strategy, jokerIds: ids });
      }
    }

    return result;
  }

  /**
   * Infer a label for a direct synergy cluster
   */
  private inferClusterLabel(cluster: DirectCluster): string {
    // Check for suit-based synergy
    const jokerIds = cluster.jokerIds;
    const suitCounts = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };

    for (const id of jokerIds) {
      const jokerData = this.synergyGraphService.getJoker(id);
      if (!jokerData) continue;

      for (const suit of jokerData.wantsSuits ?? []) {
        if (suit in suitCounts) {
          suitCounts[suit as keyof typeof suitCounts]++;
        }
      }
    }

    // Find dominant suit
    const dominantSuit = Object.entries(suitCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])[0];

    if (dominantSuit) {
      const suitName = dominantSuit[0].charAt(0).toUpperCase() + dominantSuit[0].slice(1);
      return `${suitName} Synergy`;
    }

    // Check for strategy-based label
    if (cluster.sharedStrategies.length > 0) {
      const strategy = cluster.sharedStrategies[0];
      return `${STRATEGY_LABELS[strategy] ?? strategy} Synergy`;
    }

    // Check connection reasons for hints
    if (cluster.connections.length > 0) {
      const reason = cluster.connections[0].reason.toLowerCase();
      if (reason.includes('scale') || reason.includes('scaling')) return 'Scaling Pair';
      if (reason.includes('retrigger')) return 'Retrigger Synergy';
      if (reason.includes('face')) return 'Face Card Synergy';
    }

    return `Synergy (${cluster.jokerIds.length} jokers)`;
  }

  /**
   * Generate explanation for a direct synergy cluster
   */
  private generateDirectExplanation(cluster: DirectCluster, jokerNames: Map<string, string>): string {
    const names = cluster.jokerIds
      .map(id => jokerNames.get(id) ?? id)
      .join(' and ');

    // Use connection reasons if available
    if (cluster.connections.length > 0) {
      // Find the most informative reason
      const bestReason = cluster.connections
        .sort((a, b) => {
          const order: Record<SynergyStrength, number> = { strong: 3, medium: 2, weak: 1 };
          return order[b.strength] - order[a.strength];
        })[0].reason;

      return `${names}: ${bestReason}. Play to their shared strength!`;
    }

    // Check for suit-based explanation
    for (const id of cluster.jokerIds) {
      const jokerData = this.synergyGraphService.getJoker(id);
      if (jokerData?.wantsSuits?.length) {
        const suit = jokerData.wantsSuits[0];
        const template = EXPLANATION_TEMPLATES[suit];
        if (template) {
          return template.replace('{jokers}', names);
        }
      }
    }

    // Strategy-based explanation
    if (cluster.sharedStrategies.length > 0) {
      const strategy = cluster.sharedStrategies[0];
      const template = EXPLANATION_TEMPLATES[strategy];
      if (template) {
        return template.replace('{jokers}', names);
      }
    }

    // Generic fallback
    return EXPLANATION_TEMPLATES['generic'].replace('{jokers}', names);
  }

  /**
   * Generate explanation for a strategy-based group
   */
  private generateStrategyExplanation(strategy: StrategyType, jokerNames: string): string {
    const template = EXPLANATION_TEMPLATES[strategy] ?? EXPLANATION_TEMPLATES['generic'];
    return template.replace('{jokers}', jokerNames);
  }

  /**
   * Get orphan guidance for a specific joker
   */
  getOrphanGuidance(jokerId: string, sellValue: number): string {
    const jokerData = this.synergyGraphService.getJoker(jokerId);

    if (jokerData?.generatesMoney) {
      return EXPLANATION_TEMPLATES['orphan_economy'];
    }

    if (sellValue >= 5) {
      return EXPLANATION_TEMPLATES['orphan_sellable'];
    }

    // Check if there are potential synergies in the database
    const synergies = this.synergyGraphService.getSynergies(jokerId);
    if (synergies.length > 0) {
      return EXPLANATION_TEMPLATES['orphan_waiting'];
    }

    return EXPLANATION_TEMPLATES['orphan_default'];
  }
}
