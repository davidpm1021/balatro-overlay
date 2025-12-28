# Product Vision: Balatro Overlay Tracker

**Purpose**: Define the target user, design philosophy, and educational outcomes that guide all feature development.

**Last Updated**: 2024-12-28

---

## Target User Persona

### "The Learning Player"

**Who they are**:
- New to Balatro or has played casually without understanding deep strategy
- Wants to improve but doesn't know what makes a "good" run
- Gets overwhelmed by the number of jokers, synergies, and decisions
- Learns best through contextual explanations, not external guides

**What they struggle with**:
- Recognizing build archetypes (flush vs pairs vs straights)
- Understanding why certain jokers are good together
- Knowing when to buy vs skip in the shop
- Predicting if they can beat a blind before playing

**What they want**:
- To understand the "why" behind good decisions
- To recognize patterns and internalize strategy over time
- To feel confident making choices instead of guessing
- To eventually not need the overlay

---

## Design Philosophy

### Core Principle: "Always Explain the Why"

Every recommendation, score, and visual indicator must include a human-readable explanation of **why** it matters in the current context.

| Bad (What) | Good (Why) |
|------------|------------|
| "Score: 85" | "Score: 85 — Strong synergy with your flush build and counters The Needle" |
| "Build: Flush 72%" | "You're building **Flushes**. This means you want cards of the same suit and jokers that trigger on flush hands." |
| "Tier: S" | "S-Tier: This joker multiplies your score every hand. Essential for beating late antes." |

### Explanation Visibility

**Always visible** — Explanations are not hidden behind tooltips or hover states. Key reasoning appears directly in the UI so players absorb it naturally while playing.

**Progressive depth** — Primary explanation visible at a glance. Additional detail available on interaction (click/hover) for players who want to learn more.

---

## Learning Outcomes

The overlay should help players develop these skills:

### 1. Recognize Build Archetypes
**Goal**: Player can identify what type of deck they're building and why it matters.

**Build Types**:
| Build | Core Mechanic | Key Jokers | Ideal Cards |
|-------|--------------|------------|-------------|
| **Flush** | 5 cards same suit | Splash, Tribal, Smeared Joker | Many cards of one suit |
| **Pairs/Multiples** | 2+ of same rank | Mime, Sock and Buskin, Hiker | Multiple face cards or specific ranks |
| **Straights** | Sequential ranks | Shortcut, Four Fingers, Run | Connected ranks (4-5-6-7-8) |
| **High Card** | Single strong card | Raised Fist, Odd Todd, Scholar | Enhanced/steel high cards |
| **Chips** | Raw chip accumulation | Blue Joker, Ice Cream, Banner | High-chip base cards |
| **Mult** | Multiplier stacking | Joker, Half Joker, Abstract Joker | Consistency over power |
| **xMult** | Exponential scaling | The Duo, The Trio, Hologram | Triggers for xMult jokers |

**Success Metric**: After 5 runs with the overlay, player can name their build type without looking at the overlay.

### 2. Understand Joker Synergies
**Goal**: Player understands which jokers work together and why.

**Synergy Categories**:
- **Trigger synergies**: Jokers that activate the same way (e.g., "on flush played")
- **Scaling synergies**: Jokers that benefit from the same actions (e.g., cards played)
- **Effect synergies**: Jokers whose effects multiply each other (e.g., +mult before xMult)
- **Economy synergies**: Jokers that generate money together

**Success Metric**: Player can explain why two jokers "go together" in their own words.

### 3. Learn Card Selection
**Goal**: Player knows which cards to keep and which to discard for their build.

**Key Concepts**:
- Cards that match your build (hearts for flush, pairs for mult builds)
- Cards with enhancements worth keeping
- "Dead" cards that don't contribute to your win condition
- Deck thinning strategy (why removing cards can be good)

**Success Metric**: Player can look at a hand and identify which cards help their build.

### 4. Grasp Economy Decisions
**Goal**: Player understands when to spend and when to save.

