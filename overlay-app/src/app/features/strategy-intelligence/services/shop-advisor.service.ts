import { Injectable, computed, inject, signal } from '@angular/core';
import { SynergyGraphService } from './synergy-graph.service';
import { BuildDetectorService } from './build-detector.service';
import { GameStateService } from '../../../core/services/game-state.service';
import {
  OverlayGameState,
  ShopItem,
  BlindState,
} from '../../../../../../shared/models/game-state.model';
import { JokerState } from '../../../../../../shared/models/joker.model';
import { DetectedStrategy } from '../../../../../../shared/models/strategy.model';

export interface ShopRecommendation {
  item: ShopItem;
  score: number;
  reasons: string[];
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  synergiesWithOwned: string[];
}

export interface BoosterCardRecommendation {
  cardId: string;
  cardName: string;
  score: number;
  reasons: string[];
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
}

// Comprehensive joker knowledge base
interface JokerKnowledge {
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  baseScore: number;
  tags: string[];
  earlyGameBonus?: number;  // Ante 1-2 bonus
  midGameBonus?: number;    // Ante 3-4 bonus
  lateGamePenalty?: number; // Ante 5+ penalty
  wantsSellValue?: boolean; // Benefits from high sell value jokers
  providesXMult?: boolean;
  providesMult?: boolean;
  providesChips?: boolean;
  providesEconomy?: boolean;
  isScaling?: boolean;
  wantsFaceCards?: boolean;
  wantsPairs?: boolean;
  wantsFlush?: boolean;
  antiSynergyWith?: string[]; // Joker IDs that hurt this joker
}

