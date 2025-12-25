# Balatro Overlay Tracker — Complete Spec v2
## With Strategy Intelligence Engine

---

## Feature Summary

A transparent sidebar that floats over Balatro while you play, updating in real-time:

### Core Tracking
- **Deck Tracker**: Cards remaining by suit, dims as drawn, discard pile toggle
- **Draw Probabilities**: % chance for suits/ranks, outs for hand completion
- **Live Score Calculator**: Preview score with full breakdown before playing
- **Joker Display**: Current jokers, scaling counters, condition reminders
- **Blind Info**: Chip goal, progress, boss effect reminder

### Strategy Intelligence *(the smart stuff)*
- **Auto-Strategy Detection**: Watches your run, identifies what you're building
- **Synergy Suggestions**: "You have X → look for Y in shop"
- **Shop Advisor**: Scores every shop item for *your specific run*
- **Scaling Projections**: "Your build peaks at 1.8M — Ante 8 needs 2.3M"
- **Build Warnings**: "Selling that joker breaks your combo"
- **Win Probability**: Estimates based on current trajectory

### History & Stats
- **Run History**: Auto-logs every run with strategy used
- **Personal Meta**: Your win rates by deck, joker, strategy

### UX
- Click-through by default, hover to interact
- Collapsible to minimal bar
- Adjustable opacity and position
- System tray controls

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BALATRO GAME                                │
│   ┌───────────────────────────────────────────────────────────────┐  │
│   │                    Bridge Mod (Lua)                           │  │
│   │  - Hooks game events                                          │  │
│   │  - Exports state to JSON every 100ms                          │  │
│   └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │  overlay_state.json
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       ELECTRON OVERLAY APP                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Main Process: Window management, file watcher, IPC             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Angular Renderer                                               │ │
│  │  ├── Deck Tracker UI                                            │ │
│  │  ├── Probability Calculator                                     │ │
│  │  ├── Score Preview                                              │ │
│  │  ├── Joker Display                                              │ │
│  │  ├── Strategy Intelligence Engine ◀── THE BRAIN                │ │
│  │  │   ├── Build Detector                                         │ │
│  │  │   ├── Synergy Graph                                          │ │
│  │  │   ├── Shop Advisor                                           │ │
│  │  │   ├── Scaling Calculator                                     │ │
│  │  │   └── Data Updater (optional)                                │ │
│  │  └── Run History                                                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

**Bridge Mod**: Lua, Lovely Injector, Steamodded

**Overlay App**: Electron 28+, Angular 17+, TypeScript 5.x, Tailwind CSS, Dexie.js (IndexedDB)

**Strategy Data**: JSON knowledge bases, optional external API for meta updates

---

## Workstream Breakdown

### Workstream 1: Bridge Mod (Lua)
**Branch**: `feature/bridge-mod`
**Complexity**: High

Exports complete game state to JSON file.

**Captures:**
- All cards (deck, hand, discard, play) with enhancements/editions/seals
- All jokers with scaling values
- Progress (ante, round, phase, hands/discards remaining)
- Blind info (chips needed, boss effects)
- Hand levels, vouchers, consumables
- Shop contents (when in shop phase)

---

### Workstream 2: Electron Shell
**Branch**: `feature/electron-shell`
**Complexity**: Medium

Transparent overlay window + file watcher + IPC bridge.

---

### Workstream 3: Deck Tracker UI
**Branch**: `feature/deck-tracker-ui`  
**Complexity**: Medium

Visual card grid showing remaining deck, highlighting strategy-relevant cards.

---

### Workstream 4: Probability Calculator
**Branch**: `feature/probability-calc`
**Complexity**: High

Hypergeometric distribution calculations for draw odds and outs.

---

### Workstream 5: Hand Calculator Engine
**Branch**: `feature/hand-calculator`
**Complexity**: High

Score calculation with hand detection and joker effect application.

---

### Workstream 6: Score Preview UI
**Branch**: `feature/score-preview-ui`
**Complexity**: Medium

Displays calculated score with breakdown, compares to blind requirement.

