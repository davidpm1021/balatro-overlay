# Spec 008: Build Identity Panel

**Status**: Draft
**Priority**: High (Product Vision Priority #2)
**Created**: 2024-12-28
**Depends On**: Spec 003 (Build Detector) - Complete

---

## Overview

Create a dedicated **Build Identity Panel** that explains to the player what build type they are creating and provides contextual guidance. This addresses the gap where the build detector shows only "Flush 72%" without explaining what that means or what the player should do.

### Current State
- `BuildDetectorService` exposes `detectedBuild` signal with primary/secondary strategies
- No UI component displays build information with explanations
- Players see raw confidence percentages without context

### Target State
- Dedicated panel explaining the detected build type
- "What This Means" section with 2-3 actionable bullet points
- Strongest suit/rank indicator for relevant builds
- List of jokers supporting the build
- Hybrid build handling when secondary >= 70% of primary

---

## User Stories

### US-1: Understand My Build Type
**As a** new player
**I want to** see what build type I'm creating
**So that** I understand the overall strategy I should pursue

**Acceptance Criteria**:
- Build type displayed prominently (e.g., "FLUSH BUILD")
- Confidence percentage shown (e.g., "72%")
- One-sentence description of the build
- Visual indicator of build strength (progress bar)

### US-2: Learn What the Build Means
**As a** learning player
**I want to** read what my build type means in practice
**So that** I can make better decisions during gameplay

**Acceptance Criteria**:
- "What This Means" section with 2-3 bullet points
- Bullet points explain: what hands to play, what to keep, what to discard
- Language is plain and actionable (not jargon)
- Always visible (not hidden in tooltips)

### US-3: Know My Strongest Suit/Rank
**As a** player building around suits or ranks
**I want to** see which suit or rank is strongest in my deck
**So that** I can prioritize those cards

**Acceptance Criteria**:
- For flush builds: Show strongest suit with card count (e.g., "Hearts (18 cards)")
- For pairs builds: Show rank with most duplicates
- For face_cards builds: Show face card count
- For fibonacci builds: Show fibonacci card count (2,3,5,8,A)

### US-4: See Supporting Jokers
**As a** player optimizing my build
**I want to** see which jokers support my current build
**So that** I understand which jokers are contributing

**Acceptance Criteria**:
- List of joker names that support the primary build
- Indication if more supporting jokers would help
- Max 3 joker names shown

### US-5: Handle Hybrid Builds
**As a** player with a split strategy
**I want to** see when I have two viable builds
**So that** I can decide whether to commit or diversify

**Acceptance Criteria**:
- Secondary build shown when confidence >= 70% of primary
- Clear visual separation between primary and secondary
- Guidance: "Consider committing to one build" or similar

---

## Technical Design

### Architecture

```
build-identity/
├── build-identity.component.ts       # Main panel component
├── build-identity.component.spec.ts  # Component tests
├── build-guidance.service.ts         # Guidance text generation
├── build-guidance.service.spec.ts    # Service tests
└── index.ts                          # Public exports
```

### Key Interfaces

```typescript
interface BuildGuidance {
  buildName: string;          // "Flush Build", "Pairs Build"
  description: string;        // One-sentence description
  whatThisMeans: string[];    // 2-3 bullet points
  strongestAsset: {
    type: 'suit' | 'rank' | 'count';
    value: string;
    display: string;          // "Hearts (18 cards)"
  } | null;
  supportingJokers: string[]; // Joker names (max 3)
  jokersNeeded: number;       // How many more would help (0-3)
}

interface BuildIdentityDisplay {
  primary: {
    type: StrategyType;
    confidence: number;
    guidance: BuildGuidance;
  } | null;
  secondary?: {
    type: StrategyType;
    confidence: number;
    guidance: BuildGuidance;
  };
  isHybrid: boolean;
  hybridAdvice?: string;
}
```

### Build Content Data

```typescript
const BUILD_CONTENT: Record<StrategyType, {
  name: string;
  description: string;
  whatThisMeans: string[];
  assetType: 'suit' | 'rank' | 'count' | null;
}> = {
  flush: {
    name: 'Flush Build',
    description: 'You\'re building around playing 5 cards of the same suit.',
    whatThisMeans: [
      'Play 5 cards of the same suit',
      'Keep cards of your strongest suit',
      'Discard off-suit cards freely',
    ],
    assetType: 'suit',
  },
  pairs: {
    name: 'Pairs Build',
    description: 'You\'re building around pairs, three-of-a-kind, and multiples.',
    whatThisMeans: [
      'Play pairs, trips, or quads for big multipliers',
      'Keep duplicate ranks in your deck',
      'Look for jokers that trigger on multiples',
    ],
    assetType: 'rank',
  },
  straight: {
    name: 'Straights Build',
    description: 'You\'re building around sequential card plays.',
    whatThisMeans: [
      'Play 5 consecutive ranks (e.g., 5-6-7-8-9)',
      'Keep connected cards together',
      'Avoid gaps in your rank coverage',
    ],
    assetType: null,
  },
  mult_stacking: {
    name: 'Mult Stacking',
    description: 'You\'re stacking +mult jokers for consistent multipliers.',
    whatThisMeans: [
      'Each +mult joker adds to your base multiplier',
      'Works with any hand type',
      'Stack more +mult jokers for bigger scores',
    ],
    assetType: null,
  },
  xmult_scaling: {
    name: 'xMult Scaling',
    description: 'You\'re using xMult jokers for exponential score growth.',
    whatThisMeans: [
      'xMult jokers multiply your score exponentially',
      'Trigger conditions matter - play the right hands',
      'Essential for beating late-game antes',
    ],
    assetType: null,
  },
  face_cards: {
    name: 'Face Cards Build',
    description: 'You\'re building around Kings, Queens, and Jacks.',
    whatThisMeans: [
      'Prioritize playing face cards (J, Q, K)',
      'Keep face cards, remove number cards',
      'Face card jokers multiply with each other',
    ],
    assetType: 'count',
  },
  fibonacci: {
    name: 'Fibonacci Build',
    description: 'You\'re using Fibonacci ranks (A, 2, 3, 5, 8) with special jokers.',
    whatThisMeans: [
      'Only Ace, 2, 3, 5, 8 count for fibonacci jokers',
      'Remove other ranks to increase fibonacci density',
      'Fibonacci joker is essential for this build',
    ],
    assetType: 'count',
  },
  chip_stacking: {
    name: 'Chip Stacking',
    description: 'You\'re accumulating raw chips for high base scores.',
    whatThisMeans: [
      'Stack jokers that add +chips',
      'High chip base makes multipliers more effective',
      'Works well with any hand type',
    ],
    assetType: null,
  },
  retrigger: {
    name: 'Retrigger Build',
    description: 'You\'re using jokers that retrigger card effects.',
    whatThisMeans: [
      'Retrigger jokers make cards score multiple times',
      'Pair with high-value individual cards',
      'Position matters - leftmost cards often retrigger',
    ],
    assetType: null,
  },
  economy: {
    name: 'Economy Focus',
    description: 'You\'re focused on generating money.',
    whatThisMeans: [
      'Build up cash reserves for interest',
      'Economy jokers help in early-mid game',
      'Transition to scoring jokers late game',
    ],
    assetType: null,
  },
  even_steven: {
    name: 'Even Cards Build',
    description: 'You\'re playing around even-numbered cards (2,4,6,8,10).',
    whatThisMeans: [
      'Keep even ranks: 2, 4, 6, 8, 10',
      'Remove odd ranks from your deck',
      'Even Steven joker is core to this build',
    ],
    assetType: 'count',
  },
  odd_todd: {
    name: 'Odd Cards Build',
    description: 'You\'re playing around odd-numbered cards (A,3,5,7,9).',
    whatThisMeans: [
      'Keep odd ranks: A, 3, 5, 7, 9',
      'Remove even ranks from your deck',
      'Odd Todd joker is core to this build',
    ],
    assetType: 'count',
  },
  steel_scaling: {
    name: 'Steel Cards Build',
    description: 'You\'re using Steel cards for xMult scaling.',
    whatThisMeans: [
      'Steel cards give xMult when held (not played)',
      'Add steel enhancement to valuable cards',
      'More steel cards = exponential scaling',
    ],
    assetType: 'count',
  },
  glass_cannon: {
    name: 'Glass Cannon Build',
    description: 'High risk, high reward with Glass cards.',
    whatThisMeans: [
      'Glass cards give x2 mult but can break',
      'High variance but huge potential',
      'Works best with card duplication effects',
    ],
    assetType: 'count',
  },
  hybrid: {
    name: 'Hybrid Build',
    description: 'You have multiple viable strategies.',
    whatThisMeans: [
      'Consider focusing on one build for consistency',
      'Or maintain flexibility with versatile jokers',
      'Watch for opportunities to commit',
    ],
    assetType: null,
  },
};
```

---

## UI Mockup

```
┌─────────────────────────────────────────────┐
│ YOUR BUILD                                  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ FLUSH BUILD                       72%   │ │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░       │ │
│ │                                         │ │
│ │ You're building around playing 5 cards  │ │
│ │ of the same suit.                       │ │
│ │                                         │ │
│ │ WHAT THIS MEANS:                        │ │
│ │ • Play 5 cards of the same suit         │ │
│ │ • Keep cards of your strongest suit     │ │
│ │ • Discard off-suit cards freely         │ │
│ │                                         │ │
│ │ YOUR STRONGEST SUIT: ♥ Hearts (18 cards)│ │
│ │                                         │ │
│ │ JOKERS SUPPORTING THIS:                 │ │
│ │ Lusty Joker, Bloodstone (+1 more helps) │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ SECONDARY: Mult Stacking          45%   │ │
│ │ You also have mult jokers that work     │ │
│ │ with any hand type.                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Focus on your primary build, but keep the   │
│ secondary as a backup option.               │
└─────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `build-identity/build-identity.component.ts` | Main panel component |
| `build-identity/build-identity.component.spec.ts` | Component tests |
| `build-identity/build-guidance.service.ts` | Guidance text generation |
| `build-identity/build-guidance.service.spec.ts` | Service tests |
| `build-identity/index.ts` | Public exports |

## Files to Modify

| File | Change |
|------|--------|
| `app.component.ts` | Import and add BuildIdentityComponent |
| `app.component.html` | Add `<app-build-identity />` to layout |

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