// Extended joker knowledge including many common jokers
const JOKER_KNOWLEDGE: Record<string, JokerKnowledge> = {
  // S-Tier - Game winning
  'j_blueprint': { tier: 'S', baseScore: 88, tags: ['copy', 'xmult'], providesXMult: true },
  'j_brainstorm': { tier: 'S', baseScore: 86, tags: ['copy', 'xmult'], providesXMult: true },
  'j_triboulet': { tier: 'S', baseScore: 92, tags: ['xmult', 'face'], providesXMult: true, wantsFaceCards: true },
  'j_baron': { tier: 'S', baseScore: 88, tags: ['xmult', 'face'], providesXMult: true, wantsFaceCards: true },
  'j_duo': { tier: 'A', baseScore: 82, tags: ['xmult', 'pairs'], providesXMult: true, wantsPairs: true },
  'j_trio': { tier: 'A', baseScore: 84, tags: ['xmult', 'pairs'], providesXMult: true, wantsPairs: true },
  'j_family': { tier: 'S', baseScore: 88, tags: ['xmult', 'pairs'], providesXMult: true, wantsPairs: true },
  'j_order': { tier: 'A', baseScore: 82, tags: ['xmult', 'straight'], providesXMult: true },
  'j_tribe': { tier: 'S', baseScore: 90, tags: ['xmult', 'flush'], providesXMult: true, wantsFlush: true },
  'j_cavendish': { tier: 'A', baseScore: 78, tags: ['xmult', 'risky'], providesXMult: true },
  'j_perkeo': { tier: 'S', baseScore: 95, tags: ['legendary', 'consumable'] },
  'j_chicot': { tier: 'S', baseScore: 90, tags: ['legendary', 'boss-killer'] },
  'j_yorick': { tier: 'A', baseScore: 82, tags: ['legendary', 'xmult'], providesXMult: true },

  // A-Tier - Very strong
  'j_steel_joker': { tier: 'A', baseScore: 78, tags: ['xmult', 'scaling', 'steel'], providesXMult: true, isScaling: true },
  'j_glass_joker': { tier: 'A', baseScore: 75, tags: ['xmult', 'scaling', 'glass'], providesXMult: true, isScaling: true },
  'j_hologram': { tier: 'A', baseScore: 76, tags: ['xmult', 'scaling'], providesXMult: true, isScaling: true },
  'j_vampire': { tier: 'A', baseScore: 74, tags: ['xmult', 'scaling', 'enhancement'], providesXMult: true, isScaling: true },
  'j_obelisk': { tier: 'A', baseScore: 72, tags: ['xmult', 'scaling'], providesXMult: true, isScaling: true },
  'j_constellation': { tier: 'A', baseScore: 74, tags: ['xmult', 'scaling', 'planet'], providesXMult: true, isScaling: true },
  'j_madness': { tier: 'A', baseScore: 70, tags: ['xmult', 'scaling'], providesXMult: true, isScaling: true },
  'j_loyalty_card': { tier: 'A', baseScore: 72, tags: ['xmult'], providesXMult: true },
  'j_drivers_license': { tier: 'A', baseScore: 78, tags: ['xmult'], providesXMult: true },
  'j_blackboard': { tier: 'A', baseScore: 76, tags: ['xmult', 'suit'], providesXMult: true },
  'j_sock_and_buskin': { tier: 'A', baseScore: 75, tags: ['retrigger', 'face'], wantsFaceCards: true },
  'j_hanging_chad': { tier: 'A', baseScore: 72, tags: ['retrigger'] },
  'j_dusk': { tier: 'A', baseScore: 70, tags: ['retrigger', 'xmult'], providesXMult: true },
  'j_hack': { tier: 'A', baseScore: 72, tags: ['retrigger', 'rank'] },
  'j_seltzer': { tier: 'B', baseScore: 65, tags: ['retrigger'] },
  'j_mime': { tier: 'A', baseScore: 74, tags: ['retrigger', 'hand'] },

  // B-Tier - Solid picks
  'j_fibonacci': { tier: 'B', baseScore: 68, tags: ['mult', 'rank'], providesMult: true },
  'j_gros_michel': { tier: 'B', baseScore: 72, tags: ['mult', 'risky'], providesMult: true, earlyGameBonus: 15, lateGamePenalty: 25 },
  'j_jolly': { tier: 'B', baseScore: 62, tags: ['mult', 'pairs'], providesMult: true, wantsPairs: true },
  'j_zany': { tier: 'B', baseScore: 64, tags: ['mult', 'pairs'], providesMult: true, wantsPairs: true },
  'j_mad': { tier: 'B', baseScore: 60, tags: ['mult', 'pairs'], providesMult: true, wantsPairs: true },
  'j_crazy': { tier: 'B', baseScore: 62, tags: ['mult', 'straight'], providesMult: true },
  'j_droll': { tier: 'B', baseScore: 66, tags: ['mult', 'flush'], providesMult: true, wantsFlush: true },
  'j_sly': { tier: 'B', baseScore: 58, tags: ['chips', 'pairs'], providesChips: true, wantsPairs: true },
  'j_wily': { tier: 'B', baseScore: 60, tags: ['chips', 'pairs'], providesChips: true, wantsPairs: true },
  'j_clever': { tier: 'B', baseScore: 58, tags: ['chips', 'pairs'], providesChips: true, wantsPairs: true },
  'j_devious': { tier: 'B', baseScore: 58, tags: ['chips', 'straight'], providesChips: true },
  'j_crafty': { tier: 'B', baseScore: 60, tags: ['chips', 'flush'], providesChips: true, wantsFlush: true },
  'j_lusty_joker': { tier: 'B', baseScore: 64, tags: ['mult', 'suit', 'hearts'], providesMult: true },
  'j_greedy_joker': { tier: 'B', baseScore: 64, tags: ['mult', 'suit', 'diamonds'], providesMult: true },
  'j_wrathful_joker': { tier: 'B', baseScore: 64, tags: ['mult', 'suit', 'spades'], providesMult: true },
  'j_gluttonous_joker': { tier: 'B', baseScore: 64, tags: ['mult', 'suit', 'clubs'], providesMult: true },
  'j_half': { tier: 'B', baseScore: 58, tags: ['mult'], providesMult: true },
  'j_abstract': { tier: 'B', baseScore: 62, tags: ['mult', 'scaling'], providesMult: true, isScaling: true },
  'j_ride_the_bus': { tier: 'B', baseScore: 60, tags: ['mult', 'scaling'], providesMult: true, isScaling: true },
  'j_green_joker': { tier: 'B', baseScore: 55, tags: ['mult', 'scaling'], providesMult: true, isScaling: true },
  'j_supernova': { tier: 'B', baseScore: 58, tags: ['mult'], providesMult: true },
  'j_erosion': { tier: 'B', baseScore: 52, tags: ['mult'], providesMult: true },
  'j_raised_fist': { tier: 'B', baseScore: 55, tags: ['mult', 'hand'], providesMult: true },
  'j_scary_face': { tier: 'B', baseScore: 62, tags: ['chips', 'face'], providesChips: true, wantsFaceCards: true },
  'j_smiley': { tier: 'B', baseScore: 62, tags: ['mult', 'face'], providesMult: true, wantsFaceCards: true },
  'j_photograph': { tier: 'B', baseScore: 65, tags: ['xmult', 'face'], providesXMult: true, wantsFaceCards: true },
  'j_even_steven': { tier: 'B', baseScore: 58, tags: ['mult', 'rank'], providesMult: true },
  'j_odd_todd': { tier: 'B', baseScore: 58, tags: ['chips', 'rank'], providesChips: true },
  'j_scholar': { tier: 'B', baseScore: 60, tags: ['chips', 'mult', 'aces'], providesChips: true, providesMult: true },
  'j_walkie_talkie': { tier: 'B', baseScore: 58, tags: ['chips', 'mult', 'rank'], providesChips: true, providesMult: true },
  'j_business': { tier: 'B', baseScore: 55, tags: ['money', 'face'], providesEconomy: true, wantsFaceCards: true },
  'j_pareidolia': { tier: 'A', baseScore: 74, tags: ['face', 'enabler'], wantsFaceCards: true },
  'j_shoot_the_moon': { tier: 'B', baseScore: 65, tags: ['mult', 'queens'], providesMult: true },
  'j_canio': { tier: 'A', baseScore: 78, tags: ['xmult', 'face', 'scaling'], providesXMult: true, wantsFaceCards: true, isScaling: true },
  'j_stencil': { tier: 'B', baseScore: 62, tags: ['xmult', 'slots'], providesXMult: true },
  'j_wee': { tier: 'B', baseScore: 55, tags: ['chips', 'scaling', 'twos'], providesChips: true, isScaling: true },
  'j_four_fingers': { tier: 'A', baseScore: 72, tags: ['enabler', 'flush', 'straight'], wantsFlush: true },

  // Economy jokers - very ante-dependent
  'j_golden': { tier: 'B', baseScore: 60, tags: ['economy', 'passive'], providesEconomy: true, earlyGameBonus: 25, lateGamePenalty: 35 },
  'j_egg': { tier: 'B', baseScore: 52, tags: ['economy', 'sell'], providesEconomy: true, earlyGameBonus: 25, lateGamePenalty: 40 },
  'j_to_the_moon': { tier: 'B', baseScore: 65, tags: ['economy', 'interest'], providesEconomy: true, earlyGameBonus: 20, lateGamePenalty: 25 },
  'j_cloud_9': { tier: 'A', baseScore: 72, tags: ['economy', 'nines'], providesEconomy: true, earlyGameBonus: 15, lateGamePenalty: 20 },
  'j_rocket': { tier: 'B', baseScore: 62, tags: ['economy', 'scaling'], providesEconomy: true, earlyGameBonus: 18, lateGamePenalty: 30, isScaling: true },
  'j_delayed_grat': { tier: 'C', baseScore: 45, tags: ['economy'], providesEconomy: true, earlyGameBonus: 20, lateGamePenalty: 30 },
  'j_credit_card': { tier: 'D', baseScore: 35, tags: ['economy', 'debt'], providesEconomy: true, earlyGameBonus: 15, lateGamePenalty: 25 },
  'j_bull': { tier: 'B', baseScore: 62, tags: ['chips', 'economy'], providesChips: true, providesEconomy: true },
  'j_bootstraps': { tier: 'B', baseScore: 64, tags: ['mult', 'economy'], providesMult: true, providesEconomy: true },
  'j_rough_gem': { tier: 'B', baseScore: 58, tags: ['economy', 'diamonds'], providesEconomy: true },

  // Swashbuckler - special case, scales with sell values
  'j_swashbuckler': { tier: 'B', baseScore: 55, tags: ['mult', 'sell-value'], providesMult: true, wantsSellValue: true },

  // Hallucination - utility joker
  'j_hallucination': { tier: 'B', baseScore: 58, tags: ['consumable', 'tarot', 'random'], midGameBonus: 10 },

  // Copy targets
  'j_campfire': { tier: 'B', baseScore: 62, tags: ['xmult', 'scaling', 'sell'], providesXMult: true, isScaling: true },
  'j_acrobat': { tier: 'B', baseScore: 65, tags: ['xmult'], providesXMult: true },
  'j_throwback': { tier: 'B', baseScore: 55, tags: ['xmult', 'scaling'], providesXMult: true, isScaling: true },
  'j_ancient': { tier: 'B', baseScore: 60, tags: ['xmult', 'suit'], providesXMult: true },
  'j_ramen': { tier: 'B', baseScore: 58, tags: ['xmult', 'risky'], providesXMult: true },
  'j_bloodstone': { tier: 'B', baseScore: 62, tags: ['xmult', 'hearts', 'lucky'], providesXMult: true },
  'j_lucky_cat': { tier: 'B', baseScore: 65, tags: ['xmult', 'scaling', 'lucky'], providesXMult: true, isScaling: true },
  'j_8_ball': { tier: 'C', baseScore: 48, tags: ['tarot', 'lucky'] },
  'j_misprint': { tier: 'C', baseScore: 45, tags: ['mult', 'random'], providesMult: true },
  'j_seance': { tier: 'B', baseScore: 55, tags: ['spectral'] },
  'j_vagabond': { tier: 'B', baseScore: 58, tags: ['tarot', 'money'] },
  'j_cartomancer': { tier: 'B', baseScore: 62, tags: ['tarot', 'consumable'] },
  'j_fortune_teller': { tier: 'B', baseScore: 55, tags: ['mult', 'tarot'], providesMult: true },
  'j_space': { tier: 'B', baseScore: 58, tags: ['planet', 'level'] },
  'j_satellite': { tier: 'B', baseScore: 60, tags: ['economy', 'planet'], providesEconomy: true },
  'j_astronomer': { tier: 'B', baseScore: 62, tags: ['planet', 'free'] },

  // C-tier and below
  'j_joker': { tier: 'C', baseScore: 40, tags: ['mult', 'basic'], providesMult: true },
  'j_mystic_summit': { tier: 'C', baseScore: 42, tags: ['mult', 'discard'], providesMult: true },
  'j_popcorn': { tier: 'C', baseScore: 38, tags: ['mult', 'decay'], providesMult: true },
  'j_flash': { tier: 'C', baseScore: 45, tags: ['mult', 'reroll'], providesMult: true },
  'j_trousers': { tier: 'C', baseScore: 48, tags: ['mult', 'pairs'], providesMult: true, wantsPairs: true },
  'j_runner': { tier: 'C', baseScore: 48, tags: ['chips', 'straight', 'scaling'], providesChips: true, isScaling: true },
  'j_ice_cream': { tier: 'D', baseScore: 32, tags: ['chips', 'decay'], providesChips: true },
  'j_faceless': { tier: 'C', baseScore: 45, tags: ['economy', 'face', 'discard'], providesEconomy: true, wantsFaceCards: true },
  'j_chaos': { tier: 'D', baseScore: 35, tags: ['reroll', 'free'] },
  'j_reserved_parking': { tier: 'C', baseScore: 42, tags: ['economy', 'face', 'random'], providesEconomy: true, wantsFaceCards: true },
  'j_mail': { tier: 'C', baseScore: 40, tags: ['economy', 'discard'], providesEconomy: true },
  'j_burglar': { tier: 'C', baseScore: 45, tags: ['hands', 'discard'] },
  'j_marble': { tier: 'C', baseScore: 48, tags: ['stone', 'deck'] },
  'j_stone': { tier: 'C', baseScore: 50, tags: ['chips', 'stone'], providesChips: true },
  'j_ceremonial': { tier: 'D', baseScore: 35, tags: ['mult', 'destroy'], providesMult: true },
  'j_banner': { tier: 'C', baseScore: 48, tags: ['chips', 'discard'], providesChips: true },
  'j_diet_cola': { tier: 'D', baseScore: 30, tags: ['sell', 'tag'] },
  'j_mr_bones': { tier: 'C', baseScore: 50, tags: ['save', 'death'], lateGamePenalty: -10 }, // Actually better late
  'j_certificate': { tier: 'C', baseScore: 45, tags: ['gold', 'wild'] },
  'j_superposition': { tier: 'B', baseScore: 55, tags: ['straight', 'ace', 'tarot'] },
  'j_shortcut': { tier: 'B', baseScore: 58, tags: ['straight', 'enabler'] },
  'j_seeing_double': { tier: 'B', baseScore: 55, tags: ['xmult', 'clubs'], providesXMult: true },
  'j_flower_pot': { tier: 'C', baseScore: 48, tags: ['xmult'], providesXMult: true, antiSynergyWith: ['j_smeared'] },
  'j_ring_master': { tier: 'B', baseScore: 58, tags: ['joker', 'slots'] },
  'j_gift': { tier: 'C', baseScore: 45, tags: ['sell', 'consumable'] },
  'j_turtle_bean': { tier: 'C', baseScore: 45, tags: ['hand-size', 'decay'] },
  'j_juggler': { tier: 'C', baseScore: 42, tags: ['hand-size'] },
  'j_drunkard': { tier: 'C', baseScore: 42, tags: ['discards'] },
  'j_merry_andy': { tier: 'B', baseScore: 55, tags: ['discards', 'hand-size'] },
  'j_troubadour': { tier: 'B', baseScore: 52, tags: ['hand-size', 'hands'] },
  'j_smeared': { tier: 'A', baseScore: 72, tags: ['suit', 'enabler', 'flush'], wantsFlush: true },
  'j_splash': { tier: 'B', baseScore: 55, tags: ['all-cards', 'score'] },
  'j_selzer': { tier: 'B', baseScore: 58, tags: ['retrigger', 'temporary'] },
};