---

### Workstream 7: Joker Display
**Branch**: `feature/joker-display`
**Complexity**: Low-Medium

Current jokers with effects, scaling values, synergy indicators.

---

### Workstream 8: Run History & Stats
**Branch**: `feature/run-history`
**Complexity**: Medium

Persists run data, calculates personal statistics.

---

### Workstream 9: Overlay Layout & Theming
**Branch**: `feature/overlay-layout`
**Complexity**: Low-Medium

Main shell, collapsible sidebar, settings panel, transparency styling.

---

### Workstream 10: Strategy Intelligence Engine ⭐
**Branch**: `feature/strategy-intelligence`
**Complexity**: **Very High** (this is the brain)

The system that watches your run and provides intelligent recommendations.

---

## Workstream 10 Deep Dive: Strategy Intelligence Engine

### Components

```
strategy-intelligence/
├── data/
│   ├── joker-synergies.json      # Which jokers combo
│   ├── strategy-definitions.json  # What constitutes each build type
│   ├── tier-list.json            # Community meta (updatable)
│   └── scaling-formulas.json     # Damage projection math
├── services/
│   ├── build-detector.service.ts       # Identifies emerging strategies
│   ├── synergy-graph.service.ts        # Joker relationship queries
│   ├── shop-advisor.service.ts         # Scores shop items
│   ├── scaling-calculator.service.ts   # Projects damage vs blinds
│   ├── strategy-analyzer.service.ts    # Orchestrates all analysis
│   └── data-updater.service.ts         # Optional: fetches meta updates
├── models/
│   ├── strategy.model.ts
│   ├── synergy.model.ts
│   └── analysis.model.ts
└── components/
    ├── strategy-panel/           # Main recommendations UI
    ├── shop-overlay/             # Shop item scores
    ├── build-indicator/          # "Flush Build: 73% viable"
    └── warning-toast/            # "This breaks your combo!"
```

### Core Models

```typescript
// What strategies exist
type StrategyType = 
  | 'flush'           // One suit
  | 'straight'        // Sequences
  | 'pairs'           // Pair/two-pair/full house focus
  | 'mult_stacking'   // +mult jokers
  | 'xmult_scaling'   // x-mult jokers
  | 'chip_stacking'   // +chips focus
  | 'fibonacci'       // 2,3,5,8,A cards
  | 'even_steven'     // Even cards only
  | 'odd_todd'        // Odd cards only
  | 'face_cards'      // J,Q,K focus
  | 'steel_scaling'   // Steel card multiplication
  | 'glass_cannon'    // Glass card high risk
  | 'retrigger'       // Card retrigger effects
  | 'economy'         // Money generation
  | 'hybrid';         // Mixed approach

interface DetectedStrategy {
  type: StrategyType;
  confidence: number;        // 0-100
  viability: number;         // Can this win? 0-100
  requirements: string[];    // What you need to make it work
  currentStrength: number;   // How built-out is it now
  
  // For suit-specific
  suit?: Suit;
  
  // For joker-specific
  keyJokers?: string[];
}

interface StrategyAnalysis {
  // What the engine detected
  detected: DetectedStrategy[];
  primary: DetectedStrategy;           // Strongest current build
  
  // Recommendations
  shopPriority: ShopRecommendation[];  // What to buy
  jokersToFind: JokerRecommendation[]; // What to look for
  cardsToKeep: string[];               // Card IDs to protect
  cardsToTrash: string[];              // Safe to remove
  
  // Projections
  currentMaxScore: number;             // Best possible hand now
  projectedAnte: number;               // How far can this build go
  scalingHealth: 'strong' | 'adequate' | 'weak' | 'critical';
  
  // Warnings
  warnings: Warning[];
  opportunities: Opportunity[];
}

interface Warning {
  severity: 'info' | 'caution' | 'critical';
  message: string;
  action?: string;  // What to do about it
}

interface Opportunity {
  type: 'synergy' | 'upgrade' | 'pivot';
  message: string;
  value: number;  // How good is this opportunity
}

interface ShopRecommendation {
  itemId: string;
  itemName: string;
  score: number;           // 0-100, how good for YOUR run
  reason: string;          // "Synergizes with Lusty Joker"
  isPriority: boolean;     // "Buy this!"
  synergyWith?: string[];  // Which of your jokers it combos with
}
```

