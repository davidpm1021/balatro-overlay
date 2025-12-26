/**
 * Complete Joker description database for Balatro Overlay.
 * Contains all 150 jokers with their effects.
 *
 * Source: https://balatrowiki.org/w/Jokers
 *
 * Format: joker ID -> { description, condition?, scaling? }
 * - description: The main effect text
 * - condition: Optional trigger condition
 * - scaling: For scaling jokers, what triggers growth
 */

export interface JokerDescription {
  description: string;
  condition?: string;
  scaling?: string;
}

export const JOKER_DESCRIPTIONS: Record<string, JokerDescription> = {
  // ============================================
  // COMMON JOKERS (61)
  // ============================================

  'j_joker': {
    description: '+4 Mult'
  },
  'j_greedy_joker': {
    description: '+3 Mult per Diamond scored',
    condition: 'Diamonds'
  },
  'j_lusty_joker': {
    description: '+3 Mult per Heart scored',
    condition: 'Hearts'
  },
  'j_wrathful_joker': {
    description: '+3 Mult per Spade scored',
    condition: 'Spades'
  },
  'j_gluttonous_joker': {
    description: '+3 Mult per Club scored',
    condition: 'Clubs'
  },
  'j_jolly': {
    description: '+8 Mult',
    condition: 'If hand has Pair'
  },
  'j_zany': {
    description: '+12 Mult',
    condition: 'If hand has Three of a Kind'
  },
  'j_mad': {
    description: '+10 Mult',
    condition: 'If hand has Two Pair'
  },
  'j_crazy': {
    description: '+12 Mult',
    condition: 'If hand has Straight'
  },
  'j_droll': {
    description: '+10 Mult',
    condition: 'If hand has Flush'
  },
  'j_sly': {
    description: '+50 Chips',
    condition: 'If hand has Pair'
  },
  'j_wily': {
    description: '+100 Chips',
    condition: 'If hand has Three of a Kind'
  },
  'j_clever': {
    description: '+80 Chips',
    condition: 'If hand has Two Pair'
  },
  'j_devious': {
    description: '+100 Chips',
    condition: 'If hand has Straight'
  },
  'j_crafty': {
    description: '+80 Chips',
    condition: 'If hand has Flush'
  },
  'j_half': {
    description: '+20 Mult',
    condition: 'If hand ≤3 cards'
  },
  'j_credit_card': {
    description: 'Go up to -$20 in debt'
  },
  'j_banner': {
    description: '+30 Chips per discard remaining',
    condition: 'Per discard'
  },
  'j_mystic_summit': {
    description: '+15 Mult',
    condition: 'If 0 discards remaining'
  },
  'j_8_ball': {
    description: '1 in 4: Create Tarot when 8 scored',
    condition: 'Per 8 scored'
  },
  'j_misprint': {
    description: '+0 to +23 Mult (random)'
  },
  'j_raised_fist': {
    description: '2× lowest card rank → Mult',
    condition: 'Held in hand'
  },
  'j_chaos': {
    description: '1 free reroll per shop'
  },
  'j_scary_face': {
    description: '+30 Chips per face card scored',
    condition: 'Face cards'
  },
  'j_abstract': {
    description: '+3 Mult per Joker owned',
    condition: 'Per Joker'
  },
  'j_delayed_grat': {
    description: 'Earn $2 per discard if none used',
    condition: 'End of round'
  },
  'j_gros_michel': {
    description: '+15 Mult; 1 in 6 destroyed',
    condition: 'End of round'
  },
  'j_even_steven': {
    description: '+4 Mult per even card scored',
    condition: '10, 8, 6, 4, 2'
  },
  'j_odd_todd': {
    description: '+31 Chips per odd card scored',
    condition: 'A, 9, 7, 5, 3'
  },
  'j_scholar': {
    description: '+20 Chips, +4 Mult per Ace scored',
    condition: 'Aces'
  },
  'j_business': {
    description: '1 in 2: $2 per face card scored',
    condition: 'Face cards'
  },
  'j_supernova': {
    description: '+Mult = times hand played this run',
    scaling: 'Times played'
  },
  'j_ride_the_bus': {
    description: '+1 Mult per hand w/o face card',
    scaling: 'Resets on face card'
  },
  'j_egg': {
    description: '+$3 sell value at end of round',
    scaling: 'Grows each round'
  },
  'j_runner': {
    description: '+15 Chips permanently when Straight played',
    scaling: 'On Straight',
    condition: 'Straights'
  },
  'j_ice_cream': {
    description: '+100 Chips; -5 per hand played',
    scaling: 'Decreases'
  },
  'j_splash': {
    description: 'Every played card counts in scoring'
  },
  'j_blue_joker': {
    description: '+2 Chips per card in deck',
    condition: 'Per deck card'
  },
  'j_faceless': {
    description: 'Earn $5 if 3+ face cards discarded',
    condition: '3+ face cards'
  },
  'j_green_joker': {
    description: '+1 Mult/hand, -1 Mult/discard',
    scaling: 'Hand/discard'
  },
  'j_superposition': {
    description: 'Create Tarot if Ace in Straight',
    condition: 'Ace + Straight'
  },
  'j_todo_list': {
    description: 'Earn $4 if hand matches listed type',
    condition: 'Random hand type'
  },
  'j_cavendish': {
    description: 'x3 Mult; 1 in 1000 destroyed',
    condition: 'End of round'
  },
  'j_red_card': {
    description: '+3 Mult when Booster skipped',
    scaling: 'On skip'
  },
  'j_square': {
    description: '+4 Chips permanently',
    scaling: 'On 4-card hand',
    condition: 'Exactly 4 cards'
  },
  'j_riff_raff': {
    description: 'Create 2 Common Jokers',
    condition: 'When Blind selected (once)'
  },
  'j_photograph': {
    description: 'x2 Mult on first face card scored',
    condition: 'First face card'
  },
  'j_reserved_parking': {
    description: '1 in 2: $1 per face card held',
    condition: 'Held face cards'
  },
  'j_mail': {
    description: 'Earn $5 per discarded rank',
    condition: 'Random rank each round'
  },
  'j_hallucination': {
    description: '1 in 2: Create Tarot',
    condition: 'When Booster opened'
  },
  'j_fortune_teller': {
    description: '+1 Mult per Tarot used this run',
    scaling: 'Per Tarot'
  },
  'j_juggler': {
    description: '+1 hand size'
  },
  'j_drunkard': {
    description: '+1 discard per round'
  },
  'j_golden': {
    description: 'Earn $4 at end of round'
  },
  'j_popcorn': {
    description: '+20 Mult; -4 per round',
    scaling: 'Decreases'
  },
  'j_walkie_talkie': {
    description: '+10 Chips, +4 Mult',
    condition: 'When 10 or 4 scored'
  },
  'j_smiley': {
    description: '+5 Mult per face card scored',
    condition: 'Face cards'
  },
  'j_golden_ticket': {
    description: 'Gold cards earn $4 when scored',
    condition: 'Gold cards'
  },
  'j_swashbuckler': {
    description: '+Mult = other Jokers\' sell values',
    condition: 'Joker sell values'
  },
  'j_hanging_chad': {
    description: 'Retrigger first card 2× extra',
    condition: 'First scored card'
  },
  'j_shoot_the_moon': {
    description: '+13 Mult per Queen held',
    condition: 'Held Queens'
  },

  // ============================================
  // UNCOMMON JOKERS (64)
  // ============================================

  'j_stencil': {
    description: 'x1 Mult per empty Joker slot',
    condition: 'Empty slots'
  },
  'j_four_fingers': {
    description: 'Flushes & Straights with 4 cards'
  },
  'j_mime': {
    description: 'Retrigger all held card abilities'
  },
  'j_ceremonial': {
    description: 'Destroy right Joker; +2× its sell value to Mult',
    condition: 'When Blind selected',
    scaling: 'On destroy'
  },
  'j_marble': {
    description: 'Add Stone card to deck',
    condition: 'When Blind selected'
  },
  'j_loyalty_card': {
    description: 'x4 Mult every 6 hands',
    condition: 'Every 6 hands'
  },
  'j_dusk': {
    description: 'Retrigger all played cards',
    condition: 'Final hand of round'
  },
  'j_fibonacci': {
    description: '+8 Mult per A/2/3/5/8 scored',
    condition: 'Fibonacci ranks'
  },
  'j_steel_joker': {
    description: 'x0.2 Mult per Steel card in deck',
    condition: 'Steel cards'
  },
  'j_hack': {
    description: 'Retrigger each 2, 3, 4, 5'
  },
  'j_pareidolia': {
    description: 'All cards count as face cards'
  },
  'j_space': {
    description: '1 in 4: Upgrade poker hand level',
    condition: 'When hand played'
  },
  'j_burglar': {
    description: '+3 Hands, lose all discards',
    condition: 'When Blind selected'
  },
  'j_blackboard': {
    description: 'x3 Mult',
    condition: 'All held cards Spades/Clubs'
  },
  'j_sixth_sense': {
    description: 'Destroy scored 6 → Spectral',
    condition: 'First hand, single 6'
  },
  'j_constellation': {
    description: 'x0.1 Mult per Planet used',
    scaling: 'Per Planet'
  },
  'j_hiker': {
    description: '+5 Chips to played card permanently',
    scaling: 'Permanent'
  },
  'j_card_sharp': {
    description: 'x3 Mult if hand played twice this round',
    condition: 'Repeat hand'
  },
  'j_madness': {
    description: 'x0.5 Mult; destroy random Joker',
    condition: 'Small/Big Blind selected',
    scaling: 'On Blind'
  },
  'j_seance': {
    description: 'Create Spectral card',
    condition: 'If Straight Flush'
  },
  'j_vampire': {
    description: 'x0.1 Mult per Enhanced card; remove enhancement',
    scaling: 'Removes enhancement'
  },
  'j_shortcut': {
    description: 'Straights can gap 1 rank (Q-10-9-7-6)'
  },
  'j_hologram': {
    description: 'x0.25 Mult per card added to deck',
    scaling: 'Per card added'
  },
  'j_cloud_9': {
    description: 'Earn $1 per 9 in full deck',
    condition: 'End of round'
  },
  'j_rocket': {
    description: 'Earn $1; +$2 per Boss defeated',
    condition: 'End of round',
    scaling: 'Per Boss'
  },
  'j_midas_mask': {
    description: 'Face cards become Gold when scored'
  },
  'j_luchador': {
    description: 'Sell to disable current Boss Blind'
  },
  'j_gift': {
    description: '+$1 sell value to Jokers/Consumables',
    condition: 'End of round'
  },
  'j_turtle_bean': {
    description: '+5 hand size; -1 per round',
    scaling: 'Decreases'
  },
  'j_erosion': {
    description: '+4 Mult per card below starting deck',
    condition: 'Deck below 52'
  },
  'j_to_the_moon': {
    description: 'Earn $1 per $5 held (max $20)',
    condition: 'End of round'
  },
  'j_stone': {
    description: '+25 Chips per Stone card in deck',
    condition: 'Stone cards'
  },
  'j_lucky_cat': {
    description: 'x0.25 Mult per Lucky trigger',
    scaling: 'On Lucky trigger'
  },
  'j_bull': {
    description: '+2 Chips per $1 you have',
    condition: 'Per dollar'
  },
  'j_diet_cola': {
    description: 'Sell to create free Double Tag'
  },
  'j_trading': {
    description: 'First discard: destroy card, earn $3',
    condition: 'First discard'
  },
  'j_flash': {
    description: '+2 Mult per reroll in shop',
    scaling: 'Per reroll'
  },
  'j_trousers': {
    description: '+2 Mult permanently',
    scaling: 'On Two Pair',
    condition: 'Two Pair'
  },
  'j_ancient': {
    description: 'x1.5 Mult for suit matching Planet',
    condition: 'Random suit changes'
  },
  'j_ramen': {
    description: 'x2 Mult; -0.01 per card discarded',
    scaling: 'Decreases on discard'
  },
  'j_seltzer': {
    description: 'Retrigger all played cards for 10 hands',
    scaling: 'Limited uses'
  },
  'j_castle': {
    description: '+3 Chips per discarded suit card',
    scaling: 'Per discard',
    condition: 'Random suit'
  },
  'j_campfire': {
    description: 'x0.25 Mult per card sold',
    scaling: 'Resets at Boss',
    condition: 'Cards sold'
  },
  'j_mr_bones': {
    description: 'Prevent death if ≥25% chips; destroys self',
    condition: 'On death'
  },
  'j_acrobat': {
    description: 'x3 Mult',
    condition: 'Final hand of round'
  },
  'j_sock_and_buskin': {
    description: 'Retrigger all face cards'
  },
  'j_troubadour': {
    description: '+2 hand size; -1 hand per round'
  },
  'j_certificate': {
    description: 'Random card with seal added to hand',
    condition: 'Round start'
  },
  'j_smeared': {
    description: 'Hearts=Diamonds, Spades=Clubs'
  },
  'j_throwback': {
    description: 'x0.25 Mult per Blind skipped',
    scaling: 'Per skip'
  },
  'j_rough_gem': {
    description: 'Earn $1 per Diamond scored',
    condition: 'Diamonds'
  },
  'j_bloodstone': {
    description: '1 in 2: x1.5 Mult',
    condition: 'Per Heart scored'
  },
  'j_arrowhead': {
    description: '+50 Chips per Spade scored',
    condition: 'Spades'
  },
  'j_onyx_agate': {
    description: '+7 Mult per Club scored',
    condition: 'Clubs'
  },
  'j_glass': {
    description: 'x0.75 Mult per Glass card destroyed',
    scaling: 'Per Glass destroyed'
  },
  'j_showman': {
    description: 'Joker/Tarot/Planet/Spectral can appear again'
  },
  'j_flower_pot': {
    description: 'x3 Mult',
    condition: 'Hand has all 4 suits'
  },
  'j_merry_andy': {
    description: '+3 discards; -1 hand size'
  },
  'j_oops': {
    description: 'Double all probabilities (1 in 4 → 2 in 4)'
  },
  'j_idol': {
    description: 'x2 Mult for specific card',
    condition: 'Card changes each round'
  },
  'j_seeing_double': {
    description: 'x2 Mult',
    condition: 'Hand has Club + other suit'
  },
  'j_matador': {
    description: 'Earn $8 when Boss ability triggers',
    condition: 'Boss Blind ability'
  },
  'j_satellite': {
    description: 'Earn $1 per unique Planet used',
    condition: 'End of round'
  },
  'j_cartomancer': {
    description: 'Create Tarot card',
    condition: 'When Blind selected'
  },
  'j_astronomer': {
    description: 'All Planets & Celestial Packs free'
  },
  'j_bootstraps': {
    description: '+2 Mult per $5 you have',
    condition: 'Min $5'
  },

  // ============================================
  // RARE JOKERS (20)
  // ============================================

  'j_dna': {
    description: 'Copy first card to deck permanently',
    condition: 'First hand, single card'
  },
  'j_vagabond': {
    description: 'Create Tarot',
    condition: 'If $4 or less when played'
  },
  'j_baron': {
    description: 'x1.5 Mult per King held',
    condition: 'Held Kings'
  },
  'j_obelisk': {
    description: 'x0.2 Mult per hand w/o most played type',
    scaling: 'Resets on most played'
  },
  'j_baseball': {
    description: 'Uncommon Jokers each give x1.5 Mult'
  },
  'j_ancient_joker': {
    description: 'x1.5 Mult for suit matching Planet',
    condition: 'Suit changes'
  },
  'j_hit_the_road': {
    description: 'x0.5 Mult per Jack discarded',
    scaling: 'Per Jack discard'
  },
  'j_duo': {
    description: 'x2 Mult',
    condition: 'If hand has Pair'
  },
  'j_trio': {
    description: 'x3 Mult',
    condition: 'If hand has Three of a Kind'
  },
  'j_family': {
    description: 'x4 Mult',
    condition: 'If hand has Four of a Kind'
  },
  'j_order': {
    description: 'x3 Mult',
    condition: 'If hand has Straight'
  },
  'j_tribe': {
    description: 'x2 Mult',
    condition: 'If hand has Flush'
  },
  'j_stuntman': {
    description: '+250 Chips; -2 hand size'
  },
  'j_invisible': {
    description: 'After 2 rounds, sell to dupe random Joker',
    condition: 'After 2 rounds'
  },
  'j_brainstorm': {
    description: 'Copy ability of leftmost Joker'
  },
  'j_blueprint': {
    description: 'Copy ability of Joker to the right'
  },
  'j_wee': {
    description: '+8 Chips permanently per 2 scored',
    scaling: 'On 2 scored',
    condition: '2s'
  },
  'j_drivers_license': {
    description: 'x3 Mult',
    condition: 'If ≥16 Enhanced cards in deck'
  },
  'j_burnt': {
    description: 'Upgrade first discarded hand level',
    condition: 'Per round'
  },

  // ============================================
  // LEGENDARY JOKERS (5)
  // ============================================

  'j_canio': {
    description: 'x1 Mult per face card destroyed',
    scaling: 'Per face destroyed'
  },
  'j_triboulet': {
    description: 'x2 Mult per King/Queen scored',
    condition: 'Kings and Queens'
  },
  'j_yorick': {
    description: 'x1 Mult per 23 cards discarded',
    scaling: 'Per 23 discards'
  },
  'j_chicot': {
    description: 'Disables all Boss Blind effects'
  },
  'j_perkeo': {
    description: 'Create Negative copy of 1 consumable',
    condition: 'End of shop'
  },

  // ============================================
  // ALTERNATE IDS / ALIASES
  // Some jokers may have different IDs in the game
  // ============================================

  // Joker Stencil alternate
  'j_joker_stencil': {
    description: 'x1 Mult per empty Joker slot',
    condition: 'Empty slots'
  },

  // Chaos the Clown
  'j_chaos_the_clown': {
    description: '1 free reroll per shop'
  },

  // Ceremonial Dagger
  'j_ceremonial_dagger': {
    description: 'Destroy right Joker; +2× its sell value to Mult',
    condition: 'When Blind selected',
    scaling: 'On destroy'
  },

  // Space Joker
  'j_space_joker': {
    description: '1 in 4: Upgrade poker hand level',
    condition: 'When hand played'
  },

  // To Do List
  'j_to_do_list': {
    description: 'Earn $4 if hand matches listed type',
    condition: 'Random hand type'
  },

  // Mail-In Rebate
  'j_mail_in_rebate': {
    description: 'Earn $5 per discarded rank',
    condition: 'Random rank each round'
  },

  // Delayed Gratification
  'j_delayed_gratification': {
    description: 'Earn $2 per discard if none used',
    condition: 'End of round'
  },

  // Golden Ticket
  'j_ticket': {
    description: 'Gold cards earn $4 when scored',
    condition: 'Gold cards'
  },

  // The Idol
  'j_the_idol': {
    description: 'x2 Mult for specific card',
    condition: 'Card changes each round'
  },

  // The Duo, Trio, Family, Order, Tribe
  'j_the_duo': {
    description: 'x2 Mult',
    condition: 'If hand has Pair'
  },
  'j_the_trio': {
    description: 'x3 Mult',
    condition: 'If hand has Three of a Kind'
  },
  'j_the_family': {
    description: 'x4 Mult',
    condition: 'If hand has Four of a Kind'
  },
  'j_the_order': {
    description: 'x3 Mult',
    condition: 'If hand has Straight'
  },
  'j_the_tribe': {
    description: 'x2 Mult',
    condition: 'If hand has Flush'
  },

  // Oops! All 6s
  'j_oops_all_6s': {
    description: 'Double all probabilities (1 in 4 → 2 in 4)'
  },

  // Spare Trousers
  'j_spare_trousers': {
    description: '+2 Mult permanently',
    scaling: 'On Two Pair',
    condition: 'Two Pair'
  },

  // Trading Card
  'j_trading_card': {
    description: 'First discard: destroy card, earn $3',
    condition: 'First discard'
  },

  // Flash Card
  'j_flash_card': {
    description: '+2 Mult per reroll in shop',
    scaling: 'Per reroll'
  },

  // Invisible Joker
  'j_invisible_joker': {
    description: 'After 2 rounds, sell to dupe random Joker',
    condition: 'After 2 rounds'
  },

  // Burnt Joker
  'j_burnt_joker': {
    description: 'Upgrade first discarded hand level',
    condition: 'Per round'
  },

  // Wee Joker
  'j_wee_joker': {
    description: '+8 Chips permanently per 2 scored',
    scaling: 'On 2 scored',
    condition: '2s'
  },

  // Glass Joker
  'j_glass_joker': {
    description: 'x0.75 Mult per Glass card destroyed',
    scaling: 'Per Glass destroyed'
  },

  // Stone Joker
  'j_stone_joker': {
    description: '+25 Chips per Stone card in deck',
    condition: 'Stone cards'
  },
};

/**
 * Get joker description by ID, with fallback.
 */
export function getJokerDescription(id: string): JokerDescription | null {
  // Try exact match first
  if (JOKER_DESCRIPTIONS[id]) {
    return JOKER_DESCRIPTIONS[id];
  }

  // Try with j_ prefix if not present
  if (!id.startsWith('j_') && JOKER_DESCRIPTIONS['j_' + id]) {
    return JOKER_DESCRIPTIONS['j_' + id];
  }

  // Try without j_ prefix if present
  if (id.startsWith('j_') && JOKER_DESCRIPTIONS[id.slice(2)]) {
    return JOKER_DESCRIPTIONS[id.slice(2)];
  }

  return null;
}
