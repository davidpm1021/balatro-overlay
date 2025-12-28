# Spec 010: Shop Advisor Enhancement

**Status**: Draft
**Priority**: High (Product Vision Phase E - Polish)
**Created**: 2024-12-28
**Depends On**: Spec 002 (Shop Advisor), Spec 003 (Build Detector), Spec 008 (Build Identity)

---

## Overview

Enhance the existing **Shop Advisor** to follow the "always explain the why" philosophy from the Product Vision. The current implementation shows tier ratings and brief reasons, but needs expanded multi-bullet explanations, score breakdowns, joker effect explanations, and build context integration.

### Current State
- `ShopAdvisorService` provides `ShopRecommendation` with:
  - `score: number` (0-100)
  - `tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'`
  - `reasons: string[]` (typically 2-4 brief reasons)
  - `synergiesWithOwned: string[]`
- `ShopOverlayComponent` displays:
  - Tier badge, item name, cost, type
  - Score as a number
  - Reasons joined by `|` separator (max 2 shown)
  - Synergy list

### Target State
- Expanded "WHY BUY / WHY SKIP" reasoning with multiple categorized bullets
- Score breakdown showing component contributions
- "What It Does" section explaining unfamiliar joker effects in simple terms
- Build context like "Fits your 72% flush build"
- Collapsible detail view for advanced analysis

---

## User Stories

### US-1: Understand Why I Should Buy
**As a** new player looking at a shop joker
**I want to** see multiple reasons why this joker is recommended
**So that** I understand the value and learn good decision-making

**Acceptance Criteria**:
- "WHY BUY" section with 3-5 categorized bullet points
- Bullets cover: tier rating, build fit, synergies, boss preparation, economy impact
- Each bullet is a complete, human-readable sentence
- High-scoring items (70+) show WHY BUY, low-scoring (below 50) show WHY SKIP

### US-2: See Score Breakdown
**As a** player who wants to understand the scoring
**I want to** see how the final score was calculated
**So that** I understand what factors matter most

**Acceptance Criteria**:
- Expandable score breakdown section
- Shows: Base tier score, Synergy bonus, Build fit bonus, Boss counter bonus, Economy penalty
- Each component shows + or - contribution
- Total matches the displayed score

### US-3: Learn What Jokers Do
**As a** new player unfamiliar with many jokers
**I want to** see a simple explanation of what a joker does
**So that** I don't have to memorize or look up every joker

**Acceptance Criteria**:
- "WHAT IT DOES" section for jokers
- Plain English explanation (not raw game description)
- Practical implication (e.g., "ANY 5 cards = flush!")
- Only shown for jokers, not for planets/tarots/vouchers

### US-4: See Build Context
**As a** player with a detected build
**I want to** see how shop items fit my current build
**So that** I can make build-consistent purchases

**Acceptance Criteria**:
- Build fit shown explicitly: "Fits your 72% flush build"
- For non-fitting items: "Doesn't fit your flush build" or "Works with any build"
- Uses BuildDetectorService for build information
- Only shown when a build is detected with >= 50% confidence

---

## Technical Design

### Architecture

```
strategy-intelligence/
├── services/
│   ├── shop-advisor.service.ts        # MODIFY: Add expanded analysis
│   ├── shop-advisor.service.spec.ts   # MODIFY: Add new tests
│   └── joker-explainer.service.ts     # NEW: Plain-English joker explanations
├── components/
│   ├── shop-overlay.component.ts      # MODIFY: Enhanced UI
│   └── shop-item-detail.component.ts  # NEW: Expanded item view
└── data/
    └── joker-explanations.json        # NEW: Plain-English explanations
```

### Key Interfaces

