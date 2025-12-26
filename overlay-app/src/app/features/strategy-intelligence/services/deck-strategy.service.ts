import { Injectable, signal, computed, inject } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { DeckType, Suit } from '../../../../../../shared/models/card.model';
import { StrategyType, DetectedStrategy } from '../../../../../../shared/models/strategy.model';

/**
 * Strategy adjustment multipliers for a deck type
 */
export interface DeckStrategyAdjustment {
  strategyBoosts: Partial<Record<StrategyType, number>>;   // Positive = better, negative = worse
  strategyPenalties: Partial<Record<StrategyType, number>>; // Strategies that are weaker
  economyMultiplier: number;    // 1.0 = normal, >1 = economy more important, <1 = less important
  jokerSlotValue: number;       // How valuable each joker slot is (1.0 = normal)
  handValue: number;            // How valuable each hand is (1.0 = normal)
  discardValue: number;         // How valuable each discard is (1.0 = normal)
  efficiencyPriority: number;   // 0-100, how much efficiency matters
}

/**
 * Joker valuation modifier based on deck type
 */
export interface JokerValuationMod {
  jokerId: string;
  multiplier: number;  // <1 = devalued, >1 = more valuable
  reason: string;
}

/**
 * Deck-specific tip for the player
 */
export interface DeckTip {
  priority: 'high' | 'medium' | 'low';
  message: string;
}

/**
 * Complete deck profile with all adjustments
 */
interface DeckProfile {
  name: string;
  description: string;
  adjustment: DeckStrategyAdjustment;
  tips: DeckTip[];
  jokerMods: JokerValuationMod[];
  availableSuits?: Suit[];      // For checkered deck
  availableRanks?: string[];    // For abandoned deck
}

/**
 * Deck profiles defining strategy adjustments for each deck type
 */