### Synergy Graph Data Structure

```typescript
// joker-synergies.json
interface JokerSynergy {
  id: string;                    // e.g., "j_lusty_joker"
  name: string;
  
  // Direct synergies
  synergiesWith: {
    jokerId: string;
    strength: 'strong' | 'medium' | 'weak';
    reason: string;
  }[];
  
  // Strategy affinities
  strategies: {
    strategy: StrategyType;
    affinity: number;  // 0-100
  }[];
  
  // Card preferences
  wantsSuits?: Suit[];
  wantsRanks?: Rank[];
  wantsEnhancements?: Enhancement[];
  
  // Scaling info
  isScaling: boolean;
  scalingType?: 'additive' | 'multiplicative' | 'exponential';
  scalingCap?: number;
  
  // Economy
  generatesMoney: boolean;
  costEfficiency: number;  // Value relative to price
  
  // Tags for matching
  tags: string[];  // ['hearts', 'mult', 'conditional', 'face_cards']
}
```

**Example entries:**

```json
{
  "id": "j_lusty_joker",
  "name": "Lusty Joker",
  "synergiesWith": [
    { "jokerId": "j_bloodstone", "strength": "strong", "reason": "Both want hearts" },
    { "jokerId": "j_rough_gem", "strength": "medium", "reason": "Diamond bonus on heart focus" },
    { "jokerId": "j_splash", "strength": "strong", "reason": "All cards score enables heart mult" }
  ],
  "strategies": [
    { "strategy": "flush", "affinity": 90 }
  ],
  "wantsSuits": ["hearts"],
  "isScaling": false,
  "generatesMoney": false,
  "tags": ["hearts", "mult", "suit_specific"]
},
{
  "id": "j_fibonacci",
  "name": "Fibonacci",
  "synergiesWith": [
    { "jokerId": "j_scholar", "strength": "strong", "reason": "Ace bonus + Fib trigger" },
    { "jokerId": "j_even_steven", "strength": "medium", "reason": "2,8 overlap" },
    { "jokerId": "j_hack", "strength": "strong", "reason": "2,3,5 retrigger" }
  ],
  "strategies": [
    { "strategy": "fibonacci", "affinity": 100 },
    { "strategy": "mult_stacking", "affinity": 60 }
  ],
  "wantsRanks": ["2", "3", "5", "8", "A"],
  "isScaling": false,
  "tags": ["mult", "rank_specific", "fibonacci"]
},
{
  "id": "j_hologram",
  "name": "Hologram",
  "synergiesWith": [
    { "jokerId": "j_madness", "strength": "strong", "reason": "Feeds cards to Hologram" },
    { "jokerId": "j_ceremonial_dagger", "strength": "strong", "reason": "Joker destruction synergy" }
  ],
  "strategies": [
    { "strategy": "xmult_scaling", "affinity": 95 }
  ],
  "isScaling": true,
  "scalingType": "multiplicative",
  "tags": ["xmult", "scaling", "cards_destroyed"]
}
```

### Build Detection Algorithm