**Key Concepts**:
- Interest thresholds ($5 = $1 interest, up to $25 = $5)
- When economy jokers fall off (late game)
- Shop reroll value vs saving
- When to skip blinds for cash

**Success Metric**: Player maintains $25+ in mid-game runs without being told.

---

## Panel Requirements

### Priority Order
1. **Joker Synergies** — Most important, helps with biggest knowledge gap
2. **Build Identity** — Frames all other decisions
3. **Shop Guidance** — Where most impactful decisions happen
4. **Hand Guidance** — Immediate tactical help

---

### Panel 1: Synergy Display (NEW or Enhanced Joker Bar)

**Purpose**: Show which jokers work together and why.

**Current State**: Joker bar shows individual joker descriptions only.

**Required Features**:

#### Visual Synergy Grouping
```
┌─────────────────────────────────────────────┐
│ YOUR SYNERGIES                              │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ FLUSH SYNERGY (3 jokers)                │ │
│ │ ┌─────┐ ┌─────┐ ┌─────┐                 │ │
│ │ │Splash│ │Tribal│ │Smeared│              │ │
│ │ └─────┘ └─────┘ └─────┘                 │ │
│ │ These all trigger when you play a       │ │
│ │ flush, multiplying their bonuses.       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ SCALING PAIR (2 jokers)                 │ │
│ │ ┌─────┐ ┌─────┐                         │ │
│ │ │ Ice  │ │Banner│                        │ │
│ │ │Cream │ │      │                        │ │
│ │ └─────┘ └─────┘                         │ │
│ │ Both gain chips as you play hands.      │ │
│ │ They're building toward late-game.      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ NO SYNERGY                              │ │
│ │ ┌─────┐                                 │ │
│ │ │ Egg │  Doesn't connect with your      │ │
│ │ └─────┘  other jokers. Consider selling.│ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Synergy Explanations (Always Visible)
Each synergy group must include:
- **Group name**: What type of synergy (Flush, Scaling, Economy, etc.)
- **Joker count**: How many jokers in this synergy
- **Why they synergize**: 1-2 sentence explanation
- **Missing pieces**: "Add X to complete this synergy" (optional, when relevant)

#### Orphan Joker Callouts
Jokers with no synergies should be flagged:
- Show them separately with explanation
- Suggest: "Consider selling" or "Waiting for synergy partner"

---

### Panel 2: Build Identity (Enhanced Build Detector)

**Purpose**: Tell the player what they're building and what it means.

**Current State**: Shows "Flush 72%" without explaining implications.

**Required Features**:

#### Build Declaration with Explanation
```
┌─────────────────────────────────────────────┐
│ YOUR BUILD                                  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ FLUSH BUILD                    72%      │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │                                         │ │
│ │ You're building around flush hands.     │ │
│ │                                         │ │
│ │ WHAT THIS MEANS:                        │ │
│ │ • Play 5 cards of the same suit         │ │
│ │ • Keep cards of your strongest suit     │ │
│ │ • Discard off-suit cards freely         │ │
│ │                                         │ │
│ │ YOUR STRONGEST SUIT: ♥ Hearts (18 cards)│ │
│ │                                         │ │
│ │ JOKERS SUPPORTING THIS:                 │ │
│ │ Splash, Tribal (+3 more would help)     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ SECONDARY: Mult Build          45%      │ │
│ │ You also have mult jokers that work     │ │
│ │ with any hand type.                     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Build-Specific Guidance
Each build type should include:
- **Definition**: What hands to play
- **Card priorities**: What to keep vs discard
- **Joker priorities**: What to look for in shop
- **Deck composition tip**: Current suit/rank distribution

#### Hybrid Build Handling
When two builds are close (secondary >= 70% of primary):
- Show both builds
- Explain: "You're split between X and Y. Consider committing to one."

---

### Panel 3: Shop Advisor (Enhance Existing)

**Purpose**: Recommend purchases with full reasoning.

**Current State**: Good tier/score system, reasons shown but brief.