// Boss blind effects that affect scoring
const BOSS_BLIND_EFFECTS: Record<string, { affectsJokers: string[], penalty: number, reason: string }> = {
  'The Plant': { affectsJokers: [], penalty: 25, reason: 'Debuffs face cards' }, // Special handling
  'The Pillar': { affectsJokers: [], penalty: 15, reason: 'Cards played previously are debuffed' },
  'The Goad': { affectsJokers: [], penalty: 15, reason: 'Debuffs Spades' },
  'The Head': { affectsJokers: [], penalty: 15, reason: 'Debuffs Hearts' },
  'The Club': { affectsJokers: [], penalty: 15, reason: 'Debuffs Clubs' },
  'The Window': { affectsJokers: [], penalty: 15, reason: 'Debuffs Diamonds' },
  'The Eye': { affectsJokers: [], penalty: 10, reason: 'Must play different hand each time' },
  'The Mouth': { affectsJokers: [], penalty: 10, reason: 'Must play same hand each time' },
  'The Fish': { affectsJokers: [], penalty: 5, reason: 'Cards drawn face down' },
  'The Psychic': { affectsJokers: [], penalty: 5, reason: 'Must play 5 cards' },
  'The Tooth': { affectsJokers: [], penalty: 10, reason: 'Lose $1 per card played' },
  'The Flint': { affectsJokers: [], penalty: 15, reason: 'Base chips and mult halved' },
  'The Mark': { affectsJokers: [], penalty: 10, reason: 'Face cards drawn face down' },
  'The Wheel': { affectsJokers: [], penalty: 8, reason: '1 in 7 cards drawn face down' },
  'The Arm': { affectsJokers: [], penalty: 12, reason: 'Decreases hand level on play' },
  'The Needle': { affectsJokers: [], penalty: 15, reason: 'Only one hand to play' },
  'The Wall': { affectsJokers: [], penalty: 0, reason: 'Extra large blind (needs scaling)' },
  'The Serpent': { affectsJokers: [], penalty: 5, reason: 'Draw 3 cards after play/discard' },
  'The House': { affectsJokers: [], penalty: 10, reason: 'First hand drawn face down' },
  'The Ox': { affectsJokers: [], penalty: 10, reason: 'Sets money to $0 on #1 hand played' },
  'Verdant Leaf': { affectsJokers: [], penalty: 8, reason: 'Cards debuffed until 1 sold' },
  'Violet Vessel': { affectsJokers: [], penalty: 20, reason: 'Very large blind' },
  'Amber Acorn': { affectsJokers: [], penalty: 15, reason: 'Flips and shuffles jokers' },
  'Crimson Heart': { affectsJokers: [], penalty: 18, reason: 'Random joker disabled per hand' },
  'Cerulean Bell': { affectsJokers: [], penalty: 10, reason: 'Forces 1 card selection always' },
};