const DECK_PROFILES: Record<DeckType, DeckProfile> = {
  red: {
    name: 'Red Deck',
    description: '+1 discard per round',
    adjustment: {
      strategyBoosts: {
        flush: 10,      // More discards = easier to fish for flushes
        straight: 10,   // Easier to find straights
        pairs: 5,       // Slightly easier to find pairs
      },
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 0.8,  // Discards less precious
      efficiencyPriority: 40,
    },
    tips: [
      { priority: 'high', message: 'Extra discard allows aggressive fishing for hands' },
      { priority: 'medium', message: 'Discard aggressively to find flushes/straights' },
      { priority: 'low', message: 'Economy jokers like Delayed Gratification less impactful' },
    ],
    jokerMods: [
      { jokerId: 'j_green_joker', multiplier: 0.9, reason: '+1 discard reduces urgency' },
      { jokerId: 'j_faceless', multiplier: 1.1, reason: 'More discards = more triggers' },
      { jokerId: 'j_mail_in_rebate', multiplier: 1.1, reason: 'Extra discard synergy' },
      { jokerId: 'j_trading_card', multiplier: 1.15, reason: 'More discard opportunities' },
    ],
  },

  blue: {
    name: 'Blue Deck',
    description: '+1 hand per round',
    adjustment: {
      strategyBoosts: {
        mult_stacking: 15,    // More hands = more scaling triggers
        xmult_scaling: 20,    // Scaling jokers shine with more hands
        retrigger: 10,        // More chances for retrigger value
      },
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 1.0,
      handValue: 0.75,  // Hands less precious (you have more)
      discardValue: 1.0,
      efficiencyPriority: 30,
    },
    tips: [
      { priority: 'high', message: 'Scaling jokers excel with extra hands' },
      { priority: 'high', message: 'Ride the Bus, Obelisk, Green Joker all excellent' },
      { priority: 'medium', message: 'Can afford to play weaker hands to scale' },
    ],
    jokerMods: [
      { jokerId: 'j_ride_the_bus', multiplier: 1.25, reason: 'Extra hand for scaling' },
      { jokerId: 'j_obelisk', multiplier: 1.2, reason: 'More hands to build xMult' },
      { jokerId: 'j_green_joker', multiplier: 1.2, reason: 'Extra hand for +mult buildup' },
      { jokerId: 'j_supernova', multiplier: 1.15, reason: 'More hand plays' },
      { jokerId: 'j_constellation', multiplier: 1.1, reason: 'More hands to trigger' },
      { jokerId: 'j_castle', multiplier: 1.15, reason: 'More chances to trigger' },
      { jokerId: 'j_loyalty_card', multiplier: 1.1, reason: 'Faster loyalty buildup' },
    ],
  },

  yellow: {
    name: 'Yellow Deck',
    description: '+$10 starting money',
    adjustment: {
      strategyBoosts: {
        xmult_scaling: 5,  // Slight boost, can afford early scaling joker
      },
      strategyPenalties: {
        economy: -20,  // Economy build less valuable
      },
      economyMultiplier: 0.7,  // Economy much less important
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 50,
    },
    tips: [
      { priority: 'high', message: 'Spend aggressively in early shops' },
      { priority: 'medium', message: 'Economy jokers like Egg less critical' },
      { priority: 'medium', message: 'Can afford to buy powerful jokers early' },
    ],
    jokerMods: [
      { jokerId: 'j_egg', multiplier: 0.7, reason: 'Less need for economy' },
      { jokerId: 'j_golden', multiplier: 0.75, reason: 'Starting money reduces value' },
      { jokerId: 'j_to_the_moon', multiplier: 0.8, reason: 'Interest less critical' },
      { jokerId: 'j_rocket', multiplier: 0.85, reason: 'Economy head start reduces value' },
      { jokerId: 'j_delayed_gratification', multiplier: 0.8, reason: 'Less economy dependent' },
    ],
  },

  green: {
    name: 'Green Deck',
    description: 'No interest, +$1 per remaining hand/discard',
    adjustment: {
      strategyBoosts: {
        chip_stacking: 10,  // Efficient play matters
      },
      strategyPenalties: {
        economy: -30,  // Traditional economy broken
      },
      economyMultiplier: 0.5,  // Economy jokers largely useless
      jokerSlotValue: 1.0,
      handValue: 1.2,   // Unused hands = money
      discardValue: 1.2, // Unused discards = money
      efficiencyPriority: 90,  // Efficiency is king
    },
    tips: [
      { priority: 'high', message: 'Beat blinds with minimum hands for max money' },
      { priority: 'high', message: 'Interest jokers are nearly useless' },
      { priority: 'medium', message: 'One strong hand > multiple weak hands' },
      { priority: 'medium', message: 'Save discards when possible' },
    ],
    jokerMods: [
      { jokerId: 'j_to_the_moon', multiplier: 0.1, reason: 'No interest mechanic' },
      { jokerId: 'j_cloud_9', multiplier: 0.1, reason: 'No interest mechanic' },
      { jokerId: 'j_rocket', multiplier: 0.3, reason: 'No interest reduces value' },
      { jokerId: 'j_delayed_gratification', multiplier: 0.2, reason: 'No interest' },
      { jokerId: 'j_golden', multiplier: 0.6, reason: 'Economy less important' },
      { jokerId: 'j_egg', multiplier: 0.5, reason: 'Economy less important' },
      { jokerId: 'j_ceremonial', multiplier: 1.2, reason: 'Efficiency deck' },
    ],
  },

  black: {
    name: 'Black Deck',
    description: '+1 joker slot, -1 hand per round',
    adjustment: {
      strategyBoosts: {
        xmult_scaling: 25,  // Extra joker slot is huge for scaling
        mult_stacking: 20,  // More jokers = more mult sources
        pairs: 10,          // Joker synergies matter more
      },
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 0.8,  // Slots less scarce
      handValue: 1.5,       // Hands are precious
      discardValue: 1.2,
      efficiencyPriority: 80,
    },
    tips: [
      { priority: 'high', message: 'Joker synergies are priority #1' },
      { priority: 'high', message: 'Every hand must count - efficiency critical' },
      { priority: 'medium', message: 'Build powerful joker combos with extra slot' },
      { priority: 'medium', message: 'Scaling jokers excellent due to synergy potential' },
    ],
    jokerMods: [
      { jokerId: 'j_blueprint', multiplier: 1.3, reason: 'Extra slot for blueprint target' },
      { jokerId: 'j_brainstorm', multiplier: 1.25, reason: 'More synergy potential' },
      { jokerId: 'j_ceremonial', multiplier: 1.2, reason: 'Efficiency matters' },
      { jokerId: 'j_stencil', multiplier: 0.7, reason: 'Extra slot reduces xMult' },
      { jokerId: 'j_joker_stencil', multiplier: 0.7, reason: 'Extra slot reduces xMult' },
    ],
  },

  magic: {
    name: 'Magic Deck',
    description: 'Starts with Crystal Ball + Ectoplasm',
    adjustment: {
      strategyBoosts: {
        xmult_scaling: 30,  // Negative jokers are key
        retrigger: 15,      // Spectral synergies
      },
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 0.9,  // Negative jokers ease slot pressure
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 50,
    },
    tips: [
      { priority: 'high', message: 'Focus on spectral cards for negative jokers' },
      { priority: 'high', message: 'Negative jokers expand your effective slots' },
      { priority: 'medium', message: 'Look for Hex, Aura, and Cryptid spectrals' },
    ],
    jokerMods: [
      { jokerId: 'j_perkeo', multiplier: 1.5, reason: 'Spectral synergy' },
      { jokerId: 'j_sixth_sense', multiplier: 1.3, reason: 'Spectral generation' },
      { jokerId: 'j_seance', multiplier: 1.2, reason: 'Spectral synergy' },
      { jokerId: 'j_vagabond', multiplier: 1.15, reason: 'Free tarots help find spectrals' },
    ],
  },

  nebula: {
    name: 'Nebula Deck',
    description: 'Starts with Telescope, -1 consumable slot',
    adjustment: {
      strategyBoosts: {
        chip_stacking: 20,  // Planet cards boost hand levels
        mult_stacking: 10,
      },
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 50,
    },
    tips: [
      { priority: 'high', message: 'Planet cards are priority - level up key hands' },
      { priority: 'high', message: 'Focus one or two hand types for massive scaling' },
      { priority: 'medium', message: 'Consumable slot loss hurts tarot flexibility' },
    ],
    jokerMods: [
      { jokerId: 'j_constellation', multiplier: 1.4, reason: 'Planet card synergy' },
      { jokerId: 'j_satellite', multiplier: 1.35, reason: 'Planet card economy' },
      { jokerId: 'j_astronomer', multiplier: 1.3, reason: 'Planet card focus' },
      { jokerId: 'j_fortune_teller', multiplier: 0.85, reason: 'Tarot less useful' },
      { jokerId: 'j_vagabond', multiplier: 0.9, reason: 'Consumable slots limited' },
    ],
  },

  ghost: {
    name: 'Ghost Deck',
    description: 'Starts with Hex, spectrals appear more often',
    adjustment: {
      strategyBoosts: {
        xmult_scaling: 35,  // Negative joker focus
        retrigger: 15,
      },
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 0.85,  // Negative jokers are common
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 50,
    },
    tips: [
      { priority: 'high', message: 'Hunt for negative jokers via spectrals' },
      { priority: 'high', message: 'Polychrome/negative from Hex is run-defining' },
      { priority: 'medium', message: 'Spectral shops extremely valuable' },
    ],
    jokerMods: [
      { jokerId: 'j_perkeo', multiplier: 1.6, reason: 'Spectral duplication' },
      { jokerId: 'j_sixth_sense', multiplier: 1.4, reason: 'Spectral generation' },
      { jokerId: 'j_seance', multiplier: 1.3, reason: 'More spectral triggers' },
      { jokerId: 'j_stencil', multiplier: 0.7, reason: 'Negative jokers reduce xMult' },
      { jokerId: 'j_joker_stencil', multiplier: 0.7, reason: 'Negative jokers reduce xMult' },
    ],
  },

  abandoned: {
    name: 'Abandoned Deck',
    description: 'No face cards (J, Q, K)',
    adjustment: {
      strategyBoosts: {
        fibonacci: 40,     // 2,3,5,8,A all present
        straight: -15,     // Straights harder without J,Q,K
        flush: 5,          // Still possible, slightly concentrated
      },
      strategyPenalties: {
        face_cards: -100,  // Face card strategy impossible
      },
      economyMultiplier: 1.0,
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 50,
    },
    tips: [
      { priority: 'high', message: 'Face card jokers are USELESS - avoid completely' },
      { priority: 'high', message: 'Fibonacci builds are excellent (2,3,5,8,A)' },
      { priority: 'medium', message: 'Straights limited to A-10 only' },
      { priority: 'medium', message: 'Focus low card and number-specific jokers' },
    ],
    jokerMods: [
      // Face card jokers worthless
      { jokerId: 'j_scary_face', multiplier: 0, reason: 'No face cards' },
      { jokerId: 'j_smiley', multiplier: 0, reason: 'No face cards' },
      { jokerId: 'j_business', multiplier: 0, reason: 'No face cards' },
      { jokerId: 'j_faceless', multiplier: 0, reason: 'No face cards' },
      { jokerId: 'j_reserved_parking', multiplier: 0, reason: 'No face cards' },
      { jokerId: 'j_sock_and_buskin', multiplier: 0, reason: 'No face cards' },
      { jokerId: 'j_photograph', multiplier: 0, reason: 'No face cards' },
      { jokerId: 'j_baron', multiplier: 0, reason: 'No Kings' },
      { jokerId: 'j_triboulet', multiplier: 0, reason: 'No K/Q' },
      { jokerId: 'j_shoot_the_moon', multiplier: 0, reason: 'No Queens' },
      { jokerId: 'j_hanging_chad', multiplier: 0, reason: 'No face cards' },
      { jokerId: 'j_midas_mask', multiplier: 0, reason: 'No face cards' },
      { jokerId: 'j_canio', multiplier: 0, reason: 'No face cards' },
      // Low card jokers boosted
      { jokerId: 'j_fibonacci', multiplier: 1.5, reason: 'All fib cards available' },
      { jokerId: 'j_hack', multiplier: 1.3, reason: '2,3,4,5 all present' },
      { jokerId: 'j_wee', multiplier: 1.2, reason: '2s still present' },
      { jokerId: 'j_scholar', multiplier: 1.15, reason: 'Aces still present' },
      { jokerId: 'j_even_steven', multiplier: 1.2, reason: 'Even cards concentrated' },
      { jokerId: 'j_odd_todd', multiplier: 1.2, reason: 'Odd cards concentrated' },
    ],
    availableRanks: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'],
  },

  checkered: {
    name: 'Checkered Deck',
    description: 'Only 2 suits (Spades and Hearts)',
    adjustment: {
      strategyBoosts: {
        flush: 60,  // Flush is trivially easy
      },
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 40,
    },
    tips: [
      { priority: 'high', message: 'Flushes are almost free - build around them' },
      { priority: 'high', message: 'Flush jokers extremely valuable' },
      { priority: 'medium', message: 'Diamond/Club suit jokers are USELESS' },
    ],
    jokerMods: [
      // Flush jokers boosted
      { jokerId: 'j_droll', multiplier: 1.4, reason: 'Flush trivially easy' },
      { jokerId: 'j_tribe', multiplier: 1.5, reason: 'Flush always available' },
      { jokerId: 'j_crafty', multiplier: 1.3, reason: 'Easy flushes' },
      { jokerId: 'j_four_fingers', multiplier: 1.4, reason: '4-card flush easy' },
      { jokerId: 'j_smeared', multiplier: 0.5, reason: 'Already only 2 suits' },
      // Wrong suit jokers useless
      { jokerId: 'j_greedy_joker', multiplier: 0, reason: 'No diamonds' },
      { jokerId: 'j_gluttonous_joker', multiplier: 0, reason: 'No clubs' },
      { jokerId: 'j_rough_gem', multiplier: 0, reason: 'No diamonds' },
      { jokerId: 'j_onyx_agate', multiplier: 0, reason: 'No clubs' },
      // Correct suit jokers boosted
      { jokerId: 'j_lusty_joker', multiplier: 1.3, reason: 'Hearts available' },
      { jokerId: 'j_wrathful_joker', multiplier: 1.3, reason: 'Spades available' },
      { jokerId: 'j_bloodstone', multiplier: 1.3, reason: 'Hearts available' },
      { jokerId: 'j_arrowhead', multiplier: 1.3, reason: 'Spades available' },
      { jokerId: 'j_blackboard', multiplier: 1.2, reason: 'Spades available' },
      { jokerId: 'j_flower_pot', multiplier: 0, reason: 'Cannot have all 4 suits' },
    ],
    availableSuits: ['spades', 'hearts'],
  },

  zodiac: {
    name: 'Zodiac Deck',
    description: 'Starts with Tarot Merchant, Planet Merchant, Overstock',
    adjustment: {
      strategyBoosts: {
        chip_stacking: 15,  // Planet access
        retrigger: 10,      // Tarot access
      },
      strategyPenalties: {},
      economyMultiplier: 1.2,  // Shop slots matter more
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 50,
    },
    tips: [
      { priority: 'high', message: 'Leverage extra tarot/planet shop slots' },
      { priority: 'medium', message: 'Tarot and planet jokers very strong' },
      { priority: 'medium', message: 'Shop more often to use voucher advantage' },
    ],
    jokerMods: [
      { jokerId: 'j_vagabond', multiplier: 1.3, reason: 'Tarot synergy' },
      { jokerId: 'j_fortune_teller', multiplier: 1.25, reason: 'Tarot access' },
      { jokerId: 'j_constellation', multiplier: 1.25, reason: 'Planet access' },
      { jokerId: 'j_satellite', multiplier: 1.2, reason: 'Planet economy' },
      { jokerId: 'j_cartomancer', multiplier: 1.3, reason: 'Tarot synergy' },
      { jokerId: 'j_hallucination', multiplier: 1.2, reason: 'More tarot value' },
    ],
  },

  painted: {
    name: 'Painted Deck',
    description: '+2 hand size, -1 joker slot',
    adjustment: {
      strategyBoosts: {
        flush: 15,       // Larger hand = easier flushes
        straight: 15,    // Easier straights
        pairs: 10,       // More cards to work with
      },
      strategyPenalties: {
        xmult_scaling: -15,  // Fewer joker slots hurts scaling
        mult_stacking: -10,
      },
      economyMultiplier: 1.0,
      jokerSlotValue: 1.5,  // Joker slots are precious
      handValue: 0.9,
      discardValue: 1.0,
      efficiencyPriority: 60,
    },
    tips: [
      { priority: 'high', message: 'Each joker slot is precious - choose wisely' },
      { priority: 'high', message: 'Hand size helps find flushes and straights' },
      { priority: 'medium', message: 'Avoid joker-heavy strategies' },
      { priority: 'medium', message: 'Quality over quantity for jokers' },
    ],
    jokerMods: [
      // Hand size jokers less needed
      { jokerId: 'j_merry_andy', multiplier: 0.7, reason: 'Already +2 hand size' },
      { jokerId: 'j_troubadour', multiplier: 0.8, reason: 'Hand size already boosted' },
      // Powerful individual jokers boosted
      { jokerId: 'j_blueprint', multiplier: 1.3, reason: 'Slot efficiency' },
      { jokerId: 'j_brainstorm', multiplier: 1.25, reason: 'Slot efficiency' },
      { jokerId: 'j_stencil', multiplier: 1.4, reason: 'Fewer slots = higher xMult' },
      { jokerId: 'j_joker_stencil', multiplier: 1.4, reason: 'Fewer slots = higher xMult' },
      // Slot-hungry strategies penalized
      { jokerId: 'j_trio', multiplier: 0.9, reason: 'Limited slots' },
      { jokerId: 'j_family', multiplier: 0.9, reason: 'Limited slots' },
    ],
  },

  anaglyph: {
    name: 'Anaglyph Deck',
    description: 'Double tags after every boss blind',
    adjustment: {
      strategyBoosts: {
        xmult_scaling: 10,  // Tags can give powerful jokers
      },
      strategyPenalties: {},
      economyMultiplier: 0.9,  // Tags provide value
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 50,
    },
    tips: [
      { priority: 'high', message: 'Double tags are powerful - plan around boss blinds' },
      { priority: 'medium', message: 'Negative tags especially valuable' },
      { priority: 'medium', message: 'Skip tags have double value' },
    ],
    jokerMods: [
      { jokerId: 'j_chicot', multiplier: 1.2, reason: 'More boss encounters for tags' },
      { jokerId: 'j_madness', multiplier: 1.15, reason: 'Boss blind synergy' },
    ],
  },

  plasma: {
    name: 'Plasma Deck',
    description: 'Chips and mult are averaged (balanced)',
    adjustment: {
      strategyBoosts: {
        chip_stacking: 30,  // Chips scale equally with mult
        mult_stacking: -10, // Pure mult less effective
      },
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 50,
    },
    tips: [
      { priority: 'high', message: 'Chips are now equally valuable as mult' },
      { priority: 'high', message: '+chips jokers much stronger than normal' },
      { priority: 'medium', message: 'Balance chips and mult equally' },
      { priority: 'low', message: 'Stone cards very strong (50 chips balances)' },
    ],
    jokerMods: [
      // Chip jokers boosted
      { jokerId: 'j_blue_joker', multiplier: 1.4, reason: 'Chips = mult' },
      { jokerId: 'j_stuntman', multiplier: 1.5, reason: '+250 chips scales equally' },
      { jokerId: 'j_banner', multiplier: 1.3, reason: 'Chip generation boosted' },
      { jokerId: 'j_square', multiplier: 1.3, reason: 'Chip scaling strong' },
      { jokerId: 'j_runner', multiplier: 1.25, reason: 'Chip scaling' },
      { jokerId: 'j_ice_cream', multiplier: 1.2, reason: '+100 chips valuable' },
      { jokerId: 'j_bull', multiplier: 1.3, reason: 'Chip multiplier balanced' },
      // Pure mult jokers less effective
      { jokerId: 'j_abstract', multiplier: 0.85, reason: 'Pure +mult less effective' },
      { jokerId: 'j_half', multiplier: 0.9, reason: '+mult balanced away' },
    ],
  },

  erratic: {
    name: 'Erratic Deck',
    description: 'All ranks and suits randomized',
    adjustment: {
      strategyBoosts: {
        pairs: -10,      // Harder to plan pairs
        flush: -15,      // Harder to plan flushes
        straight: -20,   // Harder to plan straights
        mult_stacking: 10, // Generic jokers better
      },
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 40,
    },
    tips: [
      { priority: 'high', message: 'Deck is unpredictable - use generic jokers' },
      { priority: 'medium', message: 'Avoid deck-specific strategies' },
      { priority: 'medium', message: 'Adapt to what you draw each hand' },
    ],
    jokerMods: [
      // Generic jokers better
      { jokerId: 'j_joker', multiplier: 1.1, reason: 'Always works' },
      { jokerId: 'j_juggler', multiplier: 1.2, reason: 'Flexibility' },
      { jokerId: 'j_drunkard', multiplier: 1.2, reason: 'More discards help chaos' },
      // Specific jokers worse
      { jokerId: 'j_greedy_joker', multiplier: 0.8, reason: 'Unpredictable suits' },
      { jokerId: 'j_lusty_joker', multiplier: 0.8, reason: 'Unpredictable suits' },
      { jokerId: 'j_wrathful_joker', multiplier: 0.8, reason: 'Unpredictable suits' },
      { jokerId: 'j_gluttonous_joker', multiplier: 0.8, reason: 'Unpredictable suits' },
    ],
  },

  challenge: {
    name: 'Challenge Deck',
    description: 'Custom challenge rules apply',
    adjustment: {
      strategyBoosts: {},
      strategyPenalties: {},
      economyMultiplier: 1.0,
      jokerSlotValue: 1.0,
      handValue: 1.0,
      discardValue: 1.0,
      efficiencyPriority: 50,
    },
    tips: [
      { priority: 'high', message: 'Read challenge rules carefully' },
      { priority: 'medium', message: 'Adapt strategy to challenge constraints' },
    ],
    jokerMods: [],
  },
};