```typescript
// build-detector.service.ts

@Injectable({ providedIn: 'root' })
export class BuildDetectorService {
  private synergyGraph = inject(SynergyGraphService);
  private gameState = inject(GameStateService);
  
  currentStrategies = computed(() => this.detectStrategies());
  
  private detectStrategies(): DetectedStrategy[] {
    const state = this.gameState.state();
    if (!state) return [];
    
    const strategies: DetectedStrategy[] = [];
    
    // 1. Analyze joker affinities
    const jokerStrategies = this.analyzeJokerAffinities(state.jokers);
    
    // 2. Analyze deck composition
    const deckStrategies = this.analyzeDeckComposition(state.deck);
    
    // 3. Analyze played hand history
    const playedStrategies = this.analyzePlayHistory(state.handHistory);
    
    // 4. Combine signals
    const combined = this.combineSignals(jokerStrategies, deckStrategies, playedStrategies);
    
    // 5. Calculate viability for each
    for (const strat of combined) {
      strat.viability = this.calculateViability(strat, state);
    }
    
    return combined.sort((a, b) => b.confidence - a.confidence);
  }
  
  private analyzeJokerAffinities(jokers: JokerState[]): Map<StrategyType, number> {
    const scores = new Map<StrategyType, number>();
    
    for (const joker of jokers) {
      const synergy = this.synergyGraph.getJoker(joker.id);
      if (!synergy) continue;
      
      for (const { strategy, affinity } of synergy.strategies) {
        const current = scores.get(strategy) || 0;
        scores.set(strategy, current + affinity);
      }
    }
    
    return scores;
  }
  
  private analyzeDeckComposition(deck: DeckState): Map<StrategyType, number> {
    const scores = new Map<StrategyType, number>();
    const allCards = [...deck.remaining, ...deck.hand, ...deck.discarded];
    
    // Count suits
    const suitCounts = this.countBySuit(allCards);
    const maxSuit = Math.max(...Object.values(suitCounts));
    const totalCards = allCards.length;
    
    // Flush viability: if one suit is dominant
    if (maxSuit / totalCards > 0.4) {
      const dominantSuit = Object.entries(suitCounts)
        .find(([_, count]) => count === maxSuit)?.[0] as Suit;
      scores.set('flush', (maxSuit / totalCards) * 100);
    }
    
    // Fibonacci viability: count 2,3,5,8,A
    const fibCards = allCards.filter(c => ['2','3','5','8','A'].includes(c.rank));
    scores.set('fibonacci', (fibCards.length / totalCards) * 80);
    
    // ... more strategy detection
    
    return scores;
  }
  
  private calculateViability(strat: DetectedStrategy, state: OverlayGameState): number {
    // Can this strategy beat the remaining blinds?
    const projectedMaxScore = this.projectMaxScore(strat, state);
    const requiredForAnte8 = this.getBlindRequirement(8, 3); // Boss blind
    
    if (projectedMaxScore > requiredForAnte8 * 1.5) return 95;
    if (projectedMaxScore > requiredForAnte8) return 75;
    if (projectedMaxScore > requiredForAnte8 * 0.7) return 50;
    return 25;
  }
}
```

### Shop Advisor Logic

```typescript
// shop-advisor.service.ts

@Injectable({ providedIn: 'root' })
export class ShopAdvisorService {
  private synergyGraph = inject(SynergyGraphService);
  private buildDetector = inject(BuildDetectorService);
  private gameState = inject(GameStateService);
  
  shopRecommendations = computed(() => this.scoreShopItems());
  
  private scoreShopItems(): ShopRecommendation[] {
    const state = this.gameState.state();
    if (!state || state.progress.phase !== 'shop') return [];
    
    const currentBuild = this.buildDetector.currentStrategies()[0];
    const myJokers = state.jokers.map(j => j.id);
    
    return state.shop.items.map(item => {
      let score = 50; // Base score
      const reasons: string[] = [];
      const synergiesWith: string[] = [];
      
      if (item.type === 'joker') {
        const jokerData = this.synergyGraph.getJoker(item.id);
        if (!jokerData) return { ...item, score: 50, reason: 'Unknown joker' };
        
        // Check synergy with owned jokers
        for (const myJokerId of myJokers) {
          const synergy = jokerData.synergiesWith.find(s => s.jokerId === myJokerId);
          if (synergy) {
            score += synergy.strength === 'strong' ? 25 : 
                     synergy.strength === 'medium' ? 15 : 8;
            synergiesWith.push(myJokerId);
            reasons.push(`Synergizes with ${this.synergyGraph.getJoker(myJokerId)?.name}`);
          }
        }
        
        // Check alignment with detected strategy
        if (currentBuild) {
          const stratAffinity = jokerData.strategies
            .find(s => s.strategy === currentBuild.type)?.affinity || 0;
          score += stratAffinity * 0.3;
          if (stratAffinity > 70) {
            reasons.push(`Strong fit for ${currentBuild.type} build`);
          }
        }
        
        // Scaling jokers get bonus in early game
        if (jokerData.isScaling && state.progress.ante <= 3) {
          score += 20;
          reasons.push('Scaling joker — good early pickup');
        }
      }
      
      return {
        itemId: item.id,
        itemName: item.name,
        score: Math.min(100, Math.max(0, score)),
        reason: reasons.join('. ') || 'Neutral pick',
        isPriority: score >= 80,
        synergyWith: synergiesWith
      };
    }).sort((a, b) => b.score - a.score);
  }
}
```

