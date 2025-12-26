import { Injectable, inject, computed } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { Suit, HandType } from '../../../../../../shared/models';

/**
 * Boss blind effect category
 */
export type BossEffectCategory =
  | 'card_manipulation'
  | 'money_penalty'
  | 'visibility'
  | 'scoring_penalty'
  | 'suit_debuff'
  | 'card_debuff'
  | 'hand_restriction'
  | 'draw_modification';

/**
 * Boss blind definition with effect and strategic warnings
 */
export interface BossBlindInfo {
  name: string;
  effect: string;
  warning: string;
  category: BossEffectCategory;
  debuffedSuit?: Suit;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Current boss warning with context-aware advice
 */
export interface BossWarning {
  boss: BossBlindInfo;
  isActive: boolean;
  contextualTips: string[];
}

/**
 * Boss blind database with effects and warnings
 */
const BOSS_BLINDS: Record<string, BossBlindInfo> = {
  // Card manipulation bosses
  'The Hook': {
    name: 'The Hook',
    effect: 'Discards 2 random cards per hand played',
    warning: 'Careful with small hands',
    category: 'card_manipulation',
    severity: 'medium',
  },
  'The Tooth': {
    name: 'The Tooth',
    effect: 'Lose $1 per card played',
    warning: 'Minimize cards played',
    category: 'money_penalty',
    severity: 'medium',
  },
  'The Mouth': {
    name: 'The Mouth',
    effect: 'Play only 1 hand type this round',
    warning: 'Commit to one hand type',
    category: 'hand_restriction',
    severity: 'high',
  },
  'The Manacle': {
    name: 'The Manacle',
    effect: '-1 hand size for this blind',
    warning: 'Reduced hand size',
    category: 'hand_restriction',
    severity: 'medium',
  },

  // Money penalty bosses
  'The Ox': {
    name: 'The Ox',
    effect: 'Playing most played hand sets money to $0',
    warning: 'Diversify hand types',
    category: 'money_penalty',
    severity: 'high',
  },

  // Visibility bosses
  'The House': {
    name: 'The House',
    effect: 'First hand is drawn face-down',
    warning: 'First hand is risky',
    category: 'visibility',
    severity: 'medium',
  },
  'The Wheel': {
    name: 'The Wheel',
    effect: '1 in 7 cards are drawn face-down',
    warning: 'Unreliable draws',
    category: 'visibility',
    severity: 'medium',
  },
  'The Mark': {
    name: 'The Mark',
    effect: 'All face cards are drawn face-down',
    warning: 'Face cards hidden',
    category: 'visibility',
    severity: 'medium',
  },
  'The Fish': {
    name: 'The Fish',
    effect: 'Cards drawn face-down after each hand',
    warning: 'Increasing blindness',
    category: 'visibility',
    severity: 'medium',
  },

  // Scoring penalty bosses
  'The Wall': {
    name: 'The Wall',
    effect: 'Extra large blind (4x chips required)',
    warning: 'Need big scoring hand',
    category: 'scoring_penalty',
    severity: 'high',
  },
  'The Arm': {
    name: 'The Arm',
    effect: 'Decreases level of played hand by 1',
    warning: 'Hand levels will drop',
    category: 'scoring_penalty',
    severity: 'medium',
  },
  'The Psychic': {
    name: 'The Psychic',
    effect: 'Must play 5 cards',
    warning: 'No small hands allowed',
    category: 'hand_restriction',
    severity: 'medium',
  },
  'The Needle': {
    name: 'The Needle',
    effect: 'Play only 1 hand (1x chips required)',
    warning: 'One shot only',
    category: 'hand_restriction',
    severity: 'high',
  },
  'The Water': {
    name: 'The Water',
    effect: 'Start with 0 discards',
    warning: 'No discards available',
    category: 'hand_restriction',
    severity: 'medium',
  },
  'The Flint': {
    name: 'The Flint',
    effect: 'Base chips and mult are halved',
    warning: 'Halved base scoring',
    category: 'scoring_penalty',
    severity: 'high',
  },
  'Violet Vessel': {
    name: 'Violet Vessel',
    effect: 'Very large blind (6x chips required)',
    warning: 'Massive chip requirement',
    category: 'scoring_penalty',
    severity: 'high',
  },
  'Amber Acorn': {
    name: 'Amber Acorn',
    effect: 'Flips and shuffles all jokers',
    warning: 'Joker order randomized',
    category: 'card_manipulation',
    severity: 'medium',
  },
  'Verdant Leaf': {
    name: 'Verdant Leaf',
    effect: 'All cards are debuffed until 1 Joker sold',
    warning: 'Sell a joker to play',
    category: 'card_debuff',
    severity: 'high',
  },
  'Crimson Heart': {
    name: 'Crimson Heart',
    effect: 'One random Joker disabled each hand',
    warning: 'Random joker disabled',
    category: 'card_manipulation',
    severity: 'medium',
  },
  'Cerulean Bell': {
    name: 'Cerulean Bell',
    effect: 'Forces 1 card selection each hand',
    warning: 'Forced card selection',
    category: 'card_manipulation',
    severity: 'low',
  },

  // Suit debuff bosses
  'The Club': {
    name: 'The Club',
    effect: 'All Club cards are debuffed',
    warning: 'Your Club cards debuffed',
    category: 'suit_debuff',
    debuffedSuit: 'clubs',
    severity: 'medium',
  },
  'The Goad': {
    name: 'The Goad',
    effect: 'All Spade cards are debuffed',
    warning: 'Your Spade cards debuffed',
    category: 'suit_debuff',
    debuffedSuit: 'spades',
    severity: 'medium',
  },
  'The Window': {
    name: 'The Window',
    effect: 'All Diamond cards are debuffed',
    warning: 'Your Diamond cards debuffed',
    category: 'suit_debuff',
    debuffedSuit: 'diamonds',
    severity: 'medium',
  },
  'The Head': {
    name: 'The Head',
    effect: 'All Heart cards are debuffed',
    warning: 'Your Heart cards debuffed',
    category: 'suit_debuff',
    debuffedSuit: 'hearts',
    severity: 'medium',
  },
  'The Plant': {
    name: 'The Plant',
    effect: 'All face cards are debuffed',
    warning: 'Your face cards debuffed',
    category: 'card_debuff',
    severity: 'medium',
  },

  // Card debuff bosses
  'The Pillar': {
    name: 'The Pillar',
    effect: 'Cards played previously this Ante are debuffed',
    warning: 'Vary your cards',
    category: 'card_debuff',
    severity: 'high',
  },

  // Draw modification bosses
  'The Serpent': {
    name: 'The Serpent',
    effect: 'After play or discard, always draw 3 cards',
    warning: 'Discards less valuable',
    category: 'draw_modification',
    severity: 'low',
  },

  // Hand restriction bosses
  'The Eye': {
    name: 'The Eye',
    effect: 'No repeat hand types this round',
    warning: 'Each hand type once only',
    category: 'hand_restriction',
    severity: 'high',
  },
};

/**
 * Maps suit to display name
 */
const SUIT_DISPLAY_NAMES: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

@Injectable({ providedIn: 'root' })
export class BossAwarenessService {
  private gameState = inject(GameStateService);