@Injectable({ providedIn: 'root' })
export class DeckStrategyService {
  private gameState = inject(GameStateService);

  // Selected deck type (can be manually set or detected from game state)
  private _selectedDeck = signal<DeckType>('red');

  // Public computed signals
  readonly selectedDeck = computed(() => this._selectedDeck());
  readonly deckProfile = computed(() => DECK_PROFILES[this._selectedDeck()]);
  readonly deckName = computed(() => this.deckProfile().name);
  readonly deckDescription = computed(() => this.deckProfile().description);

  // Strategy adjustments
  readonly strategyAdjustment = computed(() => this.deckProfile().adjustment);
  readonly deckTips = computed(() => this.deckProfile().tips);

  // Efficiency priority (0-100, higher = more important to be efficient)
  readonly efficiencyPriority = computed(() => this.strategyAdjustment().efficiencyPriority);

  // Resource value modifiers
  readonly handValueMultiplier = computed(() => this.strategyAdjustment().handValue);
  readonly discardValueMultiplier = computed(() => this.strategyAdjustment().discardValue);
  readonly jokerSlotValueMultiplier = computed(() => this.strategyAdjustment().jokerSlotValue);
  readonly economyMultiplier = computed(() => this.strategyAdjustment().economyMultiplier);

  // Available suits (for checkered deck)
  readonly availableSuits = computed(() => this.deckProfile().availableSuits ?? ['hearts', 'diamonds', 'clubs', 'spades']);