@Injectable({ providedIn: 'root' })
export class ShopAdvisorService {
  private readonly synergyGraph = inject(SynergyGraphService);
  private readonly buildDetector = inject(BuildDetectorService);
  private readonly gameStateService = inject(GameStateService);

  private readonly gameState = signal<OverlayGameState | null>(null);

  // Computed values
  readonly currentAnte = computed(() => this.gameState()?.progress.ante ?? 1);
  readonly currentPhase = computed(() => this.gameState()?.progress.phase ?? 'menu');
  readonly ownedJokers = computed(() => this.gameState()?.jokers ?? []);
  readonly shopItems = computed(() => this.gameState()?.shop?.items ?? []);
  readonly currentBlind = computed(() => this.gameState()?.blind ?? null);
  readonly money = computed(() => this.gameState()?.progress.money ?? 0);

  // Build detection for display
  readonly primaryBuild = computed(() => this.buildDetector.primaryStrategy());
  readonly allBuilds = computed(() => this.buildDetector.detectedStrategies());

  /**
   * Update the game state from external source
   */
  updateState(state: OverlayGameState): void {
    this.gameState.set(state);
    // Also update build detector
    this.buildDetector['gameState'].state.set(state);
  }

  /**
   * Get shop recommendations sorted by score
   */
  getShopRecommendations(): ShopRecommendation[] {
    const items = this.shopItems();
    const ante = this.currentAnte();
    const owned = this.ownedJokers();
    const blind = this.currentBlind();
    const money = this.money();
    const build = this.primaryBuild();

    console.log('[ShopAdvisor] === Scoring Context ===');
    console.log('[ShopAdvisor] Ante:', ante);
    console.log('[ShopAdvisor] Money:', money);
    console.log('[ShopAdvisor] Owned Jokers:', owned.map(j => j.name).join(', ') || 'None');
    console.log('[ShopAdvisor] Current/Next Blind:', blind?.name || 'Unknown');
    console.log('[ShopAdvisor] Detected Build:', build ? `${build.type} (${build.confidence}%)` : 'None');
    console.log('[ShopAdvisor] ======================');

    const recommendations = items
      .filter(item => !item.sold)
      .map(item => this.scoreShopItem(item, ante, owned, blind, build, money))
      .sort((a, b) => b.score - a.score);

    console.log('[ShopAdvisor] Final Recommendations:');
    recommendations.forEach(r => {
      console.log(`  ${r.item.name}: ${r.score} (${r.tier}) - ${r.reasons.slice(0, 2).join(', ')}`);
    });

    return recommendations;
  }