  /**
   * Current blind state
   */
  private blind = computed(() => this.gameState.blind());

  /**
   * Current deck state for suit analysis
   */
  private deck = computed(() => this.gameState.deck());

  /**
   * Hand history for strategy analysis
   */
  private handHistory = computed(() => this.gameState.state()?.handLevels ?? []);

  /**
   * Whether we're currently facing a boss blind
   */
  isBossBlind = computed(() => this.blind()?.isBoss ?? false);

  /**
   * Current boss blind name (null if not boss)
   */
  currentBossName = computed(() => {
    const blind = this.blind();
    if (!blind?.isBoss) return null;
    return blind.name;
  });

  /**
   * Current boss blind info (null if not boss or unknown boss)
   */
  currentBoss = computed<BossBlindInfo | null>(() => {
    const name = this.currentBossName();
    if (!name) return null;
    return BOSS_BLINDS[name] ?? null;
  });

  /**
   * Current boss warning with contextual tips
   */
  currentWarning = computed<BossWarning | null>(() => {
    const boss = this.currentBoss();
    if (!boss) return null;

    return {
      boss,
      isActive: true,
      contextualTips: this.generateContextualTips(boss),
    };
  });

  /**
   * Quick access to debuffed suit (if any)
   */
  debuffedSuit = computed<Suit | null>(() => {
    return this.currentBoss()?.debuffedSuit ?? null;
  });