  // Available ranks (for abandoned deck)
  readonly availableRanks = computed(() => this.deckProfile().availableRanks ?? ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);

  /**
   * Set the selected deck type
   */
  setDeckType(deckType: DeckType): void {
    this._selectedDeck.set(deckType);
  }

  /**
   * Adjust a strategy's confidence score based on deck type
   */
  adjustStrategyConfidence(strategy: DetectedStrategy): DetectedStrategy {
    const adjustment = this.strategyAdjustment();
    const boost = adjustment.strategyBoosts[strategy.type] ?? 0;
    const penalty = adjustment.strategyPenalties[strategy.type] ?? 0;

    const adjustedConfidence = Math.max(0, Math.min(100,
      strategy.confidence + boost + penalty
    ));

    return {
      ...strategy,
      confidence: Math.round(adjustedConfidence),
    };
  }

  /**
   * Adjust multiple strategies and re-sort by adjusted confidence
   */
  adjustStrategies(strategies: DetectedStrategy[]): DetectedStrategy[] {
    return strategies
      .map(s => this.adjustStrategyConfidence(s))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get joker valuation modifier for a specific joker
   */
  getJokerMod(jokerId: string): JokerValuationMod | null {
    const mods = this.deckProfile().jokerMods;
    return mods.find(m => m.jokerId === jokerId) ?? null;
  }

  /**
   * Get multiplier for joker value (1.0 = normal, 0 = useless, >1 = boosted)
   */
  getJokerMultiplier(jokerId: string): number {
    const mod = this.getJokerMod(jokerId);
    return mod?.multiplier ?? 1.0;
  }

  /**
   * Get reason why a joker is modified, if any
   */
  getJokerModReason(jokerId: string): string | null {
    const mod = this.getJokerMod(jokerId);
    return mod?.reason ?? null;
  }

  /**
   * Get all boosted jokers for current deck
   */
  getBoostedJokers(): JokerValuationMod[] {
    return this.deckProfile().jokerMods.filter(m => m.multiplier > 1.0);
  }

  /**
   * Get all devalued jokers for current deck
   */
  getDevaluedJokers(): JokerValuationMod[] {
    return this.deckProfile().jokerMods.filter(m => m.multiplier < 1.0 && m.multiplier > 0);
  }

  /**
   * Get all useless jokers for current deck (multiplier = 0)
   */
  getUselessJokers(): JokerValuationMod[] {
    return this.deckProfile().jokerMods.filter(m => m.multiplier === 0);
  }

  /**
   * Check if a suit is available in the current deck
   */
  isSuitAvailable(suit: Suit): boolean {
    return this.availableSuits().includes(suit);
  }

  /**
   * Check if a rank is available in the current deck
   */
  isRankAvailable(rank: string): boolean {
    return this.availableRanks().includes(rank);
  }

  /**
   * Get high-priority tips for current deck
   */
  getHighPriorityTips(): DeckTip[] {
    return this.deckTips().filter(t => t.priority === 'high');
  }

  /**
   * Adjust shop item score based on deck
   * Returns multiplier (1.0 = normal, 0 = avoid, >1 = priority)
   */
  getShopItemMultiplier(itemId: string, itemType: 'joker' | 'tarot' | 'planet' | 'spectral' | 'voucher'): number {
    const deck = this._selectedDeck();

    // Joker-specific adjustments
    if (itemType === 'joker') {
      return this.getJokerMultiplier(itemId);
    }

    // Spectral adjustments for magic/ghost decks
    if (itemType === 'spectral') {
      if (deck === 'magic' || deck === 'ghost') {
        return 1.3;
      }
    }

    // Planet adjustments for nebula deck
    if (itemType === 'planet') {
      if (deck === 'nebula') {
        return 1.3;
      }
    }

    // Tarot adjustments for zodiac deck
    if (itemType === 'tarot') {
      if (deck === 'zodiac') {
        return 1.2;
      }
    }

    return 1.0;
  }

  /**
   * Get all available deck types
   */
  getAllDeckTypes(): DeckType[] {
    return Object.keys(DECK_PROFILES) as DeckType[];
  }

  /**
   * Get profile for any deck type
   */
  getDeckProfile(deckType: DeckType): DeckProfile {
    return DECK_PROFILES[deckType];
  }
}