### Scaling Calculator

```typescript
// scaling-calculator.service.ts

@Injectable({ providedIn: 'root' })
export class ScalingCalculatorService {
  private handCalculator = inject(HandCalculatorService);
  private gameState = inject(GameStateService);
  
  // Blind chip requirements by ante (boss blind)
  private readonly BLIND_REQS: Record<number, number> = {
    1: 300, 2: 800, 3: 2000, 4: 5000, 5: 11000,
    6: 20000, 7: 35000, 8: 50000  // Ante 8 is endgame
  };
  
  projectedMaxScore = computed(() => this.calculateMaxPossibleScore());
  scalingHealth = computed(() => this.assessScalingHealth());
  projectedWinAnte = computed(() => this.projectWinAnte());
  
  private calculateMaxPossibleScore(): number {
    const state = this.gameState.state();
    if (!state) return 0;
    
    // Find best possible hand from current deck
    const allCards = [...state.deck.remaining, ...state.deck.hand];
    const bestHand = this.findBestPossibleHand(allCards, state.jokers);
    
    return this.handCalculator.calculate(bestHand.cards, state.jokers, state.handLevels).total;
  }
  
  private assessScalingHealth(): 'strong' | 'adequate' | 'weak' | 'critical' {
    const state = this.gameState.state();
    if (!state) return 'adequate';
    
    const currentMax = this.projectedMaxScore();
    const currentAnte = state.progress.ante;
    const nextBossReq = this.BLIND_REQS[currentAnte] || 50000;
    
    const ratio = currentMax / nextBossReq;
    
    if (ratio > 3) return 'strong';      // Crushing it
    if (ratio > 1.5) return 'adequate';  // Comfortable
    if (ratio > 1) return 'weak';        // Cutting it close
    return 'critical';                    // In trouble
  }
  
  private projectWinAnte(): number {
    const currentMax = this.projectedMaxScore();
    
    // Find highest ante where we can beat boss blind
    for (let ante = 8; ante >= 1; ante--) {
      if (currentMax > this.BLIND_REQS[ante] * 1.2) {
        return ante;
      }
    }
    return 0;
  }
  
  generateWarnings(): Warning[] {
    const warnings: Warning[] = [];
    const health = this.scalingHealth();
    const state = this.gameState.state();
    
    if (health === 'critical') {
      warnings.push({
        severity: 'critical',
        message: `Current max score won't beat Ante ${state?.progress.ante} boss`,
        action: 'Need x-mult joker or major hand upgrade'
      });
    }
    
    if (health === 'weak' && state && state.progress.ante >= 5) {
      warnings.push({
        severity: 'caution',
        message: 'Scaling is falling behind — late game will be tough',
        action: 'Prioritize mult scaling in shop'
      });
    }
    
    return warnings;
  }
}
```

### Data Updater (Optional)

```typescript
// data-updater.service.ts