**Required Enhancements**:

#### Expanded Reasoning
```
┌─────────────────────────────────────────────┐
│ SHOP ADVISOR                    Ante 3      │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ [S] SPLASH                      $6      │ │
│ │ Score: 92/100                           │ │
│ │                                         │ │
│ │ WHY BUY:                                │ │
│ │ • S-Tier: One of the best flush jokers  │ │
│ │ • Fits your build: You're 72% flush     │ │
│ │ • Synergy: Works with your Tribal       │ │
│ │ • Boss prep: Helps vs The Needle        │ │
│ │                                         │ │
│ │ WHAT IT DOES:                           │ │
│ │ Every played card counts as every suit. │ │
│ │ This means ANY 5 cards = flush!         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [C] EGG                         $3      │ │
│ │ Score: 34/100                           │ │
│ │                                         │ │
│ │ WHY SKIP:                               │ │
│ │ • Economy joker, falls off late game    │ │
│ │ • No synergy with your flush build      │ │
│ │ • You're at $28, don't need more income │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Score Breakdown (on click/expand)
- Base tier score: X
- Build fit bonus: +Y
- Synergy bonus: +Z
- Boss preparation: +W
- Total: Score

---

### Panel 4: Hand Guidance (Enhanced Score Preview)

**Purpose**: Help player understand current hand and what to do.

**Current State**: Shows score breakdown but no recommendations.

**Required Features**:

#### Hand Analysis with Recommendations
```
┌─────────────────────────────────────────────┐
│ CURRENT HAND                                │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ BEST PLAY: Flush (Hearts)               │ │
│ │ ♥K ♥Q ♥9 ♥5 ♥2                          │ │
│ │                                         │ │
│ │ PROJECTED SCORE: 2,450                  │ │
│ │ Blind requires: 1,800 ✓ BEATS BLIND     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ RECOMMENDATION:                         │ │
│ │                                         │ │
│ │ DISCARD: ♠7 ♣3                          │ │
│ │ These don't help your flush build.      │ │
│ │                                         │ │
│ │ KEEP: All hearts                        │ │
│ │ You need 5 hearts for a flush.          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ WHY THIS SCORES WELL:                   │ │
│ │ • Flush base: 40×4 = 160                │ │
│ │ • Splash: +30 chips per card = +150     │ │
│ │ • Tribal: x2 mult on flush              │ │
│ │ • Total: 310 × 8 = 2,480                │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Contextual Card Highlighting
- Cards that contribute to best hand: highlighted
- Cards that should be discarded: dimmed with reason
- Cards with special properties: indicated (enhanced, sealed)

---

### Panel 5: Deck Tracker (Enhance Existing)

**Purpose**: Show remaining deck with build-relevant context.

**Current State**: Visual grid only, no strategic guidance.

**Required Enhancements**:

#### Build-Aware Highlighting
```
┌─────────────────────────────────────────────┐
│ DECK TRACKER                    23/52       │
├─────────────────────────────────────────────┤
│ ♥ HEARTS (Your build suit)         12 left │
│ ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐  │
│ │A │K │Q │J │10│9 │8 │7 │6 │5 │4 │3 │2 │  │
│ │✓ │✓ │░ │✓ │✓ │░ │✓ │░ │✓ │✓ │✓ │✓ │✓ │  │
│ └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘  │
│                                             │
│ ♦ DIAMONDS                          4 left │
│ ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐  │
│ │░ │░ │░ │✓ │░ │░ │✓ │░ │✓ │░ │░ │░ │✓ │  │
│ └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘  │
│ ... (clubs, spades similarly)              │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ FLUSH ODDS: 78% to draw flush           │ │
│ │ You have 12 hearts in 23 cards.         │ │
│ │ Drawing 5 cards = likely 2-3 hearts.    │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Probability Insights
- Odds of drawing cards for your build
- Explanation of what the odds mean
- Alert when odds are bad: "Only 3 hearts left — consider backup plan"

---

## Gap Analysis: Current vs Required

| Panel | Current | Required | Gap |
|-------|---------|----------|-----|
| **Synergy Display** | Individual joker list | Grouped by synergy with explanations | NEW FEATURE |
| **Build Identity** | "Flush 72%" | Full explanation + guidance | Major enhancement |
| **Shop Advisor** | Tier + brief reasons | Expanded "why" with score breakdown | Moderate enhancement |
| **Hand Guidance** | Score math only | Recommendations + explanations | Major enhancement |
| **Deck Tracker** | Visual grid | Build-aware highlights + odds | Moderate enhancement |

---

## Implementation Priority

### Phase A: Foundation (Spec 006)
1. **Build Identity Panel** — Most impactful single change
   - Full build explanation
   - "What this means" guidance
   - Strongest suit/rank indicator

### Phase B: Synergies (Spec 007)
2. **Synergy Display** — Highest user-requested priority
   - Group jokers by synergy
   - Always-visible explanations
   - Orphan joker callouts

### Phase C: Guidance (Spec 008)
3. **Hand Guidance Enhancements**
   - Discard recommendations
   - "Why this scores well" breakdown
   - Card highlighting

### Phase D: Context (Spec 009)
4. **Deck Tracker Enhancements**
   - Build-aware highlighting
   - Probability insights with explanations

### Phase E: Polish (Spec 010)
5. **Shop Advisor Enhancements**
   - Expanded reasoning
   - Score breakdown on expand
   - "What it does" for unfamiliar jokers

---

## Success Metrics

### Qualitative
- [ ] New player can explain their build type after one run
- [ ] Player understands why a joker was recommended
- [ ] Player can identify synergies without looking at overlay
- [ ] Player makes economy decisions confidently

### Quantitative
- [ ] All panels include visible explanations (no tooltip-only content for key info)
- [ ] Build detector explains "what this means" in 2-3 bullet points
- [ ] Shop advisor shows "why buy/skip" for every item
- [ ] Synergy groups show 1-2 sentence explanation each

---

## Anti-Goals (What We're NOT Building)

- **Not an auto-pilot**: We guide, we don't play for them
- **Not a wiki**: We don't dump all joker info, only relevant context
- **Not for experts**: Advanced players may find explanations redundant (that's okay)
- **Not minimal**: We prioritize clarity over screen space

---

## Appendix: Build Type Reference

### Flush Build
**Trigger**: Playing 5 cards of the same suit
**Key Jokers**: Splash, Tribal, Smeared Joker, Suit-specific jokers
**Strategy**: Thin deck to one suit, keep all cards of that suit
**Counter Bosses**: The Needle (debuffs a suit)

### Pairs/Multiples Build
**Trigger**: Playing 2+ cards of the same rank
**Key Jokers**: Mime, Sock and Buskin, Hiker, The Duo/Trio/Family
**Strategy**: Keep duplicates, look for rank-enhancing effects
**Counter Bosses**: The Psychic (must play 5 cards)

### Straights Build
**Trigger**: Playing 5 sequential ranks
**Key Jokers**: Shortcut, Four Fingers, Run, Fibonacci
**Strategy**: Keep connected cards (4-5-6-7-8), avoid gaps
**Counter Bosses**: The Eye (no repeat hand types)

### High Card Build
**Trigger**: Single powerful card scoring
**Key Jokers**: Raised Fist, Odd Todd, Scholar, Steel-focused
**Strategy**: Enhance single cards, thin deck to strong cards
**Counter Bosses**: The Flint (halves base chips/mult)

### xMult Build
**Trigger**: Stacking exponential multipliers
**Key Jokers**: The Duo, The Trio, Hologram, xMult jokers
**Strategy**: Ensure consistent triggers for xMult jokers
**Counter Bosses**: The Plant (face cards debuffed)

---

## Document History

| Date | Change |
|------|--------|
| 2024-12-28 | Initial version — defined persona, philosophy, panel requirements |