```typescript
/**
 * Enhanced shop recommendation with expanded analysis
 */
export interface EnhancedShopRecommendation extends ShopRecommendation {
  // Existing fields from ShopRecommendation
  item: ShopItem;
  score: number;
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  reasons: string[];  // Legacy - kept for compatibility
  synergiesWithOwned: string[];

  // NEW: Expanded analysis
  analysis: ShopItemAnalysis;
}

/**
 * Detailed analysis of a shop item
 */
export interface ShopItemAnalysis {
  recommendation: 'buy' | 'consider' | 'skip';
  whyBuy: ReasonBullet[];      // Shown for score >= 70
  whySkip: ReasonBullet[];     // Shown for score < 50
  whyConsider: ReasonBullet[]; // Shown for score 50-69

  scoreBreakdown: ScoreBreakdown;
  buildContext: BuildContext | null;
  jokerExplanation: JokerExplanation | null;
}

/**
 * Single reason bullet with category
 */
export interface ReasonBullet {
  category: 'tier' | 'synergy' | 'build_fit' | 'boss_prep' | 'economy' | 'timing' | 'general';
  text: string;
  importance: 'high' | 'medium' | 'low';
}

/**
 * Score breakdown showing contribution of each factor
 */
export interface ScoreBreakdown {
  baseTierScore: number;      // From tierByAnte
  synergyBonus: number;       // From owned jokers (+30 max)
  antiSynergyPenalty: number; // From anti-synergies (-20 max)
  buildFitBonus: number;      // From matching detected build
  bossCounterBonus: number;   // +20 for counter, -10 for weakness
  economyPenalty: number;     // If breaks interest threshold
  lateGameAdjustment: number; // +15 xMult late, -20 econ late
  totalScore: number;
}

/**
 * Build context for the shop item
 */
export interface BuildContext {
  buildType: string;           // e.g., "flush"
  buildName: string;           // e.g., "Flush Build"
  buildConfidence: number;     // e.g., 72
  fitsPercentage: number;      // How well this item fits (0-100)
  fitDescription: string;      // e.g., "Fits your 72% flush build"
}

/**
 * Plain-English joker explanation
 */
export interface JokerExplanation {
  effect: string;              // "Every played card counts as every suit"
  implication: string;         // "This means ANY 5 cards = flush!"
  tips: string[];              // ["Works great with flush jokers"]
}
```

---

## UI Mockup

### Compact View (Default)

```
┌─────────────────────────────────────────────┐
│ [S] SPLASH                          $6      │
│ Score: 92/100                               │
│                                             │
│ WHY BUY:                                    │
│ * S-Tier: One of the best flush jokers      │
│ * Fits your build: You're 72% flush         │
│ * Synergy: Works with your Tribal           │
│ * Boss prep: Helps vs The Needle            │
│                                 [Details >] │
└─────────────────────────────────────────────┘
```

### Expanded View (On Click)

```
┌─────────────────────────────────────────────┐
│ [S] SPLASH                          $6      │
│ Score: 92/100                               │
│                                             │
│ WHY BUY:                                    │
│ * S-Tier: One of the best flush jokers      │
│ * Fits your build: You're 72% flush         │
│ * Synergy: Works with your Tribal           │
│ * Boss prep: Helps vs The Needle            │
│                                             │
│ WHAT IT DOES:                               │
│ Every played card counts as every suit.     │
│ This means ANY 5 cards = flush!             │
│                                             │
│ SCORE BREAKDOWN:                            │
│ Base (S-Tier):        +95                   │
│ Build fit (flush):    +30                   │
│ Synergy (Tribal):     +15                   │
│ Boss counter:         +20                   │
│ ────────────────────────────                │
│ Total:                 92 (capped at 100)   │
│                                             │
│                                 [Collapse]  │
└─────────────────────────────────────────────┘
```

### Skip Recommendation

```
┌─────────────────────────────────────────────┐
│ [C] EGG                             $3      │
│ Score: 34/100                               │
│                                             │
│ WHY SKIP:                                   │
│ * Economy joker, falls off late game        │
│ * No synergy with your flush build          │
│ * You're at $28, don't need more income     │
│                                 [Details >] │
└─────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `services/joker-explainer.service.ts` | Plain-English joker explanations |
| `services/joker-explainer.service.spec.ts` | Service tests |
| `components/shop-item-detail.component.ts` | Expanded item view |
| `components/shop-item-detail.component.spec.ts` | Component tests |
| `data/joker-explanations.json` | Plain-English explanation data |

## Files to Modify

| File | Change |
|------|--------|
| `services/shop-advisor.service.ts` | Add `EnhancedShopRecommendation`, generate expanded analysis |
| `services/shop-advisor.service.spec.ts` | Add tests for new analysis features |
| `components/shop-overlay.component.ts` | Use new UI with expandable details |

---

## Quality Gates

```bash
npm run build   # Build must succeed
npm run test    # All tests must pass
```

---

## Version History

| Date | Change |
|------|--------|
| 2024-12-28 | Initial draft |