  /**
   * Score a specific joker by ID with current context
   */
  scoreJoker(jokerId: string): number {
    const knowledge = JOKER_KNOWLEDGE[jokerId];
    if (!knowledge) return 50;

    return this.calculateJokerScore(
      jokerId,
      knowledge,
      this.currentAnte(),
      this.ownedJokers(),
      this.currentBlind(),
      this.primaryBuild()
    );
  }

  /**
   * Score booster pack contents
   */
  scoreBoosterContents(cards: Array<{ id: string; name: string; type: string }>): BoosterCardRecommendation[] {
    const ante = this.currentAnte();
    const owned = this.ownedJokers();
    const blind = this.currentBlind();
    const build = this.primaryBuild();

    return cards
      .map(card => {
        if (card.type === 'joker') {
          const knowledge = JOKER_KNOWLEDGE[card.id];
          const score = knowledge
            ? this.calculateJokerScore(card.id, knowledge, ante, owned, blind, build)
            : 50;

          return {
            cardId: card.id,
            cardName: card.name,
            score,
            reasons: this.getJokerReasons(card.id, knowledge, ante, owned, blind, build),
            tier: this.scoreToTier(score),
          };
        }
        return this.scoreConsumable(card, ante);
      })
      .sort((a, b) => b.score - a.score);
  }

  isInBoosterPhase(): boolean {
    return this.currentPhase() === 'booster';
  }

  private scoreShopItem(
    item: ShopItem,
    ante: number,
    ownedJokers: JokerState[],
    blind: BlindState | null,
    build: DetectedStrategy | null,
    money: number
  ): ShopRecommendation {
    if (item.type === 'joker') {
      const knowledge = JOKER_KNOWLEDGE[item.id];
      const score = this.calculateJokerScore(item.id, knowledge, ante, ownedJokers, blind, build);
      const reasons = this.getJokerReasons(item.id, knowledge, ante, ownedJokers, blind, build);
      const synergies = this.findSynergiesWithOwned(item.id, ownedJokers);

      return {
        item,
        score,
        reasons,
        tier: this.scoreToTier(score),
        synergiesWithOwned: synergies,
      };
    }

    return this.scoreNonJokerItem(item, ante, money, build);
  }