  /**
   * Count of cards affected by suit debuff
   */
  debuffedCardCount = computed(() => {
    const suit = this.debuffedSuit();
    if (!suit) return 0;

    const deck = this.deck();
    if (!deck) return 0;

    const allCards = [
      ...deck.remaining,
      ...deck.hand,
      ...deck.discarded,
      ...deck.played,
    ];

    return allCards.filter(card => card.suit === suit).length;
  });

  /**
   * Percentage of deck affected by suit debuff
   */
  debuffedPercentage = computed(() => {
    const deck = this.deck();
    if (!deck) return 0;

    const totalCards = deck.totalCards || 1;
    return Math.round((this.debuffedCardCount() / totalCards) * 100);
  });

  /**
   * Is this boss particularly dangerous given current build?
   */
  isDangerousBoss = computed(() => {
    const boss = this.currentBoss();
    if (!boss) return false;

    // High severity is always dangerous
    if (boss.severity === 'high') return true;

    // Suit debuff is dangerous if >30% of deck is affected
    if (boss.category === 'suit_debuff' && this.debuffedPercentage() > 30) {
      return true;
    }

    return false;
  });

  /**
   * Get strategy adjustments for current boss
   */
  strategyAdjustments = computed<string[]>(() => {
    const boss = this.currentBoss();
    if (!boss) return [];

    return this.getStrategyAdjustments(boss);
  });

  /**
   * Generate contextual tips based on current game state
   */
  private generateContextualTips(boss: BossBlindInfo): string[] {
    const tips: string[] = [];
    const deck = this.deck();

    switch (boss.category) {
      case 'suit_debuff':
        if (boss.debuffedSuit && deck) {
          const percentage = this.debuffedPercentage();
          const suitName = SUIT_DISPLAY_NAMES[boss.debuffedSuit];
          tips.push(`${percentage}% of your deck is ${suitName}`);
          if (percentage > 40) {
            tips.push(`Consider using Wild cards or different suits`);
          }
        }
        break;

      case 'hand_restriction':
        if (boss.name === 'The Eye') {
          tips.push('Plan hand type sequence before playing');
          tips.push('Save high-scoring types for late');
        } else if (boss.name === 'The Mouth') {
          tips.push('Choose your strongest hand type');
        } else if (boss.name === 'The Psychic') {
          tips.push('Full houses and flushes work well');
        } else if (boss.name === 'The Needle') {
          tips.push('Set up your best possible hand');
        } else if (boss.name === 'The Manacle') {
          tips.push('Pairs and three-of-a-kind easier to form');
          tips.push('Straights and flushes harder with fewer cards');
        }
        break;

      case 'scoring_penalty':
        if (boss.name === 'The Wall') {
          tips.push('Focus on xMult jokers');
          tips.push('May need multiple hands');
        } else if (boss.name === 'The Flint') {
          tips.push('Joker effects become more critical');
        }
        break;

      case 'visibility':
        tips.push('Consider the probability of good cards');
        if (boss.name === 'The House') {
          tips.push('Discard first hand if possible');
        }
        break;

      case 'money_penalty':
        if (boss.name === 'The Ox') {
          tips.push('Check your most played hand type');
        } else if (boss.name === 'The Tooth') {
          tips.push('Play fewer cards per hand');
        }
        break;

      case 'card_debuff':
        if (boss.name === 'The Pillar') {
          tips.push('Use different cards each hand');
          tips.push('Track which cards you\'ve played');
        } else if (boss.name === 'The Plant') {
          tips.push('Jacks, Queens, Kings give 0 chips');
          tips.push('Number cards and Aces still work');
        }
        break;

      case 'draw_modification':
        if (boss.name === 'The Serpent') {
          tips.push('Focus on hands, not discards');
        }
        break;

      case 'card_manipulation':
        if (boss.name === 'The Hook') {
          tips.push('Play larger hands to mitigate losses');
        }
        break;
    }

    return tips;
  }