@Injectable({ providedIn: 'root' })
export class DataUpdaterService {
  private readonly META_URL = 'https://api.example.com/balatro/meta';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  async checkForUpdates(): Promise<boolean> {
    const lastUpdate = localStorage.getItem('meta_last_update');
    const now = Date.now();
    
    if (lastUpdate && now - parseInt(lastUpdate) < this.CACHE_DURATION) {
      return false; // Still fresh
    }
    
    try {
      const response = await fetch(this.META_URL);
      const data = await response.json();
      
      // Update local storage
      localStorage.setItem('tier_list', JSON.stringify(data.tierList));
      localStorage.setItem('synergy_updates', JSON.stringify(data.synergies));
      localStorage.setItem('meta_last_update', now.toString());
      
      return true;
    } catch (err) {
      console.warn('Failed to fetch meta updates:', err);
      return false;
    }
  }
  
  // Could also analyze patch notes with LLM
  async analyzePatchNotes(patchNotes: string): Promise<SynergyUpdate[]> {
    // Call Claude API to extract joker changes
    // Return suggested synergy updates
    // Human reviews before applying
    return [];
  }
}
```

---

## Updated Parallel Execution Plan

### Phase 1: Foundation (Days 1-2)
| Agent | Workstream | Focus |
|-------|------------|-------|
| 1 | Bridge Mod | Lua state export |
| 2 | Electron Shell | Transparent window + file watcher |
| 3 | Shared Types | TypeScript interfaces + test data |

### Phase 2: Core Features (Days 3-5)
| Agent | Workstream | Focus |
|-------|------------|-------|
| 1 | Deck Tracker UI | Card grid, suit columns |
| 2 | Probability Calc | Hypergeometric math |
| 3 | Hand Calculator | Score engine |
| 4 | Joker Display | Joker bar UI |

### Phase 3: Intelligence + Integration (Days 6-8)
| Agent | Workstream | Focus |
|-------|------------|-------|
| 1 | **Strategy Intelligence** | Build detector, synergy graph |
| 2 | **Strategy Intelligence** | Shop advisor, scaling calc |
| 3 | Score Preview UI | Display + breakdown |
| 4 | Run History | Persistence + stats |

### Phase 4: Polish (Days 9-10)
| Agent | Workstream | Focus |
|-------|------------|-------|
| 1 | Overlay Layout | Shell, theming, settings |
| 2 | Data Layer | Joker synergies JSON (150 jokers) |
| 3 | Integration | Cross-feature wiring |
| 4 | Testing | End-to-end validation |

---

## Synergy Data: Starter Set

The Strategy Intelligence Engine needs data for all ~150 jokers. Here's a starter set covering key synergies:

```json
{
  "jokers": [
    {
      "id": "j_joker", 
      "name": "Joker",
      "strategies": [{"strategy": "mult_stacking", "affinity": 50}],
      "synergiesWith": [],
      "tags": ["mult", "basic"]
    },
    {
      "id": "j_greedy_joker",
      "name": "Greedy Joker", 
      "strategies": [{"strategy": "flush", "affinity": 80}],
      "synergiesWith": [
        {"jokerId": "j_lusty_joker", "strength": "medium", "reason": "Both suit-focused"}
      ],
      "wantsSuits": ["diamonds"],
      "tags": ["mult", "suit_specific", "diamonds"]
    },
    {
      "id": "j_wrathful_joker",
      "name": "Wrathful Joker",
      "strategies": [{"strategy": "flush", "affinity": 80}],
      "wantsSuits": ["spades"],
      "tags": ["mult", "suit_specific", "spades"]
    },
    {
      "id": "j_gluttenous_joker", 
      "name": "Gluttonous Joker",
      "strategies": [{"strategy": "flush", "affinity": 80}],
      "wantsSuits": ["clubs"],
      "tags": ["mult", "suit_specific", "clubs"]
    },
    {
      "id": "j_lusty_joker",
      "name": "Lusty Joker",
      "strategies": [{"strategy": "flush", "affinity": 80}],
      "synergiesWith": [
        {"jokerId": "j_bloodstone", "strength": "strong", "reason": "Both boost hearts"}
      ],
      "wantsSuits": ["hearts"],
      "tags": ["mult", "suit_specific", "hearts"]
    },
    {
      "id": "j_fibonacci",
      "name": "Fibonacci",
      "strategies": [{"strategy": "fibonacci", "affinity": 100}, {"strategy": "mult_stacking", "affinity": 60}],
      "synergiesWith": [
        {"jokerId": "j_scholar", "strength": "strong", "reason": "Ace bonus stacks"},
        {"jokerId": "j_hack", "strength": "strong", "reason": "Retriggers 2,3,5"}
      ],
      "wantsRanks": ["2", "3", "5", "8", "A"],
      "tags": ["mult", "rank_specific", "fibonacci"]
    },
    {
      "id": "j_hack",
      "name": "Hack",
      "strategies": [{"strategy": "fibonacci", "affinity": 70}, {"strategy": "retrigger", "affinity": 90}],
      "synergiesWith": [
        {"jokerId": "j_fibonacci", "strength": "strong", "reason": "Retriggers Fib cards"}
      ],
      "wantsRanks": ["2", "3", "4", "5"],
      "tags": ["retrigger", "rank_specific"]
    },
    {
      "id": "j_scholar",
      "name": "Scholar",
      "strategies": [{"strategy": "fibonacci", "affinity": 60}, {"strategy": "chip_stacking", "affinity": 70}],
      "wantsRanks": ["A"],
      "tags": ["chips", "mult", "aces"]
    },
    {
      "id": "j_bloodstone",
      "name": "Bloodstone",
      "strategies": [{"strategy": "flush", "affinity": 90}],
      "synergiesWith": [
        {"jokerId": "j_lusty_joker", "strength": "strong", "reason": "Hearts synergy"}
      ],
      "wantsSuits": ["hearts"],
      "tags": ["xmult", "hearts", "probability"]
    },
    {
      "id": "j_the_duo",
      "name": "The Duo",
      "strategies": [{"strategy": "pairs", "affinity": 100}],
      "synergiesWith": [
        {"jokerId": "j_the_trio", "strength": "strong", "reason": "Hand type stacking"}
      ],
      "tags": ["xmult", "pairs", "hand_type"]
    },
    {
      "id": "j_the_trio",
      "name": "The Trio", 
      "strategies": [{"strategy": "pairs", "affinity": 100}],
      "synergiesWith": [
        {"jokerId": "j_the_duo", "strength": "strong", "reason": "Hand type stacking"}
      ],
      "tags": ["xmult", "three_of_a_kind", "hand_type"]
    },
    {
      "id": "j_hologram",
      "name": "Hologram",
      "strategies": [{"strategy": "xmult_scaling", "affinity": 95}],
      "synergiesWith": [
        {"jokerId": "j_madness", "strength": "strong", "reason": "Feeds cards"}
      ],
      "isScaling": true,
      "scalingType": "multiplicative",
      "tags": ["xmult", "scaling", "cards_destroyed"]
    },
    {
      "id": "j_ride_the_bus",
      "name": "Ride the Bus",
      "strategies": [{"strategy": "mult_stacking", "affinity": 70}],
      "isScaling": true,
      "scalingType": "additive",
      "tags": ["mult", "scaling", "no_face_cards"]
    },
    {
      "id": "j_steel_joker",
      "name": "Steel Joker",
      "strategies": [{"strategy": "steel_scaling", "affinity": 100}, {"strategy": "xmult_scaling", "affinity": 80}],
      "wantsEnhancements": ["steel"],
      "isScaling": true,
      "tags": ["xmult", "steel", "scaling"]
    },
    {
      "id": "j_blueprint",
      "name": "Blueprint",
      "strategies": [],
      "synergiesWith": [
        {"jokerId": "j_hologram", "strength": "strong", "reason": "Copies scaling xmult"},
        {"jokerId": "j_steel_joker", "strength": "strong", "reason": "Copies xmult"}
      ],
      "tags": ["copy", "legendary", "flexible"]
    },
    {
      "id": "j_brainstorm",
      "name": "Brainstorm",
      "strategies": [],
      "synergiesWith": [
        {"jokerId": "j_blueprint", "strength": "strong", "reason": "Creates copy chain"}
      ],
      "tags": ["copy", "legendary", "flexible"]
    }
  ]
}
```

---

## Task Spec: Strategy Intelligence Engine

### TASK_SPEC_STRATEGY_INTELLIGENCE.md

```markdown
# Task: Strategy Intelligence Engine