  private calculateJokerScore(
    jokerId: string,
    knowledge: JokerKnowledge | undefined,
    ante: number,
    ownedJokers: JokerState[],
    blind: BlindState | null,
    build: DetectedStrategy | null
  ): number {
    // Start with base score or default
    let score = knowledge?.baseScore ?? 50;
    const debugReasons: string[] = [`Base: ${score}`];

    // 1. ANTE-BASED ADJUSTMENTS
    score = this.applyAnteModifiers(score, knowledge, ante, debugReasons);

    // 2. SYNERGY WITH OWNED JOKERS
    score = this.applySynergyBonus(score, jokerId, knowledge, ownedJokers, debugReasons);

    // 3. DIMINISHING RETURNS CHECK
    score = this.applyDiminishingReturns(score, jokerId, knowledge, ownedJokers, debugReasons);

    // 4. BUILD FIT BONUS
    score = this.applyBuildFitBonus(score, jokerId, knowledge, build, debugReasons);

    // 5. BOSS BLIND AWARENESS
    score = this.applyBossBlindModifier(score, jokerId, knowledge, blind, debugReasons);

    // 6. COPY JOKER SPECIAL HANDLING
    score = this.handleCopyJokers(score, jokerId, ownedJokers, debugReasons);

    // Clamp to 0-100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    console.log(`[ShopAdvisor] ${jokerId}: ${debugReasons.join(' -> ')} = ${finalScore}`);

    return finalScore;
  }

  private applyAnteModifiers(
    score: number,
    knowledge: JokerKnowledge | undefined,
    ante: number,
    debug: string[]
  ): number {
    if (!knowledge) return score;

    const isEarlyGame = ante <= 2;
    const isMidGame = ante >= 3 && ante <= 4;
    const isLateGame = ante >= 5;

    // Early game bonuses (Ante 1-2)
    if (isEarlyGame && knowledge.earlyGameBonus) {
      score += knowledge.earlyGameBonus;
      debug.push(`Early+${knowledge.earlyGameBonus}`);
    }

    // Mid game bonuses (Ante 3-4)
    if (isMidGame && knowledge.midGameBonus) {
      score += knowledge.midGameBonus;
      debug.push(`Mid+${knowledge.midGameBonus}`);
    }

    // Late game penalties (Ante 5+)
    if (isLateGame && knowledge.lateGamePenalty) {
      score -= knowledge.lateGamePenalty;
      debug.push(`Late-${knowledge.lateGamePenalty}`);
    }

    // Economy jokers get massive penalties late game
    if (isLateGame && knowledge.providesEconomy && !knowledge.providesXMult) {
      const econoPenalty = (ante - 4) * 8;
      score -= econoPenalty;
      debug.push(`Econ-${econoPenalty}`);
    }

    // xMult becomes essential late game
    if (ante >= 6 && knowledge.providesXMult) {
      score += 15;
      debug.push('xMult+15');
    }

    // Basic mult jokers become bad late game
    if (ante >= 6 && knowledge.providesMult && !knowledge.providesXMult && !knowledge.isScaling) {
      score -= 20;
      debug.push('Mult-20');
    }

    return score;
  }

  private applySynergyBonus(
    score: number,
    jokerId: string,
    knowledge: JokerKnowledge | undefined,
    ownedJokers: JokerState[],
    debug: string[]
  ): number {
    if (ownedJokers.length === 0) return score;

    let synergyBonus = 0;

    // Check from synergy graph
    const synergies = this.synergyGraph.getSynergies(jokerId);
    const ownedIds = new Set(ownedJokers.map(j => j.id));

    for (const synergy of synergies) {
      if (ownedIds.has(synergy.jokerId)) {
        const bonus = synergy.strength === 'strong' ? 12 : synergy.strength === 'medium' ? 6 : 3;
        synergyBonus += bonus;
      }
    }

    // Special synergy: Swashbuckler wants high sell-value jokers
    if (knowledge?.wantsSellValue) {
      const totalSellValue = ownedJokers.reduce((sum, j) => sum + (j.sellValue ?? 0), 0);
      if (totalSellValue >= 10) {
        synergyBonus += 15;
        debug.push(`SellVal+15 (${totalSellValue}$)`);
      } else if (totalSellValue >= 5) {
        synergyBonus += 8;
        debug.push(`SellVal+8 (${totalSellValue}$)`);
      }
    }

    // Check for strategy matches with owned jokers
    const ownedHasXMult = ownedJokers.some(j => JOKER_KNOWLEDGE[j.id]?.providesXMult);
    const ownedHasMult = ownedJokers.some(j => JOKER_KNOWLEDGE[j.id]?.providesMult);
    const ownedHasFaceSupport = ownedJokers.some(j => JOKER_KNOWLEDGE[j.id]?.wantsFaceCards);
    const ownedHasPairSupport = ownedJokers.some(j => JOKER_KNOWLEDGE[j.id]?.wantsPairs);
    const ownedHasFlushSupport = ownedJokers.some(j => JOKER_KNOWLEDGE[j.id]?.wantsFlush);

    // Face card synergies
    if (knowledge?.wantsFaceCards && ownedHasFaceSupport) {
      synergyBonus += 10;
      debug.push('FaceSync+10');
    }

    // Pair synergies
    if (knowledge?.wantsPairs && ownedHasPairSupport) {
      synergyBonus += 10;
      debug.push('PairSync+10');
    }

    // Flush synergies
    if (knowledge?.wantsFlush && ownedHasFlushSupport) {
      synergyBonus += 10;
      debug.push('FlushSync+10');
    }

    // If we have mult but no xMult, xMult jokers get bonus
    if (knowledge?.providesXMult && ownedHasMult && !ownedHasXMult) {
      synergyBonus += 15;
      debug.push('NeedXMult+15');
    }

    if (synergyBonus > 0) {
      debug.push(`Syn+${Math.min(synergyBonus, 30)}`);
    }

    return score + Math.min(synergyBonus, 30); // Cap synergy bonus
  }