  /**
   * Get strategy adjustments for a boss
   */
  private getStrategyAdjustments(boss: BossBlindInfo): string[] {
    const adjustments: string[] = [];

    switch (boss.name) {
      case 'The Hook':
        adjustments.push('Prefer 5-card hands over pairs');
        adjustments.push('Avoid relying on specific cards');
        break;

      case 'The Ox':
        adjustments.push('Play variety of hand types');
        adjustments.push('Avoid your most common hand');
        break;

      case 'The House':
        adjustments.push('Consider discarding first hand');
        adjustments.push('Don\'t commit to risky plays blind');
        break;

      case 'The Wall':
        adjustments.push('Stack multipliers aggressively');
        adjustments.push('May need all hands to beat');
        break;

      case 'The Wheel':
        adjustments.push('Play safer, more consistent hands');
        adjustments.push('Don\'t rely on specific draws');
        break;

      case 'The Arm':
        adjustments.push('Focus on high-level hands');
        adjustments.push('Consider planet card usage first');
        break;

      case 'The Pillar':
        adjustments.push('Track played cards mentally');
        adjustments.push('Use different cards each hand');
        break;

      case 'The Serpent':
        adjustments.push('Discards cycle deck faster');
        adjustments.push('Focus on playing, not fishing');
        break;

      case 'The Eye':
        adjustments.push('Plan hand type sequence');
        adjustments.push('Save strongest types for chips');
        break;

      case 'The Mouth':
        adjustments.push('Commit to one hand type early');
        adjustments.push('Choose based on current cards');
        break;

      case 'The Psychic':
        adjustments.push('No 2-3-4 card hands allowed');
        adjustments.push('Build toward 5-card hands');
        break;

      case 'The Needle':
        adjustments.push('Maximum setup before playing');
        adjustments.push('Use all discards strategically');
        break;

      case 'The Water':
        adjustments.push('Play with what you\'re dealt');
        adjustments.push('No second chances');
        break;

      case 'The Flint':
        adjustments.push('Joker effects carry more weight');
        adjustments.push('Base hand values less important');
        break;

      case 'The Manacle':
        adjustments.push('Work with fewer cards in hand');
        adjustments.push('May struggle with 5-card hands');
        break;

      case 'The Plant':
        adjustments.push('Face cards (J, Q, K) are debuffed');
        adjustments.push('Focus on number cards and Aces');
        break;

      default:
        // Suit debuff bosses
        if (boss.debuffedSuit) {
          const suitName = SUIT_DISPLAY_NAMES[boss.debuffedSuit];
          adjustments.push(`Avoid ${suitName} cards`);
          adjustments.push('Wild cards ignore suit debuffs');
        }
        break;
    }

    return adjustments;
  }

  /**
   * Check if a specific hand type is safe to play (for The Ox)
   */
  isHandTypeSafe(handType: HandType): boolean {
    const boss = this.currentBoss();
    if (!boss || boss.name !== 'The Ox') return true;

    // Would need hand history to determine most played hand
    // For now, return true - full implementation would track hand frequency
    return true;
  }

  /**
   * Get all known boss blinds (for reference/display)
   */
  getAllBossBlinds(): BossBlindInfo[] {
    return Object.values(BOSS_BLINDS);
  }

  /**
   * Look up a boss by name
   */
  getBossInfo(name: string): BossBlindInfo | null {
    return BOSS_BLINDS[name] ?? null;
  }
}