## Context
- This is the "brain" of the overlay
- Watches the run and provides intelligent recommendations
- Requires joker synergy data (provided separately)

## Requirements

### 1. Build Detector Service
Analyze current game state and identify emerging strategies:
- Score each strategy type based on:
  - Joker affinities (from synergy data)
  - Deck composition (suit distribution, rank distribution)
  - Hand history (what has player been playing)
- Return ranked list of detected strategies with confidence scores
- Update in real-time as state changes

### 2. Synergy Graph Service
Query engine for joker relationships:
- Load joker-synergies.json on startup
- getJoker(id): Get full joker data
- getSynergies(jokerId): Get all jokers that synergize
- getJokersForStrategy(strategy): Get jokers that fit a build
- findSynergies(jokerIds[]): Find synergies within a set

### 3. Shop Advisor Service
Score shop items for current run:
- Score each item 0-100 based on:
  - Synergy with owned jokers
  - Fit with detected strategy
  - Scaling potential (early game bonus for scaling jokers)
  - Economy value (cost vs benefit)
- Flag priority buys (score >= 80)
- Explain reasoning for each score

### 4. Scaling Calculator Service
Project damage trajectory:
- Calculate current max possible score
- Compare to blind requirements by ante
- Return scaling health: strong/adequate/weak/critical
- Project how far current build can go
- Generate warnings when scaling insufficient