  private applyDiminishingReturns(
    score: number,
    jokerId: string,
    knowledge: JokerKnowledge | undefined,
    ownedJokers: JokerState[],
    debug: string[]
  ): number {
    if (!knowledge || ownedJokers.length === 0) return score;

    // Count how many of the same type we have
    const ownedMultJokers = ownedJokers.filter(j => JOKER_KNOWLEDGE[j.id]?.providesMult).length;
    const ownedXMultJokers = ownedJokers.filter(j => JOKER_KNOWLEDGE[j.id]?.providesXMult).length;
    const ownedEconJokers = ownedJokers.filter(j => JOKER_KNOWLEDGE[j.id]?.providesEconomy).length;

    // Diminishing returns on stacking same type
    if (knowledge.providesMult && !knowledge.providesXMult && ownedMultJokers >= 3) {
      const penalty = (ownedMultJokers - 2) * 8;
      score -= penalty;
      debug.push(`MultStack-${penalty}`);
    }

    if (knowledge.providesEconomy && ownedEconJokers >= 2) {
      const penalty = (ownedEconJokers - 1) * 10;
      score -= penalty;
      debug.push(`EconStack-${penalty}`);
    }

    // xMult stacking is actually good, but slight diminish after 3
    if (knowledge.providesXMult && ownedXMultJokers >= 3) {
      const penalty = (ownedXMultJokers - 2) * 5;
      score -= penalty;
      debug.push(`XMultStack-${penalty}`);
    }

    // Check for anti-synergies
    if (knowledge.antiSynergyWith) {
      const ownedIds = new Set(ownedJokers.map(j => j.id));
      for (const antiId of knowledge.antiSynergyWith) {
        if (ownedIds.has(antiId)) {
          score -= 15;
          debug.push(`Anti-15`);
        }
      }
    }

    return score;
  }

  private applyBuildFitBonus(
    score: number,
    jokerId: string,
    knowledge: JokerKnowledge | undefined,
    build: DetectedStrategy | null,
    debug: string[]
  ): number {
    if (!build || build.confidence < 40) return score;

    // Check joker data from synergy graph for strategy affinity
    const jokerData = this.synergyGraph.getJoker(jokerId);
    if (jokerData) {
      const strategyMatch = jokerData.strategies.find(s => s.strategy === build.type);
      if (strategyMatch && strategyMatch.affinity >= 60) {
        const bonus = Math.round((strategyMatch.affinity / 100) * 20);
        score += bonus;
        debug.push(`Build+${bonus}`);
      }
    }

    // Check knowledge tags for build fit
    if (knowledge) {
      if (build.type === 'flush' && knowledge.wantsFlush) {
        score += 12;
        debug.push('FlushBuild+12');
      }
      if (build.type === 'pairs' && knowledge.wantsPairs) {
        score += 12;
        debug.push('PairsBuild+12');
      }
      if (build.type === 'face_cards' && knowledge.wantsFaceCards) {
        score += 12;
        debug.push('FaceBuild+12');
      }
      if (build.type === 'xmult_scaling' && knowledge.providesXMult) {
        score += 15;
        debug.push('XMultBuild+15');
      }
    }

    return score;
  }

  private applyBossBlindModifier(
    score: number,
    jokerId: string,
    knowledge: JokerKnowledge | undefined,
    blind: BlindState | null,
    debug: string[]
  ): number {
    if (!blind || !blind.isBoss) return score;

    const bossEffect = BOSS_BLIND_EFFECTS[blind.name];
    if (!bossEffect) return score;

    // The Plant debuffs face cards - penalize face card jokers
    if (blind.name === 'The Plant' && knowledge?.wantsFaceCards) {
      score -= 25;
      debug.push('Plant-25');
    }

    // Suit-based blinds
    if (blind.name === 'The Goad' && knowledge?.tags?.includes('spades')) {
      score -= 15;
      debug.push('Goad-15');
    }
    if (blind.name === 'The Head' && knowledge?.tags?.includes('hearts')) {
      score -= 15;
      debug.push('Head-15');
    }
    if (blind.name === 'The Club' && knowledge?.tags?.includes('clubs')) {
      score -= 15;
      debug.push('Club-15');
    }
    if (blind.name === 'The Window' && knowledge?.tags?.includes('diamonds')) {
      score -= 15;
      debug.push('Window-15');
    }

    // The Wall (extra large) - scaling jokers more valuable
    if (blind.name === 'The Wall' && knowledge?.isScaling) {
      score += 10;
      debug.push('Wall+10');
    }

    // Violet Vessel - xMult essential
    if (blind.name === 'Violet Vessel' && knowledge?.providesXMult) {
      score += 15;
      debug.push('Vessel+15');
    }

    return score;
  }

  private handleCopyJokers(
    score: number,
    jokerId: string,
    ownedJokers: JokerState[],
    debug: string[]
  ): number {
    const isCopyJoker = jokerId === 'j_blueprint' || jokerId === 'j_brainstorm';
    if (!isCopyJoker || ownedJokers.length === 0) return score;

    // Check quality of copy targets
    const hasXMultTarget = ownedJokers.some(j =>
      JOKER_KNOWLEDGE[j.id]?.providesXMult && JOKER_KNOWLEDGE[j.id]?.tier !== 'C'
    );
    const hasAnyTarget = ownedJokers.some(j => {
      const k = JOKER_KNOWLEDGE[j.id];
      return k && (k.tier === 'S' || k.tier === 'A' || k.providesXMult);
    });

    if (hasXMultTarget) {
      score = Math.max(score, 92);
      debug.push('CopyXMult=92');
    } else if (hasAnyTarget) {
      score = Math.max(score, 85);
      debug.push('CopyGood=85');
    } else {
      score = Math.max(score, 75);
      debug.push('CopyAny=75');
    }

    return score;
  }