### 5. Strategy Analyzer Service (Orchestrator)
Combine all analysis into unified output:
- Detected strategies with confidence
- Shop recommendations
- Cards to keep/trash
- Warnings and opportunities
- Update on every state change

### 6. UI Components
- Strategy panel (shows current detected build)
- Shop overlay (scores on shop items)
- Warning toasts (scaling alerts)
- Build indicator (mini display)

## Files to Create
```
src/app/features/strategy-intelligence/
├── data/
│   └── joker-synergies.json
├── services/
│   ├── build-detector.service.ts
│   ├── synergy-graph.service.ts
│   ├── shop-advisor.service.ts
│   ├── scaling-calculator.service.ts
│   └── strategy-analyzer.service.ts
├── models/
│   ├── strategy.model.ts
│   ├── synergy.model.ts
│   └── analysis.model.ts
├── components/
│   ├── strategy-panel/
│   ├── shop-overlay/
│   ├── build-indicator/
│   └── warning-toast/
└── strategy-intelligence.module.ts
```

## Testing Requirements
- Unit test build detection with mock states
- Unit test synergy queries
- Unit test shop scoring
- Unit test scaling projections
- Integration test full analysis pipeline

## Done When
- Correctly identifies flush/pairs/fibonacci/scaling builds
- Shop items scored accurately for current run
- Scaling warnings appear when appropriate
- Synergy suggestions match owned jokers
- UI displays recommendations clearly
```

---

## Summary

**Total Workstreams**: 10

| # | Workstream | Complexity | Language |
|---|------------|------------|----------|
| 1 | Bridge Mod | High | Lua |
| 2 | Electron Shell | Medium | TypeScript |
| 3 | Deck Tracker UI | Medium | Angular |
| 4 | Probability Calc | High | TypeScript |
| 5 | Hand Calculator | High | TypeScript |
| 6 | Score Preview UI | Medium | Angular |
| 7 | Joker Display | Low-Medium | Angular |
| 8 | Run History | Medium | Angular |
| 9 | Overlay Layout | Low-Medium | Angular/CSS |
| 10 | **Strategy Intelligence** | **Very High** | TypeScript/Angular |

**Estimated timeline**: 10-12 days with parallel agents

**The Strategy Intelligence Engine is the killer feature** — it transforms the overlay from a passive tracker into an active coach that helps you win more runs.

---

*Now we're cooking. This is a serious project.*