  private getJokerReasons(
    jokerId: string,
    knowledge: JokerKnowledge | undefined,
    ante: number,
    ownedJokers: JokerState[],
    blind: BlindState | null,
    build: DetectedStrategy | null
  ): string[] {
    const reasons: string[] = [];

    if (!knowledge) {
      reasons.push('Unknown joker');
      return reasons;
    }

    // Tier
    reasons.push(`${knowledge.tier}-tier`);

    // Ante context
    if (ante <= 2 && knowledge.earlyGameBonus) {
      reasons.push('Strong early');
    }
    if (ante >= 5 && knowledge.lateGamePenalty) {
      reasons.push('Weaker late');
    }
    if (ante >= 6 && knowledge.providesXMult) {
      reasons.push('Essential xMult for late');
    }
    if (ante >= 6 && knowledge.providesMult && !knowledge.providesXMult) {
      reasons.push('+Mult falls off late');
    }

    // Build fit
    if (build && build.confidence >= 50) {
      if (knowledge.wantsFlush && build.type === 'flush') {
        reasons.push(`Fits ${build.type} build`);
      }
      if (knowledge.wantsPairs && build.type === 'pairs') {
        reasons.push(`Fits ${build.type} build`);
      }
      if (knowledge.wantsFaceCards && build.type === 'face_cards') {
        reasons.push(`Fits ${build.type} build`);
      }
    }

    // Synergies
    const synergies = this.findSynergiesWithOwned(jokerId, ownedJokers);
    if (synergies.length > 0) {
      reasons.push(`Synergy: ${synergies.slice(0, 2).join(', ')}`);
    }

    // Boss awareness
    if (blind?.isBoss) {
      if (blind.name === 'The Plant' && knowledge.wantsFaceCards) {
        reasons.push('Bad vs The Plant');
      }
      if (blind.name === 'Violet Vessel' && knowledge.providesXMult) {
        reasons.push('Good vs Violet Vessel');
      }
    }

    // Special cases
    if (knowledge.wantsSellValue && ownedJokers.length > 0) {
      const totalSell = ownedJokers.reduce((s, j) => s + (j.sellValue ?? 0), 0);
      if (totalSell >= 5) {
        reasons.push(`+Mult from ${totalSell}$ sell values`);
      }
    }

    return reasons.slice(0, 4);
  }

  private findSynergiesWithOwned(jokerId: string, ownedJokers: JokerState[]): string[] {
    const ownedIds = new Set(ownedJokers.map(j => j.id));
    const synergies = this.synergyGraph.getSynergies(jokerId);

    return synergies
      .filter(s => ownedIds.has(s.jokerId))
      .map(s => {
        const joker = this.synergyGraph.getJoker(s.jokerId);
        return joker?.name ?? s.jokerId;
      });
  }

  private scoreNonJokerItem(
    item: ShopItem,
    ante: number,
    money: number,
    build: DetectedStrategy | null
  ): ShopRecommendation {
    let score = 50;
    const reasons: string[] = [];

    switch (item.type) {
      case 'planet':
        score = 62;
        reasons.push('Hand level up');
        if (build && build.confidence >= 60) {
          score += 8;
          reasons.push('Supports build');
        }
        break;

      case 'tarot':
        score = 58;
        reasons.push('Card modification');
        if (ante <= 3) {
          score += 5;
          reasons.push('Good for building deck');
        }
        break;

      case 'spectral':
        score = 70;
        reasons.push('Powerful effect');
        break;

      case 'voucher':
        score = 72;
        reasons.push('Permanent upgrade');
        if (ante <= 3) {
          score += 12;
          reasons.push('Early vouchers compound');
        }
        // Check affordability
        if (item.cost > money) {
          score -= 10;
          reasons.push("Can't afford");
        }
        break;

      case 'booster':
        score = 55;
        reasons.push('Options');
        if (item.name.includes('Buffoon')) {
          score += 8;
          reasons.push('Joker pack');
        }
        break;
    }

    return {
      item,
      score,
      reasons,
      tier: this.scoreToTier(score),
      synergiesWithOwned: [],
    };
  }

  private scoreConsumable(
    card: { id: string; name: string; type: string },
    ante: number
  ): BoosterCardRecommendation {
    let score = 50;
    const reasons: string[] = [];

    if (card.type === 'planet') {
      score = 60;
      reasons.push('Levels up hand');
    } else if (card.type === 'tarot') {
      score = 55;
      reasons.push('Card modification');
    } else if (card.type === 'spectral') {
      score = 70;
      reasons.push('Powerful effect');
    }

    return {
      cardId: card.id,
      cardName: card.name,
      score,
      reasons,
      tier: this.scoreToTier(score),
    };
  }

  private scoreToTier(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 85) return 'S';
    if (score >= 70) return 'A';
    if (score >= 55) return 'B';
    if (score >= 40) return 'C';
    if (score >= 25) return 'D';
    return 'F';
  }
}
